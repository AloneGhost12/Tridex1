/**
 * Flash Sale System for Tridex E-commerce Platform
 * Handles countdown timers, limited quantities, and real-time updates
 */

class FlashSaleSystem {
    constructor() {
        this.activeTimers = new Map();
        this.flashSales = [];
        this.updateInterval = 1000; // 1 second
        this.userId = null; // Will be fetched from server session

        // Don't auto-init in constructor to avoid double initialization
    }

    async init() {
        console.log('Flash Sale System initializing...');

        // Get user session from server instead of localStorage
        await this.loadUserSession();

        this.loadActiveFlashSales();
        this.setupEventListeners();
        this.startGlobalTimer();
        console.log('Flash Sale System initialized successfully');
    }

    async loadUserSession() {
        try {
            const baseUrl = this.getBaseUrl();
            const response = await fetch(`${baseUrl}/auth/session`, {
                credentials: 'include' // Include cookies for session
            });

            if (response.ok) {
                const sessionData = await response.json();
                this.userId = sessionData.userId;
                console.log('User session loaded:', this.userId);
            } else {
                console.log('No active user session');
                this.userId = null;
            }
        } catch (error) {
            console.error('Error loading user session:', error);
            this.userId = null;
        }
    }

    // Test function to verify connection
    async testConnection() {
        try {
            const baseUrl = this.getBaseUrl();
            console.log('Testing connection to:', `${baseUrl}/flash-sales/active`);

            const response = await fetch(`${baseUrl}/flash-sales/active`);
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (response.ok) {
                const data = await response.json();
                console.log('Test successful! Data:', data);
                return { success: true, data };
            } else {
                console.error('Test failed with status:', response.status);
                return { success: false, error: `HTTP ${response.status}` };
            }
        } catch (error) {
            console.error('Test failed with error:', error);
            return { success: false, error: error.message };
        }
    }

