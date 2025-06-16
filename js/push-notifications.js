/**
 * Tridex Push Notification System - Phase 2A Implementation
 * Handles push notifications for orders, promotions, and recommendations
 */

class PushNotificationManager {
    constructor() {
        this.vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9f8HnKJuOmLsOH6uMXu7WeCBHZ1JlpZOY6zPn3nHoUBnANtEG2p4';
        this.subscription = null;
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        this.permission = 'default';
        
        this.init();
    }

    async init() {
        console.log('Push Notifications: Initializing...');
        
        if (!this.isSupported) {
            console.log('Push Notifications: Not supported in this browser');
            return;
        }

        // Check current permission status
        this.permission = Notification.permission;
        console.log('Push Notifications: Current permission:', this.permission);

        // Setup notification types
        this.setupNotificationTypes();
        
        // Setup user preferences
        this.loadUserPreferences();
        
        // Create notification UI
        this.createNotificationUI();
    }

    setupNotificationTypes() {
        this.notificationTypes = {
            order: {
                title: 'Order Updates',
                description: 'Get notified about order status changes',
                icon: '📦',
                enabled: true
            },
            promotion: {
                title: 'Promotions & Deals',
                description: 'Receive notifications about special offers',
                icon: '🏷️',
                enabled: true
            },
            recommendation: {
                title: 'Product Recommendations',
                description: 'Get personalized product suggestions',
                icon: '💡',
                enabled: false
            },
            wishlist: {
                title: 'Wishlist Updates',
                description: 'Price drops and availability alerts',
                icon: '❤️',
                enabled: true
            },
            cart: {
                title: 'Cart Reminders',
                description: 'Reminders about items in your cart',
                icon: '🛒',
                enabled: false
            }
        };
    }

    loadUserPreferences() {
        const saved = localStorage.getItem('notification-preferences');
        if (saved) {
            try {
                const preferences = JSON.parse(saved);
                Object.keys(preferences).forEach(type => {
                    if (this.notificationTypes[type]) {
                        this.notificationTypes[type].enabled = preferences[type];
                    }
                });
            } catch (error) {
                console.error('Push Notifications: Error loading preferences:', error);
            }
        }
    }

    saveUserPreferences() {
        const preferences = {};
        Object.keys(this.notificationTypes).forEach(type => {
            preferences[type] = this.notificationTypes[type].enabled;
        });
        localStorage.setItem('notification-preferences', JSON.stringify(preferences));
    }

    createNotificationUI() {
        // Create notification settings panel
        const panel = document.createElement('div');
        panel.id = 'notification-settings-panel';
        panel.className = 'notification-panel hidden';
        panel.innerHTML = this.generateNotificationPanelHTML();
        
        document.body.appendChild(panel);
        
        // Add event listeners
        this.setupNotificationEventListeners();
        
        // Add styles
        this.addNotificationStyles();
    }

    generateNotificationPanelHTML() {
        const typesHTML = Object.keys(this.notificationTypes).map(type => {
            const config = this.notificationTypes[type];
            return `
                <div class="notification-type">
                    <div class="notification-type-info">
                        <span class="notification-icon">${config.icon}</span>
                        <div class="notification-details">
                            <h4>${config.title}</h4>
                            <p>${config.description}</p>
                        </div>
                    </div>
                    <label class="notification-toggle">
                        <input type="checkbox" data-type="${type}" ${config.enabled ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            `;
        }).join('');

        return `
            <div class="notification-panel-content">
                <div class="notification-header">
                    <h3>🔔 Notification Settings</h3>
                    <button class="close-panel" onclick="pushNotificationManager.hideNotificationPanel()">×</button>
                </div>
                
                <div class="notification-permission">
                    <div class="permission-status ${this.permission}">
                        <span class="permission-icon">${this.getPermissionIcon()}</span>
                        <div class="permission-info">
                            <h4>Browser Notifications</h4>
                            <p>${this.getPermissionMessage()}</p>
                        </div>
                        ${this.permission === 'default' ? '<button class="btn btn-primary" onclick="pushNotificationManager.requestPermission()">Enable Notifications</button>' : ''}
                    </div>
                </div>

                <div class="notification-types">
                    <h4>Notification Types</h4>
                    ${typesHTML}
                </div>

                <div class="notification-actions">
                    <button class="btn btn-primary" onclick="pushNotificationManager.savePreferences()">Save Settings</button>
                    <button class="btn btn-secondary" onclick="pushNotificationManager.testNotification()">Test Notification</button>
                </div>
            </div>
        `;
    }

