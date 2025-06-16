/**
 * Tridex Recommendation Display - Phase 2B Implementation
 * Handles the display and interaction of AI-generated recommendations
 */

class RecommendationDisplay {
    constructor() {
        this.recommendations = {};
        this.isVisible = true;
        this.currentSection = 'personalized';
        
        this.init();
    }

    init() {
        console.log('Recommendation Display: Initializing...');
        
        // Wait for AI engine to be ready
        this.waitForAIEngine();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Create recommendation sections
        this.createRecommendationSections();
        
        console.log('Recommendation Display: Initialization complete');
    }

    waitForAIEngine() {
        const checkEngine = () => {
            if (window.aiRecommendationEngine) {
                this.loadRecommendations();
            } else {
                setTimeout(checkEngine, 100);
            }
        };
        checkEngine();
    }

    setupEventListeners() {
        // Listen for recommendation updates
        window.addEventListener('recommendations-updated', (e) => {
            this.recommendations = e.detail;
            this.updateDisplay();
        });
        
        // Listen for user interactions to update recommendations
        document.addEventListener('click', (e) => {
            if (e.target.closest('.recommendation-item')) {
                this.handleRecommendationClick(e);
            }
        });
        
        // Listen for scroll to lazy load recommendations
        window.addEventListener('scroll', () => {
            this.handleScroll();
        });
    }

    async loadRecommendations() {
        if (window.aiRecommendationEngine) {
            this.recommendations = {
                personalized: window.aiRecommendationEngine.getPersonalizedProducts(8),
                trending: window.aiRecommendationEngine.getTrendingProducts(6),
                hybrid: window.aiRecommendationEngine.getRecommendations('hybrid', 10)
            };
            
            this.updateDisplay();
        }
    }

    createRecommendationSections() {
        // Find or create container for recommendations
        let container = document.getElementById('recommendations-container');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'recommendations-container';
            container.className = 'recommendations-container';
            
            // Insert after hero section or at the beginning of main content
            const heroSection = document.querySelector('.hero-section');
            const mainContent = document.querySelector('main') || document.body;
            
            if (heroSection && heroSection.nextSibling) {
                heroSection.parentNode.insertBefore(container, heroSection.nextSibling);
            } else {
                mainContent.insertBefore(container, mainContent.firstChild);
            }
        }
        
