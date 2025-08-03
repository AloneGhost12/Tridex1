/**
 * Tridex Responsive Behavior
 *
 * This file contains JavaScript functions to handle responsive behavior
 * consistently across all pages of the Tridex website.
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize responsive navigation
    initResponsiveNavigation();

    // Add viewport meta tag if not present
    ensureViewportMeta();

    // Initialize responsive tables
    makeTablesResponsive();

    // Optimize touch targets
    optimizeTouchTargets();

    // Adjust image sizes for mobile
    optimizeImagesForMobile();
});

/**
 * Initialize responsive navigation with hamburger menu
 * This function can be called multiple times safely (e.g., after browser navigation)
 */
function initResponsiveNavigation() {
    const hamburger = document.getElementById('hamburger-menu');
    const nav = document.getElementById('nav');
    const mainNav = document.getElementById('main-nav');

    // If navigation elements don't exist, exit early
    if (!hamburger || !nav) {
        console.warn('Hamburger menu or navigation elements not found');
        return;
    }

    // Clean up any existing event listeners to prevent duplicates
    cleanupNavigationEventListeners();

    // Function to check window size and adjust menu visibility
    function checkWindowSize() {
        if (window.innerWidth <= 992) {
            // Mobile view
            hamburger.style.display = 'flex';

            // Only hide nav if it's not explicitly shown
            if (!nav.classList.contains('show')) {
                nav.style.display = 'none';
            }

            // Ensure proper styling for mobile nav
            nav.classList.add('mobile-nav');

            // Ensure main nav is visible
            if (mainNav) {
                mainNav.style.display = 'block';
            }
        } else {
            // Desktop view
            hamburger.style.display = 'none';
            nav.style.display = 'flex';

            // Remove mobile-specific styling
            nav.classList.remove('mobile-nav', 'show');
            hamburger.classList.remove('active');

            // Reset any inline styles
            nav.style.position = '';
            nav.style.top = '';
            nav.style.left = '';
            nav.style.width = '';
            nav.style.backgroundColor = '';
            nav.style.flexDirection = '';
            nav.style.zIndex = '';
            nav.style.boxShadow = '';

            // Ensure main nav is visible
            if (mainNav) {
                mainNav.style.display = 'flex';
            }
        }

        // Ensure notification badges are properly positioned
        positionNotificationBadges();

        // Update cart count
        if (typeof updateCartCount === 'function') {
            updateCartCount();
        }

        // Update mail count
        if (typeof updateMailCount === 'function') {
            updateMailCount();
        }
    }

    // Toggle menu when hamburger is clicked
    function handleHamburgerClick(e) {
        e.preventDefault();
        e.stopPropagation(); // Prevent event from bubbling up

        console.log('Hamburger clicked, current nav display:', nav.style.display);

        // Toggle the show class and active class
        nav.classList.toggle('show');
        hamburger.classList.toggle('active');

        // Update display style based on show class
        if (nav.classList.contains('show')) {
            nav.style.display = 'flex';

            // Apply mobile styling
            nav.style.position = 'absolute';
            nav.style.top = '60px';
            nav.style.left = '0';
            nav.style.width = '100%';
            nav.style.backgroundColor = '#333';
            nav.style.flexDirection = 'column';
            nav.style.zIndex = '1000';
            nav.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        } else {
            nav.style.display = 'none';
        }

        // Ensure notification badges are properly positioned
        positionNotificationBadges();

        console.log('After toggle, nav display:', nav.style.display, 'show class:', nav.classList.contains('show'));
    }

    // Close navigation when clicking outside
    function handleOutsideClick(event) {
        if (window.innerWidth <= 992 &&
            nav.classList.contains('show') &&
            !nav.contains(event.target) &&
            event.target !== hamburger &&
            !hamburger.contains(event.target)) {

            console.log('Clicked outside, closing menu');
            nav.classList.remove('show');
            nav.style.display = 'none';
            hamburger.classList.remove('active');
        }
    }

    // Handle window resize
    function handleResize() {
        checkWindowSize();
    }

    // Add event listeners
    hamburger.addEventListener('click', handleHamburgerClick);
    document.addEventListener('click', handleOutsideClick);
    window.addEventListener('resize', handleResize);

    // Store event listeners for cleanup
    hamburger._clickHandler = handleHamburgerClick;
    document._navClickHandler = handleOutsideClick;
    window._navResizeHandler = handleResize;

    // Initial check
    checkWindowSize();

    // Handle popstate events (browser back/forward buttons)
    window.addEventListener('popstate', function(event) {
        console.log('Popstate event in responsive.js, reinitializing navigation');
        setTimeout(checkWindowSize, 100);
    });

    console.log('Responsive navigation initialized');
}

