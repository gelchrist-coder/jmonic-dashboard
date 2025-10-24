#!/usr/bin/env php
<?php
/**
 * J'MONIC ENTERPRISE Database Status Checker
 * 
 * Quick script to check if your database setup is working correctly.
 */

echo "\n🔍 J'MONIC ENTERPRISE Database Status Check\n";
echo "==========================================\n\n";

// Include config (CLI mode)
define('CLI_MODE', true);
$configFile = __DIR__ . '/api/config.php';

if (!file_exists($configFile)) {
    die("❌ Error: config.php not found.\n\n");
}

require_once $configFile;

echo "📋 Configuration:\n";
echo "   Host: " . DB_HOST . "\n";
echo "   Database: " . DB_NAME . "\n";
echo "   User: " . DB_USER . "\n";
echo "   Password: " . (DB_PASS ? str_repeat('*', strlen(DB_PASS)) : 'none') . "\n\n";

// Test connection
echo "🔌 Testing database connection...\n";
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET,
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo "✅ Database connection successful!\n\n";
} catch (PDOException $e) {
    die("❌ Database connection failed: " . $e->getMessage() . "\n\n");
}

// Check tables
echo "📊 Checking tables...\n";
try {
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    
    $expectedTables = [
        'products', 'product_categories', 'customers', 'suppliers',
        'sales_orders', 'sales_order_items', 'purchase_orders', 'purchase_order_items',
        'inventory_transactions', 'business_settings', 'activity_logs'
    ];
    
    $missingTables = array_diff($expectedTables, $tables);
    
    if (empty($missingTables)) {
        echo "✅ All tables present (" . count($tables) . " total)\n";
    } else {
        echo "⚠️  Missing tables: " . implode(', ', $missingTables) . "\n";
    }
    echo "\n";
} catch (PDOException $e) {
    echo "❌ Could not check tables: " . $e->getMessage() . "\n\n";
}

// Check sample data
echo "📦 Checking sample data...\n";
try {
    $counts = [];
    $tables = ['products', 'product_categories', 'customers', 'suppliers', 'business_settings'];
    
    foreach ($tables as $table) {
        $count = $pdo->query("SELECT COUNT(*) FROM {$table}")->fetchColumn();
        $counts[$table] = $count;
        echo "   {$table}: {$count} records\n";
    }
    echo "\n";
} catch (PDOException $e) {
    echo "❌ Could not check sample data: " . $e->getMessage() . "\n\n";
}

// Test API endpoints
echo "🌐 Testing API endpoints...\n";

$baseUrl = 'http://localhost:8000/api/';
$endpoints = ['test.php', 'products.php', 'dashboard.php'];

foreach ($endpoints as $endpoint) {
    $url = $baseUrl . $endpoint;
    
    // Use curl if available, otherwise skip
    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200) {
            echo "✅ {$endpoint}: OK\n";
        } else {
            echo "⚠️  {$endpoint}: HTTP {$httpCode}\n";
        }
    } else {
        echo "⏭️  {$endpoint}: Skipped (curl not available)\n";
    }
}

echo "\n🎯 Status Summary:\n";
echo "================\n";

$overallStatus = "✅ READY";

if (!empty($missingTables)) {
    $overallStatus = "⚠️  NEEDS SETUP";
    echo "❗ Run the installer: php install_database.php\n";
}

if (array_sum($counts) === 0) {
    $overallStatus = "⚠️  NO DATA";
    echo "❗ No sample data found. Run installer to add sample data.\n";
}

echo "\nOverall Status: {$overallStatus}\n\n";

if ($overallStatus === "✅ READY") {
    echo "🚀 Your database is ready for business!\n";
    echo "   Start server: php -S localhost:8000\n";
    echo "   Open dashboard: http://localhost:8000/public/\n";
}

echo "\n";
?>