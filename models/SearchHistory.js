const mongoose = require('mongoose');

/**
 * Schema for storing user search history and analytics
 * Supports advanced search features and personalization
 */
const SearchHistorySchema = new mongoose.Schema({
    // User information (optional for anonymous searches)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    username: {
        type: String,
        default: 'anonymous'
    },
    
    // Search details
    query: {
        type: String,
        required: true,
        index: true
    },
    
    // Search filters applied
    filters: {
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            default: null
        },
        priceRange: {
            min: { type: Number, default: null },
            max: { type: Number, default: null }
        },
        brand: { type: String, default: null },
        rating: { type: Number, default: null },
        availability: { type: Boolean, default: null },
        sortBy: { 
            type: String, 
            enum: ['popularity', 'price_asc', 'price_desc', 'newest', 'rating', 'relevance'],
            default: 'relevance'
        }
    },
    
    // Search results metadata
    resultsCount: {
        type: Number,
        default: 0
    },
    
    // User interaction with search results
    clickedProducts: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        position: Number, // Position in search results
        timestamp: { type: Date, default: Date.now }
    }],
    
    // Search session information
    sessionId: {
        type: String,
        required: true
    },
    
    // Device and location info
    deviceInfo: {
        userAgent: String,
        isMobile: Boolean,
        platform: String
    },
    
    // Timestamps
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Indexes for performance
SearchHistorySchema.index({ query: 'text' });
SearchHistorySchema.index({ userId: 1, timestamp: -1 });
SearchHistorySchema.index({ timestamp: -1 });
SearchHistorySchema.index({ 'filters.category': 1 });

module.exports = mongoose.model('SearchHistory', SearchHistorySchema);
