/**
 * Enhanced Tridex Chatbot AI Response System
 * This module provides the AI response logic for the Tridex chatbot.
 */

// Extend the TridexChatbot class with AI response capabilities
TridexChatbot.prototype.aiResponse = async function(question) {
    const q = question.trim().toLowerCase();

    // Check for product recommendations
    try {
        const productRecommendation = await this.getProductRecommendation(q);
        if (productRecommendation) {
            return productRecommendation;
        }
    } catch (error) {
        console.error('Error getting product recommendations:', error);
        // Continue with other response types if product recommendations fail
    }

    // Check for account-related queries
    const accountResponse = this.handleAccountQuery(q);
    if (accountResponse) {
        return accountResponse;
    }

    // Check for verification status queries
    const verificationResponse = this.handleVerificationQuery(q);
    if (verificationResponse) {
        return verificationResponse;
    }

    // Check for escalation to human support
    if (this.shouldEscalateToSupport(q)) {
        return this.escalateToSupport();
    }

    // Standard response patterns
    return this.getStandardResponse(q);
};

/**
 * Get product recommendations based on user query
 * @param {string} query - User query
 * @returns {string|null} - Product recommendation HTML or null if no match
 */
TridexChatbot.prototype.getProductRecommendation = async function(query) {
    // Extract potential product keywords
    const keywords = query.split(/\s+/).filter(word => word.length > 3);

    // Skip if no meaningful keywords
    if (keywords.length === 0) {
        return null;
    }

    // Check if query is explicitly asking for product recommendations
    const isAskingForRecommendation =
        query.includes('recommend') ||
        query.includes('suggestion') ||
        query.includes('what product') ||
        query.includes('which product') ||
        query.includes('show me') ||
        query.includes('looking for');

    if (!isAskingForRecommendation && !query.includes('product')) {
        return null;
    }

    try {
        // Try to get recommendations from the server API
        const response = await fetch(`https://tridex1.onrender.com/chatbot/recommendations?query=${encodeURIComponent(query)}&limit=3`);

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const recommendations = await response.json();

        // If no recommendations, return null
        if (!recommendations || recommendations.length === 0) {
            return null;
        }

        // Store the recommended products for tracking
        this.lastRecommendedProducts = recommendations.map(p => p._id);

        // Format and return recommendations
        return this.formatProductRecommendations(
            recommendations,
            'Based on your query, you might be interested in these products:'
        );
    } catch (error) {
        console.error('Error getting product recommendations:', error);

        // Fallback to local recommendations if server fails
        return this.getLocalProductRecommendations(query);
    }
};

/**
 * Fallback to local product recommendations when server API fails
 * @param {string} query - User query
 * @returns {string|null} - Product recommendation HTML or null if no match
 */
TridexChatbot.prototype.getLocalProductRecommendations = function(query) {
    // Skip if no products loaded
    if (!this.products || this.products.length === 0) {
        return null;
    }

    const keywords = query.split(/\s+/).filter(word => word.length > 3);

    // Find matching products
    const matchingProducts = this.products.filter(product => {
        const productName = product.name.toLowerCase();
        const productDesc = product.desc ? product.desc.toLowerCase() : '';

        return keywords.some(keyword =>
            productName.includes(keyword) || productDesc.includes(keyword)
        );
    });

    // If no matches, try category-based recommendations
    if (matchingProducts.length === 0) {
        // Check for category mentions
        const categoryMatches = this.categories.filter(category =>
            query.includes(category.name.toLowerCase())
        );

        if (categoryMatches.length > 0) {
            const categoryId = categoryMatches[0]._id;
            const categoryProducts = this.products.filter(p => p.category === categoryId);

            if (categoryProducts.length > 0) {
                // Recommend top 3 products from this category
                const recommendations = categoryProducts.slice(0, 3);

                // Store the recommended products for tracking
                this.lastRecommendedProducts = recommendations.map(p => p._id);

                return this.formatProductRecommendations(
                    recommendations,
                    `Here are some products from our ${categoryMatches[0].name} category:`
                );
            }
        }

        return null;
    }

    // Return top 3 matching products
    const recommendations = matchingProducts.slice(0, 3);

    // Store the recommended products for tracking
    this.lastRecommendedProducts = recommendations.map(p => p._id);

    return this.formatProductRecommendations(
        recommendations,
        'Based on your query, you might be interested in these products:'
    );
};

/**
 * Format product recommendations as HTML
 * @param {Array} products - Array of product objects
 * @param {string} introText - Introduction text
 * @returns {string} - Formatted HTML
 */