/**
 * Clean up navigation event listeners to prevent duplicates
 */
function cleanupNavigationEventListeners() {
    const hamburger = document.getElementById('hamburger-menu');

    // Remove hamburger click handler
    if (hamburger && hamburger._clickHandler) {
        hamburger.removeEventListener('click', hamburger._clickHandler);
        delete hamburger._clickHandler;
    }

    // Remove document click handler
    if (document._navClickHandler) {
        document.removeEventListener('click', document._navClickHandler);
        delete document._navClickHandler;
    }

    // Remove window resize handler
    if (window._navResizeHandler) {
        window.removeEventListener('resize', window._navResizeHandler);
        delete window._navResizeHandler;
    }
}

/**
 * Ensure viewport meta tag is present
 */
function ensureViewportMeta() {
    if (!document.querySelector('meta[name="viewport"]')) {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.head.appendChild(meta);
    }
}

/**
 * Make tables responsive
 */
function makeTablesResponsive() {
    const tables = document.querySelectorAll('table:not(.responsive-table)');

    tables.forEach(table => {
        // Add responsive table class
        table.classList.add('responsive-table');

        // Wrap table in a responsive container if not already wrapped
        if (table.parentElement.className !== 'table-responsive') {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }
    });
}

/**
 * Optimize touch targets for mobile
 */
function optimizeTouchTargets() {
    // Minimum recommended touch target size is 44x44 pixels
    const minTouchSize = 44;

    // Elements that should have minimum touch target size
    const touchElements = document.querySelectorAll('button, .btn, input[type="button"], input[type="submit"], .nav, .nav-icon, a');

    touchElements.forEach(element => {
        // Get computed style
        const style = window.getComputedStyle(element);
        const height = parseInt(style.height);
        const width = parseInt(style.width);

        // If element is smaller than minimum touch size, add padding
        if (height < minTouchSize || width < minTouchSize) {
            element.classList.add('touch-target');
        }
    });
}

/**
 * Optimize images for mobile
 */
function optimizeImagesForMobile() {
    if (window.innerWidth <= 768) {
        const images = document.querySelectorAll('img:not([loading])');

        images.forEach(img => {
            // Add lazy loading
            img.setAttribute('loading', 'lazy');

            // Add intrinsic size if not present
            if (!img.getAttribute('width') && !img.getAttribute('height')) {
                img.style.aspectRatio = 'auto';
            }
        });
    }
}

/**
 * Position notification badges correctly in mobile view
 */
function positionNotificationBadges() {
    const mailCount = document.getElementById('mail-count');
    const cartCount = document.getElementById('cart-count');

    if (window.innerWidth <= 992) {
        // Mobile view - adjust badge positions
        if (mailCount) {
            mailCount.style.position = 'absolute';
            mailCount.style.right = '10px';
        }

        if (cartCount) {
            cartCount.style.position = 'absolute';
            cartCount.style.right = '10px';
        }
    } else {
        // Desktop view - reset badge positions
        if (mailCount) {
            mailCount.style.position = '';
            mailCount.style.right = '';
        }

        if (cartCount) {
            cartCount.style.position = '';
            cartCount.style.right = '';
        }
    }
}

/**
 * Update hamburger menu icon state
 * @param {boolean} isActive - Whether the menu is active/open
 */
function updateHamburgerIcon(isActive) {
    const hamburger = document.getElementById('hamburger-menu');
    if (!hamburger) return;

    if (isActive) {
        hamburger.classList.add('active');
    } else {
        hamburger.classList.remove('active');
    }
}

/**
 * Check if device is mobile
 * @returns {boolean} True if device is mobile
 */
function isMobileDevice() {
    return window.innerWidth <= 992;
}

/**
 * Adjust font sizes for mobile
 */
function adjustFontSizesForMobile() {
    if (window.innerWidth <= 576) {
        document.documentElement.style.fontSize = '14px';
    } else {
        document.documentElement.style.fontSize = '';
    }
}

// Export functions for use in other scripts
window.tridexResponsive = {
    initResponsiveNavigation,
    makeTablesResponsive,
    optimizeTouchTargets,
    optimizeImagesForMobile,
    isMobileDevice,
    updateHamburgerIcon,
    adjustFontSizesForMobile
};
