const mongoose = require('mongoose');

/**
 * Schema for user wishlist/save for later functionality
 * Supports multiple wishlists per user and sharing capabilities
 */
const WishlistItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    },
    notes: {
        type: String,
        maxlength: 500,
        default: ''
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    }
});

const WishlistSchema = new mongoose.Schema({
    // User who owns the wishlist
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Wishlist details
    name: {
        type: String,
        required: true,
        default: 'My Wishlist',
        maxlength: 100
    },
    
    description: {
        type: String,
        maxlength: 500,
        default: ''
    },
    
    // Wishlist items
    items: [WishlistItemSchema],
    
    // Wishlist settings
    isPublic: {
        type: Boolean,
        default: false
    },
    
    isDefault: {
        type: Boolean,
        default: false
    },
    
    // Sharing and collaboration
    sharedWith: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        permission: {
            type: String,
            enum: ['view', 'edit'],
            default: 'view'
        },
        sharedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Analytics
    viewCount: {
        type: Number,
        default: 0
    },
    
    lastViewedAt: {
        type: Date,
        default: Date.now
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for performance
WishlistSchema.index({ userId: 1, isDefault: 1 });
WishlistSchema.index({ userId: 1, createdAt: -1 });
WishlistSchema.index({ isPublic: 1, viewCount: -1 });

// Pre-save middleware to update timestamps
WishlistSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for item count
WishlistSchema.virtual('itemCount').get(function() {
    return this.items.length;
});

// Method to add item to wishlist
WishlistSchema.methods.addItem = function(productId, notes = '', priority = 'medium') {
    // Check if item already exists
    const existingItem = this.items.find(item => 
        item.productId.toString() === productId.toString()
    );
    
    if (existingItem) {
        // Update existing item
        existingItem.notes = notes;
        existingItem.priority = priority;
        existingItem.addedAt = Date.now();
    } else {
        // Add new item
        this.items.push({
            productId,
            notes,
            priority,
            addedAt: Date.now()
        });
    }
    
    this.updatedAt = Date.now();
    return this.save();
};

// Method to remove item from wishlist
WishlistSchema.methods.removeItem = function(productId) {
    this.items = this.items.filter(item => 
        item.productId.toString() !== productId.toString()
    );
    this.updatedAt = Date.now();
    return this.save();
};

module.exports = mongoose.model('Wishlist', WishlistSchema);
