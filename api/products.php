<?php
/**
 * J'MONIC ENTERPRISE - Products API
 * 
 * Handle all natural hair product related operations:
 * - GET: List all products or get specific product
 * - POST: Add new product
 * - PUT: Update existing product
 * - DELETE: Remove product
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
        handleGetProducts($db, $data);
        break;
        
    case 'POST':
        handleAddProduct($db, $data);
        break;
        
    case 'PUT':
        handleUpdateProduct($db, $data);
        break;
        
    case 'DELETE':
        handleDeleteProduct($db, $data);
        break;
        
    default:
        sendErrorResponse(HTTP_METHOD_NOT_ALLOWED, 'Method not allowed');
}

/**
 * Handle GET requests - List products or get specific product
 */
function handleGetProducts($db, $data) {
    try {
        // Get specific product by ID
        if (isset($data['id'])) {
            $product = $db->selectOne(
                "SELECT * FROM products WHERE id = :id AND status = 'active'", 
                ['id' => $data['id']]
            );
            
            if (!$product) {
                sendErrorResponse(HTTP_NOT_FOUND, 'Product not found');
                return;
            }
            
            sendSuccessResponse($product, 'Product retrieved successfully');
            return;
        }
        
        // Get specific product by SKU
        if (isset($data['sku'])) {
            $product = $db->selectOne(
                "SELECT * FROM products WHERE sku = :sku AND status = 'active'", 
                ['sku' => $data['sku']]
            );
            
            if (!$product) {
                sendErrorResponse(HTTP_NOT_FOUND, 'Product not found');
                return;
            }
            
            sendSuccessResponse($product, 'Product retrieved successfully');
            return;
        }
        
        // Get low stock products
        if (isset($data['low_stock']) && $data['low_stock'] === 'true') {
            $products = $db->getLowStockProducts();
            sendSuccessResponse($products, 'Low stock products retrieved successfully');
            return;
        }
        
        // Get all products with pagination
        $page = isset($data['page']) ? max(1, intval($data['page'])) : 1;
        $limit = isset($data['limit']) ? min(100, max(1, intval($data['limit']))) : 50;
        $offset = ($page - 1) * $limit;
        
        $query = "
            SELECT 
                id,
                sku,
                name,
                description,
                price,
                cost,
                stock_quantity,
                min_stock_level,
                status,
                created_at,
                updated_at,
                CASE 
                    WHEN stock_quantity <= min_stock_level THEN 'low'
                    WHEN stock_quantity = 0 THEN 'out'
                    ELSE 'good'
                END as stock_status,
                (price - cost) as profit_per_unit,
                (stock_quantity * cost) as stock_value
            FROM products 
            WHERE status = 'active'
            ORDER BY name ASC 
            LIMIT :limit OFFSET :offset
        ";
        
        $products = $db->select($query, [
            'limit' => $limit,
            'offset' => $offset
        ]);
        
        // Get total count for pagination
        $totalCount = $db->count('products', "status = 'active'");
        
        $response = [
            'products' => $products,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_items' => $totalCount,
                'total_pages' => ceil($totalCount / $limit)
            ]
        ];
        
        sendSuccessResponse($response, 'Products retrieved successfully');
        
    } catch (Exception $e) {
        error_log("Get products error: " . $e->getMessage());
        sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to retrieve products');
    }
}

/**
 * Handle POST requests - Add new product
 */
function handleAddProduct($db, $data) {
    try {
        // Validate required fields
        $requiredFields = ['sku', 'name', 'price', 'cost'];
        $missingFields = validateRequiredFields($data, $requiredFields);
        
        if (!empty($missingFields)) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'Missing required fields', [
                'missing_fields' => $missingFields
            ]);
            return;
        }
        
        // Sanitize input data
        $data = sanitizeInput($data);
        
        // Validate business rules
        if ($db->skuExists($data['sku'])) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'SKU already exists');
            return;
        }
        
        if ($data['price'] <= 0 || $data['cost'] <= 0) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'Price and cost must be greater than zero');
            return;
        }
        
        if ($data['price'] <= $data['cost']) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'Selling price should be higher than cost price for profit');
            return;
        }
        
        // Prepare product data
        $productData = [
            'sku' => strtoupper($data['sku']),
            'name' => $data['name'],
            'description' => $data['description'] ?? '',
            'price' => floatval($data['price']),
            'cost' => floatval($data['cost']),
            'stock_quantity' => isset($data['stock_quantity']) ? intval($data['stock_quantity']) : 0,
            'min_stock_level' => isset($data['min_stock_level']) ? intval($data['min_stock_level']) : LOW_STOCK_THRESHOLD,
            'status' => 'active'
        ];
        
        // Insert product
        $productId = $db->insert('products', $productData);
        
        if (!$productId) {
            sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to add product');
            return;
        }
        
        // Record initial stock transaction if stock > 0
        if ($productData['stock_quantity'] > 0) {
            $db->recordInventoryTransaction(
                $productId,
                'initial',
                $productData['stock_quantity'],
                ['type' => 'manual_adjustment', 'number' => 'INITIAL-STOCK']
            );
        }
        
        // Get the created product
        $createdProduct = $db->selectOne(
            "SELECT * FROM products WHERE id = :id", 
            ['id' => $productId]
        );
        
        logActivity('Product Created', ['id' => $productId, 'sku' => $productData['sku']]);
        
        sendSuccessResponse($createdProduct, 'Product added successfully', HTTP_CREATED);
        
    } catch (Exception $e) {
        error_log("Add product error: " . $e->getMessage());
        sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to add product');
    }
}

