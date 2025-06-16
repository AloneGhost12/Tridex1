/**
 * Tridex Service Worker - Phase 2 PWA Implementation
 * Provides offline functionality, caching, and push notifications
 */

const CACHE_NAME = 'tridex-v2.2.0';
const STATIC_CACHE = 'tridex-static-v2.2.0';
const DYNAMIC_CACHE = 'tridex-dynamic-v2.2.0';
const API_CACHE = 'tridex-api-v2.2.0';

// Files to cache for offline functionality
const STATIC_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/chatbot.css',
    '/css/custom-popups.css',
    '/css/wishlist.css',
    '/css/advanced-search.css',
    '/css/responsive.css',
    '/css/navigation-responsive.css',
    '/css/forms-responsive.css',
    '/css/ecommerce-responsive.css',
    '/css/master-responsive.css',
    '/js/custom-popups.js',
    '/js/wishlist.js',
    '/js/advanced-search.js',
    '/js/responsive.js',
    '/ban-system.js',
    '/chatbot.js',
    '/chatbot-ai.js',
    '/manifest.json',
    '/favicon.svg',
    '/icons/icon-192x192.png',
    '/icons/tridex-icon.svg'
];

// API endpoints to cache
const API_ENDPOINTS = [
    '/products',
    '/categories',
    '/products/search/filters'
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('[SW] Installing service worker...');
    
    event.waitUntil(
        Promise.all([
            // Cache static files
            caches.open(STATIC_CACHE).then(cache => {
                console.log('[SW] Caching static files');
                return cache.addAll(STATIC_FILES);
            }),
            // Cache API data
            caches.open(API_CACHE).then(cache => {
                console.log('[SW] Pre-caching API data');
                return Promise.all(
                    API_ENDPOINTS.map(endpoint => {
                        return fetch(endpoint)
                            .then(response => {
                                if (response.ok) {
                                    return cache.put(endpoint, response);
                                }
                            })
                            .catch(err => console.log(`[SW] Failed to cache ${endpoint}:`, err));
                    })
                );
            })
        ]).then(() => {
            console.log('[SW] Installation complete');
            return self.skipWaiting();
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating service worker...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== STATIC_CACHE && 
                        cacheName !== DYNAMIC_CACHE && 
                        cacheName !== API_CACHE) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Activation complete');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip service worker for external URLs (like Render server)
    if (url.origin !== location.origin) {
        return; // Let the browser handle external requests normally
    }

    // Handle different types of requests for same-origin only
    if (request.method === 'GET') {
        if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/products')) {
            // API requests - cache with network first strategy
            event.respondWith(handleApiRequest(request));
        } else if (STATIC_FILES.includes(url.pathname) || url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
            // Static files - cache first strategy
            event.respondWith(handleStaticRequest(request));
        } else {
            // Other requests - network first with cache fallback
            event.respondWith(handleDynamicRequest(request));
        }
    }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
    try {
        // Try network first
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            // Cache successful responses
            const cache = await caches.open(API_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }

        // If network response is not ok, try cache
        const cachedResponse = await getCachedResponse(request, API_CACHE);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Return the network response even if not ok (let the app handle the error)
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed for API request:', error);

        // Try cache first
        const cachedResponse = await getCachedResponse(request, API_CACHE);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Return a proper error response
        return new Response(JSON.stringify({ error: 'Network unavailable' }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle static files with cache-first strategy
async function handleStaticRequest(request) {
    try {
        // Try cache first
        const cachedResponse = await getCachedResponse(request, STATIC_CACHE);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // If not in cache, fetch from network and cache
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[SW] Failed to serve static file:', error);
        return new Response('Offline - File not available', { status: 503 });
    }
}

// Handle dynamic requests with network-first strategy
async function handleDynamicRequest(request) {
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful responses
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // If network fails, try cache
        const cachedResponse = await getCachedResponse(request, DYNAMIC_CACHE);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page for HTML requests
        if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
        }
        
        return new Response('Offline', { status: 503 });
    }
}

// Helper function to get cached response
async function getCachedResponse(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);
        const response = await cache.match(request);

        // Ensure we return a valid Response object
        if (response && response instanceof Response) {
            return response;
        }
        return null;
    } catch (error) {
        console.log('[SW] Error getting cached response:', error);
        return null;
    }
}

// Push notification event
self.addEventListener('push', event => {
    console.log('[SW] Push notification received');
    
    const options = {
        body: 'You have new updates from Tridex!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Explore',
                icon: '/icons/checkmark.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/icons/xmark.png'
            }
        ]
    };
    
    if (event.data) {
        const data = event.data.json();
        options.body = data.body || options.body;
        options.title = data.title || 'Tridex';
        options.data = { ...options.data, ...data };
    }
    
    event.waitUntil(
        self.registration.showNotification('Tridex', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    console.log('[SW] Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    } else if (event.action === 'close') {
        // Just close the notification
        return;
    } else {
        // Default action - open the app
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Background sync event
self.addEventListener('sync', event => {
    console.log('[SW] Background sync triggered:', event.tag);
    
    if (event.tag === 'cart-sync') {
        event.waitUntil(syncCart());
    } else if (event.tag === 'wishlist-sync') {
        event.waitUntil(syncWishlist());
    }
});

// Sync cart data when connection is restored
async function syncCart() {
    try {
        // Get pending cart updates from IndexedDB
        const pendingUpdates = await getPendingCartUpdates();
        
        for (const update of pendingUpdates) {
            await fetch('/api/cart/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(update)
            });
        }
        
        // Clear pending updates after successful sync
        await clearPendingCartUpdates();
        console.log('[SW] Cart sync completed');
    } catch (error) {
        console.error('[SW] Cart sync failed:', error);
    }
}

// Sync wishlist data when connection is restored
async function syncWishlist() {
    try {
        // Get pending wishlist updates from IndexedDB
        const pendingUpdates = await getPendingWishlistUpdates();
        
        for (const update of pendingUpdates) {
            await fetch('/api/wishlist/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(update)
            });
        }
        
        // Clear pending updates after successful sync
        await clearPendingWishlistUpdates();
        console.log('[SW] Wishlist sync completed');
    } catch (error) {
        console.error('[SW] Wishlist sync failed:', error);
    }
}

// Placeholder functions for IndexedDB operations
async function getPendingCartUpdates() {
    // TODO: Implement IndexedDB operations
    return [];
}

async function clearPendingCartUpdates() {
    // TODO: Implement IndexedDB operations
}

async function getPendingWishlistUpdates() {
    // TODO: Implement IndexedDB operations
    return [];
}

async function clearPendingWishlistUpdates() {
    // TODO: Implement IndexedDB operations
}
