<?php
/**
 * J'MONIC ENTERPRISE - Sales API
 * 
 * Handle all sales related operations:
 * - GET: List sales or get specific sale
 * - POST: Record new sale
 * - PUT: Update sale (limited cases)
 * - DELETE: Cancel/refund sale
 */

require_once 'Database.php';

// Initialize database
$db = new Database();

// Get request method and data
$method = getRequestMethod();
$data = getRequestData();

// Handle different HTTP methods
switch ($method) {
    case 'GET':
        handleGetSales($db, $data);
        break;
        
    case 'POST':
        handleRecordSale($db, $data);
        break;
        
    case 'PUT':
        handleUpdateSale($db, $data);
        break;
        
    case 'DELETE':
        handleCancelSale($db, $data);
        break;
        
    default:
        sendErrorResponse(HTTP_METHOD_NOT_ALLOWED, 'Method not allowed');
}

/**
 * Handle GET requests - List sales or get specific sale
 */
function handleGetSales($db, $data) {
    try {
        // Get specific sale by ID
        if (isset($data['id'])) {
            $sale = getSaleDetails($db, $data['id']);
            
            if (!$sale) {
                sendErrorResponse(HTTP_NOT_FOUND, 'Sale not found');
                return;
            }
            
            sendSuccessResponse($sale, 'Sale retrieved successfully');
            return;
        }
        
        // Get dashboard summary
        if (isset($data['summary'])) {
            $date = $data['date'] ?? null;
            $summary = $db->getSalesSummary($date);
            sendSuccessResponse($summary, 'Sales summary retrieved successfully');
            return;
        }
        
        // Get recent sales
        if (isset($data['recent'])) {
            $limit = isset($data['limit']) ? min(50, max(1, intval($data['limit']))) : 10;
            $sales = $db->getRecentSales($limit);
            sendSuccessResponse($sales, 'Recent sales retrieved successfully');
            return;
        }
        
        // Get all sales with pagination and filters
        $page = isset($data['page']) ? max(1, intval($data['page'])) : 1;
        $limit = isset($data['limit']) ? min(100, max(1, intval($data['limit']))) : 20;
        $offset = ($page - 1) * $limit;
        
        // Build query with filters
        $whereConditions = ['1=1'];
        $params = ['limit' => $limit, 'offset' => $offset];
        
        // Filter by date range
        if (isset($data['start_date']) && isset($data['end_date'])) {
            $whereConditions[] = 'DATE(so.order_date) BETWEEN :start_date AND :end_date';
            $params['start_date'] = $data['start_date'];
            $params['end_date'] = $data['end_date'];
        }
        
        // Filter by payment method
        if (isset($data['payment_method'])) {
            $whereConditions[] = 'so.payment_method = :payment_method';
            $params['payment_method'] = $data['payment_method'];
        }
        
        // Filter by status
        if (isset($data['status'])) {
            $whereConditions[] = 'so.order_status = :status';
            $params['status'] = $data['status'];
        }
        
        $whereClause = implode(' AND ', $whereConditions);
        
        $query = "
            SELECT 
                so.*,
                c.first_name,
                c.last_name,
                c.email,
                c.phone
            FROM sales_orders so
            LEFT JOIN customers c ON so.customer_id = c.id
            WHERE {$whereClause}
            ORDER BY so.created_at DESC 
            LIMIT :limit OFFSET :offset
        ";
        
        $sales = $db->select($query, $params);
        
        // Get total count for pagination
        $countQuery = "
            SELECT COUNT(*) as count 
            FROM sales_orders so 
            LEFT JOIN customers c ON so.customer_id = c.id 
            WHERE " . implode(' AND ', array_slice($whereConditions, 0, -2)); // Remove limit params
        $countParams = array_diff_key($params, ['limit' => '', 'offset' => '']);
        $totalResult = $db->selectOne($countQuery, $countParams);
        $totalCount = $totalResult['count'] ?? 0;
        
        $response = [
            'sales' => $sales,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_items' => $totalCount,
                'total_pages' => ceil($totalCount / $limit)
            ]
        ];
        
        sendSuccessResponse($response, 'Sales retrieved successfully');
        
    } catch (Exception $e) {
        error_log("Get sales error: " . $e->getMessage());
        sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to retrieve sales');
    }
}

