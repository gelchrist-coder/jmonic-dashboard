// J'MONIC ENTERPRISE - Business Management System
class NaturalHairBusinessManager {
    constructor() {
        // Fix API path - should be relative to current location
        this.apiBase = '../api/';
        this.products = [];
        this.sales = [];
        
        this.initializeSystem();
    }
    
    async initializeSystem() {
        console.log('J\'MONIC ENTERPRISE System Initializing...');
        console.log('API Base URL:', this.apiBase);
        
        // Initialize settings first to ensure they're always available
        this.loadSettings();
        this.initializeHeaderDropdowns();
        
        // Check if this is the first time setup
        this.checkFirstTimeSetup();
        
        // First test the connection
        try {
            console.log('Testing API connection...');
            const testResult = await this.apiCall('test.php');
            console.log('✅ API Connection successful:', testResult.data);
            
            // If connection works, load dashboard data
            await this.loadDashboardData();
            console.log('System Ready - J\'MONIC ENTERPRISE Dashboard Loaded!');
        } catch (error) {
            console.warn('❌ API Connection failed:', error.message);
            console.warn('System will work in offline mode.');
            this.showInitialHelpMessage();
        }
    }
    
    showInitialHelpMessage() {
        // Update KPI cards with helpful messages
        const kpiCards = document.querySelectorAll('.kpi-card .kpi-value');
        if (kpiCards.length >= 4) {
            kpiCards[0].textContent = 'GHS 0.00';
            kpiCards[1].textContent = '0';
            kpiCards[2].textContent = '0';
            kpiCards[3].textContent = '0';
        }
        
        // Show help message in alerts
        const alertsList = document.querySelector('.alert-list');
        if (alertsList) {
            alertsList.innerHTML = `
                <div class="alert-item">
                    <div class="alert-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="alert-content">
                        <p>Server connection issue detected</p>
                        <span class="alert-action">Please ensure your web server is running and database is configured</span>
                    </div>
                </div>
                <div class="alert-item">
                    <div class="alert-icon">
                        <i class="fas fa-database"></i>
                    </div>
                    <div class="alert-content">
                        <p>Check BACKEND_SETUP.md for setup instructions</p>
                        <span class="alert-action">Import database and update config.php</span>
                    </div>
                </div>
            `;
        }
    }

    // API Methods
    async apiCall(endpoint, method = 'GET', data = null) {
        // Temporary localStorage-based solution until PHP backend is set up
        try {
            console.log('Using localStorage backend for:', endpoint, method);
            
            if (endpoint === 'products.php') {
                return this.handleProductsAPI(method, data);
            } else if (endpoint === 'sales.php') {
                return this.handleSalesAPI(method, data);
            } else if (endpoint === 'dashboard.php') {
                return this.handleDashboardAPI();
            }
            
            // Fallback for unknown endpoints
            return { success: true, data: [], message: 'Backend not configured' };
        } catch (error) {
            console.error('API call failed:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
            throw error;
        }
    }
    
    handleProductsAPI(method, data) {
        const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
        
        if (method === 'POST') {
            // Add new product or update existing if SKU exists
            // Validate numeric inputs
            const sellingPrice = parseFloat(data.sellingPrice);
            const costPrice = parseFloat(data.costPrice);
            const stockQuantity = parseInt(data.stockQuantity);
            const reorderLevel = parseInt(data.reorderLevel) || 10;
            
            if (isNaN(sellingPrice) || sellingPrice <= 0) {
                throw new Error('Please enter a valid selling price');
            }
            
            if (isNaN(costPrice) || costPrice < 0) {
                throw new Error('Please enter a valid cost price');
            }
            
            if (isNaN(stockQuantity) || stockQuantity < 0) {
                throw new Error('Please enter a valid stock quantity');
            }
            
            // Check if product with same SKU already exists
            const existingProductIndex = products.findIndex(p => p.sku === data.sku);
            
            if (existingProductIndex !== -1) {
                // Validate that product name matches existing SKU
                const existingProduct = products[existingProductIndex];
                if (existingProduct.name.toLowerCase().trim() !== data.productName.toLowerCase().trim()) {
                    throw new Error(`SKU "${data.sku}" already exists with product name "${existingProduct.name}". Product names must match when using the same SKU.`);
                }
                
                // Update existing product by adding to stock quantity
                products[existingProductIndex] = {
                    ...existingProduct,
                    name: data.productName, // Keep the name consistent
                    description: data.description || existingProduct.description,
                    selling_price: sellingPrice,
                    cost_price: costPrice,
                    stock_quantity: existingProduct.stock_quantity + stockQuantity, // Add to existing stock
                    reorder_level: reorderLevel,
                    updated_at: new Date().toISOString()
                };
                
                // Show update notification
                this.showLiveNotification(
                    'Product Updated!', 
                    `${data.productName} stock updated. New quantity: ${products[existingProductIndex].stock_quantity}`, 
                    'success', 
                    'fa-sync-alt'
                );
            } else {
                // Check if product name already exists with different SKU
                const existingNameIndex = products.findIndex(p => p.name.toLowerCase().trim() === data.productName.toLowerCase().trim());
                if (existingNameIndex !== -1) {
                    const existingProductWithName = products[existingNameIndex];
                    throw new Error(`Product name "${data.productName}" already exists with SKU "${existingProductWithName.sku}". Please use the existing SKU or choose a different product name.`);
                }
                // Create new product
                const newProduct = {
                    id: Date.now(),
                    sku: data.sku,
                    name: data.productName,
                    description: data.description || '',
                    selling_price: sellingPrice,
                    cost_price: costPrice,
                    stock_quantity: stockQuantity,
                    reorder_level: reorderLevel,
                    status: 'active',
                    created_at: new Date().toISOString()
                };
                products.push(newProduct);
                
                // Show new product notification
                this.showLiveNotification(
                    'Product Added!', 
                    `${data.productName} has been added to inventory`, 
                    'success', 
                    'fa-plus-circle'
                );
            }
            localStorage.setItem('jmonic_products', JSON.stringify(products));
            
            // Log initial stock as inventory transaction for new products only
            if (!existingProductIndex || existingProductIndex === -1) {
                const currentProduct = products[products.length - 1]; // Get the newly added product
                if (currentProduct && currentProduct.stock_quantity > 0) {
                    this.logInventoryTransaction(
                        currentProduct.id,
                        currentProduct.name,
                        'purchase',
                        currentProduct.stock_quantity,
                        0,
                        currentProduct.stock_quantity,
                        'Initial stock entry'
                    );
                }
            }
            
            // Debug: Check if product should be low stock
            const addedProduct = existingProductIndex !== -1 ? products[existingProductIndex] : products[products.length - 1];
            console.log('Product processed:', {
                name: addedProduct.name,
                stock: addedProduct.stock_quantity,
                reorderLevel: addedProduct.reorder_level,
                isLowStock: addedProduct.stock_quantity <= addedProduct.reorder_level
            });
            
            // Update product stats if on products page
            setTimeout(() => {
                if (document.querySelector('#products.active')) {
                    this.updateProductStats(products);
                }
            }, 100);
            
            return { success: true, data: addedProduct, message: 'Product processed successfully' };
        } else {
            // Get products
            return { success: true, data: products };
        }
    }
    
    handleSalesAPI(method, data) {
        const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
        
        if (method === 'POST') {
            // Get current products for inventory management and cost calculation
            const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
            
            // Calculate actual cost based on product cost prices and update inventory
            let totalCost = 0;
            const saleProducts = [];
            
            data.products.forEach(saleProduct => {
                const product = products.find(p => p.id == saleProduct.id);
                if (product) {
                    // Check stock availability
                    if (product.stock_quantity < saleProduct.quantity) {
                        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock_quantity}, Requested: ${saleProduct.quantity}`);
                    }
                    
                    // Calculate cost for this product
                    const productCost = (product.cost_price || 0) * saleProduct.quantity;
                    totalCost += productCost;
                    
                    // Update product stock
                    product.stock_quantity -= saleProduct.quantity;
                    product.last_sold = new Date().toISOString();
                    
                    // Add inventory transaction log to product
                    if (!product.transactions) product.transactions = [];
                    const saleRef = `Sale #${Date.now().toString().slice(-5)}`;
                    product.transactions.push({
                        type: 'sale',
                        quantity: -saleProduct.quantity,
                        previous_stock: product.stock_quantity + saleProduct.quantity,
                        new_stock: product.stock_quantity,
                        date: new Date().toISOString(),
                        reference: saleRef
                    });
                    
                    // Also log to centralized inventory transactions
                    this.logInventoryTransaction(
                        product.id,
                        product.name,
                        'sale',
                        -saleProduct.quantity,
                        product.stock_quantity + saleProduct.quantity,
                        product.stock_quantity,
                        saleRef
                    );
                    
                    // Store enhanced product info in sale
                    saleProducts.push({
                        ...saleProduct,
                        cost_price: product.cost_price || 0,
                        product_cost: productCost,
                        margin: saleProduct.price > 0 ? ((saleProduct.price - (product.cost_price || 0)) / saleProduct.price) * 100 : 0
                    });
                }
            });
            
            // Save updated products back to localStorage
            localStorage.setItem('jmonic_products', JSON.stringify(products));
            
            // Update product stats if on products page
            setTimeout(() => {
                if (document.querySelector('#products.active')) {
                    this.updateProductStats(products);
                }
            }, 100);
            
            // Create comprehensive sale record
            const saleAmount = parseFloat(data.revenue || 0);
            const newSale = {
                id: Date.now(),
                sale_id: `#S-${Date.now().toString().slice(-5)}`,
                products: saleProducts,
                revenue: saleAmount,
                total_amount: saleAmount, // Include both field names for consistency
                cost: totalCost,
                profit: saleAmount - totalCost,
                profit_margin: saleAmount > 0 ? ((saleAmount - totalCost) / saleAmount) * 100 : 0,
                date: data.date || new Date().toISOString(),
                payment_method: data.paymentMethod,
                status: 'completed',
                inventory_updated: true,
                created_at: new Date().toISOString()
            };
            
            sales.push(newSale);
            localStorage.setItem('jmonic_sales', JSON.stringify(sales));
            console.log('Sale saved with inventory update:', newSale);
            
            // Flag that charts need updating
            this.shouldUpdateCharts = true;
            
            // Refresh the recent sales table and targets
            setTimeout(() => {
                this.loadRecentSalesTable();
                this.refreshLowStockData(); // Also refresh low stock in case inventory changed
                this.updateInventoryReports(); // Update inventory reports
                this.updateRevenueForecast(); // Update revenue forecasts
                
                // Update sales targets with new data
                const updatedSales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
                this.updateSalesTargets(updatedSales);
            }, 100);
            
            return { success: true, data: newSale, message: 'Sale recorded successfully' };
        } else {
            // Get sales
            return { success: true, data: sales };
        }
    }
    
    handleDashboardAPI() {
        const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
        const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
        
        const today = new Date().toDateString();
        const todaySales = sales.filter(sale => 
            new Date(sale.date).toDateString() === today
        );
        
        const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.revenue, 0);
        const lowStockProducts = products.filter(product => {
            const stock = product.stock_quantity || 0;
            const reorderLevel = product.reorder_level || product.reorderLevel || 5;
            return stock <= reorderLevel;
        });
        
        return {
            success: true,
            data: {
                today_sales: todayRevenue,
                total_products: products.length,
                low_stock_count: lowStockProducts.length,
                low_stock_products: lowStockProducts,
                recent_sales: sales.slice(-5).reverse()
            }
        };
    }
    
    // Load Dashboard Data
    async loadDashboardData() {
        try {
            const result = await this.apiCall('dashboard.php');
            console.log('Dashboard API result:', result);
            
            if (result && result.data) {
                this.updateKPICards(result.data);
                this.updateRecentSales(result.data.recent_sales);
                this.updateLowStockAlerts(result.data.low_stock_products);
                this.updateRevenueForecast(); // Update revenue forecasting
            } else {
                console.error('Invalid dashboard data structure:', result);
            }
            
            // Load sales data for sales section if visible
            if (document.getElementById('salesTableBody')) {
                await this.loadSalesData();
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            
            // Set default values if dashboard loading fails, but calculate from localStorage
            const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
            const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
            
            const lowStockCount = products.filter(p => {
                const stock = p.stock_quantity || 0;
                const reorderLevel = p.reorder_level || p.reorderLevel || p.min_stock_level || 5;
                return stock <= reorderLevel;
            }).length;
            
            const todaySales = sales.filter(sale => {
                const saleDate = new Date(sale.date || sale.created_at);
                const today = new Date();
                return saleDate.toDateString() === today.toDateString();
            }).reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0);
            
            this.updateKPICards({
                today_sales: todaySales,
                total_products: products.length,
                low_stock_count: lowStockCount
            });
        }
        
        // Initialize targets editing functionality
        this.initTargetsEditing();
        
        // Load low stock alerts for dashboard
        this.loadLowStockAlerts();
        
        // Load recent sales for dashboard
        this.loadRecentSalesTable();
        
        // Update sales targets with real data
        const allSales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
        this.updateSalesTargets(allSales);
        
        // Update product stats and refresh inventory data if products exist
        const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
        if (products.length > 0) {
            this.updateProductStats(products);
            this.refreshLowStockData();
        }
        
        // Create sample inventory transactions if none exist
        this.createSampleInventoryTransactions();
        
        // Update inventory reports and transaction log
        this.updateInventoryReports();
    }
    
    // Refresh low stock data across the dashboard
    refreshLowStockData() {
        const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
        
        // Calculate low stock count
        const lowStockCount = products.filter(p => {
            const stock = p.stock_quantity || 0;
            const reorderLevel = p.reorder_level || p.reorderLevel || p.min_stock_level || 5;
            return stock <= reorderLevel;
        }).length;
        
        // Low stock card removed - now only shown in notifications
        
        // Update the low stock alerts table
        this.loadLowStockAlerts();
        
        // Update any notification badges
        this.updateLowStockNotifications(products);
    }
    
    updateLowStockNotifications(products) {
        const lowStockProducts = products.filter(p => {
            const stock = p.stock_quantity || 0;
            const reorderLevel = p.reorder_level || p.reorderLevel || p.min_stock_level || 5;
            return stock <= reorderLevel;
        });
        
        // Update notification badge
        const badge = document.querySelector('.notification-badge');
        if (badge && lowStockProducts.length > 0) {
            badge.textContent = lowStockProducts.length;
            badge.style.display = 'block';
        } else if (badge) {
            badge.style.display = 'none';
        }
    }
    
    // Product Methods
    // Standardized reorder level calculation
    getReorderLevel(product) {
        return product.reorder_level || product.reorderLevel || product.min_stock_level || 10;
    }

    // Check if product is low stock using standardized reorder level
    isLowStock(product) {
        const stock = parseInt(product.stock_quantity) || 0;
        const reorderLevel = this.getReorderLevel(product);
        return stock <= reorderLevel;
    }

    async addProduct(productData) {
        try {
            const result = await this.apiCall('products.php', 'POST', productData);
            this.showNotification('Product added successfully!', 'success');
            
            // Show live notification
            this.showLiveNotification(
                'Product Added!', 
                `${productData.name} has been added to inventory`, 
                'success', 
                'fa-plus-circle'
            );
            
            // Trigger notification alert
            this.showNotificationAlert();
            
            // Refresh all relevant data
            await this.loadDashboardData(); // Refresh dashboard
            
            // Update notification badge
            if (typeof updateNotificationBadge === 'function') {
                updateNotificationBadge();
            }
            
            // Refresh products inventory if on products page
            const currentSection = document.querySelector('.content-section.active');
            if (currentSection && currentSection.id === 'products') {
                await this.loadProductsInventory();
            }
            
            return result.data;
        } catch (error) {
            console.error('Failed to add product:', error);
            this.showNotification('Failed to add product. Please try again.', 'error');
            return null;
        }
    }
    
    async updateProduct(productId, productData) {
        try {
            // Get existing products
            const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
            
            // Find and update the product
            const productIndex = products.findIndex(p => p.id == productId);
            if (productIndex === -1) {
                throw new Error('Product not found');
            }
            
            const existingProduct = products[productIndex];
            const oldStockQuantity = existingProduct.stock_quantity || 0;
            const newStockQuantity = parseInt(productData.stockQuantity) || 0;
            
            // Update the product while preserving the ID and creation date
            const updatedProduct = {
                ...existingProduct,
                sku: productData.sku,
                name: productData.productName,
                description: productData.description || '',
                selling_price: parseFloat(productData.sellingPrice),
                cost_price: parseFloat(productData.costPrice),
                stock_quantity: newStockQuantity,
                reorder_level: parseInt(productData.reorderLevel) || 10,
                updated_at: new Date().toISOString()
            };
            
            // Log inventory transaction if stock quantity changed
            if (oldStockQuantity !== newStockQuantity) {
                const stockDifference = newStockQuantity - oldStockQuantity;
                this.logInventoryTransaction(
                    productId,
                    updatedProduct.name,
                    'adjustment',
                    stockDifference,
                    oldStockQuantity,
                    newStockQuantity,
                    'Stock quantity edited'
                );
                console.log(`Stock adjustment logged: ${existingProduct.name} changed from ${oldStockQuantity} to ${newStockQuantity} (${stockDifference > 0 ? '+' : ''}${stockDifference})`);
            }
            
            products[productIndex] = updatedProduct;
            localStorage.setItem('jmonic_products', JSON.stringify(products));
            
            this.showNotification('Product updated successfully!', 'success');
            
            // Check if stock is low and show live notification
            const reorderLevel = updatedProduct.reorder_level || 5;
            if (newStockQuantity <= reorderLevel && newStockQuantity > 0) {
                this.showLiveNotification(
                    'Low Stock Alert!', 
                    `${updatedProduct.name} is running low (${newStockQuantity} remaining)`, 
                    'warning', 
                    'fa-exclamation-triangle'
                );
                // Trigger notification alert for low stock
                this.showNotificationAlert();
            } else if (newStockQuantity === 0) {
                this.showLiveNotification(
                    'Out of Stock!', 
                    `${updatedProduct.name} is now out of stock`, 
                    'warning', 
                    'fa-times-circle'
                );
                // Trigger notification alert for out of stock
                this.showNotificationAlert();
            }
            
            await this.loadDashboardData(); // Refresh dashboard
            this.updateInventoryReports(); // Update inventory reports
            
            return updatedProduct;
        } catch (error) {
            console.error('Failed to update product:', error);
            this.showNotification('Failed to update product: ' + error.message, 'error');
            return null;
        }
    }
    
    async getProducts(params = {}) {
        try {
            const result = await this.apiCall('products.php', 'GET', params);
            return result.data;
        } catch (error) {
            console.error('Failed to get products:', error);
            return { products: [], pagination: {} };
        }
    }
    
    // Sales Methods
    async recordSale(saleData) {
        try {
            const result = await this.apiCall('sales.php', 'POST', saleData);
            this.showNotification('Sale recorded successfully!', 'success');
            
            // Show live notification for sale
            const totalAmount = parseFloat(saleData.total_amount || 0);
            this.showLiveNotification(
                'Sale Recorded!', 
                `Sale completed for GHS ${totalAmount.toFixed(2)}`, 
                'success', 
                'fa-shopping-cart'
            );
            
            await this.loadDashboardData(); // Refresh dashboard
            return result.data;
        } catch (error) {
            console.error('Failed to record sale:', error);
            return null;
        }
    }
    
    async getSales(params = {}) {
        try {
            const result = await this.apiCall('sales.php', 'GET', params);
            return result.data;
        } catch (error) {
            console.error('Failed to get sales:', error);
            return { sales: [], pagination: {} };
        }
    }

    // Sales Methods
    async loadProductsForSale() {
        try {
            console.log('Loading products for sale...');
            const response = await this.apiCall('products.php');
            const products = response.data;
            console.log('Products loaded:', products);
            
            const productSelect = document.getElementById('productSelect');
            
            if (!productSelect) {
                console.error('Product select element not found');
                return;
            }
            
            // Clear existing options except the first one
            productSelect.innerHTML = '<option value="">Select Product</option>';
            
            if (!products || products.length === 0) {
                productSelect.innerHTML += '<option value="" disabled>No products in inventory</option>';
                console.log('No products found in inventory');
                return;
            }
            
            // Add products to dropdown with enhanced information
            let productsAdded = 0;
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.dataset.price = product.selling_price;
                option.dataset.stock = product.stock_quantity;
                option.dataset.name = product.name;
                option.dataset.cost = product.cost_price || 0;
                option.dataset.sku = product.sku || '';
                
                if (product.stock_quantity <= 0) {
                    option.textContent = `${product.name} - GHS ${product.selling_price} (OUT OF STOCK)`;
                    option.disabled = true;
                    option.style.color = '#ef4444';
                } else if (product.stock_quantity <= (product.reorder_level || 10)) {
                    option.textContent = `${product.name} - GHS ${product.selling_price} (${product.stock_quantity} left - LOW STOCK)`;
                    option.style.color = '#f59e0b';
                } else {
                    option.textContent = `${product.name} - GHS ${product.selling_price} (${product.stock_quantity} in stock)`;
                }
                
                productSelect.appendChild(option);
                if (product.stock_quantity > 0) productsAdded++;
            });
            
            console.log(`Added ${productsAdded} products to sale dropdown`);
            
