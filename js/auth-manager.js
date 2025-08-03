/**
 * Authentication Manager - Server-Side Session Based
 * Replaces localStorage-based authentication with proper server sessions
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.baseUrl = this.getBaseUrl();

        // Version check for cache busting - Updated: 2025-01-03
        console.log('🔄 AuthManager v2.1 - Cache busted');

        // Initialize on page load
        this.init();
    }

    getBaseUrl() {
        // Check if we're in a real development environment (running a local server)
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const currentPort = window.location.port;

        // Only use localhost:3000 if we're on port 3000 (actual Node.js server)
        // For Live Server (port 5500) or other ports, use production server
        if (isLocalhost && currentPort === '3000') {
            console.log('🔧 AuthManager: Using development server (Node.js)');
            return 'http://localhost:3000';
        } else {
            // For all other cases (Live Server, file://, GitHub Pages, production), use production server
            console.log('🌐 AuthManager: Using production server');
            return 'https://tridex1.onrender.com';
        }
    }

    async init() {
        console.log('AuthManager: Initializing...');
        await this.checkSession();
        this.updateUI();
        console.log('AuthManager: Initialized');
    }

    async checkSession() {
        try {
            const response = await fetch(`${this.baseUrl}/auth/session`, {
                credentials: 'include' // Include session cookies
            });

            if (response.ok) {
                const sessionData = await response.json();
                this.currentUser = {
                    userId: sessionData.userId,
                    username: sessionData.username
                };
                this.isLoggedIn = true;
                console.log('AuthManager: User session found:', this.currentUser);
            } else if (response.status === 401) {
                // 401 is expected when no session exists - this is normal
                this.currentUser = null;
                this.isLoggedIn = false;
                console.log('AuthManager: No active session (expected)');
            } else {
                // Other errors are unexpected
                this.currentUser = null;
                this.isLoggedIn = false;
                console.warn('AuthManager: Unexpected response:', response.status);
            }
        } catch (error) {
            console.error('AuthManager: Error checking session:', error);
            this.currentUser = null;
            this.isLoggedIn = false;
        }
    }

    async login(username, password) {
        try {
            const response = await fetch(`${this.baseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = {
                    userId: data.userId,
                    username: data.username
                };
                this.isLoggedIn = true;
                this.updateUI();
                return { success: true, data };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('AuthManager: Login error:', error);
            return { success: false, message: 'Network error' };
        }
    }

    async logout() {
        try {
            const response = await fetch(`${this.baseUrl}/logout`, {
                method: 'POST',
                credentials: 'include'
            });

            // Clear local state regardless of server response
            this.currentUser = null;
            this.isLoggedIn = false;
            this.updateUI();

            if (response.ok) {
                console.log('AuthManager: Logged out successfully');
            } else {
                console.warn('AuthManager: Server logout failed, but local state cleared');
            }

            return true;
        } catch (error) {
            console.error('AuthManager: Logout error:', error);
            // Still clear local state
            this.currentUser = null;
            this.isLoggedIn = false;
            this.updateUI();
            return false;
        }
    }

    updateUI() {
        // Update login/logout buttons
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const profileBtn = document.getElementById('profile-btn');
        const usernameDisplay = document.getElementById('username-display');

        if (this.isLoggedIn && this.currentUser) {
            // Show logged-in state
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'block';
            if (profileBtn) profileBtn.style.display = 'block';
            if (usernameDisplay) {
                usernameDisplay.innerHTML = `Welcome, <span style="text-transform:uppercase; letter-spacing:0.5px; font-weight:500;">${this.currentUser.username}</span>`;
            }
        } else {
            // Show logged-out state
            if (loginBtn) loginBtn.style.display = 'block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (profileBtn) profileBtn.style.display = 'none';
            if (usernameDisplay) usernameDisplay.innerHTML = '';
        }

        // Update cart and wishlist counts
        this.updateCartCount();
        this.updateWishlistCount();
    }

    async updateCartCount() {
        if (!this.isLoggedIn) {
            const cartCountElement = document.getElementById('cart-count');
            if (cartCountElement) cartCountElement.textContent = '0';
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/cart`, {
                credentials: 'include'
            });

            if (response.ok) {
                const cartData = await response.json();
                const cartCountElement = document.getElementById('cart-count');
                if (cartCountElement) {
                    cartCountElement.textContent = cartData.itemCount || 0;
                }
            }
        } catch (error) {
            console.error('AuthManager: Error updating cart count:', error);
        }
    }

    async updateWishlistCount() {
        if (!this.isLoggedIn) {
            const wishlistCountElements = document.querySelectorAll('#wishlist-count, #dropdown-wishlist-count');
            wishlistCountElements.forEach(el => el.textContent = '0');
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/wishlists`, {
                credentials: 'include'
            });

            if (response.ok) {
                const wishlistData = await response.json();
                const totalItems = wishlistData.wishlists.reduce((total, wishlist) => 
                    total + (wishlist.items ? wishlist.items.length : 0), 0
                );
                
                const wishlistCountElements = document.querySelectorAll('#wishlist-count, #dropdown-wishlist-count');
                wishlistCountElements.forEach(el => el.textContent = totalItems);
            }
        } catch (error) {
            console.error('AuthManager: Error updating wishlist count:', error);
        }
    }

    // Getter methods for other components
    getUserId() {
        return this.currentUser ? this.currentUser.userId : null;
    }

    getUsername() {
        return this.currentUser ? this.currentUser.username : null;
    }

    isUserLoggedIn() {
        return this.isLoggedIn;
    }

    // Method to refresh session (useful after login/logout)
    async refreshSession() {
        await this.checkSession();
        this.updateUI();
    }
}

// Create global instance
window.authManager = new AuthManager();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