    setupEventListeners() {
        // Flash sale purchase buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('flash-sale-buy-btn')) {
                const productId = e.target.dataset.productId;
                const flashSaleId = e.target.dataset.flashSaleId;
                this.handleFlashSalePurchase(flashSaleId, productId);
            }
        });

        // Quantity selectors
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('flash-sale-quantity')) {
                const productId = e.target.dataset.productId;
                const flashSaleId = e.target.dataset.flashSaleId;
                const quantity = parseInt(e.target.value);
                this.updatePurchaseButton(flashSaleId, productId, quantity);
            }
        });

        // Refresh flash sales periodically
        setInterval(() => {
            this.loadActiveFlashSales();
        }, 30000); // Every 30 seconds
    }

    async loadActiveFlashSales() {
        try {
            const baseUrl = this.getBaseUrl();
            console.log('Loading flash sales from:', `${baseUrl}/flash-sales/active`);

            const response = await fetch(`${baseUrl}/flash-sales/active`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Flash sales data received:', data);

            this.flashSales = data.flashSales || [];
            console.log('Active flash sales:', this.flashSales.length);

            this.displayFlashSales();
            this.updateAllTimers();

        } catch (error) {
            console.error('Error loading flash sales:', error);
            // Show fallback message
            const container = document.getElementById('flash-sales-container');
            if (container) {
                container.innerHTML = '<p class="no-flash-sales">Unable to load flash sales at the moment.</p>';
            }
        }
    }

    async loadFeaturedFlashSales() {
        try {
            const baseUrl = this.getBaseUrl();
            const response = await fetch(`${baseUrl}/flash-sales/featured`);
            const data = await response.json();

            return data.flashSales || [];

        } catch (error) {
            console.error('Error loading featured flash sales:', error);
            return [];
        }
    }

    displayFlashSales() {
        const container = document.getElementById('flash-sales-container');
        if (!container) {
            console.error('Flash sales container not found!');
            return;
        }

        console.log('Displaying flash sales:', this.flashSales.length);

        if (this.flashSales.length === 0) {
            container.innerHTML = '<p class="no-flash-sales" style="text-align: center; color: rgba(255,255,255,0.8); padding: 20px;">No active flash sales at the moment.</p>';
            return;
        }

        const flashSalesHTML = this.flashSales.map(sale => this.renderFlashSale(sale)).join('');
        container.innerHTML = flashSalesHTML;
        console.log('Flash sales HTML rendered successfully');
    }

    renderFlashSale(sale) {
        const timeRemaining = this.calculateTimeRemaining(sale.endTime);
        const isActive = timeRemaining > 0;

        return `
            <div class="flash-sale-card ${!isActive ? 'expired' : ''}" data-sale-id="${sale._id}">
                <div class="flash-sale-header">
                    <h3 class="flash-sale-title">${sale.display?.bannerTitle || sale.name}</h3>
                    ${sale.display?.bannerSubtitle ? 
                        `<p class="flash-sale-subtitle">${sale.display.bannerSubtitle}</p>` : ''
                    }
                </div>
                
                ${isActive ? `
                    <div class="countdown-timer" data-end-time="${sale.endTime}">
                        <div class="timer-display">
                            <span class="timer-label">Ends in:</span>
                            <div class="timer-units">
                                <div class="timer-unit">
                                    <span class="timer-value hours">00</span>
                                    <span class="timer-label">Hours</span>
                                </div>
                                <div class="timer-unit">
                                    <span class="timer-value minutes">00</span>
                                    <span class="timer-label">Minutes</span>
                                </div>
                                <div class="timer-unit">
                                    <span class="timer-value seconds">00</span>
                                    <span class="timer-label">Seconds</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : '<div class="sale-ended">Sale Ended</div>'}
                
                <div class="flash-sale-products">
                    ${sale.products.map(product => this.renderFlashSaleProduct(sale, product)).join('')}
                </div>
            </div>
        `;
    }

    renderFlashSaleProduct(sale, saleProduct) {
        const product = saleProduct.productId;
        const discountAmount = saleProduct.originalPrice - saleProduct.salePrice;
        const isLowStock = saleProduct.remainingQuantity !== null && 
                          saleProduct.remainingQuantity <= (sale.display?.urgencyThreshold || 10);
        const isOutOfStock = saleProduct.remainingQuantity === 0;

        return `
            <div class="flash-sale-product ${isOutOfStock ? 'out-of-stock' : ''}" 
                 data-product-id="${product._id}">
                <div class="product-image">
                    <img src="${this.getProductImage(product)}" alt="${product.name}" loading="lazy">
                    <div class="discount-badge">
                        ${saleProduct.discountPercentage}% OFF
                    </div>
                </div>
                
                <div class="product-info">
                    <h4 class="product-name">${product.name}</h4>
                    
                    <div class="price-info">
                        <span class="sale-price">₹${saleProduct.salePrice}</span>
                        <span class="original-price">₹${saleProduct.originalPrice}</span>
                        <span class="savings">Save ₹${discountAmount}</span>
                    </div>
                    
                    ${saleProduct.remainingQuantity !== null ? `
                        <div class="quantity-info ${isLowStock ? 'low-stock' : ''}">
                            ${isLowStock ? 
                                `<span class="urgency">Only ${saleProduct.remainingQuantity} left!</span>` :
                                `<span>${saleProduct.remainingQuantity} available</span>`
                            }
                        </div>
                    ` : ''}
                    
                    ${sale.display?.showSoldCount && saleProduct.soldQuantity > 0 ? `
                        <div class="sold-count">
                            ${saleProduct.soldQuantity} sold
                        </div>
                    ` : ''}
                    
                    <div class="purchase-controls">
                        ${!isOutOfStock ? `
                            <div class="quantity-selector">
                                <label for="quantity-${product._id}">Qty:</label>
                                <select class="flash-sale-quantity" 
                                        data-product-id="${product._id}" 
                                        data-flash-sale-id="${sale._id}"
                                        id="quantity-${product._id}">
                                    ${this.generateQuantityOptions(saleProduct)}
                                </select>
                            </div>
                            <button class="flash-sale-buy-btn" 
                                    data-product-id="${product._id}" 
                                    data-flash-sale-id="${sale._id}">
                                Buy Now
                            </button>
                        ` : `
                            <button class="flash-sale-buy-btn out-of-stock" disabled>
                                Out of Stock
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    generateQuantityOptions(saleProduct) {
        const maxQuantity = saleProduct.maxPerUser || 
                           (saleProduct.remainingQuantity !== null ? 
                            Math.min(saleProduct.remainingQuantity, 10) : 10);
        
        let options = '';
        for (let i = 1; i <= maxQuantity; i++) {
            options += `<option value="${i}">${i}</option>`;
        }
        return options;
    }

    getProductImage(product) {
        if (product.media && product.media.length > 0) {
            return product.media[0].url;
        }
        return product.image || '/images/placeholder.jpg';
    }

    startGlobalTimer() {
        setInterval(() => {
            this.updateAllTimers();
        }, this.updateInterval);
    }

    updateAllTimers() {
        const timers = document.querySelectorAll('.countdown-timer');
        timers.forEach(timer => {
            const endTime = timer.dataset.endTime;
            this.updateTimer(timer, endTime);
        });
    }

    updateTimer(timerElement, endTime) {
        const timeRemaining = this.calculateTimeRemaining(endTime);
        
        if (timeRemaining <= 0) {
            timerElement.innerHTML = '<div class="timer-expired">Sale Ended</div>';
            const saleCard = timerElement.closest('.flash-sale-card');
            if (saleCard) {
                saleCard.classList.add('expired');
            }
            return;
        }

        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

        const hoursElement = timerElement.querySelector('.timer-value.hours');
        const minutesElement = timerElement.querySelector('.timer-value.minutes');
        const secondsElement = timerElement.querySelector('.timer-value.seconds');

        if (hoursElement) hoursElement.textContent = hours.toString().padStart(2, '0');
        if (minutesElement) minutesElement.textContent = minutes.toString().padStart(2, '0');
        if (secondsElement) secondsElement.textContent = seconds.toString().padStart(2, '0');

        // Add urgency styling for last hour
        if (timeRemaining < 3600000) { // Less than 1 hour
            timerElement.classList.add('urgent');
        }
    }

    calculateTimeRemaining(endTime) {
        const now = new Date().getTime();
        const end = new Date(endTime).getTime();
        return Math.max(0, end - now);
    }

    async handleFlashSalePurchase(flashSaleId, productId) {
        try {
            const quantitySelect = document.querySelector(
                `.flash-sale-quantity[data-product-id="${productId}"][data-flash-sale-id="${flashSaleId}"]`
            );
            const quantity = quantitySelect ? parseInt(quantitySelect.value) : 1;

            // Check eligibility first
            const eligibilityResponse = await this.checkPurchaseEligibility(flashSaleId, productId, quantity);
            
            if (!eligibilityResponse.eligible) {
                this.showMessage(eligibilityResponse.message, 'error');
                return;
            }

            // Add to cart with flash sale pricing
            await this.addToCartWithFlashSalePrice(productId, quantity, eligibilityResponse);
            
            this.showMessage('Added to cart with flash sale price!', 'success');

        } catch (error) {
            console.error('Error handling flash sale purchase:', error);
            this.showMessage('Error processing purchase. Please try again.', 'error');
        }
    }

    async checkPurchaseEligibility(flashSaleId, productId, quantity) {
        const baseUrl = this.getBaseUrl();
        const response = await fetch(`${baseUrl}/flash-sales/${flashSaleId}/check-eligibility`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productId,
                userId: this.userId,
                quantity
            })
        });

        return await response.json();
    }

    async addToCartWithFlashSalePrice(productId, quantity, flashSaleData) {
        try {
            const baseUrl = this.getBaseUrl();

            // Add to cart via server API instead of localStorage
            const response = await fetch(`${baseUrl}/cart/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include', // Include session cookies
                body: JSON.stringify({
                    productId,
                    quantity,
                    isFlashSale: true,
                    flashSalePrice: flashSaleData.salePrice,
                    originalPrice: flashSaleData.originalPrice,
                    discountPercentage: flashSaleData.discountPercentage
                })
            });

            if (response.ok) {
                console.log('Flash sale item added to cart via server');

                // Update cart UI if it exists
                if (typeof updateCartDisplay === 'function') {
                    updateCartDisplay();
                }

                // Update cart count
                if (typeof updateCartCount === 'function') {
                    updateCartCount();
                }
            } else {
                throw new Error(`Failed to add to cart: ${response.status}`);
            }
        } catch (error) {
            console.error('Error adding flash sale item to cart:', error);
            throw error;
        }
    }

    async updatePurchaseButton(flashSaleId, productId, quantity) {
        try {
            const eligibilityResponse = await this.checkPurchaseEligibility(flashSaleId, productId, quantity);
            
            const button = document.querySelector(
                `.flash-sale-buy-btn[data-product-id="${productId}"][data-flash-sale-id="${flashSaleId}"]`
            );

            if (button) {
                if (eligibilityResponse.eligible) {
                    button.disabled = false;
                    button.textContent = 'Buy Now';
                    button.classList.remove('disabled');
                } else {
                    button.disabled = true;
                    button.textContent = 'Not Available';
                    button.classList.add('disabled');
                }
            }

        } catch (error) {
            console.error('Error updating purchase button:', error);
        }
    }

    showMessage(message, type = 'info') {
        // Create or update message display
        let messageContainer = document.getElementById('flash-sale-message');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'flash-sale-message';
            messageContainer.className = 'flash-sale-message';
            document.body.appendChild(messageContainer);
        }

        messageContainer.className = `flash-sale-message ${type}`;
        messageContainer.textContent = message;
        messageContainer.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageContainer.style.display = 'none';
        }, 5000);
    }

    getBaseUrl() {
        // Use the same logic as the main site
        if (typeof getBaseUrl === 'function') {
            return getBaseUrl();
        }

        // Fallback logic
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        } else if (window.location.hostname.includes('onrender.com')) {
            return 'https://tridex1.onrender.com';
        } else if (window.location.hostname.includes('github.io') || window.location.protocol === 'file:') {
            return 'https://tridex1.onrender.com';
        } else {
            return 'https://tridex1.onrender.com';
        }
    }
}

// Initialize flash sale system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.flashSaleSystem === 'undefined') {
        console.log('Initializing Flash Sale System...');
        window.flashSaleSystem = new FlashSaleSystem();
        window.flashSaleSystem.init();

        // Expose test function globally for debugging
        window.testFlashSales = () => window.flashSaleSystem.testConnection();

        console.log('Flash Sale System ready! Use testFlashSales() in console to test connection.');
    } else {
        console.log('Flash Sale System already initialized');
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlashSaleSystem;
}
