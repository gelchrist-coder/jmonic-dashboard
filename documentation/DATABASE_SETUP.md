# J'MONIC ENTERPRISE Database Setup Guide

## 🗃️ Database Installation & Configuration

### Prerequisites
- **MySQL Server 5.7+** or **MariaDB 10.3+**
- **PHP 7.4+** with PDO MySQL extension
- **Web Server** (Apache/Nginx) with PHP support

### Step 1: Install MySQL (if not already installed)

#### On macOS (using Homebrew):
```bash
brew install mysql
brew services start mysql
```

#### On Ubuntu/Debian:
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

#### On Windows:
- Download MySQL from https://dev.mysql.com/downloads/mysql/
- Follow the installation wizard

### Step 2: Create Database and User

1. **Login to MySQL as root:**
   ```bash
   mysql -u root -p
   ```

2. **Create the database:**
   ```sql
   CREATE DATABASE jmonic_enterprise CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. **Create a dedicated user (recommended for security):**
   ```sql
   CREATE USER 'jmonic_user'@'localhost' IDENTIFIED BY 'your_secure_password';
   GRANT ALL PRIVILEGES ON jmonic_enterprise.* TO 'jmonic_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

4. **Exit MySQL:**
   ```sql
   EXIT;
   ```

### Step 3: Update Database Configuration

1. **Edit the config file:**
   ```bash
   nano /path/to/your/project/api/config.php
   ```

2. **Update database credentials:**
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'jmonic_enterprise');
   define('DB_USER', 'jmonic_user');      // Your MySQL username
   define('DB_PASS', 'your_secure_password'); // Your MySQL password
   ```

### Step 4: Import Database Schema

1. **Navigate to your project directory:**
   ```bash
   cd "/Users/gelchristboateng/Documents/J'MONIC ENTERPRISE"
   ```

2. **Import the database structure:**
   ```bash
   mysql -u jmonic_user -p jmonic_enterprise < database_setup.sql
   ```

   Or if using root:
   ```bash
   mysql -u root -p jmonic_enterprise < database_setup.sql
   ```

### Step 5: Test API Connection

1. **Start your web server** (if using built-in PHP server):
   ```bash
   cd "/Users/gelchristboateng/Documents/J'MONIC ENTERPRISE"
   php -S localhost:8000
   ```

2. **Test the API connection:**
   ```bash
   curl http://localhost:8000/api/test.php
   ```

   Expected response:
   ```json
   {
       "success": true,
       "message": "API connection successful!",
       "data": {
           "server_time": "2025-10-24 14:45:00",
           "php_version": "8.0.0",
           "server_info": "PHP Development Server"
       }
   }
   ```

### Step 6: Verify Database Tables

Check if tables were created successfully:

```sql
USE jmonic_enterprise;
SHOW TABLES;
```

You should see these tables:
- activity_logs
- business_settings
- customers
- inventory_transactions
- product_categories
- products
- purchase_order_items
- purchase_orders
- sales_order_items
- sales_orders
- suppliers

### Step 7: Test Frontend Integration

1. **Update your frontend API base URL** (if needed):
   
   In your script.js, ensure the API base is correctly set:
   ```javascript
   this.apiBase = '../api/';  // For local development
   // or
   this.apiBase = '/api/';    // For production
   ```

2. **Open your dashboard:**
   ```
   http://localhost:8000/public/index.html
   ```

3. **Check browser console** for successful API connections.

## 🔧 Troubleshooting

### Common Issues:

#### 1. "Connection refused" error
- **Check if MySQL is running:**
  ```bash
  sudo systemctl status mysql    # Linux
  brew services list | grep mysql  # macOS
  ```

#### 2. "Access denied" error
- **Verify database credentials** in `api/config.php`
- **Check user permissions:**
  ```sql
  SHOW GRANTS FOR 'jmonic_user'@'localhost';
  ```

#### 3. "Table doesn't exist" error
- **Re-import the database schema:**
  ```bash
  mysql -u jmonic_user -p jmonic_enterprise < database_setup.sql
  ```

#### 4. CORS errors
- **Ensure CORS headers are set** in config.php (already configured)
- **Check browser console** for specific error messages

#### 5. PHP PDO extension missing
- **Install PHP MySQL extension:**
  ```bash
  sudo apt install php-mysql php-pdo  # Ubuntu/Debian
  brew install php               # macOS (includes PDO)
  ```

## 📊 Database Features

### Included Tables:
- **Products Management:** SKU tracking, stock levels, pricing
- **Sales Processing:** Orders, line items, customer tracking
- **Inventory Control:** Transaction logging, stock movements
- **Customer Management:** Contact info, purchase history
- **Supplier Management:** Vendor information, purchase orders
- **Reporting:** Pre-built views for analytics

### Sample Data Included:
- ✅ Default product categories
- ✅ Sample supplier
- ✅ Sample customer
- ✅ Sample products with stock
- ✅ Business settings configuration

### Built-in Features:
- 🔐 **Automatic stock tracking**
- 📈 **Profit calculation**
- ⚠️ **Low stock alerts**
- 📋 **Transaction logging**
- 🎯 **Sales analytics**
- 👥 **Customer insights**

## 🚀 Next Steps

1. **Access your dashboard** at http://localhost:8000/public/
2. **Add your products** using the Products section
3. **Start recording sales** through the Sales interface
4. **Monitor inventory** with real-time stock tracking
5. **Generate reports** using the built-in analytics

## 📞 Support

If you encounter any issues:
1. Check the browser console for JavaScript errors
2. Check PHP error logs for server-side issues
3. Verify database connection using the test endpoint
4. Ensure all required PHP extensions are installed

---

**Your J'MONIC ENTERPRISE database is now ready for business! 🎉**