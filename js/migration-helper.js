/**
 * Migration Helper - Transition from localStorage to Server-Based Authentication
 * This script helps migrate existing localStorage data to the server database
 */

class MigrationHelper {
    constructor() {
        this.baseUrl = this.getBaseUrl();
    }

    getBaseUrl() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3001';
        } else if (window.location.hostname.includes('onrender.com')) {
            return 'https://tridex1.onrender.com';
        } else {
            return 'https://tridex1.onrender.com';
        }
    }

    // Check if user has localStorage data that needs migration
    hasLocalStorageData() {
        const localStorageKeys = [
            'isLoggedIn', 'username', 'currentUser', 'token', 'userId',
            'cart', 'userWishlists', 'verifiedUsers', 'adminMessages'
        ];

        return localStorageKeys.some(key => localStorage.getItem(key) !== null);
    }

    // Get localStorage data for migration
    getLocalStorageData() {
        return {
            isLoggedIn: localStorage.getItem('isLoggedIn'),
            username: localStorage.getItem('username') || localStorage.getItem('currentUser'),
            token: localStorage.getItem('token'),
            userId: localStorage.getItem('userId'),
            cart: this.parseJSON(localStorage.getItem('cart')),
            userWishlists: this.parseJSON(localStorage.getItem('userWishlists')),
            verifiedUsers: this.parseJSON(localStorage.getItem('verifiedUsers')),
            adminMessages: this.parseJSON(localStorage.getItem('adminMessages'))
        };
    }

    parseJSON(jsonString) {
        try {
            return jsonString ? JSON.parse(jsonString) : null;
        } catch (error) {
            console.warn('Failed to parse JSON:', jsonString);
            return null;
        }
    }

    // Migrate cart data to server
    async migrateCartData(cartData) {
        if (!cartData || !Array.isArray(cartData) || cartData.length === 0) {
            return { success: true, message: 'No cart data to migrate' };
        }

        try {
            const results = [];
            for (const item of cartData) {
                try {
                    const response = await fetch(`${this.baseUrl}/cart/add`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            productId: item.productId || item.id,
                            quantity: item.quantity || 1,
                            isFlashSale: item.isFlashSale || false,
                            flashSalePrice: item.flashSalePrice,
                            originalPrice: item.originalPrice,
                            discountPercentage: item.discountPercentage || 0
                        })
                    });

                    if (response.ok) {
                        results.push({ success: true, item: item.productId });
                    } else {
                        results.push({ success: false, item: item.productId, error: response.status });
                    }
                } catch (error) {
                    results.push({ success: false, item: item.productId, error: error.message });
                }
            }

            const successCount = results.filter(r => r.success).length;
            return {
                success: successCount > 0,
                message: `Migrated ${successCount} of ${cartData.length} cart items`,
                details: results
            };
        } catch (error) {
            return { success: false, message: 'Cart migration failed', error: error.message };
        }
    }

    // Clean up localStorage after successful migration
    cleanupLocalStorage() {
        const keysToRemove = [
            'isLoggedIn', 'username', 'currentUser', 'token', 'userId',
            'cart', 'cartUser', 'userWishlists', 'verifiedUsers', 
            'adminMessages', 'isAdmin', 'verified', 'isGoogleUser',
            'adminLoginMethod'
        ];

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

        // Also remove user-specific cart data
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('cart_') || key.startsWith('mailLastSeen_')) {
                localStorage.removeItem(key);
            }
        });

        console.log('LocalStorage cleanup completed');
    }

    // Main migration function
    async performMigration() {
        console.log('Starting migration from localStorage to server...');

        if (!this.hasLocalStorageData()) {
            console.log('No localStorage data found, migration not needed');
            return { success: true, message: 'No migration needed' };
        }

        const localData = this.getLocalStorageData();
        console.log('Found localStorage data:', localData);

        // Check if user is logged in via server session
        try {
            const sessionResponse = await fetch(`${this.baseUrl}/auth/session`, {
                credentials: 'include'
            });

            if (!sessionResponse.ok) {
                console.log('No active server session, cannot migrate data');
                return { 
                    success: false, 
                    message: 'Please log in first to migrate your data',
                    requiresLogin: true
                };
            }

            const sessionData = await sessionResponse.json();
            console.log('Active session found:', sessionData);

            // Migrate cart data
            const cartMigration = await this.migrateCartData(localData.cart);
            console.log('Cart migration result:', cartMigration);

            // If migration was successful, clean up localStorage
            if (cartMigration.success) {
                this.cleanupLocalStorage();
                return {
                    success: true,
                    message: 'Migration completed successfully',
                    details: {
                        cart: cartMigration
                    }
                };
            } else {
                return {
                    success: false,
                    message: 'Migration partially failed',
                    details: {
                        cart: cartMigration
                    }
                };
            }

        } catch (error) {
            console.error('Migration error:', error);
            return {
                success: false,
                message: 'Migration failed due to network error',
                error: error.message
            };
        }
    }

    // Show migration status to user
    async showMigrationDialog() {
        if (!this.hasLocalStorageData()) {
            return;
        }

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        dialog.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; text-align: center;">
                <h3>🔄 Data Migration Available</h3>
                <p>We found some data stored locally in your browser. Would you like to migrate it to your account?</p>
                <div style="margin: 20px 0;">
                    <button id="migrate-yes" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; margin: 5px; cursor: pointer;">
                        Yes, Migrate My Data
                    </button>
                    <button id="migrate-no" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; margin: 5px; cursor: pointer;">
                        No, Clear Local Data
                    </button>
                </div>
                <div id="migration-status" style="margin-top: 15px; font-size: 14px;"></div>
            </div>
        `;

        document.body.appendChild(dialog);

        return new Promise((resolve) => {
            document.getElementById('migrate-yes').onclick = async () => {
                const statusDiv = document.getElementById('migration-status');
                statusDiv.innerHTML = '⏳ Migrating data...';
                
                const result = await this.performMigration();
                
                if (result.success) {
                    statusDiv.innerHTML = '✅ ' + result.message;
                    setTimeout(() => {
                        document.body.removeChild(dialog);
                        resolve(result);
                    }, 2000);
                } else {
                    statusDiv.innerHTML = '❌ ' + result.message;
                    if (result.requiresLogin) {
                        setTimeout(() => {
                            document.body.removeChild(dialog);
                            resolve(result);
                        }, 3000);
                    }
                }
            };

            document.getElementById('migrate-no').onclick = () => {
                this.cleanupLocalStorage();
                document.body.removeChild(dialog);
                resolve({ success: true, message: 'Local data cleared' });
            };
        });
    }
}

// Create global instance
window.migrationHelper = new MigrationHelper();

// Auto-run migration check on page load (after a delay to ensure other scripts are loaded)
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.migrationHelper && window.migrationHelper.hasLocalStorageData()) {
            // Only show migration dialog if AuthManager indicates user is logged in
            if (window.authManager && window.authManager.isUserLoggedIn()) {
                window.migrationHelper.showMigrationDialog();
            }
        }
    }, 2000);
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MigrationHelper;
}
