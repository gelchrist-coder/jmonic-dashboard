<?php
/**
 * J'MONIC ENTERPRISE - Customers API
 * 
 * Handle all customer related operations:
 * - GET: List customers or get specific customer
 * - POST: Add new customer
 * - PUT: Update existing customer
 * - DELETE: Remove customer
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
        handleGetCustomers($db, $data);
        break;
        
    case 'POST':
        handleAddCustomer($db, $data);
        break;
        
    case 'PUT':
        handleUpdateCustomer($db, $data);
        break;
        
    case 'DELETE':
        handleDeleteCustomer($db, $data);
        break;
        
    default:
        sendErrorResponse(HTTP_METHOD_NOT_ALLOWED, 'Method not allowed');
}

/**
 * Handle GET requests - List customers or get specific customer
 */
function handleGetCustomers($db, $data) {
    try {
        // Get specific customer by ID
        if (isset($data['id'])) {
            $customer = getCustomerDetails($db, $data['id']);
            
            if (!$customer) {
                sendErrorResponse(HTTP_NOT_FOUND, 'Customer not found');
                return;
            }
            
            sendSuccessResponse($customer, 'Customer retrieved successfully');
            return;
        }
        
        // Search customers
        if (isset($data['search'])) {
            $searchTerm = '%' . $data['search'] . '%';
            $customers = $db->select("
                SELECT 
                    id,
                    customer_code,
                    first_name,
                    last_name,
                    email,
                    phone,
                    city,
                    customer_type,
                    total_spent,
                    total_orders,
                    status,
                    created_at,
                    CONCAT(first_name, ' ', last_name) as full_name
                FROM customers 
                WHERE (first_name LIKE :search 
                    OR last_name LIKE :search 
                    OR email LIKE :search 
                    OR phone LIKE :search
                    OR customer_code LIKE :search)
                AND status = 'active'
                ORDER BY first_name, last_name
                LIMIT 20
            ", ['search' => $searchTerm]);
            
            sendSuccessResponse($customers, 'Customer search completed');
            return;
        }
        
        // Get all customers with pagination
        $page = isset($data['page']) ? max(1, intval($data['page'])) : 1;
        $limit = isset($data['limit']) ? min(100, max(1, intval($data['limit']))) : 25;
        $offset = ($page - 1) * $limit;
        
        // Build query with filters
        $whereConditions = ["status = 'active'"];
        $params = ['limit' => $limit, 'offset' => $offset];
        
        // Filter by customer type
        if (isset($data['type'])) {
            $whereConditions[] = 'customer_type = :type';
            $params['type'] = $data['type'];
        }
        
        $whereClause = implode(' AND ', $whereConditions);
        
        $query = "
            SELECT 
                id,
                customer_code,
                first_name,
                last_name,
                email,
                phone,
                address,
                city,
                customer_type,
                total_spent,
                total_orders,
                status,
                created_at,
                CONCAT(first_name, ' ', last_name) as full_name
            FROM customers 
            WHERE {$whereClause}
            ORDER BY first_name, last_name 
            LIMIT :limit OFFSET :offset
        ";
        
        $customers = $db->select($query, $params);
        
        // Get total count for pagination
        $totalCount = $db->count('customers', $whereClause, array_diff_key($params, ['limit' => '', 'offset' => '']));
        
        $response = [
            'customers' => $customers,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_items' => $totalCount,
                'total_pages' => ceil($totalCount / $limit)
            ]
        ];
        
        sendSuccessResponse($response, 'Customers retrieved successfully');
        
    } catch (Exception $e) {
        error_log("Get customers error: " . $e->getMessage());
        sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to retrieve customers');
    }
}

/**
 * Handle POST requests - Add new customer
 */
