/**
 * Wishlist Management System for Tridex
 * Handles wishlist operations, UI updates, and persistence
 */

class WishlistManager {
    constructor() {
        this.wishlists = [];
        this.currentWishlist = null;
        this.isLoading = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserWishlists();
    }

    setupEventListeners() {
        // Global wishlist button listeners (for product cards)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.wishlist-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const btn = e.target.closest('.wishlist-btn');
                const productId = btn.dataset.productId;
                this.toggleWishlistItem(productId);
            }
        });

        // Wishlist page specific listeners
        if (window.location.pathname.includes('wishlist')) {
            this.setupWishlistPageListeners();
        }
    }

    setupWishlistPageListeners() {
        // Wishlist actions
        document.addEventListener('click', (e) => {
            // Check if it's a view-product link first - don't interfere with it
            const viewProductLink = e.target.closest('.view-product');
            if (viewProductLink) {
                // Let the onclick handler take care of it
                return;
            }

            if (e.target.closest('.remove-from-wishlist')) {
                e.preventDefault();
                e.stopPropagation();
                const btn = e.target.closest('.remove-from-wishlist');
                const productId = btn.dataset.productId;
                const wishlistId = btn.dataset.wishlistId;
                this.removeFromWishlist(wishlistId, productId);
                return;
            }

            if (e.target.closest('.move-to-cart')) {
                e.preventDefault();
                e.stopPropagation();
                const btn = e.target.closest('.move-to-cart');
                const productId = btn.dataset.productId;
                this.moveToCart(productId);
                return;
            }
        });
    }

    async loadUserWishlists() {
        try {
            let userId = localStorage.getItem('userId');
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            const username = localStorage.getItem('username');

            console.log('Wishlist Debug - UserId:', userId, 'IsLoggedIn:', isLoggedIn, 'Username:', username);

            if (!isLoggedIn) {
                console.log('User not logged in, skipping wishlist load');
                this.wishlists = [];
                this.updateWishlistUI();
                this.updateWishlistCounts();
                return;
            }

            // If userId is missing but user is logged in, try to fetch it
            if (!userId && username) {
                console.log('UserId missing, fetching from profile...');
                try {
                    const baseUrl = this.getBaseUrl();
                    const token = localStorage.getItem('token');
                    const profileResponse = await fetch(`${baseUrl}/users/profile?username=${encodeURIComponent(username)}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'X-Username': username
                        }
                    });
                    if (profileResponse.ok) {
                        const profileData = await profileResponse.json();
                        userId = profileData._id;
                        localStorage.setItem('userId', userId);
                        console.log('UserId fetched and stored:', userId);
                    } else {
                        console.error('Profile fetch failed:', profileResponse.status);

                        // Fallback for admin users - generate a temporary userId
                        if (username === 'admin' || localStorage.getItem('isAdmin') === 'true') {
                            userId = 'admin-' + Date.now();
                            localStorage.setItem('userId', userId);
                            console.log('Generated temporary admin userId:', userId);
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch userId:', error);

                    // Fallback for admin users - generate a temporary userId
                    if (username === 'admin' || localStorage.getItem('isAdmin') === 'true') {
                        userId = 'admin-' + Date.now();
                        localStorage.setItem('userId', userId);
                        console.log('Generated temporary admin userId:', userId);
                    }
                }
            }

            if (!userId) {
                console.log('No userId available, cannot load wishlists');
                this.wishlists = [];
                this.updateWishlistUI();
                this.updateWishlistCounts();
                return;
            }

            this.isLoading = true;
            this.showLoading();

            const baseUrl = this.getBaseUrl();
            console.log('Making wishlist API call to:', `${baseUrl}/wishlists`);

            const response = await fetch(`${baseUrl}/wishlists`, {
                headers: {
                    'userid': userId
                }
            });

            console.log('Wishlist API response status:', response.status);
            console.log('Wishlist API response headers:', Object.fromEntries(response.headers.entries()));

            const data = await this.handleJsonResponse(response);

            console.log('Wishlist API Response:', data);

            if (response.ok && data.wishlists) {
                this.wishlists = data.wishlists;
                this.updateWishlistUI();
                this.updateWishlistCounts();
            } else {
                console.error('Wishlist API Error:', data);

                // Handle specific error cases
                if (response.status === 401) {
                    this.showError('Please log in to view your wishlists');
                    // Clear invalid user data
                    localStorage.removeItem('userId');
                    localStorage.removeItem('isLoggedIn');
                } else if (response.status === 400 && data.message === 'Invalid user ID format') {
                    this.showError('Invalid user session. Please log in again.');
                    localStorage.removeItem('userId');
                    localStorage.removeItem('isLoggedIn');
                } else {
                    this.showError(data.message || 'Failed to load wishlists');
                }
            }

        } catch (error) {
            console.error('Error loading wishlists:', error);

            // Check if it's a login-related error
            if (error.message.includes('error page') || error.message.includes('logged in')) {
                this.showError('Please log in to view your wishlists');
                localStorage.removeItem('userId');
                localStorage.removeItem('isLoggedIn');
            } else {
                this.showError('Failed to load wishlists: ' + error.message);
            }
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    async toggleWishlistItem(productId) {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                this.showLoginPrompt();
                return;
            }

            // Check if item is already in any wishlist
            const existingItem = this.findProductInWishlists(productId);
            
            if (existingItem) {
                // Remove from wishlist
                await this.removeFromWishlist(existingItem.wishlistId, productId);
            } else {
                // Add to default wishlist
                await this.addToDefaultWishlist(productId);
            }

        } catch (error) {
            console.error('Error toggling wishlist item:', error);
            this.showError('Failed to update wishlist');
        }
    }

    async addToDefaultWishlist(productId) {
        try {
            const userId = localStorage.getItem('userId');
            const baseUrl = this.getBaseUrl();

            // First, try to add to existing default wishlist
            let response = await fetch(`${baseUrl}/wishlists/quick-add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'userid': userId
                },
                body: JSON.stringify({ productId })
            });

            let data = await this.handleJsonResponse(response);

            // If no default wishlist exists, create one automatically
            if (!response.ok && data.message && data.message.includes('No default wishlist found')) {
                console.log('No default wishlist found, creating one...');

                // Create default wishlist
                const createResponse = await fetch(`${baseUrl}/wishlists`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'userid': userId
                    },
                    body: JSON.stringify({
                        name: 'My Wishlist',
                        description: 'My favorite items',
                        isPublic: false
                    })
                });

                if (createResponse.ok) {
                    // Now try adding the product again
                    response = await fetch(`${baseUrl}/wishlists/quick-add`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'userid': userId
                        },
                        body: JSON.stringify({ productId })
                    });
                    data = await this.handleJsonResponse(response);
                }
            }

            if (response.ok) {
                this.showSuccess(data.message || 'Added to wishlist');
                this.updateWishlistButton(productId, true);
                this.loadUserWishlists(); // Refresh wishlists
            } else {
                this.showError(data.message || 'Failed to add to wishlist');
            }

        } catch (error) {
            console.error('Error adding to wishlist:', error);
            this.showError('Failed to add to wishlist');
        }
    }

    async removeFromWishlist(wishlistId, productId) {
        try {
            const userId = localStorage.getItem('userId');
            const baseUrl = this.getBaseUrl();

            const response = await fetch(`${baseUrl}/wishlists/${wishlistId}/items/${productId}`, {
                method: 'DELETE',
                headers: {
                    'userid': userId
                }
            });

            const data = await this.handleJsonResponse(response);

            if (response.ok) {
                this.showSuccess('Removed from wishlist');
                this.updateWishlistButton(productId, false);
                this.loadUserWishlists(); // Refresh wishlists
                
                // Remove from UI if on wishlist page
                const itemElement = document.querySelector(`[data-product-id="${productId}"]`);
                if (itemElement && window.location.pathname.includes('wishlist')) {
                    itemElement.remove();
                }
            } else {
                this.showError(data.message || 'Failed to remove from wishlist');
            }

        } catch (error) {
            console.error('Error removing from wishlist:', error);
            this.showError('Failed to remove from wishlist');
        }
    }



    findProductInWishlists(productId) {
        for (const wishlist of this.wishlists) {
            const item = wishlist.items.find(item => 
                item.productId._id === productId || item.productId === productId
            );
            if (item) {
                return { wishlistId: wishlist._id, item };
            }
        }
        return null;
    }

    updateWishlistButton(productId, isInWishlist) {
        const buttons = document.querySelectorAll(`[data-product-id="${productId}"] .wishlist-btn`);
        buttons.forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                if (isInWishlist) {
                    icon.className = 'fas fa-heart';
                    icon.style.color = '#e74c3c';
                    btn.title = 'Remove from Wishlist';
                } else {
                    icon.className = 'far fa-heart';
                    icon.style.color = '';
                    btn.title = 'Add to Wishlist';
                }
            }
        });
    }

    updateWishlistCounts() {
        const totalItems = this.wishlists.reduce((total, wishlist) => 
            total + wishlist.items.length, 0
        );

        // Update wishlist count in navigation
        const wishlistCountElements = document.querySelectorAll('.wishlist-count');
        wishlistCountElements.forEach(element => {
            element.textContent = totalItems;
            element.style.display = totalItems > 0 ? 'inline' : 'none';
        });
    }

    updateWishlistUI() {
        // Update wishlist buttons for products already in wishlists
        this.wishlists.forEach(wishlist => {
            wishlist.items.forEach(item => {
                const productId = item.productId._id || item.productId;
                this.updateWishlistButton(productId, true);
            });
        });

        // Update wishlist page if we're on it
        if (window.location.pathname.includes('wishlist')) {
            this.renderWishlistPage();
        }
    }

    renderWishlistPage() {
        const container = document.getElementById('wishlists-container');
        if (!container) return;

        if (this.wishlists.length === 0) {
            container.innerHTML = `
                <div class="empty-wishlist">
                    <i class="far fa-heart"></i>
                    <h3>Your wishlist is empty</h3>
                    <p>Save items you love to your wishlist</p>
                    <a href="index.html" class="browse-products-btn">Browse Products</a>
                </div>
            `;
            return;
        }

        // Display only the first (default) wishlist
        const defaultWishlist = this.wishlists.find(w => w.isDefault) || this.wishlists[0];
        if (defaultWishlist) {
            container.innerHTML = this.renderSingleWishlist(defaultWishlist);
        }
    }

    renderSingleWishlist(wishlist) {
        const itemsHTML = wishlist.items.map(item =>
            this.renderWishlistItem(item, wishlist._id)
        ).join('');

        return `
            <div class="single-wishlist" data-wishlist-id="${wishlist._id}">
                <div class="wishlist-info">
                    <div class="wishlist-stats">
                        <span class="item-count">${wishlist.items.length} ${wishlist.items.length === 1 ? 'item' : 'items'}</span>
                        ${wishlist.description ? `<span class="wishlist-description">${wishlist.description}</span>` : ''}
                    </div>
                </div>
                <div class="wishlist-items">
                    ${itemsHTML}
                </div>
            </div>
        `;
    }

    renderWishlistItem(item, wishlistId) {
        const product = item.productId;
        const imageUrl = product.image || (product.media && product.media[0] ? product.media[0].url : '/images/placeholder.jpg');
        const rating = product.averageRating || 0;
        const reviewCount = product.reviewCount || 0;



        return `
            <div class="wishlist-item" data-product-id="${product._id}">
                <div class="item-image">
                    <img src="${imageUrl}" alt="${product.name}" loading="lazy">
                </div>
                <div class="item-details">
                    <h4 class="item-name">${product.name}</h4>
                    ${product.brand ? `<p class="item-brand">${product.brand}</p>` : ''}
                    <div class="item-rating">
                        <div class="stars">${this.generateStars(rating)}</div>
                        <span class="review-count">(${reviewCount})</span>
                    </div>
                    <div class="item-price">$${product.price}</div>
                    <div class="item-availability ${product.isAvailable ? 'in-stock' : 'out-of-stock'}">
                        ${product.isAvailable ? 'In Stock' : 'Out of Stock'}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="move-to-cart" data-product-id="${product._id}" ${!product.isAvailable ? 'disabled' : ''} style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 5px; margin: 2px 0;">
                        <i class="fas fa-shopping-cart"></i>
                        Add to Cart
                    </button>
                    <button class="remove-from-wishlist" data-product-id="${product._id}" data-wishlist-id="${wishlistId}" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 5px; margin: 2px 0;">
                        <i class="fas fa-trash-alt"></i>
                        Remove
                    </button>
                    <button class="view-product" onclick="window.location.href = 'product-details.html?id=${product._id}';" style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 5px; margin: 2px 0;">
                        <i class="fas fa-eye"></i>
                        View Details
                    </button>
                </div>
            </div>
        `;
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let starsHTML = '';
        
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<i class="fas fa-star"></i>';
        }
        
        if (hasHalfStar) {
            starsHTML += '<i class="fas fa-star-half-alt"></i>';
        }
        
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '<i class="far fa-star"></i>';
        }

        return starsHTML;
    }

    async moveToCart(productId) {
        try {
            // Add to cart logic here
            console.log('Moving to cart:', productId);
            this.showSuccess('Added to cart!');

            // Optionally remove from wishlist after adding to cart
            const existingItem = this.findProductInWishlists(productId);
            if (existingItem) {
                await this.removeFromWishlist(existingItem.wishlistId, productId);
            }

        } catch (error) {
            console.error('Error moving to cart:', error);
            this.showError('Failed to add to cart');
        }
    }



    showLoginPrompt() {
        const shouldLogin = confirm('Please log in to add items to your wishlist. Would you like to go to the login page?');
        if (shouldLogin) {
            window.location.href = 'login.html';
        }
    }

    showLoading() {
        const loader = document.getElementById('wishlist-loading');
        if (loader) {
            loader.style.display = 'flex';
        }
    }

    hideLoading() {
        const loader = document.getElementById('wishlist-loading');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // Public methods for external use
    getWishlists() {
        return this.wishlists;
    }

    getWishlistItemCount() {
        return this.wishlists.reduce((total, wishlist) =>
            total + wishlist.items.length, 0
        );
    }

    isProductInWishlist(productId) {
        return this.findProductInWishlists(productId) !== null;
    }

    async refreshWishlists() {
        await this.loadUserWishlists();
    }

    async handleJsonResponse(response) {
        // Helper function to safely parse JSON responses
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            const text = await response.text();
            console.error('Non-JSON response received. Status:', response.status);
            console.error('Content-Type:', contentType);
            console.error('Response text:', text.substring(0, 300));

            // Check if it's an HTML error page
            if (text.includes('<!DOCTYPE') || text.includes('<html')) {
                if (response.status === 404) {
                    throw new Error('Wishlist API endpoint not found. The server may be down or the endpoint may not exist.');
                } else {
                    throw new Error(`Server returned an error page (${response.status}). Please check if you are logged in and try again.`);
                }
            } else {
                throw new Error(`Server returned non-JSON response (${response.status}): ` + text.substring(0, 100));
            }
        }
    }

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
}

// Initialize wishlist manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.wishlistManager = new WishlistManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WishlistManager;
}