TridexChatbot.prototype.formatProductRecommendations = function(products, introText) {
    if (!products || products.length === 0) {
        return null;
    }

    let html = `${introText}<br><br>`;

    products.forEach(product => {
        html += `
            <div class="chatbot-product-card">
                <img src="${product.image}" alt="${product.name}" class="chatbot-product-image">
                <div class="chatbot-product-info">
                    <div class="chatbot-product-name">${product.name}</div>
                    <div class="chatbot-product-price">₹${product.price}</div>
                    <a href="product-details.html?id=${product._id}" class="chatbot-product-link" target="_blank">View Details</a>
                </div>
            </div>
        `;
    });

    html += `
        <div class="chatbot-action-buttons">
            <button onclick="window.location.href='index.html#products'" class="chatbot-action-button">Browse All Products</button>
        </div>
    `;

    return html;
};

/**
 * Handle account-related queries
 * @param {string} query - User query
 * @returns {string|null} - Response or null if not an account query
 */
TridexChatbot.prototype.handleAccountQuery = function(query) {
    // Check if query is related to account
    const isAccountQuery =
        query.includes('account') ||
        query.includes('profile') ||
        query.includes('login') ||
        query.includes('sign in') ||
        query.includes('register') ||
        query.includes('sign up') ||
        query.includes('password') ||
        query.includes('username') ||
        query.includes('order status') ||
        query.includes('my order');

    if (!isAccountQuery) {
        return null;
    }

    // Check if user is logged in
    if (this.isLoggedIn) {
        if (query.includes('order status') || query.includes('my order')) {
            return `
                You can check your order status on your profile page.<br><br>
                <a href="profile.html" class="chatbot-link">Go to Profile</a>
            `;
        }

        if (query.includes('password')) {
            return `
                You can change your password on your profile page.<br><br>
                <a href="profile.html" class="chatbot-link">Go to Profile</a>
            `;
        }

        return `
            You're currently logged in as ${this.username}.<br>
            You can manage your account settings on your profile page.<br><br>
            <a href="profile.html" class="chatbot-link">Go to Profile</a>
        `;
    } else {
        if (query.includes('register') || query.includes('sign up')) {
            return `
                You can create a new account on our signup page.<br><br>
                <a href="signup.html" class="chatbot-link">Create Account</a>
            `;
        }

        return `
            You're not currently logged in. Please log in to access your account.<br><br>
            <a href="login.html" class="chatbot-link">Log In</a> or
            <a href="signup.html" class="chatbot-link">Create Account</a>
        `;
    }
};

/**
 * Handle verification status queries
 * @param {string} query - User query
 * @returns {string|null} - Response or null if not a verification query
 */
TridexChatbot.prototype.handleVerificationQuery = function(query) {
    // Check if query is related to verification
    const isVerificationQuery =
        query.includes('verify') ||
        query.includes('verification') ||
        query.includes('verified') ||
        query.includes('blue tick') ||
        query.includes('check mark');

    if (!isVerificationQuery) {
        return null;
    }

    // Check if user is logged in
    if (!this.isLoggedIn) {
        return `
            You need to be logged in to check your verification status.<br><br>
            <a href="login.html" class="chatbot-link">Log In</a>
        `;
    }

    // Check verification status
    if (this.isVerified) {
        return `
            Congratulations! Your account is verified. You can see the verification badge on your profile.<br><br>
            <a href="profile.html" class="chatbot-link">View Profile</a>
        `;
    } else {
        return `
            Your account is not currently verified. Verification is done by our administrators based on account activity and other factors.<br><br>
            <a href="profile.html" class="chatbot-link">View Profile</a>
        `;
    }
};

/**
 * Determine if query should be escalated to human support
 * @param {string} query - User query
 * @returns {boolean} - True if should escalate
 */
TridexChatbot.prototype.shouldEscalateToSupport = function(query) {
    // Check for explicit requests for human support
    const explicitSupportRequest =
        query.includes('human') ||
        query.includes('agent') ||
        query.includes('person') ||
        query.includes('support') ||
        query.includes('help desk') ||
        query.includes('customer service') ||
        query.includes('speak to someone') ||
        query.includes('talk to someone');

    // Check for frustrated language
    const frustratedLanguage =
        query.includes('not helping') ||
        query.includes('useless') ||
        query.includes('stupid bot') ||
        query.includes('doesn\'t work') ||
        query.includes('not working');

    // Check for complex issues
    const complexIssue =
        query.length > 100 || // Long detailed question
        (query.includes('problem') && query.includes('with')) ||
        query.includes('technical issue') ||
        query.includes('not receiving') ||
        query.includes('didn\'t receive');

    return explicitSupportRequest || frustratedLanguage || complexIssue;
};

