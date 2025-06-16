/**
 * Admin Flash Sale Management System
 * Handles CRUD operations for flash sales in the admin panel
 */

class AdminFlashSaleManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalPages = 1;
        this.currentFilters = {
            search: '',
            status: 'all',
            type: 'all'
        };
        this.editingFlashSaleId = null;
        this.deletingFlashSaleId = null;
        this.selectedProducts = [];
        this.currentTab = 'basic';

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadFlashSales();
        this.loadStats();
        this.setDefaultDates();
    }

    setupEventListeners() {
        // Create flash sale button
        document.getElementById('create-flash-sale-btn').addEventListener('click', () => {
            this.openCreateFlashSaleModal();
        });

        // Search and filters
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.currentFilters.search = e.target.value;
            this.debounceSearch();
        });

        document.getElementById('status-filter').addEventListener('change', (e) => {
            this.currentFilters.status = e.target.value;
            this.loadFlashSales();
        });

        document.getElementById('type-filter').addEventListener('change', (e) => {
            this.currentFilters.type = e.target.value;
            this.loadFlashSales();
        });

        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.loadFlashSales();
            this.loadStats();
        });

        // Flash sale form
        document.getElementById('flash-sale-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFlashSale();
        });

        // Tab navigation
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                this.switchTab(e.target.dataset.tab);
            }
        });

        // Add product button
        document.getElementById('add-product-btn').addEventListener('click', () => {
            this.openProductSelectionModal();
        });

        // Product search
        document.getElementById('product-search-input').addEventListener('input', (e) => {
            this.searchProducts(e.target.value);
        });

        // Modal close events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.loadFlashSales();
        }, 500);
    }

    async loadFlashSales() {
        try {
            this.showLoading(true);

            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                status: this.currentFilters.status,
                type: this.currentFilters.type,
                search: this.currentFilters.search
            });

            const baseUrl = this.getBaseUrl();
            const response = await fetch(`${baseUrl}/flash-sales?${params}`);
            const data = await response.json();

            if (response.ok) {
                this.displayFlashSales(data.flashSales);
                this.updatePagination(data.pagination);
                this.showNoDataMessage(data.flashSales.length === 0);
            } else {
                this.showError('Failed to load flash sales');
            }

        } catch (error) {
            console.error('Error loading flash sales:', error);
            this.showError('Error loading flash sales');
        } finally {
            this.showLoading(false);
        }
    }

    async loadStats() {
        try {
            // This would typically come from a dedicated stats endpoint
            // For now, we'll use placeholder values
            document.getElementById('active-sales-count').textContent = '3';
            document.getElementById('upcoming-sales-count').textContent = '5';
            document.getElementById('total-revenue').textContent = '₹45,230';
            document.getElementById('total-orders').textContent = '127';

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    displayFlashSales(flashSales) {
        const tbody = document.getElementById('flash-sales-tbody');
        
        if (flashSales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No flash sales found</td></tr>';
            return;
        }

        tbody.innerHTML = flashSales.map(sale => `
            <tr>
                <td>
                    <strong>${sale.name}</strong>
                    ${sale.isFeatured ? '<span class="badge featured">Featured</span>' : ''}
                </td>
                <td>
                    <span class="sale-type">${this.formatSaleType(sale.saleType)}</span>
                </td>
                <td>
                    <span class="status-badge ${this.getStatusClass(sale.status)}">
                        ${this.formatStatus(sale.status)}
                    </span>
                </td>
                <td>
                    <small>${new Date(sale.startTime).toLocaleString()}</small>
                </td>
                <td>
                    <small>${new Date(sale.endTime).toLocaleString()}</small>
                </td>
                <td>
                    <span class="product-count">${sale.products.length} products</span>
                </td>
                <td>
                    <span class="revenue">₹${sale.analytics?.totalRevenue || 0}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="adminFlashSaleManager.viewAnalytics('${sale._id}')" title="View Analytics">
                            <i class="fas fa-chart-bar"></i>
                        </button>
                        <button class="action-btn edit" onclick="adminFlashSaleManager.editFlashSale('${sale._id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="adminFlashSaleManager.deleteFlashSale('${sale._id}', '${sale.name}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    formatSaleType(type) {
        const types = {
            'flash_sale': 'Flash Sale',
            'daily_deal': 'Daily Deal',
            'weekend_special': 'Weekend Special',
            'clearance': 'Clearance',
            'limited_time': 'Limited Time'
        };
        return types[type] || type;
    }

    formatStatus(status) {
        const statuses = {
            'scheduled': 'Scheduled',
            'active': 'Active',
            'ended': 'Ended',
            'cancelled': 'Cancelled'
        };
        return statuses[status] || status;
    }

    getStatusClass(status) {
        const classes = {
            'scheduled': 'status-scheduled',
            'active': 'status-active',
            'ended': 'status-ended',
            'cancelled': 'status-cancelled'
        };
        return classes[status] || 'status-default';
    }

    updatePagination(pagination) {
        this.totalPages = pagination.totalPages;
        const paginationContainer = document.getElementById('pagination');
        
        if (pagination.totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <button class="pagination-btn" ${!pagination.hasPrevPage ? 'disabled' : ''} 
                    onclick="adminFlashSaleManager.goToPage(${pagination.currentPage - 1})">
                <i class="fas fa-chevron-left"></i> Previous
            </button>
        `;

        // Page numbers
        const startPage = Math.max(1, pagination.currentPage - 2);
        const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === pagination.currentPage ? 'active' : ''}" 
                        onclick="adminFlashSaleManager.goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        // Next button
        paginationHTML += `
            <button class="pagination-btn" ${!pagination.hasNextPage ? 'disabled' : ''} 
                    onclick="adminFlashSaleManager.goToPage(${pagination.currentPage + 1})">
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;

        paginationContainer.innerHTML = paginationHTML;
    }

    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.loadFlashSales();
        }
    }

    openCreateFlashSaleModal() {
        this.editingFlashSaleId = null;
        this.selectedProducts = [];
        document.getElementById('modal-title').textContent = 'Create New Flash Sale';
        document.getElementById('flash-sale-form').reset();
        this.setDefaultDates();
        this.switchTab('basic');
        this.updateProductsList();
        document.getElementById('flash-sale-modal').style.display = 'block';
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.currentTab = tabName;
    }

    setDefaultDates() {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        document.getElementById('start-time').value = this.formatDateForInput(tomorrow);
        document.getElementById('end-time').value = this.formatDateForInput(nextWeek);
    }

    formatDateForInput(date) {
        return date.toISOString().slice(0, 16);
    }

    async searchProducts(query) {
        if (!query || query.length < 2) {
            document.getElementById('products-search-results').innerHTML = '';
            return;
        }

        try {
            const baseUrl = this.getBaseUrl();
            const response = await fetch(`${baseUrl}/products/search?q=${encodeURIComponent(query)}&limit=20`);
            const data = await response.json();

            this.displayProductSearchResults(data.products || []);

        } catch (error) {
            console.error('Error searching products:', error);
        }
    }

    displayProductSearchResults(products) {
        const container = document.getElementById('products-search-results');
        
        if (products.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No products found</p>';
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="search-result-item" onclick="adminFlashSaleManager.selectProduct('${product._id}')">
                <img src="${this.getProductImage(product)}" alt="${product.name}">
                <div class="search-result-info">
                    <h5>${product.name}</h5>
                    <p>₹${product.price} - Stock: ${product.stock}</p>
                </div>
            </div>
        `).join('');
    }

    selectProduct(productId) {
        // Add product to selected products if not already added
        if (!this.selectedProducts.find(p => p.productId === productId)) {
            // Fetch product details and add to selected products
            this.addProductToSale(productId);
        }
        this.closeProductSelectionModal();
    }

    async addProductToSale(productId) {
        try {
            const baseUrl = this.getBaseUrl();
            const response = await fetch(`${baseUrl}/products/${productId}`);
            const product = await response.json();

            if (response.ok) {
                this.selectedProducts.push({
                    productId: product._id,
                    productData: product,
                    originalPrice: product.price,
                    salePrice: product.price * 0.8, // Default 20% discount
                    totalQuantity: null,
                    maxPerUser: null,
                    isActive: true,
                    priority: 0
                });

                this.updateProductsList();
            }

        } catch (error) {
            console.error('Error adding product:', error);
        }
    }

    updateProductsList() {
        const container = document.getElementById('products-list');
        
        if (this.selectedProducts.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No products added yet. Click "Add Product" to get started.</p>';
            return;
        }

        container.innerHTML = this.selectedProducts.map((item, index) => `
            <div class="product-item">
                <img src="${this.getProductImage(item.productData)}" alt="${item.productData.name}">
                <div class="product-details">
                    <h4>${item.productData.name}</h4>
                    <div class="product-pricing">
                        <div class="pricing-input">
                            <label>Original Price</label>
                            <input type="number" value="${item.originalPrice}" 
                                   onchange="adminFlashSaleManager.updateProductField(${index}, 'originalPrice', this.value)"
                                   step="0.01" min="0">
                        </div>
                        <div class="pricing-input">
                            <label>Sale Price</label>
                            <input type="number" value="${item.salePrice}" 
                                   onchange="adminFlashSaleManager.updateProductField(${index}, 'salePrice', this.value)"
                                   step="0.01" min="0">
                        </div>
                        <div class="pricing-input">
                            <label>Total Quantity</label>
                            <input type="number" value="${item.totalQuantity || ''}" 
                                   onchange="adminFlashSaleManager.updateProductField(${index}, 'totalQuantity', this.value)"
                                   placeholder="Unlimited" min="1">
                        </div>
                        <div class="pricing-input">
                            <label>Max Per User</label>
                            <input type="number" value="${item.maxPerUser || ''}" 
                                   onchange="adminFlashSaleManager.updateProductField(${index}, 'maxPerUser', this.value)"
                                   placeholder="Unlimited" min="1">
                        </div>
                    </div>
                </div>
                <button class="remove-product-btn" onclick="adminFlashSaleManager.removeProduct(${index})">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `).join('');
    }

    updateProductField(index, field, value) {
        if (this.selectedProducts[index]) {
            this.selectedProducts[index][field] = value === '' ? null : (field.includes('Price') ? parseFloat(value) : parseInt(value));
        }
    }

    removeProduct(index) {
        this.selectedProducts.splice(index, 1);
        this.updateProductsList();
    }

    getProductImage(product) {
        if (product.media && product.media.length > 0) {
            return product.media[0].url;
        }
        return product.image || '/images/placeholder.jpg';
    }

    openProductSelectionModal() {
        document.getElementById('product-selection-modal').style.display = 'block';
        document.getElementById('product-search-input').focus();
    }

    closeProductSelectionModal() {
        document.getElementById('product-selection-modal').style.display = 'none';
        document.getElementById('product-search-input').value = '';
        document.getElementById('products-search-results').innerHTML = '';
    }

    getBaseUrl() {
        if (typeof CONFIG !== 'undefined' && CONFIG.endpoints) {
            return CONFIG.isDevelopment ? CONFIG.endpoints.development.base : CONFIG.endpoints.production.base;
        }
        return 'https://tridex1.onrender.com';
    }

    showLoading(show) {
        document.getElementById('loading-indicator').style.display = show ? 'block' : 'none';
        document.querySelector('.flash-sales-section').style.display = show ? 'none' : 'block';
    }

    showNoDataMessage(show) {
        document.getElementById('no-flash-sales').style.display = show ? 'block' : 'none';
        document.querySelector('.flash-sales-section').style.display = show ? 'none' : 'block';
    }

    showError(message) {
        alert(message); // Replace with better error handling
    }

    showSuccess(message) {
        alert(message); // Replace with better success handling
    }

    async saveFlashSale() {
        try {
            const formData = new FormData(document.getElementById('flash-sale-form'));
            const flashSaleData = {};

            // Convert FormData to object
            for (let [key, value] of formData.entries()) {
                if (value !== '') {
                    flashSaleData[key] = value;
                }
            }

            // Handle checkboxes
            flashSaleData.isFeatured = document.getElementById('is-featured').checked;

            // Handle display settings
            flashSaleData.display = {
                bannerTitle: flashSaleData.bannerTitle || '',
                bannerSubtitle: flashSaleData.bannerSubtitle || '',
                bannerColor: flashSaleData.bannerColor || '#ff4444',
                showCountdown: document.getElementById('show-countdown').checked,
                countdownStyle: flashSaleData.countdownStyle || 'digital',
                showQuantityLeft: document.getElementById('show-quantity-left').checked,
                showSoldCount: document.getElementById('show-sold-count').checked,
                urgencyThreshold: parseInt(flashSaleData.urgencyThreshold) || 10
            };

            // Handle rules
            const eligibleUserTypes = Array.from(document.querySelectorAll('input[name="eligibleUserTypes"]:checked'))
                .map(cb => cb.value);

            flashSaleData.rules = {
                eligibleUserTypes: eligibleUserTypes.length > 0 ? eligibleUserTypes : ['all'],
                minimumOrderValue: parseFloat(flashSaleData.minimumOrderValue) || 0,
                maxDiscountPerOrder: flashSaleData.maxDiscountPerOrder ? parseFloat(flashSaleData.maxDiscountPerOrder) : null
            };

            // Add products
            flashSaleData.products = this.selectedProducts.map(item => ({
                productId: item.productId,
                originalPrice: item.originalPrice,
                salePrice: item.salePrice,
                totalQuantity: item.totalQuantity,
                maxPerUser: item.maxPerUser,
                isActive: item.isActive,
                priority: item.priority || 0
            }));

            // Add created by
            flashSaleData.createdBy = localStorage.getItem('userId') || '000000000000000000000000';

            const baseUrl = this.getBaseUrl();
            const url = this.editingFlashSaleId ?
                `${baseUrl}/flash-sales/${this.editingFlashSaleId}` :
                `${baseUrl}/flash-sales`;

            const method = this.editingFlashSaleId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(flashSaleData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showSuccess(result.message || 'Flash sale saved successfully');
                this.closeAllModals();
                this.loadFlashSales();
                this.loadStats();
            } else {
                this.showError(result.message || 'Failed to save flash sale');
            }

        } catch (error) {
            console.error('Error saving flash sale:', error);
            this.showError('Error saving flash sale');
        }
    }

    deleteFlashSale(flashSaleId, name) {
        this.deletingFlashSaleId = flashSaleId;
        document.getElementById('delete-sale-name').textContent = name;
        document.getElementById('delete-modal').style.display = 'block';
    }

    async confirmDelete() {
        try {
            const baseUrl = this.getBaseUrl();
            const response = await fetch(`${baseUrl}/flash-sales/${this.deletingFlashSaleId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok) {
                this.showSuccess('Flash sale deleted successfully');
                this.closeAllModals();
                this.loadFlashSales();
                this.loadStats();
            } else {
                this.showError(result.message || 'Failed to delete flash sale');
            }

        } catch (error) {
            console.error('Error deleting flash sale:', error);
            this.showError('Error deleting flash sale');
        }
    }

    async editFlashSale(flashSaleId) {
        try {
            const baseUrl = this.getBaseUrl();
            const response = await fetch(`${baseUrl}/flash-sales/${flashSaleId}`);
            const data = await response.json();

            if (response.ok) {
                this.editingFlashSaleId = flashSaleId;
                this.populateForm(data.flashSale);
                document.getElementById('modal-title').textContent = 'Edit Flash Sale';
                document.getElementById('flash-sale-modal').style.display = 'block';
            } else {
                this.showError('Failed to load flash sale details');
            }

        } catch (error) {
            console.error('Error loading flash sale:', error);
            this.showError('Error loading flash sale details');
        }
    }

    populateForm(flashSale) {
        // Basic info
        document.getElementById('sale-name').value = flashSale.name;
        document.getElementById('sale-type').value = flashSale.saleType;
        document.getElementById('start-time').value = this.formatDateForInput(new Date(flashSale.startTime));
        document.getElementById('end-time').value = this.formatDateForInput(new Date(flashSale.endTime));
        document.getElementById('description').value = flashSale.description || '';
        document.getElementById('is-featured').checked = flashSale.isFeatured;
        document.getElementById('priority').value = flashSale.priority || 0;

        // Display settings
        if (flashSale.display) {
            document.getElementById('banner-title').value = flashSale.display.bannerTitle || '';
            document.getElementById('banner-subtitle').value = flashSale.display.bannerSubtitle || '';
            document.getElementById('banner-color').value = flashSale.display.bannerColor || '#ff4444';
            document.getElementById('countdown-style').value = flashSale.display.countdownStyle || 'digital';
            document.getElementById('urgency-threshold').value = flashSale.display.urgencyThreshold || 10;
            document.getElementById('show-countdown').checked = flashSale.display.showCountdown !== false;
            document.getElementById('show-quantity-left').checked = flashSale.display.showQuantityLeft !== false;
            document.getElementById('show-sold-count').checked = flashSale.display.showSoldCount || false;
        }

        // Rules
        if (flashSale.rules) {
            document.getElementById('min-order-value').value = flashSale.rules.minimumOrderValue || 0;
            document.getElementById('max-discount-per-order').value = flashSale.rules.maxDiscountPerOrder || '';

            // Clear all checkboxes first
            document.querySelectorAll('input[name="eligibleUserTypes"]').forEach(cb => cb.checked = false);

            // Check the appropriate user types
            if (flashSale.rules.eligibleUserTypes) {
                flashSale.rules.eligibleUserTypes.forEach(type => {
                    const checkbox = document.querySelector(`input[name="eligibleUserTypes"][value="${type}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        }

        // Products
        this.selectedProducts = flashSale.products.map(product => ({
            productId: product.productId._id,
            productData: product.productId,
            originalPrice: product.originalPrice,
            salePrice: product.salePrice,
            totalQuantity: product.totalQuantity,
            maxPerUser: product.maxPerUser,
            isActive: product.isActive,
            priority: product.priority || 0
        }));

        this.updateProductsList();
    }

    async viewAnalytics(flashSaleId) {
        try {
            const baseUrl = this.getBaseUrl();
            const response = await fetch(`${baseUrl}/flash-sales/${flashSaleId}/analytics`);
            const data = await response.json();

            if (response.ok) {
                this.showAnalyticsModal(data);
            } else {
                this.showError('Failed to load analytics');
            }

        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showError('Error loading analytics');
        }
    }

    showAnalyticsModal(data) {
        const modalHTML = `
            <div id="analytics-modal" class="modal" style="display: block;">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h2>Flash Sale Analytics</h2>
                        <button class="close-btn" onclick="document.getElementById('analytics-modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="analytics-content">
                            <h3>${data.flashSale.name}</h3>
                            <p>Status: <span class="status-badge ${this.getStatusClass(data.flashSale.status)}">${this.formatStatus(data.flashSale.status)}</span></p>

                            <div class="analytics-grid">
                                <div class="analytics-card">
                                    <h4>Total Purchases</h4>
                                    <p class="analytics-value">${data.analytics.totalPurchases}</p>
                                </div>
                                <div class="analytics-card">
                                    <h4>Total Quantity Sold</h4>
                                    <p class="analytics-value">${data.analytics.totalQuantity}</p>
                                </div>
                                <div class="analytics-card">
                                    <h4>Total Revenue</h4>
                                    <p class="analytics-value">₹${data.analytics.totalRevenue}</p>
                                </div>
                                <div class="analytics-card">
                                    <h4>Unique Customers</h4>
                                    <p class="analytics-value">${data.analytics.uniqueCustomers}</p>
                                </div>
                                <div class="analytics-card">
                                    <h4>Average Order Value</h4>
                                    <p class="analytics-value">₹${data.analytics.averageOrderValue}</p>
                                </div>
                                <div class="analytics-card">
                                    <h4>Total Discount Given</h4>
                                    <p class="analytics-value">₹${data.analytics.totalDiscount}</p>
                                </div>
                            </div>

                            ${data.topProducts.length > 0 ? `
                                <h4>Top Products</h4>
                                <div class="top-products">
                                    ${data.topProducts.map(product => `
                                        <div class="product-analytics">
                                            <span>Product ID: ${product.productId}</span>
                                            <span>Sold: ${product.totalQuantity}</span>
                                            <span>Revenue: ₹${product.totalRevenue}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    closeAllModals() {
        document.getElementById('flash-sale-modal').style.display = 'none';
        document.getElementById('product-selection-modal').style.display = 'none';
        document.getElementById('delete-modal').style.display = 'none';

        // Remove analytics modal if it exists
        const analyticsModal = document.getElementById('analytics-modal');
        if (analyticsModal) {
            analyticsModal.remove();
        }
    }
}

// Global functions for onclick handlers
function openCreateFlashSaleModal() {
    adminFlashSaleManager.openCreateFlashSaleModal();
}

function closeFlashSaleModal() {
    adminFlashSaleManager.closeAllModals();
}

function closeProductSelectionModal() {
    adminFlashSaleManager.closeProductSelectionModal();
}

function closeDeleteModal() {
    adminFlashSaleManager.closeAllModals();
}

function confirmDelete() {
    adminFlashSaleManager.confirmDelete();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminFlashSaleManager = new AdminFlashSaleManager();
});
