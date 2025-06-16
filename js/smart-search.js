/**
 * Tridex Smart Search & Product Suggestions - Phase 2B Implementation
 * AI-powered search enhancements and intelligent product suggestions
 */

class SmartSearchEngine {
    constructor() {
        this.searchHistory = this.loadSearchHistory();
        this.productData = [];
        this.searchIndex = {};
        this.suggestions = [];
        this.isInitialized = false;
        this.searchTimeout = null;
        this.minQueryLength = 2;

        this.init();
    }

    async init() {
        console.log('Smart Search: Initializing search engine...');

        // Load product data
        await this.loadProductData();

        // Build search index
        this.buildSearchIndex();

        // Setup search interface
        this.setupSearchInterface();

        // Setup intelligent suggestions
        this.setupIntelligentSuggestions();

        // Setup search analytics
        this.setupSearchAnalytics();

        this.isInitialized = true;
        console.log('Smart Search: Engine initialized successfully');
    }

    async loadProductData() {
        try {
            const baseUrl = this.getBaseUrl();
            const response = await fetch(`${baseUrl}/api/products?limit=200`);

            if (response.ok) {
                this.productData = await response.json();
                console.log(`Smart Search: Loaded ${this.productData.length} products`);
            } else {
                // Fallback to cached data
                this.productData = await this.loadCachedProducts();
            }
        } catch (error) {
            console.error('Smart Search: Error loading products:', error);
            this.productData = await this.loadCachedProducts();
        }
    }

    async loadCachedProducts() {
        // Try to get cached products from offline manager
        if (window.offlineManager) {
            return await window.offlineManager.getCachedProducts(200);
        }

        // Fallback sample data
        return this.generateSampleProducts();
    }

    generateSampleProducts() {
        return [
            { _id: '1', name: 'iPhone 15 Pro Max', category: 'Electronics', price: 1199, tags: ['smartphone', 'apple', 'mobile'], description: 'Latest iPhone with advanced camera system' },
            { _id: '2', name: 'MacBook Air M2', category: 'Electronics', price: 1299, tags: ['laptop', 'apple', 'computer'], description: 'Powerful laptop with M2 chip' },
            { _id: '3', name: 'Nike Air Max 270', category: 'Sports', price: 150, tags: ['shoes', 'nike', 'running'], description: 'Comfortable running shoes' },
            { _id: '4', name: 'Samsung 4K Smart TV', category: 'Electronics', price: 899, tags: ['tv', 'samsung', '4k'], description: 'Ultra HD Smart TV with streaming apps' },
            { _id: '5', name: 'Sony WH-1000XM5', category: 'Electronics', price: 399, tags: ['headphones', 'sony', 'wireless'], description: 'Noise-canceling wireless headphones' }
        ];
    }

    buildSearchIndex() {
        console.log('Smart Search: Building search index...');

        this.searchIndex = {
            byName: {},
            byCategory: {},
            byTags: {},
            byDescription: {},
            fuzzy: {}
        };

        this.productData.forEach(product => {
            // Index by name
            this.indexText(product.name, product, 'byName');

            // Index by category
            this.indexText(product.category, product, 'byCategory');

            // Index by tags
            if (product.tags) {
                product.tags.forEach(tag => {
                    this.indexText(tag, product, 'byTags');
                });
            }

            // Index by description
            if (product.description) {
                this.indexText(product.description, product, 'byDescription');
            }

            // Build fuzzy search index
            this.buildFuzzyIndex(product);
        });

        console.log('Smart Search: Search index built successfully');
    }

    indexText(text, product, indexType) {
        const words = text.toLowerCase().split(/\s+/);

        words.forEach(word => {
            if (word.length >= this.minQueryLength) {
                if (!this.searchIndex[indexType][word]) {
                    this.searchIndex[indexType][word] = [];
                }

                // Avoid duplicates
                if (!this.searchIndex[indexType][word].find(p => p._id === product._id)) {
                    this.searchIndex[indexType][word].push(product);
                }
            }
        });
    }

