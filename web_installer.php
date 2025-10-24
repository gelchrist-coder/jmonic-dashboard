<?php
/**
 * J'MONIC ENTERPRISE Web Database Installer
 * 
 * This script provides a web interface to set up the database
 * for your natural hair business management system.
 */

// Security check - only allow on localhost or development environments
$allowedHosts = ['localhost', '127.0.0.1', '::1'];
$currentHost = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? 'unknown';

if (!in_array($currentHost, $allowedHosts) && strpos($currentHost, '.local') === false) {
    http_response_code(403);
    die('This installer can only be run on localhost for security reasons.');
}

// Include configuration
$configFile = __DIR__ . '/api/config.php';
if (!file_exists($configFile)) {
    die('Error: config.php not found. Please ensure it exists in the api directory.');
}

// Temporarily disable headers for web installer
define('CLI_MODE', false);
$_SERVER['REQUEST_METHOD'] = $_SERVER['REQUEST_METHOD'] ?? 'GET';

require_once $configFile;

// Handle AJAX requests
if (isset($_GET['action'])) {
    header('Content-Type: application/json');
    
    switch ($_GET['action']) {
        case 'test_connection':
            echo json_encode(testDatabaseConnection());
            exit;
            
        case 'install_database':
            echo json_encode(installDatabase());
            exit;
            
        case 'check_status':
            echo json_encode(checkDatabaseStatus());
            exit;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            exit;
    }
}

/**
 * Test database connection
 */
function testDatabaseConnection() {
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";charset=" . DB_CHARSET,
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]
        );
        
        return [
            'success' => true,
            'message' => 'Database connection successful!',
            'data' => [
                'host' => DB_HOST,
                'user' => DB_USER,
                'php_version' => PHP_VERSION,
                'mysql_version' => $pdo->getAttribute(PDO::ATTR_SERVER_VERSION)
            ]
        ];
    } catch (PDOException $e) {
        return [
            'success' => false,
            'message' => 'Database connection failed: ' . $e->getMessage(),
            'error' => $e->getMessage()
        ];
    }
}

/**
 * Install database schema and sample data
 */
