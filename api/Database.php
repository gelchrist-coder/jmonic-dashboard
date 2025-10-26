<?php
/**
 * J'MONIC ENTERPRISE - Database Helper Class
 * 
 * This class provides common database operations and utilities
 * for the natural hair business management system.
 */

require_once 'config_sqlite.php';

class Database {
    private $pdo;
    
    public function __construct() {
        $this->pdo = getDbConnection();
    }
    
    /**
     * Execute a SELECT query
     */
    public function select($query, $params = []) {
        try {
            $stmt = $this->pdo->prepare($query);
            $stmt->execute($params);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Select query failed: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Execute a SELECT query and return single row
     */
    public function selectOne($query, $params = []) {
        try {
            $stmt = $this->pdo->prepare($query);
            $stmt->execute($params);
            return $stmt->fetch();
        } catch (PDOException $e) {
            error_log("SelectOne query failed: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Execute an INSERT query
     */
    public function insert($table, $data) {
        try {
            $columns = array_keys($data);
            $placeholders = ':' . implode(', :', $columns);
            $columnsList = implode(', ', $columns);
            
            $query = "INSERT INTO {$table} ({$columnsList}) VALUES ({$placeholders})";
            $stmt = $this->pdo->prepare($query);
            
            $result = $stmt->execute($data);
            
            if ($result) {
                return $this->pdo->lastInsertId();
            }
            
            return false;
        } catch (PDOException $e) {
            error_log("Insert query failed: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Execute an UPDATE query
     */
    public function update($table, $data, $where, $whereParams = []) {
        try {
            $setClause = [];
            foreach (array_keys($data) as $column) {
                $setClause[] = "{$column} = :{$column}";
            }
            $setString = implode(', ', $setClause);
            
            $query = "UPDATE {$table} SET {$setString} WHERE {$where}";
            $stmt = $this->pdo->prepare($query);
            
            // Merge data and where parameters
            $params = array_merge($data, $whereParams);
            
            return $stmt->execute($params);
        } catch (PDOException $e) {
            error_log("Update query failed: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Execute a DELETE query
     */
    public function delete($table, $where, $params = []) {
        try {
            $query = "DELETE FROM {$table} WHERE {$where}";
            $stmt = $this->pdo->prepare($query);
            return $stmt->execute($params);
        } catch (PDOException $e) {
            error_log("Delete query failed: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Count records
     */
    public function count($table, $where = '1=1', $params = []) {
        try {
            $query = "SELECT COUNT(*) as count FROM {$table} WHERE {$where}";
            $stmt = $this->pdo->prepare($query);
            $stmt->execute($params);
            $result = $stmt->fetch();
            return $result['count'] ?? 0;
        } catch (PDOException $e) {
            error_log("Count query failed: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * Begin transaction
     */
    public function beginTransaction() {
        return $this->pdo->beginTransaction();
    }
    
    /**
     * Commit transaction
     */
    public function commit() {
        return $this->pdo->commit();
    }
    
    /**
     * Rollback transaction
     */
    public function rollback() {
        return $this->pdo->rollback();
    }
    
    /**
     * Get last insert ID
     */
    public function lastInsertId() {
        return $this->pdo->lastInsertId();
    }
    
    /**
     * Execute raw query
     */
    public function query($query, $params = []) {
        try {
            $stmt = $this->pdo->prepare($query);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            error_log("Raw query failed: " . $e->getMessage());
            return false;
        }
    }
    
    // ==========================================
    // BUSINESS-SPECIFIC HELPER METHODS
    // ==========================================
    
    /**
     * Get all products with stock information
     */
    public function getAllProducts() {
        $query = "
            SELECT 
                id,
                sku,
                name,
                description,
                price,
                cost,
                stock_quantity,
                min_stock_level,
                status,
                created_at,
                updated_at,
                CASE 
                    WHEN stock_quantity <= min_stock_level THEN 'low'
                    WHEN stock_quantity = 0 THEN 'out'
                    ELSE 'good'
                END as stock_status
            FROM products 
            WHERE status = 'active'
            ORDER BY name ASC
        ";
        
        return $this->select($query);
    }
    
    /**
     * Get low stock products
     */
    public function getLowStockProducts() {
        $query = "
            SELECT * FROM products 
            WHERE stock_quantity <= min_stock_level 
            AND status = 'active'
            ORDER BY stock_quantity ASC
        ";
        
        return $this->select($query);
    }
    
    /**
     * Get recent sales
     */
    public function getRecentSales($limit = 10) {
        $query = "
            SELECT 
                so.*,
                c.first_name,
                c.last_name
            FROM sales_orders so
            LEFT JOIN customers c ON so.customer_id = c.id
            ORDER BY so.created_at DESC
            LIMIT :limit
        ";
        
        return $this->select($query, ['limit' => $limit]);
    }
    
    /**
     * Get sales summary for dashboard
     */
    public function getSalesSummary($date = null) {
        $dateFilter = $date ? "DATE(order_date) = :date" : "DATE(order_date) = CURDATE()";
        $params = $date ? ['date' => $date] : [];
        
        $query = "
            SELECT 
                COUNT(*) as total_orders,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(SUM(total_cost), 0) as total_cost,
                COALESCE(SUM(profit), 0) as total_profit,
                COALESCE(AVG(total_amount), 0) as avg_order_value
            FROM sales_orders 
            WHERE {$dateFilter} 
            AND order_status = 'completed'
        ";
        
        return $this->selectOne($query, $params);
    }
    
    /**
     * Record inventory transaction
     */
    public function recordInventoryTransaction($productId, $transactionType, $quantityChange, $reference = null) {
        try {
            $this->beginTransaction();
            
            // Get current product stock
            $product = $this->selectOne("SELECT * FROM products WHERE id = :id", ['id' => $productId]);
            if (!$product) {
                throw new Exception("Product not found");
            }
            
            $previousStock = $product['stock_quantity'];
            $newStock = $previousStock + $quantityChange;
            
            // Prevent negative stock
            if ($newStock < 0) {
                $newStock = 0;
                $quantityChange = -$previousStock;
            }
            
            // Insert transaction record
            $transactionData = [
                'transaction_number' => generateId('TXN-'),
                'product_id' => $productId,
                'product_sku' => $product['sku'],
                'transaction_type' => $transactionType,
                'quantity_change' => $quantityChange,
                'previous_stock' => $previousStock,
                'new_stock' => $newStock,
                'unit_cost' => $product['cost'],
                'reference_type' => $reference['type'] ?? null,
                'reference_id' => $reference['id'] ?? null,
                'reference_number' => $reference['number'] ?? null,
                'created_by' => 'admin'
            ];
            
            $transactionId = $this->insert('inventory_transactions', $transactionData);
            
            if (!$transactionId) {
                throw new Exception("Failed to record transaction");
            }
            
            // Update product stock
            $updateResult = $this->update(
                'products',
                ['stock_quantity' => $newStock],
                'id = :id',
                ['id' => $productId]
            );
            
            if (!$updateResult) {
                throw new Exception("Failed to update product stock");
            }
            
            $this->commit();
            return $transactionId;
            
        } catch (Exception $e) {
            $this->rollback();
            error_log("Inventory transaction failed: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Check if SKU exists
     */
    public function skuExists($sku, $excludeId = null) {
        $query = "SELECT COUNT(*) as count FROM products WHERE sku = :sku";
        $params = ['sku' => $sku];
        
        if ($excludeId) {
            $query .= " AND id != :excludeId";
            $params['excludeId'] = $excludeId;
        }
        
        $result = $this->selectOne($query, $params);
        return $result['count'] > 0;
    }
    
    /**
     * Get dashboard statistics
     */
    public function getDashboardStats() {
        $stats = [];
        
        // Today's sales
        $todaySales = $this->getSalesSummary();
        $stats['today_sales'] = $todaySales['total_revenue'] ?? 0;
        $stats['today_orders'] = $todaySales['total_orders'] ?? 0;
        
        // Total products
        $stats['total_products'] = $this->count('products', 'status = :status', ['status' => 'active']);
        
        // Total customers
        $stats['total_customers'] = $this->count('customers', 'status = :status', ['status' => 'active']);
        
        // Low stock count
        $stats['low_stock_count'] = $this->count('products', 'stock_quantity <= min_stock_level AND status = :status', ['status' => 'active']);
        
        return $stats;
    }
}

?>