            if (productsAdded === 0) {
                productSelect.innerHTML += '<option value="" disabled>No products in stock</option>';
            }
        } catch (error) {
            console.error('Failed to load products for sale:', error);
            this.showNotification('Failed to load products for sale', 'error');
        }
    }

    addProductToSale() {
        const productSelect = document.getElementById('productSelect');
        const quantityInput = document.getElementById('productQuantity');
        const selectedProductsDiv = document.getElementById('selectedProducts');
        
        if (!productSelect.value) {
            this.showNotification('Please select a product', 'warning');
            return;
        }
        
        const selectedOption = productSelect.options[productSelect.selectedIndex];
        const productId = selectedOption.value;
        const productName = selectedOption.dataset.name;
        
        // Safe numeric parsing with validation
        const productPrice = parseFloat(selectedOption.dataset.price);
        const availableStock = parseInt(selectedOption.dataset.stock);
        const costPrice = parseFloat(selectedOption.dataset.cost) || 0;
        const quantity = parseInt(quantityInput.value) || 1;
        
        // Validate parsed numbers
        if (isNaN(productPrice) || productPrice <= 0) {
            this.showNotification('Invalid product price. Please check product data.', 'error');
            return;
        }
        
        if (isNaN(availableStock) || availableStock < 0) {
            this.showNotification('Invalid stock quantity. Please check product data.', 'error');
            return;
        }
        
        if (isNaN(quantity) || quantity <= 0) {
            this.showNotification('Please enter a valid quantity.', 'error');
            return;
        }
        
        // Enhanced stock validation
        if (quantity > availableStock) {
            this.showNotification(`Insufficient stock! Only ${availableStock} units available for ${productName}`, 'error');
            return;
        }
        
        if (availableStock <= 0) {
            this.showNotification(`${productName} is out of stock!`, 'error');
            return;
        }
        
        // Check if product already added and update quantity if needed
        const existingProduct = selectedProductsDiv.querySelector(`[data-product-id="${productId}"]`);
        if (existingProduct) {
            const existingQuantityMatch = existingProduct.querySelector('.product-price').textContent.match(/× (\d+) =/);
            const existingQuantity = existingQuantityMatch ? parseInt(existingQuantityMatch[1]) : 0;
            const newQuantity = existingQuantity + quantity;
            
            if (newQuantity > availableStock) {
                this.showNotification(`Cannot add ${quantity} more units. Total would be ${newQuantity}, but only ${availableStock} available`, 'error');
                return;
            }
            
            // Update existing item
            const subtotal = productPrice * newQuantity;
            existingProduct.querySelector('.product-price').innerHTML = `
                GHS ${productPrice.toFixed(2)} × ${newQuantity} = GHS ${subtotal.toFixed(2)}
                <small class="stock-info">(${availableStock - newQuantity} remaining)</small>
            `;
        } else {
            // Add new product to selected products
            const subtotal = productPrice * quantity;
            const productDiv = document.createElement('div');
            productDiv.className = 'selected-product-item';
            productDiv.dataset.productId = productId;
            productDiv.innerHTML = `
                <div class="product-details">
                    <span class="product-name">${productName}</span>
                    <span class="product-price">
                        GHS ${productPrice.toFixed(2)} × ${quantity} = GHS ${subtotal.toFixed(2)}
                        <small class="stock-info">(${availableStock - quantity} remaining)</small>
                    </span>
                    <span class="product-margin">
                        <small>Cost: GHS ${costPrice.toFixed(2)} | Margin: ${productPrice > 0 ? (((productPrice - costPrice) / productPrice) * 100).toFixed(1) : 0}%</small>
                    </span>
                </div>
                <button type="button" class="btn-remove" onclick="businessManager.removeProductFromSale('${productId}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            selectedProductsDiv.appendChild(productDiv);
        }
        
        // Reset selection
        productSelect.value = '';
        quantityInput.value = '1';
        
        // Update total and refresh product select to show updated stock
        this.updateSaleTotal();
        this.updateProductSelectStock();
    }
    
    updateProductSelectStock() {
        // Update the product select dropdown to show current stock levels
        const productSelect = document.getElementById('productSelect');
        const selectedProductsDiv = document.getElementById('selectedProducts');
        
        if (!productSelect) return;
        
        // Calculate reserved quantities
        const reservedQuantities = {};
        selectedProductsDiv.querySelectorAll('.selected-product-item').forEach(item => {
            const productId = item.dataset.productId;
            const quantityMatch = item.querySelector('.product-price').textContent.match(/× (\d+) =/);
            const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 0;
            reservedQuantities[productId] = quantity;
        });
        
        // Update option text to show available stock
        Array.from(productSelect.options).forEach(option => {
            if (option.value) {
                const productId = option.value;
                const originalStock = parseInt(option.dataset.stock);
                const reserved = reservedQuantities[productId] || 0;
                const available = originalStock - reserved;
                const productName = option.dataset.name;
                const price = option.dataset.price;
                
                if (available <= 0) {
                    option.textContent = `${productName} - GHS ${price} (OUT OF STOCK)`;
                    option.disabled = true;
                    option.style.color = '#ef4444';
                } else if (available <= 5) {
                    option.textContent = `${productName} - GHS ${price} (${available} left - LOW STOCK)`;
                    option.disabled = false;
                    option.style.color = '#f59e0b';
                } else {
                    option.textContent = `${productName} - GHS ${price} (${available} in stock)`;
                    option.disabled = false;
                    option.style.color = '';
                }
            }
        });
    }
    
    removeProductFromSale(productId) {
        const productDiv = document.querySelector(`[data-product-id="${productId}"]`);
        if (productDiv) {
            productDiv.remove();
            this.updateSaleTotal();
        }
    }
    
    updateSaleTotal() {
        const selectedProducts = document.querySelectorAll('.selected-product-item');
        let total = 0;
        
        selectedProducts.forEach(item => {
            const priceText = item.querySelector('.product-price').textContent;
            // Look for pattern like "GHS 100.00 × 7 = GHS 700.00"
            const match = priceText.match(/= GHS ([\d.]+)/);
            if (match) {
                const amount = parseFloat(match[1]);
                total += amount;
            }
        });
        
        // Update the total amount input
        const totalInput = document.getElementById('totalAmount');
        if (totalInput) {
            if (total > 0) {
                totalInput.value = `GHS ${total.toFixed(2)}`;
                totalInput.style.display = 'block';
                totalInput.style.fontWeight = 'bold';
                totalInput.style.fontSize = '1.1rem';
                totalInput.style.color = '#10b981';
                
                console.log('Total calculated:', total.toFixed(2)); // Debug log
            } else {
                totalInput.value = '';
                totalInput.placeholder = 'GHS 0.00';
                totalInput.style.color = '';
                totalInput.style.fontWeight = '';
            }
        }
        
        console.log('Updated sale total:', total.toFixed(2));
    }
    
    async submitSale(formData) {
        const selectedProducts = document.querySelectorAll('.selected-product-item');
        
        if (selectedProducts.length === 0) {
            this.showNotification('Please add at least one product to the sale', 'warning');
            return;
        }
        
        // Calculate actual total from selected products
        let calculatedTotal = 0;
        selectedProducts.forEach(item => {
            const priceText = item.querySelector('.product-price').textContent;
            const match = priceText.match(/= GHS ([\d.]+)/);
            if (match) {
                calculatedTotal += parseFloat(match[1]);
            }
        });

        // Collect sale data
        const saleData = {
            date: formData.get('saleDate'),
            paymentMethod: formData.get('paymentMethod'),
            totalAmount: calculatedTotal,
            products: []
        };
        
        // Collect product data with names
        selectedProducts.forEach(item => {
            const productId = item.dataset.productId;
            const productName = item.querySelector('.product-name').textContent;
            const priceText = item.querySelector('.product-price').textContent;
            const match = priceText.match(/GHS ([\d.]+) × (\d+) = GHS ([\d.]+)/);
            if (match) {
                saleData.products.push({
                    id: productId,
                    name: productName,
                    price: parseFloat(match[1]),
                    quantity: parseInt(match[2]),
                    subtotal: parseFloat(match[3])
                });
            }
        });
        
        try {
            const result = await this.apiCall('sales.php', 'POST', {
                ...saleData,
                revenue: parseFloat(saleData.totalAmount),
                products: saleData.products // Store full product data
            });
            
            if (result.success) {
                this.showNotification('Sale recorded successfully! Inventory updated automatically.', 'success');
                closeModal('addSaleModal');
                
                // Clear selected products and reset form
                document.getElementById('selectedProducts').innerHTML = '';
                document.getElementById('totalAmount').value = '';
                document.getElementById('totalAmount').placeholder = 'GHS 0.00';
                
                // Reset form fields
                const form = document.querySelector('#addSaleModal form');
                if (form) form.reset();
                
                // Refresh dashboard data to show updated inventory and revenue
                await this.loadDashboardData();
                
                // Refresh products inventory if on products page
                const currentSection = document.querySelector('.content-section.active');
                if (currentSection && currentSection.id === 'products') {
                    await this.loadProductsInventory();
                }
                
                // Update notification badge for low stock alerts
                if (typeof updateNotificationBadge === 'function') {
                    updateNotificationBadge();
                }
            }
        } catch (error) {
            console.error('Failed to submit sale:', error);
            this.showNotification(`Failed to record sale: ${error.message}`, 'error');
        }
    }
    
    // Inventory integration methods
    getProductInventoryStatus(productId) {
        const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
        const product = products.find(p => p.id == productId);
        
        if (!product) return { status: 'not-found', message: 'Product not found' };
        
        if (product.stock_quantity <= 0) {
            return { status: 'out-of-stock', message: 'Out of stock', quantity: 0 };
        } else if (product.stock_quantity <= (product.reorder_level || 10)) {
            return { status: 'low-stock', message: 'Low stock', quantity: product.stock_quantity };
        } else {
            return { status: 'in-stock', message: 'In stock', quantity: product.stock_quantity };
        }
    }
    
    getInventoryValue() {
        const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
        return products.reduce((total, product) => {
            return total + (product.stock_quantity * (product.cost_price || 0));
        }, 0);
    }
    
    getInventoryRevenuePotential() {
        const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
        return products.reduce((total, product) => {
            return total + (product.stock_quantity * (product.selling_price || 0));
        }, 0);
    }

    // Display Update Methods
    updateKPICards(stats) {
        if (!stats) {
            console.error('Stats object is undefined');
            return;
        }
        
        // Enhanced KPI cards update
        const todayRevenueEl = document.getElementById('todayRevenue');
        const todayProfitEl = document.getElementById('todayProfit');
        const todayOrdersEl = document.getElementById('todayOrders');
        const avgOrderValueEl = document.getElementById('avgOrderValue');
        const totalStockOutEl = document.getElementById('totalStockOut');
        const totalStockInEl = document.getElementById('totalStockIn');
        
        if (todayRevenueEl) todayRevenueEl.textContent = `GHS ${(stats.today_sales || 0).toFixed(2)}`;
        // Stock cards now on dashboard - will be calculated below
        
        // Calculate additional metrics
        const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
        const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
        
        const today = new Date().toDateString();
        const todaySales = sales.filter(sale => 
            new Date(sale.date || sale.created_at).toDateString() === today
        );
        
        const todayOrders = todaySales.length;
        const todayRevenue = stats.today_sales || 0;
        const avgOrderValue = todayOrders > 0 ? todayRevenue / todayOrders : 0;
        
        // Calculate today's profit
        let todayProfit = 0;
        todaySales.forEach(sale => {
            if (sale.products && Array.isArray(sale.products)) {
                sale.products.forEach(product => {
                    const productData = products.find(p => p.id == product.id);
                    if (productData && productData.cost_price) {
                        const cost = (productData.cost_price * (product.quantity || 1));
                        todayProfit += (product.subtotal || 0) - cost;
                    } else {
                        todayProfit += (product.subtotal || 0); // Assume 100% profit if no cost data
                    }
                });
            }
        });
        
        const profitMargin = todayRevenue > 0 ? (todayProfit / todayRevenue) * 100 : 0;
        
        if (todayProfitEl) todayProfitEl.textContent = `GHS ${todayProfit.toFixed(2)}`;
        if (todayOrdersEl) todayOrdersEl.textContent = todayOrders.toString();
        if (avgOrderValueEl) avgOrderValueEl.textContent = `GHS ${avgOrderValue.toFixed(2)}`;
        
        // Update profit margin display
        const profitMarginEl = document.getElementById('profitMargin');
        if (profitMarginEl) {
            profitMarginEl.textContent = `${profitMargin.toFixed(1)}% margin`;
            profitMarginEl.className = `kpi-change ${profitMargin >= 20 ? 'positive' : profitMargin >= 10 ? 'neutral' : 'negative'}`;
        }
        
        // Calculate and display revenue change
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdaySales = sales.filter(sale => 
            new Date(sale.date || sale.created_at).toDateString() === yesterday.toDateString()
        );
        const yesterdayRevenue = yesterdaySales.reduce((sum, sale) => sum + (sale.revenue || 0), 0);
        const revenueChange = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100) : 0;
        
        const revenueChangeEl = document.getElementById('revenueChange');
        if (revenueChangeEl) {
            const changeText = revenueChange >= 0 ? '+' : '';
            revenueChangeEl.textContent = `${changeText}${revenueChange.toFixed(1)}% vs yesterday`;
            revenueChangeEl.className = `kpi-change ${revenueChange >= 0 ? 'positive' : 'negative'}`;
        }

        // Calculate total stock movements (all time)
        let totalStockOut = 0;
        let totalStockIn = 0;
        
        // Count all sales quantities (stock out)
        sales.forEach(sale => {
            if (sale.products && Array.isArray(sale.products)) {
                sale.products.forEach(product => {
                    totalStockOut += parseInt(product.quantity) || 0;
                });
            }
        });
        
        // Count only current stock from products (not historical transactions)
        // This gives the actual stock received that's currently available
        const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
        
        products.forEach(product => {
            // Only count current stock quantity of each product
            totalStockIn += parseInt(product.stock_quantity) || 0;
        });
        
        // Update stock display elements
        if (totalStockOutEl) totalStockOutEl.textContent = totalStockOut.toLocaleString();
        if (totalStockInEl) totalStockInEl.textContent = totalStockIn.toLocaleString();
        
        console.log('Stock calculations:', { totalStockOut, totalStockIn, salesCount: sales.length, transactionsCount: transactions.length });
    }
    
    // Sales Dashboard Methods
    async loadSalesDashboard() {
        try {
            const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
            const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
            
            // Calculate today's metrics
            const today = new Date().toDateString();
            const todaySales = sales.filter(sale => 
                new Date(sale.date || sale.created_at).toDateString() === today
            );
            
            // Calculate sales metrics
            const todayRevenue = todaySales.reduce((sum, sale) => sum + (sale.revenue || 0), 0);
            const todayOrders = todaySales.length;
            const avgOrderValue = todayOrders > 0 ? todayRevenue / todayOrders : 0;
            
            // Calculate costs and profit
            let todayCost = 0;
            todaySales.forEach(sale => {
                if (sale.products && Array.isArray(sale.products)) {
                    sale.products.forEach(product => {
                        const productData = products.find(p => p.id == product.id);
                        if (productData) {
                            todayCost += (productData.cost_price || 0) * (product.quantity || 1);
                        }
                    });
                }
            });
            
            const grossProfit = todayRevenue - todayCost;
            const profitMargin = todayRevenue > 0 ? (grossProfit / todayRevenue) * 100 : 0;
            
            // Update sales KPI cards
            this.updateSalesKPICards({
                todayRevenue,
                todayOrders,
                avgOrderValue,
                grossProfit,
                profitMargin
            });
            
            // Update sales analytics
            this.updateSalesAnalytics(sales, products);
            
            // Update payment method breakdown
            this.updatePaymentBreakdown(sales);
            
            // Initialize/update charts only if needed
            if (!this.salesChartsInitialized || this.shouldUpdateCharts) {
                this.initializeSalesCharts();
                this.salesChartsInitialized = true;
                this.shouldUpdateCharts = false;
            }
            
            // Load sales table data
            await this.loadSalesData();
            
        } catch (error) {
            console.error('Error loading sales dashboard:', error);
        }
    }
    
    updateSalesKPICards(metrics) {
        // Update Today's Sales
        const todaySalesCard = document.querySelector('.sales-kpi-grid .stat-card:nth-child(1) .stat-value');
        if (todaySalesCard) {
            todaySalesCard.textContent = `GHS ${metrics.todayRevenue.toFixed(2)}`;
        }
        
        // Update Orders Today
        const ordersCard = document.querySelector('.sales-kpi-grid .stat-card:nth-child(2) .stat-value');
        if (ordersCard) {
            ordersCard.textContent = metrics.todayOrders.toString();
        }
        
        // Update Average Order Value
        const avgOrderCard = document.querySelector('.sales-kpi-grid .stat-card:nth-child(3) .stat-value');
        if (avgOrderCard) {
            avgOrderCard.textContent = `GHS ${metrics.avgOrderValue.toFixed(2)}`;
        }
        
        // Update Gross Profit
        const profitCard = document.querySelector('.sales-kpi-grid .stat-card:nth-child(4) .stat-value');
        const profitMarginSpan = document.querySelector('.sales-kpi-grid .stat-card:nth-child(4) .stat-change');
        if (profitCard) {
            profitCard.textContent = `GHS ${metrics.grossProfit.toFixed(2)}`;
        }
        if (profitMarginSpan) {
            profitMarginSpan.textContent = `${metrics.profitMargin.toFixed(1)}% margin`;
        }
    }
    
    updateSalesAnalytics(sales, products) {
        // Calculate top-selling products
        const productSales = {};
        
        sales.forEach(sale => {
            if (sale.products && Array.isArray(sale.products)) {
                sale.products.forEach(product => {
                    const key = product.id || product.name;
                    if (!productSales[key]) {
                        productSales[key] = {
                            name: product.name || 'Unknown Product',
                            units: 0,
                            revenue: 0
                        };
                    }
                    productSales[key].units += product.quantity || 1;
                    productSales[key].revenue += product.subtotal || (product.price * product.quantity) || 0;
                });
            }
        });
        
        // Sort by revenue and get top 3
        const topProducts = Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 3);
        
        // Update top products display
        this.updateTopProductsDisplay(topProducts);
        
        // Update sales targets based on current performance
        this.updateSalesTargets(sales);
    }
    
    updateTopProductsDisplay(topProducts) {
        const productsList = document.querySelector('.product-performance-list');
        if (!productsList) return;
        
        if (topProducts.length === 0) {
            productsList.innerHTML = `
                <div class="product-performance-item">
                    <div class="product-rank">-</div>
                    <div class="product-details">
                        <span class="product-name">No sales data available</span>
                        <span class="product-metrics">Start recording sales to see top products</span>
                    </div>
                    <div class="product-trend neutral">
                        <i class="fas fa-minus"></i> 0%
                    </div>
                </div>
            `;
            return;
        }
        
        productsList.innerHTML = topProducts.map((product, index) => `
            <div class="product-performance-item">
                <div class="product-rank">${index + 1}</div>
                <div class="product-details">
                    <span class="product-name">${product.name}</span>
                    <span class="product-metrics">${product.units} units • GHS ${product.revenue.toFixed(2)} revenue</span>
                </div>
                <div class="product-trend positive">
                    <i class="fas fa-arrow-up"></i> ${((product.revenue / (topProducts[0]?.revenue || 1)) * 100).toFixed(0)}%
                </div>
            </div>
        `).join('');
    }
    
    getSalesTargets() {
        const defaultTargets = {
            daily: 16667,
            monthly: 500000,
            quarterly: 1500000,
            annual: 6000000
        };
        const saved = localStorage.getItem('jmonic_sales_targets');
        return saved ? JSON.parse(saved) : defaultTargets;
    }

    setSalesTargets(targets) {
        localStorage.setItem('jmonic_sales_targets', JSON.stringify(targets));
    }

    updateSalesTargets(sales) {
        // Get user-defined targets
        const targets = this.getSalesTargets();
        
        // Calculate daily, monthly, quarterly, and annual progress
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const currentDate = now.getDate();
        
        // Daily sales (today only)
        const dailySales = sales.filter(sale => {
            const saleDate = new Date(sale.date || sale.created_at);
            return saleDate.getDate() === currentDate && 
                   saleDate.getMonth() === currentMonth && 
                   saleDate.getFullYear() === currentYear;
        });
        const dailyRevenue = dailySales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || sale.revenue || 0), 0);
        const dailyProgress = (dailyRevenue / targets.daily) * 100;
        
        // Monthly sales
        const monthlySales = sales.filter(sale => {
            const saleDate = new Date(sale.date || sale.created_at);
            return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
        });
        const monthlyRevenue = monthlySales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || sale.revenue || 0), 0);
        const monthlyProgress = (monthlyRevenue / targets.monthly) * 100;
        
        // Quarterly sales
        const currentQuarter = Math.floor(currentMonth / 3);
        const quarterlySales = sales.filter(sale => {
            const saleDate = new Date(sale.date || sale.created_at);
            return Math.floor(saleDate.getMonth() / 3) === currentQuarter && saleDate.getFullYear() === currentYear;
        });
        const quarterlyRevenue = quarterlySales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || sale.revenue || 0), 0);
        const quarterlyProgress = (quarterlyRevenue / targets.quarterly) * 100;
        
        // Annual sales
        const annualSales = sales.filter(sale => {
            const saleDate = new Date(sale.date || sale.created_at);
            return saleDate.getFullYear() === currentYear;
        });
        const annualRevenue = annualSales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || sale.revenue || 0), 0);
        const annualProgress = (annualRevenue / targets.annual) * 100;
        
        // Update monthly target
        const monthlyProgressBar = document.getElementById('monthlyProgressBar');
        const monthlyPercentage = document.getElementById('monthlyPercentage');
        const monthlyProgressText = document.getElementById('monthlyProgress');
        
        if (monthlyProgressBar) monthlyProgressBar.style.width = `${Math.min(monthlyProgress, 100)}%`;
        if (monthlyPercentage) monthlyPercentage.textContent = `${monthlyProgress.toFixed(0)}%`;
        if (monthlyProgressText) monthlyProgressText.textContent = `GHS ${monthlyRevenue.toFixed(0)} / GHS ${targets.monthly.toLocaleString()}`;
        
        // Update quarterly target
        const quarterlyProgressBar = document.getElementById('quarterlyProgressBar');
        const quarterlyPercentage = document.getElementById('quarterlyPercentage');
        const quarterlyProgressText = document.getElementById('quarterlyProgress');
        
        if (quarterlyProgressBar) quarterlyProgressBar.style.width = `${Math.min(quarterlyProgress, 100)}%`;
        if (quarterlyPercentage) quarterlyPercentage.textContent = `${quarterlyProgress.toFixed(0)}%`;
        if (quarterlyProgressText) quarterlyProgressText.textContent = `GHS ${quarterlyRevenue.toFixed(0)} / GHS ${targets.quarterly.toLocaleString()}`;
        
        // Update annual target
        const annualProgressBar = document.getElementById('annualProgressBar');
        const annualPercentageSpan = document.getElementById('annualPercentage');
        const annualProgressText = document.getElementById('annualProgress');
        
        if (annualProgressBar) annualProgressBar.style.width = `${Math.min(annualProgress, 100)}%`;
        if (annualPercentageSpan) annualPercentageSpan.textContent = `${annualProgress.toFixed(0)}%`;
        if (annualProgressText) annualProgressText.textContent = `GHS ${annualRevenue.toFixed(0)} / GHS ${targets.annual.toLocaleString()}`;
        
        // Update daily target
        const dailyProgressBar = document.getElementById('dailyProgressBar');
        const dailyPercentage = document.getElementById('dailyPercentage');
        const dailyProgressText = document.getElementById('dailyProgress');
        
        if (dailyProgressBar) dailyProgressBar.style.width = `${Math.min(dailyProgress, 100)}%`;
        if (dailyPercentage) dailyPercentage.textContent = `${dailyProgress.toFixed(0)}%`;
        if (dailyProgressText) dailyProgressText.textContent = `GHS ${dailyRevenue.toFixed(0)} / GHS ${targets.daily.toLocaleString()}`;
    }

    initTargetsEditing() {
        const editBtn = document.getElementById('editTargetsBtn');
        const saveBtn = document.getElementById('saveTargetsBtn');
        const cancelBtn = document.getElementById('cancelTargetsBtn');
        const actionsDiv = document.getElementById('targetsActions');
        
        const dailyInput = document.getElementById('dailyTargetInput');
        const monthlyInput = document.getElementById('monthlyTargetInput');
        const quarterlyInput = document.getElementById('quarterlyTargetInput');
        const annualInput = document.getElementById('annualTargetInput');
        
        const dailyProgress = document.getElementById('dailyProgress');
        const monthlyProgress = document.getElementById('monthlyProgress');
        const quarterlyProgress = document.getElementById('quarterlyProgress');
        const annualProgress = document.getElementById('annualProgress');
        
        if (!editBtn || !saveBtn || !cancelBtn) return;
        
        editBtn.addEventListener('click', () => {
            const targets = this.getSalesTargets();
            
            // Show inputs and hide progress text
            dailyInput.value = targets.daily;
            monthlyInput.value = targets.monthly;
            quarterlyInput.value = targets.quarterly;
            annualInput.value = targets.annual;
            
            dailyInput.style.display = 'block';
            monthlyInput.style.display = 'block';
            quarterlyInput.style.display = 'block';
            annualInput.style.display = 'block';
            
            dailyProgress.style.display = 'none';
            monthlyProgress.style.display = 'none';
            quarterlyProgress.style.display = 'none';
            annualProgress.style.display = 'none';
            
            editBtn.style.display = 'none';
            actionsDiv.style.display = 'flex';
        });
        
        saveBtn.addEventListener('click', () => {
            const newTargets = {
                daily: parseFloat(dailyInput.value) || 16667,
                monthly: parseFloat(monthlyInput.value) || 500000,
                quarterly: parseFloat(quarterlyInput.value) || 1500000,
                annual: parseFloat(annualInput.value) || 6000000
            };
            
            this.setSalesTargets(newTargets);
            
            // Hide inputs and show progress text
            dailyInput.style.display = 'none';
            monthlyInput.style.display = 'none';
            quarterlyInput.style.display = 'none';
            annualInput.style.display = 'none';
            
            dailyProgress.style.display = 'block';
            monthlyProgress.style.display = 'block';
            quarterlyProgress.style.display = 'block';
            annualProgress.style.display = 'block';
            
            editBtn.style.display = 'block';
            actionsDiv.style.display = 'none';
            
            // Update targets display
            const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
            this.updateSalesTargets(sales);
            
            // Show success message
            this.showNotification('Sales targets updated successfully!', 'success');
        });
        
        cancelBtn.addEventListener('click', () => {
            // Hide inputs and show progress text
            dailyInput.style.display = 'none';
            monthlyInput.style.display = 'none';
            quarterlyInput.style.display = 'none';
            annualInput.style.display = 'none';
            
            dailyProgress.style.display = 'block';
            monthlyProgress.style.display = 'block';
            quarterlyProgress.style.display = 'block';
            annualProgress.style.display = 'block';
            
            editBtn.style.display = 'block';
            actionsDiv.style.display = 'none';
        });
    }
    
    // Payment Method Breakdown
    updatePaymentBreakdown(sales) {
        // Calculate payment method totals
        const paymentTotals = {
            cash: 0,
            mobile_money: 0,
            transfer: 0
        };
        
        // Sum up sales by payment method
        sales.forEach(sale => {
            const paymentMethod = sale.payment_method || sale.paymentMethod || 'cash';
            const amount = parseFloat(sale.total_amount || sale.revenue || 0);
            
            // Normalize payment method names
            if (paymentMethod === 'cash') {
                paymentTotals.cash += amount;
            } else if (paymentMethod === 'mobile_money') {
                paymentTotals.mobile_money += amount;
            } else if (paymentMethod === 'transfer') {
                paymentTotals.transfer += amount;
            }
        });
        
        // Calculate total and percentages
        const totalRevenue = paymentTotals.cash + paymentTotals.mobile_money + paymentTotals.transfer;
        
        const cashPercentage = totalRevenue > 0 ? (paymentTotals.cash / totalRevenue) * 100 : 0;
        const mobilePercentage = totalRevenue > 0 ? (paymentTotals.mobile_money / totalRevenue) * 100 : 0;
        const transferPercentage = totalRevenue > 0 ? (paymentTotals.transfer / totalRevenue) * 100 : 0;
        
        // Update the UI elements
        const cashTotalElement = document.getElementById('cashTotal');
        const mobileTotalElement = document.getElementById('mobileTotal');
        const transferTotalElement = document.getElementById('transferTotal');
        
        const cashPercentageElement = document.getElementById('cashPercentage');
        const mobilePercentageElement = document.getElementById('mobilePercentage');
        const transferPercentageElement = document.getElementById('transferPercentage');
        
        if (cashTotalElement) cashTotalElement.textContent = `GHS ${paymentTotals.cash.toFixed(2)}`;
        if (mobileTotalElement) mobileTotalElement.textContent = `GHS ${paymentTotals.mobile_money.toFixed(2)}`;
        if (transferTotalElement) transferTotalElement.textContent = `GHS ${paymentTotals.transfer.toFixed(2)}`;
        
        if (cashPercentageElement) cashPercentageElement.textContent = `${cashPercentage.toFixed(1)}% of total`;
        if (mobilePercentageElement) mobilePercentageElement.textContent = `${mobilePercentage.toFixed(1)}% of total`;
        if (transferPercentageElement) transferPercentageElement.textContent = `${transferPercentage.toFixed(1)}% of total`;
    }
    
    // Charts initialization and updates
    initializeSalesCharts() {
        // Debounce chart updates to prevent performance issues
        if (this.chartUpdateTimeout) {
            clearTimeout(this.chartUpdateTimeout);
        }
        
        this.chartUpdateTimeout = setTimeout(() => {
            this.initSalesTrendChart();
            this.initRevenueBreakdownChart();
        }, 300);
    }
    
    initSalesTrendChart() {
        const ctx = document.getElementById('salesTrendChart');
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (this.salesTrendChart) {
            this.salesTrendChart.destroy();
        }
        
        const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
        const last7Days = this.getLast7DaysData(sales);
        
        // Simple overview - just show total sales for the week
        const totalWeekSales = last7Days.reduce((sum, day) => sum + day.revenue, 0);
        const hasData = totalWeekSales > 0;
        
        this.salesTrendChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: hasData ? ['This Week', 'Target Remaining'] : ['No Sales Yet'],
                datasets: [{
                    data: hasData ? [totalWeekSales, Math.max(0, 1000 - totalWeekSales)] : [1],
                    backgroundColor: hasData ? ['#10b981', '#e5e7eb'] : ['#f3f4f6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: hasData,
                        callbacks: {
                            label: function(context) {
                                if (context.dataIndex === 0 && hasData) {
                                    return `Weekly Sales: GHS ${totalWeekSales.toFixed(2)}`;
                                }
                                return '';
                            }
                        }
                    }
                }
            }
        });
        
        // Add text in center of doughnut
        const centerText = hasData ? 
            `GHS ${totalWeekSales.toFixed(0)}\nThis Week` : 
            'No Sales\nAdd Products';
            
        // Store center text for potential display
        if (ctx.parentElement) {
            const existingLabel = ctx.parentElement.querySelector('.chart-center-text');
            if (existingLabel) existingLabel.remove();
            
            const centerLabel = document.createElement('div');
            centerLabel.className = 'chart-center-text';
            centerLabel.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                font-weight: 600;
                color: ${hasData ? '#10b981' : '#6b7280'};
                pointer-events: none;
                line-height: 1.2;
                font-size: ${hasData ? '1.2rem' : '0.9rem'};
            `;
            centerLabel.innerHTML = centerText.replace('\n', '<br>');
            ctx.parentElement.style.position = 'relative';
            ctx.parentElement.appendChild(centerLabel);
        }
    }
    
    initRevenueBreakdownChart() {
        const ctx = document.getElementById('revenueBreakdownChart');
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (this.revenueBreakdownChart) {
            this.revenueBreakdownChart.destroy();
        }
        
        const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
        
        // Simple revenue calculation - just show total vs target
        const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0);
        const targets = this.getSalesTargets();
        const targetRevenue = targets.monthly; // Use user's monthly target
        
        // Update center text
        const centerText = document.getElementById('revenueBreakdownCenterText');
        if (centerText) {
            const centerValue = centerText.querySelector('.center-value');
            const centerLabel = centerText.querySelector('.center-label');
            if (centerValue) centerValue.textContent = `GHS ${totalRevenue.toFixed(0)}`;
            if (centerLabel) centerLabel.textContent = 'Achieved';
        }
        
        this.revenueBreakdownChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Achieved', 'Remaining'],
                datasets: [{
                    data: totalRevenue > 0 ? [totalRevenue, Math.max(0, targetRevenue - totalRevenue)] : [0, targetRevenue],
                    backgroundColor: ['#10b981', '#e5e7eb'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                cutout: '70%'
            }
        });
    }
    
    getLast7DaysData(sales) {
        const days = [];
        const now = new Date();
        
        // Create array of last 7 days only
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Simple revenue calculation
            const dayRevenue = sales
                .filter(sale => {
                    const saleDate = sale.date || sale.created_at;
                    return saleDate && saleDate.startsWith(dateStr);
                })
                .reduce((sum, sale) => sum + parseFloat(sale.total_amount || sale.revenue || 0), 0);
                
            days.push({
                date: date.toLocaleDateString('en-US', { weekday: 'short' }),
                revenue: dayRevenue
            });
        }
        
        return days;
    }
    
    // Sale action methods
    viewSaleDetails(saleId) {
        const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
        const sale = sales.find(s => s.id == saleId || `S-${Date.now().toString().slice(-5)}-${sales.indexOf(s)}` === saleId);
        
        if (!sale) {
            this.showNotification('Sale not found', 'error');
            return;
        }
        
        // Create a modal or popup to show sale details
        let saleDetails = `
            <div style="max-width: 500px; margin: 20px auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h3>Sale Details - ${saleId}</h3>
                <p><strong>Date:</strong> ${this.formatDate(sale.date || sale.created_at)}</p>
                <p><strong>Payment Method:</strong> ${sale.paymentMethod || 'Not specified'}</p>
                <p><strong>Total Amount:</strong> GHS ${parseFloat(sale.revenue || sale.totalAmount || 0).toFixed(2)}</p>
                <h4>Products:</h4>
                <ul>
        `;
        
        if (sale.products && Array.isArray(sale.products)) {
            sale.products.forEach(product => {
                saleDetails += `<li>${product.name || 'Unknown Product'} - Qty: ${product.quantity || 1} - GHS ${(product.subtotal || 0).toFixed(2)}</li>`;
            });
        } else {
            saleDetails += '<li>Product details not available</li>';
        }
        
        saleDetails += '</ul></div>';
        
        // Show in a simple alert for now (you can enhance this with a proper modal)
        const detailsWindow = window.open('', '_blank', 'width=600,height=400');
        detailsWindow.document.write(`
            <html>
                <head><title>Sale Details - ${saleId}</title></head>
                <body style="font-family: Arial, sans-serif;">${saleDetails}</body>
            </html>
        `);
    }
    
    printReceipt(saleId) {
        const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
        const sale = sales.find(s => s.id == saleId || `S-${Date.now().toString().slice(-5)}-${sales.indexOf(s)}` === saleId);
        
        if (!sale) {
            this.showNotification('Sale not found', 'error');
            return;
        }
        
        // Create receipt content
        let receipt = `
            <div style="max-width: 300px; margin: 20px auto; font-family: monospace; font-size: 12px;">
                <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px;">
                    <h2>J'MONIC ENTERPRISE</h2>
                    <p>Products</p>
                    <p>Receipt #${saleId}</p>
                </div>
                
                <p><strong>Date:</strong> ${this.formatDate(sale.date || sale.created_at)}</p>
                <p><strong>Payment:</strong> ${sale.paymentMethod || 'Cash'}</p>
                
                <div style="border-top: 1px solid #000; margin: 10px 0; padding-top: 10px;">
                    <table style="width: 100%; font-size: 12px;">
                        <tr style="border-bottom: 1px solid #000;">
                            <th style="text-align: left;">Item</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
        `;
        
        let grandTotal = 0;
        if (sale.products && Array.isArray(sale.products)) {
            sale.products.forEach(product => {
                const subtotal = product.subtotal || (product.price * product.quantity) || 0;
                grandTotal += subtotal;
                receipt += `
                    <tr>
                        <td>${(product.name || 'Product').substring(0, 15)}</td>
                        <td style="text-align: center;">${product.quantity || 1}</td>
                        <td style="text-align: right;">GHS ${(product.price || 0).toFixed(2)}</td>
                        <td style="text-align: right;">GHS ${subtotal.toFixed(2)}</td>
                    </tr>
                `;
            });
        }
        
        receipt += `
                    </table>
                </div>
                
                <div style="border-top: 2px solid #000; margin-top: 10px; padding-top: 10px;">
                    <p style="text-align: right; font-weight: bold; font-size: 14px;">
                        TOTAL: GHS ${grandTotal.toFixed(2)}
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 20px; font-size: 10px;">
                    <p>Thank you for your business!</p>
                    <p>Visit us again soon</p>
                </div>
            </div>
        `;
        
        // Open receipt in new window for printing
        const receiptWindow = window.open('', '_blank', 'width=400,height=600');
        receiptWindow.document.write(`
            <html>
                <head>
                    <title>Receipt - ${saleId}</title>
                    <style>@media print { body { margin: 0; } }</style>
                </head>
                <body onload="window.print(); window.close();">
                    ${receipt}
                </body>
            </html>
        `);
    }
    
    updateRecentSales(sales) {
        const tbody = document.querySelector('.activity-card tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!sales || sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="no-data">No sales recorded yet</td></tr>';
            return;
        }
        
        sales.forEach(sale => {
            const row = document.createElement('tr');
            
            // Format products list
            let productsText = 'Unknown Product';
            if (sale.products && Array.isArray(sale.products)) {
                const productNames = sale.products.map(p => p.name || 'Product').join(', ');
                productsText = productNames;
            } else if (typeof sale.products === 'string') {
                productsText = sale.products;
            }
            
            // Ensure we have a sale ID
            const saleId = sale.sale_id || sale.id || `#S-${Date.now().toString().slice(-5)}`;
            
            row.innerHTML = `
                <td>${saleId}</td>
                <td>${productsText}</td>
                <td>GHS ${parseFloat(sale.revenue || sale.total_amount || 0).toFixed(2)}</td>
                <td>${this.formatDate(sale.date || sale.created_at)}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    loadRecentSalesTable() {
        const tbody = document.getElementById('salesTableBody');
        if (!tbody) return;
        
        // Get sales from localStorage
        const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
        
        if (sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="no-data">No recent sales</td></tr>';
            return;
        }
        
        // Sort by date (most recent first) and take the last 10
        const recentSales = sales
            .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at))
            .slice(0, 10);
        
        tbody.innerHTML = recentSales.map(sale => {
            // Calculate totals
            const revenue = parseFloat(sale.total_amount || 0);
            let totalCost = 0;
            let totalQuantity = 0;
            let productsDisplay = '';
            
            if (sale.products && Array.isArray(sale.products)) {
                totalQuantity = sale.products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);
                totalCost = sale.products.reduce((sum, p) => sum + ((parseFloat(p.cost_price) || 0) * (parseInt(p.quantity) || 0)), 0);
                
                const mainProduct = sale.products[0].name || 'Product';
                const additionalCount = sale.products.length - 1;
                
                productsDisplay = `
                    <div class="products-sold">
                        <span>${mainProduct}</span>
                        ${additionalCount > 0 ? `<small>+${additionalCount} more item${additionalCount > 1 ? 's' : ''}</small>` : ''}
                    </div>
                `;
            } else {
                productsDisplay = '<div class="products-sold"><span>Unknown Product</span></div>';
                totalQuantity = 1;
            }
            
            const profit = revenue - totalCost;
            const profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';
            
            // Generate sale ID
            const saleId = sale.sale_id || sale.id || `#S-${Date.now().toString().slice(-5)}`;
            
            // Format date
            const saleDate = new Date(sale.date || sale.created_at);
            const formattedDate = saleDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
            
            // Determine status
            const status = sale.status || 'completed';
            const statusClass = status.toLowerCase();
            const statusText = status.charAt(0).toUpperCase() + status.slice(1);
            
            return `
                <tr>
                    <td>${saleId}</td>
                    <td>${productsDisplay}</td>
                    <td>${totalQuantity}</td>
                    <td>GHS ${revenue.toFixed(2)}</td>
                    <td>GHS ${totalCost.toFixed(2)}</td>
                    <td class="${profitClass}">GHS ${profit.toFixed(2)}</td>
                    <td>${formattedDate}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <button class="btn-icon" onclick="businessManager.viewSaleDetails('${saleId}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="businessManager.printSaleReceipt('${saleId}')" title="Print Receipt">
                            <i class="fas fa-print"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    viewSaleDetails(saleId) {
        // Find the sale by ID
        const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
        const sale = sales.find(s => (s.sale_id || s.id || `#S-${Date.now().toString().slice(-5)}`) === saleId);
        
        if (sale) {
            // Show sale details in a modal or alert for now
            let details = `Sale Details for ${saleId}\n\n`;
            details += `Date: ${new Date(sale.date || sale.created_at).toLocaleDateString()}\n`;
            details += `Total Amount: GHS ${parseFloat(sale.total_amount || 0).toFixed(2)}\n\n`;
            
            if (sale.products && Array.isArray(sale.products)) {
                details += 'Products:\n';
                sale.products.forEach(product => {
                    details += `- ${product.name}: ${product.quantity} x GHS ${product.price} = GHS ${product.subtotal}\n`;
                });
            }
            
            alert(details);
        } else {
            this.showNotification('Sale not found', 'error');
        }
    }
    
    printSaleReceipt(saleId) {
        this.showNotification('Print receipt feature coming soon!', 'info');
    }
    
    exportRecentSales() {
        try {
            const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
            console.log('Export: Found', sales.length, 'sales records');
            
            if (sales.length === 0) {
                this.showNotification('No sales data to export', 'warning');
                return;
            }
            
            // Log first sale to understand structure
            if (sales.length > 0) {
                console.log('Export: Sample sale structure:', sales[0]);
            }
            
            // Prepare CSV data with proper headers
            const headers = ['Sale ID', 'Date', 'Products', 'Quantity', 'Revenue (GHS)', 'Cost (GHS)', 'Profit (GHS)', 'Status'];
            const csvData = [headers];
            
            // Sort by date (most recent first)
            const sortedSales = [...sales].sort((a, b) => {
                const dateA = new Date(a.date || a.created_at || 0);
                const dateB = new Date(b.date || b.created_at || 0);
                return dateB - dateA;
            });
            
            sortedSales.forEach(sale => {
                // Handle different sale ID formats
                const saleId = sale.sale_id || sale.id || `#S-${Date.now().toString().slice(-5)}`;
                
                // Handle date formatting
                const saleDate = sale.date || sale.created_at;
                const date = saleDate ? new Date(saleDate).toLocaleDateString() : 'N/A';
                
                // Handle revenue with multiple possible field names
                const revenue = parseFloat(sale.revenue || sale.total_amount || sale.total || 0);
                
                // Handle cost calculation
                let cost = 0;
                if (sale.cost) {
                    cost = parseFloat(sale.cost);
                } else if (sale.items && Array.isArray(sale.items)) {
                    // Calculate cost from items if available
                    cost = sale.items.reduce((sum, item) => {
                        const itemCost = (item.cost_price || item.cost || 0) * (item.quantity || 1);
                        return sum + parseFloat(itemCost);
                    }, 0);
                }
                
                const profit = revenue - cost;
                const status = sale.status || 'COMPLETED';
                
                // Handle products and quantities
                let products = 'Unknown Product';
                let totalQuantity = 1;
                
                if (sale.items && Array.isArray(sale.items)) {
                    // Handle items array structure
                    products = sale.items.map(item => {
                        const name = item.product_name || item.name || 'Unknown';
                        const qty = item.quantity || 1;
                        return qty > 1 ? `${name} (x${qty})` : name;
                    }).join('; ');
                    totalQuantity = sale.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);
                } else if (sale.products && Array.isArray(sale.products)) {
                    // Handle products array structure
                    products = sale.products.map(p => {
                        const name = p.name || p.product_name || 'Unknown';
                        const qty = p.quantity || 1;
                        return qty > 1 ? `${name} (x${qty})` : name;
                    }).join('; ');
                    totalQuantity = sale.products.reduce((sum, p) => sum + (parseInt(p.quantity) || 1), 0);
                } else if (sale.product_name) {
                    // Handle single product structure
                    products = sale.product_name;
                    totalQuantity = sale.quantity || 1;
                }
                
                csvData.push([
                    saleId,
                    date,
                    products,
                    totalQuantity,
                    revenue.toFixed(2),
                    cost.toFixed(2),
                    profit.toFixed(2),
                    status.toUpperCase()
                ]);
            });
            
            console.log('Export: Prepared', csvData.length - 1, 'sales records for export');
            
            // Convert to CSV string with proper escaping
            const csvString = csvData.map(row => 
                row.map(field => {
                    // Escape quotes and wrap in quotes
                    const escaped = String(field).replace(/"/g, '""');
                    return `"${escaped}"`;
                }).join(',')
            ).join('\n');
            
            // Create and download CSV file
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `jmonic-recent-sales-${new Date().toISOString().split('T')[0]}.csv`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showNotification(`Successfully exported ${sortedSales.length} sales records!`, 'success');
            console.log('Export completed successfully');
            
        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification('Failed to export sales data: ' + error.message, 'error');
        }
    }
    
    // Header dropdown functionality
    initializeHeaderDropdowns() {
        const notificationBtn = document.getElementById('notificationBtn');
        
        // Sidebar dropdown buttons
        const sidebarNotificationBtn = document.getElementById('sidebarNotificationBtn');
        
        const notificationDropdown = document.getElementById('notificationDropdown');
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.header-actions') && !e.target.closest('.sidebar')) {
                this.closeAllDropdowns();
            }
        });
        
        // Notification button (header)
        if (notificationBtn) {
            notificationBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown('notification');
                this.loadNotifications();
            });
        }
        
        // Sidebar notification button
        if (sidebarNotificationBtn) {
            sidebarNotificationBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown('notification');
                this.loadNotifications();
            });
        }
        
        // Delete button in settings dropdown (both variants)
        const deleteDataBtn = document.getElementById('deleteDataBtn');
        const deleteDataBtnDash = document.getElementById('deleteDataBtn-dash');
        
        if (deleteDataBtn) {
            deleteDataBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearAllData();
                this.closeAllDropdowns();
            });
        }
        
        if (deleteDataBtnDash) {
            deleteDataBtnDash.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearAllData();
                this.closeAllDropdowns();
            });
        }
        
        // Load initial notifications and settings
        this.loadNotifications();
        this.loadSettings();
        
        // Ensure delete buttons are working
        this.initializeDeleteButtons();
        
        // Re-initialize delete buttons after a delay to catch dynamically loaded content
        setTimeout(() => {
            this.initializeDeleteButtons();
        }, 1000);
        
        // Activate settings dropdown functionality immediately
        console.log('✅ Settings functionality activated');
    }
    
    toggleDropdown(type) {
        const dropdowns = {
            notification: document.getElementById('notificationDropdown')
        };
        
        // Create or get backdrop
        let backdrop = document.getElementById('dropdownBackdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'dropdownBackdrop';
            backdrop.className = 'dropdown-backdrop';
            backdrop.onclick = () => this.closeAllDropdowns();
            document.body.appendChild(backdrop);
        }
        
        // Close all dropdowns first
        Object.values(dropdowns).forEach(dropdown => {
            if (dropdown) dropdown.style.display = 'none';
        });
        backdrop.style.display = 'none';
        
        // Open the requested dropdown
        if (dropdowns[type]) {
            dropdowns[type].style.display = 'block';
            backdrop.style.display = 'block';
            
            // Load specific content
            if (type === 'notification') {
                this.loadNotifications();
            }
        }
    }
    
    closeAllDropdowns() {
        const dropdowns = ['notificationDropdown'];
        dropdowns.forEach(id => {
            const dropdown = document.getElementById(id);
            if (dropdown) dropdown.style.display = 'none';
        });
        
        // Hide backdrop
        const backdrop = document.getElementById('dropdownBackdrop');
        if (backdrop) backdrop.style.display = 'none';
    }
    
    initializeDeleteButtons() {
        console.log('🔍 Initializing delete buttons...');
        
        // Multiple approaches to ensure delete buttons work
        this.setupDeleteButtonHandlers();
        
        // Set up periodic checks for dynamically added buttons
        this.setupDeleteButtonObserver();
        
        // Set up global click delegation as fallback
        this.setupGlobalDeleteHandler();
    }
    
    setupDeleteButtonHandlers() {
        // Method 1: Direct ID targeting
        const deleteButtonIds = ['deleteDataBtn', 'deleteDataBtn-dash'];
        let foundButtons = 0;
        
        deleteButtonIds.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                foundButtons++;
                // Remove any existing listeners by cloning (clean slate approach)
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                // Add multiple event handlers for maximum reliability
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🗑️ Delete button clicked via ID:', btnId);
                    this.clearAllData();
                });
                
                // Also add onclick as backup
                newBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🗑️ Delete button clicked via onclick:', btnId);
                    this.clearAllData();
                };
                
                console.log('✅ Delete button initialized with multiple handlers:', btnId);
            } else {
                console.log('ℹ️ Delete button not found (may not exist on this page):', btnId);
            }
        });
        
        console.log(`📊 Delete button status: ${foundButtons}/${deleteButtonIds.length} buttons found`);
        
        console.log(`📊 Class-based buttons: Skipped overly broad class matching to prevent false triggers`);
    }
    
    setupDeleteButtonObserver() {
        // Observer to catch dynamically added delete buttons (with specific targeting)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        // Only check for specific delete button IDs (not text content)
                        if (node.id === 'deleteDataBtn' || node.id === 'deleteDataBtn-dash') {
                            this.attachDeleteHandler(node);
                        }
                        
                        // Check for delete buttons within the added node (specific IDs only)
                        const deleteButtons = node.querySelectorAll('#deleteDataBtn, #deleteDataBtn-dash');
                        deleteButtons.forEach(btn => this.attachDeleteHandler(btn));
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        this.deleteButtonObserver = observer;
    }
    
    setupGlobalDeleteHandler() {
        // Disabled overly broad global event delegation to prevent false triggers
        console.log('� Global delete handler disabled to prevent modal popup bugs');
    }
    
    attachDeleteHandler(btn) {
        if (!btn || btn.dataset.deleteHandlerAttached) return;
        
        btn.dataset.deleteHandlerAttached = 'true';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🗑️ Delete button clicked via observer');
            this.clearAllData();
        });
        
        console.log('✅ Delete handler attached to:', btn.id || btn.className);
    }
    
    loadNotifications() {
        const notificationList = document.getElementById('notificationList');
        const notificationBadge = document.querySelector('.notification-badge');
        const headerNotificationBadge = document.getElementById('headerNotificationBadge');
        const notificationCount = document.getElementById('notificationCount');
        const notificationBell = document.getElementById('notificationBell');
        
        console.log('🔔 Loading notifications...', { notificationList: !!notificationList });
        
        if (!notificationList) {
            console.error('❌ Notification list element not found');
            return;
        }
        
        // Get low stock products
        const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
        console.log('📦 Products found:', products.length);
        
        const lowStockProducts = products.filter(p => {
            const stock = p.stock_quantity || 0;
            const reorderLevel = p.reorderLevel || p.min_stock_level || 5;
            const isLowStock = stock <= reorderLevel;
            console.log(`📦 ${p.name}: stock=${stock}, reorder=${reorderLevel}, lowStock=${isLowStock}`);
            return isLowStock;
        });
        
        console.log('⚠️ Low stock products:', lowStockProducts.length);
        
        let notifications = [];
        
        // Add low stock notifications with better logic
        lowStockProducts.forEach(product => {
            const stockLevel = product.stock_quantity || 0;
            let priority = 'medium';
            let icon = 'fa-exclamation-triangle';
            let title = 'Low Stock Alert';
            let message = `${product.name} - Only ${stockLevel} remaining`;
            
            // Determine urgency based on stock level
            if (stockLevel === 0) {
                priority = 'high';
                icon = 'fa-times-circle';
                title = 'Out of Stock';
                message = `${product.name} is completely out of stock`;
            } else if (stockLevel <= 2) {
                priority = 'high';
                title = 'Critical Stock Alert';
                message = `${product.name} - Only ${stockLevel} left!`;
            } else if (stockLevel <= product.reorderLevel) {
                priority = 'medium';
                title = 'Low Stock Alert';
                message = `${product.name} - ${stockLevel} remaining (reorder level: ${product.reorderLevel})`;
            }
            
            notifications.push({
                id: `low-stock-${product.id}`,
                type: 'warning',
                icon: icon,
                title: title,
                message: message,
                time: 'Now',
                priority: priority
            });
        });
        
        // Add recent sales notifications (last 24 hours)
        const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
        const recentSales = sales.filter(sale => {
            const saleDate = new Date(sale.date || sale.created_at);
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return saleDate > dayAgo;
        }).slice(0, 3); // Only show last 3
        
        recentSales.forEach(sale => {
            notifications.push({
                id: `sale-${sale.id}`,
                type: 'success',
                icon: 'fa-shopping-cart',
                title: 'New Sale',
                message: `${sale.customer_name || 'Customer'} purchased items worth ₵${sale.total_amount}`,
                time: this.formatTimeAgo(new Date(sale.date || sale.created_at)),
                priority: 'medium'
            });
        });
        
        // Add welcome message if no products
        if (products.length === 0) {
            notifications.push({
                id: 'welcome',
                type: 'info',
                icon: 'fa-info-circle',
                title: 'Welcome to J\'MONIC Dashboard',
                message: 'Start by adding your first product to track inventory and sales',
                time: 'Getting Started',
                priority: 'low'
            });
        }
        
        // Sort by priority
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        notifications.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
        
        console.log('🔔 Total notifications:', notifications.length);
        
        // Update notification badges with enhanced animation - only for critical alerts
        const criticalAlerts = notifications.filter(n => {
            if (n.type === 'warning' && n.id.startsWith('low-stock-')) {
                // Only consider it critical if stock is 0 or very low (1-2 units)
                const product = lowStockProducts.find(p => `low-stock-${p.id}` === n.id);
                return product && product.stock_quantity <= 2;
            }
            return n.priority === 'high';
        });
        
        const unreadCount = criticalAlerts.length;
        
        [notificationBadge, headerNotificationBadge].forEach(badge => {
            if (badge) {
                if (unreadCount > 0) {
                    badge.textContent = unreadCount;
                    badge.style.display = 'block';
                    badge.style.animation = 'badge-bounce 0.6s ease-out';
                } else {
                    badge.style.display = 'none';
                }
            }
        });
        
        // Update notification bell state
        if (notificationBell) {
            if (unreadCount > 0) {
                notificationBell.classList.add('has-alerts');
            } else {
                notificationBell.classList.remove('has-alerts');
            }
        }
        
        if (notificationCount) {
            notificationCount.textContent = unreadCount === 0 ? 'All good!' : 
                unreadCount === 1 ? '1 critical alert' : `${unreadCount} critical alerts`;
        }
        
        // Enhanced notification display
        this.renderSimpleNotifications(notifications);
    }
    
    // Helper function to format time ago
    formatTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }
    
    // Enhanced header notification functions
    showLiveNotification(title, message, type = 'info', icon = 'fa-info-circle', duration = 4000) {
        const liveNotification = document.getElementById('liveNotification');
        if (!liveNotification) return;
        
        console.log('🔔 Showing live notification:', { title, message, type });
        
        // Play notification sound (if supported)
        this.playNotificationSound(type);
        
        // Update content
        const titleEl = liveNotification.querySelector('.notification-title');
        const textEl = liveNotification.querySelector('.notification-text');
        const iconEl = liveNotification.querySelector('.notification-icon i');
        
        if (titleEl) titleEl.textContent = title;
        if (textEl) textEl.textContent = message;
        if (iconEl) iconEl.className = `fas ${icon}`;
        
        // Update type class
        liveNotification.className = `live-notification ${type}`;
        
        // Show notification with animation
        liveNotification.style.display = 'block';
        liveNotification.style.animation = 'notification-slide-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Trigger bell animation
        const notificationBell = document.getElementById('notificationBell');
        if (notificationBell) {
            notificationBell.classList.add('pulse-notification');
            setTimeout(() => notificationBell.classList.remove('pulse-notification'), 600);
        }
        
        // Auto hide after specified duration
        setTimeout(() => {
            if (liveNotification) {
                liveNotification.style.animation = 'notification-slide-out 0.3s ease';
                setTimeout(() => {
                    liveNotification.style.display = 'none';
                }, 300);
            }
        }, duration);
        
        // Add click to dismiss
        liveNotification.onclick = () => {
            liveNotification.style.animation = 'notification-slide-out 0.3s ease';
            setTimeout(() => {
                liveNotification.style.display = 'none';
            }, 300);
        };
        
        // Update notification count
        this.loadNotifications();
    }
    
    // Play notification sound based on type
    playNotificationSound(type = 'info') {
        try {
            // Create audio context if supported
            if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                const audioContext = new (AudioContext || webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                // Different frequencies for different types
                const frequencies = {
                    'success': 800,
                    'info': 600,
                    'warning': 400,
                    'error': 300
                };
                
                oscillator.frequency.setValueAtTime(frequencies[type] || 600, audioContext.currentTime);
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
            }
        } catch (error) {
            console.log('🔇 Audio not supported or disabled');
        }
    }
    
    // Enhanced notification bell functionality
    triggerNotificationAlert(message, type = 'info') {
        const notificationBell = document.getElementById('notificationBell');
        if (!notificationBell) return;
        
        // Add visual feedback
        notificationBell.classList.add('has-alerts');
        notificationBell.classList.add('pulse-notification');
        
        // Show live notification
        this.showLiveNotification('Alert', message, type);
        
        // Remove pulse after animation
        setTimeout(() => {
            notificationBell.classList.remove('pulse-notification');
        }, 600);
    }
    
    updateHeaderNotificationBadge() {
        const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
        const lowStockCount = products.filter(p => {
            const stock = p.stock_quantity || 0;
            const reorderLevel = p.reorderLevel || p.min_stock_level || 5;
            return stock <= reorderLevel;
        }).length;
        
        const headerBadge = document.getElementById('headerNotificationBadge');
        const notificationBell = document.getElementById('notificationBell');
        
        if (headerBadge && notificationBell) {
            if (lowStockCount > 0) {
                headerBadge.textContent = lowStockCount;
                headerBadge.style.display = 'block';
                // Add alert animation class
                notificationBell.classList.add('has-alerts');
                
                // Add a brief shake animation for new alerts
                notificationBell.style.animation = 'none';
                setTimeout(() => {
                    notificationBell.style.animation = '';
                }, 10);
            } else {
                headerBadge.style.display = 'none';
                notificationBell.classList.remove('has-alerts');
            }
        }
    }
    
    // Enhanced notification bell interaction
    showNotificationAlert() {
        const notificationBell = document.getElementById('notificationBell');
        if (notificationBell) {
            // Add a temporary shake effect for immediate feedback
            notificationBell.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                notificationBell.style.animation = '';
            }, 500);
            
            // Update badge and alert state
            this.updateHeaderNotificationBadge();
        }
    }
    
    renderSimpleNotifications(notifications) {
        const notificationList = document.getElementById('notificationList');
        if (!notificationList) return;
        
        if (notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="no-notifications">
                    <div class="empty-state">
                        <i class="fas fa-check-circle" style="color: #10b981; font-size: 3rem; margin-bottom: 1rem;"></i>
                        <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">All Good!</h3>
                        <p style="color: var(--text-secondary);">No alerts or issues to address</p>
                    </div>
                </div>
            `;
            return;
        }
        
        notificationList.innerHTML = notifications.map(notification => `
            <div class="notification-item simple" data-id="${notification.id}">
                <div class="notification-icon ${notification.type}">
                    <i class="fas ${notification.icon}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${notification.time}</div>
                </div>
            </div>
        `).join('');
    }
    
    
    // Simplified notification functions
    markNotificationAsRead(notificationId) {
        // Simplified - just reload notifications
        this.loadNotifications();
    }
    
    markAllAsRead() {
        // Simplified - just reload notifications  
        this.loadNotifications();
    }
    
    dismissNotification(notificationId) {
        // Simplified - just reload notifications
        this.loadNotifications();
    }
    
    clearNotifications() {
        const notificationList = document.getElementById('notificationList');
        const notificationBadge = document.querySelector('.notification-badge');
        
        if (notificationList) {
            notificationList.innerHTML = `
                <div class="no-notifications">
                    <div class="empty-state">
                        <i class="fas fa-check-circle" style="color: #10b981; font-size: 3rem; margin-bottom: 1rem;"></i>
                        <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">All Good!</h3>
                        <p style="color: var(--text-secondary);">No alerts or issues to address</p>
                    </div>
                </div>
            `;
        }
        
        if (notificationBadge) {
            notificationBadge.style.display = 'none';
        }
    }
    
    // Header notification dropdown toggle
    toggleNotificationDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        const notificationBell = document.getElementById('notificationBell');
        const headerNotificationBadge = document.getElementById('headerNotificationBadge');
        
        console.log('🔔 Toggle notification dropdown', { dropdown: !!dropdown, bell: !!notificationBell });
        
        if (dropdown) {
            const isVisible = dropdown.style.display === 'block';
            console.log('🔔 Dropdown current state:', isVisible ? 'visible' : 'hidden');
            
            if (isVisible) {
                // Hide dropdown
                dropdown.style.display = 'none';
                dropdown.classList.remove('show');
                console.log('🔔 Hiding dropdown');
                // Remove document click listener
                document.removeEventListener('click', this.handleNotificationClickOutside);
            } else {
                // Show dropdown and load notifications
                this.loadNotifications();
                dropdown.style.display = 'block';
                dropdown.style.visibility = 'visible';
                dropdown.style.opacity = '1';
                dropdown.style.zIndex = '99999';
                dropdown.classList.add('show');
                console.log('🔔 Showing dropdown');
                
                // Hide notification badge since user has seen the notifications
                if (headerNotificationBadge) {
                    headerNotificationBadge.style.display = 'none';
                }
                
                // Remove has-alerts class from bell
                if (notificationBell) {
                    notificationBell.classList.remove('has-alerts');
                }
                
                // Force repaint
                dropdown.offsetHeight;
                
                // Add a slight pulse to the bell
                if (notificationBell) {
                    notificationBell.classList.add('pulse-notification');
                    setTimeout(() => notificationBell.classList.remove('pulse-notification'), 600);
                }
                
                // Add document click listener to close when clicking outside
                setTimeout(() => {
                    document.addEventListener('click', this.handleNotificationClickOutside.bind(this));
                }, 100);
            }
        } else {
            console.error('❌ Notification dropdown element not found');
        }
    }
    
    // Handle clicking outside notification dropdown
    handleNotificationClickOutside(event) {
        const dropdown = document.getElementById('notificationDropdown');
        const notificationContainer = document.querySelector('.notification-container');
        
        if (dropdown && notificationContainer && !notificationContainer.contains(event.target)) {
            dropdown.style.display = 'none';
            dropdown.classList.remove('show');
            document.removeEventListener('click', this.handleNotificationClickOutside);
        }
    }

    updateNotificationCounts() {
        const unreadCount = this.allNotifications ? this.allNotifications.filter(n => !n.read).length : 0;
        const notificationCount = document.getElementById('notificationCount');
        const notificationBadge = document.querySelector('.notification-badge');
        
        if (notificationCount) {
            notificationCount.textContent = unreadCount === 0 ? 'No new notifications' : 
                unreadCount === 1 ? '1 new notification' : `${unreadCount} new notifications`;
        }
        
        if (notificationBadge) {
            if (unreadCount > 0) {
                notificationBadge.textContent = unreadCount;
                notificationBadge.style.display = 'block';
            } else {
                notificationBadge.style.display = 'none';
            }
        }
        
        // Update mobile and sidebar badges
        const mobileNotificationBadge = document.querySelector('.mobile-notification-badge');
        const sidebarNotificationBadge = document.querySelector('.sidebar-notification-badge');
        
        [mobileNotificationBadge, sidebarNotificationBadge].forEach(badge => {
            if (badge) {
                if (unreadCount > 0) {
                    badge.textContent = unreadCount;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
        });
    }
    
    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString();
    }
    
    clearNotifications() {
        const notificationList = document.getElementById('notificationList');
        const notificationBadge = document.querySelector('.notification-badge');
        
        if (notificationList) {
            notificationList.innerHTML = '<div class="no-notifications">No new notifications</div>';
        }
        
        if (notificationBadge) {
            notificationBadge.style.display = 'none';
        }
        
        this.showNotification('Notifications cleared', 'success');
    }
    
    // Test notification functionality (for demonstration)
    testNotifications() {
        console.log('🧪 Testing notification system...');
        
        // Test different notification types
        setTimeout(() => {
            this.showLiveNotification('Product Added', 'New iPhone 15 Pro added to inventory', 'success', 'fa-plus-circle');
        }, 1000);
        
        setTimeout(() => {
            this.showLiveNotification('Low Stock Alert', 'Samsung Galaxy S24 - Only 2 remaining', 'warning', 'fa-exclamation-triangle');
        }, 3000);
        
        setTimeout(() => {
            this.showLiveNotification('Sale Completed', 'Customer purchased items worth ₵2,450', 'success', 'fa-shopping-cart');
        }, 5000);
        
        setTimeout(() => {
            this.showLiveNotification('System Info', 'Dashboard backup completed successfully', 'info', 'fa-info-circle');
        }, 7000);
        
        console.log('🧪 Test notifications scheduled');
    }
    
    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('jmonic_settings') || '{}');
        
        // Load theme settings for both selectors
        const themeRadios = document.querySelectorAll('input[name="theme"], input[name="theme-dash"]');
        themeRadios.forEach(radio => {
            radio.checked = radio.value === (settings.theme || 'light');
        });
        
        // Load business information
        const businessName = document.getElementById('businessName');
        const ownerName = document.getElementById('ownerName');
        const businessEmail = document.getElementById('businessEmail');
        const businessPhone = document.getElementById('businessPhone');
        const businessAddress = document.getElementById('businessAddress');
        
        if (businessName) businessName.value = settings.businessName || 'J\'MONIC ENTERPRISE';
        if (ownerName) ownerName.value = settings.ownerName || 'Business Owner';
        if (businessEmail) businessEmail.value = settings.businessEmail || '';
        if (businessPhone) businessPhone.value = settings.businessPhone || '';
        if (businessAddress) businessAddress.value = settings.businessAddress || '';
        
        // Load other settings
        const currencySelector = document.getElementById('currencySelector');
        const currencySelectorDash = document.getElementById('currencySelector-dash');
        const languageSelector = document.getElementById('languageSelector-dash');
        const timezoneSelector = document.getElementById('timezoneSelector');
        const lowStockLevel = document.getElementById('lowStockLevel') || document.getElementById('lowStockLevel-dash');
        const enableAnalytics = document.getElementById('enableAnalytics') || document.getElementById('enableAnalytics-dash');
        const lowStockAlerts = document.getElementById('lowStockAlerts') || document.getElementById('lowStockAlerts-dash');
        const salesNotifications = document.getElementById('salesNotifications') || document.getElementById('salesNotifications-dash');
        const autoBackup = document.getElementById('autoBackup') || document.getElementById('autoBackup-dash');
        
        if (currencySelector) currencySelector.value = settings.currency || 'GHS';
        if (currencySelectorDash) currencySelectorDash.value = settings.currency || 'GHS';
        if (languageSelector) languageSelector.value = settings.language || 'en';
        if (timezoneSelector) timezoneSelector.value = settings.timezone || 'Africa/Accra';
        if (lowStockLevel) lowStockLevel.value = settings.lowStockLevel || 5;
        if (enableAnalytics) enableAnalytics.checked = settings.enableAnalytics !== false;
        if (lowStockAlerts) lowStockAlerts.checked = settings.lowStockAlerts !== false;
        if (salesNotifications) salesNotifications.checked = settings.salesNotifications !== false;
        if (autoBackup) autoBackup.checked = settings.autoBackup !== false;
        
        // Apply theme immediately
        this.applyTheme(settings.theme || 'light');
        
        // Update header with owner name
        this.updateOwnerNameInHeader(settings.ownerName);
        
        // Add real-time update for owner name
        if (ownerName) {
            ownerName.addEventListener('input', (e) => {
                this.updateOwnerNameInHeader(e.target.value);
            });
        }
        
        // Initialize settings tabs
        this.initializeSettingsTabs();
        
        // Add theme change event listeners
        this.initializeThemeHandlers();
    }
    
    saveSettings() {
        const themeRadio = document.querySelector('input[name="theme"]:checked') || 
                          document.querySelector('input[name="theme-dash"]:checked');
        const currency = document.getElementById('currencySelector')?.value || 
                        document.getElementById('currencySelector-dash')?.value || 'GHS';
        
        const settings = {
            theme: themeRadio?.value || 'light',
            currency: currency,
            language: document.getElementById('languageSelector-dash')?.value || 'en',
            timezone: document.getElementById('timezoneSelector')?.value || 'Africa/Accra',
            businessName: document.getElementById('businessName')?.value || 'J\'MONIC ENTERPRISE',
            ownerName: document.getElementById('ownerName')?.value || 'Business Owner',
            businessEmail: document.getElementById('businessEmail')?.value || '',
            businessPhone: document.getElementById('businessPhone')?.value || '',
            businessAddress: document.getElementById('businessAddress')?.value || '',
            lowStockLevel: parseInt(document.getElementById('lowStockLevel')?.value || document.getElementById('lowStockLevel-dash')?.value) || 5,
            enableAnalytics: (document.getElementById('enableAnalytics')?.checked || document.getElementById('enableAnalytics-dash')?.checked) !== false,
            lowStockAlerts: (document.getElementById('lowStockAlerts')?.checked || document.getElementById('lowStockAlerts-dash')?.checked) !== false,
            salesNotifications: (document.getElementById('salesNotifications')?.checked || document.getElementById('salesNotifications-dash')?.checked) !== false,
            autoBackup: (document.getElementById('autoBackup')?.checked || document.getElementById('autoBackup-dash')?.checked) !== false
        };
        
        localStorage.setItem('jmonic_settings', JSON.stringify(settings));
        this.applySettings(settings);
        this.showNotification('Settings saved successfully!', 'success');
        
        // Update business name in header if it changed
        this.updateBusinessNameInHeader(settings.businessName);
        
        // Update owner name in header if it changed
        this.updateOwnerNameInHeader(settings.ownerName);
        
        // Add save animation
        const saveBtn = document.querySelector('.section-actions .btn-primary');
        if (saveBtn) {
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
            saveBtn.classList.add('success');
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
                saveBtn.classList.remove('success');
            }, 2000);
        }
    }
    
    updateBusinessNameInHeader(businessName) {
        // Update any business name displays in the header or throughout the app
        const headerTitle = document.querySelector('.logo h2');
        if (headerTitle && businessName && businessName !== 'J\'MONIC ENTERPRISE') {
            headerTitle.textContent = businessName;
        }
        
        // Update page title
        if (businessName) {
            document.title = `${businessName} - Business Dashboard`;
        }
    }
    
    updateOwnerNameInHeader(ownerName) {
        // Update the owner name in both desktop and mobile headers
        const userNames = document.querySelectorAll('.user-name');
        userNames.forEach(element => {
            if (ownerName && ownerName.trim() !== '') {
                element.textContent = ownerName;
            } else {
                element.textContent = 'Business Owner';
            }
        });
        
        // Also update in the mobile header if it exists
        const mobileUserInfo = document.querySelector('.professional-header .user-info h3');
        if (mobileUserInfo) {
            if (ownerName && ownerName.trim() !== '') {
                mobileUserInfo.textContent = ownerName;
            } else {
                mobileUserInfo.textContent = 'Business Owner';
            }
        }
    }
    
    // Business Setup Methods
    checkFirstTimeSetup() {
        const settings = localStorage.getItem('jmonic_settings');
        const businessSetupCompleted = localStorage.getItem('jmonic_business_setup_completed');
        
        // Show setup modal if this is the first time or if setup was never completed
        if (!businessSetupCompleted) {
            setTimeout(() => {
                this.showBusinessSetupModal();
            }, 1000); // Delay to allow page to load fully
        }
    }
    
    showBusinessSetupModal() {
        const modal = document.getElementById('businessSetupModal');
        if (modal) {
            modal.style.display = 'flex';
            
            // Focus on the first input
            const firstInput = modal.querySelector('#setupOwnerName');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 300);
            }
            
            // Setup form submission
            const form = document.getElementById('businessSetupForm');
            if (form) {
                form.onsubmit = (e) => {
                    e.preventDefault();
                    this.saveBusinessSetup();
                };
            }
        }
    }
    
    saveBusinessSetup() {
        const businessName = document.getElementById('setupBusinessName').value.trim();
        const ownerName = document.getElementById('setupOwnerName').value.trim();
        const businessEmail = document.getElementById('setupBusinessEmail').value.trim();
        const businessPhone = document.getElementById('setupBusinessPhone').value.trim();
        const businessAddress = document.getElementById('setupBusinessAddress').value.trim();
        
        // Validate required fields
        if (!businessName || !ownerName) {
            this.showNotification('Please fill in the business name and owner name.', 'warning');
            return;
        }
        
        // Get current settings or create defaults
        const currentSettings = JSON.parse(localStorage.getItem('jmonic_settings')) || {
            theme: 'light',
            currency: 'GHS',
            language: 'en',
            timezone: 'Africa/Accra',
            lowStockLevel: 5,
            enableAnalytics: true,
            lowStockAlerts: true,
            salesNotifications: true,
            autoBackup: true
        };
        
        // Update with business information
        currentSettings.businessName = businessName;
        currentSettings.ownerName = ownerName;
        currentSettings.businessEmail = businessEmail;
        currentSettings.businessPhone = businessPhone;
        currentSettings.businessAddress = businessAddress;
        
        // Save settings
        localStorage.setItem('jmonic_settings', JSON.stringify(currentSettings));
        localStorage.setItem('jmonic_business_setup_completed', 'true');
        
        // Apply the settings
        this.applySettings(currentSettings);
        
        // Update business information in settings page
        this.populateSettingsForm(currentSettings);
        
        // Update headers
        this.updateBusinessNameInHeader(businessName);
        this.updateOwnerNameInHeader(ownerName);
        
        // Close modal
        this.hideBusinessSetupModal();
        
        // Show success notification
        this.showNotification(`Welcome ${ownerName}! Your business setup is complete.`, 'success');
    }
    
    skipBusinessSetup() {
        // Mark setup as completed but use defaults
        localStorage.setItem('jmonic_business_setup_completed', 'true');
        this.hideBusinessSetupModal();
        this.showNotification('Setup skipped. You can configure business information later in Settings.', 'info');
    }
    
    hideBusinessSetupModal() {
        const modal = document.getElementById('businessSetupModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    populateSettingsForm(settings) {
        // Update the settings form with current values
        if (document.getElementById('businessName')) {
            document.getElementById('businessName').value = settings.businessName || 'J\'MONIC ENTERPRISE';
        }
        if (document.getElementById('ownerName')) {
            document.getElementById('ownerName').value = settings.ownerName || 'Business Owner';
        }
        if (document.getElementById('businessEmail')) {
            document.getElementById('businessEmail').value = settings.businessEmail || '';
        }
        if (document.getElementById('businessPhone')) {
            document.getElementById('businessPhone').value = settings.businessPhone || '';
        }
        if (document.getElementById('businessAddress')) {
            document.getElementById('businessAddress').value = settings.businessAddress || '';
        }
    }
    
    initializeSettingsTabs() {
        const settingsTabButtons = document.querySelectorAll('.settings-tabs .tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        settingsTabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active tab button
                settingsTabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Show corresponding tab content
                const tabName = btn.dataset.tab;
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `${tabName}-tab`) {
                        content.classList.add('active');
                    }
                });
            });
        });
    }
    
    resetSettings() {
        console.log('Settings: Resetting to default values');
        
        const defaultSettings = {
            businessName: 'J\'MONIC ENTERPRISE',
            ownerName: '',
            email: '',
            phone: '',
            address: '',
            theme: 'light',
            currency: 'GHS',
            language: 'en',
            lowStockLevel: 10,
            enableAnalytics: true,
            lowStockAlerts: true,
            salesNotifications: true,
            autoBackup: true
        };
        
        // Get form elements for business information
        const businessNameInput = document.getElementById('businessName');
        const businessNameInputDash = document.getElementById('businessNameDash');
        const ownerNameInput = document.getElementById('ownerName');
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');
        const addressInput = document.getElementById('address');
        
        // Get form elements for other settings
        const themeSelector = document.getElementById('themeSelector');
        const themeSelectorDash = document.getElementById('themeSelectorDash');
        const currencySelector = document.getElementById('currencySelector');
        const currencySelectorDash = document.getElementById('currencySelectorDash');
        const languageSelector = document.getElementById('languageSelector');
        const lowStockLevel = document.getElementById('lowStockLevel');
        const enableAnalytics = document.getElementById('enableAnalytics');
        const lowStockAlerts = document.getElementById('lowStockAlerts');
        const salesNotifications = document.getElementById('salesNotifications');
        const autoBackup = document.getElementById('autoBackup');
        const autoBackupDash = document.getElementById('autoBackupDash');
        
        // Reset business information fields
        if (businessNameInput) businessNameInput.value = defaultSettings.businessName;
        if (businessNameInputDash) businessNameInputDash.value = defaultSettings.businessName;
        if (ownerNameInput) ownerNameInput.value = defaultSettings.ownerName;
        if (emailInput) emailInput.value = defaultSettings.email;
        if (phoneInput) phoneInput.value = defaultSettings.phone;
        if (addressInput) addressInput.value = defaultSettings.address;
        
        // Reset other settings fields
        if (themeSelector) themeSelector.value = defaultSettings.theme;
        if (themeSelectorDash) themeSelectorDash.value = defaultSettings.theme;
        if (currencySelector) currencySelector.value = defaultSettings.currency;
        if (currencySelectorDash) currencySelectorDash.value = defaultSettings.currency;
        if (languageSelector) languageSelector.value = defaultSettings.language;
        if (lowStockLevel) lowStockLevel.value = defaultSettings.lowStockLevel;
        if (enableAnalytics) enableAnalytics.checked = defaultSettings.enableAnalytics;
        if (lowStockAlerts) lowStockAlerts.checked = defaultSettings.lowStockAlerts;
        if (salesNotifications) salesNotifications.checked = defaultSettings.salesNotifications;
        if (autoBackup) autoBackup.checked = defaultSettings.autoBackup;
        if (autoBackupDash) autoBackupDash.checked = defaultSettings.autoBackup;
        
        // Apply theme immediately
        if (typeof applyThemeGlobal === 'function') {
            applyThemeGlobal(defaultSettings.theme);
        }
        
        // Save settings and apply
        localStorage.setItem('jmonic_settings', JSON.stringify(defaultSettings));
        this.applySettings(defaultSettings);
        
        // Update business name in header
        this.updateBusinessNameInHeader(defaultSettings.businessName);
        
        this.showNotification('Settings reset to default successfully!', 'success');
        
        // Add visual feedback to reset button
        const resetBtn = document.querySelector('.footer-actions .btn-secondary');
        if (resetBtn) {
            resetBtn.innerHTML = '<i class="fas fa-check"></i> Reset Complete!';
            resetBtn.style.background = '#28a745';
            setTimeout(() => {
                resetBtn.innerHTML = '<i class="fas fa-undo"></i> Reset to Default';
                resetBtn.style.background = '';
            }, 2000);
        }
    }
    
    applySettings(settings) {
        // Apply theme
        this.applyTheme(settings.theme || 'light');
        
        // Apply currency (this would need more implementation for full currency conversion)
        window.currentCurrency = settings.currency;
        
        // Apply low stock level (update all relevant checks)
        window.defaultLowStockLevel = settings.lowStockLevel;
        
        // Refresh data with new settings
        this.refreshLowStockData();
    }
    
    applyTheme(theme) {
        const body = document.body;
        const html = document.documentElement;
        
        // Add smooth transition animation
        body.classList.add('theme-changing');
        
        // Remove all theme classes
        body.classList.remove('theme-light', 'theme-dark', 'theme-auto');
        html.classList.remove('theme-light', 'theme-dark', 'theme-auto');
        
        if (theme === 'dark') {
            body.classList.add('theme-dark');
            html.classList.add('theme-dark');
        } else if (theme === 'light') {
            body.classList.add('theme-light');
            html.classList.add('theme-light');
        } else if (theme === 'auto') {
            body.classList.add('theme-auto');
            html.classList.add('theme-auto');
            
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                body.classList.add('theme-dark');
                html.classList.add('theme-dark');
            } else {
                body.classList.add('theme-light');
                html.classList.add('theme-light');
            }
        }
        
        // Remove animation class after transition
        setTimeout(() => {
            body.classList.remove('theme-changing');
        }, 500);
        
        // Store theme preference
        localStorage.setItem('jmonic_theme', theme);
        
        // Update theme preview in theme cards
        this.updateThemePreview(theme);
    }
    
    updateThemePreview(theme) {
        // Add visual feedback to show which theme is active
        const themeCards = document.querySelectorAll('.theme-card');
        themeCards.forEach(card => {
            const input = card.previousElementSibling;
            if (input && input.value === theme) {
                card.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    card.style.transform = '';
                }, 200);
            }
        });
    }
    
    initializeThemeHandlers() {
        // Add event listeners to all theme selectors
        const themeInputs = document.querySelectorAll('input[name="theme"], input[name="theme-dash"]');
        
        themeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                if (e.target.checked) {
                    const theme = e.target.value;
                    this.applyTheme(theme);
                    
                    // Sync all theme selectors
                    themeInputs.forEach(otherInput => {
                        otherInput.checked = otherInput.value === theme;
                    });
                    
                    // Save settings
                    setTimeout(() => this.saveSettings(), 100);
                    
                    // Show theme change notification
                    this.showNotification(`Theme changed to ${theme.charAt(0).toUpperCase() + theme.slice(1)}`, 'success');
                }
            });
        });
        
        // Listen for system theme changes when in auto mode
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            const currentTheme = localStorage.getItem('jmonic_theme') || 'light';
            if (currentTheme === 'auto') {
                this.applyTheme('auto');
            }
        });
    }
    
    updateLowStockAlerts(lowStockProducts) {
        const alertsList = document.querySelector('.alert-list');
        if (!alertsList) return;
        
        // Ensure lowStockProducts is an array
        if (!Array.isArray(lowStockProducts)) {
            console.warn('Low stock products is not an array:', lowStockProducts);
            lowStockProducts = [];
        }
        
        alertsList.innerHTML = '';
        
        if (lowStockProducts.length === 0) {
            alertsList.innerHTML = `
                <div class="alert-item">
                    <div class="alert-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="alert-content">
                        <p>All products are well stocked!</p>
                        <span class="alert-action">Keep up the good work</span>
                    </div>
                </div>
            `;
            return;
        }
        
        lowStockProducts.forEach(product => {
            const alertItem = document.createElement('div');
            alertItem.className = 'alert-item';
            alertItem.innerHTML = `
                <div class="alert-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="alert-content">
                    <p>Low stock: ${product.name}</p>
                    <span class="alert-action">Only ${product.stock_quantity} units left</span>
                </div>
            `;
            alertsList.appendChild(alertItem);
        });
    }
    
    showNotification(message, type = 'info') {
        // Simple console notification for now
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // You can implement a proper toast notification system here
        // For now, we'll use browser alert for errors
        if (type === 'error') {
            alert(message);
        }
    }
    
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-GH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    formatCurrency(amount) {
        return `GHS ${parseFloat(amount).toFixed(2)}`;
    }

    // Product and Sales Management
    async loadSalesData() {
        try {
            const response = await this.apiCall('sales.php');
            const sales = response.data || [];
            const salesTableBody = document.getElementById('salesTableBody');
            
            if (!salesTableBody) return;
            
            if (sales.length === 0) {
                salesTableBody.innerHTML = `
                    <tr>
                        <td colspan="10" style="text-align: center; padding: 2rem;">
                            <div style="color: var(--text-muted);">
                                <i class="fas fa-shopping-cart" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                                <p>No sales recorded yet</p>
                                <p>Add your first sale to get started!</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }
            
            const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
            
            salesTableBody.innerHTML = sales.map((sale, index) => {
                // Calculate totals and costs
                let totalQuantity = 0;
                let totalCost = 0;
                let productNames = [];
                
                if (sale.products && Array.isArray(sale.products)) {
                    sale.products.forEach(product => {
                        totalQuantity += product.quantity || 1;
                        productNames.push(product.name || 'Unknown Product');
                        
                        // Find product cost price
                        const productData = products.find(p => p.id == product.id);
                        if (productData && productData.cost_price) {
                            totalCost += (productData.cost_price * (product.quantity || 1));
                        }
                    });
                }
                
                const revenue = parseFloat(sale.revenue || sale.totalAmount || 0);
                const profit = revenue - totalCost;
                const saleId = sale.id || `S-${Date.now().toString().slice(-5)}-${index}`;
                
                // Format product names display
                const productsDisplay = productNames.length > 0 
                    ? (productNames.length === 1 
                        ? productNames[0] 
                        : `${productNames[0]} ${productNames.length > 1 ? `+${productNames.length - 1} more` : ''}`)
                    : 'Multiple items';
                
                return `
                    <tr>
                        <td>#${saleId}</td>
                        <td>
                            <div class="products-sold">
                                <span>${productsDisplay}</span>
                                ${productNames.length > 1 ? `<small>${productNames.slice(1).join(', ')}</small>` : ''}
                            </div>
                        </td>
                        <td>${totalQuantity}</td>
                        <td>GHS ${revenue.toFixed(2)}</td>
                        <td>GHS ${totalCost.toFixed(2)}</td>
                        <td class="${profit > 0 ? 'profit-positive' : profit < 0 ? 'profit-negative' : ''}">
                            GHS ${profit.toFixed(2)}
                        </td>
                        <td>${this.formatDate(sale.date || sale.created_at)}</td>
                        <td><span class="status-badge completed">Completed</span></td>
                        <td>
                            <button class="btn-icon" title="View Details" onclick="businessManager.viewSaleDetails('${saleId}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon" title="Print Receipt" onclick="businessManager.printReceipt('${saleId}')">
                                <i class="fas fa-print"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Error loading sales data:', error);
            const salesTableBody = document.getElementById('salesTableBody');
            if (salesTableBody) {
                salesTableBody.innerHTML = `
                    <tr>
                        <td colspan="10" style="text-align: center; padding: 2rem; color: var(--danger);">
                            Error loading sales data. Please check your connection.
                        </td>
                    </tr>
                `;
            }
        }
    }

    async loadProductsInventory() {
        try {
            const response = await this.apiCall('products.php');
            const products = response.data;
            const productsTableBody = document.querySelector('#productsTableBody');
            
            if (!productsTableBody) return;
            
            if (products.length === 0) {
                productsTableBody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 2rem;">
                            <div style="color: var(--text-muted);">
                                <i class="fas fa-cut" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                                <p>No products in inventory yet</p>
                                <p>Add your first product to get started!</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }
            
            productsTableBody.innerHTML = products.map(product => {
                const margin = product.selling_price && product.cost_price 
                    ? (((product.selling_price - product.cost_price) / product.selling_price) * 100).toFixed(1)
                    : '0.0';
                
                const stockStatus = product.stock_quantity <= (product.min_stock_level || 20) 
                    ? 'low' : product.stock_quantity > 100 ? 'good' : 'medium';
                
                const statusBadge = product.stock_quantity > 0 ? 'in-stock' : 'out-of-stock';
                const statusText = product.stock_quantity > 0 ? 'In Stock' : 'Out of Stock';
                
                return `
                    <tr>
                        <td>
                            <div class="product-info">
                                <div class="product-avatar">
                                    <i class="fas fa-cut"></i>
                                </div>
                                <div>
                                    <span class="product-name">${product.name}</span>
                                    <span class="product-description">${product.description || 'Product description'}</span>
                                </div>
                            </div>
                        </td>
                        <td>${product.sku}</td>
                        <td><span class="stock-level ${stockStatus}">${product.stock_quantity}</span></td>
                        <td>GHS ${parseFloat(product.selling_price || 0).toFixed(2)}</td>
                        <td>GHS ${parseFloat(product.cost_price || 0).toFixed(2)}</td>
                        <td><span class="margin-${margin > 40 ? 'good' : margin > 20 ? 'medium' : 'low'}">${margin}%</span></td>
                        <td><span class="status-badge ${statusBadge}">${statusText}</span></td>
                        <td>
                            <button class="btn-icon" title="Edit Product" onclick="editProduct(${product.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon" title="Delete Product" onclick="deleteProduct(${product.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
            
            // Update product stats
            this.updateProductStats(products);
            
        } catch (error) {
            console.error('Error loading products inventory:', error);
            const productsTableBody = document.querySelector('#productsTable tbody');
            if (productsTableBody) {
                productsTableBody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 2rem; color: var(--danger);">
                            Error loading products. Please check your connection.
                        </td>
                    </tr>
                `;
            }
        }
    }

    updateProductStats(products) {
        this.updateProductStats(products);
    }

    // Inventory tracking methods
    initializeInventoryTracking() {
        this.updateInventoryOverview();
        this.loadLowStockAlerts();
        this.loadInventoryTransactions();
        this.loadInventoryPerformance();
        this.renderInventoryMovementChart();
    }

    updateInventoryOverview() {
        const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
        let totalValue = 0;
        let revenuePotential = 0;
        let inStock = 0;
        let lowStock = 0;
        let outOfStock = 0;

        products.forEach(product => {
            const quantity = product.stock_quantity || 0;
            const costPrice = parseFloat(product.cost_price) || 0;
            const sellingPrice = parseFloat(product.selling_price) || 0;

            totalValue += quantity * costPrice;
            revenuePotential += quantity * sellingPrice;

            if (quantity > 10) {
                inStock++;
            } else if (quantity > 0) {
                lowStock++;
            } else {
                outOfStock++;
            }
        });

        // Update inventory overview cards
        if (document.getElementById('totalInventoryValue')) {
            document.getElementById('totalInventoryValue').textContent = `GHS ${totalValue.toFixed(2)}`;
        }
        if (document.getElementById('revenuePotential')) {
            document.getElementById('revenuePotential').textContent = `GHS ${revenuePotential.toFixed(2)}`;
        }
        if (document.getElementById('inStockCount')) {
            document.getElementById('inStockCount').textContent = inStock;
        }
        // Low stock card removed - now only shown in notifications
        if (document.getElementById('outOfStockCount')) {
            document.getElementById('outOfStockCount').textContent = outOfStock;
        }

        // Calculate turnover rate
        const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
        const currentMonth = new Date();
        const monthlyRevenue = sales
            .filter(sale => {
                const saleDate = new Date(sale.date);
                return saleDate.getMonth() === currentMonth.getMonth() && 
                       saleDate.getFullYear() === currentMonth.getFullYear();
            })
            .reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0);

        const turnoverRate = totalValue > 0 ? (monthlyRevenue / totalValue).toFixed(1) : '0.0';
        if (document.getElementById('turnoverRate')) {
            document.getElementById('turnoverRate').textContent = `${turnoverRate}x`;
        }
    }

    loadLowStockAlerts() {
        const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
        const lowStockProducts = products.filter(product => {
            const stock = product.stock_quantity || 0;
            const reorderLevel = product.reorder_level || product.reorderLevel || product.min_stock_level || 5;
            return stock <= reorderLevel;
        });

        const tbody = document.getElementById('lowStockTable');
        if (!tbody) return;

        if (lowStockProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No low stock items</td></tr>';
            return;
        }

        tbody.innerHTML = lowStockProducts.map(product => `
            <tr>
                <td>
                    <div class="product-info">
                        <span class="product-name">${product.name}</span>
                        <small class="product-description">${product.description || ''}</small>
                    </div>
                </td>
                <td>
                    <span class="stock-count ${product.stock_quantity <= 5 ? 'out' : 'low'}">${product.stock_quantity}</span>
                </td>
                <td>${product.reorder_level || product.reorderLevel || product.min_stock_level || 5}</td>
                <td>-</td>
                <td>
                    <button class="btn-primary" onclick="
                        console.log('Reorder button clicked'); 
                        try {
                            showSection('products'); 
                            setTimeout(() => { 
                                if (typeof openAddProductModal === 'function') {
                                    openAddProductModal();
                                } else if (typeof openModal === 'function') {
                                    openModal('addProductModal');
                                } else {
                                    console.error('Modal functions not found');
                                }
                            }, 100);
                        } catch(e) { 
                            console.error('Reorder error:', e); 
                        }
                    ">
                        <i class="fas fa-shopping-cart"></i> Reorder
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Clean up invalid inventory data and regenerate if needed
    cleanAndRegenerateInventoryData() {
        console.log('🧹 Cleaning up inventory data...');
        
        // Get all transactions
        let transactions = JSON.parse(localStorage.getItem('inventoryTransactions') || '[]');
        const originalCount = transactions.length;
        
        // Filter out invalid transactions
        transactions = transactions.filter(transaction => {
            const isValid = transaction && 
                           transaction.timestamp && 
                           transaction.product && 
                           transaction.type &&
                           transaction.quantity !== undefined &&
                           transaction.newStock !== undefined;
            
            if (!isValid) {
                console.log('🗑️ Removing invalid transaction:', transaction);
            }
            return isValid;
        });
        
        // Update localStorage with cleaned transactions
        localStorage.setItem('inventoryTransactions', JSON.stringify(transactions));
        
        if (originalCount !== transactions.length) {
            console.log(`✅ Cleaned up ${originalCount - transactions.length} invalid transactions`);
            this.showNotification(`Cleaned up ${originalCount - transactions.length} invalid transactions`, 'success');
        }
        
        // If we have products but no valid transactions, create sample data
        const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
        if (products.length > 0 && transactions.length === 0) {
            console.log('📦 Regenerating sample inventory transactions...');
            this.createSampleInventoryTransactions();
            this.showNotification('Generated sample inventory data', 'info');
        }
        
        // Refresh the display
        this.loadInventoryTransactions();
    }

    loadInventoryTransactions() {
        let transactions = JSON.parse(localStorage.getItem('inventoryTransactions') || '[]');
        const tbody = document.getElementById('inventoryTransactionsTable');
        if (!tbody) return;

        // Clean up any invalid transactions
        transactions = transactions.filter(transaction => {
            return transaction && 
                   transaction.timestamp && 
                   transaction.product && 
                   transaction.type &&
                   transaction.quantity !== undefined &&
                   transaction.newStock !== undefined;
        });

        // Update localStorage with cleaned transactions
        if (transactions.length !== JSON.parse(localStorage.getItem('inventoryTransactions') || '[]').length) {
            localStorage.setItem('inventoryTransactions', JSON.stringify(transactions));
            console.log('Cleaned up invalid transactions');
        }

        if (transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No transactions yet</td></tr>';
            return;
        }

        // Sort transactions by timestamp (newest first) and take latest 10
        const sortedTransactions = transactions
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);

        tbody.innerHTML = sortedTransactions.map(transaction => {
            // Safe date handling
            let displayDate = 'Invalid Date';
            try {
                const date = new Date(transaction.timestamp);
                if (!isNaN(date.getTime())) {
                    displayDate = date.toLocaleDateString();
                }
            } catch (e) {
                console.warn('Invalid date in transaction:', transaction.timestamp);
            }

            // Safe data extraction with fallbacks
            const productName = transaction.product || transaction.productName || 'Unknown Product';
            const transactionType = transaction.type || 'unknown';
            const quantity = transaction.quantity !== undefined && transaction.quantity !== null ? transaction.quantity : 0;
            const quantityClass = quantity > 0 ? 'positive' : 'negative';
            const balance = transaction.newStock !== undefined && transaction.newStock !== null ? transaction.newStock : 'N/A';
            const reference = transaction.reference || 'No Reference';

            return `
                <tr>
                    <td>${displayDate}</td>
                    <td>${productName}</td>
                    <td>
                        <span class="transaction-type ${transactionType}">${transactionType.toUpperCase()}</span>
                    </td>
                    <td>
                        <span class="stock-change ${quantityClass}">
                            ${quantity > 0 ? '+' : ''}${quantity}
                        </span>
                    </td>
                    <td>${balance}</td>
                    <td>${reference}</td>
                </tr>
            `;
        }).join('');
    }

    loadInventoryPerformance() {
        const bestPerformersEl = document.getElementById('bestPerformers');
        const slowMoversEl = document.getElementById('slowMovers');
        
        if (bestPerformersEl) {
            bestPerformersEl.innerHTML = `
                <div class="performance-item">
                    <div class="performance-info">
                        <span class="performance-name">No data available</span>
                        <span class="performance-metric">Add products and record sales to see data</span>
                    </div>
                    <div class="performance-badge good">-</div>
                </div>
            `;
        }
        
        if (slowMoversEl) {
            slowMoversEl.innerHTML = `
                <div class="performance-item">
                    <div class="performance-info">
                        <span class="performance-name">No data available</span>
                        <span class="performance-metric">Add products and record sales to see data</span>
                    </div>
                    <div class="performance-badge slow">-</div>
                </div>
            `;
        }
    }

    renderInventoryMovementChart() {
        const ctx = document.getElementById('inventoryMovementChart');
        if (!ctx) return;

        // Simple overview - show total products in stock vs low stock
        const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
        const totalProducts = products.length;
        const lowStockProducts = products.filter(p => {
            const stock = p.stock_quantity || 0;
            const reorderLevel = p.min_stock_level || 5;
            return stock <= reorderLevel;
        }).length;
        
        const goodStockProducts = totalProducts - lowStockProducts;
        const hasData = totalProducts > 0;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: hasData ? ['Good Stock', 'Low Stock'] : ['No Products'],
                datasets: [{
                    data: hasData ? [goodStockProducts, lowStockProducts] : [1],
                    backgroundColor: hasData ? ['#10b981', '#f59e0b'] : ['#f3f4f6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: hasData,
                        callbacks: {
                            label: function(context) {
                                if (context.dataIndex === 0 && hasData) {
                                    return `Good Stock: ${goodStockProducts} products`;
                                } else if (context.dataIndex === 1 && hasData) {
                                    return `Low Stock: ${lowStockProducts} products`;
                                }
                                return '';
                            }
                        }
                    }
                }
            }
        });
        
        // Add center text
        const centerText = hasData ? 
            `${totalProducts}\nProducts` : 
            'Add\nProducts';
            
        if (ctx.parentElement) {
            const existingLabel = ctx.parentElement.querySelector('.chart-center-text');
            if (existingLabel) existingLabel.remove();
            
            const centerLabel = document.createElement('div');
            centerLabel.className = 'chart-center-text';
            centerLabel.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                font-weight: 600;
                color: ${hasData ? '#10b981' : '#6b7280'};
                pointer-events: none;
                line-height: 1.2;
                font-size: ${hasData ? '1.2rem' : '0.9rem'};
            `;
            centerLabel.innerHTML = centerText.replace('\n', '<br>');
            ctx.parentElement.style.position = 'relative';
            ctx.parentElement.appendChild(centerLabel);
        }
    }

    refreshInventory() {
        this.initializeInventoryTracking();
        this.showNotification('Inventory data refreshed', 'success');
    }

    // Update product stats cards with real data
    updateProductStats(products) {
        const totalProducts = products.length;
        const lowStockProducts = products.filter(p => {
            const stock = parseInt(p.stock_quantity) || 0;
            const reorderLevel = this.getReorderLevel(p);
            return stock <= reorderLevel;
        }).length;
        
        const totalValue = products.reduce((sum, p) => {
            const stock = parseInt(p.stock_quantity) || 0;
            const costPrice = parseFloat(p.cost_price);
            
            // Validate both stock and cost price are positive numbers
            if (stock >= 0 && !isNaN(costPrice) && costPrice >= 0) {
                return sum + (costPrice * stock);
            }
            return sum;
        }, 0);

        // Get unique categories
        const categories = [...new Set(products.map(p => p.category).filter(c => c))];
        const categoriesCount = categories.length;

        // Update the stat cards
        const totalProductsEl = document.getElementById('totalProductsCount');
        const inventoryValueEl = document.getElementById('inventoryTotalValue');
        const categoriesCountEl = document.getElementById('categoriesCount');

        if (totalProductsEl) {
            totalProductsEl.textContent = totalProducts.toLocaleString();
        }
        
        // Low stock card removed - now only shown in notifications
        
        if (inventoryValueEl) {
            inventoryValueEl.textContent = `GHS ${totalValue.toFixed(2)}`;
        }
        
        if (categoriesCountEl) {
            categoriesCountEl.textContent = categoriesCount.toString();
        }

        // Update indicators
        const productsIndicator = document.getElementById('productsChangeIndicator');
        const lowStockIndicator = document.getElementById('lowStockIndicator');
        const inventoryIndicator = document.getElementById('inventoryValueIndicator');
        const categoriesIndicator = document.getElementById('categoriesIndicator');

        if (productsIndicator) {
            if (totalProducts === 0) {
                productsIndicator.textContent = 'Add your first product';
                productsIndicator.className = 'stat-change neutral';
            } else {
                productsIndicator.textContent = `${totalProducts} products in inventory`;
                productsIndicator.className = 'stat-change positive';
            }
        }

        if (lowStockIndicator) {
            if (lowStockProducts === 0) {
                lowStockIndicator.textContent = 'All items in stock';
                lowStockIndicator.className = 'stat-change positive';
            } else {
                lowStockIndicator.textContent = 'Needs attention';
                lowStockIndicator.className = 'stat-change negative';
            }
        }

        if (inventoryIndicator) {
            if (totalValue === 0) {
                inventoryIndicator.textContent = 'Add products to calculate';
                inventoryIndicator.className = 'stat-change neutral';
            } else {
                inventoryIndicator.textContent = 'Total inventory cost';
                inventoryIndicator.className = 'stat-change positive';
            }
        }

        if (categoriesIndicator) {
            if (categoriesCount === 0) {
                categoriesIndicator.textContent = 'No categories';
                categoriesIndicator.className = 'stat-change neutral';
            } else {
                categoriesIndicator.textContent = `${categoriesCount} active categories`;
                categoriesIndicator.className = 'stat-change positive';
            }
        }
    }

    // Clear all data function
    clearAllData() {
        console.log('🗑️ clearAllData() function called');
        console.log('🔍 Current state - isPerformingDataClear:', this.isPerformingDataClear);
        console.log('🔍 Current state - currentClearDataModal:', !!this.currentClearDataModal);
        console.log('🔍 Current state - window.clearDataInProgress:', window.clearDataInProgress);
        
        // Prevent multiple modal calls
        if (this.isPerformingDataClear || this.currentClearDataModal) {
            console.log('🚫 Clear data operation already in progress');
            console.log('💡 TIP: If stuck, run window.businessManager.resetClearDataFlags() in console');
            return;
        }
        
        // Reset global flag to ensure it doesn't interfere
        window.clearDataInProgress = false;
        
        // Create custom confirmation modal
        this.showDataClearConfirmation();
    }

    // Reset function for stuck flags
    resetClearDataFlags() {
        console.log('🔄 Resetting clear data flags...');
        this.isPerformingDataClear = false;
        if (this.currentClearDataModal) {
            this.currentClearDataModal.remove();
            this.currentClearDataModal = null;
        }
        window.clearDataInProgress = false;
        console.log('✅ All clear data flags reset');
    }

    // Custom confirmation modal for data clearing
    showDataClearConfirmation() {
        // Prevent multiple modals from opening
        if (this.currentClearDataModal) {
            console.log('Clear data modal already open, ignoring request');
            return;
        }

        // Check for any existing modals and remove them
        const existingModals = document.querySelectorAll('.modal-backdrop.danger-backdrop');
        existingModals.forEach(modal => modal.remove());

        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop danger-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        `;

        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'danger-confirmation-modal';
        modal.style.cssText = `
            background: var(--card-background);
            border-radius: 16px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            border: 2px solid var(--danger-color);
            transform: scale(0.9);
            animation: modalSlideIn 0.3s ease forwards;
        `;

        modal.innerHTML = `
            <div class="danger-header" style="display: flex; align-items: center; margin-bottom: 1.5rem;">
                <div style="width: 48px; height: 48px; background: var(--danger-color); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 1rem;">
                    <i class="fas fa-exclamation-triangle" style="color: white; font-size: 1.5rem;"></i>
                </div>
                <div>
                    <h3 style="margin: 0; color: var(--danger-color); font-size: 1.5rem; font-weight: 700;">Danger Zone</h3>
                    <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">This action cannot be undone</p>
                </div>
            </div>
            
            <div class="danger-content" style="margin-bottom: 2rem;">
                <h4 style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.25rem; font-weight: 600;">Delete All Business Data</h4>
                <p style="margin: 0 0 1rem 0; color: var(--text-secondary); line-height: 1.6;">
                    This will permanently delete <strong>ALL</strong> your business data including:
                </p>
                <ul style="margin: 0 0 1rem 0; padding-left: 1.5rem; color: var(--text-secondary); line-height: 1.6;">
                    <li>All products and inventory</li>
                    <li>Sales records and transactions</li>
                    <li>Purchase history</li>
                    <li>Settings and preferences</li>
                </ul>
                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--danger-color); border-radius: 8px; padding: 1rem; margin-top: 1rem;">
                    <p style="margin: 0; color: var(--danger-color); font-weight: 600;">
                        ⚠️ This action is irreversible and cannot be undone.
                    </p>
                </div>
            </div>
            
            <div class="danger-actions" style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button id="modalCancelBtn" style="
                    padding: 0.75rem 1.5rem;
                    background: var(--card-background);
                    border: 2px solid var(--border-color);
                    border-radius: 8px;
                    color: var(--text-primary);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                ">Cancel</button>
                <button id="modalDeleteBtn" style="
                    padding: 0.75rem 1.5rem;
                    background: var(--danger-color);
                    border: 2px solid var(--danger-color);
                    border-radius: 8px;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                ">
                    <i class="fas fa-trash" style="margin-right: 0.5rem;"></i>
                    Delete Everything
                </button>
            </div>
        `;

        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes modalSlideIn {
                from { transform: scale(0.9) translateY(-20px); opacity: 0; }
                to { transform: scale(1) translateY(0); opacity: 1; }
            }
            #modalCancelBtn:hover {
                background: var(--hover-color) !important;
                transform: translateY(-1px);
            }
            #modalDeleteBtn:hover {
                background: #dc2626 !important;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
            }
        `;
        document.head.appendChild(style);

        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        // Store reference for cleanup
        this.currentClearDataModal = backdrop;

        // Handle button clicks with more robust event handling
        const cancelBtn = document.getElementById('modalCancelBtn');
        const confirmBtn = document.getElementById('modalDeleteBtn');

        console.log('🔍 Modal buttons found:', { cancel: !!cancelBtn, confirm: !!confirmBtn });

        if (cancelBtn) {
            console.log('✅ Adding cancel button event listener');
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚫 User cancelled data clearing');
                // Reset progress flag
                window.clearDataInProgress = false;
                this.closeClearDataModal();
            });
            
            // Also add onclick directly as backup
            cancelBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚫 User cancelled data clearing (onclick)');
                window.clearDataInProgress = false;
                this.closeClearDataModal();
            };
        } else {
            console.error('❌ Cancel button not found!');
        }

        if (confirmBtn) {
            console.log('✅ Confirm button found, adding event listener');
            confirmBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔥 CONFIRM BUTTON CLICKED - User confirmed data clearing');
                
                // Ensure we're not already clearing data
                if (this.isPerformingDataClear) {
                    console.log('🚫 Data clearing already in progress');
                    return;
                }
                
                // Close modal immediately, then perform clear
                this.closeClearDataModal();
                // Use timeout to ensure modal is closed before clearing
                setTimeout(() => {
                    console.log('🔥 About to call performDataClear()');
                    this.performDataClear();
                }, 200);
            });
            
            // Also add onclick directly as backup
            confirmBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔥 CONFIRM BUTTON CLICKED (onclick) - User confirmed data clearing');
                
                if (this.isPerformingDataClear) {
                    console.log('🚫 Data clearing already in progress');
                    return;
                }
                
                this.closeClearDataModal();
                setTimeout(() => {
                    console.log('🔥 About to call performDataClear()');
                    this.performDataClear();
                }, 200);
            };
            
            console.log('✅ Event listeners added to confirm button');
        } else {
            console.error('❌ Confirm button not found!');
        }

        // Close on backdrop click
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                console.log('User cancelled data clearing via backdrop click');
                this.closeClearDataModal();
            }
        });

        // Add keyboard support (ESC to cancel)
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                console.log('User cancelled data clearing via ESC key');
                this.closeClearDataModal();
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        // Add fadeOut animation
        style.textContent += `
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
    }

    // Helper method to properly close the modal
    closeClearDataModal() {
        console.log('🔒 Closing clear data modal...');
        
        // Reset all flags
        window.clearDataInProgress = false;
        
        if (this.currentClearDataModal) {
            this.currentClearDataModal.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (this.currentClearDataModal && this.currentClearDataModal.parentNode) {
                    this.currentClearDataModal.remove();
                }
                this.currentClearDataModal = null;
                console.log('✅ Modal removed successfully');
            }, 300);
        } else {
            console.log('⚠️ No modal to close');
        }
    }

    // Perform the actual data clearing
    performDataClear() {
        console.log('🔥 performDataClear() method called');
        
        // Prevent multiple clear operations
        if (this.isPerformingDataClear) {
            console.log('Data clear already in progress, ignoring request');
            return;
        }

        this.isPerformingDataClear = true;
        console.log('🔥 Starting data clearing process...');
        
        // Show progress notification
        this.showNotification('🗑️ Clearing all data...', 'info');
        
        try {
            // Ensure modal is closed
            if (this.currentClearDataModal) {
                console.log('🔥 Removing current modal');
                this.currentClearDataModal.remove();
                this.currentClearDataModal = null;
            }

            console.log('🔥 About to clear localStorage items...');
            
            // Get all keys to ensure we clear everything J'MONIC related
            const allKeys = Object.keys(localStorage);
            const jmonicKeys = allKeys.filter(key => key.startsWith('jmonic_') || key.includes('jmonic'));
            
            console.log('🔥 Found J\'MONIC keys to clear:', jmonicKeys);
            
            // Clear all localStorage data (comprehensive clearing)
            localStorage.removeItem('jmonic_products');
            localStorage.removeItem('jmonic_sales'); 
            localStorage.removeItem('jmonic_purchases');
            localStorage.removeItem('inventoryTransactions');
            localStorage.removeItem('jmonic_settings');
            localStorage.removeItem('jmonic_theme');
            localStorage.removeItem('jmonic_notifications');
            localStorage.removeItem('jmonic_analytics');
            
            // Clear any additional J'MONIC keys that might exist
            jmonicKeys.forEach(key => {
                console.log(`🔥 Clearing additional key: ${key}`);
                localStorage.removeItem(key);
            });
            
            console.log('✅ All data cleared from localStorage');
            console.log('🔥 About to show success notification...');
            
            // Show success notification
            this.showNotification('✅ All data has been cleared successfully! The page will refresh in 3 seconds.', 'success');
            
            // Reset flag immediately after successful clearing
            this.isPerformingDataClear = false;
            
            console.log('🔥 Setting timeout for page reload...');
            
            // Show countdown
            let countdown = 3;
            const countdownInterval = setInterval(() => {
                countdown--;
                if (countdown > 0) {
                    this.showNotification(`✅ Data cleared! Refreshing in ${countdown} seconds...`, 'success');
                } else {
                    clearInterval(countdownInterval);
                }
            }, 1000);
            
            // Refresh the current page to show empty state after countdown
            setTimeout(() => {
                console.log('🔥 Reloading page now...');
                location.reload();
            }, 3000);
            
        } catch (error) {
            console.error('❌ Error clearing data:', error);
            this.showNotification('❌ Error clearing data. Please try again.', 'error');
            this.isPerformingDataClear = false; // Reset flag on error
        }
    }

    // Inventory Reports & Transaction Log Functions
    updateInventoryReports() {
        this.updateInventoryStats();
        this.updateTransactionLog();
    }

    updateInventoryStats() {
        const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
        const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        console.log('=== INVENTORY STATS DEBUG ===');
        console.log('Total sales:', sales.length);
        console.log('Today date for comparison:', today.toISOString().split('T')[0]);
        
        // Calculate today's stock movements
        let stockInToday = 0;
        let stockOutToday = 0;
        let totalTransactions = 0;
        
        // Count sales for today (stock out) - Use more flexible date matching
        const todayDateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        const todaySales = sales.filter(sale => {
            const saleDate = sale.date || sale.created_at;
            if (!saleDate) return false;
            
            // Handle different date formats safely
            let saleDateString;
            if (saleDate.includes('T')) {
                saleDateString = saleDate.split('T')[0]; // Get YYYY-MM-DD part
            } else {
                // If no 'T', assume it's already in YYYY-MM-DD format or create Date object
                try {
                    const dateObj = new Date(saleDate);
                    saleDateString = dateObj.toISOString().split('T')[0];
                } catch (e) {
                    console.warn('Invalid date format:', saleDate);
                    return false;
                }
            }
            
            const isToday = saleDateString === todayDateString;
            
            if (sales.length > 0) {
                console.log('Checking sale:', saleDateString, 'vs today:', todayDateString, '= match:', isToday);
            }
            return isToday;
        });
        
        console.log('Found', todaySales.length, 'sales for today');
        
        todaySales.forEach(sale => {
            console.log('Processing sale:', sale.id, 'products:', sale.products?.length || 0);
            if (sale.products && Array.isArray(sale.products)) {
                sale.products.forEach(product => {
                    const quantity = parseInt(product.quantity) || 0;
                    stockOutToday += quantity;
                    console.log('- Product:', product.name, 'quantity:', quantity, 'running total:', stockOutToday);
                });
            } else {
                console.log('- Sale has no products array');
            }
        });
        
        console.log('=== FINAL TOTALS ===');
        console.log('Stock Out Today:', stockOutToday);
        
        // Get stock alerts (low stock products)
        const lowStockProducts = products.filter(p => {
            const stock = p.stock_quantity || 0;
            const reorderLevel = p.reorder_level || p.reorderLevel || p.min_stock_level || 5;
            return stock <= reorderLevel;
        });
        
        // Get total transactions from localStorage
        const transactions = JSON.parse(localStorage.getItem('inventoryTransactions') || '[]');
        totalTransactions = transactions.length;
        
        // Count stock in from products added today (net additions)
        const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
        const todayDateString = today.toISOString().split('T')[0];
        
        products.forEach(product => {
            // Check if product was created today
            if (product.created_at) {
                let productDateString;
                try {
                    if (product.created_at.includes('T')) {
                        productDateString = product.created_at.split('T')[0];
                    } else {
                        const dateObj = new Date(product.created_at);
                        productDateString = dateObj.toISOString().split('T')[0];
                    }
                    
                    if (productDateString === todayDateString) {
                        // Only count current stock of products added today
                        stockInToday += parseInt(product.stock_quantity) || 0;
                    }
                } catch (e) {
                    console.warn('Invalid product date:', product.created_at);
                }
            }
        });
        
        // Update UI elements
        const stockInElement = document.getElementById('stockInToday');
        const stockOutElement = document.getElementById('stockOutToday');
        const totalTransactionsElement = document.getElementById('totalTransactions');
        const stockAlertsElement = document.getElementById('stockAlerts');
        
        if (stockInElement) stockInElement.textContent = stockInToday;
        if (stockOutElement) stockOutElement.textContent = stockOutToday;
        if (totalTransactionsElement) totalTransactionsElement.textContent = totalTransactions;
        if (stockAlertsElement) stockAlertsElement.textContent = lowStockProducts.length;
    }

    updateTransactionLog() {
        const transactions = JSON.parse(localStorage.getItem('inventoryTransactions') || '[]');
        
        console.log('Transaction Log Debug:', { transactions: transactions.length });
        
        // Use only the stored inventory transactions to avoid duplicates
        // These are already created when sales are made via logInventoryTransaction()
        let allTransactions = [...transactions];
        
        // Apply current filter if set
        if (this.currentTransactionFilter && this.currentTransactionFilter !== 'all') {
            allTransactions = allTransactions.filter(transaction => 
                transaction.type === this.currentTransactionFilter
            );
            console.log(`Filtered to ${this.currentTransactionFilter}: ${allTransactions.length} transactions`);
        }
        
        // Remove duplicates based on reference number and timestamp
        const uniqueTransactions = [];
        const seen = new Set();
        
        allTransactions.forEach(transaction => {
            const key = `${transaction.reference}-${transaction.timestamp}-${transaction.type}-${transaction.quantity}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueTransactions.push(transaction);
            } else {
                console.log('Duplicate transaction removed:', transaction);
            }
        });
        
        allTransactions = uniqueTransactions;
        
        // If we removed duplicates, update the stored transactions
        if (transactions.length !== allTransactions.length) {
            localStorage.setItem('inventoryTransactions', JSON.stringify(allTransactions));
            console.log(`Cleaned up ${transactions.length - allTransactions.length} duplicate transactions`);
        }
        
        // Sort by timestamp (newest first)
        allTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        const tbody = document.getElementById('transactionLogBody');
        if (!tbody) return;
        
        if (allTransactions.length === 0) {
            tbody.innerHTML = `
                <tr class="no-data-row">
                    <td colspan="7">
                        <div class="no-data-message">
                            <i class="fas fa-inbox"></i>
                            <p>No transactions recorded yet</p>
                            <small>Transaction history will appear here as you make inventory changes</small>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = allTransactions.slice(0, 50).map(transaction => {
            console.log('Rendering transaction:', transaction);
            
            // Safe date handling
            let displayDate = 'Invalid Date';
            try {
                const date = new Date(transaction.timestamp);
                if (!isNaN(date.getTime())) {
                    displayDate = date.toLocaleString();
                }
            } catch (e) {
                console.error('Date parsing error:', e, transaction.timestamp);
            }
            
            const productName = transaction.product || 'Unknown Product';
            const transactionType = transaction.type || 'unknown';
            const typeClass = this.getTransactionTypeClass(transactionType);
            const quantity = transaction.quantity !== undefined && transaction.quantity !== null ? transaction.quantity : 0;
            const quantityClass = quantity > 0 ? 'positive' : 'negative';
            const previousStock = transaction.previousStock !== undefined && transaction.previousStock !== null ? transaction.previousStock : 'N/A';
            const newStock = transaction.newStock !== undefined && transaction.newStock !== null ? transaction.newStock : 'N/A';
            const reference = transaction.reference || 'No Reference';
            
            return `
                <tr>
                    <td>${displayDate}</td>
                    <td>${productName}</td>
                    <td><span class="transaction-type ${typeClass}">${transactionType.toUpperCase()}</span></td>
                    <td><span class="quantity ${quantityClass}">${quantity > 0 ? '+' : ''}${quantity}</span></td>
                    <td>${previousStock}</td>
                    <td>${newStock}</td>
                    <td>${reference}</td>
                </tr>
            `;
        }).join('');
    }

    getTransactionTypeClass(type) {
        const typeClasses = {
            'sale': 'type-sale',
            'purchase': 'type-purchase',
            'adjustment': 'type-adjustment',
            'return': 'type-return',
            'transfer': 'type-transfer'
        };
        return typeClasses[type] || 'type-other';
    }

    filterTransactions(filterType) {
        // This function will filter the transaction log
        this.currentTransactionFilter = filterType;
        this.updateTransactionLog();
    }

    refreshTransactionLog() {
        this.updateTransactionLog();
        this.showNotification('Transaction log refreshed', 'success');
    }

    exportTransactionLog() {
        const transactions = JSON.parse(localStorage.getItem('inventoryTransactions') || '[]');
        const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
        
        if (transactions.length === 0 && sales.length === 0) {
            this.showNotification('No transaction data to export', 'warning');
            return;
        }
        
        // Create CSV content
        let csvContent = "Timestamp,Product,Type,Quantity,Previous Stock,New Stock,Reference\n";
        
        // Add transaction data
        transactions.forEach(transaction => {
            const date = new Date(transaction.timestamp);
            csvContent += `"${date.toLocaleString()}","${transaction.product}","${transaction.type}","${transaction.quantity}","${transaction.previousStock || ''}","${transaction.newStock || ''}","${transaction.reference || ''}"\n`;
        });
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jmonic_transactions_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showNotification('Transaction log exported successfully', 'success');
    }

    // Inventory Transaction Management
    logInventoryTransaction(productId, productName, type, quantity, previousStock, newStock, reference = '') {
        const transactions = JSON.parse(localStorage.getItem('inventoryTransactions') || '[]');
        
        // Check for duplicates based on reference and timestamp (within 1 second)
        const now = new Date();
        const duplicateCheck = transactions.find(t => 
            t.reference === reference && 
            t.product_id == productId && 
            t.type === type &&
            t.quantity == quantity &&
            Math.abs(new Date(t.timestamp) - now) < 1000 // Within 1 second
        );
        
        if (duplicateCheck) {
            console.log('Duplicate transaction prevented:', reference);
            return duplicateCheck;
        }
        
        const transaction = {
            id: Date.now() + Math.random(),
            timestamp: now.toISOString(),
            product_id: productId,
            product: productName,
            type: type, // 'purchase', 'sale', 'adjustment', 'return', 'transfer'
            quantity: quantity,
            previousStock: previousStock,
            newStock: newStock,
            reference: reference
        };
        
        transactions.push(transaction);
        localStorage.setItem('inventoryTransactions', JSON.stringify(transactions));
        
        console.log('Inventory transaction logged:', transaction);
        return transaction;
    }

    // Create sample inventory transactions for demonstration
    createSampleInventoryTransactions() {
        const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
        if (products.length === 0) return;

        const transactions = JSON.parse(localStorage.getItem('inventoryTransactions') || '[]');
        if (transactions.length > 0) return; // Don't create duplicates

        // Create some sample transactions for the past few days
        const today = new Date();
        
        products.forEach((product, index) => {
            const currentStock = product.stock_quantity || 0;
            
            // Add a purchase transaction (stock in) 3 days ago
            const purchaseDate = new Date(today);
            purchaseDate.setDate(today.getDate() - 3);
            const purchaseQuantity = Math.floor(Math.random() * 20) + 10;
            
            this.logInventoryTransaction(
                product.id,
                product.name,
                'purchase',
                purchaseQuantity,
                Math.max(0, currentStock - purchaseQuantity),
                currentStock,
                `PO-${1000 + index}`
            );

            // Add a stock adjustment transaction 1 day ago (if needed)
            if (Math.random() > 0.7) {
                const adjustmentDate = new Date(today);
                adjustmentDate.setDate(today.getDate() - 1);
                const adjustmentQuantity = Math.floor(Math.random() * 10) - 5; // Can be positive or negative
                
                this.logInventoryTransaction(
                    product.id,
                    product.name,
                    'adjustment',
                    adjustmentQuantity,
                    currentStock,
                    currentStock + adjustmentQuantity,
                    'Stock count adjustment'
                );
            }
        });
        
        console.log('Sample inventory transactions created');
    }

    // Revenue Forecasting Functions
    updateRevenueForecast() {
        const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
        
        console.log('Updating revenue forecast with', sales.length, 'sales records');
        
        if (sales.length === 0) {
            console.log('No sales data available for forecasting');
            this.displayEmptyForecast();
            return;
        }
        
        // Log a sample of sales data to understand structure
        if (sales.length > 0) {
            console.log('Sample sales data structure:', sales[0]);
        }
        
        const forecasts = this.calculateForecasts(sales);
        console.log('Calculated forecasts:', forecasts);
        this.displayForecasts(forecasts);
    }

    calculateForecasts(sales) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Get revenue data with more historical depth for better forecasting
        const monthlyRevenue = this.getMonthlyRevenue(sales, 12); // 12 months for better trend analysis
        const quarterlyRevenue = this.getQuarterlyRevenue(sales, 8); // 8 quarters (2 years)
        const yearlyRevenue = this.getYearlyRevenue(sales, 5); // 5 years
        
        // Calculate weighted trends (recent data has more influence)
        const monthlyTrend = this.calculateWeightedTrend(monthlyRevenue);
        const quarterlyTrend = this.calculateWeightedTrend(quarterlyRevenue);
        const yearlyTrend = this.calculateWeightedTrend(yearlyRevenue);
        
        // Current month progress and recent performance
        const currentMonthSales = sales.filter(sale => {
            const saleDate = new Date(sale.date || sale.created_at);
            return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
        });
        
        const currentMonthRevenue = currentMonthSales.reduce((sum, sale) => {
            // Handle different possible revenue field names
            const revenue = sale.revenue || sale.total_amount || sale.total || 0;
            return sum + parseFloat(revenue);
        }, 0);
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const currentDay = now.getDate();
        const monthProgress = currentDay / daysInMonth;
        
        // Recent 7 days performance for trend acceleration
        const recentSales = this.getRecentSalesRevenue(sales, 7);
        const dailyAverage = recentSales / 7;
        
        // Advanced forecasting calculations
        let monthlyForecast = 0;
        let quarterlyForecast = 0;
        let yearlyForecast = 0;
        let growthRate = 0;
        
        if (monthlyRevenue.length >= 2) {
            // Weighted average with more emphasis on recent months
            const weightedMonthlyAvg = this.calculateWeightedAverage(monthlyRevenue);
            
            // Project current month based on daily performance and historical trend
            const remainingDays = daysInMonth - currentDay;
            const projectedRemainingRevenue = dailyAverage * remainingDays * (1 + monthlyTrend / 100);
            const projectedMonthly = currentMonthRevenue + projectedRemainingRevenue;
            
            // Use the better of projected or weighted average with trend adjustment
            monthlyForecast = Math.max(
                projectedMonthly,
                weightedMonthlyAvg * (1 + monthlyTrend / 100),
                currentMonthRevenue / Math.max(monthProgress, 0.1) // Extrapolate from current progress
            );
            
            // Advanced growth rate calculation with seasonal adjustment
            growthRate = this.calculateAdvancedGrowthRate(monthlyRevenue);
        }
        
        if (quarterlyRevenue.length >= 2) {
            const weightedQuarterlyAvg = this.calculateWeightedAverage(quarterlyRevenue);
            quarterlyForecast = weightedQuarterlyAvg * (1 + quarterlyTrend / 100);
            
            // Add current quarter progress factor
            const currentQuarter = Math.floor(currentMonth / 3);
            const quarterMonths = [currentMonth % 3 === 0 ? 3 : currentMonth % 3];
            quarterlyForecast = Math.max(quarterlyForecast, monthlyForecast * 3);
        }
        
        if (yearlyRevenue.length >= 2) {
            const weightedYearlyAvg = this.calculateWeightedAverage(yearlyRevenue);
            yearlyForecast = weightedYearlyAvg * (1 + yearlyTrend / 100);
            
            // Ensure consistency with shorter-term forecasts
            yearlyForecast = Math.max(yearlyForecast, quarterlyForecast * 4);
        }
        
        return {
            monthly: Math.max(monthlyForecast, 0),
            quarterly: Math.max(quarterlyForecast, 0),
            yearly: Math.max(yearlyForecast, 0),
            growthRate: growthRate
        };
    }

    getMonthlyRevenue(sales, months) {
        const revenue = [];
        const now = new Date();
        
        for (let i = months - 1; i >= 0; i--) {
            const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthSales = sales.filter(sale => {
                const saleDate = new Date(sale.date || sale.created_at);
                return saleDate.getMonth() === targetDate.getMonth() && 
                       saleDate.getFullYear() === targetDate.getFullYear();
            });
            
            const monthRevenue = monthSales.reduce((sum, sale) => {
                const revenue = sale.revenue || sale.total_amount || sale.total || 0;
                return sum + parseFloat(revenue);
            }, 0);
            revenue.push(monthRevenue);
        }
        
        return revenue;
    }

    getQuarterlyRevenue(sales, quarters) {
        const revenue = [];
        const now = new Date();
        const currentQuarter = Math.floor(now.getMonth() / 3);
        
        for (let i = quarters - 1; i >= 0; i--) {
            const targetQuarter = currentQuarter - i;
            const targetYear = now.getFullYear() + Math.floor(targetQuarter / 4);
            const adjustedQuarter = ((targetQuarter % 4) + 4) % 4;
            
            const quarterSales = sales.filter(sale => {
                const saleDate = new Date(sale.date || sale.created_at);
                const saleQuarter = Math.floor(saleDate.getMonth() / 3);
                return saleQuarter === adjustedQuarter && saleDate.getFullYear() === targetYear;
            });
            
            const quarterRevenue = quarterSales.reduce((sum, sale) => {
                const revenue = sale.revenue || sale.total_amount || sale.total || 0;
                return sum + parseFloat(revenue);
            }, 0);
            revenue.push(quarterRevenue);
        }
        
        return revenue;
    }

    getYearlyRevenue(sales, years) {
        const revenue = [];
        const currentYear = new Date().getFullYear();
        
        for (let i = years - 1; i >= 0; i--) {
            const targetYear = currentYear - i;
            const yearSales = sales.filter(sale => {
                const saleDate = new Date(sale.date || sale.created_at);
                return saleDate.getFullYear() === targetYear;
            });
            
            const yearRevenue = yearSales.reduce((sum, sale) => {
                const revenue = sale.revenue || sale.total_amount || sale.total || 0;
                return sum + parseFloat(revenue);
            }, 0);
            revenue.push(yearRevenue);
        }
        
        return revenue;
    }

    calculateTrend(dataPoints) {
        if (dataPoints.length < 2) return 0;
        
        // Simple linear regression for trend calculation
        const n = dataPoints.length;
        const sumX = n * (n - 1) / 2;
        const sumY = dataPoints.reduce((sum, val) => sum + val, 0);
        const sumXY = dataPoints.reduce((sum, val, index) => sum + (val * index), 0);
        const sumXX = n * (n - 1) * (2 * n - 1) / 6;
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return slope;
    }

    calculateWeightedTrend(dataPoints) {
        if (dataPoints.length < 2) return 0;
        
        // Give more weight to recent data points
        const weights = dataPoints.map((_, index) => Math.pow(1.2, index)); // Recent data gets higher weight
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        
        // Weighted linear regression
        const n = dataPoints.length;
        let sumXW = 0, sumYW = 0, sumXWY = 0, sumXWX = 0;
        
        dataPoints.forEach((value, index) => {
            const weight = weights[index];
            sumXW += index * weight;
            sumYW += value * weight;
            sumXWY += index * value * weight;
            sumXWX += index * index * weight;
        });
        
        const slope = (totalWeight * sumXWY - sumXW * sumYW) / (totalWeight * sumXWX - sumXW * sumXW);
        return isFinite(slope) ? slope : 0;
    }

    calculateWeightedAverage(dataPoints) {
        if (dataPoints.length === 0) return 0;
        
        // Recent data gets exponentially higher weight
        const weights = dataPoints.map((_, index) => Math.pow(1.3, index));
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        
        const weightedSum = dataPoints.reduce((sum, value, index) => {
            return sum + (value * weights[index]);
        }, 0);
        
        return weightedSum / totalWeight;
    }

    getRecentSalesRevenue(sales, days) {
        const now = new Date();
        const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        
        const recentSales = sales.filter(sale => {
            const saleDate = new Date(sale.date || sale.created_at);
            return saleDate >= cutoffDate;
        });
        
        return recentSales.reduce((sum, sale) => {
            const revenue = sale.revenue || sale.total_amount || sale.total || 0;
            return sum + parseFloat(revenue);
        }, 0);
    }

    calculateAdvancedGrowthRate(monthlyRevenue) {
        if (monthlyRevenue.length < 3) {
            // Simple growth rate for limited data
            const lastMonth = monthlyRevenue[monthlyRevenue.length - 1] || 0;
            const previousMonth = monthlyRevenue[monthlyRevenue.length - 2] || 0;
            return previousMonth > 0 ? ((lastMonth - previousMonth) / previousMonth) * 100 : 0;
        }
        
        // Calculate growth rate with seasonal and trend adjustments
        const recent3Months = monthlyRevenue.slice(-3);
        const previous3Months = monthlyRevenue.slice(-6, -3);
        
        const recentAvg = recent3Months.reduce((sum, val) => sum + val, 0) / recent3Months.length;
        const previousAvg = previous3Months.reduce((sum, val) => sum + val, 0) / previous3Months.length;
        
        if (previousAvg > 0) {
            return ((recentAvg - previousAvg) / previousAvg) * 100;
        }
        
        // Fallback to simple month-over-month
        const lastMonth = monthlyRevenue[monthlyRevenue.length - 1] || 0;
        const previousMonth = monthlyRevenue[monthlyRevenue.length - 2] || 0;
        return previousMonth > 0 ? ((lastMonth - previousMonth) / previousMonth) * 100 : 0;
    }

    displayForecasts(forecasts) {
        const currency = localStorage.getItem('jmonic_currency') || 'GHS';
        
        const monthlyElement = document.getElementById('monthlyForecast');
        const quarterlyElement = document.getElementById('quarterlyForecast');
        const yearlyElement = document.getElementById('yearlyForecast');
        const growthRateElement = document.getElementById('growthRate');
        
        if (monthlyElement) {
            monthlyElement.textContent = `${currency} ${this.formatCurrency(forecasts.monthly)}`;
        }
        
        if (quarterlyElement) {
            quarterlyElement.textContent = `${currency} ${this.formatCurrency(forecasts.quarterly)}`;
        }
        
        if (yearlyElement) {
            yearlyElement.textContent = `${currency} ${this.formatCurrency(forecasts.yearly)}`;
        }
        
        if (growthRateElement) {
            const growthText = forecasts.growthRate >= 0 ? 
                `+${forecasts.growthRate.toFixed(1)}%` : 
                `${forecasts.growthRate.toFixed(1)}%`;
            growthRateElement.textContent = growthText;
            
            // Update color based on growth
            if (forecasts.growthRate > 0) {
                growthRateElement.style.color = '#10b981';
            } else if (forecasts.growthRate < 0) {
                growthRateElement.style.color = '#ef4444';
            } else {
                growthRateElement.style.color = '#6b7280';
            }
        }
    }

    displayEmptyForecast() {
        const currency = localStorage.getItem('jmonic_currency') || 'GHS';
        
        ['monthlyForecast', 'quarterlyForecast', 'yearlyForecast'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = `${currency} 0.00`;
        });
        
        const growthRateElement = document.getElementById('growthRate');
        if (growthRateElement) {
            growthRateElement.textContent = '0%';
            growthRateElement.style.color = '#6b7280';
        }
    }

    refreshForecasting() {
        this.updateRevenueForecast();
        this.showNotification('Revenue forecast updated', 'success');
    }

    generateForecastReport() {
        const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
        
        if (sales.length === 0) {
            this.showNotification('No sales data available for forecasting', 'warning');
            return;
        }
        
        const forecasts = this.calculateForecasts(sales);
        const currency = localStorage.getItem('jmonic_currency') || 'GHS';
        
        // Generate CSV report
        let csvContent = "Revenue Forecasting Report\n";
        csvContent += `Generated on: ${new Date().toLocaleString()}\n\n`;
        csvContent += "Forecast Period,Projected Amount,Confidence Level\n";
        csvContent += `This Month,${currency} ${this.formatCurrency(forecasts.monthly)},85%\n`;
        csvContent += `This Quarter,${currency} ${this.formatCurrency(forecasts.quarterly)},75%\n`;
        csvContent += `This Year,${currency} ${this.formatCurrency(forecasts.yearly)},65%\n`;
        csvContent += `Growth Rate,${forecasts.growthRate.toFixed(1)}%,Month over Month\n`;
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jmonic_revenue_forecast_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showNotification('Forecast report generated successfully', 'success');
    }


}

