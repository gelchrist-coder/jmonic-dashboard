<?php
/**
 * Simple API test endpoint to verify server connection
 */

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Simple test response
$response = [
    'success' => true,
    'message' => 'API connection successful!',
    'data' => [
        'server_time' => date('Y-m-d H:i:s'),
        'php_version' => PHP_VERSION,
        'server_info' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown'
    ]
];

echo json_encode($response, JSON_PRETTY_PRINT);
?>