-- J'MONIC ENTERPRISE Database Setup
-- Natural Hair Business Management System
-- Created: October 2025

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS jmonic_enterprise CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jmonic_enterprise;

-- ==========================================
-- CUSTOMERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_number VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Ghana',
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    status ENUM('active', 'inactive') DEFAULT 'active',
    total_spent DECIMAL(15,2) DEFAULT 0.00,
    total_orders INT DEFAULT 0,
    last_order_date DATETIME,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_customer_number (customer_number),
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_status (status),
    INDEX idx_name (last_name, first_name)
);

-- ==========================================
-- SUPPLIERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_number VARCHAR(20) UNIQUE NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Ghana',
    payment_terms VARCHAR(100),
    status ENUM('active', 'inactive') DEFAULT 'active',
    total_purchases DECIMAL(15,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_supplier_number (supplier_number),
    INDEX idx_company_name (company_name),
    INDEX idx_status (status)
);

-- ==========================================
-- PRODUCT CATEGORIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS product_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE SET NULL,
    INDEX idx_name (name),
    INDEX idx_status (status),
    INDEX idx_parent (parent_id)
);

-- ==========================================
-- PRODUCTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id INT,
    supplier_id INT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    stock_quantity INT NOT NULL DEFAULT 0,
    min_stock_level INT DEFAULT 20,
    max_stock_level INT DEFAULT 500,
    unit VARCHAR(20) DEFAULT 'piece',
    weight DECIMAL(8,2),
    dimensions VARCHAR(50),
    image_url VARCHAR(500),
    barcode VARCHAR(50),
    brand VARCHAR(100),
    status ENUM('active', 'inactive', 'discontinued') DEFAULT 'active',
    is_trackable BOOLEAN DEFAULT TRUE,
    last_restocked DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    INDEX idx_sku (sku),
    INDEX idx_name (name),
    INDEX idx_category (category_id),
    INDEX idx_status (status),
    INDEX idx_stock (stock_quantity),
    INDEX idx_price (price),
    FULLTEXT idx_search (name, description, sku)
);

-- ==========================================
-- SALES ORDERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS sales_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(20) UNIQUE NOT NULL,
    customer_id INT,
    order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    order_status ENUM('pending', 'processing', 'completed', 'cancelled', 'refunded') DEFAULT 'pending',
    payment_status ENUM('pending', 'partial', 'paid', 'refunded') DEFAULT 'pending',
    payment_method ENUM('cash', 'mobile_money', 'bank_transfer', 'cheque', 'credit') DEFAULT 'cash',
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    discount_amount DECIMAL(15,2) DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_cost DECIMAL(15,2) DEFAULT 0.00,
    profit DECIMAL(15,2) DEFAULT 0.00,
    served_by VARCHAR(100) DEFAULT 'admin',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    INDEX idx_order_number (order_number),
    INDEX idx_customer (customer_id),
    INDEX idx_order_date (order_date),
    INDEX idx_status (order_status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_total (total_amount)
);

-- ==========================================
-- SALES ORDER ITEMS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS sales_order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_sku VARCHAR(50) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    line_cost DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    line_profit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_order (order_id),
    INDEX idx_product (product_id),
    INDEX idx_sku (product_sku)
);

-- ==========================================
-- PURCHASE ORDERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(20) UNIQUE NOT NULL,
    supplier_id INT,
    order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expected_date DATE,
    received_date DATETIME,
    order_status ENUM('pending', 'ordered', 'partial', 'received', 'cancelled') DEFAULT 'pending',
    payment_status ENUM('pending', 'partial', 'paid') DEFAULT 'pending',
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_by VARCHAR(100) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    INDEX idx_order_number (order_number),
    INDEX idx_supplier (supplier_id),
    INDEX idx_order_date (order_date),
    INDEX idx_status (order_status)
);

-- ==========================================
-- PURCHASE ORDER ITEMS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_sku VARCHAR(50) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    quantity_ordered INT NOT NULL DEFAULT 1,
    quantity_received INT DEFAULT 0,
    unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_order (order_id),
    INDEX idx_product (product_id)
);

-- ==========================================
-- INVENTORY TRANSACTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_number VARCHAR(20) UNIQUE NOT NULL,
    product_id INT NOT NULL,
    product_sku VARCHAR(50) NOT NULL,
    transaction_type ENUM('sale', 'purchase', 'adjustment', 'return', 'damage', 'transfer') NOT NULL,
    quantity_change INT NOT NULL,
    previous_stock INT NOT NULL DEFAULT 0,
    new_stock INT NOT NULL DEFAULT 0,
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    reference_type ENUM('sales_order', 'purchase_order', 'adjustment', 'return') NULL,
    reference_id INT NULL,
    reference_number VARCHAR(20) NULL,
    notes TEXT,
    created_by VARCHAR(100) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_transaction_number (transaction_number),
    INDEX idx_product (product_id),
    INDEX idx_type (transaction_type),
    INDEX idx_date (created_at),
    INDEX idx_reference (reference_type, reference_id)
);

