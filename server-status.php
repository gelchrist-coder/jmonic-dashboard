<!DOCTYPE html>
<html>
<head>
    <title>J'MONIC ENTERPRISE - Server Status</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .status-good { color: green; }
        .status-bad { color: red; }
        .status-warning { color: orange; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>J'MONIC ENTERPRISE - Server Status Check</h1>
    
    <div class="section">
        <h2>PHP Configuration</h2>
        <p>PHP Version: <span class="status-good"><?php echo PHP_VERSION; ?></span></p>
        <p>Server: <?php echo $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown'; ?></p>
        <p>Document Root: <?php echo $_SERVER['DOCUMENT_ROOT'] ?? 'Unknown'; ?></p>
        <p>Current Time: <?php echo date('Y-m-d H:i:s'); ?></p>
    </div>
    
    <div class="section">
        <h2>Required Extensions</h2>
        <p>PDO: <span class="<?php echo extension_loaded('pdo') ? 'status-good">✅ Loaded' : 'status-bad">❌ Missing'; ?></span></p>
        <p>PDO MySQL: <span class="<?php echo extension_loaded('pdo_mysql') ? 'status-good">✅ Loaded' : 'status-bad">❌ Missing'; ?></span></p>
        <p>JSON: <span class="<?php echo extension_loaded('json') ? 'status-good">✅ Loaded' : 'status-bad">❌ Missing'; ?></span></p>
    </div>
    
    <div class="section">
        <h2>Database Connection Test</h2>
        <?php
        try {
            // Try to include config
            $configPath = __DIR__ . '/api/config.php';
            if (file_exists($configPath)) {
                include_once $configPath;
                
                // Test database connection
                $pdo = getDbConnection();
                if ($pdo) {
                    echo '<p class="status-good">✅ Database connection successful</p>';
                    
                    // Test if tables exist
                    $stmt = $pdo->query("SHOW TABLES LIKE 'products'");
                    if ($stmt->rowCount() > 0) {
                        echo '<p class="status-good">✅ Products table exists</p>';
                    } else {
                        echo '<p class="status-warning">⚠️ Products table not found - run database_setup.sql</p>';
                    }
                } else {
                    echo '<p class="status-bad">❌ Database connection failed</p>';
                }
            } else {
                echo '<p class="status-bad">❌ Config file not found</p>';
            }
        } catch (Exception $e) {
            echo '<p class="status-bad">❌ Database error: ' . htmlspecialchars($e->getMessage()) . '</p>';
        }
        ?>
    </div>
    
    <div class="section">
        <h2>File Permissions</h2>
        <?php
        $apiDir = __DIR__ . '/api';
        if (is_dir($apiDir)) {
            echo '<p class="status-good">✅ API directory exists</p>';
            if (is_readable($apiDir)) {
                echo '<p class="status-good">✅ API directory is readable</p>';
            } else {
                echo '<p class="status-bad">❌ API directory is not readable</p>';
            }
        } else {
            echo '<p class="status-bad">❌ API directory not found</p>';
        }
        ?>
    </div>
    
    <div class="section">
        <h2>Quick Setup Check</h2>
        <ol>
            <li>✅ Place files in web server directory</li>
            <li><?php echo file_exists(__DIR__ . '/database_setup.sql') ? '✅' : '❌'; ?> Database setup file exists</li>
            <li><?php echo file_exists(__DIR__ . '/api/config.php') ? '✅' : '❌'; ?> Config file exists</li>
            <li><?php 
                if (file_exists(__DIR__ . '/api/config.php')) {
                    include_once __DIR__ . '/api/config.php';
                    if (DB_USER === 'root' && DB_PASS === '') {
                        echo '<span class="status-warning">⚠️ Update database credentials in config.php</span>';
                    } else {
                        echo '✅ Database credentials configured';
                    }
                } else {
                    echo '❌ Config file missing';
                }
            ?></li>
            <li><?php echo is_dir(__DIR__ . '/public') ? '✅' : '❌'; ?> Public directory exists</li>
        </ol>
    </div>
    
    <div class="section">
        <h2>Next Steps</h2>
        <p>If you see any ❌ or ⚠️ above, please:</p>
        <ol>
            <li>Import <code>database_setup.sql</code> into MySQL Workbench</li>
            <li>Update database credentials in <code>api/config.php</code></li>
            <li>Ensure your web server (Apache/Nginx) is running</li>
            <li>Access your dashboard at: <a href="public/index.html">public/index.html</a></li>
        </ol>
    </div>
</body>
</html>