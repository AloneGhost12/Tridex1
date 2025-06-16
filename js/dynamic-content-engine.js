/**
 * Tridex Dynamic Content Engine - Phase 2B Implementation
 * Personalization engine for dynamic pricing, content, and user experience customization
 */

class DynamicContentEngine {
    constructor() {
        this.userSegment = null;
        this.contentRules = {};
        this.pricingRules = {};
        this.experienceConfig = {};
        this.abTestGroups = {};
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        console.log('Dynamic Content: Initializing personalization engine...');
        
        // Load user data and determine segment
        await this.loadUserData();
        
        // Determine user segment
        this.determineUserSegment();
        
        // Load content rules
        this.loadContentRules();
        
        // Load pricing rules
        this.loadPricingRules();
        
        // Setup A/B testing
        this.setupABTesting();
        
        // Apply dynamic content
        await this.applyDynamicContent();
        
        // Setup real-time updates
        this.setupRealTimeUpdates();
        
        this.isInitialized = true;
        console.log('Dynamic Content: Engine initialized successfully');
    }

    async loadUserData() {
        // Get user data from various sources
        this.userData = {
            profile: this.loadUserProfile(),
            behavior: this.loadUserBehavior(),
            preferences: this.loadUserPreferences(),
            location: await this.getUserLocation(),
            device: this.getDeviceInfo(),
            session: this.getSessionInfo()
        };
    }

