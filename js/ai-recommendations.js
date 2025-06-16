/**
 * Tridex AI Recommendation Engine - Phase 2B Implementation
 * Advanced recommendation system with collaborative filtering, content-based, and hybrid approaches
 */

class AIRecommendationEngine {
    constructor() {
        this.userBehavior = this.loadUserBehavior();
        this.productData = [];
        this.userPreferences = this.loadUserPreferences();
        this.recommendations = {
            collaborative: [],
            contentBased: [],
            hybrid: [],
            trending: [],
            personalized: []
        };
        
        this.init();
    }

    async init() {
        console.log('AI Recommendations: Initializing recommendation engine...');
        
        // Load product data
        await this.loadProductData();
        
        // Initialize user tracking
        this.initializeUserTracking();
        
        // Generate initial recommendations
        await this.generateRecommendations();
        
        // Setup real-time updates
        this.setupRealtimeUpdates();
        
        console.log('AI Recommendations: Engine initialized successfully');
    }

    // Data Loading Methods
    async loadProductData() {
        try {
            const baseUrl = this.getBaseUrl();
            const response = await fetch(`${baseUrl}/api/products?limit=100`);
            
            if (response.ok) {
                this.productData = await response.json();
                console.log(`AI Recommendations: Loaded ${this.productData.length} products`);
            } else {
                // Fallback to cached data
                this.productData = await this.loadCachedProducts();
            }
        } catch (error) {
            console.error('AI Recommendations: Error loading products:', error);
            this.productData = await this.loadCachedProducts();
        }
    }

    async loadCachedProducts() {
        // Try to get cached products from offline manager
        if (window.offlineManager) {
            return await window.offlineManager.getCachedProducts(100);
        }
        
        // Fallback sample data for demonstration
        return this.generateSampleProducts();
    }

    generateSampleProducts() {
        return [
            { _id: '1', name: 'Smartphone Pro', category: 'Electronics', price: 999, tags: ['mobile', 'tech'], rating: 4.5 },
            { _id: '2', name: 'Laptop Ultra', category: 'Electronics', price: 1299, tags: ['computer', 'tech'], rating: 4.7 },
            { _id: '3', name: 'Running Shoes', category: 'Sports', price: 129, tags: ['shoes', 'fitness'], rating: 4.3 },
            { _id: '4', name: 'Coffee Maker', category: 'Home', price: 89, tags: ['kitchen', 'appliance'], rating: 4.2 },
            { _id: '5', name: 'Wireless Headphones', category: 'Electronics', price: 199, tags: ['audio', 'wireless'], rating: 4.6 }
        ];
    }

