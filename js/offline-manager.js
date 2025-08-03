/**
 * Tridex Offline Manager - Phase 2A Implementation
 * Handles offline product browsing, data caching, and sync when online
 */

class OfflineManager {
    constructor() {
        this.dbName = 'TridexOfflineDB';
        this.dbVersion = 1;
        this.db = null;
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        
        this.init();
    }

    async init() {
        console.log('Offline Manager: Initializing...');
        
        // Initialize IndexedDB
        await this.initDatabase();
        
        // Setup network detection
        this.setupNetworkDetection();
        
        // Setup sync queue
        this.setupSyncQueue();
        
        // Load cached data if offline
        if (!this.isOnline) {
            await this.loadOfflineData();
        }
        
        console.log('Offline Manager: Initialization complete');
    }

    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('Offline Manager: Database error:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('Offline Manager: Database opened successfully');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                this.createObjectStores(db);
            };
        });
    }

    createObjectStores(db) {
        // Products store
        if (!db.objectStoreNames.contains('products')) {
            const productsStore = db.createObjectStore('products', { keyPath: '_id' });
            productsStore.createIndex('category', 'category', { unique: false });
            productsStore.createIndex('name', 'name', { unique: false });
            productsStore.createIndex('price', 'price', { unique: false });
        }
        
        // Categories store
        if (!db.objectStoreNames.contains('categories')) {
            const categoriesStore = db.createObjectStore('categories', { keyPath: '_id' });
            categoriesStore.createIndex('name', 'name', { unique: false });
        }
        
        // Wishlists store
        if (!db.objectStoreNames.contains('wishlists')) {
            const wishlistsStore = db.createObjectStore('wishlists', { keyPath: '_id' });
            wishlistsStore.createIndex('userId', 'userId', { unique: false });
        }
        
        // Cart store
        if (!db.objectStoreNames.contains('cart')) {
            const cartStore = db.createObjectStore('cart', { keyPath: 'productId' });
            cartStore.createIndex('userId', 'userId', { unique: false });
        }
        
        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
            const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
            syncStore.createIndex('type', 'type', { unique: false });
            syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        console.log('Offline Manager: Object stores created');
    }

    setupNetworkDetection() {
        window.addEventListener('online', async () => {
            console.log('Offline Manager: Back online');
            this.isOnline = true;
            this.showNetworkStatus('online');
            await this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            console.log('Offline Manager: Gone offline');
            this.isOnline = false;
            this.showNetworkStatus('offline');
        });
    }

    setupSyncQueue() {
        // Listen for data changes that need syncing
        window.addEventListener('cart-updated', (event) => {
            if (!this.isOnline) {
                this.addToSyncQueue('cart', event.detail);
            }
        });

        window.addEventListener('wishlist-updated', (event) => {
            if (!this.isOnline) {
                this.addToSyncQueue('wishlist', event.detail);
            }
        });
    }

    // Data caching methods
    async cacheProducts(products) {
        try {
            const transaction = this.db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');
            
            for (const product of products) {
                await store.put({
                    ...product,
                    cachedAt: Date.now()
                });
            }
            
            console.log(`Offline Manager: Cached ${products.length} products`);
        } catch (error) {
            console.error('Offline Manager: Error caching products:', error);
        }
    }

    async cacheCategories(categories) {
        try {
            const transaction = this.db.transaction(['categories'], 'readwrite');
            const store = transaction.objectStore('categories');
            
            for (const category of categories) {
                await store.put({
                    ...category,
                    cachedAt: Date.now()
                });
            }
            
            console.log(`Offline Manager: Cached ${categories.length} categories`);
        } catch (error) {
            console.error('Offline Manager: Error caching categories:', error);
        }
    }

    async cacheWishlists(wishlists) {
        try {
            const transaction = this.db.transaction(['wishlists'], 'readwrite');
            const store = transaction.objectStore('wishlists');
            
            for (const wishlist of wishlists) {
                await store.put({
                    ...wishlist,
                    cachedAt: Date.now()
                });
            }
            
            console.log(`Offline Manager: Cached ${wishlists.length} wishlists`);
        } catch (error) {
            console.error('Offline Manager: Error caching wishlists:', error);
        }
    }

    async cacheCartItems(cartItems) {
        try {
            const transaction = this.db.transaction(['cart'], 'readwrite');
            const store = transaction.objectStore('cart');
            
            for (const item of cartItems) {
                await store.put({
                    ...item,
                    cachedAt: Date.now()
                });
            }
            
            console.log(`Offline Manager: Cached ${cartItems.length} cart items`);
        } catch (error) {
            console.error('Offline Manager: Error caching cart items:', error);
        }
    }

    // Data retrieval methods
    async getCachedProducts(limit = 50) {
        try {
            const transaction = this.db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const request = store.getAll();
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const products = request.result.slice(0, limit);
                    console.log(`Offline Manager: Retrieved ${products.length} cached products`);
                    resolve(products);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Offline Manager: Error retrieving cached products:', error);
            return [];
        }
    }

    async getCachedCategories() {
        try {
            const transaction = this.db.transaction(['categories'], 'readonly');
            const store = transaction.objectStore('categories');
            const request = store.getAll();
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log(`Offline Manager: Retrieved ${request.result.length} cached categories`);
                    resolve(request.result);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Offline Manager: Error retrieving cached categories:', error);
            return [];
        }
    }

    async getCachedWishlists(userId) {
        try {
            const transaction = this.db.transaction(['wishlists'], 'readonly');
            const store = transaction.objectStore('wishlists');
            const index = store.index('userId');
            const request = index.getAll(userId);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log(`Offline Manager: Retrieved ${request.result.length} cached wishlists`);
                    resolve(request.result);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Offline Manager: Error retrieving cached wishlists:', error);
            return [];
        }
    }

    async getCachedCartItems(userId) {
        try {
            const transaction = this.db.transaction(['cart'], 'readonly');
            const store = transaction.objectStore('cart');
            const index = store.index('userId');
            const request = index.getAll(userId);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log(`Offline Manager: Retrieved ${request.result.length} cached cart items`);
                    resolve(request.result);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Offline Manager: Error retrieving cached cart items:', error);
            return [];
        }
    }

    // Sync queue methods
    async addToSyncQueue(type, data) {
        try {
            const transaction = this.db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            
            await store.add({
                type: type,
                data: data,
                timestamp: Date.now(),
                retries: 0
            });
            
            console.log(`Offline Manager: Added ${type} to sync queue`);
        } catch (error) {
            console.error('Offline Manager: Error adding to sync queue:', error);
        }
    }

    async getSyncQueue() {
        try {
            const transaction = this.db.transaction(['syncQueue'], 'readonly');
            const store = transaction.objectStore('syncQueue');
            const request = store.getAll();
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Offline Manager: Error retrieving sync queue:', error);
            return [];
        }
    }

    async clearSyncQueue() {
        try {
            const transaction = this.db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            await store.clear();
            
            console.log('Offline Manager: Sync queue cleared');
        } catch (error) {
            console.error('Offline Manager: Error clearing sync queue:', error);
        }
    }

    // Sync methods
    async syncOfflineData() {
        if (!this.isOnline) {
            console.log('Offline Manager: Cannot sync - still offline');
            return;
        }

        console.log('Offline Manager: Starting sync...');
        
        const syncQueue = await this.getSyncQueue();
        
        for (const item of syncQueue) {
            try {
                await this.syncItem(item);
                await this.removeSyncItem(item.id);
            } catch (error) {
                console.error('Offline Manager: Sync failed for item:', item, error);
                await this.incrementRetryCount(item.id);
            }
        }
        
        console.log('Offline Manager: Sync complete');
        this.showSyncStatus('complete');
    }

    async syncItem(item) {
        const baseUrl = this.getBaseUrl();
        
        switch (item.type) {
            case 'cart':
                await fetch(`${baseUrl}/api/cart/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item.data)
                });
                break;
                
            case 'wishlist':
                await fetch(`${baseUrl}/api/wishlist/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item.data)
                });
                break;
                
            default:
                console.warn('Offline Manager: Unknown sync type:', item.type);
        }
    }

    async removeSyncItem(id) {
        try {
            const transaction = this.db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            await store.delete(id);
        } catch (error) {
            console.error('Offline Manager: Error removing sync item:', error);
        }
    }

    async incrementRetryCount(id) {
        try {
            const transaction = this.db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const item = await store.get(id);
            
            if (item) {
                item.retries = (item.retries || 0) + 1;
                
                // Remove items that have failed too many times
                if (item.retries > 3) {
                    await store.delete(id);
                    console.log('Offline Manager: Removed item after max retries:', id);
                } else {
                    await store.put(item);
                }
            }
        } catch (error) {
            console.error('Offline Manager: Error updating retry count:', error);
        }
    }

    // UI methods
    showNetworkStatus(status) {
        // Create or update network status indicator
        let indicator = document.getElementById('network-status-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'network-status-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 500;
                z-index: 10000;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(indicator);
        }
        
        if (status === 'online') {
            indicator.textContent = '🟢 Back Online';
            indicator.style.background = '#d4edda';
            indicator.style.color = '#155724';
            indicator.style.border = '1px solid #c3e6cb';
            
            // Hide after 3 seconds
            setTimeout(() => {
                indicator.style.display = 'none';
            }, 3000);
        } else {
            indicator.textContent = '🔴 Offline Mode';
            indicator.style.background = '#f8d7da';
            indicator.style.color = '#721c24';
            indicator.style.border = '1px solid #f5c6cb';
            indicator.style.display = 'block';
        }
    }

    showSyncStatus(status) {
        if (status === 'complete') {
            this.showNotification('📡 Data synchronized successfully!', 'success');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            ${type === 'success' ? 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : 
              type === 'error' ? 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;' :
              'background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb;'}
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }

    async loadOfflineData() {
        console.log('Offline Manager: Loading offline data...');
        
        // Load cached products and display them
        const products = await this.getCachedProducts();
        if (products.length > 0) {
            this.displayOfflineProducts(products);
        }
        
        // Load cached categories
        const categories = await this.getCachedCategories();
        if (categories.length > 0) {
            this.displayOfflineCategories(categories);
        }
        
        this.showNotification('📱 Browsing in offline mode', 'info');
    }

    displayOfflineProducts(products) {
        // This would integrate with your existing product display logic
        console.log('Offline Manager: Displaying offline products:', products.length);
        
        // Trigger custom event for other components to handle
        window.dispatchEvent(new CustomEvent('offline-products-loaded', {
            detail: { products }
        }));
    }

    displayOfflineCategories(categories) {
        // This would integrate with your existing category display logic
        console.log('Offline Manager: Displaying offline categories:', categories.length);
        
        // Trigger custom event for other components to handle
        window.dispatchEvent(new CustomEvent('offline-categories-loaded', {
            detail: { categories }
        }));
    }

    // Utility methods
    getBaseUrl() {
        // Check if we're in a real development environment (running a local server)
        const isLocalDevelopment = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            && window.location.port !== '' && window.location.port !== '80' && window.location.port !== '443';

        if (isLocalDevelopment) {
            // Only use localhost if we're actually running on a development port
            return 'http://localhost:3000';
        } else {
            // For all other cases (including file:// protocol, GitHub Pages, or production), use production server
            return 'https://tridex1.onrender.com';
        }
    }

    // Public API methods
    async isDataCached() {
        const products = await this.getCachedProducts(1);
        return products.length > 0;
    }

    async getCacheSize() {
        const products = await this.getCachedProducts();
        const categories = await this.getCachedCategories();
        return {
            products: products.length,
            categories: categories.length
        };
    }

    async clearCache() {
        try {
            const transaction = this.db.transaction(['products', 'categories', 'wishlists', 'cart'], 'readwrite');
            
            await Promise.all([
                transaction.objectStore('products').clear(),
                transaction.objectStore('categories').clear(),
                transaction.objectStore('wishlists').clear(),
                transaction.objectStore('cart').clear()
            ]);
            
            console.log('Offline Manager: Cache cleared');
            this.showNotification('🗑️ Offline cache cleared', 'info');
        } catch (error) {
            console.error('Offline Manager: Error clearing cache:', error);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.offlineManager = new OfflineManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OfflineManager;
}