/**
 * Handle POST requests - Record new sale
 */
function handleRecordSale($db, $data) {
    try {
        // Validate required fields
        $requiredFields = ['customer_name', 'items', 'payment_method'];
        $missingFields = validateRequiredFields($data, $requiredFields);
        
        if (!empty($missingFields)) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'Missing required fields', [
                'missing_fields' => $missingFields
            ]);
            return;
        }
        
        // Sanitize input data
        $data = sanitizeInput($data);
        
        // Validate items
        if (!is_array($data['items']) || empty($data['items'])) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'Sale must contain at least one item');
            return;
        }
        
        // Validate payment method
        $validPaymentMethods = ['cash', 'transfer', 'mobile_money', 'cheque', 'credit'];
        if (!in_array($data['payment_method'], $validPaymentMethods)) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'Invalid payment method');
            return;
        }
        
        // Process sale in transaction
        $db->beginTransaction();
        
        try {
            $saleResult = processSale($db, $data);
            $db->commit();
            
            logActivity('Sale Recorded', [
                'sale_id' => $saleResult['sale_id'], 
                'order_number' => $saleResult['order_number'],
                'total' => $saleResult['total_amount']
            ]);
            
            sendSuccessResponse($saleResult, 'Sale recorded successfully', HTTP_CREATED);
            
        } catch (Exception $e) {
            $db->rollback();
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log("Record sale error: " . $e->getMessage());
        sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to record sale: ' . $e->getMessage());
    }
}

/**
 * Process sale and update inventory
 */
function processSale($db, $data) {
    $saleItems = [];
    $totalAmount = 0;
    $totalCost = 0;
    
    // Validate and process each item
    foreach ($data['items'] as $item) {
        if (!isset($item['product_id']) || !isset($item['quantity'])) {
            throw new Exception("Each item must have product_id and quantity");
        }
        
        $product = $db->selectOne(
            "SELECT * FROM products WHERE id = :id AND status = 'active'",
            ['id' => $item['product_id']]
        );
        
        if (!$product) {
            throw new Exception("Product not found: " . $item['product_id']);
        }
        
        $quantity = intval($item['quantity']);
        if ($quantity <= 0) {
            throw new Exception("Invalid quantity for product: " . $product['name']);
        }
        
        if ($product['stock_quantity'] < $quantity) {
            throw new Exception("Insufficient stock for product: " . $product['name'] . " (Available: " . $product['stock_quantity'] . ")");
        }
        
        $unitPrice = isset($item['unit_price']) ? floatval($item['unit_price']) : $product['price'];
        $lineTotal = $quantity * $unitPrice;
        $lineCost = $quantity * $product['cost'];
        
        $saleItems[] = [
            'product_id' => $product['id'],
            'product_sku' => $product['sku'],
            'product_name' => $product['name'],
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'unit_cost' => $product['cost'],
            'line_total' => $lineTotal,
            'line_cost' => $lineCost
        ];
        
        $totalAmount += $lineTotal;
        $totalCost += $lineCost;
    }
    
    // Generate order number
    $orderNumber = 'SO-' . date('Ymd') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
    
    // Handle customer
    $customerId = null;
    if (isset($data['customer_id']) && !empty($data['customer_id'])) {
        $customerId = intval($data['customer_id']);
    }
    
    // Create sales order
    $salesOrderData = [
        'order_number' => $orderNumber,
        'customer_id' => $customerId,
        'customer_name' => $data['customer_name'],
        'total_amount' => $totalAmount,
        'total_cost' => $totalCost,
        'tax_amount' => $data['tax_amount'] ?? 0,
        'discount_amount' => $data['discount_amount'] ?? 0,
        'payment_method' => $data['payment_method'],
        'payment_status' => 'paid',
        'order_status' => 'completed',
        'notes' => $data['notes'] ?? '',
        'created_by' => 'admin'
    ];
    
    $salesOrderId = $db->insert('sales_orders', $salesOrderData);
    
    if (!$salesOrderId) {
        throw new Exception("Failed to create sales order");
    }
    
    // Create sales order items and update inventory
    foreach ($saleItems as $item) {
        $item['sales_order_id'] = $salesOrderId;
        
        $itemId = $db->insert('sales_order_items', $item);
        if (!$itemId) {
            throw new Exception("Failed to create sales order item");
        }
        
        // Update product stock and record transaction
        $transactionResult = $db->recordInventoryTransaction(
            $item['product_id'],
            'sale',
            -$item['quantity'], // Negative for stock reduction
            [
                'type' => 'sales_order',
                'id' => $salesOrderId,
                'number' => $orderNumber
            ]
        );
        
        if (!$transactionResult) {
            throw new Exception("Failed to update inventory for product: " . $item['product_name']);
        }
    }
    
    // Return sale details
    return [
        'sale_id' => $salesOrderId,
        'order_number' => $orderNumber,
        'total_amount' => $totalAmount,
        'total_cost' => $totalCost,
        'profit' => $totalAmount - $totalCost,
        'items_count' => count($saleItems),
        'payment_method' => $data['payment_method'],
        'customer_name' => $data['customer_name']
    ];
}