    loadUserBehavior() {
        const saved = localStorage.getItem('user-behavior');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                console.error('AI Recommendations: Error loading user behavior:', error);
            }
        }
        
        return {
            views: {},
            purchases: {},
            searches: [],
            categories: {},
            timeSpent: {},
            interactions: []
        };
    }

    loadUserPreferences() {
        const saved = localStorage.getItem('user-preferences');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                console.error('AI Recommendations: Error loading user preferences:', error);
            }
        }
        
        return {
            categories: {},
            priceRange: { min: 0, max: 1000 },
            brands: {},
            features: {},
            lastUpdated: Date.now()
        };
    }

    // User Tracking Methods
    initializeUserTracking() {
        // Track page views
        this.trackPageView();
        
        // Track product interactions
        this.trackProductInteractions();
        
        // Track search behavior
        this.trackSearchBehavior();
        
        // Track time spent
        this.trackTimeSpent();
    }

    trackPageView() {
        const currentPage = window.location.pathname;
        const timestamp = Date.now();
        
        this.userBehavior.interactions.push({
            type: 'page_view',
            page: currentPage,
            timestamp: timestamp
        });
        
        this.saveUserBehavior();
    }

    trackProductInteractions() {
        // Track product card clicks
        document.addEventListener('click', (e) => {
            const productCard = e.target.closest('.product-card');
            if (productCard) {
                const productId = productCard.dataset.productId;
                if (productId) {
                    this.trackProductView(productId);
                }
            }
        });
        
        // Track wishlist additions
        document.addEventListener('wishlist-updated', (e) => {
            if (e.detail && e.detail.productId) {
                this.trackWishlistAction(e.detail.productId, e.detail.action);
            }
        });
        
        // Track cart additions
        document.addEventListener('cart-updated', (e) => {
            if (e.detail && e.detail.productId) {
                this.trackCartAction(e.detail.productId, e.detail.action);
            }
        });
    }

    trackSearchBehavior() {
        // Track search queries
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                if (query.length > 2) {
                    this.trackSearch(query);
                }
            });
        }
    }

    trackTimeSpent() {
        let startTime = Date.now();
        
        window.addEventListener('beforeunload', () => {
            const timeSpent = Date.now() - startTime;
            const page = window.location.pathname;
            
            this.userBehavior.timeSpent[page] = (this.userBehavior.timeSpent[page] || 0) + timeSpent;
            this.saveUserBehavior();
        });
    }

    // Tracking Action Methods
    trackProductView(productId) {
        this.userBehavior.views[productId] = (this.userBehavior.views[productId] || 0) + 1;
        
        const product = this.productData.find(p => p._id === productId);
        if (product) {
            this.userBehavior.categories[product.category] = (this.userBehavior.categories[product.category] || 0) + 1;
        }
        
        this.userBehavior.interactions.push({
            type: 'product_view',
            productId: productId,
            timestamp: Date.now()
        });
        
        this.saveUserBehavior();
        this.updateRecommendations();
    }

    trackWishlistAction(productId, action) {
        this.userBehavior.interactions.push({
            type: 'wishlist_action',
            productId: productId,
            action: action,
            timestamp: Date.now()
        });
        
        this.saveUserBehavior();
        this.updateRecommendations();
    }

    trackCartAction(productId, action) {
        this.userBehavior.interactions.push({
            type: 'cart_action',
            productId: productId,
            action: action,
            timestamp: Date.now()
        });
        
        this.saveUserBehavior();
        this.updateRecommendations();
    }

    trackSearch(query) {
        this.userBehavior.searches.push({
            query: query,
            timestamp: Date.now()
        });
        
        // Keep only last 50 searches
        if (this.userBehavior.searches.length > 50) {
            this.userBehavior.searches = this.userBehavior.searches.slice(-50);
        }
        
        this.saveUserBehavior();
    }

    trackPurchase(productId) {
        this.userBehavior.purchases[productId] = (this.userBehavior.purchases[productId] || 0) + 1;
        
        this.userBehavior.interactions.push({
            type: 'purchase',
            productId: productId,
            timestamp: Date.now()
        });
        
        this.saveUserBehavior();
        this.updateRecommendations();
    }

    // Recommendation Generation Methods
    async generateRecommendations() {
        console.log('AI Recommendations: Generating recommendations...');
        
        // Generate different types of recommendations
        this.recommendations.collaborative = await this.generateCollaborativeRecommendations();
        this.recommendations.contentBased = await this.generateContentBasedRecommendations();
        this.recommendations.trending = await this.generateTrendingRecommendations();
        this.recommendations.hybrid = await this.generateHybridRecommendations();
        this.recommendations.personalized = await this.generatePersonalizedRecommendations();
        
        // Save recommendations
        this.saveRecommendations();
        
        // Trigger update event
        window.dispatchEvent(new CustomEvent('recommendations-updated', {
            detail: this.recommendations
        }));
        
        console.log('AI Recommendations: All recommendations generated');
    }

    async generateCollaborativeRecommendations() {
        // Simplified collaborative filtering based on user behavior similarity
        const userViews = this.userBehavior.views;
        const recommendations = [];
        
        // Find products viewed by users with similar behavior
        const similarProducts = this.findSimilarUserProducts(userViews);
        
        // Score and sort recommendations
        const scored = similarProducts.map(product => ({
            ...product,
            score: this.calculateCollaborativeScore(product),
            reason: 'Users with similar interests also viewed this'
        }));
        
        return scored.sort((a, b) => b.score - a.score).slice(0, 10);
    }

    async generateContentBasedRecommendations() {
        const recommendations = [];
        const userCategories = this.userBehavior.categories;
        
        // Get user's preferred categories
        const preferredCategories = Object.keys(userCategories)
            .sort((a, b) => userCategories[b] - userCategories[a])
            .slice(0, 3);
        
        // Find products in preferred categories
        for (const category of preferredCategories) {
            const categoryProducts = this.productData
                .filter(p => p.category === category)
                .filter(p => !this.userBehavior.views[p._id]) // Exclude already viewed
                .map(product => ({
                    ...product,
                    score: this.calculateContentScore(product, category),
                    reason: `Based on your interest in ${category}`
                }));
            
            recommendations.push(...categoryProducts);
        }
        
        return recommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
    }

    async generateTrendingRecommendations() {
        // Simulate trending products based on view counts and ratings
        return this.productData
            .map(product => ({
                ...product,
                score: (product.rating || 4) * Math.random() * 2,
                reason: 'Trending now'
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 8);
    }

    async generateHybridRecommendations() {
        // Combine collaborative and content-based recommendations
        const collaborative = this.recommendations.collaborative || [];
        const contentBased = this.recommendations.contentBased || [];
        
        const combined = [...collaborative, ...contentBased];
        const uniqueProducts = this.removeDuplicateProducts(combined);
        
        // Re-score with hybrid approach
        const hybridScored = uniqueProducts.map(product => ({
            ...product,
            score: this.calculateHybridScore(product),
            reason: 'Personalized for you'
        }));
        
        return hybridScored
            .sort((a, b) => b.score - a.score)
            .slice(0, 12);
    }

    async generatePersonalizedRecommendations() {
        // Advanced personalized recommendations based on all user data
        const recentInteractions = this.getRecentInteractions();
        const searchKeywords = this.extractSearchKeywords();
        
        const personalized = this.productData
            .filter(product => this.isPersonallyRelevant(product, recentInteractions, searchKeywords))
            .map(product => ({
                ...product,
                score: this.calculatePersonalizedScore(product, recentInteractions, searchKeywords),
                reason: this.getPersonalizationReason(product)
            }));
        
        return personalized
            .sort((a, b) => b.score - a.score)
            .slice(0, 15);
    }

    // Scoring Methods
    calculateCollaborativeScore(product) {
        const baseScore = product.rating || 4;
        const categoryBoost = this.userBehavior.categories[product.category] || 0;
        return baseScore + (categoryBoost * 0.1);
    }

    calculateContentScore(product, category) {
        const baseScore = product.rating || 4;
        const categoryWeight = this.userBehavior.categories[category] || 1;
        const priceScore = this.calculatePriceScore(product.price);
        
        return baseScore * (1 + categoryWeight * 0.1) * priceScore;
    }

    calculateHybridScore(product) {
        const collaborativeWeight = 0.4;
        const contentWeight = 0.4;
        const trendingWeight = 0.2;
        
        const collabScore = this.calculateCollaborativeScore(product);
        const contentScore = this.calculateContentScore(product, product.category);
        const trendingScore = (product.rating || 4) * Math.random();
        
        return (collabScore * collaborativeWeight) + 
               (contentScore * contentWeight) + 
               (trendingScore * trendingWeight);
    }

    calculatePersonalizedScore(product, recentInteractions, searchKeywords) {
        let score = product.rating || 4;
        
        // Boost based on recent category interactions
        const categoryInteractions = recentInteractions.filter(i => 
            i.type === 'product_view' && 
            this.getProductCategory(i.productId) === product.category
        ).length;
        
        score += categoryInteractions * 0.5;
        
        // Boost based on search keyword matches
        const keywordMatches = searchKeywords.filter(keyword => 
            product.name.toLowerCase().includes(keyword.toLowerCase()) ||
            (product.tags && product.tags.some(tag => tag.toLowerCase().includes(keyword.toLowerCase())))
        ).length;
        
        score += keywordMatches * 0.3;
        
        // Price preference boost
        score *= this.calculatePriceScore(product.price);
        
        return score;
    }

    calculatePriceScore(price) {
        const userPriceRange = this.userPreferences.priceRange;
        if (price >= userPriceRange.min && price <= userPriceRange.max) {
            return 1.2; // Boost for preferred price range
        } else if (price < userPriceRange.min) {
            return 1.1; // Slight boost for lower prices
        } else {
            return 0.8; // Penalty for higher prices
        }
    }

    // Utility Methods
    findSimilarUserProducts(userViews) {
        // Simplified: return products from categories user has viewed
        const viewedCategories = Object.keys(this.userBehavior.categories);
        return this.productData.filter(product => 
            viewedCategories.includes(product.category) && 
            !userViews[product._id]
        );
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

    getRecentInteractions(days = 7) {
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        return this.userBehavior.interactions.filter(interaction => 
            interaction.timestamp > cutoff
        );
    }

    extractSearchKeywords() {
        return this.userBehavior.searches
            .slice(-10) // Last 10 searches
            .map(search => search.query.toLowerCase().split(' '))
            .flat()
            .filter(word => word.length > 2);
    }

    isPersonallyRelevant(product, recentInteractions, searchKeywords) {
        // Check if product is relevant based on recent behavior
        const recentCategories = recentInteractions
            .filter(i => i.type === 'product_view')
            .map(i => this.getProductCategory(i.productId))
            .filter(Boolean);
        
        const hasRecentCategoryMatch = recentCategories.includes(product.category);
        const hasKeywordMatch = searchKeywords.some(keyword => 
            product.name.toLowerCase().includes(keyword) ||
            (product.tags && product.tags.some(tag => tag.toLowerCase().includes(keyword)))
        );
        
        return hasRecentCategoryMatch || hasKeywordMatch || Math.random() > 0.7;
    }

    getPersonalizationReason(product) {
        const reasons = [
            'Based on your recent activity',
            'Matches your search history',
            'Popular in your favorite category',
            'Similar to items you viewed',
            'Recommended for you'
        ];
        
        return reasons[Math.floor(Math.random() * reasons.length)];
    }

    getProductCategory(productId) {
        const product = this.productData.find(p => p._id === productId);
        return product ? product.category : null;
    }

    // Real-time Updates
    setupRealtimeUpdates() {
        // Update recommendations periodically
        setInterval(() => {
            this.updateRecommendations();
        }, 5 * 60 * 1000); // Every 5 minutes
        
        // Update on user interactions
        document.addEventListener('user-interaction', () => {
            setTimeout(() => this.updateRecommendations(), 1000);
        });
    }

    async updateRecommendations() {
        // Only update if enough new data
        const lastUpdate = localStorage.getItem('recommendations-last-update');
        const now = Date.now();
        
        if (!lastUpdate || (now - parseInt(lastUpdate)) > 2 * 60 * 1000) { // 2 minutes
            await this.generateRecommendations();
            localStorage.setItem('recommendations-last-update', now.toString());
        }
    }

    // Data Persistence
    saveUserBehavior() {
        localStorage.setItem('user-behavior', JSON.stringify(this.userBehavior));
    }

    saveUserPreferences() {
        localStorage.setItem('user-preferences', JSON.stringify(this.userPreferences));
    }

    saveRecommendations() {
        localStorage.setItem('ai-recommendations', JSON.stringify(this.recommendations));
    }

    // Public API Methods
    getRecommendations(type = 'hybrid', limit = 10) {
        const recommendations = this.recommendations[type] || this.recommendations.hybrid;
        return recommendations.slice(0, limit);
    }

    getPersonalizedProducts(limit = 8) {
        return this.getRecommendations('personalized', limit);
    }

    getTrendingProducts(limit = 6) {
        return this.getRecommendations('trending', limit);
    }

    getSimilarProducts(productId, limit = 4) {
        const product = this.productData.find(p => p._id === productId);
        if (!product) return [];
        
        return this.productData
            .filter(p => p._id !== productId && p.category === product.category)
            .map(p => ({ ...p, score: this.calculateContentScore(p, product.category) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    updateUserPreferences(preferences) {
        this.userPreferences = { ...this.userPreferences, ...preferences };
        this.saveUserPreferences();
        this.updateRecommendations();
    }

    // Utility Methods
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.aiRecommendationEngine = new AIRecommendationEngine();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIRecommendationEngine;
}