/**
 * Escalate to human support
 * @returns {string} - Support escalation message
 */
TridexChatbot.prototype.escalateToSupport = function() {
    this.supportMode = true;
    this.chatbotStatus.textContent = 'Support Agent';

    return `
        I'll connect you with our support team for further assistance.<br><br>
        Please provide a brief description of your issue, and a support agent will get back to you soon.<br><br>
        <div class="chatbot-action-buttons">
            <button onclick="window.tridexChatbot.endSupportMode()" class="chatbot-action-button">Cancel</button>
        </div>
    `;
};

/**
 * End support mode
 */
TridexChatbot.prototype.endSupportMode = function() {
    this.supportMode = false;
    this.chatbotStatus.textContent = 'Online';
    this.addBotMessage("Support request cancelled. How else can I help you today?");
};

/**
 * Get standard response based on query patterns
 * @param {string} query - User query
 * @returns {string} - Response message
 */
TridexChatbot.prototype.getStandardResponse = function(query) {
    // Greeting patterns
    if (query.match(/^(hi|hello|hey|greetings|howdy)/i)) {
        return `Hello${this.username ? ' ' + this.username : ''}! How can I help you today?`;
    }

    // Help command
    if (query === 'help' || query === 'commands' || query === 'options') {
        return `
            Here are some things you can ask me about:<br>
            - Products and pricing<br>
            - How to place an order<br>
            - Account management<br>
            - Payment methods<br>
            - Shipping and delivery<br>
            - Returns and refunds<br>
            - Verification status<br>
            - Contact information
        `;
    }

    // Payment related queries
    if (query.includes('payment') || query.includes('pay') || query.includes('checkout')) {
        return `
            We accept the following payment methods:<br>
            - Credit/Debit Cards<br>
            - Net Banking<br>
            - UPI<br>
            - Cash on Delivery (COD)<br><br>
            You can select your preferred payment method during checkout.
        `;
    }

    // Shipping related queries
    if (query.includes('shipping') || query.includes('delivery') || query.includes('ship')) {
        return `
            Shipping information:<br>
            - Free shipping on orders above ₹500<br>
            - Standard delivery: 3-5 business days<br>
            - Express delivery: 1-2 business days (additional charges apply)<br><br>
            You can track your order from your profile page after purchase.
        `;
    }

    // Return related queries
    if (query.includes('return') || query.includes('refund') || query.includes('exchange')) {
        return `
            Our return policy:<br>
            - 30-day return window for most products<br>
            - Item must be in original condition<br>
            - Refunds are processed within 7-10 business days<br><br>
            To initiate a return, please contact customer service.
        `;
    }

    // Contact related queries
    if (query.includes('contact') || query.includes('email') || query.includes('phone') || query.includes('address')) {
        return `
            Contact information:<br>
            - Email: tridex1332@gmail.com<br>
            - Phone: 8589838547<br>
            - Hours: Monday-Friday, 9am-5pm IST<br><br>
            You can also use our <a href="#" onclick="window.tridexChatbot.escalateToSupport(); return false;">contact form</a> for inquiries.
        `;
    }

    // About company queries
    if (query.includes('about') || query.includes('company') || query.includes('who are you')) {
        return `
            Tridex is an e-commerce platform offering a wide range of products.<br><br>
            Our mission is to provide high-quality products at competitive prices with excellent customer service.<br><br>
            CEO: Adharsh
        `;
    }

    // Fallback response with suggestions
    return `
        I'm not sure I understand. Could you try rephrasing or check these topics?<br><br>
        <div class="suggestion-chips">
            <button class="suggestion-chip" onclick="document.getElementById('chatbot-input').value='How to buy'; document.getElementById('chatbot-form').dispatchEvent(new Event('submit'));">How to buy</button>
            <button class="suggestion-chip" onclick="document.getElementById('chatbot-input').value='Contact info'; document.getElementById('chatbot-form').dispatchEvent(new Event('submit'));">Contact info</button>
            <button class="suggestion-chip" onclick="document.getElementById('chatbot-input').value='Help'; document.getElementById('chatbot-form').dispatchEvent(new Event('submit'));">Help</button>
        </div>
    `;
};