/**
 * Handle PUT requests - Update existing product
 */
function handleUpdateProduct($db, $data) {
    try {
        // Validate required fields
        if (!isset($data['id'])) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'Product ID is required');
            return;
        }
        
        $productId = intval($data['id']);
        
        // Check if product exists
        $existingProduct = $db->selectOne(
            "SELECT * FROM products WHERE id = :id", 
            ['id' => $productId]
        );
        
        if (!$existingProduct) {
            sendErrorResponse(HTTP_NOT_FOUND, 'Product not found');
            return;
        }
        
        // Sanitize input data
        $data = sanitizeInput($data);
        
        // Prepare update data (only include provided fields)
        $updateData = [];
        $allowedFields = ['sku', 'name', 'description', 'price', 'cost', 'min_stock_level', 'status'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }
        
        // Validate SKU uniqueness if being updated
        if (isset($updateData['sku']) && $db->skuExists($updateData['sku'], $productId)) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'SKU already exists');
            return;
        }
        
        // Validate prices if being updated
        $newPrice = $updateData['price'] ?? $existingProduct['price'];
        $newCost = $updateData['cost'] ?? $existingProduct['cost'];
        
        if ($newPrice <= 0 || $newCost <= 0) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'Price and cost must be greater than zero');
            return;
        }
        
        if (empty($updateData)) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'No valid fields to update');
            return;
        }
        
        // Convert SKU to uppercase if provided
        if (isset($updateData['sku'])) {
            $updateData['sku'] = strtoupper($updateData['sku']);
        }
        
        // Update product
        $result = $db->update('products', $updateData, 'id = :id', ['id' => $productId]);
        
        if (!$result) {
            sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to update product');
            return;
        }
        
        // Get updated product
        $updatedProduct = $db->selectOne(
            "SELECT * FROM products WHERE id = :id", 
            ['id' => $productId]
        );
        
        logActivity('Product Updated', ['id' => $productId, 'changes' => array_keys($updateData)]);
        
        sendSuccessResponse($updatedProduct, 'Product updated successfully');
        
    } catch (Exception $e) {
        error_log("Update product error: " . $e->getMessage());
        sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to update product');
    }
}

/**
 * Handle DELETE requests - Remove product
 */
function handleDeleteProduct($db, $data) {
    try {
        if (!isset($data['id'])) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'Product ID is required');
            return;
        }
        
        $productId = intval($data['id']);
        
        // Check if product exists
        $product = $db->selectOne(
            "SELECT * FROM products WHERE id = :id", 
            ['id' => $productId]
        );
        
        if (!$product) {
            sendErrorResponse(HTTP_NOT_FOUND, 'Product not found');
            return;
        }
        
        // Check if product has sales history
        $salesCount = $db->count('sales_order_items', 'product_id = :product_id', ['product_id' => $productId]);
        
        if ($salesCount > 0) {
            // Don't actually delete, just mark as discontinued
            $result = $db->update(
                'products', 
                ['status' => 'discontinued'], 
                'id = :id', 
                ['id' => $productId]
            );
            
            if ($result) {
                logActivity('Product Discontinued', ['id' => $productId, 'sku' => $product['sku']]);
                sendSuccessResponse(null, 'Product discontinued (has sales history)');
            } else {
                sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to discontinue product');
            }
        } else {
            // Safe to delete as no sales history exists
            $result = $db->delete('products', 'id = :id', ['id' => $productId]);
            
            if ($result) {
                logActivity('Product Deleted', ['id' => $productId, 'sku' => $product['sku']]);
                sendSuccessResponse(null, 'Product deleted successfully');
            } else {
                sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to delete product');
            }
        }
        
    } catch (Exception $e) {
        error_log("Delete product error: " . $e->getMessage());
        sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to delete product');
    }
}

?>