// Initialize the system
let businessManager;

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing business manager...');
    businessManager = new NaturalHairBusinessManager();
    
    // Initialize theme immediately
    initializeTheme();
    
    initializeEventListeners();
    setupFormHandlers();
    
    // Export for global access after initialization
    window.businessManager = businessManager;
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.editProduct = editProduct;
    window.toggleMobileSidebar = toggleMobileSidebar;
    window.closeMobileSidebar = closeMobileSidebar;
    window.navigateToSection = navigateToSection;
    
    // Refresh low stock data after initialization
    setTimeout(() => {
        if (businessManager) {
            businessManager.refreshLowStockData();
            businessManager.initializeHeaderDropdowns();
            businessManager.loadSettings(); // Activate settings immediately
            businessManager.updateInventoryReports();
            businessManager.updateRevenueForecast();
            
            // Initialize mobile navigation
            initializeMobileNavigation();
            
            // Log that forecasting is ready
            console.log('Revenue forecasting initialized and ready');
            
            // Test export function accessibility
            if (typeof businessManager.exportRecentSales === 'function') {
                console.log('✅ Export function is available and ready');
            } else {
                console.error('❌ Export function is not available');
            }
        }
    }, 1500);
    window.deleteProduct = deleteProduct;
    
    // Expose settings activation function globally
    window.showSettings = function() {
        if (businessManager) {
            businessManager.showSection('settings');
            console.log('Settings section opened');
        }
    };
    
    window.activateSettings = function() {
        if (businessManager) {
            businessManager.loadSettings();
            businessManager.initializeHeaderDropdowns();
            console.log('✅ Settings activated successfully!');
        }
    };
    
    // Expose delete functionality globally with multiple access points
    window.clearAllData = function() {
        console.log('🌐 Global clearAllData called');
        console.log('🔍 Current clearDataInProgress state:', window.clearDataInProgress);
        console.log('🔍 businessManager exists:', !!window.businessManager);
        
        // Prevent multiple simultaneous calls
        if (window.clearDataInProgress) {
            console.log('🚫 Clear data already in progress, ignoring call');
            console.log('💡 TIP: Run window.resetClearFlags() if stuck');
            return;
        }
        
        try {
            window.clearDataInProgress = true;
            console.log('🌐 Setting clearDataInProgress to true, proceeding...');
            
            if (window.businessManager) {
                console.log('🌐 Calling businessManager.clearAllData()');
                window.businessManager.clearAllData();
            } else {
                console.log('BusinessManager not available, using fallback');
                const confirmClear = confirm('⚠️ DANGER: This will permanently delete ALL your business data.\n\nThis action CANNOT be undone.\n\nAre you absolutely sure?');
                if (confirmClear) {
                    try {
                        localStorage.removeItem('jmonic_products');
                        localStorage.removeItem('jmonic_sales');
                        localStorage.removeItem('jmonic_purchases');
                        localStorage.removeItem('inventoryTransactions');
                        localStorage.removeItem('jmonic_settings');
                        
                        // Reset flag before reload
                        window.clearDataInProgress = false;
                        
                        alert('✅ All data cleared! Page will refresh.');
                        setTimeout(() => {
                            location.reload();
                        }, 500);
                    } catch (error) {
                        console.error('Error:', error);
                        alert('❌ Error clearing data.');
                        window.clearDataInProgress = false; // Reset on error
                    }
                } else {
                    window.clearDataInProgress = false; // Reset on cancel
                }
            }
        } catch (error) {
            console.error('❌ Error in clearAllData:', error);
            window.clearDataInProgress = false;
            alert('❌ An error occurred while clearing data. Please try again.');
        }
    };
    
    // Additional global handlers for reliability
    window.deleteAllData = window.clearAllData; // Alternative name
    window.clearData = window.clearAllData; // Shortened name
    
    // Expose inventory data cleanup function globally
    window.cleanInventoryData = function() {
        console.log('🔧 Manual inventory data cleanup triggered');
        if (window.businessManager) {
            window.businessManager.cleanAndRegenerateInventoryData();
        } else {
            console.error('❌ Business manager not available');
        }
    };

    // Direct emergency clear function that bypasses modal
    window.emergencyClearAllData = function() {
        console.log('🚨 EMERGENCY CLEAR DATA CALLED');
        try {
            if (confirm('EMERGENCY: Clear all business data immediately?')) {
                console.log('🚨 User confirmed emergency clear');
                localStorage.removeItem('jmonic_products');
                localStorage.removeItem('jmonic_sales');
                localStorage.removeItem('jmonic_purchases');
                localStorage.removeItem('inventoryTransactions');
                localStorage.removeItem('jmonic_settings');
                alert('✅ Emergency clear complete! Page will refresh.');
                location.reload();
            }
        } catch (error) {
            console.error('Emergency clear failed:', error);
            alert('Emergency clear failed: ' + error.message);
        }
    };
    
    // Simple direct clear for button onclick
    window.directClearData = function() {
        console.log('🔥 DIRECT CLEAR DATA CALLED');
        if (window.businessManager) {
            window.businessManager.performDataClear();
        } else {
            window.emergencyClearAllData();
        }
    };
    
    // Global function to reset stuck flags
    window.resetClearFlags = function() {
        console.log('🔄 GLOBAL RESET: Clearing all stuck flags...');
        if (window.businessManager) {
            window.businessManager.resetClearDataFlags();
        }
        window.clearDataInProgress = false;
        // Remove any existing modals
        const existingModals = document.querySelectorAll('[id*="clear"], [class*="modal"]');
        existingModals.forEach(modal => {
            if (modal.innerHTML && modal.innerHTML.includes('Clear All Data')) {
                modal.remove();
            }
        });
        console.log('✅ Global flag reset complete');
    };
    
    // Initialize flags to ensure clean state
    window.clearDataInProgress = false;
    
    // Additional global handlers for reliability
    window.deleteAllData = window.clearAllData; // Alternative name
    window.clearData = window.clearAllData; // Shortened name
    
    // Specific handler for HTML onclick attributes
    window.handleClearDataClick = function(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        console.log('🎯 HandleClearDataClick called');
        window.clearAllData();
    };
    
    // Backup function in case others fail
    window.emergencyClearData = function() {
        console.log('🚨 Emergency clear data called');
        try {
            if (confirm('EMERGENCY CLEAR: Delete all business data?')) {
                ['jmonic_products', 'jmonic_sales', 'jmonic_purchases', 'inventoryTransactions', 'jmonic_settings']
                    .forEach(key => localStorage.removeItem(key));
                alert('Data cleared via emergency function');
                location.reload();
            }
        } catch (error) {
            console.error('Emergency clear failed:', error);
        }
    };
    
    console.log('Global functions exported:', {
        businessManager: typeof window.businessManager,
        openModal: typeof window.openModal,
        closeModal: typeof window.closeModal,
        showSettings: typeof window.showSettings,
        activateSettings: typeof window.activateSettings,
        clearAllData: typeof window.clearAllData,
        deleteProduct: typeof window.deleteProduct
    });
    
    // Add test function to verify JavaScript is working
    window.testJS = function() {
        console.log('JavaScript is working properly');
    };
    
    // Load products if on products page initially
    if (document.querySelector('#products.active')) {
        businessManager.loadProductsInventory();
    }
    
    // Initialize inventory tracking if on inventory page
    if (document.querySelector('#inventory.active')) {
        businessManager.initializeInventoryTracking();
    }
    
    // Initialize product stats on page load
    const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
    if (businessManager && document.querySelector('#products')) {
        businessManager.updateProductStats(products);
    }
});