function handleAddCustomer($db, $data) {
    try {
        // Validate required fields
        $requiredFields = ['first_name', 'last_name'];
        $missingFields = validateRequiredFields($data, $requiredFields);
        
        if (!empty($missingFields)) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'Missing required fields', [
                'missing_fields' => $missingFields
            ]);
            return;
        }
        
        // Sanitize input data
        $data = sanitizeInput($data);
        
        // Validate email if provided
        if (!empty($data['email']) && !isValidEmail($data['email'])) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'Invalid email format');
            return;
        }
        
        // Validate phone if provided
        if (!empty($data['phone']) && !isValidPhone($data['phone'])) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'Invalid phone number format');
            return;
        }
        
        // Check for duplicate email
        if (!empty($data['email'])) {
            $existingCustomer = $db->selectOne(
                "SELECT id FROM customers WHERE email = :email AND status = 'active'",
                ['email' => $data['email']]
            );
            
            if ($existingCustomer) {
                sendErrorResponse(HTTP_BAD_REQUEST, 'Email already exists');
                return;
            }
        }
        
        // Generate customer code
        $customerCode = generateCustomerCode($db);
        
        // Prepare customer data
        $customerData = [
            'customer_code' => $customerCode,
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'city' => $data['city'] ?? null,
            'state' => $data['state'] ?? null,
            'postal_code' => $data['postal_code'] ?? null,
            'country' => $data['country'] ?? 'Ghana',
            'customer_type' => $data['customer_type'] ?? 'regular',
            'status' => 'active'
        ];
        
        // Insert customer
        $customerId = $db->insert('customers', $customerData);
        
        if (!$customerId) {
            sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to add customer');
            return;
        }
        
        // Get the created customer
        $createdCustomer = getCustomerDetails($db, $customerId);
        
        logActivity('Customer Created', [
            'id' => $customerId, 
            'code' => $customerCode,
            'name' => $data['first_name'] . ' ' . $data['last_name']
        ]);
        
        sendSuccessResponse($createdCustomer, 'Customer added successfully', HTTP_CREATED);
        
    } catch (Exception $e) {
        error_log("Add customer error: " . $e->getMessage());
        sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to add customer');
    }
}

/**
 * Handle PUT requests - Update existing customer
 */
function handleUpdateCustomer($db, $data) {
    try {
        // Validate required fields
        if (!isset($data['id'])) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'Customer ID is required');
            return;
        }
        
        $customerId = intval($data['id']);
        
        // Check if customer exists
        $existingCustomer = $db->selectOne(
            "SELECT * FROM customers WHERE id = :id", 
            ['id' => $customerId]
        );
        
        if (!$existingCustomer) {
            sendErrorResponse(HTTP_NOT_FOUND, 'Customer not found');
            return;
        }
        
        // Sanitize input data
        $data = sanitizeInput($data);
        
        // Prepare update data (only include provided fields)
        $updateData = [];
        $allowedFields = [
            'first_name', 'last_name', 'email', 'phone', 'address', 
            'city', 'state', 'postal_code', 'country', 'customer_type', 'status'
        ];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }
        
        // Validate email if being updated
        if (isset($updateData['email']) && !empty($updateData['email'])) {
            if (!isValidEmail($updateData['email'])) {
                sendErrorResponse(HTTP_BAD_REQUEST, 'Invalid email format');
                return;
            }
            
            // Check for duplicate email
            $existingEmail = $db->selectOne(
                "SELECT id FROM customers WHERE email = :email AND id != :id AND status = 'active'",
                ['email' => $updateData['email'], 'id' => $customerId]
            );
            
            if ($existingEmail) {
                sendErrorResponse(HTTP_BAD_REQUEST, 'Email already exists');
                return;
            }
        }
        
        // Validate phone if being updated
        if (isset($updateData['phone']) && !empty($updateData['phone'])) {
            if (!isValidPhone($updateData['phone'])) {
                sendErrorResponse(HTTP_BAD_REQUEST, 'Invalid phone number format');
                return;
            }
        }
        
        if (empty($updateData)) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'No valid fields to update');
            return;
        }
        
        // Update customer
        $result = $db->update('customers', $updateData, 'id = :id', ['id' => $customerId]);
        
        if (!$result) {
            sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to update customer');
            return;
        }
        
        // Get updated customer
        $updatedCustomer = getCustomerDetails($db, $customerId);
        
        logActivity('Customer Updated', [
            'id' => $customerId, 
            'changes' => array_keys($updateData)
        ]);
        
        sendSuccessResponse($updatedCustomer, 'Customer updated successfully');
        
    } catch (Exception $e) {
        error_log("Update customer error: " . $e->getMessage());
        sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to update customer');
    }
}

