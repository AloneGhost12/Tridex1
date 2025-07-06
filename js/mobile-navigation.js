/**
 * Tridex Mobile Navigation JavaScript
 * Enhanced mobile navigation functionality with proper event handling
 */

class MobileNavigation {
    constructor() {
        this.hamburger = null;
        this.nav = null;
        this.overlay = null;
        this.isOpen = false;
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.hamburger = document.getElementById('hamburger-menu');
        this.nav = document.getElementById('nav');
        
        if (!this.hamburger || !this.nav) {
            console.warn('Mobile navigation elements not found');
            return;
        }

        this.createOverlay();
        this.bindEvents();
        this.setupNotificationBadges();
        
        console.log('Mobile navigation initialized');
    }

    createOverlay() {
        // Create overlay for mobile menu
        this.overlay = document.createElement('div');
        this.overlay.className = 'nav-overlay';
        this.overlay.id = 'nav-overlay';
        document.body.appendChild(this.overlay);
    }

    bindEvents() {
        // Hamburger click event
        this.hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });

        // Overlay click event
        this.overlay.addEventListener('click', () => {
            this.closeMenu();
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && 
                !this.hamburger.contains(e.target) && 
                !this.nav.contains(e.target)) {
                this.closeMenu();
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 992 && this.isOpen) {
                this.closeMenu();
            }
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
            }
        });

        // Handle navigation item clicks
        this.nav.addEventListener('click', (e) => {
            // Close menu when navigation item is clicked on mobile
            if (window.innerWidth <= 992) {
                // Don't close for dropdown toggles
                if (!e.target.closest('.dropdown-toggle')) {
                    setTimeout(() => this.closeMenu(), 150);
                }
            }
        });
    }

    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        this.isOpen = true;
        this.nav.classList.add('show');
        this.overlay.classList.add('show');
        this.hamburger.classList.add('active');
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Animate hamburger
        this.animateHamburger(true);
        
        // Focus management
        this.nav.setAttribute('aria-expanded', 'true');
        
        console.log('Mobile menu opened');
    }

    closeMenu() {
        this.isOpen = false;
        this.nav.classList.remove('show');
        this.overlay.classList.remove('show');
        this.hamburger.classList.remove('active');
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Reset hamburger animation
        this.animateHamburger(false);
        
        // Focus management
        this.nav.setAttribute('aria-expanded', 'false');
        
        console.log('Mobile menu closed');
    }

    animateHamburger(isOpen) {
        const lines = this.hamburger.querySelectorAll('div');
        if (lines.length < 3) return;

        if (isOpen) {
            lines[0].style.transform = 'rotate(-45deg) translate(-5px, 6px)';
            lines[1].style.opacity = '0';
            lines[2].style.transform = 'rotate(45deg) translate(-5px, -6px)';
        } else {
            lines[0].style.transform = 'none';
            lines[1].style.opacity = '1';
            lines[2].style.transform = 'none';
        }
    }

    setupNotificationBadges() {
        // Ensure notification badges are properly positioned in mobile
        const badges = ['mail-count', 'cart-count', 'wishlist-count'];
        
        badges.forEach(badgeId => {
            const badge = document.getElementById(badgeId);
            if (badge) {
                // Ensure badges are visible and properly styled
                badge.style.display = 'flex';
                badge.style.alignItems = 'center';
                badge.style.justifyContent = 'center';
                
                // Update badge positioning for mobile
                this.updateBadgePosition(badge);
            }
        });

        // Listen for window resize to update badge positions
        window.addEventListener('resize', () => {
            badges.forEach(badgeId => {
                const badge = document.getElementById(badgeId);
                if (badge) {
                    this.updateBadgePosition(badge);
                }
            });
        });
    }

    updateBadgePosition(badge) {
        if (window.innerWidth <= 992) {
            // Mobile positioning
            badge.style.position = 'absolute';
            badge.style.top = '8px';
            badge.style.right = '20px';
            badge.style.zIndex = '1001';
        } else {
            // Desktop positioning
            badge.style.position = 'absolute';
            badge.style.top = '-8px';
            badge.style.right = '-8px';
            badge.style.zIndex = '10';
        }
    }

    // Public method to update notification counts
    updateNotificationCount(type, count) {
        const badge = document.getElementById(`${type}-count`);
        if (badge) {
            badge.textContent = count || '0';
            badge.style.display = count > 0 ? 'flex' : 'none';
            
            // Add animation for count updates
            badge.style.transform = 'scale(1.2)';
            setTimeout(() => {
                badge.style.transform = 'scale(1)';
            }, 200);
        }
    }

    // Public method to check if menu is open
    isMenuOpen() {
        return this.isOpen;
    }

    // Public method to force close menu
    forceClose() {
        this.closeMenu();
    }
}

// Dropdown functionality
class DropdownManager {
    constructor() {
        this.activeDropdown = null;
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupDropdowns();
        });
    }

    setupDropdowns() {
        // Handle user dropdown
        const userIcon = document.getElementById('userIcon');
        const userDropdown = document.getElementById('userDropdown');

        if (userIcon && userDropdown) {
            userIcon.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleDropdown(userDropdown);
            });
        }

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (this.activeDropdown && !this.activeDropdown.contains(e.target)) {
                this.closeDropdown(this.activeDropdown);
            }
        });
    }

    toggleDropdown(dropdown) {
        if (this.activeDropdown && this.activeDropdown !== dropdown) {
            this.closeDropdown(this.activeDropdown);
        }

        if (dropdown.classList.contains('show')) {
            this.closeDropdown(dropdown);
        } else {
            this.openDropdown(dropdown);
        }
    }

    openDropdown(dropdown) {
        dropdown.classList.add('show');
        dropdown.style.display = 'block';
        this.activeDropdown = dropdown;
    }

    closeDropdown(dropdown) {
        dropdown.classList.remove('show');
        dropdown.style.display = 'none';
        if (this.activeDropdown === dropdown) {
            this.activeDropdown = null;
        }
    }
}

// Initialize mobile navigation and dropdown functionality
let mobileNav, dropdownManager;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNavigation);
} else {
    initializeNavigation();
}

function initializeNavigation() {
    mobileNav = new MobileNavigation();
    dropdownManager = new DropdownManager();
    
    // Make mobile navigation globally accessible
    window.mobileNav = mobileNav;
    window.dropdownManager = dropdownManager;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MobileNavigation, DropdownManager };
}
