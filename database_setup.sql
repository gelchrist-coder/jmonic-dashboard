-- J'MONIC ENTERPRISE Database Setup
-- Natural Hair Business Management System
-- Created: October 2025
-- Updated: November 2025 - Multi-tenant authentication added

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS jmonic_enterprise CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jmonic_enterprise;

-- ==========================================
-- COMPANIES TABLE (Multi-tenant)
-- ==========================================
CREATE TABLE IF NOT EXISTS companies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(200) NOT NULL UNIQUE,
    slug VARCHAR(200) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Ghana',
    logo_url VARCHAR(500),
    website VARCHAR(255),
    industry VARCHAR(100),
    business_type VARCHAR(100),
    subscription_plan ENUM('free', 'starter', 'professional', 'enterprise') DEFAULT 'free',
    subscription_status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    max_users INT DEFAULT 5,
    storage_gb INT DEFAULT 1,
    storage_used_mb INT DEFAULT 0,
    api_quota INT DEFAULT 1000,
    api_calls_this_month INT DEFAULT 0,
    settings JSON,
    employee_invitation_code VARCHAR(50) UNIQUE,
    employee_invitations_enabled BOOLEAN DEFAULT TRUE,
    status ENUM('active', 'inactive', 'deleted') DEFAULT 'active',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_slug (slug),
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_subscription (subscription_status),
    INDEX idx_invitation_code (employee_invitation_code)
);

-- ==========================================
-- USERS TABLE (Authentication)
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    role ENUM('owner', 'admin', 'manager', 'staff', 'viewer') DEFAULT 'staff',
    department VARCHAR(100),
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    last_login DATETIME,
    login_attempts INT DEFAULT 0,
    locked_until DATETIME,
    email_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    preferences JSON,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_email_company (email, company_id),
    UNIQUE KEY unique_username_company (username, company_id),
    INDEX idx_company (company_id),
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_role (role),
    INDEX idx_last_login (last_login)
);

-- ==========================================
-- USER ROLES TABLE (Fine-grained permissions)
-- ==========================================
CREATE TABLE IF NOT EXISTS user_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSON NOT NULL,
    is_system_role BOOLEAN DEFAULT FALSE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_role_company (role_name, company_id),
    INDEX idx_company (company_id),
    INDEX idx_status (status)
);

-- ==========================================
-- SESSIONS TABLE (User sessions)
-- ==========================================
CREATE TABLE IF NOT EXISTS sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    company_id INT NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_company (company_id),
    INDEX idx_expires (expires_at),
    INDEX idx_token (token_hash)
);

-- ==========================================
-- AUDIT LOG TABLE (Track all changes per company)
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_company (company_id),
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_date (created_at)
);

-- ==========================================
-- CUSTOMERS TABLE (Multi-tenant)
-- ==========================================
CREATE TABLE IF NOT EXISTS customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    customer_number VARCHAR(20) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
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
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_customer_number (customer_number, company_id),
    INDEX idx_company (company_id),
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
    company_id INT NOT NULL,
    supplier_number VARCHAR(20) NOT NULL,
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
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_supplier_number (supplier_number, company_id),
    INDEX idx_company (company_id),
    INDEX idx_supplier_number (supplier_number),
    INDEX idx_company_name (company_name),
    INDEX idx_status (status)
);

-- ==========================================
-- PRODUCT CATEGORIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS product_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE SET NULL,
    INDEX idx_company (company_id),
    INDEX idx_name (name),
    INDEX idx_status (status),
    INDEX idx_parent (parent_id)
);

-- ==========================================
-- PRODUCTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    sku VARCHAR(50) NOT NULL,
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
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    UNIQUE KEY unique_sku_company (sku, company_id),
    INDEX idx_company (company_id),
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
    company_id INT NOT NULL,
    order_number VARCHAR(20) NOT NULL,
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
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    UNIQUE KEY unique_order_number (order_number, company_id),
    INDEX idx_company (company_id),
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
    company_id INT NOT NULL,
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
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_company (company_id),
    INDEX idx_order (order_id),
    INDEX idx_product (product_id),
    INDEX idx_sku (product_sku)
);