    loadUserProfile() {
        const saved = localStorage.getItem('user-profile');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                console.error('Dynamic Content: Error loading user profile:', error);
            }
        }
        
        return {
            isLoggedIn: localStorage.getItem('isLoggedIn') === 'true',
            username: localStorage.getItem('username') || '',
            email: localStorage.getItem('email') || '',
            joinDate: localStorage.getItem('joinDate') || Date.now(),
            tier: 'standard', // standard, premium, vip
            totalSpent: 0,
            orderCount: 0
        };
    }

    loadUserBehavior() {
        // Get behavior data from AI recommendation engine
        if (window.aiRecommendationEngine) {
            return window.aiRecommendationEngine.userBehavior;
        }
        
        return {
            visitCount: parseInt(localStorage.getItem('visitCount') || '0'),
            pageViews: {},
            timeSpent: {},
            interactions: [],
            searches: [],
            purchases: {}
        };
    }

    loadUserPreferences() {
        const saved = localStorage.getItem('user-preferences');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                console.error('Dynamic Content: Error loading preferences:', error);
            }
        }
        
        return {
            categories: {},
            priceRange: { min: 0, max: 1000 },
            brands: {},
            colors: {},
            currency: 'USD',
            language: 'en'
        };
    }

    async getUserLocation() {
        // Try to get user location (with permission)
        try {
            const saved = localStorage.getItem('user-location');
            if (saved) {
                return JSON.parse(saved);
            }
            
            // Fallback to IP-based location (simulated)
            return {
                country: 'US',
                region: 'CA',
                city: 'San Francisco',
                timezone: 'America/Los_Angeles',
                currency: 'USD'
            };
        } catch (error) {
            console.error('Dynamic Content: Error getting location:', error);
            return { country: 'US', currency: 'USD' };
        }
    }

    getDeviceInfo() {
        return {
            type: this.getDeviceType(),
            os: this.getOS(),
            browser: this.getBrowser(),
            screenSize: {
                width: window.screen.width,
                height: window.screen.height
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
    }

    getSessionInfo() {
        return {
            startTime: Date.now(),
            referrer: document.referrer,
            source: this.getTrafficSource(),
            isNewSession: !sessionStorage.getItem('session-active'),
            sessionId: this.generateSessionId()
        };
    }

    determineUserSegment() {
        const profile = this.userData.profile;
        const behavior = this.userData.behavior;
        const device = this.userData.device;
        
        // Determine user segment based on multiple factors
        let segment = 'new_visitor';
        
        if (profile.isLoggedIn) {
            if (profile.totalSpent > 1000) {
                segment = 'vip_customer';
            } else if (profile.totalSpent > 500) {
                segment = 'premium_customer';
            } else if (profile.orderCount > 0) {
                segment = 'returning_customer';
            } else {
                segment = 'registered_user';
            }
        } else {
            if (behavior.visitCount > 5) {
                segment = 'frequent_visitor';
            } else if (behavior.visitCount > 1) {
                segment = 'returning_visitor';
            }
        }
        
        // Device-based segments
        if (device.type === 'mobile') {
            segment += '_mobile';
        }
        
        this.userSegment = segment;
        console.log('Dynamic Content: User segment determined:', segment);
        
        // Store segment for analytics
        localStorage.setItem('user-segment', segment);
    }

    loadContentRules() {
        this.contentRules = {
            new_visitor: {
                hero: {
                    title: 'Welcome to Tridex! 🎉',
                    subtitle: 'Discover amazing products with personalized recommendations',
                    cta: 'Start Shopping',
                    background: 'gradient-blue'
                },
                promotions: [
                    {
                        title: 'New Customer Special',
                        description: 'Get 15% off your first order',
                        code: 'WELCOME15',
                        discount: 15
                    }
                ],
                features: ['free_shipping', 'easy_returns', 'customer_support']
            },
            
            returning_visitor: {
                hero: {
                    title: 'Welcome Back! 👋',
                    subtitle: 'Continue where you left off',
                    cta: 'Browse Products',
                    background: 'gradient-green'
                },
                promotions: [
                    {
                        title: 'Come Back Offer',
                        description: 'Special 10% discount just for you',
                        code: 'COMEBACK10',
                        discount: 10
                    }
                ]
            },
            
            registered_user: {
                hero: {
                    title: `Hello, ${this.userData.profile.username}! ✨`,
                    subtitle: 'Your personalized shopping experience awaits',
                    cta: 'View Recommendations',
                    background: 'gradient-purple'
                },
                promotions: [
                    {
                        title: 'Member Exclusive',
                        description: 'Special prices for registered members',
                        discount: 5
                    }
                ]
            },
            
            premium_customer: {
                hero: {
                    title: `Welcome Back, ${this.userData.profile.username}! 🌟`,
                    subtitle: 'Premium member benefits await you',
                    cta: 'Explore Premium Deals',
                    background: 'gradient-gold'
                },
                promotions: [
                    {
                        title: 'Premium Member Perks',
                        description: 'Exclusive access to premium deals',
                        discount: 20
                    }
                ],
                features: ['priority_support', 'free_express_shipping', 'early_access']
            },
            
            vip_customer: {
                hero: {
                    title: `VIP Welcome, ${this.userData.profile.username}! 👑`,
                    subtitle: 'Your VIP experience with exclusive benefits',
                    cta: 'VIP Collection',
                    background: 'gradient-diamond'
                },
                promotions: [
                    {
                        title: 'VIP Exclusive',
                        description: 'Premium products at VIP prices',
                        discount: 25
                    }
                ],
                features: ['vip_support', 'free_premium_shipping', 'exclusive_products', 'personal_shopper']
            }
        };
    }

    loadPricingRules() {
        this.pricingRules = {
            new_visitor: {
                discountMultiplier: 1.0,
                showOriginalPrice: true,
                highlightSavings: true
            },
            
            returning_visitor: {
                discountMultiplier: 1.05,
                showOriginalPrice: true,
                highlightSavings: true
            },
            
            registered_user: {
                discountMultiplier: 1.1,
                memberDiscount: 5,
                showMemberPrice: true
            },
            
            premium_customer: {
                discountMultiplier: 1.15,
                memberDiscount: 10,
                showMemberPrice: true,
                freeShippingThreshold: 50
            },
            
            vip_customer: {
                discountMultiplier: 1.2,
                memberDiscount: 15,
                showMemberPrice: true,
                freeShippingThreshold: 0,
                exclusiveAccess: true
            }
        };
    }

    setupABTesting() {
        // Setup A/B testing groups
        const userId = this.userData.profile.username || this.userData.session.sessionId;
        const hash = this.hashString(userId);
        
        this.abTestGroups = {
            heroLayout: hash % 2 === 0 ? 'A' : 'B',
            pricingDisplay: hash % 3 === 0 ? 'A' : hash % 3 === 1 ? 'B' : 'C',
            recommendationStyle: hash % 2 === 0 ? 'grid' : 'carousel',
            checkoutFlow: hash % 2 === 0 ? 'single_page' : 'multi_step'
        };
        
        console.log('Dynamic Content: A/B test groups assigned:', this.abTestGroups);
        
        // Store for analytics
        localStorage.setItem('ab-test-groups', JSON.stringify(this.abTestGroups));
    }

    async applyDynamicContent() {
        console.log('Dynamic Content: Applying dynamic content for segment:', this.userSegment);
        
        // Apply content rules
        this.applyContentRules();
        
        // Apply pricing rules
        this.applyPricingRules();
        
        // Apply A/B test variations
        this.applyABTestVariations();
        
        // Apply device-specific optimizations
        this.applyDeviceOptimizations();
        
        // Apply location-based content
        this.applyLocationBasedContent();
        
        // Track personalization event
        this.trackPersonalizationEvent();
    }

    applyContentRules() {
        const rules = this.contentRules[this.userSegment.replace('_mobile', '')] || this.contentRules.new_visitor;
        
        // Apply hero section content
        if (rules.hero) {
            this.updateHeroSection(rules.hero);
        }
        
        // Apply promotions
        if (rules.promotions) {
            this.updatePromotions(rules.promotions);
        }
        
        // Apply features
        if (rules.features) {
            this.highlightFeatures(rules.features);
        }
    }

    updateHeroSection(heroConfig) {
        const heroSection = document.querySelector('.hero-section');
        if (!heroSection) return;
        
        // Update hero content
        const heroTitle = heroSection.querySelector('h1, .hero-title');
        const heroSubtitle = heroSection.querySelector('.hero-subtitle, p');
        const heroCTA = heroSection.querySelector('.cta-button, .btn-primary');
        
        if (heroTitle) {
            heroTitle.textContent = heroConfig.title;
            heroTitle.classList.add('dynamic-content');
        }
        
        if (heroSubtitle) {
            heroSubtitle.textContent = heroConfig.subtitle;
            heroSubtitle.classList.add('dynamic-content');
        }
        
        if (heroCTA) {
            heroCTA.textContent = heroConfig.cta;
            heroCTA.classList.add('dynamic-content');
        }
        
        // Apply background
        if (heroConfig.background) {
            heroSection.classList.add(`bg-${heroConfig.background}`);
        }
        
        // Add personalization indicator
        this.addPersonalizationBadge(heroSection, 'Hero personalized for you');
    }

    updatePromotions(promotions) {
        // Create or update promotions section
        let promotionsSection = document.querySelector('.dynamic-promotions');
        
        if (!promotionsSection) {
            promotionsSection = document.createElement('div');
            promotionsSection.className = 'dynamic-promotions';
            
            // Insert after hero section
            const heroSection = document.querySelector('.hero-section');
            if (heroSection && heroSection.nextSibling) {
                heroSection.parentNode.insertBefore(promotionsSection, heroSection.nextSibling);
            } else {
                document.querySelector('main')?.appendChild(promotionsSection);
            }
        }
        
        const promotionsHTML = promotions.map(promo => `
            <div class="promotion-banner dynamic-content">
                <div class="promotion-content">
                    <h3>${promo.title}</h3>
                    <p>${promo.description}</p>
                    ${promo.code ? `<div class="promo-code">Code: <strong>${promo.code}</strong></div>` : ''}
                </div>
                <div class="promotion-discount">
                    ${promo.discount}% OFF
                </div>
            </div>
        `).join('');
        
        promotionsSection.innerHTML = promotionsHTML;
        
        // Add personalization badge
        this.addPersonalizationBadge(promotionsSection, 'Personalized offers');
    }

    highlightFeatures(features) {
        const featureMap = {
            free_shipping: { icon: 'fas fa-shipping-fast', text: 'Free Shipping' },
            easy_returns: { icon: 'fas fa-undo', text: 'Easy Returns' },
            customer_support: { icon: 'fas fa-headset', text: '24/7 Support' },
            priority_support: { icon: 'fas fa-star', text: 'Priority Support' },
            free_express_shipping: { icon: 'fas fa-rocket', text: 'Free Express Shipping' },
            early_access: { icon: 'fas fa-clock', text: 'Early Access' },
            vip_support: { icon: 'fas fa-crown', text: 'VIP Support' },
            exclusive_products: { icon: 'fas fa-gem', text: 'Exclusive Products' },
            personal_shopper: { icon: 'fas fa-user-tie', text: 'Personal Shopper' }
        };
        
        // Create features section
        let featuresSection = document.querySelector('.dynamic-features');
        
        if (!featuresSection) {
            featuresSection = document.createElement('div');
            featuresSection.className = 'dynamic-features';
            
            // Insert in appropriate location
            const promotions = document.querySelector('.dynamic-promotions');
            if (promotions && promotions.nextSibling) {
                promotions.parentNode.insertBefore(featuresSection, promotions.nextSibling);
            } else {
                document.querySelector('main')?.appendChild(featuresSection);
            }
        }
        
        const featuresHTML = `
            <div class="features-container dynamic-content">
                <h3>Your Benefits</h3>
                <div class="features-grid">
                    ${features.map(feature => {
                        const featureInfo = featureMap[feature];
                        return featureInfo ? `
                            <div class="feature-item">
                                <i class="${featureInfo.icon}"></i>
                                <span>${featureInfo.text}</span>
                            </div>
                        ` : '';
                    }).join('')}
                </div>
            </div>
        `;
        
        featuresSection.innerHTML = featuresHTML;
        
        // Add personalization badge
        this.addPersonalizationBadge(featuresSection, 'Benefits for your tier');
    }

    applyPricingRules() {
        const rules = this.pricingRules[this.userSegment.replace('_mobile', '')] || this.pricingRules.new_visitor;

        // Apply pricing to all product elements
        const productElements = document.querySelectorAll('.product-card, .recommendation-item, .search-result-item');

        productElements.forEach(element => {
            this.applyDynamicPricing(element, rules);
        });

        // Add pricing indicators
        this.addPricingIndicators(rules);
    }

    applyDynamicPricing(productElement, rules) {
        const priceElement = productElement.querySelector('.product-price, .result-price');
        if (!priceElement) return;

        const originalPriceText = priceElement.textContent;
        const priceMatch = originalPriceText.match(/\$?(\d+(?:\.\d{2})?)/);

        if (!priceMatch) return;

        const originalPrice = parseFloat(priceMatch[1]);
        let finalPrice = originalPrice;

        // Apply member discount
        if (rules.memberDiscount) {
            finalPrice = originalPrice * (1 - rules.memberDiscount / 100);
        }

        // Apply discount multiplier
        if (rules.discountMultiplier && rules.discountMultiplier !== 1.0) {
            finalPrice = finalPrice * (2 - rules.discountMultiplier); // Inverse for discount
        }

        // Update price display
        if (finalPrice !== originalPrice) {
            const savings = originalPrice - finalPrice;
            const savingsPercent = Math.round((savings / originalPrice) * 100);

            priceElement.innerHTML = `
                <div class="dynamic-pricing">
                    <span class="current-price">$${finalPrice.toFixed(2)}</span>
                    ${rules.showOriginalPrice ? `<span class="original-price">$${originalPrice.toFixed(2)}</span>` : ''}
                    ${rules.showMemberPrice ? `<span class="member-badge">Member Price</span>` : ''}
                    ${rules.highlightSavings ? `<span class="savings">Save ${savingsPercent}%</span>` : ''}
                </div>
            `;

            priceElement.classList.add('dynamic-content');
        }
    }

    addPricingIndicators(rules) {
        // Add shipping threshold indicator
        if (rules.freeShippingThreshold !== undefined) {
            this.addShippingIndicator(rules.freeShippingThreshold);
        }

        // Add member benefits indicator
        if (rules.memberDiscount) {
            this.addMemberBenefitsIndicator(rules.memberDiscount);
        }
    }

    addShippingIndicator(threshold) {
        let indicator = document.getElementById('shipping-indicator');

        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'shipping-indicator';
            indicator.className = 'shipping-indicator dynamic-content';

            // Add to header or top of page
            const header = document.querySelector('header');
            if (header) {
                header.appendChild(indicator);
            }
        }

        if (threshold === 0) {
            indicator.innerHTML = `
                <div class="shipping-message vip">
                    <i class="fas fa-crown"></i>
                    <span>FREE SHIPPING on all orders for VIP members!</span>
                </div>
            `;
        } else {
            indicator.innerHTML = `
                <div class="shipping-message">
                    <i class="fas fa-shipping-fast"></i>
                    <span>FREE SHIPPING on orders over $${threshold}</span>
                </div>
            `;
        }
    }

    addMemberBenefitsIndicator(discount) {
        let indicator = document.getElementById('member-benefits');

        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'member-benefits';
            indicator.className = 'member-benefits-indicator dynamic-content';

            // Add to appropriate location
            const promotions = document.querySelector('.dynamic-promotions');
            if (promotions) {
                promotions.appendChild(indicator);
            }
        }

        indicator.innerHTML = `
            <div class="member-benefit">
                <i class="fas fa-star"></i>
                <span>You're saving ${discount}% as a member on all products!</span>
            </div>
        `;
    }

    applyABTestVariations() {
        // Apply A/B test variations
        Object.keys(this.abTestGroups).forEach(testName => {
            const variant = this.abTestGroups[testName];
            this.applyABTestVariant(testName, variant);
        });
    }

    applyABTestVariant(testName, variant) {
        switch (testName) {
            case 'heroLayout':
                this.applyHeroLayoutVariant(variant);
                break;
            case 'pricingDisplay':
                this.applyPricingDisplayVariant(variant);
                break;
            case 'recommendationStyle':
                this.applyRecommendationStyleVariant(variant);
                break;
            case 'checkoutFlow':
                this.applyCheckoutFlowVariant(variant);
                break;
        }
    }

    applyHeroLayoutVariant(variant) {
        const heroSection = document.querySelector('.hero-section');
        if (heroSection) {
            heroSection.classList.add(`hero-layout-${variant.toLowerCase()}`);
            heroSection.dataset.abTest = `hero-${variant}`;
        }
    }

    applyPricingDisplayVariant(variant) {
        document.body.classList.add(`pricing-variant-${variant.toLowerCase()}`);
        document.body.dataset.pricingTest = `pricing-${variant}`;
    }

    applyRecommendationStyleVariant(variant) {
        const recommendationsContainer = document.getElementById('recommendations-container');
        if (recommendationsContainer) {
            recommendationsContainer.classList.add(`recommendations-${variant}`);
            recommendationsContainer.dataset.abTest = `recommendations-${variant}`;
        }
    }

    applyCheckoutFlowVariant(variant) {
        // Store checkout flow variant for use during checkout
        localStorage.setItem('checkout-flow-variant', variant);
    }

    applyDeviceOptimizations() {
        const device = this.userData.device;

        // Apply device-specific optimizations
        if (device.type === 'mobile') {
            this.applyMobileOptimizations();
        } else if (device.type === 'tablet') {
            this.applyTabletOptimizations();
        } else {
            this.applyDesktopOptimizations();
        }

        // Apply screen size optimizations
        this.applyScreenSizeOptimizations(device.viewport);
    }

    applyMobileOptimizations() {
        document.body.classList.add('mobile-optimized');

        // Optimize for mobile interactions
        this.optimizeMobileInteractions();

        // Adjust content for mobile
        this.adjustMobileContent();
    }

    applyTabletOptimizations() {
        document.body.classList.add('tablet-optimized');

        // Optimize for tablet interactions
        this.optimizeTabletInteractions();
    }

    applyDesktopOptimizations() {
        document.body.classList.add('desktop-optimized');

        // Optimize for desktop interactions
        this.optimizeDesktopInteractions();
    }

    applyScreenSizeOptimizations(viewport) {
        // Apply optimizations based on screen size
        if (viewport.width < 480) {
            document.body.classList.add('small-screen');
        } else if (viewport.width < 768) {
            document.body.classList.add('medium-screen');
        } else if (viewport.width < 1200) {
            document.body.classList.add('large-screen');
        } else {
            document.body.classList.add('extra-large-screen');
        }
    }

    applyLocationBasedContent() {
        const location = this.userData.location;

        // Apply currency formatting
        this.applyCurrencyFormatting(location.currency);

        // Apply timezone-based content
        this.applyTimezoneContent(location.timezone);

        // Apply region-specific promotions
        this.applyRegionalPromotions(location.country);
    }

    applyCurrencyFormatting(currency) {
        // Update all price displays to use correct currency
        const priceElements = document.querySelectorAll('.product-price, .result-price, .current-price');

        priceElements.forEach(element => {
            const text = element.textContent;
            const priceMatch = text.match(/\$?(\d+(?:\.\d{2})?)/);

            if (priceMatch) {
                const price = parseFloat(priceMatch[1]);
                const formattedPrice = this.formatCurrency(price, currency);
                element.textContent = text.replace(priceMatch[0], formattedPrice);
            }
        });
    }

    applyTimezoneContent(timezone) {
        // Apply timezone-specific content (e.g., delivery times)
        const deliveryElements = document.querySelectorAll('.delivery-time');

        deliveryElements.forEach(element => {
            const localTime = new Date().toLocaleString('en-US', { timeZone: timezone });
            element.textContent = `Delivery by ${this.calculateDeliveryTime(timezone)}`;
        });
    }

    applyRegionalPromotions(country) {
        // Apply country-specific promotions
        const regionalPromotions = this.getRegionalPromotions(country);

        if (regionalPromotions.length > 0) {
            this.updatePromotions(regionalPromotions);
        }
    }

    // Utility Methods
    optimizeMobileInteractions() {
        // Add touch-friendly interactions
        const buttons = document.querySelectorAll('.btn, button');
        buttons.forEach(button => {
            button.style.minHeight = '44px';
            button.style.minWidth = '44px';
        });
    }

    optimizeTabletInteractions() {
        // Optimize for tablet touch interactions
        document.body.classList.add('touch-optimized');
    }

    optimizeDesktopInteractions() {
        // Optimize for mouse interactions
        document.body.classList.add('mouse-optimized');
    }

    adjustMobileContent() {
        // Adjust content layout for mobile
        const contentSections = document.querySelectorAll('.content-section');
        contentSections.forEach(section => {
            section.classList.add('mobile-layout');
        });
    }

    formatCurrency(amount, currency) {
        const currencySymbols = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'JPY': '¥',
            'CAD': 'C$',
            'AUD': 'A$'
        };

        const symbol = currencySymbols[currency] || '$';
        return `${symbol}${amount.toFixed(2)}`;
    }

    calculateDeliveryTime(timezone) {
        // Calculate delivery time based on timezone
        const now = new Date();
        const deliveryDate = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000)); // 2 days

        return deliveryDate.toLocaleDateString('en-US', {
            timeZone: timezone,
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }

    getRegionalPromotions(country) {
        const regionalPromotions = {
            'US': [
                {
                    title: 'USA Special',
                    description: 'Free shipping across all 50 states',
                    discount: 0
                }
            ],
            'CA': [
                {
                    title: 'Canada Day Special',
                    description: 'Celebrate with 15% off',
                    discount: 15
                }
            ],
            'UK': [
                {
                    title: 'UK Exclusive',
                    description: 'Special pricing for UK customers',
                    discount: 10
                }
            ]
        };

        return regionalPromotions[country] || [];
    }

    addPersonalizationBadge(element, tooltip) {
        if (element.querySelector('.personalization-badge')) return;

        const badge = document.createElement('div');
        badge.className = 'personalization-badge';
        badge.innerHTML = '<i class="fas fa-magic"></i>';
        badge.title = tooltip;

        element.style.position = 'relative';
        element.appendChild(badge);
    }

    setupRealTimeUpdates() {
        // Setup real-time content updates
        this.setupBehaviorTracking();
        this.setupContentRefresh();
        this.setupPersonalizationUpdates();
    }

    setupBehaviorTracking() {
        // Track user behavior for real-time personalization
        document.addEventListener('click', (e) => {
            this.trackInteraction('click', e.target);
        });

        document.addEventListener('scroll', () => {
            this.trackInteraction('scroll', { scrollY: window.scrollY });
        });

        // Track time spent on sections
        this.setupTimeTracking();
    }

    setupTimeTracking() {
        const sections = document.querySelectorAll('section, .content-section');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.trackSectionView(entry.target);
                }
            });
        });

        sections.forEach(section => observer.observe(section));
    }

    setupContentRefresh() {
        // Refresh content periodically
        setInterval(() => {
            this.refreshDynamicContent();
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    setupPersonalizationUpdates() {
        // Listen for personalization triggers
        window.addEventListener('user-behavior-updated', () => {
            this.updatePersonalization();
        });

        window.addEventListener('user-segment-changed', (e) => {
            this.userSegment = e.detail.newSegment;
            this.applyDynamicContent();
        });
    }

    async refreshDynamicContent() {
        // Refresh dynamic content based on latest user behavior
        await this.loadUserData();
        this.determineUserSegment();
        await this.applyDynamicContent();
    }

    async updatePersonalization() {
        // Update personalization in real-time
        const previousSegment = this.userSegment;
        this.determineUserSegment();

        if (this.userSegment !== previousSegment) {
            console.log('Dynamic Content: User segment changed from', previousSegment, 'to', this.userSegment);
            await this.applyDynamicContent();
        }
    }

    // Tracking Methods
    trackInteraction(type, data) {
        const interaction = {
            type: type,
            data: data,
            timestamp: Date.now(),
            segment: this.userSegment
        };

        // Store interaction
        const interactions = JSON.parse(localStorage.getItem('dynamic-content-interactions') || '[]');
        interactions.push(interaction);

        // Keep only last 100 interactions
        if (interactions.length > 100) {
            interactions.splice(0, interactions.length - 100);
        }

        localStorage.setItem('dynamic-content-interactions', JSON.stringify(interactions));
    }

    trackSectionView(section) {
        const sectionId = section.id || section.className;
        this.trackInteraction('section_view', { section: sectionId });
    }

    trackPersonalizationEvent() {
        const event = {
            type: 'personalization_applied',
            segment: this.userSegment,
            abTests: this.abTestGroups,
            timestamp: Date.now(),
            device: this.userData.device.type,
            location: this.userData.location.country
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

    // Utility Methods
    getDeviceType() {
        const width = window.innerWidth;
        if (width <= 768) return 'mobile';
        if (width <= 1024) return 'tablet';
        return 'desktop';
    }

    getOS() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Windows')) return 'Windows';
        if (userAgent.includes('Mac')) return 'macOS';
        if (userAgent.includes('Linux')) return 'Linux';
        if (userAgent.includes('Android')) return 'Android';
        if (userAgent.includes('iOS')) return 'iOS';
        return 'Unknown';
    }

    getBrowser() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Unknown';
    }

    getTrafficSource() {
        const referrer = document.referrer;
        if (!referrer) return 'direct';
        if (referrer.includes('google')) return 'google';
        if (referrer.includes('facebook')) return 'facebook';
        if (referrer.includes('twitter')) return 'twitter';
        return 'referral';
    }

    generateSessionId() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    // Public API Methods
    getUserSegment() {
        return this.userSegment;
    }

    getABTestGroups() {
        return this.abTestGroups;
    }

    updateUserTier(newTier) {
        this.userData.profile.tier = newTier;
        localStorage.setItem('user-tier', newTier);
        this.updatePersonalization();
    }

    getPersonalizationAnalytics() {
        return {
            segment: this.userSegment,
            abTests: this.abTestGroups,
            interactions: JSON.parse(localStorage.getItem('dynamic-content-interactions') || '[]'),
            events: JSON.parse(localStorage.getItem('personalization-events') || '[]')
        };
    }

    forceRefresh() {
        this.refreshDynamicContent();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dynamicContentEngine = new DynamicContentEngine();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DynamicContentEngine;
}