function installDatabase() {
    try {
        // First test connection
        $connectionTest = testDatabaseConnection();
        if (!$connectionTest['success']) {
            return $connectionTest;
        }
        
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";charset=" . DB_CHARSET,
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        
        // Create database if it doesn't exist
        $pdo->exec("CREATE DATABASE IF NOT EXISTS " . DB_NAME . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE " . DB_NAME);
        
        // Read SQL file
        $sqlFile = __DIR__ . '/database_setup.sql';
        if (!file_exists($sqlFile)) {
            return [
                'success' => false,
                'message' => 'SQL setup file not found: database_setup.sql'
            ];
        }
        
        $sql = file_get_contents($sqlFile);
        if ($sql === false) {
            return [
                'success' => false,
                'message' => 'Could not read SQL setup file'
            ];
        }
        
        // Split SQL into statements
        $statements = array_filter(
            array_map('trim', explode(';', $sql)),
            function($stmt) {
                return !empty($stmt) && 
                       !preg_match('/^--/', $stmt) && 
                       !preg_match('/^\/\*/', $stmt) &&
                       strtoupper(substr($stmt, 0, 3)) !== 'USE';
            }
        );
        
        $successCount = 0;
        $errors = [];
        
        foreach ($statements as $statement) {
            try {
                if (trim($statement)) {
                    $pdo->exec($statement);
                    $successCount++;
                }
            } catch (PDOException $e) {
                // Ignore "already exists" errors
                if (strpos($e->getMessage(), 'already exists') === false) {
                    $errors[] = $e->getMessage();
                }
            }
        }
        
        // Verify installation
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        
        return [
            'success' => true,
            'message' => 'Database installation completed successfully!',
            'data' => [
                'statements_executed' => $successCount,
                'tables_created' => count($tables),
                'table_names' => $tables,
                'errors' => $errors
            ]
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Installation failed: ' . $e->getMessage(),
            'error' => $e->getMessage()
        ];
    }
}

/**
 * Check database status
 */
function checkDatabaseStatus() {
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET,
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        
        // Check tables
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        
        $expectedTables = [
            'products', 'product_categories', 'customers', 'suppliers',
            'sales_orders', 'sales_order_items', 'purchase_orders', 'purchase_order_items',
            'inventory_transactions', 'business_settings', 'activity_logs'
        ];
        
        $missingTables = array_diff($expectedTables, $tables);
        
        // Check sample data
        $counts = [];
        foreach (['products', 'product_categories', 'customers', 'suppliers', 'business_settings'] as $table) {
            if (in_array($table, $tables)) {
                $count = $pdo->query("SELECT COUNT(*) FROM {$table}")->fetchColumn();
                $counts[$table] = intval($count);
            }
        }
        
        return [
            'success' => true,
            'message' => 'Database status checked successfully',
            'data' => [
                'tables_found' => count($tables),
                'tables_expected' => count($expectedTables),
                'missing_tables' => $missingTables,
                'sample_data_counts' => $counts,
                'status' => empty($missingTables) ? 'ready' : 'needs_setup'
            ]
        ];
        
    } catch (PDOException $e) {
        return [
            'success' => false,
            'message' => 'Database check failed: ' . $e->getMessage(),
            'error' => $e->getMessage()
        ];
    }
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>J'MONIC ENTERPRISE - Database Installer</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .content { padding: 30px; }
        
        .step {
            margin-bottom: 20px;
            padding: 20px;
            border: 2px solid #e1e1e1;
            border-radius: 10px;
        }
        
        .button {
            padding: 12px 25px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-size: 1em;
            transition: all 0.3s ease;
        }
        
        .button:hover {
            background: #5a6fd8;
            transform: translateY(-2px);
        }
        
        .button:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }
        
        .status-box {
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
            border-left: 4px solid;
        }
        
        .status-success {
            background: #d4edda;
            border-color: #28a745;
            color: #155724;
        }
        
        .status-error {
            background: #f8d7da;
            border-color: #dc3545;
            color: #721c24;
        }
        
        .status-info {
            background: #d1ecf1;
            border-color: #17a2b8;
            color: #0c5460;
        }
        
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .config-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Database Installer</h1>
            <p>J'MONIC ENTERPRISE Natural Hair Business Management System</p>
        </div>
        
        <div class="content">
            <div class="step">
                <h3>📋 Current Configuration</h3>
                <div class="config-info">
                    <strong>Host:</strong> <?php echo DB_HOST; ?><br>
                    <strong>Database:</strong> <?php echo DB_NAME; ?><br>
                    <strong>User:</strong> <?php echo DB_USER; ?><br>
                    <strong>PHP Version:</strong> <?php echo PHP_VERSION; ?>
                </div>
            </div>
            
            <div class="step">
                <h3>🔧 Installation Steps</h3>
                
                <div style="margin: 20px 0;">
                    <button id="testBtn" class="button" onclick="testConnection()">
                        1. Test Database Connection
                    </button>
                    <div id="testResult"></div>
                </div>
                
                <div style="margin: 20px 0;">
                    <button id="installBtn" class="button" onclick="installDatabase()" disabled>
                        2. Install Database Schema
                    </button>
                    <div id="installResult"></div>
                </div>
                
                <div style="margin: 20px 0;">
                    <button id="statusBtn" class="button" onclick="checkStatus()" disabled>
                        3. Verify Installation
                    </button>
                    <div id="statusResult"></div>
                </div>
            </div>
            
            <div class="step">
                <h3>📊 Next Steps</h3>
                <p>After successful installation:</p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Visit your <a href="public/index.html" target="_blank">J'MONIC ENTERPRISE Dashboard</a></li>
                    <li>Test API endpoints: <a href="api/test.php" target="_blank">API Test</a></li>
                    <li>Check the <a href="database_setup.html">Database Setup Guide</a></li>
                </ul>
            </div>
        </div>
    </div>
    
    <script>
        function showLoading(elementId) {
            document.getElementById(elementId).innerHTML = '<div class="loading"></div> Processing...';
        }
        
        function showResult(elementId, success, message, data = null) {
            const element = document.getElementById(elementId);
            const statusClass = success ? 'status-success' : 'status-error';
            
            let html = `<div class="${statusClass}">
                <strong>${success ? '✅' : '❌'} ${message}</strong>`;
            
            if (data) {
                html += '<div style="margin-top: 10px; font-size: 0.9em;">';
                if (data.host) html += `<div>Host: ${data.host}</div>`;
                if (data.mysql_version) html += `<div>MySQL: ${data.mysql_version}</div>`;
                if (data.statements_executed) html += `<div>Statements executed: ${data.statements_executed}</div>`;
                if (data.tables_created) html += `<div>Tables created: ${data.tables_created}</div>`;
                if (data.sample_data_counts) {
                    html += '<div>Sample data: ';
                    Object.entries(data.sample_data_counts).forEach(([table, count]) => {
                        html += `${table}: ${count}, `;
                    });
                    html = html.slice(0, -2) + '</div>';
                }
                html += '</div>';
            }
            
            html += '</div>';
            element.innerHTML = html;
        }
        
        function testConnection() {
            showLoading('testResult');
            
            fetch('?action=test_connection')
                .then(response => response.json())
                .then(data => {
                    showResult('testResult', data.success, data.message, data.data);
                    if (data.success) {
                        document.getElementById('installBtn').disabled = false;
                    }
                })
                .catch(error => {
                    showResult('testResult', false, 'Connection test failed: ' + error.message);
                });
        }
        
        function installDatabase() {
            showLoading('installResult');
            
            fetch('?action=install_database')
                .then(response => response.json())
                .then(data => {
                    showResult('installResult', data.success, data.message, data.data);
                    if (data.success) {
                        document.getElementById('statusBtn').disabled = false;
                    }
                })
                .catch(error => {
                    showResult('installResult', false, 'Installation failed: ' + error.message);
                });
        }
        
        function checkStatus() {
            showLoading('statusResult');
            
            fetch('?action=check_status')
                .then(response => response.json())
                .then(data => {
                    showResult('statusResult', data.success, data.message, data.data);
                })
                .catch(error => {
                    showResult('statusResult', false, 'Status check failed: ' + error.message);
                });
        }
        
        // Auto-test connection on page load
        window.addEventListener('load', function() {
            setTimeout(testConnection, 500);
        });
    </script>
</body>
</html>