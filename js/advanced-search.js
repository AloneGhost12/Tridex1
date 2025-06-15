/**
 * Advanced Search & Filtering System for Tridex
 * Provides real-time search, filtering, sorting, and autocomplete functionality
 */

class AdvancedSearch {
    constructor() {
        this.searchInput = null;
        this.searchResults = null;
        this.searchFilters = null;
        this.currentQuery = '';
        this.currentFilters = {};
        this.currentSort = 'relevance';
        this.currentPage = 1;
        this.totalPages = 1;
        this.isLoading = false;
        this.searchTimeout = null;
        this.suggestionsContainer = null;

        this.init();
    }

    init() {
        this.setupSearchElements();
        this.setupEventListeners();
        this.loadInitialFilters();
    }

    setupSearchElements() {
        // Use the existing header search input instead of creating a new one
        this.searchInput = document.getElementById('search-input');

        // Check if advanced search elements already exist (e.g., on index page)
        const existingControls = document.getElementById('advanced-search-controls');

        // Only create advanced search elements if they don't exist
        if (!existingControls) {
            this.createAdvancedSearchElements();
        }

        this.searchResults = document.getElementById('search-results') || document.getElementById('product-grid');
        this.searchFilters = document.getElementById('search-filters');
        this.suggestionsContainer = document.getElementById('search-suggestions');
    }

    createAdvancedSearchElements() {
        // Only create advanced search elements if we're on a dedicated search page
        // This prevents duplication with the header search

        // Create suggestions container for the existing search input
        if (this.searchInput && !document.getElementById('search-suggestions')) {
            const suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'search-suggestions';
            suggestionsContainer.className = 'search-suggestions';
            suggestionsContainer.style.display = 'none';

            // Insert after the search form
            const searchForm = document.getElementById('search-form');
            if (searchForm) {
                searchForm.parentNode.insertBefore(suggestionsContainer, searchForm.nextSibling);
            }
        }

        // Create advanced search controls container only if needed
        if (!document.getElementById('advanced-search-controls')) {
            const controlsContainer = document.createElement('div');
            controlsContainer.id = 'advanced-search-controls';
            controlsContainer.innerHTML = `
                <div class="search-controls">
                    <button id="filter-toggle" class="filter-toggle">
                        <i class="fas fa-filter"></i> Filters
                    </button>
                    <select id="sort-select" class="sort-select">
                        <option value="relevance">Most Relevant</option>
                        <option value="popularity">Most Popular</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                        <option value="rating">Highest Rated</option>
                        <option value="newest">Newest First</option>
                    </select>
                </div>

                <div id="search-filters" class="search-filters" style="display: none;">
                    <div class="filters-content">
                        <div class="filter-group">
                            <h4>Price Range</h4>
                            <div class="price-range">
                                <input type="number" id="min-price" placeholder="Min" min="0">
                                <span>to</span>
                                <input type="number" id="max-price" placeholder="Max" min="0">
                            </div>
                        </div>

                        <div class="filter-group">
                            <h4>Category</h4>
                            <select id="category-filter">
                                <option value="">All Categories</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <h4>Brand</h4>
                            <select id="brand-filter">
                                <option value="">All Brands</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <h4>Rating</h4>
                            <div class="rating-filter">
                                <label><input type="radio" name="rating" value=""> Any Rating</label>
                                <label><input type="radio" name="rating" value="4"> 4+ Stars</label>
                                <label><input type="radio" name="rating" value="3"> 3+ Stars</label>
                                <label><input type="radio" name="rating" value="2"> 2+ Stars</label>
                            </div>
                        </div>

                        <div class="filter-group">
                            <h4>Availability</h4>
                            <label class="checkbox-label">
                                <input type="checkbox" id="available-only"> In Stock Only
                            </label>
                        </div>

                        <div class="filter-actions">
                            <button id="apply-filters" class="apply-filters-btn">Apply Filters</button>
                            <button id="clear-filters" class="clear-filters-btn">Clear All</button>
                        </div>
                    </div>
                </div>

                <div id="search-results" class="search-results">
                    <div class="results-header">
                        <div class="results-info">
                            <span id="results-count">0 products found</span>
                        </div>
                    </div>
                    <div id="products-grid" class="products-grid"></div>
                    <div id="pagination" class="pagination"></div>
                </div>

                <div id="search-loading" class="search-loading" style="display: none;">
                    <div class="loading-spinner"></div>
                    <p>Searching...</p>
                </div>
            `;

            // Insert the controls after the header or main content area
            const mainContent = document.querySelector('.main-content') || document.querySelector('main') || document.body;
            if (mainContent.firstChild) {
                mainContent.insertBefore(controlsContainer, mainContent.firstChild);
            } else {
                mainContent.appendChild(controlsContainer);
            }
        }
    }

