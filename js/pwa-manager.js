/**
 * PWA Manager - Phase 2 Implementation
 * Handles PWA installation, service worker registration, and push notifications
 */

class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.swRegistration = null;
        this.notificationPermission = 'default';
        
        this.init();
    }

    async init() {
        // Check if PWA is already installed
        this.checkInstallationStatus();
        
        // Register service worker
        await this.registerServiceWorker();
        
        // Setup PWA installation prompt
        this.setupInstallPrompt();
        
        // Setup push notifications
        this.setupPushNotifications();
        
        // Setup offline detection
        this.setupOfflineDetection();
        
        // Create PWA UI elements
        this.createPWAUI();
    }

    checkInstallationStatus() {
        // Check if running as PWA
        this.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                          window.navigator.standalone ||
                          document.referrer.includes('android-app://');
        
        console.log('[PWA] Installation status:', this.isInstalled ? 'Installed' : 'Not installed');
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                this.swRegistration = await navigator.serviceWorker.register('/sw.js');
                console.log('[PWA] Service Worker registered:', this.swRegistration);
                
                // Listen for service worker updates
                this.swRegistration.addEventListener('updatefound', () => {
                    console.log('[PWA] Service Worker update found');
                    this.showUpdateAvailable();
                });
                
                // Check for existing service worker
                if (this.swRegistration.active) {
                    console.log('[PWA] Service Worker is active');
                }
                
            } catch (error) {
                console.error('[PWA] Service Worker registration failed:', error);
            }
        } else {
            console.log('[PWA] Service Worker not supported');
        }
    }

    setupInstallPrompt() {
        // Listen for beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('[PWA] Install prompt available');
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });

        // Listen for app installed event
        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App installed');
            this.isInstalled = true;
            this.hideInstallButton();
            this.showInstallSuccess();
        });
    }

    async setupPushNotifications() {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            this.notificationPermission = Notification.permission;
            
            if (this.notificationPermission === 'default') {
                this.showNotificationPrompt();
            }
        }
    }

    setupOfflineDetection() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            console.log('[PWA] Back online');
            this.hideOfflineIndicator();
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            console.log('[PWA] Gone offline');
            this.showOfflineIndicator();
        });

        // Check initial connection status
        if (!navigator.onLine) {
            this.showOfflineIndicator();
        }
    }

    createPWAUI() {
        // Create PWA control panel
        const pwaPanel = document.createElement('div');
        pwaPanel.id = 'pwa-panel';
        pwaPanel.innerHTML = `
            <div class="pwa-controls" style="position: fixed; top: 10px; right: 10px; z-index: 10000; display: none;">
                <button id="pwa-install-btn" class="pwa-btn install-btn" style="display: none;">
                    📱 Install App
                </button>
                <button id="pwa-notification-btn" class="pwa-btn notification-btn" style="display: none;">
                    🔔 Enable Notifications
                </button>
                <div id="pwa-offline-indicator" class="offline-indicator" style="display: none;">
                    📡 Offline Mode
                </div>
                <div id="pwa-update-indicator" class="update-indicator" style="display: none;">
                    🔄 Update Available
                </div>
            </div>
        `;
        
        document.body.appendChild(pwaPanel);
        
        // Add event listeners
        this.setupPWAEventListeners();
        
        // Add PWA styles
        this.addPWAStyles();
    }

    setupPWAEventListeners() {
        // Install button
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
            installBtn.addEventListener('click', () => this.installPWA());
        }

        // Notification button
        const notificationBtn = document.getElementById('pwa-notification-btn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => this.requestNotificationPermission());
        }

        // Update indicator
        const updateIndicator = document.getElementById('pwa-update-indicator');
        if (updateIndicator) {
            updateIndicator.addEventListener('click', () => this.updateServiceWorker());
        }
    }

    addPWAStyles() {
        const styles = `
            <style>
                .pwa-btn {
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    cursor: pointer;
                    margin: 2px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    transition: all 0.3s ease;
                }
                
                .pwa-btn:hover {
                    background: #0056b3;
                    transform: translateY(-1px);
                }
                
                .install-btn {
                    background: #28a745;
                }
                
                .notification-btn {
                    background: #ffc107;
                    color: #000;
                }
                
                .offline-indicator {
                    background: #dc3545;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    margin: 2px;
                    animation: pulse 2s infinite;
                }
                
                .update-indicator {
                    background: #17a2b8;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    margin: 2px;
                    cursor: pointer;
                    animation: bounce 1s infinite;
                }
                
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
                
                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-5px); }
                    60% { transform: translateY(-3px); }
                }
                
                @media (max-width: 768px) {
                    .pwa-controls {
                        top: 5px !important;
                        right: 5px !important;
                    }
                    
                    .pwa-btn, .offline-indicator, .update-indicator {
                        font-size: 10px !important;
                        padding: 6px 8px !important;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    showInstallButton() {
        const installBtn = document.getElementById('pwa-install-btn');
        const controls = document.querySelector('.pwa-controls');
        
        if (installBtn && !this.isInstalled) {
            installBtn.style.display = 'inline-block';
            controls.style.display = 'block';
        }
    }

    hideInstallButton() {
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
            installBtn.style.display = 'none';
        }
    }

    showNotificationPrompt() {
        const notificationBtn = document.getElementById('pwa-notification-btn');
        const controls = document.querySelector('.pwa-controls');
        
        if (notificationBtn && this.notificationPermission === 'default') {
            notificationBtn.style.display = 'inline-block';
            controls.style.display = 'block';
        }
    }

    hideNotificationPrompt() {
        const notificationBtn = document.getElementById('pwa-notification-btn');
        if (notificationBtn) {
            notificationBtn.style.display = 'none';
        }
    }

    showOfflineIndicator() {
        const indicator = document.getElementById('pwa-offline-indicator');
        const controls = document.querySelector('.pwa-controls');
        
        if (indicator) {
            indicator.style.display = 'inline-block';
            controls.style.display = 'block';
        }
    }

    hideOfflineIndicator() {
        const indicator = document.getElementById('pwa-offline-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    showUpdateAvailable() {
        const indicator = document.getElementById('pwa-update-indicator');
        const controls = document.querySelector('.pwa-controls');
        
        if (indicator) {
            indicator.style.display = 'inline-block';
            controls.style.display = 'block';
        }
    }

    async installPWA() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            console.log('[PWA] Install prompt result:', outcome);
            
            if (outcome === 'accepted') {
                console.log('[PWA] User accepted install prompt');
            } else {
                console.log('[PWA] User dismissed install prompt');
            }
            
            this.deferredPrompt = null;
        }
    }

    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            this.notificationPermission = permission;
            
            if (permission === 'granted') {
                console.log('[PWA] Notification permission granted');
                this.hideNotificationPrompt();
                this.subscribeToNotifications();
            } else {
                console.log('[PWA] Notification permission denied');
            }
        }
    }

    async subscribeToNotifications() {
        if (this.swRegistration && this.notificationPermission === 'granted') {
            try {
                // TODO: Replace with your VAPID public key
                const vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY';
                
                const subscription = await this.swRegistration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
                });
                
                console.log('[PWA] Push subscription:', subscription);
                
                // Send subscription to server
                await this.sendSubscriptionToServer(subscription);
                
            } catch (error) {
                console.error('[PWA] Failed to subscribe to notifications:', error);
            }
        }
    }

    async sendSubscriptionToServer(subscription) {
        try {
            const response = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subscription,
                    userId: localStorage.getItem('userId')
                })
            });
            
            if (response.ok) {
                console.log('[PWA] Subscription sent to server');
            }
        } catch (error) {
            console.error('[PWA] Failed to send subscription to server:', error);
        }
    }

    updateServiceWorker() {
        if (this.swRegistration && this.swRegistration.waiting) {
            this.swRegistration.waiting.postMessage({ action: 'skipWaiting' });
            window.location.reload();
        }
    }

    async syncOfflineData() {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            try {
                await this.swRegistration.sync.register('cart-sync');
                await this.swRegistration.sync.register('wishlist-sync');
                console.log('[PWA] Background sync registered');
            } catch (error) {
                console.error('[PWA] Background sync registration failed:', error);
            }
        }
    }

    showInstallSuccess() {
        // Show success message
        if (window.tridexSuccess) {
            window.tridexSuccess('🎉 Tridex app installed successfully! You can now access it from your home screen.');
        } else {
            alert('🎉 Tridex app installed successfully!');
        }
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Public methods for external use
    isAppInstalled() {
        return this.isInstalled;
    }

    canInstall() {
        return this.deferredPrompt !== null;
    }

    hasNotificationPermission() {
        return this.notificationPermission === 'granted';
    }
}

// Initialize PWA Manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pwaManager = new PWAManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PWAManager;
}