-- ==========================================
-- PURCHASE ORDERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    order_number VARCHAR(20) NOT NULL,
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
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    UNIQUE KEY unique_order_number (order_number, company_id),
    INDEX idx_company (company_id),
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
    company_id INT NOT NULL,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_sku VARCHAR(50) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    quantity_ordered INT NOT NULL DEFAULT 1,
    quantity_received INT DEFAULT 0,
    unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_company (company_id),
    INDEX idx_order (order_id),
    INDEX idx_product (product_id)
);

-- ==========================================
-- INVENTORY TRANSACTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    transaction_number VARCHAR(20) NOT NULL,
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
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_transaction_number (transaction_number, company_id),
    INDEX idx_company (company_id),
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
    company_id INT NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_setting (setting_key, company_id),
    INDEX idx_company (company_id),
    INDEX idx_key (setting_key),
    INDEX idx_public (is_public)
);

-- ==========================================
-- ACTIVITY LOGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    user_id INT,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    table_name VARCHAR(50),
    record_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_company (company_id),
    INDEX idx_user (user_id),
    INDEX idx_type (activity_type),
    INDEX idx_table (table_name),
    INDEX idx_date (created_at)
);

-- ==========================================
-- INSERT DEFAULT DATA
-- ==========================================

-- Create sample companies
INSERT IGNORE INTO companies (company_name, slug, email, phone, city, business_type, subscription_plan, subscription_status) VALUES
('Natural Hair Boutique', 'natural-hair-boutique', 'admin@naturalhair.com', '+233201234567', 'Accra', 'Hair Products', 'professional', 'active'),
('Gel Stock Demo', 'gel-stock-demo', 'demo@gelstock.com', '+233244567890', 'Kumasi', 'Inventory Management', 'starter', 'active');

-- Create sample users (passwords should be hashed in production)
-- Password for both: password123 (hashed with bcrypt: $2y$10$...)
INSERT IGNORE INTO users (company_id, username, email, password_hash, first_name, last_name, role, status, email_verified) VALUES
(1, 'admin', 'admin@naturalhair.com', '$2y$10$1K4Q2X5J8N9P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D6E7F8G9H0I1J2K', 'Grace', 'Asante', 'owner', 'active', TRUE),
(1, 'manager', 'manager@naturalhair.com', '$2y$10$1K4Q2X5J8N9P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D6E7F8G9H0I1J2K', 'Kofi', 'Mensah', 'manager', 'active', TRUE),
(2, 'demo_admin', 'demo@gelstock.com', '$2y$10$1K4Q2X5J8N9P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D6E7F8G9H0I1J2K', 'Demo', 'User', 'owner', 'active', TRUE);

-- Insert default roles with permissions (JSON format)
INSERT IGNORE INTO user_roles (company_id, role_name, description, permissions, is_system_role) VALUES
(1, 'Owner', 'Full system access', '{"products":{"create":true,"read":true,"update":true,"delete":true},"sales":{"create":true,"read":true,"update":true,"delete":true},"customers":{"create":true,"read":true,"update":true,"delete":true},"reports":{"view":true,"export":true},"settings":{"view":true,"update":true},"users":{"manage":true}}', TRUE),
(1, 'Manager', 'Manage products, sales, and reports', '{"products":{"create":true,"read":true,"update":true,"delete":false},"sales":{"create":true,"read":true,"update":true,"delete":false},"customers":{"create":true,"read":true,"update":true,"delete":false},"reports":{"view":true,"export":true},"settings":{"view":true}}', TRUE),
(1, 'Staff', 'Record sales and manage stock', '{"products":{"create":false,"read":true,"update":false,"delete":false},"sales":{"create":true,"read":true,"update":false,"delete":false},"customers":{"create":true,"read":true,"update":false,"delete":false},"reports":{"view":false}}', TRUE),
(2, 'Owner', 'Full system access', '{"products":{"create":true,"read":true,"update":true,"delete":true},"sales":{"create":true,"read":true,"update":true,"delete":true},"customers":{"create":true,"read":true,"update":true,"delete":true},"reports":{"view":true,"export":true},"settings":{"view":true,"update":true},"users":{"manage":true}}', TRUE);

