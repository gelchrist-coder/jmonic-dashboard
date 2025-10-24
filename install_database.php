#!/usr/bin/env php
<?php
/**
 * J'MONIC ENTERPRISE Database Installer
 * 
 * This script will help you set up the database for your natural hair business management system.
 * Run this script from the command line to automatically create tables and insert sample data.
 */

echo "\n";
echo "=====================================\n";
echo "J'MONIC ENTERPRISE Database Installer\n";
echo "=====================================\n\n";

// Check if we're running from command line
if (php_sapi_name() !== 'cli') {
    die("This script must be run from the command line.\n");
}

// Include the config file
$configFile = __DIR__ . '/api/config.php';
if (!file_exists($configFile)) {
    die("Error: config.php not found. Please ensure you're running this from the project root directory.\n");
}

// Temporarily disable the header outputs in config for CLI
define('CLI_MODE', true);
require_once $configFile;

echo "Step 1: Testing database connection...\n";

// Test database connection
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
    echo "✅ Connected to MySQL server successfully!\n\n";
} catch (PDOException $e) {
    die("❌ Failed to connect to MySQL server: " . $e->getMessage() . "\n\n");
}

echo "Step 2: Creating database if it doesn't exist...\n";

// Create database if it doesn't exist
try {
    $pdo->exec("CREATE DATABASE IF NOT EXISTS " . DB_NAME . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE " . DB_NAME);
    echo "✅ Database '" . DB_NAME . "' created/verified successfully!\n\n";
} catch (PDOException $e) {
    die("❌ Failed to create database: " . $e->getMessage() . "\n\n");
}

echo "Step 3: Reading SQL setup file...\n";

// Read the SQL setup file
$sqlFile = __DIR__ . '/database_setup.sql';
if (!file_exists($sqlFile)) {
    die("❌ Error: database_setup.sql not found.\n\n");
}

$sql = file_get_contents($sqlFile);
if ($sql === false) {
    die("❌ Error: Could not read database_setup.sql file.\n\n");
}

echo "✅ SQL setup file loaded successfully!\n\n";

echo "Step 4: Executing database setup...\n";

// Split SQL into individual statements
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
$errorCount = 0;

foreach ($statements as $statement) {
    try {
        if (trim($statement)) {
            $pdo->exec($statement);
            $successCount++;
        }
    } catch (PDOException $e) {
        // Ignore "table already exists" errors
        if (strpos($e->getMessage(), 'already exists') === false) {
            echo "⚠️  Warning: " . $e->getMessage() . "\n";
            $errorCount++;
        }
    }
}

echo "✅ Database setup completed!\n";
echo "   - {$successCount} statements executed successfully\n";
if ($errorCount > 0) {
    echo "   - {$errorCount} warnings (non-critical)\n";
}
echo "\n";

echo "Step 5: Verifying tables...\n";

// Verify tables were created
try {
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    echo "✅ Tables created successfully:\n";
    foreach ($tables as $table) {
        echo "   - {$table}\n";
    }
    echo "\n";
} catch (PDOException $e) {
    echo "⚠️  Could not verify tables: " . $e->getMessage() . "\n\n";
}

echo "Step 6: Checking sample data...\n";

// Check if sample data was inserted
try {
    $productCount = $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
    $categoryCount = $pdo->query("SELECT COUNT(*) FROM product_categories")->fetchColumn();
    $settingsCount = $pdo->query("SELECT COUNT(*) FROM business_settings")->fetchColumn();
    
    echo "✅ Sample data verified:\n";
    echo "   - {$categoryCount} product categories\n";
    echo "   - {$productCount} sample products\n";
    echo "   - {$settingsCount} business settings\n";
    echo "\n";
} catch (PDOException $e) {
    echo "⚠️  Could not verify sample data: " . $e->getMessage() . "\n\n";
}

echo "=====================================\n";
echo "🎉 INSTALLATION COMPLETE! 🎉\n";
echo "=====================================\n\n";

echo "Your J'MONIC ENTERPRISE database is now ready!\n\n";

echo "Next steps:\n";
echo "1. Start your web server:\n";
echo "   php -S localhost:8000\n\n";
echo "2. Open your dashboard:\n";
echo "   http://localhost:8000/public/index.html\n\n";
echo "3. Test the API connection:\n";
echo "   curl http://localhost:8000/api/test.php\n\n";

echo "Database connection details:\n";
echo "- Host: " . DB_HOST . "\n";
echo "- Database: " . DB_NAME . "\n";
echo "- User: " . DB_USER . "\n";
echo "- Tables: " . count($tables) . " created\n\n";

echo "Happy selling! 💰\n\n";
?>