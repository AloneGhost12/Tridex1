const mongoose = require('mongoose');

/**
 * Schema for storing chat interactions between users and the chatbot
 * This allows for:
 * 1. Tracking user queries and improving the chatbot over time
 * 2. Maintaining conversation context for better responses
 * 3. Analyzing common questions to improve product offerings
 */
const ChatInteractionSchema = new mongoose.Schema({
    // User information
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null // Allow anonymous chats
    },
    username: {
        type: String,
        default: 'anonymous'
    },
    
    // Message content
    message: {
        type: String,
        required: true
    },
    
    // Response from the chatbot
    response: {
        type: String,
        required: true
    },
    
    // Metadata
    timestamp: {
        type: Date,
        default: Date.now
    },
    
    // Session tracking
    sessionId: {
        type: String,
        required: true
    },
    
    // Message type
    messageType: {
        type: String,
        enum: ['text', 'product_recommendation', 'support_request', 'account_query'],
        default: 'text'
    },
    
    // If this was a product recommendation, store the product IDs
    recommendedProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    
    // If this was escalated to human support
    escalatedToSupport: {
        type: Boolean,
        default: false
    },
    
    // User feedback on response quality (optional)
    userFeedback: {
        helpful: {
            type: Boolean,
            default: null
        },
        feedbackText: {
            type: String,
            default: null
        }
    }
});

// Index for efficient queries
ChatInteractionSchema.index({ userId: 1, timestamp: -1 });
ChatInteractionSchema.index({ sessionId: 1 });
ChatInteractionSchema.index({ messageType: 1 });

module.exports = mongoose.model('ChatInteraction', ChatInteractionSchema);