    buildFuzzyIndex(product) {
        const text = `${product.name} ${product.category} ${(product.tags || []).join(' ')} ${product.description || ''}`.toLowerCase();
        const words = text.split(/\s+/);

        words.forEach(word => {
            if (word.length >= this.minQueryLength) {
                // Create n-grams for fuzzy matching
                for (let i = 0; i <= word.length - 2; i++) {
                    const ngram = word.substring(i, i + 3);
                    if (!this.searchIndex.fuzzy[ngram]) {
                        this.searchIndex.fuzzy[ngram] = [];
                    }

                    if (!this.searchIndex.fuzzy[ngram].find(p => p._id === product._id)) {
                        this.searchIndex.fuzzy[ngram].push(product);
                    }
                }
            }
        });
    }

    setupSearchInterface() {
        const searchInput = document.getElementById('search-input');
        const searchForm = document.getElementById('search-form');

        if (searchInput) {
            // Enhanced search input with suggestions
            this.enhanceSearchInput(searchInput);

            // Real-time search suggestions
            searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });

            // Search on enter
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch(e.target.value);
                }
            });

            // Focus and blur events
            searchInput.addEventListener('focus', () => {
                this.showSearchSuggestions();
            });

            searchInput.addEventListener('blur', () => {
                // Delay hiding to allow clicking on suggestions
                setTimeout(() => this.hideSearchSuggestions(), 200);
            });
        }

        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = searchInput ? searchInput.value : '';
                this.performSearch(query);
            });
        }
    }

    enhanceSearchInput(searchInput) {
        // Create suggestions container
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.id = 'search-suggestions';
        suggestionsContainer.className = 'search-suggestions';

        // Insert after search input
        searchInput.parentNode.insertBefore(suggestionsContainer, searchInput.nextSibling);

        // Add enhanced styling
        this.addSearchStyles();

        // Add search features
        this.addSearchFeatures(searchInput);
    }

    addSearchFeatures(searchInput) {
        // Add search icon and clear button
        const searchContainer = searchInput.parentNode;
        searchContainer.classList.add('enhanced-search-container');

        // Add clear button
        const clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.className = 'search-clear-btn';
        clearButton.innerHTML = '<i class="fas fa-times"></i>';
        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            this.hideSearchSuggestions();
            searchInput.focus();
        });

        searchContainer.appendChild(clearButton);

        // Add voice search button (if supported)
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            this.addVoiceSearch(searchContainer, searchInput);
        }
    }

    addVoiceSearch(container, searchInput) {
        const voiceButton = document.createElement('button');
        voiceButton.type = 'button';
        voiceButton.className = 'voice-search-btn';
        voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceButton.title = 'Voice Search';

        voiceButton.addEventListener('click', () => {
            this.startVoiceSearch(searchInput, voiceButton);
        });

        container.appendChild(voiceButton);
    }

    startVoiceSearch(searchInput, voiceButton) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        voiceButton.classList.add('listening');
        voiceButton.innerHTML = '<i class="fas fa-microphone-slash"></i>';

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            searchInput.value = transcript;
            this.handleSearchInput(transcript);
            this.performSearch(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Voice search error:', event.error);
            this.showToast('Voice search failed. Please try again.', 'error');
        };

        recognition.onend = () => {
            voiceButton.classList.remove('listening');
            voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
        };

        recognition.start();
    }

    handleSearchInput(query) {
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Debounce search suggestions
        this.searchTimeout = setTimeout(() => {
            if (query.length >= this.minQueryLength) {
                this.generateSearchSuggestions(query);
            } else {
                this.hideSearchSuggestions();
            }
        }, 300);
    }

    generateSearchSuggestions(query) {
        const suggestions = this.getSearchSuggestions(query);
        this.displaySearchSuggestions(suggestions, query);
    }

    getSearchSuggestions(query) {
        const queryLower = query.toLowerCase();
        const suggestions = [];

        // Get exact matches first
        const exactMatches = this.getExactMatches(queryLower);
        suggestions.push(...exactMatches);

        // Get partial matches
        const partialMatches = this.getPartialMatches(queryLower);
        suggestions.push(...partialMatches);

        // Get fuzzy matches
        const fuzzyMatches = this.getFuzzyMatches(queryLower);
        suggestions.push(...fuzzyMatches);

        // Get intelligent suggestions
        const intelligentSuggestions = this.getIntelligentSuggestions(queryLower);
        suggestions.push(...intelligentSuggestions);

        // Remove duplicates and limit results
        const uniqueSuggestions = this.removeDuplicates(suggestions);
        return uniqueSuggestions.slice(0, 8);
    }

    getExactMatches(query) {
        const matches = [];

        // Search in names
        Object.keys(this.searchIndex.byName).forEach(word => {
            if (word.startsWith(query)) {
                matches.push(...this.searchIndex.byName[word].map(product => ({
                    type: 'product',
                    product: product,
                    matchType: 'name',
                    score: 10
                })));
            }
        });

        // Search in categories
        Object.keys(this.searchIndex.byCategory).forEach(word => {
            if (word.startsWith(query)) {
                matches.push(...this.searchIndex.byCategory[word].map(product => ({
                    type: 'category',
                    product: product,
                    matchType: 'category',
                    score: 8
                })));
            }
        });

        return matches;
    }

    getPartialMatches(query) {
        const matches = [];

        // Search in names (contains)
        Object.keys(this.searchIndex.byName).forEach(word => {
            if (word.includes(query) && !word.startsWith(query)) {
                matches.push(...this.searchIndex.byName[word].map(product => ({
                    type: 'product',
                    product: product,
                    matchType: 'name_partial',
                    score: 6
                })));
            }
        });

        // Search in tags
        Object.keys(this.searchIndex.byTags).forEach(word => {
            if (word.includes(query)) {
                matches.push(...this.searchIndex.byTags[word].map(product => ({
                    type: 'product',
                    product: product,
                    matchType: 'tag',
                    score: 5
                })));
            }
        });

        return matches;
    }

    getFuzzyMatches(query) {
        const matches = [];
        const threshold = 0.6;

        // Generate n-grams for query
        const queryNgrams = this.generateNgrams(query, 3);

        queryNgrams.forEach(ngram => {
            if (this.searchIndex.fuzzy[ngram]) {
                matches.push(...this.searchIndex.fuzzy[ngram].map(product => ({
                    type: 'product',
                    product: product,
                    matchType: 'fuzzy',
                    score: 3
                })));
            }
        });

        return matches;
    }

    getIntelligentSuggestions(query) {
        const suggestions = [];

        // Get suggestions based on search history
        const historySuggestions = this.getHistoryBasedSuggestions(query);
        suggestions.push(...historySuggestions);

        // Get trending search suggestions
        const trendingSuggestions = this.getTrendingSuggestions(query);
        suggestions.push(...trendingSuggestions);

        // Get category suggestions
        const categorySuggestions = this.getCategorySuggestions(query);
        suggestions.push(...categorySuggestions);

        return suggestions;
    }

    getHistoryBasedSuggestions(query) {
        const suggestions = [];
        const recentSearches = this.searchHistory.slice(-10);

        recentSearches.forEach(search => {
            if (search.query.toLowerCase().includes(query) && search.query.toLowerCase() !== query) {
                suggestions.push({
                    type: 'history',
                    text: search.query,
                    matchType: 'history',
                    score: 4
                });
            }
        });

        return suggestions;
    }

    getTrendingSuggestions(query) {
        // Simulate trending searches
        const trending = [
            'iphone 15', 'macbook air', 'nike shoes', 'samsung tv', 'wireless headphones',
            'gaming laptop', 'smart watch', 'bluetooth speaker', 'tablet', 'camera'
        ];

        return trending
            .filter(term => term.includes(query) && term !== query)
            .map(term => ({
                type: 'trending',
                text: term,
                matchType: 'trending',
                score: 3
            }));
    }

    getCategorySuggestions(query) {
        const categories = ['Electronics', 'Fashion', 'Home', 'Sports', 'Books', 'Beauty', 'Toys'];

        return categories
            .filter(category => category.toLowerCase().includes(query))
            .map(category => ({
                type: 'category',
                text: `Browse ${category}`,
                category: category,
                matchType: 'category_browse',
                score: 2
            }));
    }

    displaySearchSuggestions(suggestions, query) {
        const container = document.getElementById('search-suggestions');
        if (!container) return;

        if (suggestions.length === 0) {
            container.style.display = 'none';
            return;
        }

        // Sort suggestions by score
        suggestions.sort((a, b) => b.score - a.score);

        const suggestionsHTML = suggestions.map(suggestion =>
            this.generateSuggestionHTML(suggestion, query)
        ).join('');

        container.innerHTML = suggestionsHTML;
        container.style.display = 'block';

        // Add click handlers
        this.addSuggestionClickHandlers(container);
    }

    generateSuggestionHTML(suggestion, query) {
        const highlightedText = this.highlightQuery(suggestion.text || suggestion.product?.name || '', query);

        switch (suggestion.type) {
            case 'product':
                return `
                    <div class="suggestion-item product-suggestion" data-product-id="${suggestion.product._id}">
                        <div class="suggestion-icon">
                            <i class="fas fa-box"></i>
                        </div>
                        <div class="suggestion-content">
                            <div class="suggestion-title">${highlightedText}</div>
                            <div class="suggestion-meta">${suggestion.product.category} • $${suggestion.product.price}</div>
                        </div>
                        <div class="suggestion-action">
                            <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>
                `;

            case 'category':
                return `
                    <div class="suggestion-item category-suggestion" data-category="${suggestion.category || suggestion.text}">
                        <div class="suggestion-icon">
                            <i class="fas fa-th-large"></i>
                        </div>
                        <div class="suggestion-content">
                            <div class="suggestion-title">${highlightedText}</div>
                            <div class="suggestion-meta">Category</div>
                        </div>
                        <div class="suggestion-action">
                            <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>
                `;

            case 'history':
                return `
                    <div class="suggestion-item history-suggestion" data-query="${suggestion.text}">
                        <div class="suggestion-icon">
                            <i class="fas fa-history"></i>
                        </div>
                        <div class="suggestion-content">
                            <div class="suggestion-title">${highlightedText}</div>
                            <div class="suggestion-meta">Recent search</div>
                        </div>
                        <div class="suggestion-action">
                            <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>
                `;

            case 'trending':
                return `
                    <div class="suggestion-item trending-suggestion" data-query="${suggestion.text}">
                        <div class="suggestion-icon">
                            <i class="fas fa-fire"></i>
                        </div>
                        <div class="suggestion-content">
                            <div class="suggestion-title">${highlightedText}</div>
                            <div class="suggestion-meta">Trending</div>
                        </div>
                        <div class="suggestion-action">
                            <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>
                `;

            default:
                return `
                    <div class="suggestion-item" data-query="${suggestion.text}">
                        <div class="suggestion-icon">
                            <i class="fas fa-search"></i>
                        </div>
                        <div class="suggestion-content">
                            <div class="suggestion-title">${highlightedText}</div>
                        </div>
                        <div class="suggestion-action">
                            <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>
                `;
        }
    }

    highlightQuery(text, query) {
        if (!query || !text) return text;

        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    addSuggestionClickHandlers(container) {
        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const productId = item.dataset.productId;
                const category = item.dataset.category;
                const query = item.dataset.query;

                if (productId) {
                    this.handleProductSuggestionClick(productId);
                } else if (category) {
                    this.handleCategorySuggestionClick(category);
                } else if (query) {
                    this.handleQuerySuggestionClick(query);
                }

                this.hideSearchSuggestions();
            });
        });
    }

    handleProductSuggestionClick(productId) {
        // Navigate to product page
        window.location.href = `product.html?id=${productId}`;
        this.trackSuggestionClick('product', productId);
    }

    handleCategorySuggestionClick(category) {
        // Navigate to category page or filter
        window.location.href = `products.html?category=${encodeURIComponent(category)}`;
        this.trackSuggestionClick('category', category);
    }

    handleQuerySuggestionClick(query) {
        // Perform search with suggested query
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = query;
        }
        this.performSearch(query);
        this.trackSuggestionClick('query', query);
    }

    performSearch(query) {
        if (!query || query.length < this.minQueryLength) return;

        console.log('Smart Search: Performing search for:', query);

        // Add to search history
        this.addToSearchHistory(query);

        // Get search results
        const results = this.searchProducts(query);

        // Display results
        this.displaySearchResults(results, query);

        // Track search
        this.trackSearch(query, results.length);

        // Hide suggestions
        this.hideSearchSuggestions();
    }

    searchProducts(query) {
        const queryLower = query.toLowerCase();
        const results = [];

        // Get all matches with scores
        const allMatches = this.getSearchSuggestions(queryLower);

        // Extract unique products
        const productMatches = allMatches
            .filter(match => match.type === 'product')
            .map(match => ({
                ...match.product,
                matchScore: match.score,
                matchType: match.matchType
            }));

        // Remove duplicates and sort by relevance
        const uniqueProducts = this.removeDuplicateProducts(productMatches);
        return uniqueProducts.sort((a, b) => b.matchScore - a.matchScore);
    }

    displaySearchResults(results, query) {
        // Create or update search results container
        let resultsContainer = document.getElementById('search-results');

        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'search-results';
            resultsContainer.className = 'search-results-container';

            // Insert after main content or recommendations
            const mainContent = document.querySelector('main');
            const recommendations = document.getElementById('recommendations-container');

            if (recommendations) {
                recommendations.parentNode.insertBefore(resultsContainer, recommendations);
            } else if (mainContent) {
                mainContent.appendChild(resultsContainer);
            }
        }

        // Generate results HTML
        const resultsHTML = this.generateSearchResultsHTML(results, query);
        resultsContainer.innerHTML = resultsHTML;

        // Scroll to results
        resultsContainer.scrollIntoView({ behavior: 'smooth' });

        // Hide other sections if results are shown
        if (results.length > 0) {
            this.hideOtherSections();
        }
    }

    generateSearchResultsHTML(results, query) {
        if (results.length === 0) {
            return `
                <div class="search-results-header">
                    <h2>No results found for "${query}"</h2>
                    <p>Try different keywords or browse our categories</p>
                </div>
                <div class="search-suggestions-section">
                    <h3>Suggested searches:</h3>
                    <div class="suggested-queries">
                        ${this.generateAlternativeQueries(query).map(alt =>
                            `<button class="suggested-query-btn" onclick="smartSearchEngine.performSearch('${alt}')">${alt}</button>`
                        ).join('')}
                    </div>
                </div>
            `;
        }

        return `
            <div class="search-results-header">
                <h2>Search Results for "${query}" (${results.length} found)</h2>
                <div class="search-filters">
                    <button class="filter-btn active" data-filter="all">All</button>
                    <button class="filter-btn" data-filter="Electronics">Electronics</button>
                    <button class="filter-btn" data-filter="Fashion">Fashion</button>
                    <button class="filter-btn" data-filter="Home">Home</button>
                    <button class="filter-btn" data-filter="Sports">Sports</button>
                </div>
            </div>
            <div class="search-results-grid">
                ${results.map(product => this.generateProductResultHTML(product)).join('')}
            </div>
        `;
    }

    generateProductResultHTML(product) {
        const imageUrl = product.image || '/images/placeholder-product.jpg';
        const price = product.price ? `$${product.price}` : 'Price not available';
        const rating = product.rating ? '★'.repeat(Math.floor(product.rating)) : '';

        return `
            <div class="search-result-item" data-product-id="${product._id}" data-category="${product.category}">
                <div class="result-image">
                    <img src="${imageUrl}" alt="${product.name}" loading="lazy">
                    <div class="result-overlay">
                        <button class="quick-view-btn" onclick="smartSearchEngine.showQuickView('${product._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                <div class="result-content">
                    <h3 class="result-title">${product.name}</h3>
                    <div class="result-category">${product.category}</div>
                    <div class="result-rating">${rating}</div>
                    <div class="result-price">${price}</div>
                    <div class="result-actions">
                        <button class="btn btn-primary" onclick="smartSearchEngine.addToCart('${product._id}')">
                            <i class="fas fa-shopping-cart"></i>
                            Add to Cart
                        </button>
                        <button class="btn btn-secondary" onclick="smartSearchEngine.viewProduct('${product._id}')">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    generateAlternativeQueries(query) {
        // Generate alternative search suggestions
        const alternatives = [];

        // Similar words
        const similarWords = {
            'phone': ['smartphone', 'mobile', 'cell phone'],
            'laptop': ['computer', 'notebook', 'macbook'],
            'shoes': ['footwear', 'sneakers', 'boots'],
            'tv': ['television', 'smart tv', 'monitor']
        };

        Object.keys(similarWords).forEach(key => {
            if (query.toLowerCase().includes(key)) {
                similarWords[key].forEach(alt => {
                    alternatives.push(query.toLowerCase().replace(key, alt));
                });
            }
        });

        // Add popular searches
        alternatives.push('bestsellers', 'new arrivals', 'on sale');

        return alternatives.slice(0, 5);
    }

    // Utility Methods
    removeDuplicates(items) {
        const seen = new Set();
        return items.filter(item => {
            const key = item.product ? item.product._id : item.text;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    removeDuplicateProducts(products) {
        const seen = new Set();
        return products.filter(product => {
            if (seen.has(product._id)) {
                return false;
            }
            seen.add(product._id);
            return true;
        });
    }

    generateNgrams(text, n) {
        const ngrams = [];
        for (let i = 0; i <= text.length - n; i++) {
            ngrams.push(text.substring(i, i + n));
        }
        return ngrams;
    }

    // Search History Management
    loadSearchHistory() {
        const saved = localStorage.getItem('search-history');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                console.error('Smart Search: Error loading search history:', error);
            }
        }
        return [];
    }

    addToSearchHistory(query) {
        const searchEntry = {
            query: query,
            timestamp: Date.now()
        };

        // Remove duplicate
        this.searchHistory = this.searchHistory.filter(entry => entry.query !== query);

        // Add to beginning
        this.searchHistory.unshift(searchEntry);

        // Keep only last 50 searches
        if (this.searchHistory.length > 50) {
            this.searchHistory = this.searchHistory.slice(0, 50);
        }

        // Save to localStorage
        localStorage.setItem('search-history', JSON.stringify(this.searchHistory));
    }

    // UI Methods
    showSearchSuggestions() {
        const container = document.getElementById('search-suggestions');
        if (container && container.innerHTML.trim()) {
            container.style.display = 'block';
        }
    }

    hideSearchSuggestions() {
        const container = document.getElementById('search-suggestions');
        if (container) {
            container.style.display = 'none';
        }
    }

    hideOtherSections() {
        // Hide recommendations when showing search results
        const recommendations = document.getElementById('recommendations-container');
        if (recommendations) {
            recommendations.style.display = 'none';
        }
    }

    showOtherSections() {
        // Show recommendations when clearing search
        const recommendations = document.getElementById('recommendations-container');
        if (recommendations) {
            recommendations.style.display = 'block';
        }
    }

    clearSearchResults() {
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
        this.showOtherSections();
    }

    // Action Methods
    showQuickView(productId) {
        console.log('Smart Search: Showing quick view for product:', productId);
        // Implement quick view modal
    }

    addToCart(productId) {
        console.log('Smart Search: Adding to cart:', productId);
        // Trigger cart addition
        window.dispatchEvent(new CustomEvent('cart-updated', {
            detail: { productId, action: 'add' }
        }));
    }

    viewProduct(productId) {
        window.location.href = `product.html?id=${productId}`;
    }

    // Analytics and Tracking
    trackSearch(query, resultCount) {
        const searchEvent = {
            query: query,
            resultCount: resultCount,
            timestamp: Date.now()
        };

        // Store for analytics
        const searches = JSON.parse(localStorage.getItem('search-analytics') || '[]');
        searches.push(searchEvent);

        // Keep only last 100 searches
        if (searches.length > 100) {
            searches.splice(0, searches.length - 100);
        }

        localStorage.setItem('search-analytics', JSON.stringify(searches));
    }

    trackSuggestionClick(type, value) {
        const clickEvent = {
            type: type,
            value: value,
            timestamp: Date.now()
        };

        // Store for analytics
        const clicks = JSON.parse(localStorage.getItem('suggestion-clicks') || '[]');
        clicks.push(clickEvent);

        // Keep only last 100 clicks
        if (clicks.length > 100) {
            clicks.splice(0, clicks.length - 100);
        }

        localStorage.setItem('suggestion-clicks', JSON.stringify(clicks));
    }

    setupIntelligentSuggestions() {
        // Setup intelligent suggestions based on user behavior
        if (window.aiRecommendationEngine) {
            // Use AI recommendations for search suggestions
            this.aiRecommendations = window.aiRecommendationEngine;
        }
    }

    setupSearchAnalytics() {
        // Setup search analytics and optimization
        this.searchAnalytics = {
            totalSearches: 0,
            successfulSearches: 0,
            popularQueries: {},
            averageResultCount: 0
        };

        this.loadSearchAnalytics();
    }

    loadSearchAnalytics() {
        const saved = localStorage.getItem('search-analytics-summary');
        if (saved) {
            try {
                this.searchAnalytics = { ...this.searchAnalytics, ...JSON.parse(saved) };
            } catch (error) {
                console.error('Smart Search: Error loading analytics:', error);
            }
        }
    }

    // Styling
    addSearchStyles() {
        if (document.getElementById('smart-search-styles')) return;

        const styles = `
            <style id="smart-search-styles">
                .enhanced-search-container {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .search-clear-btn, .voice-search-btn {
                    position: absolute;
                    right: 10px;
                    background: none;
                    border: none;
                    color: #666;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 4px;
                    transition: all 0.3s ease;
                }

                .voice-search-btn {
                    right: 40px;
                }

                .search-clear-btn:hover, .voice-search-btn:hover {
                    background: #f0f0f0;
                    color: #333;
                }

                .voice-search-btn.listening {
                    color: #dc3545;
                    animation: pulse 1s infinite;
                }

                .search-suggestions {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white;
                    border: 1px solid #ddd;
                    border-top: none;
                    border-radius: 0 0 8px 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                    z-index: 1000;
                    max-height: 400px;
                    overflow-y: auto;
                    display: none;
                }

                .suggestion-item {
                    display: flex;
                    align-items: center;
                    padding: 12px 16px;
                    cursor: pointer;
                    transition: background 0.2s ease;
                    border-bottom: 1px solid #f0f0f0;
                }

                .suggestion-item:hover {
                    background: #f8f9fa;
                }

                .suggestion-item:last-child {
                    border-bottom: none;
                }

                .suggestion-icon {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f0f0f0;
                    border-radius: 50%;
                    margin-right: 12px;
                    color: #666;
                }

                .product-suggestion .suggestion-icon {
                    background: #e3f2fd;
                    color: #1976d2;
                }

                .category-suggestion .suggestion-icon {
                    background: #f3e5f5;
                    color: #7b1fa2;
                }

                .history-suggestion .suggestion-icon {
                    background: #fff3e0;
                    color: #f57c00;
                }

                .trending-suggestion .suggestion-icon {
                    background: #ffebee;
                    color: #d32f2f;
                }

                .suggestion-content {
                    flex: 1;
                }

                .suggestion-title {
                    font-weight: 500;
                    color: #333;
                    margin-bottom: 2px;
                }

                .suggestion-title mark {
                    background: #fff3cd;
                    color: #856404;
                    padding: 1px 2px;
                    border-radius: 2px;
                }

                .suggestion-meta {
                    font-size: 0.85rem;
                    color: #666;
                }

                .suggestion-action {
                    color: #999;
                    font-size: 0.9rem;
                }

                .search-results-container {
                    margin: 40px auto;
                    max-width: 1200px;
                    padding: 0 20px;
                }

                .search-results-header {
                    margin-bottom: 30px;
                    text-align: center;
                }

                .search-results-header h2 {
                    color: #333;
                    margin-bottom: 16px;
                }

                .search-filters {
                    display: flex;
                    justify-content: center;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .filter-btn {
                    padding: 8px 16px;
                    border: 1px solid #ddd;
                    background: white;
                    color: #666;
                    border-radius: 20px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .filter-btn.active, .filter-btn:hover {
                    background: #007bff;
                    color: white;
                    border-color: #007bff;
                }

                .search-results-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 24px;
                }

                .search-result-item {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                    overflow: hidden;
                    transition: all 0.3s ease;
                }

                .search-result-item:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
                }

                .result-image {
                    position: relative;
                    height: 200px;
                    overflow: hidden;
                }

                .result-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .result-overlay {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .search-result-item:hover .result-overlay {
                    opacity: 1;
                }

                .quick-view-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: none;
                    background: rgba(255, 255, 255, 0.9);
                    color: #333;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                }

                .quick-view-btn:hover {
                    background: #007bff;
                    color: white;
                }

                .result-content {
                    padding: 20px;
                }

                .result-title {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #333;
                    margin: 0 0 8px 0;
                }

                .result-category {
                    color: #666;
                    font-size: 0.9rem;
                    margin-bottom: 8px;
                }

                .result-rating {
                    color: #ffc107;
                    margin-bottom: 8px;
                }

                .result-price {
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: #007bff;
                    margin-bottom: 16px;
                }

                .result-actions {
                    display: flex;
                    gap: 8px;
                }

                .result-actions .btn {
                    flex: 1;
                    padding: 10px 16px;
                    border: none;
                    border-radius: 6px;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }

                .btn-primary {
                    background: #007bff;
                    color: white;
                }

                .btn-primary:hover {
                    background: #0056b3;
                }

                .btn-secondary {
                    background: #6c757d;
                    color: white;
                }

                .btn-secondary:hover {
                    background: #545b62;
                }

                .suggested-queries {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                    justify-content: center;
                    margin-top: 16px;
                }

                .suggested-query-btn {
                    padding: 8px 16px;
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 20px;
                    color: #495057;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .suggested-query-btn:hover {
                    background: #007bff;
                    color: white;
                    border-color: #007bff;
                }

                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }

                @media (max-width: 768px) {
                    .search-results-grid {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }

                    .search-filters {
                        gap: 8px;
                    }

                    .filter-btn {
                        padding: 6px 12px;
                        font-size: 0.9rem;
                    }

                    .result-actions {
                        flex-direction: column;
                    }
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-size: 14px;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            ${type === 'error' ? 'background: #dc3545;' : 'background: #28a745;'}
        `;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Utility method
    getBaseUrl() {
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

    // Public API Methods
    getSearchHistory() {
        return this.searchHistory;
    }

    clearSearchHistory() {
        this.searchHistory = [];
        localStorage.removeItem('search-history');
    }

    getSearchAnalytics() {
        return {
            analytics: this.searchAnalytics,
            searches: JSON.parse(localStorage.getItem('search-analytics') || '[]'),
            clicks: JSON.parse(localStorage.getItem('suggestion-clicks') || '[]')
        };
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.smartSearchEngine = new SmartSearchEngine();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartSearchEngine;
}