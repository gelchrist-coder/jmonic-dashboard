-- J'MONIC ENTERPRISE - Long-Term Data Storage Schema (5+ Years)
-- Database structure with partitioning and archival support

-- ========================================
-- 1. MAIN TRANSACTIONAL TABLES
-- ========================================

-- Archived Sales Data (Partitioned by Year)
CREATE TABLE IF NOT EXISTS `sales_archive_2024` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `customer_id` INT,
    `product_ids` JSON,
    `quantities` JSON,
    `unit_prices` JSON,
    `total_amount` DECIMAL(10, 2),
    `payment_method` VARCHAR(50),
    `transaction_date` DATETIME,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `archived_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_customer_id` (`customer_id`),
    INDEX `idx_transaction_date` (`transaction_date`),
    INDEX `idx_archived_at` (`archived_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sales_archive_2023` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `customer_id` INT,
    `product_ids` JSON,
    `quantities` JSON,
    `unit_prices` JSON,
    `total_amount` DECIMAL(10, 2),
    `payment_method` VARCHAR(50),
    `transaction_date` DATETIME,
    `created_at` TIMESTAMP,
    `archived_at` TIMESTAMP,
    INDEX `idx_customer_id` (`customer_id`),
    INDEX `idx_transaction_date` (`transaction_date`),
    INDEX `idx_archived_at` (`archived_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sales_archive_2022` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `customer_id` INT,
    `product_ids` JSON,
    `quantities` JSON,
    `unit_prices` JSON,
    `total_amount` DECIMAL(10, 2),
    `payment_method` VARCHAR(50),
    `transaction_date` DATETIME,
    `created_at` TIMESTAMP,
    `archived_at` TIMESTAMP,
    INDEX `idx_customer_id` (`customer_id`),
    INDEX `idx_transaction_date` (`transaction_date`),
    INDEX `idx_archived_at` (`archived_at`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Main Sales Table (Current + 1 Year)
CREATE TABLE IF NOT EXISTS `sales` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `customer_id` INT,
    `product_ids` JSON,
    `quantities` JSON,
    `unit_prices` JSON,
    `total_amount` DECIMAL(10, 2),
    `payment_method` VARCHAR(50),
    `transaction_date` DATETIME,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `is_archived` BOOLEAN DEFAULT FALSE,
    INDEX `idx_customer_id` (`customer_id`),
    INDEX `idx_transaction_date` (`transaction_date`),
    INDEX `idx_is_archived` (`is_archived`),
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 2. CUSTOMER HISTORY (Immutable Records)
-- ========================================

CREATE TABLE IF NOT EXISTS `customer_snapshots` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `customer_id` INT NOT NULL,
    `snapshot_date` DATE NOT NULL,
    `name` VARCHAR(100),
    `phone` VARCHAR(20),
    `email` VARCHAR(100),
    `total_purchases` INT,
    `total_spent` DECIMAL(10, 2),
    `last_purchase_date` DATE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_customer_id` (`customer_id`),
    INDEX `idx_snapshot_date` (`snapshot_date`),
    UNIQUE KEY `unique_customer_snapshot` (`customer_id`, `snapshot_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 3. INVENTORY HISTORY (Track Changes)
-- ========================================

CREATE TABLE IF NOT EXISTS `inventory_history` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `product_id` INT NOT NULL,
    `sku` VARCHAR(50),
    `product_name` VARCHAR(255),
    `quantity_before` INT,
    `quantity_after` INT,
    `quantity_change` INT,
    `reason` VARCHAR(255) COMMENT 'sale, restock, adjustment, damage',
    `transaction_date` DATETIME,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_product_id` (`product_id`),
    INDEX `idx_transaction_date` (`transaction_date`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 4. REVENUE SNAPSHOTS (Daily Summaries)
-- ========================================

CREATE TABLE IF NOT EXISTS `daily_revenue` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `revenue_date` DATE UNIQUE NOT NULL,
    `total_sales` INT COMMENT 'Number of transactions',
    `total_revenue` DECIMAL(10, 2),
    `total_costs` DECIMAL(10, 2),
    `profit` DECIMAL(10, 2),
    `customers_served` INT,
    `top_product_id` INT,
    `top_product_name` VARCHAR(255),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_revenue_date` (`revenue_date`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `monthly_revenue` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `revenue_year_month` CHAR(7) UNIQUE NOT NULL COMMENT 'YYYY-MM',
    `total_sales` INT,
    `total_revenue` DECIMAL(10, 2),
    `total_costs` DECIMAL(10, 2),
    `profit` DECIMAL(10, 2),
    `customers_served` INT,
    `avg_transaction_value` DECIMAL(10, 2),
    `days_active` INT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_revenue_year_month` (`revenue_year_month`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `yearly_revenue` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `revenue_year` INT UNIQUE NOT NULL,
    `total_sales` INT,
    `total_revenue` DECIMAL(10, 2),
    `total_costs` DECIMAL(10, 2),
    `profit` DECIMAL(10, 2),
    `customers_served` INT,
    `avg_transaction_value` DECIMAL(10, 2),
    `months_active` INT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_revenue_year` (`revenue_year`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 5. BACKUP METADATA
-- ========================================

CREATE TABLE IF NOT EXISTS `backup_logs` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `backup_date` DATETIME NOT NULL,
    `backup_type` VARCHAR(50) COMMENT 'daily, weekly, monthly, yearly',
    `backup_file_path` VARCHAR(255),
    `backup_file_size` BIGINT COMMENT 'Size in bytes',
    `records_backed_up` INT,
    `status` VARCHAR(50) COMMENT 'success, partial, failed',
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_backup_date` (`backup_date`),
    INDEX `idx_backup_type` (`backup_type`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 6. DATA RETENTION POLICY
-- ========================================

CREATE TABLE IF NOT EXISTS `data_retention_policy` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `policy_name` VARCHAR(100),
    `data_type` VARCHAR(100) COMMENT 'sales, inventory, customers, revenue',
    `retention_years` INT DEFAULT 5,
    `archive_after_months` INT DEFAULT 12,
    `compress_after_months` INT DEFAULT 24,
    `delete_after_years` INT,
    `description` TEXT,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_data_type` (`data_type`),
    INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 7. DATA EXPORT LOGS
-- ========================================

CREATE TABLE IF NOT EXISTS `data_exports` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `export_date` DATETIME NOT NULL,
    `export_format` VARCHAR(50) COMMENT 'csv, json, xml, excel',
    `data_type` VARCHAR(100),
    `date_range_from` DATE,
    `date_range_to` DATE,
    `record_count` INT,
    `file_path` VARCHAR(255),
    `file_size` BIGINT,
    `exported_by` VARCHAR(100),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_export_date` (`export_date`),
    INDEX `idx_data_type` (`data_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 8. INSERT DEFAULT DATA RETENTION POLICIES
-- ========================================

INSERT INTO `data_retention_policy` (`policy_name`, `data_type`, `retention_years`, `archive_after_months`, `compress_after_months`, `delete_after_years`, `description`)
VALUES
    ('Sales History - Full Retention', 'sales', 10, 12, 24, NULL, 'Keep all sales records for 10 years (law requirement), archive after 1 year, compress after 2 years'),
    ('Inventory History - 5 Year Keep', 'inventory', 5, 6, 12, 5, 'Keep inventory changes for 5 years, archive after 6 months'),
    ('Customer Snapshots - 7 Year Keep', 'customers', 7, 12, 36, 7, 'Keep customer snapshots for 7 years (business requirement)'),
    ('Revenue Reports - Permanent', 'revenue', NULL, 3, 12, NULL, 'Keep revenue reports permanently for business intelligence'),
    ('Backup Archives - 5 Year Keep', 'backups', 5, 12, 24, 5, 'Keep backup archives for 5 years for disaster recovery');

-- ========================================
-- 9. CREATE VIEWS FOR EASY QUERIES
-- ========================================

-- View to combine all sales data (current + archives)
CREATE OR REPLACE VIEW `v_all_sales` AS
SELECT 
    'current' as `source`,
    `id`, `customer_id`, `product_ids`, `quantities`, `unit_prices`, 
    `total_amount`, `payment_method`, `transaction_date`, `created_at`
FROM `sales`
UNION ALL
SELECT 'archive_2024', * FROM `sales_archive_2024`
UNION ALL
SELECT 'archive_2023', * FROM `sales_archive_2023`
UNION ALL
SELECT 'archive_2022', * FROM `sales_archive_2022`;

-- View to get complete customer history
CREATE OR REPLACE VIEW `v_customer_complete_history` AS
SELECT 
    c.`id`,
    c.`name`,
    c.`phone`,
    c.`email`,
    COUNT(s.`id`) as `lifetime_transactions`,
    SUM(s.`total_amount`) as `lifetime_spent`,
    MIN(s.`transaction_date`) as `first_purchase`,
    MAX(s.`transaction_date`) as `last_purchase`,
    (YEAR(CURDATE()) - YEAR(MIN(s.`transaction_date`))) as `years_as_customer`
FROM `customers` c
LEFT JOIN `v_all_sales` s ON c.`id` = s.`customer_id`
GROUP BY c.`id`;

-- ========================================
-- 10. CREATE STORED PROCEDURES FOR ARCHIVAL
-- ========================================

DELIMITER //

-- Archive old sales to archive table
CREATE PROCEDURE `archive_old_sales`()
BEGIN
    DECLARE archive_date DATE;
    SET archive_date = DATE_SUB(CURDATE(), INTERVAL 1 YEAR);
    
    -- Move sales older than 1 year to archive
    INSERT INTO `sales_archive_2024`
    SELECT * FROM `sales`
    WHERE YEAR(`transaction_date`) = 2024 AND `transaction_date` < archive_date;
    
    UPDATE `sales`
    SET `is_archived` = TRUE
    WHERE `transaction_date` < archive_date;
    
    -- Log the archival
    INSERT INTO `backup_logs` (`backup_date`, `backup_type`, `status`, `notes`)
    VALUES (NOW(), 'archive', 'success', CONCAT('Archived sales before ', archive_date));
END //

-- Create daily revenue snapshot
CREATE PROCEDURE `create_daily_revenue_snapshot`(IN snapshot_date DATE)
BEGIN
    INSERT INTO `daily_revenue` (
        `revenue_date`, `total_sales`, `total_revenue`, `total_costs`, 
        `profit`, `customers_served`
    )
    SELECT 
        snapshot_date,
        COUNT(s.`id`) as `total_sales`,
        COALESCE(SUM(s.`total_amount`), 0) as `total_revenue`,
        COALESCE(SUM(p.`cost_price` * sj.`quantity`), 0) as `total_costs`,
        COALESCE(SUM(s.`total_amount`), 0) - COALESCE(SUM(p.`cost_price` * sj.`quantity`), 0) as `profit`,
        COUNT(DISTINCT s.`customer_id`) as `customers_served`
    FROM `sales` s
    LEFT JOIN JSON_TABLE(
        s.`product_ids`,
        '$[*]' COLUMNS (id INT PATH '$')
    ) AS pids ON TRUE
    LEFT JOIN JSON_TABLE(
        s.`quantities`,
        '$[*]' COLUMNS (quantity INT PATH '$')
    ) AS qty ON TRUE
    LEFT JOIN `products` p ON pids.`id` = p.`id`
    WHERE DATE(s.`transaction_date`) = snapshot_date
    ON DUPLICATE KEY UPDATE 
        `total_sales` = VALUES(`total_sales`),
        `total_revenue` = VALUES(`total_revenue`),
        `total_costs` = VALUES(`total_costs`),
        `profit` = VALUES(`profit`);
END //

-- Create monthly revenue snapshot
CREATE PROCEDURE `create_monthly_revenue_snapshot`(IN year_month CHAR(7))
BEGIN
    DECLARE start_date DATE;
    DECLARE end_date DATE;
    
    SET start_date = CONCAT(year_month, '-01');
    SET end_date = LAST_DAY(start_date);
    
    INSERT INTO `monthly_revenue` (
        `revenue_year_month`, `total_sales`, `total_revenue`, `total_costs`,
        `profit`, `customers_served`, `avg_transaction_value`, `days_active`
    )
    SELECT
        year_month,
        COUNT(s.`id`),
        COALESCE(SUM(s.`total_amount`), 0),
        COALESCE(SUM(p.`cost_price` * sj.`quantity`), 0),
        COALESCE(SUM(s.`total_amount`), 0) - COALESCE(SUM(p.`cost_price` * sj.`quantity`), 0),
        COUNT(DISTINCT s.`customer_id`),
        COALESCE(AVG(s.`total_amount`), 0),
        COUNT(DISTINCT DATE(s.`transaction_date`))
    FROM `sales` s
    LEFT JOIN JSON_TABLE(
        s.`product_ids`,
        '$[*]' COLUMNS (id INT PATH '$')
    ) AS pids ON TRUE
    LEFT JOIN JSON_TABLE(
        s.`quantities`,
        '$[*]' COLUMNS (quantity INT PATH '$')
    ) AS qty ON TRUE
    LEFT JOIN `products` p ON pids.`id` = p.`id`
    WHERE DATE(s.`transaction_date`) BETWEEN start_date AND end_date
    ON DUPLICATE KEY UPDATE
        `total_sales` = VALUES(`total_sales`),
        `total_revenue` = VALUES(`total_revenue`),
        `total_costs` = VALUES(`total_costs`),
        `profit` = VALUES(`profit`);
END //

DELIMITER ;

-- ========================================
-- 11. CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Index for faster archival queries
CREATE INDEX `idx_sales_archived_date` ON `sales`(`transaction_date`, `is_archived`);

-- Index for inventory history queries
CREATE INDEX `idx_inventory_date_product` ON `inventory_history`(`transaction_date`, `product_id`);

-- Composite index for customer analytics
CREATE INDEX `idx_customer_snapshot_analysis` ON `customer_snapshots`(`snapshot_date`, `customer_id`);

-- Index for revenue reports
CREATE INDEX `idx_revenue_date_analysis` ON `daily_revenue`(`revenue_date`);