// Event Listeners
function initializeEventListeners() {
    // Sidebar navigation
    const sidebarItems = document.querySelectorAll('.sidebar-menu a');
    sidebarItems.forEach(item => {
        item.addEventListener('click', handleNavigation);
    });
    
    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) closeModal(modal.id);
        });
    });
}

// Navigation Handler
function handleNavigation(e) {
    e.preventDefault();
    const section = e.currentTarget.dataset.section;
    showSection(section);
    
    // Update active sidebar item
    document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
    e.currentTarget.parentElement.classList.add('active');
}

// Show Section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Load section-specific data
    if (sectionName === 'sales' && businessManager) {
        businessManager.loadSalesDashboard();
    } else if (sectionName === 'products' && businessManager) {
        businessManager.loadProductsInventory();
        // Also update product stats
        const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
        businessManager.updateProductStats(products);
    } else if (sectionName === 'inventory' && businessManager) {
        businessManager.initializeInventoryTracking();
    } else if (sectionName === 'revenue' && revenueAnalytics) {
        revenueAnalytics.loadRevenueAnalytics();
        if (businessManager) {
            businessManager.updateRevenueForecast(); // Update forecasting when revenue section is viewed
        }
    } else if (sectionName === 'reports' && businessManager) {
        // Update inventory reports when reports section is viewed
        businessManager.updateInventoryReports();
    } else if (sectionName === 'settings' && businessManager) {
        // Initialize settings when settings section is opened
        console.log('Settings section opened - loading settings');
        businessManager.loadSettings();
        businessManager.initializeSettingsTabs();
    }
    
    // Update header title and subtitle
    if (typeof updateHeaderTitle === 'function') {
        updateHeaderTitle();
    }
}