/**
 * Handle DELETE requests - Remove customer
 */
function handleDeleteCustomer($db, $data) {
    try {
        if (!isset($data['id'])) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'Customer ID is required');
            return;
        }
        
        $customerId = intval($data['id']);
        
        // Check if customer exists
        $customer = $db->selectOne(
            "SELECT * FROM customers WHERE id = :id", 
            ['id' => $customerId]
        );
        
        if (!$customer) {
            sendErrorResponse(HTTP_NOT_FOUND, 'Customer not found');
            return;
        }
        
        // Check if customer has sales history
        $salesCount = $db->count('sales_orders', 'customer_id = :customer_id', ['customer_id' => $customerId]);
        
        if ($salesCount > 0) {
            // Don't actually delete, just mark as inactive
            $result = $db->update(
                'customers', 
                ['status' => 'inactive'], 
                'id = :id', 
                ['id' => $customerId]
            );
            
            if ($result) {
                logActivity('Customer Deactivated', [
                    'id' => $customerId, 
                    'name' => $customer['first_name'] . ' ' . $customer['last_name']
                ]);
                sendSuccessResponse(null, 'Customer deactivated (has purchase history)');
            } else {
                sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to deactivate customer');
            }
        } else {
            // Safe to delete as no purchase history exists
            $result = $db->delete('customers', 'id = :id', ['id' => $customerId]);
            
            if ($result) {
                logActivity('Customer Deleted', [
                    'id' => $customerId, 
                    'name' => $customer['first_name'] . ' ' . $customer['last_name']
                ]);
                sendSuccessResponse(null, 'Customer deleted successfully');
            } else {
                sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to delete customer');
            }
        }
        
    } catch (Exception $e) {
        error_log("Delete customer error: " . $e->getMessage());
        sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to delete customer');
    }
}

/**
 * Get detailed customer information with purchase history
 */
function getCustomerDetails($db, $customerId) {
    // Get customer data
    $customer = $db->selectOne("
        SELECT * FROM customers WHERE id = :id
    ", ['id' => $customerId]);
    
    if (!$customer) {
        return null;
    }
    
    // Get recent purchases
    $recentPurchases = $db->select("
        SELECT 
            id,
            order_number,
            total_amount,
            order_date,
            order_status,
            payment_method
        FROM sales_orders 
        WHERE customer_id = :customer_id 
        ORDER BY order_date DESC 
        LIMIT 10
    ", ['customer_id' => $customerId]);
    
    $customer['recent_purchases'] = $recentPurchases;
    $customer['full_name'] = $customer['first_name'] . ' ' . $customer['last_name'];
    
    return $customer;
}

/**
 * Generate unique customer code
 */
function generateCustomerCode($db) {
    $prefix = 'CUST';
    $attempts = 0;
    
    do {
        $number = str_pad(rand(1000, 9999), 4, '0', STR_PAD_LEFT);
        $code = $prefix . $number;
        $attempts++;
        
        $exists = $db->selectOne(
            "SELECT id FROM customers WHERE customer_code = :code",
            ['code' => $code]
        );
        
    } while ($exists && $attempts < 10);
    
    if ($attempts >= 10) {
        // Fallback to timestamp-based code
        $code = $prefix . date('YmdHis');
    }
    
    return $code;
}

?>