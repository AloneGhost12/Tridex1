/**
 * Admin Coupon Management System
 * Handles CRUD operations for coupons in the admin panel
 */

class AdminCouponManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalPages = 1;
        this.currentFilters = {
            search: '',
            status: 'all',
            type: 'all'
        };
        this.editingCouponId = null;
        this.deletingCouponId = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCoupons();
        this.setDefaultDates();
    }

    setupEventListeners() {
        // Create coupon button
        document.getElementById('create-coupon-btn').addEventListener('click', () => {
            this.openCreateCouponModal();
        });

        // Search and filters
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.currentFilters.search = e.target.value;
            this.debounceSearch();
        });

        document.getElementById('status-filter').addEventListener('change', (e) => {
            this.currentFilters.status = e.target.value;
            this.loadCoupons();
        });

        document.getElementById('type-filter').addEventListener('change', (e) => {
            this.currentFilters.type = e.target.value;
            this.loadCoupons();
        });

        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.loadCoupons();
        });

        // Coupon form
        document.getElementById('coupon-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCoupon();
        });

        // Discount type change
        document.getElementById('discount-type').addEventListener('change', (e) => {
            this.toggleDiscountFields(e.target.value);
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
            this.loadCoupons();
        }, 500);
    }

    async loadCoupons() {
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
            const response = await fetch(`${baseUrl}/coupons?${params}`);
            const data = await response.json();

            if (response.ok) {
                this.displayCoupons(data.coupons);
                this.updatePagination(data.pagination);
                this.showNoDataMessage(data.coupons.length === 0);
            } else {
                this.showError('Failed to load coupons');
            }

        } catch (error) {
            console.error('Error loading coupons:', error);
            this.showError('Error loading coupons');
        } finally {
            this.showLoading(false);
        }
    }

    displayCoupons(coupons) {
        const tbody = document.getElementById('coupons-tbody');
        
        if (coupons.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No coupons found</td></tr>';
            return;
        }

        tbody.innerHTML = coupons.map(coupon => `
            <tr>
                <td>
                    <strong>${coupon.code}</strong>
                </td>
                <td>${coupon.name}</td>
                <td>
                    <span class="discount-type">${this.formatDiscountType(coupon.discountType)}</span>
                </td>
                <td>${this.formatDiscountValue(coupon)}</td>
                <td>
                    <div class="usage-info">
                        ${coupon.currentUsageCount}${coupon.usageLimit ? `/${coupon.usageLimit}` : ''}
                        <br>
                        <small class="text-muted">
                            ${coupon.usageLimit ? 
                                `${coupon.usageLimit - coupon.currentUsageCount} remaining` : 
                                'Unlimited'
                            }
                        </small>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${this.getStatusClass(coupon)}">
                        ${this.getStatusText(coupon)}
                    </span>
                </td>
                <td>
                    <small>${new Date(coupon.endDate).toLocaleDateString()}</small>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="adminCouponManager.viewCouponUsage('${coupon._id}')" title="View Usage">
                            <i class="fas fa-chart-bar"></i>
                        </button>
                        <button class="action-btn edit" onclick="adminCouponManager.editCoupon('${coupon._id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="adminCouponManager.deleteCoupon('${coupon._id}', '${coupon.code}', '${coupon.name}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    formatDiscountType(type) {
        const types = {
            'percentage': 'Percentage',
            'fixed': 'Fixed Amount',
            'buy_x_get_y': 'Buy X Get Y',
            'free_shipping': 'Free Shipping'
        };
        return types[type] || type;
    }

    formatDiscountValue(coupon) {
        switch (coupon.discountType) {
            case 'percentage':
                return `${coupon.discountValue}%${coupon.maxDiscountAmount ? ` (Max ₹${coupon.maxDiscountAmount})` : ''}`;
            case 'fixed':
                return `₹${coupon.discountValue}`;
            case 'free_shipping':
                return 'Free Shipping';
            case 'buy_x_get_y':
                return `Buy ${coupon.buyXGetY?.buyQuantity || 1} Get ${coupon.buyXGetY?.getQuantity || 1}`;
            default:
                return coupon.discountValue;
        }
    }

    getStatusClass(coupon) {
        const now = new Date();
        if (!coupon.isActive) return 'status-inactive';
        if (new Date(coupon.endDate) < now) return 'status-expired';
        if (coupon.usageLimit && coupon.currentUsageCount >= coupon.usageLimit) return 'status-inactive';
        return 'status-active';
    }

    getStatusText(coupon) {
        const now = new Date();
        if (!coupon.isActive) return 'Inactive';
        if (new Date(coupon.endDate) < now) return 'Expired';
        if (coupon.usageLimit && coupon.currentUsageCount >= coupon.usageLimit) return 'Used Up';
        return 'Active';
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
                    onclick="adminCouponManager.goToPage(${pagination.currentPage - 1})">
                <i class="fas fa-chevron-left"></i> Previous
            </button>
        `;

        // Page numbers
        const startPage = Math.max(1, pagination.currentPage - 2);
        const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);

        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="adminCouponManager.goToPage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === pagination.currentPage ? 'active' : ''}" 
                        onclick="adminCouponManager.goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        if (endPage < pagination.totalPages) {
            if (endPage < pagination.totalPages - 1) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" onclick="adminCouponManager.goToPage(${pagination.totalPages})">${pagination.totalPages}</button>`;
        }

        // Next button
        paginationHTML += `
            <button class="pagination-btn" ${!pagination.hasNextPage ? 'disabled' : ''} 
                    onclick="adminCouponManager.goToPage(${pagination.currentPage + 1})">
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;

        paginationContainer.innerHTML = paginationHTML;
    }

    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.loadCoupons();
        }
    }

    openCreateCouponModal() {
        this.editingCouponId = null;
        document.getElementById('modal-title').textContent = 'Create New Coupon';
        document.getElementById('coupon-form').reset();
        this.setDefaultDates();
        this.toggleDiscountFields('percentage');
        document.getElementById('coupon-modal').style.display = 'block';
    }

    async editCoupon(couponId) {
        try {
            const baseUrl = this.getBaseUrl();
            const response = await fetch(`${baseUrl}/coupons/${couponId}`);
            const coupon = await response.json();

            if (response.ok) {
                this.editingCouponId = couponId;
                this.populateForm(coupon);
                document.getElementById('modal-title').textContent = 'Edit Coupon';
                document.getElementById('coupon-modal').style.display = 'block';
            } else {
                this.showError('Failed to load coupon details');
            }

        } catch (error) {
            console.error('Error loading coupon:', error);
            this.showError('Error loading coupon details');
        }
    }

    populateForm(coupon) {
        document.getElementById('coupon-code').value = coupon.code;
        document.getElementById('coupon-name').value = coupon.name;
        document.getElementById('coupon-description').value = coupon.description || '';
        document.getElementById('discount-type').value = coupon.discountType;
        document.getElementById('discount-value').value = coupon.discountValue;
        document.getElementById('max-discount').value = coupon.maxDiscountAmount || '';
        document.getElementById('min-order-value').value = coupon.minimumOrderValue;
        document.getElementById('usage-limit').value = coupon.usageLimit || '';
        document.getElementById('usage-limit-per-user').value = coupon.usageLimitPerUser;
        document.getElementById('start-date').value = this.formatDateForInput(coupon.startDate);
        document.getElementById('end-date').value = this.formatDateForInput(coupon.endDate);
        document.getElementById('is-public').checked = coupon.isPublic;
        document.getElementById('auto-apply').checked = coupon.autoApply;
        document.getElementById('priority').value = coupon.priority;

        this.toggleDiscountFields(coupon.discountType);
    }

    formatDateForInput(dateString) {
        const date = new Date(dateString);
        return date.toISOString().slice(0, 16);
    }

    setDefaultDates() {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        document.getElementById('start-date').value = this.formatDateForInput(tomorrow);
        document.getElementById('end-date').value = this.formatDateForInput(nextWeek);
    }

    toggleDiscountFields(discountType) {
        const maxDiscountGroup = document.getElementById('max-discount-group');
        
        if (discountType === 'percentage') {
            maxDiscountGroup.style.display = 'block';
        } else {
            maxDiscountGroup.style.display = 'none';
        }
    }

    getBaseUrl() {
        if (typeof CONFIG !== 'undefined' && CONFIG.endpoints) {
            return CONFIG.isDevelopment ? CONFIG.endpoints.development.base : CONFIG.endpoints.production.base;
        }
        return 'https://tridex-backend.onrender.com';
    }

    showLoading(show) {
        document.getElementById('loading-indicator').style.display = show ? 'block' : 'none';
        document.querySelector('.coupons-section').style.display = show ? 'none' : 'block';
    }

    showNoDataMessage(show) {
        document.getElementById('no-coupons').style.display = show ? 'block' : 'none';
        document.querySelector('.coupons-section').style.display = show ? 'none' : 'block';
    }

    showError(message) {
        alert(message); // Replace with better error handling
    }

    showSuccess(message) {
        alert(message); // Replace with better success handling
    }

    async saveCoupon() {
        try {
            const formData = new FormData(document.getElementById('coupon-form'));
            const couponData = {};

            // Convert FormData to object
            for (let [key, value] of formData.entries()) {
                if (value !== '') {
                    couponData[key] = value;
                }
            }

            // Handle checkboxes
            couponData.isPublic = document.getElementById('is-public').checked;
            couponData.autoApply = document.getElementById('auto-apply').checked;

            // Add created by (admin user ID)
            couponData.createdBy = localStorage.getItem('userId') || '000000000000000000000000';

            const baseUrl = this.getBaseUrl();
            const url = this.editingCouponId ?
                `${baseUrl}/coupons/${this.editingCouponId}` :
                `${baseUrl}/coupons`;

            const method = this.editingCouponId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(couponData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showSuccess(result.message || 'Coupon saved successfully');
                this.closeAllModals();
                this.loadCoupons();
            } else {
                this.showError(result.message || 'Failed to save coupon');
            }

        } catch (error) {
            console.error('Error saving coupon:', error);
            this.showError('Error saving coupon');
        }
    }

    deleteCoupon(couponId, code, name) {
        this.deletingCouponId = couponId;
        document.getElementById('delete-coupon-code').textContent = code;
        document.getElementById('delete-coupon-name').textContent = name;
        document.getElementById('delete-modal').style.display = 'block';
    }

    async confirmDelete() {
        try {
            const baseUrl = this.getBaseUrl();
            const response = await fetch(`${baseUrl}/coupons/${this.deletingCouponId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok) {
                this.showSuccess('Coupon deleted successfully');
                this.closeAllModals();
                this.loadCoupons();
            } else {
                this.showError(result.message || 'Failed to delete coupon');
            }

        } catch (error) {
            console.error('Error deleting coupon:', error);
            this.showError('Error deleting coupon');
        }
    }

    async viewCouponUsage(couponId) {
        try {
            const baseUrl = this.getBaseUrl();
            const response = await fetch(`${baseUrl}/coupons/${couponId}/usage`);
            const data = await response.json();

            if (response.ok) {
                this.showUsageModal(data);
            } else {
                this.showError('Failed to load usage statistics');
            }

        } catch (error) {
            console.error('Error loading usage statistics:', error);
            this.showError('Error loading usage statistics');
        }
    }

    showUsageModal(data) {
        const modalHTML = `
            <div id="usage-modal" class="modal" style="display: block;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Coupon Usage Statistics</h2>
                        <button class="close-btn" onclick="document.getElementById('usage-modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="usage-stats">
                            <h3>${data.coupon.code} - ${data.coupon.name}</h3>

                            <div class="stats-grid">
                                <div class="stat-card">
                                    <h4>Total Usage</h4>
                                    <p class="stat-value">${data.statistics.totalUsage}</p>
                                </div>
                                <div class="stat-card">
                                    <h4>Unique Users</h4>
                                    <p class="stat-value">${data.statistics.uniqueUsersCount}</p>
                                </div>
                                <div class="stat-card">
                                    <h4>Total Discount Given</h4>
                                    <p class="stat-value">₹${data.statistics.totalDiscountGiven}</p>
                                </div>
                                <div class="stat-card">
                                    <h4>Average Discount</h4>
                                    <p class="stat-value">₹${data.statistics.averageDiscount.toFixed(2)}</p>
                                </div>
                            </div>

                            <h4>Recent Usage</h4>
                            <div class="recent-usage">
                                ${data.recentUsage.length > 0 ?
                                    data.recentUsage.map(usage => `
                                        <div class="usage-item">
                                            <span>${usage.userId?.username || 'Unknown User'}</span>
                                            <span>₹${usage.discountAmount}</span>
                                            <span>${new Date(usage.usedAt).toLocaleDateString()}</span>
                                        </div>
                                    `).join('') :
                                    '<p class="text-muted">No usage history available</p>'
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    closeAllModals() {
        document.getElementById('coupon-modal').style.display = 'none';
        document.getElementById('delete-modal').style.display = 'none';

        // Remove usage modal if it exists
        const usageModal = document.getElementById('usage-modal');
        if (usageModal) {
            usageModal.remove();
        }
    }
}

// Global functions for onclick handlers
function openCreateCouponModal() {
    adminCouponManager.openCreateCouponModal();
}

function closeCouponModal() {
    adminCouponManager.closeAllModals();
}

function closeDeleteModal() {
    adminCouponManager.closeAllModals();
}

function confirmDelete() {
    adminCouponManager.confirmDelete();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminCouponManager = new AdminCouponManager();
});
