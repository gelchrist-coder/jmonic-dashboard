<?php
/**
 * J'MONIC ENTERPRISE - Suppliers API
 * 
 * Handle all supplier related operations:
 * - GET: List suppliers or get specific supplier
 * - POST: Add new supplier
 * - PUT: Update existing supplier
 * - DELETE: Remove supplier
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
        handleGetSuppliers($db, $data);
        break;
        
    case 'POST':
        handleAddSupplier($db, $data);
        break;
        
    case 'PUT':
        handleUpdateSupplier($db, $data);
        break;
        
    case 'DELETE':
        handleDeleteSupplier($db, $data);
        break;
        
    default:
        sendErrorResponse(HTTP_METHOD_NOT_ALLOWED, 'Method not allowed');
}

/**
 * Handle GET requests - List suppliers or get specific supplier
 */
function handleGetSuppliers($db, $data) {
    try {
        // Get specific supplier by ID
        if (isset($data['id'])) {
            $supplier = getSupplierDetails($db, $data['id']);
            
            if (!$supplier) {
                sendErrorResponse(HTTP_NOT_FOUND, 'Supplier not found');
                return;
            }
            
            sendSuccessResponse($supplier, 'Supplier retrieved successfully');
            return;
        }
        
        // Search suppliers
        if (isset($data['search'])) {
            $searchTerm = '%' . $data['search'] . '%';
            $suppliers = $db->select("
                SELECT 
                    id,
                    company_name,
                    contact_person,
                    email,
                    phone,
                    address,
                    status,
                    total_purchases,
                    created_at
                FROM suppliers 
                WHERE (company_name LIKE :search 
                    OR contact_person LIKE :search 
                    OR email LIKE :search 
                    OR phone LIKE :search)
                AND status = 'active'
                ORDER BY company_name
                LIMIT 20
            ", ['search' => $searchTerm]);
            
            sendSuccessResponse($suppliers, 'Supplier search completed');
            return;
        }
        
        // Get all suppliers with pagination
        $page = isset($data['page']) ? max(1, intval($data['page'])) : 1;
        $limit = isset($data['limit']) ? min(100, max(1, intval($data['limit']))) : 25;
        $offset = ($page - 1) * $limit;
        
        $query = "
            SELECT 
                id,
                company_name,
                contact_person,
                email,
                phone,
                address,
                status,
                total_purchases,
                created_at
            FROM suppliers 
            WHERE status = 'active'
            ORDER BY company_name 
            LIMIT :limit OFFSET :offset
        ";
        
        $suppliers = $db->select($query, [
            'limit' => $limit,
            'offset' => $offset
        ]);
        
        // Get total count for pagination
        $totalCount = $db->count('suppliers', "status = 'active'");
        
        $response = [
            'suppliers' => $suppliers,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_items' => $totalCount,
                'total_pages' => ceil($totalCount / $limit)
            ]
        ];
        
        sendSuccessResponse($response, 'Suppliers retrieved successfully');
        
    } catch (Exception $e) {
        error_log("Get suppliers error: " . $e->getMessage());
        sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to retrieve suppliers');
    }
}

/**
 * Handle POST requests - Add new supplier
 */
function handleAddSupplier($db, $data) {
    try {
        // Validate required fields
        $requiredFields = ['company_name'];
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
        
        // Check for duplicate company name
        $existingSupplier = $db->selectOne(
            "SELECT id FROM suppliers WHERE company_name = :company_name AND status = 'active'",
            ['company_name' => $data['company_name']]
        );
        
        if ($existingSupplier) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'Supplier company name already exists');
            return;
        }
        
        // Prepare supplier data
        $supplierData = [
            'company_name' => $data['company_name'],
            'contact_person' => $data['contact_person'] ?? null,
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'status' => 'active'
        ];
        
        // Insert supplier
        $supplierId = $db->insert('suppliers', $supplierData);
        
        if (!$supplierId) {
            sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to add supplier');
            return;
        }
        
        // Get the created supplier
        $createdSupplier = getSupplierDetails($db, $supplierId);
        
        logActivity('Supplier Created', [
            'id' => $supplierId, 
            'company' => $data['company_name']
        ]);
        
        sendSuccessResponse($createdSupplier, 'Supplier added successfully', HTTP_CREATED);
        
    } catch (Exception $e) {
        error_log("Add supplier error: " . $e->getMessage());
        sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to add supplier');
    }
}

/**
 * Handle PUT requests - Update existing supplier
 */