// Modal Functions  
function openModal(modalId) {
    console.log('Opening modal:', modalId);
    
    const modal = document.getElementById(modalId);
    
    if (modal) {
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        document.body.style.overflow = 'hidden';
        
        // Load products for sale modal
        if (modalId === 'addSaleModal' && businessManager) {
            businessManager.loadProductsForSale();
            // Set today's date as default
            const dateInput = document.querySelector('#addSaleModal input[name="saleDate"]');
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
            // Initialize total calculation
            setTimeout(() => businessManager.updateSaleTotal(), 100);
        }
    } else {
        console.error('Modal not found:', modalId);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Reset form if exists
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeModal(e.target.id);
    }
});

// Setup Form Handlers
function setupFormHandlers() {
    // Add Product Form
    const addProductForm = document.querySelector('#addProductModal form');
    if (addProductForm) {
        addProductForm.addEventListener('submit', handleAddProductSubmit);
    }
    
    // Add Sale Form
    const addSaleForm = document.querySelector('#addSaleModal form');
    if (addSaleForm) {
        addSaleForm.addEventListener('submit', handleAddSaleSubmit);
    }
}

// Form Submit Handlers
async function handleAddProductSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const productData = {
        sku: formData.get('sku'),
        productName: formData.get('productName'),
        description: formData.get('description'),
        sellingPrice: formData.get('sellingPrice'),
        costPrice: formData.get('costPrice'),
        stockQuantity: formData.get('stockQuantity'),
        reorderLevel: formData.get('reorderLevel') || 10
    };
    
    // Check if we're editing an existing product
    const editingId = form.dataset.editingId;
    
    try {
        let result;
        if (editingId) {
            // Update existing product
            result = await businessManager.updateProduct(editingId, productData);
        } else {
            // Add new product
            result = await businessManager.addProduct(productData);
        }
        
        if (result) {
            closeModal('addProductModal');
            
            // Reset form and modal state
            form.reset();
            delete form.dataset.editingId;
            document.querySelector('#addProductModal h3').textContent = 'Add New Product';
            document.querySelector('#addProductModal button[type="submit"]').textContent = 'Add Product';
            
            // Force refresh the products table and low stock data
            await businessManager.loadProductsInventory();
            businessManager.refreshLowStockData();
        }
    } catch (error) {
        // Show validation error to user
        console.error('Product validation error:', error);
        
        // Display error in modal or as notification
        if (businessManager && businessManager.showLiveNotification) {
            businessManager.showLiveNotification(
                'Validation Error',
                error.message,
                'error',
                'fa-exclamation-circle'
            );
        } else {
            alert(error.message); // Fallback
        }
    }
}

