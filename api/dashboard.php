<?php
/**
 * J'MONIC ENTERPRISE - Dashboard API
 * 
 * Provide dashboard statistics and summary data
 */

require_once 'Database.php';

// Initialize database
$db = new Database();

// Get request method and data
$method = getRequestMethod();
$data = getRequestData();

// Only handle GET requests for dashboard
if ($method !== 'GET') {
    sendErrorResponse(HTTP_METHOD_NOT_ALLOWED, 'Only GET method allowed for dashboard');
}

try {
    // Get dashboard statistics
    $stats = $db->getDashboardStats();
    
    // Get low stock products
    $lowStockProducts = $db->getLowStockProducts();
    
    // Get recent sales
    $recentSales = $db->getRecentSales(5);
    
    // Format response
    $dashboardData = [
        'stats' => [
            'today_sales' => floatval($stats['today_sales']),
            'today_orders' => intval($stats['today_orders']),
            'total_products' => intval($stats['total_products']),
            'total_customers' => intval($stats['total_customers']),
            'low_stock_count' => intval($stats['low_stock_count'])
        ],
        'low_stock_products' => $lowStockProducts,
        'recent_sales' => $recentSales,
        'summary' => [
            'business_name' => BUSINESS_NAME,
            'business_type' => BUSINESS_TYPE,
            'currency' => DEFAULT_CURRENCY,
            'last_updated' => date('Y-m-d H:i:s')
        ]
    ];
    
    sendSuccessResponse($dashboardData, 'Dashboard data retrieved successfully');
    
} catch (Exception $e) {
    error_log("Dashboard API error: " . $e->getMessage());
    sendErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to retrieve dashboard data');
}

?>