function handleUpdateSupplier($db, $data) {
    try {
        // Validate required fields
        if (!isset($data['id'])) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'Supplier ID is required');
            return;
        }
        
        $supplierId = intval($data['id']);
        
        // Check if supplier exists
        $existingSupplier = $db->selectOne(
            "SELECT * FROM suppliers WHERE id = :id", 
            ['id' => $supplierId]
        );
        
        if (!$existingSupplier) {
            sendErrorResponse(HTTP_NOT_FOUND, 'Supplier not found');
            return;
        }
        
        // Sanitize input data
        $data = sanitizeInput($data);
        
        // Prepare update data (only include provided fields)
        $updateData = [];
        $allowedFields = [
            'company_name', 'contact_person', 'email', 'phone', 'address', 'status'
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
        }
        
        // Validate phone if being updated
        if (isset($updateData['phone']) && !empty($updateData['phone'])) {
            if (!isValidPhone($updateData['phone'])) {
                sendErrorResponse(HTTP_BAD_REQUEST, 'Invalid phone number format');
                return;
            }
        }
        
        // Check for duplicate company name if being updated
        if (isset($updateData['company_name'])) {
            $existingCompany = $db->selectOne(
                "SELECT id FROM suppliers WHERE company_name = :company_name AND id != :id AND status = 'active'",
                ['company_name' => $updateData['company_name'], 'id' => $supplierId]
            );
            
            if ($existingCompany) {
                sendErrorResponse(HTTP_BAD_REQUEST, 'Company name already exists');
                return;
            }
        }
        
        if (empty($updateData)) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'No valid fields to update');
            return;
        }
        
        // Update supplier
        $result = $db->update('suppliers', $updateData, 'id = :id', ['id' => $supplierId]);
        
        if (!$result) {
            sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to update supplier');
            return;
        }
        
        // Get updated supplier
        $updatedSupplier = getSupplierDetails($db, $supplierId);
        
        logActivity('Supplier Updated', [
            'id' => $supplierId, 
            'changes' => array_keys($updateData)
        ]);
        
        sendSuccessResponse($updatedSupplier, 'Supplier updated successfully');
        
    } catch (Exception $e) {
        error_log("Update supplier error: " . $e->getMessage());
        sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to update supplier');
    }
}

/**
 * Handle DELETE requests - Remove supplier
 */
function handleDeleteSupplier($db, $data) {
    try {
        if (!isset($data['id'])) {
            sendErrorResponse(HTTP_BAD_REQUEST, 'Supplier ID is required');
            return;
        }
        
        $supplierId = intval($data['id']);
        
        // Check if supplier exists
        $supplier = $db->selectOne(
            "SELECT * FROM suppliers WHERE id = :id", 
            ['id' => $supplierId]
        );
        
        if (!$supplier) {
            sendErrorResponse(HTTP_NOT_FOUND, 'Supplier not found');
            return;
        }
        
        // Check if supplier has purchase orders
        $purchaseCount = $db->count('purchase_orders', 'supplier_id = :supplier_id', ['supplier_id' => $supplierId]);
        
        if ($purchaseCount > 0) {
            // Don't actually delete, just mark as inactive
            $result = $db->update(
                'suppliers', 
                ['status' => 'inactive'], 
                'id = :id', 
                ['id' => $supplierId]
            );
            
            if ($result) {
                logActivity('Supplier Deactivated', [
                    'id' => $supplierId, 
                    'company' => $supplier['company_name']
                ]);
                sendSuccessResponse(null, 'Supplier deactivated (has purchase history)');
            } else {
                sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to deactivate supplier');
            }
        } else {
            // Safe to delete as no purchase history exists
            $result = $db->delete('suppliers', 'id = :id', ['id' => $supplierId]);
            
            if ($result) {
                logActivity('Supplier Deleted', [
                    'id' => $supplierId, 
                    'company' => $supplier['company_name']
                ]);
                sendSuccessResponse(null, 'Supplier deleted successfully');
            } else {
                sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to delete supplier');
            }
        }
        
    } catch (Exception $e) {
        error_log("Delete supplier error: " . $e->getMessage());
        sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to delete supplier');
    }
}

/**
 * Get detailed supplier information with purchase history
 */
function getSupplierDetails($db, $supplierId) {
    // Get supplier data
    $supplier = $db->selectOne("
        SELECT * FROM suppliers WHERE id = :id
    ", ['id' => $supplierId]);
    
    if (!$supplier) {
        return null;
    }
    
    // Get recent purchase orders
    $recentPurchases = $db->select("
        SELECT 
            id,
            po_number,
            total_amount,
            order_date,
            expected_delivery_date,
            po_status,
            payment_status
        FROM purchase_orders 
        WHERE supplier_id = :supplier_id 
        ORDER BY order_date DESC 
        LIMIT 10
    ", ['supplier_id' => $supplierId]);
    
    $supplier['recent_purchases'] = $recentPurchases;
    
    return $supplier;
}

?>