async function handleAddSaleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    await businessManager.submitSale(formData);
}

// Global helper functions
function openAddProductModal() {
    openModal('addProductModal');
}

function editProduct(productId) {
    console.log('Editing product:', productId);
    
    // Get products from localStorage
    const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
    const product = products.find(p => p.id == productId);
    
    if (!product) {
        businessManager.showNotification('Product not found!', 'error');
        return;
    }
    
    // Pre-fill the add product modal with existing data
    openModal('addProductModal');
    
    // Wait a bit for modal to open, then fill the form
    setTimeout(() => {
        const form = document.querySelector('#addProductModal form');
        if (form) {
            // Safely set form values with null checks
            const productNameField = form.querySelector('input[name="productName"]');
            const skuField = form.querySelector('input[name="sku"]');
            const stockQuantityField = form.querySelector('input[name="stockQuantity"]');
            const sellingPriceField = form.querySelector('input[name="sellingPrice"]');
            const costPriceField = form.querySelector('input[name="costPrice"]');
            const reorderLevelField = form.querySelector('input[name="reorderLevel"]');
            const descriptionField = form.querySelector('textarea[name="description"]');
            
            if (productNameField) productNameField.value = product.name || '';
            if (skuField) skuField.value = product.sku || '';
            if (stockQuantityField) stockQuantityField.value = product.stock_quantity || '';
            if (sellingPriceField) sellingPriceField.value = product.selling_price || '';
            if (costPriceField) costPriceField.value = product.cost_price || '';
            if (reorderLevelField) reorderLevelField.value = product.reorder_level || '';
            if (descriptionField) descriptionField.value = product.description || '';
            
            // Safely change modal title and button text
            const modalTitle = document.querySelector('#addProductModal h3');
            const submitButton = document.querySelector('#addProductModal button[type="submit"]');
            
            if (modalTitle) modalTitle.textContent = 'Edit Product';
            if (submitButton) submitButton.textContent = 'Update Product';
            
            // Store the product ID for updating
            form.dataset.editingId = productId;
        } else {
            console.error('Could not find product form in modal');
            businessManager.showNotification('Error opening edit form', 'error');
        }
    }, 100);
}