    setupEventListeners() {
        // Check if we're on the main index page
        const isIndexPage = window.location.pathname === '/' ||
                           window.location.pathname.endsWith('/index.html') ||
                           window.location.pathname === '/index.html' ||
                           window.location.pathname === '';

        if (this.searchInput) {
            // Add suggestions functionality to existing search input
            this.searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });

            this.searchInput.addEventListener('focus', () => {
                this.showSuggestions();
            });

            this.searchInput.addEventListener('blur', () => {
                // Delay hiding suggestions to allow clicking
                setTimeout(() => this.hideSuggestions(), 200);
            });

            // Enhance existing search form instead of overriding it
            const searchForm = document.getElementById('search-form');
            if (searchForm && !isIndexPage) {
                // Only override form behavior on non-index pages
                // Remove existing event listeners to avoid conflicts
                const newForm = searchForm.cloneNode(true);
                searchForm.parentNode.replaceChild(newForm, searchForm);

                newForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.currentQuery = this.searchInput.value;
                    this.performSearch();
                });
            }
        }

        // Advanced search button (only if it exists)
        const searchButton = document.getElementById('search-button');
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                this.performSearch();
            });
        }

        // Filter toggle
        const filterToggle = document.getElementById('filter-toggle');
        if (filterToggle) {
            filterToggle.addEventListener('click', () => {
                this.toggleFilters();
            });
        }

        // Sort select
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.performSearch();
            });
        }

        // Filter controls
        this.setupFilterEventListeners();
    }

    setupFilterEventListeners() {
        // Price range inputs
        const minPrice = document.getElementById('min-price');
        const maxPrice = document.getElementById('max-price');

        if (minPrice && maxPrice) {
            [minPrice, maxPrice].forEach(input => {
                input.addEventListener('change', () => {
                    this.updateFilters();
                });
            });
        }

        // Category filter
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.updateFilters();
            });
        }

        // Brand filter
        const brandFilter = document.getElementById('brand-filter');
        if (brandFilter) {
            brandFilter.addEventListener('change', () => {
                this.updateFilters();
            });
        }

        // Rating filter
        const ratingInputs = document.querySelectorAll('input[name="rating"]');
        ratingInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updateFilters();
            });
        });

        // Availability filter
        const availableOnly = document.getElementById('available-only');
        if (availableOnly) {
            availableOnly.addEventListener('change', () => {
                this.updateFilters();
            });
        }

        // Filter action buttons
        const applyFilters = document.getElementById('apply-filters');
        const clearFilters = document.getElementById('clear-filters');

        if (applyFilters) {
            applyFilters.addEventListener('click', () => {
                this.performSearch();
            });
        }

        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }
    }

    handleSearchInput(query) {
        this.currentQuery = query;

        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Get suggestions after a short delay
        if (query.length >= 2) {
            this.searchTimeout = setTimeout(() => {
                this.getSuggestions(query);
            }, 300);
        } else {
            this.hideSuggestions();
        }
    }

    async getSuggestions(query) {
        try {
            const baseUrl = this.getBaseUrl();
            const response = await fetch(`${baseUrl}/products/search/suggestions?q=${encodeURIComponent(query)}&limit=8`);
            const data = await response.json();

            this.displaySuggestions(data.suggestions);
        } catch (error) {
            console.error('Error getting suggestions:', error);
        }
    }

    displaySuggestions(suggestions) {
        if (!this.suggestionsContainer || suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        const suggestionsHTML = suggestions.map(suggestion => {
            let icon = '';
            let subtitle = '';

            switch (suggestion.type) {
                case 'product':
                    icon = '<i class="fas fa-box"></i>';
                    subtitle = `$${suggestion.price}`;
                    break;
                case 'category':
                    icon = '<i class="fas fa-tags"></i>';
                    subtitle = 'Category';
                    break;
                case 'brand':
                    icon = '<i class="fas fa-trademark"></i>';
                    subtitle = `${suggestion.productCount} products`;
                    break;
                case 'search':
                    icon = '<i class="fas fa-search"></i>';
                    subtitle = `${suggestion.searchCount} searches`;
                    break;
            }

            return `
                <div class="suggestion-item" data-type="${suggestion.type}" data-value="${suggestion.name}">
                    ${icon}
                    <div class="suggestion-content">
                        <div class="suggestion-name">${suggestion.name}</div>
                        <div class="suggestion-subtitle">${subtitle}</div>
                    </div>
                </div>
            `;
        }).join('');

        this.suggestionsContainer.innerHTML = suggestionsHTML;
        this.suggestionsContainer.style.display = 'block';

        // Add click listeners to suggestions
        this.suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const value = item.dataset.value;
                const type = item.dataset.type;

                this.searchInput.value = value;
                this.currentQuery = value;
                this.hideSuggestions();
                this.performSearch();
            });
        });
    }

    showSuggestions() {
        if (this.suggestionsContainer && this.currentQuery.length >= 2) {
            this.getSuggestions(this.currentQuery);
        }
    }

    hideSuggestions() {
        if (this.suggestionsContainer) {
            this.suggestionsContainer.style.display = 'none';
        }
    }

    toggleFilters() {
        if (this.searchFilters) {
            const isVisible = this.searchFilters.style.display !== 'none';
            this.searchFilters.style.display = isVisible ? 'none' : 'block';

            const toggleButton = document.getElementById('filter-toggle');
            if (toggleButton) {
                toggleButton.classList.toggle('active', !isVisible);
            }
        }
    }

    updateFilters() {
        const minPrice = document.getElementById('min-price')?.value;
        const maxPrice = document.getElementById('max-price')?.value;
        const category = document.getElementById('category-filter')?.value;
        const brand = document.getElementById('brand-filter')?.value;
        const rating = document.querySelector('input[name="rating"]:checked')?.value;
        const availableOnly = document.getElementById('available-only')?.checked;

        this.currentFilters = {
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            category: category || undefined,
            brand: brand || undefined,
            minRating: rating ? parseFloat(rating) : undefined,
            isAvailable: availableOnly || undefined
        };
    }

    clearAllFilters() {
        // Clear form inputs
        const minPrice = document.getElementById('min-price');
        const maxPrice = document.getElementById('max-price');
        const categoryFilter = document.getElementById('category-filter');
        const brandFilter = document.getElementById('brand-filter');
        const ratingInputs = document.querySelectorAll('input[name="rating"]');
        const availableOnly = document.getElementById('available-only');

        if (minPrice) minPrice.value = '';
        if (maxPrice) maxPrice.value = '';
        if (categoryFilter) categoryFilter.value = '';
        if (brandFilter) brandFilter.value = '';
        if (availableOnly) availableOnly.checked = false;

        ratingInputs.forEach(input => {
            if (input.value === '') input.checked = true;
            else input.checked = false;
        });

        // Clear filters object
        this.currentFilters = {};

        // Perform search with cleared filters
        this.performSearch();
    }

    async loadInitialFilters() {
        try {
            const baseUrl = this.getBaseUrl();

            // Load categories
            const categoriesResponse = await fetch(`${baseUrl}/categories`);
            const categoriesData = await categoriesResponse.json();

            const categorySelect = document.getElementById('category-filter');
            if (categorySelect && categoriesData.categories) {
                categoriesData.categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category._id;
                    option.textContent = category.name;
                    categorySelect.appendChild(option);
                });
            }

            // Load filter options
            const filtersResponse = await fetch(`${baseUrl}/products/search/filters`);
            const filtersData = await filtersResponse.json();

            // Populate brand filter
            const brandSelect = document.getElementById('brand-filter');
            if (brandSelect && filtersData.brands) {
                filtersData.brands.forEach(brand => {
                    const option = document.createElement('option');
                    option.value = brand.name;
                    option.textContent = `${brand.name} (${brand.count})`;
                    brandSelect.appendChild(option);
                });
            }

        } catch (error) {
            console.error('Error loading initial filters:', error);
        }
    }

    async performSearch() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading();

        try {
            // Update filters from form
            this.updateFilters();

            // Build query parameters
            const params = new URLSearchParams();

            if (this.currentQuery) params.append('q', this.currentQuery);
            if (this.currentFilters.category) params.append('category', this.currentFilters.category);
            if (this.currentFilters.minPrice !== undefined) params.append('minPrice', this.currentFilters.minPrice);
            if (this.currentFilters.maxPrice !== undefined) params.append('maxPrice', this.currentFilters.maxPrice);
            if (this.currentFilters.brand) params.append('brand', this.currentFilters.brand);
            if (this.currentFilters.minRating !== undefined) params.append('minRating', this.currentFilters.minRating);
            if (this.currentFilters.isAvailable !== undefined) params.append('isAvailable', this.currentFilters.isAvailable);

            params.append('sortBy', this.currentSort);
            params.append('page', this.currentPage);
            params.append('limit', '20');

            // Add user headers for search history
            const headers = {};
            const userId = localStorage.getItem('userId');
            const username = localStorage.getItem('username');
            const sessionId = this.generateSessionId();

            if (userId) headers.userid = userId;
            if (username) headers.username = username;
            headers.sessionid = sessionId;

            const baseUrl = this.getBaseUrl();
            const response = await fetch(`${baseUrl}/products/search?${params}`, { headers });
            const data = await response.json();

            this.displaySearchResults(data);
            this.updatePagination(data.pagination);

        } catch (error) {
            console.error('Error performing search:', error);
            this.displayError('An error occurred while searching. Please try again.');
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    displaySearchResults(data) {
        const productsGrid = document.getElementById('products-grid');
        const resultsCount = document.getElementById('results-count');

        if (!productsGrid) return;

        // Update results count
        if (resultsCount) {
            const count = data.pagination.totalCount;
            resultsCount.textContent = `${count} product${count !== 1 ? 's' : ''} found`;
        }

        if (!data.products || data.products.length === 0) {
            productsGrid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>No products found</h3>
                    <p>Try adjusting your search terms or filters</p>
                </div>
            `;
            return;
        }

        // Generate product cards
        const productsHTML = data.products.map(product => this.createProductCard(product)).join('');
        productsGrid.innerHTML = productsHTML;

        // Add event listeners to product cards
        this.setupProductCardListeners();
    }

    createProductCard(product) {
        const imageUrl = product.image || (product.media && product.media[0] ? product.media[0].url : '/images/placeholder.jpg');
        const rating = product.averageRating || 0;
        const reviewCount = product.reviewCount || 0;
        const isOnSale = product.originalPrice && product.originalPrice > product.price;
        const discountPercent = isOnSale ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

        return `
            <div class="product-card" data-product-id="${product._id}">
                <div class="product-image-container">
                    <img src="${imageUrl}" alt="${product.name}" class="product-image" loading="lazy">
                    ${isOnSale ? `<div class="discount-badge">${discountPercent}% OFF</div>` : ''}
                    <div class="product-actions">
                        <button class="wishlist-btn" data-product-id="${product._id}" title="Add to Wishlist">
                            <i class="far fa-heart"></i>
                        </button>
                        <button class="quick-view-btn" data-product-id="${product._id}" title="Quick View">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>

                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    ${product.brand ? `<p class="product-brand">${product.brand}</p>` : ''}

                    <div class="product-rating">
                        <div class="stars">
                            ${this.generateStars(rating)}
                        </div>
                        <span class="review-count">(${reviewCount})</span>
                    </div>

                    <div class="product-price">
                        <span class="current-price">$${product.price}</span>
                        ${isOnSale ? `<span class="original-price">$${product.originalPrice}</span>` : ''}
                    </div>

                    <div class="product-availability">
                        ${product.isAvailable ?
                            '<span class="in-stock"><i class="fas fa-check"></i> In Stock</span>' :
                            '<span class="out-of-stock"><i class="fas fa-times"></i> Out of Stock</span>'
                        }
                    </div>

                    <button class="add-to-cart-btn" data-product-id="${product._id}" ${!product.isAvailable ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i>
                        ${product.isAvailable ? 'Add to Cart' : 'Out of Stock'}
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

        // Full stars
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<i class="fas fa-star"></i>';
        }

        // Half star
        if (hasHalfStar) {
            starsHTML += '<i class="fas fa-star-half-alt"></i>';
        }

        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '<i class="far fa-star"></i>';
        }

        return starsHTML;
    }

    setupProductCardListeners() {
        // Product card click listeners
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't navigate if clicking on action buttons
                if (e.target.closest('.product-actions') || e.target.closest('.add-to-cart-btn')) {
                    return;
                }

                const productId = card.dataset.productId;
                window.location.href = `product-details.html?id=${productId}`;
            });
        });

        // Wishlist button listeners
        document.querySelectorAll('.wishlist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = btn.dataset.productId;
                this.addToWishlist(productId);
            });
        });

        // Quick view button listeners
        document.querySelectorAll('.quick-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = btn.dataset.productId;
                this.showQuickView(productId);
            });
        });

        // Add to cart button listeners
        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = btn.dataset.productId;
                this.addToCart(productId);
            });
        });
    }

    async addToWishlist(productId) {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                alert('Please log in to add items to your wishlist');
                return;
            }

            const baseUrl = this.getBaseUrl();
            const response = await fetch(`${baseUrl}/wishlists/quick-add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'userid': userId
                },
                body: JSON.stringify({ productId })
            });

            const data = await response.json();

            if (data.message) {
                // Show success message
                this.showToast(data.message, 'success');

                // Update wishlist icon
                const wishlistBtn = document.querySelector(`[data-product-id="${productId}"] .wishlist-btn i`);
                if (wishlistBtn) {
                    wishlistBtn.className = 'fas fa-heart';
                    wishlistBtn.style.color = '#e74c3c';
                }
            }

        } catch (error) {
            console.error('Error adding to wishlist:', error);
            this.showToast('Error adding to wishlist', 'error');
        }
    }

    showQuickView(productId) {
        // Implement quick view modal
        // This would show a modal with product details
        console.log('Quick view for product:', productId);
        // For now, just redirect to product page
        window.location.href = `product-details.html?id=${productId}`;
    }

    addToCart(productId) {
        // Implement add to cart functionality
        console.log('Add to cart:', productId);
        this.showToast('Added to cart!', 'success');
    }

    updatePagination(pagination) {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;

        this.currentPage = pagination.currentPage;
        this.totalPages = pagination.totalPages;

        if (pagination.totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        if (pagination.hasPrevPage) {
            paginationHTML += `
                <button class="pagination-btn" data-page="${pagination.currentPage - 1}">
                    <i class="fas fa-chevron-left"></i> Previous
                </button>
            `;
        }

        // Page numbers
        const startPage = Math.max(1, pagination.currentPage - 2);
        const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);

        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === pagination.currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }

        if (endPage < pagination.totalPages) {
            if (endPage < pagination.totalPages - 1) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" data-page="${pagination.totalPages}">${pagination.totalPages}</button>`;
        }

        // Next button
        if (pagination.hasNextPage) {
            paginationHTML += `
                <button class="pagination-btn" data-page="${pagination.currentPage + 1}">
                    Next <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }

        paginationContainer.innerHTML = paginationHTML;

        // Add click listeners to pagination buttons
        paginationContainer.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this.performSearch();
                }
            });
        });
    }

    showLoading() {
        const loadingElement = document.getElementById('search-loading');
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        }
    }

    hideLoading() {
        const loadingElement = document.getElementById('search-loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }

    displayError(message) {
        const productsGrid = document.getElementById('products-grid');
        if (productsGrid) {
            productsGrid.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="retry-btn">Try Again</button>
                </div>
            `;
        }
    }

    showToast(message, type = 'info') {
        // Create toast notification
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
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    generateSessionId() {
        return 'search_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getBaseUrl() {
        // Determine the correct base URL for API calls
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // Local development - use the Node.js server port
            return 'http://localhost:3000';
        } else if (window.location.hostname.includes('onrender.com')) {
            // Production on Render
            return 'https://tridex1.onrender.com';
        } else {
            // Default to current origin
            return window.location.origin;
        }
    }

    // Public method to perform search from external code
    search(query, filters = {}) {
        this.currentQuery = query;
        this.currentFilters = { ...this.currentFilters, ...filters };
        this.currentPage = 1;

        if (this.searchInput) {
            this.searchInput.value = query;
        }

        this.performSearch();
    }

    // Public method to get current search state
    getSearchState() {
        return {
            query: this.currentQuery,
            filters: this.currentFilters,
            sort: this.currentSort,
            page: this.currentPage
        };
    }
}

// Initialize advanced search when DOM is loaded - now works on all pages with search input
document.addEventListener('DOMContentLoaded', () => {
    // Check if there's a search input to enhance
    const searchInput = document.getElementById('search-input');

    // Initialize advanced search if there's a search input
    // The index.html page now has its own initialization logic to handle integration
    if (searchInput && !window.advancedSearch) {
        // Only auto-initialize if not already initialized by the page
        const isIndexPage = window.location.pathname === '/' ||
                           window.location.pathname.endsWith('/index.html') ||
                           window.location.pathname === '/index.html' ||
                           window.location.pathname === '';

        if (!isIndexPage) {
            // For non-index pages, initialize normally
            window.advancedSearch = new AdvancedSearch();
        }
        // For index page, let the page's own initialization handle it
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedSearch;
}