-- Default product categories (for sample company 1)
INSERT IGNORE INTO product_categories (company_id, name, description) VALUES
(1, 'Hair Care', 'Natural hair care products'),
(1, 'Styling Products', 'Products for styling natural hair'),
(1, 'Hair Tools', 'Tools and accessories for hair care'),
(1, 'Hair Extensions', 'Natural and synthetic hair extensions'),
(1, 'Oils & Treatments', 'Hair oils and treatment products'),
(2, 'Hair Care', 'Natural hair care products'),
(2, 'Styling Products', 'Products for styling natural hair'),
(2, 'Hair Tools', 'Tools and accessories for hair care');

-- Default business settings (for sample company 1)
INSERT IGNORE INTO business_settings (company_id, setting_key, setting_value, setting_type, description, is_public) VALUES
(1, 'business_name', 'Natural Hair Boutique', 'string', 'Business name', true),
(1, 'business_type', 'Natural Hair Products', 'string', 'Type of business', true),
(1, 'currency', 'GHS', 'string', 'Default currency', true),
(1, 'low_stock_threshold', '20', 'number', 'Low stock alert threshold', false),
(1, 'tax_rate', '0.00', 'number', 'Default tax rate percentage', false),
(1, 'receipt_footer', 'Thank you for your business!', 'string', 'Receipt footer message', true),
(2, 'business_name', 'Gel Stock Demo', 'string', 'Business name', true),
(2, 'currency', 'GHS', 'string', 'Default currency', true),
(2, 'low_stock_threshold', '15', 'number', 'Low stock alert threshold', false);

-- Sample supplier (for company 1)
INSERT IGNORE INTO suppliers (company_id, supplier_number, company_name, contact_person, phone, email, address, city) VALUES
(1, 'SUP-001', 'Natural Hair Supplies Ltd', 'Grace Mensah', '+233244567890', 'orders@naturalhair.gh', '123 Liberation Road', 'Accra'),
(2, 'SUP-001', 'Premium Supplies Inc', 'Ama Boateng', '+233201111111', 'supplier@premium.gh', 'Plot 42 Commerce Street', 'Kumasi');

-- Sample customers (for company 1)
INSERT IGNORE INTO customers (company_id, customer_number, first_name, last_name, phone, email, city) VALUES
(1, 'CUST-001', 'Akosua', 'Asante', '+233201234567', 'akosua@email.com', 'Accra'),
(1, 'CUST-002', 'Nana', 'Acheampong', '+233209876543', 'nana@email.com', 'Accra'),
(2, 'CUST-001', 'Kwame', 'Boakye', '+233205555555', 'kwame@email.com', 'Kumasi');

-- Sample products (for company 1)
INSERT IGNORE INTO products (company_id, sku, name, description, category_id, price, cost, stock_quantity, min_stock_level) VALUES
(1, 'SKU-001', 'Shea Butter Hair Cream', 'Natural shea butter cream for moisturizing hair', 1, 25.00, 15.00, 50, 10),
(1, 'SKU-002', 'Coconut Oil Hair Treatment', 'Pure coconut oil for deep hair conditioning', 5, 20.00, 12.00, 30, 5),
(1, 'SKU-003', 'Wide Tooth Comb', 'Gentle wide tooth comb for detangling', 3, 15.00, 8.00, 25, 5),
(1, 'SKU-004', 'Natural Hair Gel', 'Alcohol-free styling gel for natural hair', 2, 18.00, 10.00, 40, 8);

-- Sample products (for company 2)
INSERT IGNORE INTO products (company_id, sku, name, description, category_id, price, cost, stock_quantity, min_stock_level) VALUES
(2, 'P-001', 'Moisturizing Shampoo', 'Sulfate-free shampoo for natural hair', 1, 22.00, 12.00, 60, 15),
(2, 'P-002', 'Leave-in Conditioner', 'Lightweight leave-in conditioner', 1, 28.00, 16.00, 45, 10);

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