/**
 * Coupon System for Tridex E-commerce Platform
 * Handles coupon validation, application, and management
 */

class CouponSystem {
    constructor() {
        this.appliedCoupons = [];
        this.availableCoupons = [];
        this.cartTotal = 0;
        this.cartItems = [];
        this.userId = localStorage.getItem('userId');
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadAvailableCoupons();
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
            if (this.userId) {
                headers.userid = this.userId;
            }

            const response = await fetch(`${baseUrl}/coupons/public`, { headers });
            const data = await response.json();

            this.availableCoupons = data.coupons || [];
            this.displayAvailableCoupons();

        } catch (error) {
            console.error('Error loading available coupons:', error);
        }
    }

    displayAvailableCoupons() {
        const container = document.getElementById('available-coupons');
        if (!container) return;

        if (this.availableCoupons.length === 0) {
            container.innerHTML = '<p class="no-coupons">No coupons available at the moment.</p>';
            return;
        }

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

            const baseUrl = this.getBaseUrl();
            const response = await fetch(`${baseUrl}/coupons/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code: couponCode,
                    cartItems: this.cartItems,
                    cartTotal: this.cartTotal,
                    userId: this.userId
                })
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

    setCartData(cartItems, cartTotal) {
        this.cartItems = cartItems;
        this.cartTotal = cartTotal;
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
            return CONFIG.isDevelopment ? CONFIG.endpoints.development.base : CONFIG.endpoints.production.base;
        }
        return 'https://tridex1.onrender.com';
    }
}

// Initialize coupon system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.couponSystem === 'undefined') {
        window.couponSystem = new CouponSystem();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CouponSystem;
}