-- ==========================================
-- BUSINESS SETTINGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS business_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_key (setting_key),
    INDEX idx_public (is_public)
);

-- ==========================================
-- ACTIVITY LOGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(100) DEFAULT 'admin',
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    table_name VARCHAR(50),
    record_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user (user_id),
    INDEX idx_type (activity_type),
    INDEX idx_table (table_name),
    INDEX idx_date (created_at)
);

-- ==========================================
-- INSERT DEFAULT DATA
-- ==========================================

-- Default product categories
INSERT IGNORE INTO product_categories (name, description) VALUES
('Hair Care', 'Natural hair care products'),
('Styling Products', 'Products for styling natural hair'),
('Hair Tools', 'Tools and accessories for hair care'),
('Hair Extensions', 'Natural and synthetic hair extensions'),
('Oils & Treatments', 'Hair oils and treatment products');

-- Default business settings
INSERT IGNORE INTO business_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('business_name', 'J\'MONIC ENTERPRISE', 'string', 'Business name', true),
('business_type', 'Natural Hair Products', 'string', 'Type of business', true),
('currency', 'GHS', 'string', 'Default currency', true),
('low_stock_threshold', '20', 'number', 'Low stock alert threshold', false),
('tax_rate', '0.00', 'number', 'Default tax rate percentage', false),
('receipt_footer', 'Thank you for your business!', 'string', 'Receipt footer message', true);

-- Sample supplier
INSERT IGNORE INTO suppliers (supplier_number, company_name, contact_person, phone, email, address, city) VALUES
('SUP-001', 'Natural Hair Supplies Ltd', 'Grace Mensah', '+233244567890', 'orders@naturalhair.gh', '123 Liberation Road', 'Accra');

-- Sample customer
INSERT IGNORE INTO customers (customer_number, first_name, last_name, phone, email, city) VALUES
('CUST-001', 'Akosua', 'Asante', '+233201234567', 'akosua@email.com', 'Accra');

-- Sample products
INSERT IGNORE INTO products (sku, name, description, category_id, price, cost, stock_quantity, min_stock_level) VALUES
('SKU-001', 'Shea Butter Hair Cream', 'Natural shea butter cream for moisturizing hair', 1, 25.00, 15.00, 50, 10),
('SKU-002', 'Coconut Oil Hair Treatment', 'Pure coconut oil for deep hair conditioning', 5, 20.00, 12.00, 30, 5),
('SKU-003', 'Wide Tooth Comb', 'Gentle wide tooth comb for detangling', 3, 15.00, 8.00, 25, 5),
('SKU-004', 'Natural Hair Gel', 'Alcohol-free styling gel for natural hair', 2, 18.00, 10.00, 40, 8);

-- ==========================================
-- CREATE VIEWS FOR REPORTING
-- ==========================================

-- Product stock status view
CREATE OR REPLACE VIEW view_product_stock_status AS
SELECT 
    p.id,
    p.sku,
    p.name,
    p.stock_quantity,
    p.min_stock_level,
    p.price,
    pc.name as category_name,
    CASE 
        WHEN p.stock_quantity = 0 THEN 'Out of Stock'
        WHEN p.stock_quantity <= p.min_stock_level THEN 'Low Stock'
        ELSE 'In Stock'
    END as stock_status,
    p.stock_quantity * p.price as stock_value
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
WHERE p.status = 'active';

-- Sales summary view
CREATE OR REPLACE VIEW view_sales_summary AS
SELECT 
    DATE(so.order_date) as sale_date,
    COUNT(so.id) as total_orders,
    SUM(so.total_amount) as total_revenue,
    SUM(so.total_cost) as total_cost,
    SUM(so.profit) as total_profit,
    AVG(so.total_amount) as avg_order_value
FROM sales_orders so
WHERE so.order_status = 'completed'
GROUP BY DATE(so.order_date)
ORDER BY sale_date DESC;

-- Customer summary view
CREATE OR REPLACE VIEW view_customer_summary AS
SELECT 
    c.id,
    c.customer_number,
    CONCAT(c.first_name, ' ', c.last_name) as full_name,
    c.phone,
    c.email,
    c.total_orders,
    c.total_spent,
    c.last_order_date,
    CASE 
        WHEN c.last_order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 'Active'
        WHEN c.last_order_date >= DATE_SUB(NOW(), INTERVAL 90 DAY) THEN 'Recent'
        ELSE 'Inactive'
    END as status_category
FROM customers c
WHERE c.status = 'active';

COMMIT;

-- Display success message
SELECT 'J\'MONIC ENTERPRISE Database Setup Complete!' as Message;