    setupNotificationEventListeners() {
        // Toggle switches
        document.querySelectorAll('.notification-toggle input').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const type = e.target.dataset.type;
                this.notificationTypes[type].enabled = e.target.checked;
            });
        });
    }

    addNotificationStyles() {
        const styles = `
            <style>
                .notification-panel {
                    position: fixed;
                    top: 0;
                    right: 0;
                    width: 400px;
                    height: 100vh;
                    background: white;
                    box-shadow: -4px 0 20px rgba(0,0,0,0.15);
                    z-index: 10000;
                    transform: translateX(100%);
                    transition: transform 0.3s ease;
                    overflow-y: auto;
                }
                
                .notification-panel.show {
                    transform: translateX(0);
                }
                
                .notification-panel-content {
                    padding: 20px;
                }
                
                .notification-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid #e0e0e0;
                }
                
                .notification-header h3 {
                    margin: 0;
                    color: #333;
                }
                
                .close-panel {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                }
                
                .notification-permission {
                    margin-bottom: 25px;
                    padding: 15px;
                    border-radius: 8px;
                    border: 1px solid #e0e0e0;
                }
                
                .permission-status {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                
                .permission-status.granted {
                    border-color: #28a745;
                    background: #f8fff9;
                }
                
                .permission-status.denied {
                    border-color: #dc3545;
                    background: #fff8f8;
                }
                
                .permission-icon {
                    font-size: 24px;
                }
                
                .permission-info h4 {
                    margin: 0 0 5px 0;
                    color: #333;
                }
                
                .permission-info p {
                    margin: 0;
                    color: #666;
                    font-size: 14px;
                }
                
                .notification-types h4 {
                    margin-bottom: 15px;
                    color: #333;
                }
                
                .notification-type {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    margin-bottom: 10px;
                }
                
                .notification-type-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex: 1;
                }
                
                .notification-icon {
                    font-size: 20px;
                }
                
                .notification-details h4 {
                    margin: 0 0 4px 0;
                    font-size: 14px;
                    color: #333;
                }
                
                .notification-details p {
                    margin: 0;
                    font-size: 12px;
                    color: #666;
                }
                
                .notification-toggle {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 24px;
                }
                
                .notification-toggle input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #ccc;
                    transition: 0.3s;
                    border-radius: 24px;
                }
                
                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: 0.3s;
                    border-radius: 50%;
                }
                
                input:checked + .toggle-slider {
                    background-color: #007bff;
                }
                
                input:checked + .toggle-slider:before {
                    transform: translateX(26px);
                }
                
                .notification-actions {
                    margin-top: 25px;
                    display: flex;
                    gap: 10px;
                }
                
                .notification-actions .btn {
                    flex: 1;
                    padding: 10px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: 500;
                }
                
                .btn-primary {
                    background: #007bff;
                    color: white;
                }
                
                .btn-secondary {
                    background: #6c757d;
                    color: white;
                }
                
                @media (max-width: 768px) {
                    .notification-panel {
                        width: 100%;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    getPermissionIcon() {
        switch (this.permission) {
            case 'granted': return '✅';
            case 'denied': return '❌';
            default: return '❓';
        }
    }

    getPermissionMessage() {
        switch (this.permission) {
            case 'granted': return 'Notifications are enabled for this site.';
            case 'denied': return 'Notifications are blocked. Please enable them in your browser settings.';
            default: return 'Click to enable browser notifications.';
        }
    }

    async requestPermission() {
        try {
            this.permission = await Notification.requestPermission();
            
            if (this.permission === 'granted') {
                console.log('Push Notifications: Permission granted');
                await this.subscribeToPush();
                this.updatePermissionUI();
                this.showNotification('Notifications enabled!', 'success');
            } else {
                console.log('Push Notifications: Permission denied');
                this.updatePermissionUI();
            }
        } catch (error) {
            console.error('Push Notifications: Error requesting permission:', error);
        }
    }

    async subscribeToPush() {
        try {
            const registration = await navigator.serviceWorker.ready;
            
            this.subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
            });

            console.log('Push Notifications: Subscribed successfully');
            
            // Send subscription to server
            await this.sendSubscriptionToServer();
            
        } catch (error) {
            console.error('Push Notifications: Subscription failed:', error);
        }
    }

    async sendSubscriptionToServer() {
        try {
            const baseUrl = this.getBaseUrl();
            const response = await fetch(`${baseUrl}/api/push/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subscription: this.subscription,
                    userId: localStorage.getItem('userId'),
                    preferences: this.notificationTypes
                })
            });

            if (response.ok) {
                console.log('Push Notifications: Subscription sent to server');
            } else {
                console.error('Push Notifications: Failed to send subscription to server');
            }
        } catch (error) {
            console.error('Push Notifications: Error sending subscription:', error);
        }
    }

    showNotificationPanel() {
        const panel = document.getElementById('notification-settings-panel');
        if (panel) {
            panel.classList.add('show');
        }
    }

    hideNotificationPanel() {
        const panel = document.getElementById('notification-settings-panel');
        if (panel) {
            panel.classList.remove('show');
        }
    }

    savePreferences() {
        this.saveUserPreferences();
        this.showNotification('Notification preferences saved!', 'success');
        this.hideNotificationPanel();
    }

    async testNotification() {
        if (this.permission === 'granted') {
            new Notification('🎉 Test Notification', {
                body: 'This is a test notification from Tridex!',
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-192x192.png'
            });
        } else {
            this.showNotification('Please enable notifications first', 'warning');
        }
    }

    updatePermissionUI() {
        const panel = document.getElementById('notification-settings-panel');
        if (panel) {
            panel.innerHTML = this.generateNotificationPanelHTML();
            this.setupNotificationEventListeners();
        }
    }

    showNotification(message, type = 'info') {
        // Create custom notification
        const notification = document.createElement('div');
        notification.className = `custom-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }

    // Utility functions
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pushNotificationManager = new PushNotificationManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PushNotificationManager;
}
