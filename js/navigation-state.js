/**
 * Navigation State Management
 * 
 * This file handles state management for browser navigation events
 * to ensure UI consistency when using the back/forward buttons.
 */

// Store the current page state when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Navigation state management initialized');
    
    // Save the current page state
    savePageState();
    
    // Add event listener for popstate events (browser back/forward buttons)
    window.addEventListener('popstate', handlePopState);
    
    // Add event listener for beforeunload to save state before leaving
    window.addEventListener('beforeunload', savePageState);
});

/**
 * Save the current page state
 */
function savePageState() {
    // Create a state object with the current UI state
    const state = {
        page: getCurrentPage(),
        scrollPos: window.scrollY,
        timestamp: Date.now()
    };
    
    // Replace the current history state with our state object
    try {
        history.replaceState(state, '', window.location.href);
        console.log('Page state saved:', state);
    } catch (error) {
        console.error('Error saving page state:', error);
    }
}

/**
 * Handle popstate events (browser back/forward buttons)
 */
function handlePopState(event) {
    console.log('Navigation event detected, state:', event.state);
    
    // If there's no state, we can't restore anything
    if (!event.state) {
        console.warn('No state available to restore');
        return;
    }
    
    // Restore the UI state
    restoreUIState();
    
    // Restore scroll position if available
    if (event.state.scrollPos !== undefined) {
        setTimeout(() => {
            window.scrollTo(0, event.state.scrollPos);
        }, 100);
    }
}

/**
 * Restore the UI state after navigation
 */
function restoreUIState() {
    console.log('Restoring UI state');
    
    // Reinitialize responsive navigation
    if (typeof initResponsiveNavigation === 'function') {
        initResponsiveNavigation();
    } else {
        // If the function isn't available yet, wait for it
        waitForResponsiveNavigation();
    }
    
    // Ensure navigation elements are visible
    ensureNavigationElementsVisible();
    
    // Update notification badges
    updateNotificationBadges();
}

/**
 * Wait for the responsive navigation function to be available
 */
function waitForResponsiveNavigation() {
    if (typeof initResponsiveNavigation === 'function') {
        initResponsiveNavigation();
    } else {
        setTimeout(waitForResponsiveNavigation, 100);
    }
}

/**
 * Ensure navigation elements are visible
 */
function ensureNavigationElementsVisible() {
    // Get navigation elements
    const hamburger = document.getElementById('hamburger-menu');
    const nav = document.getElementById('nav');
    const mainNav = document.getElementById('main-nav');
    
    // If elements don't exist, exit early
    if (!hamburger || !nav) {
        console.warn('Navigation elements not found');
        return;
    }
    
    // Check window size to determine correct display
    if (window.innerWidth <= 992) {
        // Mobile view
        hamburger.style.display = 'flex';
        
        // Only hide nav if it's not explicitly shown
        if (!nav.classList.contains('show')) {
            nav.style.display = 'none';
        }
        
        // Ensure proper styling for mobile nav
        nav.classList.add('mobile-nav');
    } else {
        // Desktop view
        hamburger.style.display = 'none';
        nav.style.display = 'flex';
        
        // Remove mobile-specific styling
        nav.classList.remove('mobile-nav', 'show');
        hamburger.classList.remove('active');
    }
    
    // Ensure main nav is visible
    if (mainNav) {
        mainNav.style.display = window.innerWidth <= 992 ? 'block' : 'flex';
    }
}

/**
 * Update notification badges
 */
function updateNotificationBadges() {
    // Update cart count
    if (typeof updateCartCount === 'function') {
        updateCartCount();
    }
    
    // Update mail count
    if (typeof updateMailCount === 'function') {
        updateMailCount();
    }
}

/**
 * Get the current page name from the URL
 */
function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    
    if (!filename || filename === '') {
        return 'index';
    }
    
    return filename.replace('.html', '');
}

// Export functions for use in other scripts
window.navigationState = {
    savePageState,
    handlePopState,
    restoreUIState,
    ensureNavigationElementsVisible,
    updateNotificationBadges
};