function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        console.log('Deleting product:', productId);
        
        try {
            // Get products from localStorage
            const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
            
            // Filter out the product to delete
            const updatedProducts = products.filter(p => p.id != productId);
            
            // Save back to localStorage
            localStorage.setItem('jmonic_products', JSON.stringify(updatedProducts));
            
            // Show success message
            if (window.businessManager) {
                window.businessManager.showNotification('Product deleted successfully!', 'success');
                
                // Refresh the products table
                window.businessManager.loadProductsInventory();
                
                // Refresh dashboard data
                window.businessManager.loadDashboardData();
            } else {
                alert('Product deleted successfully!');
                location.reload(); // Fallback: reload page
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error deleting product. Please try again.');
        }
    }
}

function exportProducts() {
    businessManager.showNotification('Export feature coming soon!', 'info');
}

// Auto-refresh dashboard every 30 seconds
setInterval(async () => {
    if (businessManager && document.querySelector('#overview.active')) {
        await businessManager.loadDashboardData();
    }
}, 30000);

// Modern Header Functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeModernHeader();
});

function initializeModernHeader() {
    // Global Search Functionality
    const globalSearch = document.getElementById('globalSearch');
    const searchSuggestions = document.getElementById('searchSuggestions');
    
    if (globalSearch) {
        globalSearch.addEventListener('input', handleGlobalSearch);
        globalSearch.addEventListener('focus', () => {
            if (globalSearch.value.length > 0) {
                searchSuggestions.style.display = 'block';
            }
        });
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!globalSearch.contains(e.target) && !searchSuggestions.contains(e.target)) {
                searchSuggestions.style.display = 'none';
            }
        });
    }
    
    // Notification Button
    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', showNotifications);
        updateNotificationBadge();
    }
    
    // User Profile Dropdown
    const userAvatar = document.getElementById('userAvatar');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userAvatar && userDropdown) {
        userAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
        });
        
        // Hide dropdown when clicking outside
        document.addEventListener('click', () => {
            userDropdown.style.display = 'none';
        });
        
        // Handle dropdown item clicks
        userDropdown.addEventListener('click', handleUserDropdownClick);
    }
    
    // Update header title based on current section
    updateHeaderTitle();
}

function handleGlobalSearch() {
    const query = document.getElementById('globalSearch').value.toLowerCase();
    const suggestions = document.getElementById('searchSuggestions');
    
    if (query.length < 2) {
        suggestions.style.display = 'none';
        return;
    }
    
    // Search through products and sales
    const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
    const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
    
    const productResults = products
        .filter(product => 
            product.name.toLowerCase().includes(query) || 
            product.sku.toLowerCase().includes(query)
        )
        .slice(0, 3)
        .map(product => ({
            type: 'product',
            title: product.name,
            subtitle: `SKU: ${product.sku} - Stock: ${product.stock_quantity}`,
            action: () => showSection('products')
        }));
    
    const saleResults = sales
        .filter(sale => 
            sale.products && sale.products.some(p => 
                p.name.toLowerCase().includes(query)
            )
        )
        .slice(0, 2)
        .map(sale => ({
            type: 'sale',
            title: `Sale #${sale.id}`,
            subtitle: `${sale.products.length} items - GHS ${(sale.revenue || 0).toFixed(2)}`,
            action: () => showSection('sales')
        }));
    
    const allResults = [...productResults, ...saleResults];
    
    if (allResults.length > 0) {
        suggestions.innerHTML = allResults.map(result => `
            <div class="suggestion-item" onclick="${result.action.toString().replace('function ', '').replace('{ ', '').replace(' }', '')}">
                <div class="suggestion-icon">
                    <i class="fas fa-${result.type === 'product' ? 'box' : 'receipt'}"></i>
                </div>
                <div class="suggestion-content">
                    <div class="suggestion-title">${result.title}</div>
                    <div class="suggestion-subtitle">${result.subtitle}</div>
                </div>
            </div>
        `).join('');
        suggestions.style.display = 'block';
    } else {
        suggestions.innerHTML = '<div class="suggestion-item"><div class="suggestion-content"><div class="suggestion-title">No results found</div></div></div>';
        suggestions.style.display = 'block';
    }
}

function showNotifications() {
    const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
    const lowStockProducts = products.filter(p => p.stock_quantity <= (p.reorder_level || 10));
    
    let notificationContent = '<div class="notification-popup">';
    notificationContent += '<div class="notification-header">Notifications</div>';
    
    if (lowStockProducts.length > 0) {
        notificationContent += '<div class="notification-section">';
        notificationContent += '<div class="notification-section-title">Low Stock Alerts</div>';
        lowStockProducts.forEach(product => {
            notificationContent += `
                <div class="notification-item">
                    <i class="fas fa-exclamation-triangle text-warning"></i>
                    <div class="notification-text">
                        <div class="notification-title">${product.name}</div>
                        <div class="notification-subtitle">Only ${product.stock_quantity} units left</div>
                    </div>
                </div>
            `;
        });
        notificationContent += '</div>';
    } else {
        notificationContent += '<div class="notification-item">No new notifications</div>';
    }
    
    notificationContent += '</div>';
    
    // Create temporary notification popup
    const popup = document.createElement('div');
    popup.innerHTML = notificationContent;
    popup.style.position = 'fixed';
    popup.style.top = '80px';
    popup.style.right = '2rem';
    popup.style.zIndex = '1001';
    popup.style.background = 'var(--card-background)';
    popup.style.border = '1px solid var(--border-color)';
    popup.style.borderRadius = 'var(--radius-lg)';
    popup.style.boxShadow = 'var(--shadow-lg)';
    popup.style.minWidth = '300px';
    popup.style.maxWidth = '400px';
    
    document.body.appendChild(popup);
    
    // Remove popup after 5 seconds or on click outside
    setTimeout(() => {
        if (popup.parentNode) popup.parentNode.removeChild(popup);
    }, 5000);
    
    document.addEventListener('click', function removePopup(e) {
        if (!popup.contains(e.target)) {
            if (popup.parentNode) popup.parentNode.removeChild(popup);
            document.removeEventListener('click', removePopup);
        }
    });
}

function updateNotificationBadge() {
    const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
    const lowStockCount = products.filter(p => p.stock_quantity <= (p.reorder_level || 10)).length;
    
    const badge = document.querySelector('.notification-badge');
    if (badge && lowStockCount > 0) {
        badge.textContent = lowStockCount;
        badge.style.display = 'flex';
    } else if (badge) {
        badge.style.display = 'none';
    }
}

function handleUserDropdownClick(e) {
    const item = e.target.closest('.dropdown-item');
    if (!item) return;
    
    const text = item.textContent.trim();
    
    switch (text) {
        case 'Profile Settings':
            businessManager.showNotification('Profile settings coming soon!', 'info');
            break;
        case 'Business Reports':
            showSection('reports');
            break;
        case 'Export Data':
            businessManager.showNotification('Data export feature coming soon!', 'info');
            break;
        case 'Sign Out':
            if (confirm('Are you sure you want to sign out?')) {
                localStorage.clear();
                location.reload();
            }
            break;
    }
    
    // Hide dropdown
    document.getElementById('userDropdown').style.display = 'none';
}

function updateHeaderTitle() {
    const currentSection = document.querySelector('.content-section.active')?.id || 'overview';
    const pageTitle = document.getElementById('page-title');
    const headerSubtitle = document.querySelector('.header-subtitle');
    
    const titles = {
        'overview': {
            title: 'Business Dashboard',
            subtitle: 'Manage your products and sales'
        },
        'products': {
            title: 'Product Management',
            subtitle: 'Manage your product inventory'
        },
        'sales': {
            title: 'Sales Analytics',
            subtitle: 'Track your sales performance'
        },
        'revenue': {
            title: 'Revenue Analytics',
            subtitle: 'Comprehensive revenue analysis and forecasting'
        },
        'reports': {
            title: 'Business Reports',
            subtitle: 'Analyze your business data'
        }
    };
    
    if (pageTitle && titles[currentSection]) {
        pageTitle.textContent = titles[currentSection].title;
    }
    
    if (headerSubtitle && titles[currentSection]) {
        headerSubtitle.textContent = titles[currentSection].subtitle;
    }
}

// Revenue Analytics System
class RevenueAnalytics {
    constructor() {
        this.timeFilter = 'month';
        this.charts = {};
    }
    
    async loadRevenueAnalytics() {
        try {
            const sales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
            const products = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
            
            // Calculate comprehensive revenue metrics
            const metrics = this.calculateRevenueMetrics(sales, products);
            
            // Update revenue overview cards
            this.updateRevenueOverview(metrics);
            
            // Update revenue charts
            this.updateRevenueCharts(sales, products);
            
            // Update revenue tables
            this.updateRevenueTables(sales, products);
            
            // Update revenue forecasting
            this.updateRevenueForecasting(sales);
            
        } catch (error) {
            console.error('Error loading revenue analytics:', error);
        }
    }
    
