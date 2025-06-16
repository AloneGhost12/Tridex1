/**
 * Coupon System for Tridex E-commerce Platform
 * Handles coupon validation, application, and management
 */

class CouponSystem {
    constructor() {
        console.log('🎫 Initializing Coupon System...');
        this.appliedCoupons = [];
        this.availableCoupons = [];
        this.cartTotal = 0;
        this.cartItems = [];
        this.userId = localStorage.getItem('userId');

        console.log('🔑 User ID from localStorage:', this.userId);
        this.init();
    }

    init() {
        console.log('🚀 Starting coupon system initialization...');
        this.setupEventListeners();
        this.loadAvailableCoupons();
        this.loadCartData();
    }

    setupEventListeners() {
        // Coupon input form
        const couponForm = document.getElementById('coupon-form');
        if (couponForm) {
            couponForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.applyCoupon();
            });
        }

        // Remove coupon buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-coupon-btn')) {
                const couponCode = e.target.dataset.couponCode;
                this.removeCoupon(couponCode);
            }
        });

        // Available coupon click handlers
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('apply-available-coupon')) {
                const couponCode = e.target.dataset.couponCode;
                this.applyCouponByCode(couponCode);
            }
        });
    }

    async loadAvailableCoupons() {
        try {
            const baseUrl = this.getBaseUrl();
            const headers = {};

            // Only send userid header if we have a valid user ID (24 character MongoDB ObjectId)
            if (this.userId && this.userId.length === 24 && /^[0-9a-fA-F]{24}$/.test(this.userId)) {
                headers.userid = this.userId;
                console.log('🔑 Including user ID in request:', this.userId);
            } else if (this.userId) {
                console.warn('⚠️ Invalid user ID format, skipping user-specific filtering:', this.userId);
            }

            console.log('🎫 Loading available coupons from:', `${baseUrl}/coupons/public`);
            console.log('📤 Request headers:', headers);

            const response = await fetch(`${baseUrl}/coupons/public`, {
                headers,
                method: 'GET',
                mode: 'cors',
                credentials: 'include'
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response ok:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Response error text:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📦 Received coupon data:', data);

            if (!data || typeof data !== 'object') {
                throw new Error('Invalid response format');
            }

            this.availableCoupons = data.coupons || [];
            console.log(`✅ Loaded ${this.availableCoupons.length} available coupons`);

            try {
                this.displayAvailableCoupons();
                console.log('✅ Coupons displayed successfully');
            } catch (displayError) {
                console.error('❌ Error displaying coupons:', displayError);
                throw new Error(`Failed to display coupons: ${displayError.message}`);
            }

        } catch (error) {
            console.error('❌ Error loading available coupons:', error);
            console.error('❌ Error stack:', error.stack);

            // Show error message to user
            const container = document.getElementById('available-coupons');
            if (container) {
                container.innerHTML = `
                    <p style="color: #dc3545; text-align: center;">
                        Unable to load available offers. Please try again later.
                    </p>
                    <p style="color: #6c757d; text-align: center; font-size: 0.8em;">
                        Error: ${error.message}
                    </p>
                    <button onclick="window.couponSystem.loadAvailableCoupons()"
                            style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                        Retry Loading Coupons
                    </button>
                `;
            } else {
                console.warn('⚠️ Available coupons container not found in DOM');
            }
        }
    }

    displayAvailableCoupons() {
        const container = document.getElementById('available-coupons');
        console.log('🎨 Displaying coupons in container:', container);

        if (!container) {
            console.warn('⚠️ Available coupons container not found! Available containers:');
            const allContainers = document.querySelectorAll('[id*="coupon"]');
            console.log('Available coupon-related elements:', allContainers);
            return;
        }

        if (this.availableCoupons.length === 0) {
            console.log('📭 No coupons to display');
            container.innerHTML = '<p class="no-coupons">No coupons available at the moment.</p>';
            return;
        }

        console.log(`🎫 Displaying ${this.availableCoupons.length} coupons`);
        this.availableCoupons.forEach(coupon => {
            console.log(`  - ${coupon.code}: ${this.getDiscountText(coupon)}`);
        });

        const couponsHTML = this.availableCoupons.map(coupon => `
            <div class="coupon-card" data-coupon-id="${coupon._id}">
                <div class="coupon-header">
                    <span class="coupon-code">${coupon.code}</span>
                    <span class="coupon-type">${this.getDiscountText(coupon)}</span>
                </div>
                <div class="coupon-details">
                    <h4>${coupon.name}</h4>
                    <p>${coupon.description || 'No description available'}</p>
                    ${coupon.minimumOrderValue > 0 ?
                        `<p class="min-order">Min order: ₹${coupon.minimumOrderValue}</p>` : ''
                    }
                    <p class="expiry">Expires: ${new Date(coupon.endDate).toLocaleDateString()}</p>
                </div>
                <button class="apply-available-coupon" data-coupon-code="${coupon.code}">
                    Apply Coupon
                </button>
            </div>
        `).join('');

        container.innerHTML = couponsHTML;
        console.log('✅ Coupons displayed successfully');
    }

    getDiscountText(coupon) {
        switch (coupon.discountType) {
            case 'percentage':
                return `${coupon.discountValue}% OFF${coupon.maxDiscountAmount ? ` (Max ₹${coupon.maxDiscountAmount})` : ''}`;
            case 'fixed':
                return `₹${coupon.discountValue} OFF`;
            case 'free_shipping':
                return 'FREE SHIPPING';
            case 'buy_x_get_y':
                return `Buy ${coupon.buyXGetY?.buyQuantity || 1} Get ${coupon.buyXGetY?.getQuantity || 1}`;
            default:
                return 'DISCOUNT';
        }
    }

    async applyCoupon() {
        const couponInput = document.getElementById('coupon-input');
        if (!couponInput) return;

        const couponCode = couponInput.value.trim().toUpperCase();
        if (!couponCode) {
            this.showMessage('Please enter a coupon code', 'error');
            return;
        }

        await this.applyCouponByCode(couponCode);
        couponInput.value = '';
    }

    async applyCouponByCode(couponCode) {
        try {
            this.showMessage('Validating coupon...', 'info');

            // Prepare request data
            const requestData = {
                code: couponCode,
                userId: this.userId
            };

            // Only include cart data if available and valid
            if (this.cartItems && this.cartItems.length > 0 && this.cartTotal > 0) {
                requestData.cartItems = this.cartItems;
                requestData.cartTotal = this.cartTotal;
                console.log('🛒 Including cart data in coupon validation:', {
                    itemCount: this.cartItems.length,
                    total: this.cartTotal
                });
            } else {
                console.log('⚠️ No cart data available, validating coupon without cart context');
            }

            const baseUrl = this.getBaseUrl();
            const response = await fetch(`${baseUrl}/coupons/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (response.ok && data.valid) {
                // Check if coupon is already applied
                if (this.appliedCoupons.find(c => c.code === couponCode)) {
                    this.showMessage('Coupon is already applied', 'warning');
                    return;
                }

                this.appliedCoupons.push({
                    ...data.coupon,
                    discount: data.discount || 0
                });

                this.updateCouponDisplay();
                this.updateCartTotals();
                this.showMessage(data.message || 'Coupon applied successfully!', 'success');

            } else {
                this.showMessage(data.message || 'Invalid coupon code', 'error');
            }

        } catch (error) {
            console.error('Error applying coupon:', error);
            this.showMessage('Error applying coupon. Please try again.', 'error');
        }
    }

    removeCoupon(couponCode) {
        this.appliedCoupons = this.appliedCoupons.filter(c => c.code !== couponCode);
        this.updateCouponDisplay();
        this.updateCartTotals();
        this.showMessage('Coupon removed', 'info');
    }

    updateCouponDisplay() {
        const container = document.getElementById('applied-coupons');
        if (!container) return;

        if (this.appliedCoupons.length === 0) {
            container.innerHTML = '';
            return;
        }

        const couponsHTML = this.appliedCoupons.map(coupon => `
            <div class="applied-coupon">
                <div class="coupon-info">
                    <span class="coupon-code">${coupon.code}</span>
                    <span class="coupon-name">${coupon.name}</span>
                    <span class="coupon-discount">-₹${coupon.discount}</span>
                </div>
                <button class="remove-coupon-btn" data-coupon-code="${coupon.code}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        container.innerHTML = couponsHTML;
    }

    updateCartTotals() {
        const totalDiscount = this.getTotalDiscount();
        const finalTotal = Math.max(0, this.cartTotal - totalDiscount);

        // Update discount display
        const discountElement = document.getElementById('total-discount');
        if (discountElement) {
            discountElement.textContent = `₹${totalDiscount}`;
        }

        // Update final total
        const finalTotalElement = document.getElementById('final-total');
        if (finalTotalElement) {
            finalTotalElement.textContent = `₹${finalTotal}`;
        }

        // Update savings display
        const savingsElement = document.getElementById('total-savings');
        if (savingsElement && totalDiscount > 0) {
            savingsElement.textContent = `You saved ₹${totalDiscount}!`;
            savingsElement.style.display = 'block';
        } else if (savingsElement) {
            savingsElement.style.display = 'none';
        }
    }

    getTotalDiscount() {
        return this.appliedCoupons.reduce((total, coupon) => total + (coupon.discount || 0), 0);
    }

    getAppliedCoupons() {
        return this.appliedCoupons;
    }

    async loadCartData() {
        // Try to load cart data from server if user is logged in
        if (this.userId && this.userId.length === 24 && /^[0-9a-fA-F]{24}$/.test(this.userId)) {
            try {
                const baseUrl = this.getBaseUrl();
                const response = await fetch(`${baseUrl}/cart`, {
                    credentials: 'include' // Include session cookies
                });

                if (response.ok) {
                    const cartData = await response.json();
                    if (cartData.items && cartData.items.length > 0) {
                        this.cartItems = cartData.items.map(item => ({
                            productId: item.productId._id || item.productId,
                            quantity: item.quantity,
                            price: item.price
                        }));
                        this.cartTotal = cartData.total;
                        console.log('🛒 Loaded cart data from server:', {
                            itemCount: this.cartItems.length,
                            total: this.cartTotal
                        });
                    }
                } else {
                    console.log('📭 No cart data available from server');
                }
            } catch (error) {
                console.log('⚠️ Could not load cart data from server:', error.message);
            }
        }
    }

    setCartData(cartItems, cartTotal) {
        this.cartItems = cartItems;
        this.cartTotal = cartTotal;
        console.log('🛒 Cart data updated manually:', {
            itemCount: this.cartItems.length,
            total: this.cartTotal
        });
    }

    showMessage(message, type = 'info') {
        const messageContainer = document.getElementById('coupon-message');
        if (!messageContainer) {
            console.log(`Coupon message (${type}): ${message}`);
            return;
        }

        messageContainer.className = `coupon-message ${type}`;
        messageContainer.textContent = message;
        messageContainer.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageContainer.style.display = 'none';
        }, 5000);
    }

    getBaseUrl() {
        // Use the same base URL logic as other parts of the application
        if (typeof CONFIG !== 'undefined' && CONFIG.endpoints) {
            const url = CONFIG.isDevelopment ? CONFIG.endpoints.development.base : CONFIG.endpoints.production.base;
            console.log(`🔗 Coupon System using ${CONFIG.isDevelopment ? 'development' : 'production'} URL: ${url}`);
            return url;
        }
        console.warn('⚠️ CONFIG not found, falling back to production URL');
        return 'https://tridex1.onrender.com';
    }

    // Debug method to manually trigger coupon loading
    debug() {
        console.log('🔍 Coupon System Debug Info:');
        console.log('- Applied Coupons:', this.appliedCoupons);
        console.log('- Available Coupons:', this.availableCoupons);
        console.log('- Cart Total:', this.cartTotal);
        console.log('- Cart Items:', this.cartItems);
        console.log('- User ID:', this.userId);
        console.log('- Base URL:', this.getBaseUrl());

        const container = document.getElementById('available-coupons');
        console.log('- Available Coupons Container:', container);

        console.log('🔄 Retrying coupon load...');
        this.loadAvailableCoupons();
    }
}

// Initialize coupon system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded - Initializing Coupon System');
    if (typeof window.couponSystem === 'undefined') {
        try {
            window.couponSystem = new CouponSystem();
            console.log('✅ Coupon System initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Coupon System:', error);
        }
    } else {
        console.log('ℹ️ Coupon System already exists');
    }
});

// Also try to initialize after a delay if DOM is already loaded
if (document.readyState === 'loading') {
    console.log('📄 Document still loading, waiting for DOMContentLoaded');
} else {
    console.log('📄 Document already loaded, initializing immediately');
    setTimeout(() => {
        if (typeof window.couponSystem === 'undefined') {
            try {
                window.couponSystem = new CouponSystem();
                console.log('✅ Coupon System initialized successfully (delayed)');
            } catch (error) {
                console.error('❌ Failed to initialize Coupon System (delayed):', error);
            }
        }
    }, 100);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CouponSystem;
}