/**
 * Get detailed sale information
 */
function getSaleDetails($db, $saleId) {
    // Get sales order
    $sale = $db->selectOne("
        SELECT 
            so.*,
            c.first_name,
            c.last_name,
            c.email,
            c.phone
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        WHERE so.id = :id
    ", ['id' => $saleId]);
    
    if (!$sale) {
        return null;
    }
    
    // Get sale items
    $items = $db->select("
        SELECT 
            soi.*,
            p.sku,
            p.name as product_name
        FROM sales_order_items soi
        LEFT JOIN products p ON soi.product_id = p.id
        WHERE soi.sales_order_id = :sale_id
        ORDER BY soi.id
    ", ['sale_id' => $saleId]);
    
    $sale['items'] = $items;
    
    return $sale;
}

/**
 * Handle PUT requests - Update sale (limited cases)
 */
function handleUpdateSale($db, $data) {
    try {
        if (!isset($data['id'])) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'Sale ID is required');
            return;
        }
        
        $saleId = intval($data['id']);
        
        // Check if sale exists
        $sale = $db->selectOne("SELECT * FROM sales_orders WHERE id = :id", ['id' => $saleId]);
        
        if (!$sale) {
            sendErrorResponse(HTTP_NOT_FOUND, 'Sale not found');
            return;
        }
        
        // Only allow updating certain fields and only for non-completed sales
        $allowedFields = ['notes', 'payment_status'];
        $updateData = [];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }
        
        if (empty($updateData)) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'No valid fields to update');
            return;
        }
        
        $result = $db->update('sales_orders', $updateData, 'id = :id', ['id' => $saleId]);
        
        if ($result) {
            $updatedSale = getSaleDetails($db, $saleId);
            logActivity('Sale Updated', ['sale_id' => $saleId, 'changes' => array_keys($updateData)]);
            sendSuccessResponse($updatedSale, 'Sale updated successfully');
        } else {
            sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to update sale');
        }
        
    } catch (Exception $e) {
        error_log("Update sale error: " . $e->getMessage());
        sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to update sale');
    }
}

/**
 * Handle DELETE requests - Cancel sale (not implemented for safety)
 */
function handleCancelSale($db, $data) {
    sendErrorResponse(HTTP_METHOD_NOT_ALLOWED, 'Sale cancellation not supported via API for data integrity');
}

?>