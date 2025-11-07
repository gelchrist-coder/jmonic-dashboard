# J'MONIC ENTERPRISE - AI Agent Instructions

## System Overview

**J'MONIC ENTERPRISE** is a natural hair business management dashboard that operates in two modes:
- **Offline Mode**: Browser-based using `localStorage` for data persistence (development/standalone)
- **Backend Mode**: PHP/MySQL API with persistent database (production deployment)

### Architecture

```
J'MONIC ENTERPRISE/
├── dashboard/              # Main application (entry point)
│   ├── index.html         # UI layout with KPI cards, sections
│   ├── script.js          # NaturalHairBusinessManager class (7085 lines)
│   ├── styles.css         # Responsive design
│   └── api/               # PHP backend APIs
│       ├── config.php     # Database config, utilities, CORS
│       ├── Database.php   # PDO helper class for queries
│       ├── products.php   # CRUD for products
│       ├── sales.php      # Transaction recording
│       ├── dashboard.php  # Analytics & KPI data
│       ├── customers.php  # Customer management
│       └── suppliers.php  # Supplier management
├── documentation/         # Setup and deployment guides
└── .env                   # Database credentials (for reference)
```

## Key Patterns & Conventions

### 1. Frontend Architecture (script.js)

**Single Class Pattern**: All functionality encapsulated in `NaturalHairBusinessManager` class.

```javascript
class NaturalHairBusinessManager {
    constructor() {
        this.apiBase = '../api/';        // Relative API path
        this.products = [];
        this.sales = [];
        this.initializeSystem();
    }
    
    async initializeSystem() {
        // 1. Load settings
        // 2. Initialize dropdowns
        // 3. Test API connection
        // 4. Load dashboard data if connected
    }
}
```

**Offline Fallback**: Frontend gracefully degrades using `localStorage` when backend unavailable:
- `apiCall()` method routes to `handleProductsAPI()`, `handleSalesAPI()`, etc.
- localStorage keys: `jmonic_products`, `jmonic_sales`, `jmonic_customers`, `jmonic_business_settings`
- Users see helpful messages if database connection fails

### 2. Backend Architecture (PHP APIs)

**Standardized API Pattern**: All endpoints follow RESTful conventions with method-based routing.

```php
// Example: api/products.php
$method = getRequestMethod();
$data = getRequestData();

switch ($method) {
    case 'GET':
        handleGetProducts($db, $data);
        break;
    case 'POST':
        handleAddProduct($db, $data);
        break;
    case 'PUT':
        handleUpdateProduct($db, $data);
        break;
    case 'DELETE':
        handleDeleteProduct($db, $data);
        break;
}
```

**Database Helper**: Use `Database` class for queries, not raw PDO:
```php
$db = new Database();
$db->select("SELECT * FROM products WHERE id = ?", [$id]);
$db->insert("products", $productData);
$db->update("products", $productData, $id);
$db->delete("products", $id);
```

### 3. Data Model

**Core Tables** (defined in `database_setup.sql`):
- `products` - SKU, name, selling_price, cost_price, stock_quantity, reorder_level
- `sales` - customer_id, total_amount, items (JSON), timestamp
- `customers` - name, phone, email, Ghana phone validation
- `suppliers` - name, contact, products_supplied
- `business_settings` - currency, business_name, notifications

**Ghana-Specific Validations**:
- Phone format: `(/^(\+233|0)?[0-9]{9}$/)`
- Currency: GHS (Ghanaian Cedis)
- Timezone: Africa/Accra

### 4. API Response Format

**Standardized JSON responses** from all endpoints:
```php
sendResponse([
    'success' => true|false,
    'message' => 'Description',
    'data' => $resultData,
    'timestamp' => date('Y-m-d H:i:s')
]);
```

**Status Codes**: HTTP_OK (200), HTTP_CREATED (201), HTTP_BAD_REQUEST (400), HTTP_NOT_FOUND (404), HTTP_INTERNAL_ERROR (500)

### 5. Frontend UI Patterns

**Modal System**: For create/edit/delete operations
- `openModal(modalId)` - Shows modal with overlay
- `closeModal(modalId)` - Closes and clears form
- **Critical**: KPI cards trigger dropdowns, NOT delete actions (event delegation bug - see fixes)

**Notifications**: Two-tier system
- `showNotification()` - Bottom notification bar
- `showLiveNotification()` - Pop-in alert with icon and fade
- Used for: form errors, success messages, stock alerts

