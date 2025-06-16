/**
 * Tridex Personalized Homepage - Phase 2B Implementation
 * Creates dynamic homepage with curated content based on user behavior and preferences
 */

class PersonalizedHomepage {
    constructor() {
        this.userProfile = this.loadUserProfile();
        this.contentSections = {};
        this.isPersonalized = false;
        this.lastPersonalizationUpdate = 0;
        
        this.init();
    }

    async init() {
        console.log('Personalized Homepage: Initializing...');
        
        // Load user data and preferences
        await this.loadUserData();
        
        // Check if personalization should be applied
        this.checkPersonalizationEligibility();
        
        // Setup content sections
        this.setupContentSections();
        
        // Apply personalization if eligible
        if (this.isPersonalized) {
            await this.personalizeHomepage();
        }
        
        // Setup dynamic updates
        this.setupDynamicUpdates();
        
        console.log('Personalized Homepage: Initialization complete');
    }

    loadUserProfile() {
        const saved = localStorage.getItem('user-profile');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                console.error('Personalized Homepage: Error loading user profile:', error);
            }
        }
        
        return {
            isLoggedIn: localStorage.getItem('isLoggedIn') === 'true',
            username: localStorage.getItem('username') || '',
            preferences: {
                categories: {},
                priceRange: { min: 0, max: 1000 },
                brands: {},
                colors: {},
                timeOfDay: this.getTimeOfDay()
            },
            behavior: {
                visitCount: 0,
                lastVisit: Date.now(),
                sessionDuration: 0,
                pageViews: {},
                searchHistory: [],
                purchaseHistory: []
            },
            demographics: {
                location: '',
                ageGroup: '',
                interests: []
            }
        };
    }

    async loadUserData() {
        // Load behavior data from AI recommendation engine
        if (window.aiRecommendationEngine) {
            const behaviorData = window.aiRecommendationEngine.userBehavior;
            this.userProfile.behavior = {
                ...this.userProfile.behavior,
                ...behaviorData
            };
        }
        
        // Update visit count and session info
        this.updateSessionInfo();
        
        // Save updated profile
        this.saveUserProfile();
    }

    checkPersonalizationEligibility() {
        const minVisits = 2;
        const minInteractions = 3;
        
        const visitCount = this.userProfile.behavior.visitCount || 0;
        const interactionCount = Object.keys(this.userProfile.behavior.views || {}).length;
        
        this.isPersonalized = visitCount >= minVisits || interactionCount >= minInteractions;
        
        console.log(`Personalized Homepage: Personalization ${this.isPersonalized ? 'enabled' : 'disabled'} (visits: ${visitCount}, interactions: ${interactionCount})`);
    }

    setupContentSections() {
        this.contentSections = {
            hero: {
                element: document.querySelector('.hero-section'),
                personalizer: this.personalizeHeroSection.bind(this)
            },
            categories: {
                element: document.querySelector('.categories-section'),
                personalizer: this.personalizeCategoriesSection.bind(this)
            },
            products: {
                element: document.querySelector('.products-section'),
                personalizer: this.personalizeProductsSection.bind(this)
            },
            recommendations: {
                element: document.querySelector('#recommendations-container'),
                personalizer: this.personalizeRecommendationsSection.bind(this)
            },
            promotions: {
                element: document.querySelector('.promotions-section'),
                personalizer: this.personalizePromotionsSection.bind(this)
            }
        };
    }

    async personalizeHomepage() {
        console.log('Personalized Homepage: Applying personalization...');
        
        // Add personalized greeting
        this.addPersonalizedGreeting();
        
        // Personalize each content section
        for (const [sectionName, section] of Object.entries(this.contentSections)) {
            if (section.element && section.personalizer) {
                try {
                    await section.personalizer();
                    console.log(`Personalized Homepage: ${sectionName} section personalized`);
                } catch (error) {
                    console.error(`Personalized Homepage: Error personalizing ${sectionName}:`, error);
                }
            }
        }
        
        // Add personalization indicators
        this.addPersonalizationIndicators();
        
        // Track personalization event
        this.trackPersonalizationEvent();
        
        this.lastPersonalizationUpdate = Date.now();
    }

    addPersonalizedGreeting() {
        const greetingContainer = document.querySelector('.hero-section .hero-content') || 
                                document.querySelector('.hero-section') ||
                                document.querySelector('main');
        
        if (!greetingContainer) return;
        
        const greeting = this.generatePersonalizedGreeting();
        
        let greetingElement = document.getElementById('personalized-greeting');
        if (!greetingElement) {
            greetingElement = document.createElement('div');
            greetingElement.id = 'personalized-greeting';
            greetingElement.className = 'personalized-greeting';
            greetingContainer.insertBefore(greetingElement, greetingContainer.firstChild);
        }
        
        greetingElement.innerHTML = greeting;
        this.addGreetingStyles();
    }

    generatePersonalizedGreeting() {
        const timeOfDay = this.getTimeOfDay();
        const username = this.userProfile.username;
        const visitCount = this.userProfile.behavior.visitCount;
        
        let greeting = '';
        let timeGreeting = '';
        
        // Time-based greeting
        switch (timeOfDay) {
            case 'morning':
                timeGreeting = 'Good morning';
                break;
            case 'afternoon':
                timeGreeting = 'Good afternoon';
                break;
            case 'evening':
                timeGreeting = 'Good evening';
                break;
            default:
                timeGreeting = 'Hello';
        }
        
        // Personalized message based on user status
        if (username) {
            greeting = `${timeGreeting}, ${username}! `;
            
            if (visitCount > 10) {
                greeting += "Welcome back to your favorite shopping destination! 🌟";
            } else if (visitCount > 5) {
                greeting += "Great to see you again! 👋";
            } else {
                greeting += "Welcome back! 😊";
            }
        } else {
            greeting = `${timeGreeting}! Welcome to Tridex `;
            
            if (visitCount > 3) {
                greeting += "- your personalized shopping experience awaits! ✨";
            } else {
                greeting += "- discover amazing products just for you! 🛍️";
            }
        }
        
        return `
            <div class="greeting-content">
                <h2 class="greeting-text">${greeting}</h2>
                <p class="greeting-subtitle">${this.generateContextualSubtitle()}</p>
            </div>
        `;
    }

    generateContextualSubtitle() {
        const preferences = this.userProfile.preferences;
        const behavior = this.userProfile.behavior;
        
        // Generate subtitle based on user behavior
        const topCategory = this.getTopCategory();
        const recentSearches = behavior.searchHistory?.slice(-3) || [];
        
        if (topCategory) {
            return `Discover new ${topCategory.toLowerCase()} products and exclusive deals`;
        } else if (recentSearches.length > 0) {
            return `Continue exploring products you love`;
        } else {
            return `Explore thousands of products with personalized recommendations`;
        }
    }

    async personalizeHeroSection() {
        const heroSection = this.contentSections.hero.element;
        if (!heroSection) return;
        
        // Customize hero banner based on user preferences
        const topCategory = this.getTopCategory();
        const timeOfDay = this.getTimeOfDay();
        
        // Add dynamic background or featured content
        this.updateHeroContent(heroSection, topCategory, timeOfDay);
    }

    async personalizeCategoriesSection() {
        const categoriesSection = this.contentSections.categories.element;
        if (!categoriesSection) return;
        
        // Reorder categories based on user preferences
        const categoryPreferences = this.userProfile.preferences.categories;
        const sortedCategories = this.sortCategoriesByPreference(categoryPreferences);
        
        this.reorderCategoryDisplay(categoriesSection, sortedCategories);
    }

    async personalizeProductsSection() {
        const productsSection = this.contentSections.products.element;
        if (!productsSection) return;
        
        // Show products from preferred categories first
        const preferredProducts = await this.getPreferredProducts();
        this.updateProductDisplay(productsSection, preferredProducts);
    }

    async personalizeRecommendationsSection() {
        // Recommendations are handled by the recommendation display component
        // Just ensure it's visible and properly positioned
        const recommendationsSection = this.contentSections.recommendations.element;
        if (recommendationsSection) {
            recommendationsSection.style.display = 'block';
            this.prioritizeRecommendations();
        }
    }

    async personalizePromotionsSection() {
        const promotionsSection = this.contentSections.promotions.element;
        if (!promotionsSection) return;
        
        // Show promotions relevant to user's interests
        const relevantPromotions = this.getRelevantPromotions();
        this.updatePromotionsDisplay(promotionsSection, relevantPromotions);
    }

    // Helper Methods
    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour < 12) return 'morning';
        if (hour < 17) return 'afternoon';
        return 'evening';
    }

    getTopCategory() {
        const categories = this.userProfile.preferences.categories;
        if (!categories || Object.keys(categories).length === 0) return null;
        
        return Object.keys(categories).reduce((a, b) => 
            categories[a] > categories[b] ? a : b
        );
    }

    updateSessionInfo() {
        this.userProfile.behavior.visitCount = (this.userProfile.behavior.visitCount || 0) + 1;
        this.userProfile.behavior.lastVisit = Date.now();
        
        // Track session start time
        if (!this.sessionStartTime) {
            this.sessionStartTime = Date.now();
        }
    }

    sortCategoriesByPreference(categoryPreferences) {
        // This would normally fetch categories from your API
        const defaultCategories = ['Electronics', 'Fashion', 'Home', 'Sports', 'Books'];
        
        return defaultCategories.sort((a, b) => {
            const aScore = categoryPreferences[a] || 0;
            const bScore = categoryPreferences[b] || 0;
            return bScore - aScore;
        });
    }

    async getPreferredProducts() {
        // Get products from user's preferred categories
        if (window.aiRecommendationEngine) {
            return window.aiRecommendationEngine.getPersonalizedProducts(12);
        }
        return [];
    }

    getRelevantPromotions() {
        // Generate promotions based on user behavior
        const topCategory = this.getTopCategory();
        const timeOfDay = this.getTimeOfDay();
        
        return [
            {
                title: `Special ${topCategory || 'Product'} Deals`,
                description: `Exclusive discounts on ${topCategory?.toLowerCase() || 'selected'} items`,
                discount: '20% OFF',
                category: topCategory
            },
            {
                title: `${timeOfDay === 'morning' ? 'Morning' : timeOfDay === 'afternoon' ? 'Afternoon' : 'Evening'} Flash Sale`,
                description: 'Limited time offers just for you',
                discount: 'Up to 50% OFF',
                timeSpecific: true
            }
        ];
    }

    // Update Methods
    updateHeroContent(heroSection, topCategory, timeOfDay) {
        // Add personalized hero content
        const heroContent = heroSection.querySelector('.hero-content');
        if (heroContent) {
            // Add category-specific styling or content
            if (topCategory) {
                heroSection.classList.add(`hero-${topCategory.toLowerCase()}`);
            }
            
            // Add time-specific styling
            heroSection.classList.add(`hero-${timeOfDay}`);
        }
    }

    reorderCategoryDisplay(categoriesSection, sortedCategories) {
        const categoryElements = categoriesSection.querySelectorAll('.category-item');
        
        // Reorder based on preferences
        sortedCategories.forEach((category, index) => {
            const categoryElement = Array.from(categoryElements).find(el => 
                el.textContent.includes(category)
            );
            
            if (categoryElement) {
                categoryElement.style.order = index;
                
                // Add preference indicator
                if (index < 3) {
                    categoryElement.classList.add('preferred-category');
                }
            }
        });
    }

    updateProductDisplay(productsSection, preferredProducts) {
        if (preferredProducts.length === 0) return;
        
        // Create or update personalized products section
        let personalizedSection = productsSection.querySelector('.personalized-products');
        
        if (!personalizedSection) {
            personalizedSection = document.createElement('div');
            personalizedSection.className = 'personalized-products';
            personalizedSection.innerHTML = `
                <h3>
                    <i class="fas fa-star"></i>
                    Picked Just for You
                </h3>
                <div class="personalized-products-grid"></div>
            `;
            productsSection.insertBefore(personalizedSection, productsSection.firstChild);
        }
        
        const grid = personalizedSection.querySelector('.personalized-products-grid');
        if (grid && window.recommendationDisplay) {
            // Use recommendation display to show products
            grid.innerHTML = preferredProducts.slice(0, 6).map(product => 
                window.recommendationDisplay.generateRecommendationItem(product, 'personalized')
            ).join('');
        }
    }

    updatePromotionsDisplay(promotionsSection, promotions) {
        if (promotions.length === 0) return;
        
        let promotionsContainer = promotionsSection.querySelector('.personalized-promotions');
        
        if (!promotionsContainer) {
            promotionsContainer = document.createElement('div');
            promotionsContainer.className = 'personalized-promotions';
            promotionsSection.appendChild(promotionsContainer);
        }
        
        promotionsContainer.innerHTML = promotions.map(promo => `
            <div class="promotion-card personalized">
                <div class="promotion-content">
                    <h4>${promo.title}</h4>
                    <p>${promo.description}</p>
                    <div class="promotion-discount">${promo.discount}</div>
                </div>
                <div class="promotion-badge">
                    <i class="fas fa-user-check"></i>
                    For You
                </div>
            </div>
        `).join('');
    }

    prioritizeRecommendations() {
        // Move recommendations higher on the page for returning users
        const recommendationsSection = this.contentSections.recommendations.element;
        const mainContent = document.querySelector('main');
        
        if (recommendationsSection && mainContent && this.userProfile.behavior.visitCount > 3) {
            // Move recommendations to be more prominent
            const heroSection = document.querySelector('.hero-section');
            if (heroSection && heroSection.nextSibling) {
                mainContent.insertBefore(recommendationsSection, heroSection.nextSibling);
            }
        }
    }

    addPersonalizationIndicators() {
        // Add subtle indicators that the page is personalized
        const indicators = document.querySelectorAll('.personalized, .preferred-category');
        
        indicators.forEach(element => {
            if (!element.querySelector('.personalization-badge')) {
                const badge = document.createElement('div');
                badge.className = 'personalization-badge';
                badge.innerHTML = '<i class="fas fa-magic"></i>';
                badge.title = 'Personalized for you';
                element.appendChild(badge);
            }
        });
    }

    addGreetingStyles() {
        if (document.getElementById('greeting-styles')) return;
        
        const styles = `
            <style id="greeting-styles">
                .personalized-greeting {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    border-radius: 12px;
                    margin-bottom: 30px;
                    text-align: center;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                    animation: fadeInUp 0.8s ease;
                }
                
                .greeting-content {
                    max-width: 600px;
                    margin: 0 auto;
                }
                
                .greeting-text {
                    font-size: 1.8rem;
                    font-weight: 600;
                    margin: 0 0 12px 0;
                    line-height: 1.3;
                }
                
                .greeting-subtitle {
                    font-size: 1.1rem;
                    opacity: 0.9;
                    margin: 0;
                    font-weight: 300;
                }
                
                .personalization-badge {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: #007bff;
                    color: white;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    z-index: 10;
                }
                
                .preferred-category {
                    position: relative;
                    border: 2px solid #007bff !important;
                    box-shadow: 0 4px 20px rgba(0, 123, 255, 0.2) !important;
                }
                
                .personalized-products h3 {
                    color: #333;
                    font-size: 1.5rem;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .personalized-products h3 i {
                    color: #ffc107;
                }
                
                .promotion-card.personalized {
                    position: relative;
                    border: 2px solid #28a745;
                    background: linear-gradient(135deg, #f8fff9 0%, #e8f5e8 100%);
                }
                
                .promotion-badge {
                    position: absolute;
                    top: -8px;
                    right: 12px;
                    background: #28a745;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 0.8rem;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                
                @media (max-width: 768px) {
                    .personalized-greeting {
                        padding: 20px;
                        margin-bottom: 20px;
                    }
                    
                    .greeting-text {
                        font-size: 1.4rem;
                    }
                    
                    .greeting-subtitle {
                        font-size: 1rem;
                    }
                }
                
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    setupDynamicUpdates() {
        // Update personalization when user behavior changes
        window.addEventListener('user-interaction', () => {
            setTimeout(() => this.updatePersonalization(), 2000);
        });
        
        // Periodic updates
        setInterval(() => {
            this.updatePersonalization();
        }, 10 * 60 * 1000); // Every 10 minutes
        
        // Update on page visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updatePersonalization();
            }
        });
    }

    async updatePersonalization() {
        const now = Date.now();
        const timeSinceLastUpdate = now - this.lastPersonalizationUpdate;
        
        // Only update if enough time has passed and user is active
        if (timeSinceLastUpdate > 5 * 60 * 1000) { // 5 minutes
            await this.loadUserData();
            
            if (this.isPersonalized) {
                await this.personalizeHomepage();
            }
        }
    }

    trackPersonalizationEvent() {
        // Track that personalization was applied
        const event = {
            type: 'personalization_applied',
            timestamp: Date.now(),
            sections: Object.keys(this.contentSections).filter(key => 
                this.contentSections[key].element
            ),
            userProfile: {
                visitCount: this.userProfile.behavior.visitCount,
                topCategory: this.getTopCategory(),
                timeOfDay: this.getTimeOfDay()
            }
        };
        
        // Store for analytics
        const events = JSON.parse(localStorage.getItem('personalization-events') || '[]');
        events.push(event);
        
        // Keep only last 50 events
        if (events.length > 50) {
            events.splice(0, events.length - 50);
        }
        
        localStorage.setItem('personalization-events', JSON.stringify(events));
    }

    saveUserProfile() {
        localStorage.setItem('user-profile', JSON.stringify(this.userProfile));
    }

    // Public API Methods
    refreshPersonalization() {
        this.updatePersonalization();
    }

    getPersonalizationStatus() {
        return {
            isPersonalized: this.isPersonalized,
            visitCount: this.userProfile.behavior.visitCount,
            topCategory: this.getTopCategory(),
            lastUpdate: this.lastPersonalizationUpdate
        };
    }

    updateUserPreferences(preferences) {
        this.userProfile.preferences = { ...this.userProfile.preferences, ...preferences };
        this.saveUserProfile();
        this.updatePersonalization();
    }

    getAnalytics() {
        return {
            events: JSON.parse(localStorage.getItem('personalization-events') || '[]'),
            profile: this.userProfile
        };
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.personalizedHomepage = new PersonalizedHomepage();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PersonalizedHomepage;
}
