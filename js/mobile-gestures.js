/**
 * Tridex Mobile Gestures - Phase 2A Implementation
 * Handles mobile gestures, app-like interactions, and smooth transitions
 */

class MobileGestureManager {
    constructor() {
        this.isMobile = window.innerWidth <= 768;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.isNavOpen = false;
        this.pullToRefreshThreshold = 80;
        this.isPulling = false;
        
        this.init();
    }

    init() {
        console.log('Mobile Gestures: Initializing...');
        
        // Setup touch events
        this.setupTouchEvents();
        
        // Setup navigation gestures
        this.setupNavigationGestures();
        
        // Setup pull to refresh
        this.setupPullToRefresh();
        
        // Setup app-like transitions
        this.setupAppTransitions();
        
        // Setup enhanced hamburger menu
        this.setupEnhancedHamburger();
        
        // Setup responsive behavior
        this.setupResponsiveBehavior();
        
        console.log('Mobile Gestures: Initialization complete');
    }

    setupTouchEvents() {
        // Add touch event listeners
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
        
        // Add mouse events for desktop testing
        document.addEventListener('mousedown', (e) => this.handleMouseStart(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseEnd(e));
    }

    setupNavigationGestures() {
        // Swipe to open/close navigation
        if (this.isMobile) {
            this.createNavigationOverlay();
        }
    }

    setupPullToRefresh() {
        // Create pull to refresh indicator
        this.createPullToRefreshIndicator();
        
        // Add scroll event listener
        window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
    }

    setupAppTransitions() {
        // Add page transition class to main content
        const mainContent = document.querySelector('main') || document.body;
        mainContent.classList.add('page-transition');
        
        // Setup link transitions
        this.setupLinkTransitions();
    }

    setupEnhancedHamburger() {
        const hamburger = document.getElementById('hamburger-menu');
        const nav = document.getElementById('nav');
        
        if (hamburger && nav) {
            hamburger.addEventListener('click', () => {
                this.toggleNavigation();
            });
            
            // Close nav when clicking outside
            document.addEventListener('click', (e) => {
                if (this.isNavOpen && !nav.contains(e.target) && !hamburger.contains(e.target)) {
                    this.closeNavigation();
                }
            });
        }
    }

    setupResponsiveBehavior() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
            this.handleResize();
        });
        
        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
    }

    // Touch event handlers
    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    }

    handleTouchMove(e) {
        if (!e.touches[0]) return;
        
        this.touchEndX = e.touches[0].clientX;
        this.touchEndY = e.touches[0].clientY;
        
        // Handle pull to refresh
        if (window.scrollY === 0 && this.touchEndY > this.touchStartY) {
            const pullDistance = this.touchEndY - this.touchStartY;
            this.handlePullToRefresh(pullDistance);
            
            if (pullDistance > 30) {
                e.preventDefault(); // Prevent default scroll behavior
            }
        }
        
        // Handle navigation swipe
        this.handleNavigationSwipe();
    }

    handleTouchEnd(e) {
        this.handleSwipeGesture();
        this.handlePullToRefreshEnd();
    }

    // Mouse event handlers for desktop testing
    handleMouseStart(e) {
        this.touchStartX = e.clientX;
        this.touchStartY = e.clientY;
    }

    handleMouseMove(e) {
        if (e.buttons === 1) { // Left mouse button pressed
            this.touchEndX = e.clientX;
            this.touchEndY = e.clientY;
        }
    }

    handleMouseEnd(e) {
        this.handleSwipeGesture();
    }

    // Gesture recognition
    handleSwipeGesture() {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const minSwipeDistance = 50;
        
        // Horizontal swipes
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0) {
                this.handleSwipeRight();
            } else {
                this.handleSwipeLeft();
            }
        }
        
        // Vertical swipes
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > minSwipeDistance) {
            if (deltaY > 0) {
                this.handleSwipeDown();
            } else {
                this.handleSwipeUp();
            }
        }
    }

    handleSwipeRight() {
        console.log('Mobile Gestures: Swipe right detected');
        
        // Open navigation on swipe right from left edge
        if (this.touchStartX < 50 && !this.isNavOpen && this.isMobile) {
            this.openNavigation();
        }
    }

    handleSwipeLeft() {
        console.log('Mobile Gestures: Swipe left detected');
        
        // Close navigation on swipe left
        if (this.isNavOpen && this.isMobile) {
            this.closeNavigation();
        }
    }

    handleSwipeDown() {
        console.log('Mobile Gestures: Swipe down detected');
        
        // Trigger pull to refresh if at top of page
        if (window.scrollY === 0) {
            this.triggerRefresh();
        }
    }

    handleSwipeUp() {
        console.log('Mobile Gestures: Swipe up detected');
        
        // Hide navigation if open
        if (this.isNavOpen) {
            this.closeNavigation();
        }
    }

    // Navigation methods
    toggleNavigation() {
        if (this.isNavOpen) {
            this.closeNavigation();
        } else {
            this.openNavigation();
        }
    }

    openNavigation() {
        const nav = document.getElementById('nav');
        const hamburger = document.getElementById('hamburger-menu');
        const overlay = document.querySelector('.nav-overlay');
        
        if (nav) {
            nav.classList.add('show');
            this.isNavOpen = true;
            
            if (hamburger) {
                hamburger.classList.add('active');
            }
            
            if (overlay) {
                overlay.classList.add('show');
            }
            
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
            
            // Add navigation transition effects
            this.animateNavigationItems();
        }
    }

    closeNavigation() {
        const nav = document.getElementById('nav');
        const hamburger = document.getElementById('hamburger-menu');
        const overlay = document.querySelector('.nav-overlay');
        
        if (nav) {
            nav.classList.remove('show');
            this.isNavOpen = false;
            
            if (hamburger) {
                hamburger.classList.remove('active');
            }
            
            if (overlay) {
                overlay.classList.remove('show');
            }
            
            // Restore body scroll
            document.body.style.overflow = '';
        }
    }

    animateNavigationItems() {
        const navItems = document.querySelectorAll('#nav li');
        navItems.forEach((item, index) => {
            item.style.animationDelay = `${0.1 + (index * 0.05)}s`;
        });
    }

    createNavigationOverlay() {
        if (!document.querySelector('.nav-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'nav-overlay';
            overlay.addEventListener('click', () => this.closeNavigation());
            document.body.appendChild(overlay);
        }
    }

    // Pull to refresh methods
    createPullToRefreshIndicator() {
        if (!document.querySelector('.pull-to-refresh')) {
            const indicator = document.createElement('div');
            indicator.className = 'pull-to-refresh';
            indicator.innerHTML = '↓';
            document.body.appendChild(indicator);
        }
    }

    handlePullToRefresh(distance) {
        const indicator = document.querySelector('.pull-to-refresh');
        if (!indicator) return;
        
        if (distance > 30) {
            this.isPulling = true;
            indicator.classList.add('show');
            
            // Update indicator based on pull distance
            if (distance > this.pullToRefreshThreshold) {
                indicator.innerHTML = '↻';
                indicator.style.background = '#28a745';
            } else {
                indicator.innerHTML = '↓';
                indicator.style.background = '#007bff';
            }
        }
    }

    handlePullToRefreshEnd() {
        const indicator = document.querySelector('.pull-to-refresh');
        if (!indicator || !this.isPulling) return;
        
        const pullDistance = this.touchEndY - this.touchStartY;
        
        if (pullDistance > this.pullToRefreshThreshold) {
            this.triggerRefresh();
        } else {
            indicator.classList.remove('show');
        }
        
        this.isPulling = false;
    }

    triggerRefresh() {
        const indicator = document.querySelector('.pull-to-refresh');
        if (indicator) {
            indicator.innerHTML = '↻';
            indicator.classList.add('loading');
            
            // Simulate refresh
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }

    handleScroll() {
        // Hide pull to refresh indicator when scrolling
        if (window.scrollY > 0) {
            const indicator = document.querySelector('.pull-to-refresh');
            if (indicator) {
                indicator.classList.remove('show');
            }
        }
    }

    // Navigation swipe handling
    handleNavigationSwipe() {
        if (!this.isMobile) return;
        
        const deltaX = this.touchEndX - this.touchStartX;
        const nav = document.getElementById('nav');
        
        if (this.isNavOpen && deltaX < -50) {
            // Swiping left while nav is open - close it
            this.closeNavigation();
        } else if (!this.isNavOpen && this.touchStartX < 50 && deltaX > 50) {
            // Swiping right from left edge - open nav
            this.openNavigation();
        }
    }

    // App-like transitions
    setupLinkTransitions() {
        // Add transition effects to internal links
        document.querySelectorAll('a[href^="/"], a[href^="./"], a[href^="../"]').forEach(link => {
            link.addEventListener('click', (e) => {
                if (!e.ctrlKey && !e.metaKey) {
                    this.handleLinkTransition(e, link);
                }
            });
        });
    }

    handleLinkTransition(e, link) {
        // Add fade out effect before navigation
        const main = document.querySelector('main') || document.body;
        main.style.opacity = '0.7';
        main.style.transform = 'scale(0.98)';
        
        // Allow navigation to proceed
        setTimeout(() => {
            if (link.href) {
                window.location.href = link.href;
            }
        }, 150);
    }

    // Responsive behavior
    handleResize() {
        // Close navigation if switching to desktop
        if (!this.isMobile && this.isNavOpen) {
            this.closeNavigation();
        }
    }

    handleOrientationChange() {
        // Recalculate dimensions after orientation change
        this.isMobile = window.innerWidth <= 768;
        
        // Close navigation on orientation change
        if (this.isNavOpen) {
            this.closeNavigation();
        }
    }

    // Utility methods
    addHapticFeedback() {
        // Add haptic feedback for supported devices
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }

    showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 14px;
            z-index: 10000;
            animation: fadeInUp 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // Public API
    isNavigationOpen() {
        return this.isNavOpen;
    }

    forceCloseNavigation() {
        this.closeNavigation();
    }

    enablePullToRefresh() {
        this.pullToRefreshEnabled = true;
    }

    disablePullToRefresh() {
        this.pullToRefreshEnabled = false;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mobileGestureManager = new MobileGestureManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileGestureManager;
}
