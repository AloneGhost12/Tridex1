/**
 * Enhanced Tridex Chatbot
 * This module provides an advanced chatbot implementation with product recommendations,
 * typing indicators, quick-reply buttons, and more.
 */

class TridexChatbot {
    constructor() {
        // DOM Elements
        this.chatbotToggle = document.getElementById('chatbot-toggle');
        this.chatbotBox = document.getElementById('chatbot-box');
        this.chatbotForm = document.getElementById('chatbot-form');
        this.chatbotInput = document.getElementById('chatbot-input');
        this.chatbotMessages = document.getElementById('chatbot-messages');
        this.chatbotTyping = document.getElementById('chatbot-typing');
        this.chatbotClose = document.getElementById('chatbot-close');
        this.chatbotStatus = document.getElementById('chatbot-status');

        // State
        this.initialized = false;
        this.products = [];
        this.categories = [];
        this.userHistory = [];
        this.supportMode = false;
        this.username = localStorage.getItem('username') || localStorage.getItem('currentUser');
        this.isVerified = localStorage.getItem('verified') === 'true';
        this.isLoggedIn = localStorage.getItem('isLoggedIn') === 'true' || !!localStorage.getItem('token');

        // Initialize
        this.init();
    }

    /**
     * Get the correct base URL for API calls
     */
    getBaseUrl() {
        // Check if we're running locally
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        } else {
            return 'https://tridex1.onrender.com';
        }
    }

    /**
     * Initialize the chatbot
     */
    init() {
        if (!this.chatbotToggle || !this.chatbotBox || !this.chatbotForm || !this.chatbotInput || !this.chatbotMessages) {
            console.error('Chatbot: Required DOM elements not found');
            return;
        }

        // Fetch products for recommendations
        this.fetchProducts();
        this.fetchCategories();

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for chatbot interactions
     */
    setupEventListeners() {
        // Toggle chatbot visibility
        this.chatbotToggle.onclick = () => {
            const isVisible = this.chatbotBox.style.display === 'block';
            this.chatbotBox.style.display = isVisible ? 'none' : 'block';

            if (!isVisible && !this.initialized) {
                this.showWelcomeMessage();
            }
        };

        // Close button functionality
        if (this.chatbotClose) {
            this.chatbotClose.onclick = () => {
                this.chatbotBox.style.display = 'none';
            };
        }

        // Handle form submission
        this.chatbotForm.onsubmit = (e) => {
            e.preventDefault();
            const userMsg = this.chatbotInput.value.trim();

            if (userMsg === '') return;

            // Add user message
            this.addUserMessage(userMsg);

            // Process the message
            this.processUserMessage(userMsg);

            // Clear input
            this.chatbotInput.value = '';
        };
    }

    /**
     * Show welcome message when chatbot is first opened
     */
    showWelcomeMessage() {
        setTimeout(() => {
            this.showTypingIndicator();
            setTimeout(() => {
                this.hideTypingIndicator();

                // Personalized greeting if user is logged in
                if (this.username) {
                    this.addBotMessage(`👋 Hi ${this.username}! I'm the Tridex AI assistant. How can I help you today?`);
                } else {
                    this.addBotMessage("👋 Hi there! I'm the Tridex AI assistant. How can I help you today?");
                }

                // Add suggestion chips
                this.addSuggestionChips([
                    "Products",
                    "How to buy",
                    "Account help",
                    "Contact us"
                ]);

                this.initialized = true;
            }, 1500);
        }, 500);
    }

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        if (this.chatbotTyping) {
            this.chatbotTyping.style.display = 'block';
            this.chatbotMessages.scrollTop = this.chatbotMessages.scrollHeight;
            this.chatbotStatus.textContent = 'Typing...';
        }
    }

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        if (this.chatbotTyping) {
            this.chatbotTyping.style.display = 'none';
            this.chatbotStatus.textContent = this.supportMode ? 'Support Agent' : 'Online';
        }
    }

    /**
     * Add user message to chat
     * @param {string} text - Message text
     */
    addUserMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'user-message';
        msgDiv.textContent = text;
        this.chatbotMessages.appendChild(msgDiv);
        this.chatbotMessages.scrollTop = this.chatbotMessages.scrollHeight;

        // Add to user history for context awareness
        this.userHistory.push({ role: 'user', content: text, timestamp: new Date() });
    }

    /**
     * Add bot message to chat
     * @param {string} text - Message text (can include HTML)
     */
    addBotMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'bot-message';
        msgDiv.innerHTML = text;

        // Add feedback buttons if we have a lastInteractionId
        if (this.lastInteractionId) {
            const feedbackDiv = document.createElement('div');
            feedbackDiv.className = 'chatbot-feedback';
            feedbackDiv.innerHTML = `
                <span>Was this helpful?</span>
                <button class="chatbot-feedback-btn" data-value="true">👍</button>
                <button class="chatbot-feedback-btn" data-value="false">👎</button>
            `;

            // Add event listeners to feedback buttons
            feedbackDiv.querySelectorAll('.chatbot-feedback-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const helpful = e.target.getAttribute('data-value') === 'true';

                    // Send feedback to server
                    try {
                        const baseUrl = this.getBaseUrl();
                        const response = await fetch(`${baseUrl}/chatbot/feedback/${this.lastInteractionId}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                helpful,
                                feedbackText: null // No text feedback for now
                            })
                        });

                        if (response.ok) {
                            // Replace feedback buttons with thank you message
                            feedbackDiv.innerHTML = '<span style="color:#28a745;">Thanks for your feedback!</span>';
                        }
                    } catch (error) {
                        console.error('Error sending feedback:', error);
                        feedbackDiv.innerHTML = '<span style="color:#dc3545;">Failed to send feedback</span>';
                    }
                });
            });

            msgDiv.appendChild(feedbackDiv);
        }

        this.chatbotMessages.appendChild(msgDiv);
        this.chatbotMessages.scrollTop = this.chatbotMessages.scrollHeight;

        // Add to user history for context awareness
        this.userHistory.push({ role: 'bot', content: text, timestamp: new Date() });
    }

    /**
     * Add suggestion chips to chat
     * @param {string[]} suggestions - Array of suggestion texts
     */
    addSuggestionChips(suggestions) {
        const chipsDiv = document.createElement('div');
        chipsDiv.className = 'suggestion-chips';

        suggestions.forEach(suggestion => {
            const chip = document.createElement('button');
            chip.className = 'suggestion-chip';
            chip.textContent = suggestion;
            chip.onclick = () => {
                const userMsg = chip.textContent;
                this.addUserMessage(userMsg);
                this.processUserMessage(userMsg);

                // Remove the chips after selection
                chipsDiv.remove();
            };
            chipsDiv.appendChild(chip);
        });

        this.chatbotMessages.appendChild(chipsDiv);
        this.chatbotMessages.scrollTop = this.chatbotMessages.scrollHeight;
    }

    /**
     * Process user message and generate response
     * @param {string} userMsg - User message
     */
    processUserMessage(userMsg) {
        // Show typing indicator
        this.showTypingIndicator();

        // Generate a unique session ID if not already set
        if (!this.sessionId) {
            this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        }

        // Simulate thinking time based on message length
        const thinkTime = Math.min(Math.max(userMsg.length * 50, 500), 2000);

        setTimeout(async () => {
            // Hide typing indicator
            this.hideTypingIndicator();

            // Check if in support mode
            if (this.supportMode) {
                this.handleSupportMode(userMsg);
                return;
            }

            try {
                // Get AI response (now async)
                const reply = await this.aiResponse(userMsg);

                // Add bot message
                this.addBotMessage(reply);

                // Add follow-up suggestions based on the query
                this.addFollowUpSuggestions(userMsg);
            } catch (error) {
                console.error('Error getting AI response:', error);
                // Fallback to a simple response if the AI response fails
                this.addBotMessage("I'm having trouble processing your request right now. Please try again later.");
            }

            // Store the interaction in the database
            try {
                const baseUrl = this.getBaseUrl();
                const response = await fetch(`${baseUrl}/chatbot/interaction`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: this.username || 'anonymous',
                        message: userMsg,
                        response: reply,
                        sessionId: this.sessionId,
                        messageType: this.getMessageType(userMsg),
                        escalatedToSupport: this.supportMode
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    this.lastInteractionId = data.interactionId;
                    console.log('Chat interaction saved with ID:', this.lastInteractionId);
                }
            } catch (error) {
                console.error('Failed to store chat interaction:', error);
                // Continue even if storage fails - this is non-critical
            }
        }, thinkTime);
    }

    /**
     * Determine the message type based on content
     * @param {string} message - User message
     * @returns {string} - Message type
     */
    getMessageType(message) {
        const q = message.trim().toLowerCase();

        if (q.includes('product') || q.includes('buy') || q.includes('price') || q.includes('item')) {
            return 'product_recommendation';
        }

        if (q.includes('account') || q.includes('login') || q.includes('profile') || q.includes('password')) {
            return 'account_query';
        }

        if (this.shouldEscalateToSupport(q)) {
            return 'support_request';
        }

        return 'text';
    }

    /**
     * Add follow-up suggestions based on user query
     * @param {string} userMsg - User message
     */
    addFollowUpSuggestions(userMsg) {
        const q = userMsg.trim().toLowerCase();

        if (q.includes('product') || q.includes('price')) {
            this.addSuggestionChips(["How to buy", "Payment methods", "Shipping info"]);
        } else if (q.includes('account') || q.includes('login')) {
            this.addSuggestionChips(["Reset password", "Create account", "Profile help"]);
        } else if (q.includes('shipping') || q.includes('delivery')) {
            this.addSuggestionChips(["Track order", "Return policy", "Contact support"]);
        } else if (q.includes('verify') || q.includes('verification')) {
            this.addSuggestionChips(["Verification status", "Benefits", "Contact admin"]);
        }
    }

    /**
     * Handle support mode interactions
     * @param {string} userMsg - User message
     */
    handleSupportMode(userMsg) {
        const q = userMsg.trim().toLowerCase();

        // Check if user wants to end support mode
        if (q.includes('end') || q.includes('exit') || q.includes('close') || q.includes('bye')) {
            this.endSupportMode();
            return;
        }

        // Store the support request in the database
        try {
            const baseUrl = this.getBaseUrl();
            fetch(`${baseUrl}/chatbot/interaction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: this.username || 'anonymous',
                    message: userMsg,
                    response: "Support request escalated",
                    sessionId: this.sessionId,
                    messageType: 'support_request',
                    escalatedToSupport: true
                })
            });
        } catch (error) {
            console.error('Failed to store support request:', error);
            // Continue even if storage fails - this is non-critical
        }

        // Simulate support agent response
        this.addBotMessage(`
            <div class="support-agent-message">
                <div class="support-agent-header">
                    <span class="support-agent-name">Support Agent</span>
                </div>
                <p>Thank you for contacting our support team. Your message has been received and a support agent will get back to you soon.</p>
                <p>For immediate assistance, you can also contact us at:</p>
                <ul>
                    <li>Email: tridex1332@gmail.com</li>
                    <li>Phone: 8589838547</li>
                </ul>
                <p>Our support hours are Monday-Friday, 9am-5pm IST.</p>
            </div>
        `);

        // Add option to end support mode
        this.addSuggestionChips(["End support chat", "Continue waiting"]);
    }

    /**
     * End support mode
     */
    endSupportMode() {
        this.supportMode = false;
        this.chatbotStatus.textContent = 'Online';
        this.addBotMessage("Support session ended. I'm back to help you with any other questions!");

        // Add suggestion chips for next steps
        this.addSuggestionChips([
            "Products",
            "How to buy",
            "Account help",
            "Contact us"
        ]);
    }

    /**
     * Fetch products for recommendations
     */
    async fetchProducts() {
        try {
            const baseUrl = this.getBaseUrl();
            const res = await fetch(`${baseUrl}/products`);
            if (res.ok) {
                this.products = await res.json();
                console.log('Chatbot: Loaded', this.products.length, 'products for recommendations');
            }
        } catch (error) {
            console.error('Chatbot: Error fetching products', error);
            // Try to load from localStorage as fallback
            this.products = JSON.parse(localStorage.getItem('products') || '[]');
        }
    }

    /**
     * Fetch categories for recommendations
     */
    async fetchCategories() {
        try {
            const baseUrl = this.getBaseUrl();
            const res = await fetch(`${baseUrl}/categories`);
            if (res.ok) {
                this.categories = await res.json();
                console.log('Chatbot: Loaded', this.categories.length, 'categories');
            }
        } catch (error) {
            console.error('Chatbot: Error fetching categories', error);
        }
    }
}

// Initialize the chatbot when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.tridexChatbot = new TridexChatbot();
});