        container.innerHTML = this.generateRecommendationHTML();
        this.addRecommendationStyles();
    }

    generateRecommendationHTML() {
        return `
            <div class="recommendation-sections">
                <!-- Personalized Recommendations -->
                <section class="recommendation-section" id="personalized-section">
                    <div class="section-header">
                        <h2>
                            <i class="fas fa-user-circle"></i>
                            Recommended for You
                        </h2>
                        <p class="section-subtitle">Personalized picks based on your activity</p>
                    </div>
                    <div class="recommendation-grid" id="personalized-grid">
                        <div class="loading-placeholder">
                            <div class="loading-shimmer"></div>
                            <div class="loading-shimmer"></div>
                            <div class="loading-shimmer"></div>
                            <div class="loading-shimmer"></div>
                        </div>
                    </div>
                </section>

                <!-- Trending Recommendations -->
                <section class="recommendation-section" id="trending-section">
                    <div class="section-header">
                        <h2>
                            <i class="fas fa-fire"></i>
                            Trending Now
                        </h2>
                        <p class="section-subtitle">Popular products everyone's talking about</p>
                    </div>
                    <div class="recommendation-grid trending-grid" id="trending-grid">
                        <div class="loading-placeholder">
                            <div class="loading-shimmer"></div>
                            <div class="loading-shimmer"></div>
                            <div class="loading-shimmer"></div>
                        </div>
                    </div>
                </section>

                <!-- Smart Suggestions -->
                <section class="recommendation-section" id="smart-section">
                    <div class="section-header">
                        <h2>
                            <i class="fas fa-lightbulb"></i>
                            Smart Suggestions
                        </h2>
                        <p class="section-subtitle">AI-powered recommendations just for you</p>
                    </div>
                    <div class="recommendation-grid" id="smart-grid">
                        <div class="loading-placeholder">
                            <div class="loading-shimmer"></div>
                            <div class="loading-shimmer"></div>
                            <div class="loading-shimmer"></div>
                            <div class="loading-shimmer"></div>
                        </div>
                    </div>
                </section>
            </div>
        `;
    }

    updateDisplay() {
        console.log('Recommendation Display: Updating display with new recommendations');
        
        // Update personalized recommendations
        this.updateSection('personalized', this.recommendations.personalized || []);
        
        // Update trending recommendations
        this.updateSection('trending', this.recommendations.trending || []);
        
        // Update smart suggestions (hybrid)
        this.updateSection('smart', this.recommendations.hybrid || []);
    }

    updateSection(sectionType, recommendations) {
        const grid = document.getElementById(`${sectionType}-grid`);
        if (!grid) return;
        
        if (recommendations.length === 0) {
            grid.innerHTML = '<div class="no-recommendations">No recommendations available</div>';
            return;
        }
        
        const itemsHTML = recommendations.map(product => this.generateRecommendationItem(product, sectionType)).join('');
        grid.innerHTML = itemsHTML;
        
        // Add intersection observer for lazy loading
        this.setupLazyLoading(grid);
    }

    generateRecommendationItem(product, sectionType) {
        const imageUrl = product.image || '/images/placeholder-product.jpg';
        const price = product.price ? `$${product.price}` : 'Price not available';
        const rating = product.rating ? '★'.repeat(Math.floor(product.rating)) : '';
        const reason = product.reason || 'Recommended for you';
        
        return `
            <div class="recommendation-item" data-product-id="${product._id}" data-section="${sectionType}">
                <div class="recommendation-image">
                    <img src="${imageUrl}" alt="${product.name}" loading="lazy">
                    <div class="recommendation-overlay">
                        <button class="quick-view-btn" onclick="recommendationDisplay.showQuickView('${product._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="wishlist-btn" onclick="recommendationDisplay.addToWishlist('${product._id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
                <div class="recommendation-content">
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-rating">${rating}</div>
                    <div class="product-price">${price}</div>
                    <div class="recommendation-reason">
                        <i class="fas fa-info-circle"></i>
                        ${reason}
                    </div>
                    <div class="recommendation-actions">
                        <button class="btn btn-primary add-to-cart-btn" onclick="recommendationDisplay.addToCart('${product._id}')">
                            <i class="fas fa-shopping-cart"></i>
                            Add to Cart
                        </button>
                        <button class="btn btn-secondary view-details-btn" onclick="recommendationDisplay.viewDetails('${product._id}')">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    addRecommendationStyles() {
        if (document.getElementById('recommendation-styles')) return;
        
        const styles = `
            <style id="recommendation-styles">
                .recommendations-container {
                    max-width: 1200px;
                    margin: 40px auto;
                    padding: 0 20px;
                }
                
                .recommendation-section {
                    margin-bottom: 50px;
                }
                
                .section-header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                
                .section-header h2 {
                    color: #333;
                    font-size: 2rem;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                }
                
                .section-header h2 i {
                    color: #007bff;
                    font-size: 1.8rem;
                }
                
                .section-subtitle {
                    color: #666;
                    font-size: 1.1rem;
                    margin: 0;
                }
                
                .recommendation-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 24px;
                    margin-top: 20px;
                }
                
                .trending-grid {
                    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                }
                
                .recommendation-item {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                    overflow: hidden;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                }
                
                .recommendation-item:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
                }
                
                .recommendation-image {
                    position: relative;
                    height: 200px;
                    overflow: hidden;
                }
                
                .recommendation-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.3s ease;
                }
                
                .recommendation-item:hover .recommendation-image img {
                    transform: scale(1.05);
                }
                
                .recommendation-overlay {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                
                .recommendation-item:hover .recommendation-overlay {
                    opacity: 1;
                }
                
                .quick-view-btn, .wishlist-btn {
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
                    backdrop-filter: blur(10px);
                }
                
                .quick-view-btn:hover, .wishlist-btn:hover {
                    background: #007bff;
                    color: white;
                    transform: scale(1.1);
                }
                
                .recommendation-content {
                    padding: 20px;
                }
                
                .product-name {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #333;
                    margin: 0 0 8px 0;
                    line-height: 1.3;
                }
                
                .product-rating {
                    color: #ffc107;
                    font-size: 0.9rem;
                    margin-bottom: 8px;
                }
                
                .product-price {
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: #007bff;
                    margin-bottom: 12px;
                }
                
                .recommendation-reason {
                    background: #f8f9fa;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 0.85rem;
                    color: #666;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .recommendation-reason i {
                    color: #007bff;
                }
                
                .recommendation-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .recommendation-actions .btn {
                    flex: 1;
                    padding: 10px 16px;
                    border: none;
                    border-radius: 6px;
                    font-size: 0.9rem;
                    font-weight: 500;
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
                    transform: translateY(-2px);
                }
                
                .btn-secondary {
                    background: #6c757d;
                    color: white;
                }
                
                .btn-secondary:hover {
                    background: #545b62;
                    transform: translateY(-2px);
                }
                
                .loading-placeholder {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 24px;
                }
                
                .loading-shimmer {
                    height: 300px;
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                    border-radius: 12px;
                }
                
                .no-recommendations {
                    text-align: center;
                    padding: 40px;
                    color: #666;
                    font-size: 1.1rem;
                }
                
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                
                /* Mobile Responsive */
                @media (max-width: 768px) {
                    .recommendations-container {
                        padding: 0 15px;
                        margin: 20px auto;
                    }
                    
                    .recommendation-section {
                        margin-bottom: 30px;
                    }
                    
                    .section-header h2 {
                        font-size: 1.5rem;
                    }
                    
                    .recommendation-grid {
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                        gap: 16px;
                    }
                    
                    .recommendation-actions {
                        flex-direction: column;
                    }
                    
                    .recommendation-actions .btn {
                        width: 100%;
                    }
                }
                
                @media (max-width: 480px) {
                    .recommendation-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .section-header h2 {
                        font-size: 1.3rem;
                        flex-direction: column;
                        gap: 8px;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    setupLazyLoading(container) {
        const images = container.querySelectorAll('img[loading="lazy"]');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.src; // Trigger loading
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            images.forEach(img => imageObserver.observe(img));
        }
    }

    // Event Handlers
    handleRecommendationClick(e) {
        const item = e.target.closest('.recommendation-item');
        const productId = item.dataset.productId;
        const section = item.dataset.section;
        
        // Track the click
        if (window.aiRecommendationEngine) {
            window.aiRecommendationEngine.trackProductView(productId);
        }
        
        // Analytics
        this.trackRecommendationClick(productId, section);
    }

    handleScroll() {
        // Lazy load recommendations when they come into view
        const sections = document.querySelectorAll('.recommendation-section');
        
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                section.classList.add('visible');
            }
        });
    }

    // Action Methods
    showQuickView(productId) {
        console.log('Showing quick view for product:', productId);
        // Implement quick view modal
        this.trackAction('quick_view', productId);
    }

    addToWishlist(productId) {
        console.log('Adding to wishlist:', productId);
        // Trigger wishlist addition
        window.dispatchEvent(new CustomEvent('wishlist-updated', {
            detail: { productId, action: 'add' }
        }));
        this.trackAction('wishlist_add', productId);
    }

    addToCart(productId) {
        console.log('Adding to cart:', productId);
        // Trigger cart addition
        window.dispatchEvent(new CustomEvent('cart-updated', {
            detail: { productId, action: 'add' }
        }));
        this.trackAction('cart_add', productId);
    }

    viewDetails(productId) {
        console.log('Viewing details for product:', productId);
        // Navigate to product details page
        window.location.href = `product.html?id=${productId}`;
        this.trackAction('view_details', productId);
    }

    // Analytics
    trackRecommendationClick(productId, section) {
        // Track recommendation effectiveness
        const analytics = JSON.parse(localStorage.getItem('recommendation-analytics') || '{}');
        
        if (!analytics[section]) {
            analytics[section] = { clicks: 0, views: 0 };
        }
        
        analytics[section].clicks++;
        localStorage.setItem('recommendation-analytics', JSON.stringify(analytics));
    }

    trackAction(action, productId) {
        // Track user actions on recommendations
        const event = {
            action: action,
            productId: productId,
            timestamp: Date.now(),
            source: 'recommendations'
        };
        
        // Store for analytics
        const actions = JSON.parse(localStorage.getItem('recommendation-actions') || '[]');
        actions.push(event);
        
        // Keep only last 100 actions
        if (actions.length > 100) {
            actions.splice(0, actions.length - 100);
        }
        
        localStorage.setItem('recommendation-actions', JSON.stringify(actions));
    }

    // Public API
    refreshRecommendations() {
        if (window.aiRecommendationEngine) {
            window.aiRecommendationEngine.generateRecommendations();
        }
    }

    hideSection(sectionType) {
        const section = document.getElementById(`${sectionType}-section`);
        if (section) {
            section.style.display = 'none';
        }
    }

    showSection(sectionType) {
        const section = document.getElementById(`${sectionType}-section`);
        if (section) {
            section.style.display = 'block';
        }
    }

    getAnalytics() {
        return {
            clicks: JSON.parse(localStorage.getItem('recommendation-analytics') || '{}'),
            actions: JSON.parse(localStorage.getItem('recommendation-actions') || '[]')
        };
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.recommendationDisplay = new RecommendationDisplay();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecommendationDisplay;
}