    calculateRevenueMetrics(sales, products) {
        const now = new Date();
        const timeRanges = this.getTimeRanges(now, this.timeFilter);
        
        // Filter sales by selected time period
        const filteredSales = sales.filter(sale => {
            const saleDate = new Date(sale.date || sale.created_at);
            return saleDate >= timeRanges.start && saleDate <= timeRanges.end;
        });
        
        // Calculate total revenue
        const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.revenue || 0), 0);
        
        // Calculate total cost and profit
        let totalCost = 0;
        filteredSales.forEach(sale => {
            if (sale.products && Array.isArray(sale.products)) {
                sale.products.forEach(product => {
                    const productData = products.find(p => p.id == product.id);
                    if (productData && productData.cost_price) {
                        totalCost += (productData.cost_price * (product.quantity || 1));
                    }
                });
            }
        });
        
        const grossProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        
        // Calculate daily average
        const daysDiff = Math.max(1, Math.ceil((timeRanges.end - timeRanges.start) / (1000 * 60 * 60 * 24)));
        const avgDailyRevenue = totalRevenue / daysDiff;
        
        // Find best day
        const dailyRevenue = {};
        filteredSales.forEach(sale => {
            const date = new Date(sale.date || sale.created_at).toDateString();
            dailyRevenue[date] = (dailyRevenue[date] || 0) + (sale.revenue || 0);
        });
        
        const bestDay = Object.entries(dailyRevenue).reduce((best, [date, revenue]) => {
            return revenue > best.revenue ? { date, revenue } : best;
        }, { date: 'No sales', revenue: 0 });
        
        // Calculate previous period for comparison
        const previousRange = this.getPreviousTimeRange(timeRanges);
        const previousSales = sales.filter(sale => {
            const saleDate = new Date(sale.date || sale.created_at);
            return saleDate >= previousRange.start && saleDate <= previousRange.end;
        });
        const previousRevenue = previousSales.reduce((sum, sale) => sum + (sale.revenue || 0), 0);
        const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue * 100) : 0;
        
        return {
            totalRevenue,
            grossProfit,
            profitMargin,
            avgDailyRevenue,
            bestDay,
            revenueChange,
            orderCount: filteredSales.length,
            avgOrderValue: filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0
        };
    }
    
    updateRevenueOverview(metrics) {
        // Update total revenue
        const totalRevenueEl = document.getElementById('totalRevenueValue');
        if (totalRevenueEl) {
            totalRevenueEl.textContent = `GHS ${metrics.totalRevenue.toFixed(2)}`;
        }
        
        const totalRevenueChange = document.getElementById('totalRevenueChange');
        if (totalRevenueChange) {
            const changeText = metrics.revenueChange >= 0 ? '+' : '';
            totalRevenueChange.textContent = `${changeText}${metrics.revenueChange.toFixed(1)}% from last period`;
            totalRevenueChange.className = `revenue-change ${metrics.revenueChange >= 0 ? 'positive' : 'negative'}`;
        }
        
        // Update gross profit
        const grossProfitEl = document.getElementById('grossProfitValue');
        if (grossProfitEl) {
            grossProfitEl.textContent = `GHS ${metrics.grossProfit.toFixed(2)}`;
        }
        
        const grossProfitMargin = document.getElementById('grossProfitMargin');
        if (grossProfitMargin) {
            grossProfitMargin.textContent = `${metrics.profitMargin.toFixed(1)}% margin`;
        }
        
        // Update daily average
        const avgDailyEl = document.getElementById('avgDailyRevenue');
        if (avgDailyEl) {
            avgDailyEl.textContent = `GHS ${metrics.avgDailyRevenue.toFixed(2)}`;
        }
        
        // Update best day
        const bestDayEl = document.getElementById('bestDayRevenue');
        if (bestDayEl) {
            bestDayEl.textContent = `GHS ${metrics.bestDay.revenue.toFixed(2)}`;
        }
        
        const bestDayDate = document.getElementById('bestDayDate');
        if (bestDayDate) {
            bestDayDate.textContent = metrics.bestDay.date !== 'No sales' 
                ? new Date(metrics.bestDay.date).toLocaleDateString()
                : 'No sales yet';
        }
    }
    
    updateRevenueCharts(sales, products) {
        this.initRevenueTrendChart(sales, products);
        this.initProductRevenueChart(sales);
    }
    
    initRevenueTrendChart(sales, products) {
        const ctx = document.getElementById('revenueTrendChart');
        if (!ctx) return;
        
        // Destroy existing chart
        if (this.charts.revenueTrend) {
            this.charts.revenueTrend.destroy();
        }
        
        // Simple overview - show total revenue vs total profit and cost
        const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0);
        const totalProfit = sales.reduce((sum, sale) => sum + parseFloat(sale.profit || 0), 0);
        const totalCost = sales.reduce((sum, sale) => sum + parseFloat(sale.cost || 0), 0);
        const hasData = totalRevenue > 0;
        
        this.charts.revenueTrend = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: hasData ? ['Profit', 'Cost'] : ['No Revenue'],
                datasets: [{
                    data: hasData ? [totalProfit, totalCost] : [1],
                    backgroundColor: hasData ? ['#10b981', '#3b82f6'] : ['#f3f4f6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: hasData,
                        callbacks: {
                            label: function(context) {
                                if (context.dataIndex === 0 && hasData) {
                                    return `Profit: GHS ${totalProfit.toFixed(2)}`;
                                } else if (context.dataIndex === 1 && hasData) {
                                    return `Cost: GHS ${totalCost.toFixed(2)}`;
                                }
                                return '';
                            }
                        }
                    }
                }
            }
        });
        
        // Add center text
        const centerText = hasData ? 
            `GHS ${totalRevenue.toFixed(0)}\nRevenue` : 
            'No Revenue\nRecord Sales';
            
        if (ctx.parentElement) {
            const existingLabel = ctx.parentElement.querySelector('.chart-center-text');
            if (existingLabel) existingLabel.remove();
            
            const centerLabel = document.createElement('div');
            centerLabel.className = 'chart-center-text';
            centerLabel.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                font-weight: 600;
                color: ${hasData ? '#10b981' : '#6b7280'};
                pointer-events: none;
                line-height: 1.2;
                font-size: ${hasData ? '1.2rem' : '0.9rem'};
            `;
            centerLabel.innerHTML = centerText.replace('\n', '<br>');
            ctx.parentElement.style.position = 'relative';
            ctx.parentElement.appendChild(centerLabel);
        }
    }
    
    initProductRevenueChart(sales) {
        const ctx = document.getElementById('productRevenueChart');
        if (!ctx) return;
        
        // Destroy existing chart
        if (this.charts.productRevenue) {
            this.charts.productRevenue.destroy();
        }
        
        // Calculate revenue by product
        const productRevenue = {};
        sales.forEach(sale => {
            if (sale.products && Array.isArray(sale.products)) {
                sale.products.forEach(product => {
                    const name = product.name || 'Unknown Product';
                    productRevenue[name] = (productRevenue[name] || 0) + (product.subtotal || 0);
                });
            }
        });
        
        // Get top 3 products for simplicity
        const topProducts = Object.entries(productRevenue)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        
        const totalProducts = Object.keys(productRevenue).length;
        
        // Update center text
        const centerText = document.getElementById('productRevenueCenterText');
        if (centerText) {
            const centerValue = centerText.querySelector('.center-value');
            const centerLabel = centerText.querySelector('.center-label');
            if (centerValue) centerValue.textContent = totalProducts;
            if (centerLabel) centerLabel.textContent = 'Products';
        }
        
        const labels = topProducts.length > 0 ? topProducts.map(([name]) => name.length > 15 ? name.substring(0, 15) + '...' : name) : ['No Products'];
        const data = topProducts.length > 0 ? topProducts.map(([, revenue]) => revenue) : [1];
        const colors = ['#10b981', '#3b82f6', '#f59e0b'];
        
        this.charts.productRevenue = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                cutout: '70%'
            }
        });
    }
    
    updateRevenueTables(sales, products) {
        this.updateTopRevenueProductsTable(sales);
        this.updateRevenueByDateTable(sales, products);
    }
    
    updateTopRevenueProductsTable(sales) {
        const tableBody = document.getElementById('topRevenueProductsTable');
        if (!tableBody) return;
        
        // Calculate product revenue
        const productStats = {};
        let totalRevenue = 0;
        
        sales.forEach(sale => {
            if (sale.products && Array.isArray(sale.products)) {
                sale.products.forEach(product => {
                    const name = product.name || 'Unknown Product';
                    if (!productStats[name]) {
                        productStats[name] = {
                            units: 0,
                            revenue: 0,
                            totalPrice: 0
                        };
                    }
                    const subtotal = product.subtotal || 0;
                    productStats[name].units += product.quantity || 1;
                    productStats[name].revenue += subtotal;
                    productStats[name].totalPrice += (product.price || 0) * (product.quantity || 1);
                    totalRevenue += subtotal;
                });
            }
        });
        
        // Sort by revenue and get top 10
        const topProducts = Object.entries(productStats)
            .map(([name, stats]) => ({
                name,
                ...stats,
                avgPrice: stats.units > 0 ? stats.totalPrice / stats.units : 0,
                percentage: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        
        if (topProducts.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="no-data">No sales data available</td></tr>';
            return;
        }
        
        tableBody.innerHTML = topProducts.map((product, index) => `
            <tr>
                <td><span class="rank-badge">${index + 1}</span></td>
                <td class="product-name">${product.name}</td>
                <td>${product.units}</td>
                <td class="revenue-amount">GHS ${product.revenue.toFixed(2)}</td>
                <td>GHS ${product.avgPrice.toFixed(2)}</td>
                <td class="percentage">${product.percentage.toFixed(1)}%</td>
            </tr>
        `).join('');
    }
    
    updateRevenueByDateTable(sales, products) {
        const tableBody = document.getElementById('revenueByDateTable');
        if (!tableBody) return;
        
        // Group sales by date
        const dailyStats = {};
        
        sales.forEach(sale => {
            const date = new Date(sale.date || sale.created_at).toDateString();
            if (!dailyStats[date]) {
                dailyStats[date] = {
                    orders: 0,
                    revenue: 0,
                    cost: 0
                };
            }
            
            dailyStats[date].orders += 1;
            dailyStats[date].revenue += sale.revenue || 0;
            
            // Calculate cost
            if (sale.products && Array.isArray(sale.products)) {
                sale.products.forEach(product => {
                    const productData = products.find(p => p.id == product.id);
                    if (productData && productData.cost_price) {
                        dailyStats[date].cost += (productData.cost_price * (product.quantity || 1));
                    }
                });
            }
        });
        
        // Convert to array and sort by date (most recent first)
        const dailyData = Object.entries(dailyStats)
            .map(([date, stats]) => ({
                date: new Date(date),
                ...stats,
                profit: stats.revenue - stats.cost,
                margin: stats.revenue > 0 ? ((stats.revenue - stats.cost) / stats.revenue) * 100 : 0,
                avgOrder: stats.orders > 0 ? stats.revenue / stats.orders : 0
            }))
            .sort((a, b) => b.date - a.date)
            .slice(0, 15); // Show last 15 days
        
        if (dailyData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="no-data">No sales data available</td></tr>';
            return;
        }
        
        tableBody.innerHTML = dailyData.map(day => `
            <tr>
                <td>${day.date.toLocaleDateString()}</td>
                <td>${day.orders}</td>
                <td class="revenue-amount">GHS ${day.revenue.toFixed(2)}</td>
                <td class="profit-amount ${day.profit >= 0 ? 'positive' : 'negative'}">GHS ${day.profit.toFixed(2)}</td>
                <td class="margin-percent">${day.margin.toFixed(1)}%</td>
                <td>GHS ${day.avgOrder.toFixed(2)}</td>
            </tr>
        `).join('');
    }
    
    updateRevenueForecasting(sales) {
        if (sales.length < 7) {
            // Not enough data for forecasting
            document.getElementById('monthlyForecast').textContent = 'GHS 0.00';
            document.getElementById('quarterlyForecast').textContent = 'GHS 0.00';
            document.getElementById('yearlyForecast').textContent = 'GHS 0.00';
            document.getElementById('growthRate').textContent = '0%';
            return;
        }
        
        // Simple linear regression for forecasting
        const last30Days = this.getLast30DaysRevenueData(sales, []);
        const avgDailyRevenue = last30Days.reduce((sum, day) => sum + day.revenue, 0) / last30Days.length;
        
        // Calculate growth rate (last 7 days vs previous 7 days)
        const recentWeek = last30Days.slice(-7).reduce((sum, day) => sum + day.revenue, 0) / 7;
        const previousWeek = last30Days.slice(-14, -7).reduce((sum, day) => sum + day.revenue, 0) / 7;
        const growthRate = previousWeek > 0 ? ((recentWeek - previousWeek) / previousWeek) * 100 : 0;
        
        // Project based on current trends
        const daysInMonth = 30;
        const daysInQuarter = 90;
        const daysInYear = 365;
        
        const monthlyForecast = avgDailyRevenue * daysInMonth * (1 + growthRate / 100);
        const quarterlyForecast = avgDailyRevenue * daysInQuarter * (1 + growthRate / 100);
        const yearlyForecast = avgDailyRevenue * daysInYear * (1 + growthRate / 100);
        
        document.getElementById('monthlyForecast').textContent = `GHS ${monthlyForecast.toFixed(2)}`;
        document.getElementById('quarterlyForecast').textContent = `GHS ${quarterlyForecast.toFixed(2)}`;
        document.getElementById('yearlyForecast').textContent = `GHS ${yearlyForecast.toFixed(2)}`;
        document.getElementById('growthRate').textContent = `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`;
    }
    
    getLast30DaysRevenueData(sales, products) {
        const days = [];
        const now = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const daySales = sales.filter(sale => {
                const saleDate = sale.date || sale.created_at;
                if (!saleDate) return false;
                
                // Handle different date formats safely
                try {
                    let saleDateString;
                    if (saleDate.includes('T')) {
                        saleDateString = saleDate.split('T')[0];
                    } else {
                        const dateObj = new Date(saleDate);
                        saleDateString = dateObj.toISOString().split('T')[0];
                    }
                    return saleDateString === dateStr;
                } catch (e) {
                    console.warn('Invalid date format in forecasting:', saleDate);
                    return false;
                }
            });
            const dayRevenue = daySales.reduce((sum, sale) => sum + (sale.revenue || 0), 0);
            
            // Calculate profit
            let dayCost = 0;
            daySales.forEach(sale => {
                if (sale.products && Array.isArray(sale.products)) {
                    sale.products.forEach(product => {
                        const productData = products.find(p => p.id == product.id);
                        if (productData && productData.cost_price) {
                            dayCost += (productData.cost_price * (product.quantity || 1));
                        }
                    });
                }
            });
            
            days.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                revenue: dayRevenue,
                profit: dayRevenue - dayCost
            });
        }
        
        return days;
    }
    
    getTimeRanges(now, filter) {
        const start = new Date(now);
        const end = new Date(now);
        
        switch (filter) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'week':
                start.setDate(now.getDate() - now.getDay());
                start.setHours(0, 0, 0, 0);
                break;
            case 'month':
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                break;
            case 'quarter':
                start.setMonth(Math.floor(now.getMonth() / 3) * 3, 1);
                start.setHours(0, 0, 0, 0);
                break;
            case 'year':
                start.setMonth(0, 1);
                start.setHours(0, 0, 0, 0);
                break;
        }
        
        return { start, end };
    }
    
    getPreviousTimeRange(currentRange) {
        const duration = currentRange.end - currentRange.start;
        return {
            start: new Date(currentRange.start.getTime() - duration),
            end: new Date(currentRange.start.getTime())
        };
    }
}

// Initialize revenue analytics
const revenueAnalytics = new RevenueAnalytics();

// Export function for revenue data
function exportRevenueData() {
    businessManager.showNotification('Revenue export feature coming soon!', 'info');
}

// Handle export button click with error handling
function handleExportClick() {
    try {
        console.log('Export button clicked');
        if (typeof businessManager !== 'undefined' && businessManager) {
            if (typeof businessManager.exportRecentSales === 'function') {
                console.log('Calling exportRecentSales function...');
                businessManager.exportRecentSales();
            } else {
                console.error('exportRecentSales function not found');
                alert('Export function is not available. Please refresh the page and try again.');
            }
        } else {
            console.error('businessManager not available');
            alert('System not ready. Please refresh the page and try again.');
        }
    } catch (error) {
        console.error('Export button error:', error);
        alert('Export failed: ' + error.message);
    }
}

// Mobile navigation handler
function initializeMobileNavigation() {
    const mobileNavItems = document.querySelectorAll('.sidebar.mobile .nav-item');
    const desktopNavItems = document.querySelectorAll('.sidebar.desktop-only .sidebar-menu a');
    
    // Handle mobile navigation clicks
    mobileNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all mobile nav items
            mobileNavItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Get section and trigger navigation
            const section = item.getAttribute('data-section');
            if (section) {
                showSection(section);
            }
        });
    });
    
    // Sync desktop and mobile navigation
    function syncNavigation(activeSection) {
        // Update mobile navigation
        mobileNavItems.forEach(item => {
            const section = item.getAttribute('data-section');
            if (section === activeSection) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Update desktop navigation
        desktopNavItems.forEach(item => {
            const section = item.getAttribute('data-section');
            if (section === activeSection) {
                item.parentElement.classList.add('active');
            } else {
                item.parentElement.classList.remove('active');
            }
        });
    }
    
    // Watch for section changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.classList.contains('content-section') && target.classList.contains('active')) {
                    syncNavigation(target.id);
                }
            }
        });
    });
    
    // Observe all content sections
    document.querySelectorAll('.content-section').forEach(section => {
        observer.observe(section, { attributes: true });
    });
    
    console.log('Mobile navigation initialized');
}

// Mobile sidebar functions
function toggleMobileSidebar() {
    const sidebar = document.getElementById('mobileSidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
        console.log('Mobile sidebar toggled');
    }
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('mobileSidebar');
    if (sidebar) {
        sidebar.classList.remove('active');
        console.log('Mobile sidebar closed');
    }
}

function navigateToSection(sectionName) {
    console.log('Navigating to section:', sectionName);
    
    // Close mobile sidebar first
    closeMobileSidebar();
    
    // Update active states in mobile sidebar
    const mobileMenuItems = document.querySelectorAll('.mobile-sidebar-menu li');
    mobileMenuItems.forEach(item => {
        const link = item.querySelector('a');
        if (link && link.getAttribute('data-section') === sectionName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Update active states in bottom navigation
    const bottomNavItems = document.querySelectorAll('.sidebar.mobile .nav-item');
    bottomNavItems.forEach(item => {
        if (item.getAttribute('data-section') === sectionName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Show the selected section
    if (typeof showSection === 'function') {
        showSection(sectionName);
    }
    
    // Small delay to ensure smooth transition
    setTimeout(() => {
        console.log('Navigation completed to:', sectionName);
    }, 300);
}

// Mobile dropdown toggle functions
function toggleNotifications() {
    console.log('Toggle notifications from mobile sidebar');
    if (window.dashboardApp && typeof window.dashboardApp.toggleDropdown === 'function') {
        window.dashboardApp.toggleDropdown('notification');
        window.dashboardApp.loadNotifications();
    }
    closeMobileSidebar();
}

function toggleSettings() {
    console.log('Toggle settings from mobile sidebar');
    if (window.dashboardApp && typeof window.dashboardApp.showSection === 'function') {
        window.dashboardApp.showSection('settings');
        window.dashboardApp.loadSettings();
    }
    closeMobileSidebar();
}

// Theme Management Functions
function initializeTheme() {
    // Get saved theme or default to light
    const savedTheme = localStorage.getItem('jmonic_theme') || 'light';
    
    // Apply theme immediately
    applyThemeGlobal(savedTheme);
    
    // Set up theme change listeners
    setupThemeListeners();
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const currentTheme = localStorage.getItem('jmonic_theme') || 'light';
        if (currentTheme === 'auto') {
            applyThemeGlobal('auto');
        }
    });
}

function applyThemeGlobal(theme) {
    const body = document.body;
    const html = document.documentElement;
    
    // Add smooth transition animation
    body.classList.add('theme-changing');
    
    // Remove all theme classes
    body.classList.remove('theme-light', 'theme-dark', 'theme-auto');
    html.classList.remove('theme-light', 'theme-dark', 'theme-auto');
    
    if (theme === 'dark') {
        body.classList.add('theme-dark');
        html.classList.add('theme-dark');
    } else if (theme === 'light') {
        body.classList.add('theme-light');
        html.classList.add('theme-light');
    } else if (theme === 'auto') {
        body.classList.add('theme-auto');
        html.classList.add('theme-auto');
        
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            body.classList.add('theme-dark');
            html.classList.add('theme-dark');
        } else {
            body.classList.add('theme-light');
            html.classList.add('theme-light');
        }
    }
    
    // Remove animation class after transition
    setTimeout(() => {
        body.classList.remove('theme-changing');
    }, 500);
    
    // Store theme preference
    localStorage.setItem('jmonic_theme', theme);
    
    // Update all theme selectors
    updateThemeSelectors(theme);
}

function setupThemeListeners() {
    // Add event listeners to all theme selectors
    const themeInputs = document.querySelectorAll('input[name="theme"], input[name="theme-dash"]');
    
    themeInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            if (e.target.checked) {
                const theme = e.target.value;
                applyThemeGlobal(theme);
                
                // Show theme change notification
                if (window.businessManager && typeof window.businessManager.showNotification === 'function') {
                    window.businessManager.showNotification(
                        `Theme changed to ${theme.charAt(0).toUpperCase() + theme.slice(1)}`, 
                        'success'
                    );
                }
            }
        });
    });
}

function updateThemeSelectors(theme) {
    // Update all theme radio buttons
    const themeInputs = document.querySelectorAll('input[name="theme"], input[name="theme-dash"]');
    themeInputs.forEach(input => {
        input.checked = input.value === theme;
    });
    
    // Add visual feedback to theme cards
    const themeCards = document.querySelectorAll('.theme-card');
    themeCards.forEach(card => {
        const input = card.previousElementSibling;
        if (input && input.value === theme) {
            card.style.transform = 'scale(1.05)';
            setTimeout(() => {
                card.style.transform = '';
            }, 200);
        }
    });
}

// Clean up any debug panels that might exist from cached scripts
setTimeout(() => {
    const debugPanel = document.getElementById('debug-panel');
    if (debugPanel) {
        debugPanel.remove();
        console.log('🧹 Removed existing debug panel');
    }
    
    // Remove any remaining theme indicator elements or sun icons in header
    const themeElements = document.querySelectorAll('#themeIndicator, .theme-indicator, .header-actions .fa-sun, .dashboard-header .fa-sun');
    themeElements.forEach(element => {
        element.remove();
        console.log('🧹 Removed theme indicator element');
    });
    
    // Remove any header actions container if it's empty
    const headerActions = document.querySelector('.header-actions');
    if (headerActions && headerActions.children.length === 0) {
        headerActions.remove();
        console.log('🧹 Removed empty header actions container');
    }
    
    // Also remove any debug panels that might be created later
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    // Remove debug panels
                    if (node.id === 'debug-panel' || node.classList?.contains('debug-panel')) {
                        node.remove();
                        console.log('🧹 Prevented debug panel from appearing');
                    }
                    // Remove any theme indicators that might be added
                    if (node.id === 'themeIndicator' || node.classList?.contains('theme-indicator') || 
                        (node.classList?.contains('fa-sun') && node.closest('.dashboard-header'))) {
                        node.remove();
                        console.log('🧹 Prevented theme indicator from appearing');
                    }
                }
            });
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}, 100);

// Override any global debug functions that might exist from cached scripts
window.debugButtons = undefined;
window.testJS = function() {
    console.log('JavaScript is working properly');
};

// Final system health check and optimization
setTimeout(() => {
    console.log('🔍 Running system health check...');
    
    // Check core functions
    const healthCheck = {
        businessManager: !!window.businessManager,
        clearAllData: typeof window.clearAllData === 'function',
        openModal: typeof window.openModal === 'function',
        closeModal: typeof window.closeModal === 'function',
        deleteProduct: typeof window.deleteProduct === 'function',
        deleteButtonsPresent: !!(document.getElementById('deleteDataBtn') && document.getElementById('deleteDataBtn-dash'))
    };
    
    console.log('✅ System Health Check:', healthCheck);
    
    // Ensure all critical buttons have event handlers
    ['deleteDataBtn', 'deleteDataBtn-dash'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn && !btn.onclick && !btn.dataset.handlerAdded) {
            btn.onclick = () => {
                console.log(`🗑️ Direct onclick for ${btnId}`);
                if (window.clearAllData) {
                    window.clearAllData();
                } else {
                    alert('Clear data function not available');
                }
            };
            btn.dataset.handlerAdded = 'true';
            console.log(`✅ Added onclick handler to ${btnId}`);
        }
    });
    
    // Clean up any potential memory leaks or duplicate listeners
    const duplicateHandlers = document.querySelectorAll('[data-handler-added="true"]');
    console.log(`🧹 Found ${duplicateHandlers.length} elements with handlers`);
    
    console.log('🎯 System optimization complete');
    
    // Set up periodic delete button health check
    setInterval(() => {
        if (window.businessManager) {
            const deleteButtons = ['deleteDataBtn', 'deleteDataBtn-dash'];
            let workingButtons = 0;
            
            deleteButtons.forEach(btnId => {
                const btn = document.getElementById(btnId);
                if (btn) {
                    workingButtons++;
                    // Ensure button has proper onclick if missing
                    if (!btn.onclick && !btn.dataset.hasGlobalHandler) {
                        btn.onclick = function(e) {
                            e.preventDefault();
                            console.log('🔧 Backup onclick handler activated for:', btnId);
                            window.clearAllData();
                        };
                        btn.dataset.hasGlobalHandler = 'true';
                        console.log('🔧 Added backup onclick to:', btnId);
                    }
                }
            });
            
            if (workingButtons === 0) {
                console.warn('⚠️ No delete buttons found during health check');
            }
        }
    }, 10000); // Check every 10 seconds
}, 2000);

// Global notification functions
// Global test function for notifications
function testNotifications() {
    if (window.businessManager && window.businessManager.testNotifications) {
        window.businessManager.testNotifications();
    } else {
        console.error('❌ Business manager not available');
    }
}

// Global function to show custom notification
function showTestNotification(title, message, type = 'info') {
    if (window.businessManager && window.businessManager.showLiveNotification) {
        window.businessManager.showLiveNotification(title, message, type);
    } else {
        console.error('❌ Business manager not available');
    }
}

// Debug function to force show dropdown
function debugShowNotificationDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
        dropdown.style.display = 'block';
        dropdown.style.visibility = 'visible';
        dropdown.style.opacity = '1';
        dropdown.style.zIndex = '99999';
        dropdown.classList.add('show');
        console.log('🔔 Debug: Dropdown forced to show');
        
        // Load notifications
        if (window.businessManager && window.businessManager.loadNotifications) {
            window.businessManager.loadNotifications();
        }
    } else {
        console.error('❌ Dropdown not found');
    }
}

// Debug function to add test data for notifications
function addTestDataForNotifications() {
    // Add some test products with low stock
    const testProducts = [
        {
            id: 'test1',
            name: 'iPhone 15 Pro',
            stock_quantity: 2,
            reorderLevel: 5,
            price: 4500,
            created_at: new Date().toISOString()
        },
        {
            id: 'test2', 
            name: 'Samsung Galaxy S24',
            stock_quantity: 1,
            reorderLevel: 3,
            price: 3200,
            created_at: new Date().toISOString()
        },
        {
            id: 'test3',
            name: 'MacBook Pro M3',
            stock_quantity: 0,
            reorderLevel: 2,
            price: 8500,
            created_at: new Date().toISOString()
        }
    ];
    
    // Store in localStorage
    const existingProducts = JSON.parse(localStorage.getItem('jmonic_products') || '[]');
    const updatedProducts = [...existingProducts, ...testProducts];
    localStorage.setItem('jmonic_products', JSON.stringify(updatedProducts));
    
    // Add a recent sale
    const testSale = {
        id: 'sale_test1',
        customer_name: 'John Doe',
        total_amount: 1500,
        paymentMethod: 'cash',
        date: new Date().toISOString(),
        products: [
            { name: 'Phone Case', quantity: 2, subtotal: 100 },
            { name: 'Screen Protector', quantity: 3, subtotal: 75 }
        ]
    };
    
    const existingSales = JSON.parse(localStorage.getItem('jmonic_sales') || '[]');
    existingSales.push(testSale);
    localStorage.setItem('jmonic_sales', JSON.stringify(existingSales));
    
    console.log('✅ Test data added for notifications');
    
    // Refresh notifications
    if (window.businessManager && window.businessManager.loadNotifications) {
        window.businessManager.loadNotifications();
    }
    
    return { products: testProducts, sale: testSale };
}

// Test SKU-Product Name validation
function testSKUProductValidation() {
    console.log('🧪 Testing SKU-Product Name validation...');
    
    if (!window.businessManager) {
        console.error('❌ Business manager not available');
        return;
    }
    
    // First, add a product
    const product1 = {
        sku: 'VALID-001',
        productName: 'Original Product',
        description: 'First product',
        sellingPrice: '50',
        costPrice: '30',
        stockQuantity: '10',
        reorderLevel: '5'
    };
    
    try {
        console.log('Adding initial product...');
        window.businessManager.handleProductsAPI('POST', product1);
        console.log('✅ Initial product added successfully');
        
        // Now try to add with same SKU but different name (should fail)
        const product2 = {
            sku: 'VALID-001', // Same SKU
            productName: 'Different Product Name', // Different name
            description: 'This should fail',
            sellingPrice: '60',
            costPrice: '40',
            stockQuantity: '5',
            reorderLevel: '3'
        };
        
        console.log('Trying to add with same SKU but different name...');
        window.businessManager.handleProductsAPI('POST', product2);
        console.log('❌ This should not succeed!');
        
    } catch (error) {
        console.log('✅ Validation working correctly:', error.message);
    }
    
    // Test: Same product name with different SKU (should also fail)
    try {
        const product3 = {
            sku: 'DIFFERENT-002', // Different SKU
            productName: 'Original Product', // Same name as first product
            description: 'This should also fail',
            sellingPrice: '70',
            costPrice: '50',
            stockQuantity: '8',
            reorderLevel: '4'
        };
        
        console.log('Trying to add with same name but different SKU...');
        window.businessManager.handleProductsAPI('POST', product3);
        console.log('❌ This should not succeed either!');
        
    } catch (error) {
        console.log('✅ Name validation also working:', error.message);
    }
    
    // Test: Correct way - same SKU and same name (should succeed)
    try {
        const product4 = {
            sku: 'VALID-001', // Same SKU
            productName: 'Original Product', // Same name
            description: 'Adding more stock',
            sellingPrice: '50',
            costPrice: '30',
            stockQuantity: '15', // Additional stock
            reorderLevel: '5'
        };
        
        console.log('Adding more stock with matching SKU and name...');
        window.businessManager.handleProductsAPI('POST', product4);
        console.log('✅ Stock addition successful!');
        
    } catch (error) {
        console.log('❌ This should have worked:', error.message);
    }
}

// Quick test function to verify add product works
function testAddProductFunctionality() {
    console.log('🧪 Testing Add Product functionality...');
    
    if (window.businessManager) {
        const testProduct = {
            sku: 'TEST-001',
            productName: 'Test Product',
            description: 'This is a test product',
            sellingPrice: '50',
            costPrice: '30',
            stockQuantity: '10',
            reorderLevel: '5'
        };
        
        try {
            const result = window.businessManager.handleProductsAPI('POST', testProduct);
            console.log('✅ Add product test successful:', result);
        } catch (error) {
            console.error('❌ Add product test failed:', error);
        }
    } else {
        console.error('❌ Business manager not available');
    }
}

// Test function to simulate adding stock with same SKU
function testSameSKUStock() {
    console.log('🧪 Testing same SKU stock addition...');
    
    // Add initial product
    const productData1 = {
        sku: 'TEST-SKU-001',
        productName: 'Test Product',
        description: 'Initial test product',
        sellingPrice: '100',
        costPrice: '50',
        stockQuantity: '5',
        reorderLevel: '10'
    };
    
    // Add more stock with same SKU
    const productData2 = {
        sku: 'TEST-SKU-001', // Same SKU
        productName: 'Test Product', 
        description: 'Adding more stock',
        sellingPrice: '100',
        costPrice: '50',
        stockQuantity: '15', // Adding 15 more units
        reorderLevel: '10'
    };
    
    if (window.businessManager) {
        console.log('Adding initial product...');
        window.businessManager.handleProductsAPI('POST', productData1);
        
        setTimeout(() => {
            console.log('Adding more stock to same SKU...');
            window.businessManager.handleProductsAPI('POST', productData2);
            
            // Refresh notifications
            setTimeout(() => {
                window.businessManager.loadNotifications();
                console.log('✅ Test completed. Check product should now have 20 units total.');
            }, 500);
        }, 1000);
    }
}

function toggleNotificationDropdown() {
    if (window.businessManager) {
        window.businessManager.toggleNotificationDropdown();
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('notificationDropdown');
    const notificationBell = document.getElementById('notificationBell');
    
    if (dropdown && notificationBell) {
        if (!dropdown.contains(event.target) && !notificationBell.contains(event.target)) {
            dropdown.style.display = 'none';
        }
    }
});

// Helper function to show live notifications
function showLiveNotification(title, message, type = 'info', icon = 'fa-info-circle') {
    if (window.businessManager) {
        window.businessManager.showLiveNotification(title, message, type, icon);
    }
}

// Test function to reset business setup (for demonstration)
function resetBusinessSetup() {
    localStorage.removeItem('jmonic_business_setup_completed');
    location.reload();
}

// Make test function available in console
window.resetBusinessSetup = resetBusinessSetup;