**Dashboard Sections**: Dynamically shown via `showSection(sectionName)`:
- Dashboard, Products, Sales, Revenue, Customers, Inventory, Reports, Settings

## Development Workflows

### Starting the Server

```bash
# PHP built-in server (recommended for Windows/development)
cd c:\JMONIC-ENTERPRISE\dashboard
php -S localhost:8000

# Then visit: http://localhost:8000
```

### Database Setup

```bash
# Check database status
php dashboard/check_database.php

# Or use web interface
http://localhost:8000/dashboard/web_installer.php
```

### Testing API Endpoints

```bash
# Test connection
curl http://localhost:8000/api/test.php

# Get products
curl http://localhost:8000/api/products.php

# Create product (requires POST with JSON body)
curl -X POST http://localhost:8000/api/products.php \
  -H "Content-Type: application/json" \
  -d '{"productName":"Hair Oil","sku":"HO001","sellingPrice":50,"costPrice":30,"stockQuantity":100}'
```

## Common Tasks

### Adding a New API Endpoint

1. **Create `api/endpoint.php`** with standardized handler functions:
```php
<?php
require_once 'Database.php';
$db = new Database();
$method = getRequestMethod();
$data = getRequestData();

switch ($method) {
    case 'GET': handleGet($db, $data); break;
    case 'POST': handlePost($db, $data); break;
}
```

2. **Update `dashboard/script.js`** to call the new endpoint:
```javascript
// In apiCall() method
else if (endpoint === 'newfeature.php') {
    return this.handleNewFeatureAPI(method, data);
}

// Add handler method
handleNewFeatureAPI(method, data) {
    // Offline localStorage logic
}
```

### Fixing UI Bugs

**Event Delegation Issues**: Use `e.target.closest()` to check element hierarchy, not just `e.target`. Example - KPI clicks triggering delete modals:

```javascript
// WRONG - catches all clicks
document.addEventListener('click', (e) => {
    this.clearAllData();  // Fires on KPI clicks too!
});

// RIGHT - exclude KPI elements
document.addEventListener('click', (e) => {
    if (e.target.closest('.kpi-card')) return;  // Ignore KPI clicks
    this.clearAllData();  // Only fires on actual delete button
});
```

### Handling Decimal/Currency Values

Always validate and convert:
```javascript
const sellingPrice = parseFloat(data.sellingPrice);
if (isNaN(sellingPrice) || sellingPrice <= 0) {
    throw new Error('Please enter a valid selling price');
}
```

## Important Files & Their Purposes

| File | Purpose | Key Functions |
|------|---------|---|
| `dashboard/script.js` | Main business logic | `NaturalHairBusinessManager` class, all features |
| `dashboard/api/config.php` | DB config, helpers | `getDbConnection()`, `sendResponse()`, validation functions |
| `dashboard/api/Database.php` | Query wrapper | `select()`, `insert()`, `update()`, `delete()` |
| `dashboard/index.html` | UI layout | KPI cards, modal templates, form sections |
| `database_setup.sql` | Schema & sample data | Table definitions with Ghana context |
| `documentation/DATABASE_SETUP.md` | Installation guide | Step-by-step setup instructions |

## Debugging Tips

1. **Check browser console** for frontend errors (Ctrl+Shift+I in Chrome)
2. **Check API responses** - use Network tab to inspect JSON responses
3. **Database issues** - run `php dashboard/check_database.php` or visit `http://localhost:8000/dashboard/server-status.php`
4. **Offline mode** - inspect `localStorage` in DevTools Application tab to see stored data
5. **CORS errors** - ensure backend is enabled with `CORS_ENABLED = true` in config.php

## Ghana-Specific Localization

- **Currency**: GHS (Ghanaian Cedis) - format with 2 decimals
- **Phone validation**: Ghana mobile numbers (233 country code or 0-prefix)
- **Timezone**: Africa/Accra
- **Date format**: Y-m-d H:i:s in database, localized display in UI

## Deployment Considerations

- **Offline copy**: Dashboard works standalone in `dashboard/` folder without backend
- **Database switch**: Use `config.php` (MySQL) or `config_sqlite.php` (SQLite) for different deployments
- **Relative paths**: Always use relative paths (`../api/`) for cross-deployment compatibility
- **Documentation**: Deployment guides in `documentation/` and `dashboard/` directories
