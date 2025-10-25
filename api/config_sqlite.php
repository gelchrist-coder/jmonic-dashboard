<?php
/**
 * J'MONIC ENTERPRISE - SQLite Database Configuration
 * 
 * This file contains all database connection settings and constants
 * for the natural hair business management system using SQLite.
 */

// Enable error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set the default timezone
date_default_timezone_set('Africa/Accra');

// Database Configuration - SQLite
define('DB_TYPE', 'sqlite');
define('DB_FILE', __DIR__ . '/../jmonic_enterprise.db');

// API Configuration
define('API_VERSION', '1.0');
define('API_BASE_URL', '/api/');

// Application Settings
define('BUSINESS_NAME', "J'MONIC ENTERPRISE");
define('BUSINESS_TYPE', 'Natural Hair Products');
define('DEFAULT_CURRENCY', 'GHS');
define('LOW_STOCK_THRESHOLD', 20);

// Security Settings
define('API_KEY_REQUIRED', false); // Set to true in production
define('CORS_ENABLED', true);

// Response Codes
define('HTTP_OK', 200);
define('HTTP_CREATED', 201);
define('HTTP_BAD_REQUEST', 400);
define('HTTP_UNAUTHORIZED', 401);
define('HTTP_NOT_FOUND', 404);
define('HTTP_METHOD_NOT_ALLOWED', 405);
define('HTTP_INTERNAL_ERROR', 500);

// Enable CORS for frontend requests
if (CORS_ENABLED) {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    // Handle preflight requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

// Set JSON content type for all API responses
header('Content-Type: application/json; charset=utf-8');

/**
 * Get database connection
 * @return PDO|null Database connection or null on failure
 */
function getDbConnection() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            // SQLite connection
            $dsn = "sqlite:" . DB_FILE;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ];
            
            $pdo = new PDO($dsn, null, null, $options);
            
            // Enable foreign key constraints for SQLite
            $pdo->exec('PRAGMA foreign_keys = ON');
            
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            sendErrorResponse(HTTP_INTERNAL_ERROR, 'Database connection failed: ' . $e->getMessage());
            return null;
        }
    }
    
    return $pdo;
}

/**
 * Send JSON response
 */
function sendResponse($data, $statusCode = HTTP_OK) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Send error response
 */
function sendErrorResponse($statusCode, $message, $details = null) {
    $response = [
        'success' => false,
        'error' => [
            'code' => $statusCode,
            'message' => $message
        ]
    ];
    
    if ($details) {
        $response['error']['details'] = $details;
    }
    
    sendResponse($response, $statusCode);
}

/**
 * Send success response
 */
function sendSuccessResponse($data = null, $message = 'Success', $statusCode = HTTP_OK) {
    $response = [
        'success' => true,
        'message' => $message
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    sendResponse($response, $statusCode);
}

/**
 * Validate required fields
 */
function validateRequiredFields($data, $requiredFields) {
    $missing = [];
    
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || empty(trim($data[$field]))) {
            $missing[] = $field;
        }
    }
    
    return $missing;
}

/**
 * Sanitize input data
 */
function sanitizeInput($data) {
    if (is_array($data)) {
        return array_map('sanitizeInput', $data);
    }
    
    return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
}

/**
 * Get request method
 */
function getRequestMethod() {
    return $_SERVER['REQUEST_METHOD'] ?? 'GET';
}

/**
 * Get request data
 */
function getRequestData() {
    $method = getRequestMethod();
    
    switch ($method) {
        case 'POST':
        case 'PUT':
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            return $data ?: $_POST;
            
        case 'GET':
            return $_GET;
            
        case 'DELETE':
            return $_GET;
            
        default:
            return [];
    }
}

/**
 * Log activity for debugging
 */
function logActivity($action, $data = null) {
    $log = [
        'timestamp' => date('Y-m-d H:i:s'),
        'action' => $action,
        'method' => getRequestMethod(),
        'data' => $data
    ];
    
    error_log("API Activity: " . json_encode($log));
}

/**
 * Generate unique ID
 */
function generateId($prefix = '') {
    return $prefix . strtoupper(uniqid());
}

/**
 * Format currency
 */
function formatCurrency($amount) {
    return DEFAULT_CURRENCY . ' ' . number_format($amount, 2);
}

/**
 * Validate email
 */
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Validate phone number (basic Ghana format)
 */
function isValidPhone($phone) {
    // Remove spaces and dashes
    $phone = preg_replace('/[\s\-]/', '', $phone);
    
    // Check for Ghana phone number format
    return preg_match('/^(\+233|0)?[0-9]{9}$/', $phone);
}

/**
 * SQLite-specific date functions
 */
function getCurrentDateTime() {
    return date('Y-m-d H:i:s');
}

function getCurrentDate() {
    return date('Y-m-d');
}

// Initialize database connection on include
$db = getDbConnection();

// Verify database exists and is accessible
if ($db) {
    try {
        // Test the connection with a simple query
        $stmt = $db->query("SELECT COUNT(*) as count FROM products");
        $result = $stmt->fetch();
        error_log("SQLite database connected successfully. Products count: " . $result['count']);
    } catch (PDOException $e) {
        error_log("SQLite database test failed: " . $e->getMessage());
    }
}

?>