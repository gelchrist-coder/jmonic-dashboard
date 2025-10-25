<?php
/**
 * J'MONIC ENTERPRISE - API Connection Test (SQLite)
 * 
 * This endpoint tests the SQLite database connection and basic functionality.
 */

require_once 'config_sqlite.php';

try {
    // Test database connection
    $db = getDbConnection();
    
    if (!$db) {
        sendErrorResponse(HTTP_INTERNAL_ERROR, 'Database connection failed');
    }
    
    // Get database info
    $dbFile = DB_FILE;
    $dbExists = file_exists($dbFile);
    $dbSize = $dbExists ? filesize($dbFile) : 0;
    
    // Test basic queries
    $tableCount = $db->query("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")->fetch()['count'];
    $productCount = $db->query("SELECT COUNT(*) as count FROM products")->fetch()['count'];
    $salesCount = $db->query("SELECT COUNT(*) as count FROM sales_orders")->fetch()['count'];
    $customerCount = $db->query("SELECT COUNT(*) as count FROM customers")->fetch()['count'];
    
    // Test sample products
    $sampleProducts = $db->query("SELECT sku, name, price, stock_quantity FROM products LIMIT 3")->fetchAll();
    
    $response = [
        'success' => true,
        'message' => 'SQLite database connection successful',
        'data' => [
            'database_type' => 'SQLite',
            'database_file' => basename($dbFile),
            'database_exists' => $dbExists,
            'database_size' => round($dbSize / 1024, 2) . ' KB',
            'api_version' => API_VERSION,
            'business_name' => BUSINESS_NAME,
            'timestamp' => getCurrentDateTime(),
            'statistics' => [
                'total_tables' => $tableCount,
                'total_products' => $productCount,
                'total_sales' => $salesCount,
                'total_customers' => $customerCount
            ],
            'sample_products' => $sampleProducts,
            'features' => [
                'foreign_keys' => 'enabled',
                'transactions' => 'supported',
                'views' => 'supported',
                'json_support' => 'available'
            ]
        ]
    ];
    
    sendResponse($response);
    
} catch (Exception $e) {
    error_log("Test API Error: " . $e->getMessage());
    sendErrorResponse(HTTP_INTERNAL_ERROR, 'Database test failed', $e->getMessage());
}
?>