// Clear All Data Script for J'MONIC ENTERPRISE
// Run this in the browser console to start fresh

function clearAllBusinessData() {
    console.log('🗑️ Clearing all J\'MONIC ENTERPRISE data...');
    
    // Remove all stored data
    localStorage.removeItem('jmonic_products');
    localStorage.removeItem('jmonic_sales');
    localStorage.removeItem('jmonic_purchases');
    localStorage.removeItem('inventoryTransactions');
    
    // Clear any other related data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('jmonic_') || key.includes('hair') || key.includes('sample') || key.includes('demo'))) {
            keysToRemove.push(key);
        }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('✅ All data cleared successfully!');
    console.log('📋 Available sections:');
    console.log('   • Products - Add and manage your inventory');
    console.log('   • Sales - Record transactions and track performance');
    console.log('   • Inventory - Monitor stock levels and movements');
    console.log('   • Revenue - View analytics and forecasting');
    console.log('🔄 Refreshing page to show clean state...');
    
    // Refresh the page
    location.reload();
}

// Auto-run the clear function
clearAllBusinessData();