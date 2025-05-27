/* ========== TRIDEX CUSTOM POPUP SYSTEM ========== */

class TridexPopup {
    constructor() {
        this.currentModal = null;
        this.init();
    }

    init() {
        // Wait for DOM to be ready before creating container
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createContainer());
        } else {
            this.createContainer();
        }
    }

    createContainer() {
        // Create modal container if it doesn't exist
        if (!document.getElementById('tridex-modal-container')) {
            const container = document.createElement('div');
            container.id = 'tridex-modal-container';
            document.body.appendChild(container);
        }
    }

    // Create ripple effect for buttons
    createRipple(event, element) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('tridex-btn-ripple');

        element.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    // Show modal with animation
    showModal(modalElement) {
        // Ensure container exists
        this.createContainer();

        const container = document.getElementById('tridex-modal-container');
        if (!container) {
            console.error('Failed to create modal container');
            return;
        }

        container.appendChild(modalElement);

        // Force reflow
        modalElement.offsetHeight;

        // Add show class for animation
        modalElement.classList.add('show');

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        this.currentModal = modalElement;
    }

    // Hide modal with animation
    hideModal(modalElement = null) {
        const modal = modalElement || this.currentModal;
        if (!modal) return;

        modal.classList.remove('show');

        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
            // Restore body scroll
            document.body.style.overflow = '';
            if (this.currentModal === modal) {
                this.currentModal = null;
            }
        }, 300);
    }

    // Create modal HTML structure
    createModalHTML(type, title, message, buttons, options = {}) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            confirm: '❓'
        };

        const modalHTML = `
            <div class="tridex-modal-overlay">
                <div class="tridex-modal tridex-modal-${type}">
                    ${options.showClose !== false ? '<button class="tridex-modal-close" data-action="close">×</button>' : ''}
                    <div class="tridex-modal-header">
                        <span class="tridex-modal-icon">${icons[type] || icons.info}</span>
                        <h3 class="tridex-modal-title">${title}</h3>
                        ${options.subtitle ? `<p class="tridex-modal-subtitle">${options.subtitle}</p>` : ''}
                    </div>
                    <div class="tridex-modal-body">
                        <p class="tridex-modal-message">${message}</p>
                    </div>
                    <div class="tridex-modal-footer">
                        ${buttons}
                    </div>
                </div>
            </div>
        `;

        const modalElement = document.createElement('div');
        modalElement.innerHTML = modalHTML;
        return modalElement.firstElementChild;
    }

    // Alert replacement
    alert(message, title = 'Alert', type = 'info', options = {}) {
        return new Promise((resolve) => {
            const buttons = `<button class="tridex-btn tridex-btn-primary" data-action="ok">OK</button>`;
            const modal = this.createModalHTML(type, title, message, buttons, options);

            // Add event listeners
            modal.addEventListener('click', (e) => {
                if (e.target.dataset.action === 'ok' || e.target.dataset.action === 'close') {
                    this.createRipple(e, e.target);
                    setTimeout(() => {
                        this.hideModal(modal);
                        resolve(true);
                    }, 150);
                }
            });

            // Close on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal);
                    resolve(true);
                }
            });

            this.showModal(modal);
        });
    }

    // Confirm replacement
    confirm(message, title = 'Confirm', options = {}) {
        return new Promise((resolve) => {
            const buttons = `
                <button class="tridex-btn tridex-btn-secondary" data-action="cancel">Cancel</button>
                <button class="tridex-btn tridex-btn-danger" data-action="confirm">Confirm</button>
            `;
            const modal = this.createModalHTML('confirm', title, message, buttons, options);

            // Add event listeners
            modal.addEventListener('click', (e) => {
                if (e.target.dataset.action) {
                    this.createRipple(e, e.target);
                    setTimeout(() => {
                        this.hideModal(modal);
                        resolve(e.target.dataset.action === 'confirm');
                    }, 150);
                }
            });

            // Close on overlay click (returns false)
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal);
                    resolve(false);
                }
            });

            this.showModal(modal);
        });
    }

    // Success message
    success(message, title = 'Success', options = {}) {
        return this.alert(message, title, 'success', options);
    }

    // Error message
    error(message, title = 'Error', options = {}) {
        return this.alert(message, title, 'error', options);
    }

    // Warning message
    warning(message, title = 'Warning', options = {}) {
        return this.alert(message, title, 'warning', options);
    }

    // Info message
    info(message, title = 'Information', options = {}) {
        return this.alert(message, title, 'info', options);
    }

    // Custom popup with custom buttons
    custom(message, title, buttons, type = 'info', options = {}) {
        return new Promise((resolve) => {
            const buttonHTML = buttons.map(btn =>
                `<button class="tridex-btn tridex-btn-${btn.type || 'primary'}" data-action="${btn.action}">${btn.text}</button>`
            ).join('');

            const modal = this.createModalHTML(type, title, message, buttonHTML, options);

            // Add event listeners
            modal.addEventListener('click', (e) => {
                if (e.target.dataset.action) {
                    this.createRipple(e, e.target);
                    setTimeout(() => {
                        this.hideModal(modal);
                        resolve(e.target.dataset.action);
                    }, 150);
                }
            });

            // Close on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal);
                    resolve(null);
                }
            });

            this.showModal(modal);
        });
    }

    // Auto-hide popup (for temporary messages)
    autoHide(message, title, type = 'success', duration = 3000, options = {}) {
        return new Promise((resolve) => {
            const buttons = `<button class="tridex-btn tridex-btn-primary" data-action="ok">OK</button>`;
            const modal = this.createModalHTML(type, title, message, buttons, options);

            // Add event listeners
            modal.addEventListener('click', (e) => {
                if (e.target.dataset.action === 'ok' || e.target.dataset.action === 'close') {
                    this.createRipple(e, e.target);
                    setTimeout(() => {
                        this.hideModal(modal);
                        resolve(true);
                    }, 150);
                }
            });

            // Auto-hide after duration
            setTimeout(() => {
                if (this.currentModal === modal) {
                    this.hideModal(modal);
                    resolve(true);
                }
            }, duration);

            this.showModal(modal);
        });
    }
}

// Create global instance
window.TridexPopup = new TridexPopup();

// Convenience methods for global access
window.tridexAlert = (message, title, type, options) => window.TridexPopup.alert(message, title, type, options);
window.tridexConfirm = (message, title, options) => window.TridexPopup.confirm(message, title, options);
window.tridexSuccess = (message, title, options) => window.TridexPopup.success(message, title, options);
window.tridexError = (message, title, options) => window.TridexPopup.error(message, title, options);
window.tridexWarning = (message, title, options) => window.TridexPopup.warning(message, title, options);
window.tridexInfo = (message, title, options) => window.TridexPopup.info(message, title, options);

// Override native alert and confirm (optional)
if (typeof window.originalAlert === 'undefined') {
    window.originalAlert = window.alert;
    window.originalConfirm = window.confirm;

    // Uncomment these lines to completely replace native dialogs
    // window.alert = (message) => window.TridexPopup.alert(message);
    // window.confirm = (message) => window.TridexPopup.confirm(message);
}
