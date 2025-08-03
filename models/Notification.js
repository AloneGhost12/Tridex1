const mongoose = require('mongoose');

/**
 * Notification Model - Phase 2 Implementation
 * Manages push notifications and user notification preferences
 */

const notificationSchema = new mongoose.Schema({
    // User information
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Push subscription data
    subscription: {
        endpoint: {
            type: String,
            required: true
        },
        keys: {
            p256dh: {
                type: String,
                required: true
            },
            auth: {
                type: String,
                required: true
            }
        }
    },
    
    // Device information
    deviceInfo: {
        userAgent: String,
        platform: String,
        language: String,
        timezone: String
    },
    
    // Notification preferences
    preferences: {
        orderUpdates: {
            type: Boolean,
            default: true
        },
        promotions: {
            type: Boolean,
            default: true
        },
        newProducts: {
            type: Boolean,
            default: false
        },
        priceDrops: {
            type: Boolean,
            default: true
        },
        backInStock: {
            type: Boolean,
            default: true
        },
        recommendations: {
            type: Boolean,
            default: false
        }
    },
    
    // Status tracking
    isActive: {
        type: Boolean,
        default: true
    },
    
    lastUsed: {
        type: Date,
        default: Date.now
    },
    
    // Notification statistics
    stats: {
        sent: {
            type: Number,
            default: 0
        },
        delivered: {
            type: Number,
            default: 0
        },
        clicked: {
            type: Number,
            default: 0
        },
        lastSent: Date,
        lastClicked: Date
    }
}, {
    timestamps: true
});

// Indexes for performance
notificationSchema.index({ userId: 1, isActive: 1 });
notificationSchema.index({ 'subscription.endpoint': 1 }, { unique: true });
notificationSchema.index({ lastUsed: 1 });

// Instance methods
notificationSchema.methods.updateStats = function(action) {
    switch (action) {
        case 'sent':
            this.stats.sent += 1;
            this.stats.lastSent = new Date();
            break;
        case 'delivered':
            this.stats.delivered += 1;
            break;
        case 'clicked':
            this.stats.clicked += 1;
            this.stats.lastClicked = new Date();
            break;
    }
    this.lastUsed = new Date();
    return this.save();
};

notificationSchema.methods.updatePreferences = function(preferences) {
    this.preferences = { ...this.preferences, ...preferences };
    return this.save();
};

notificationSchema.methods.deactivate = function() {
    this.isActive = false;
    return this.save();
};

// Static methods
notificationSchema.statics.findActiveByUserId = function(userId) {
    return this.find({ userId, isActive: true });
};

notificationSchema.statics.findByEndpoint = function(endpoint) {
    return this.findOne({ 'subscription.endpoint': endpoint });
};

notificationSchema.statics.getActiveSubscriptions = function(userIds = null) {
    const query = { isActive: true };
    if (userIds) {
        query.userId = { $in: userIds };
    }
    return this.find(query);
};

// Clean up old inactive subscriptions
notificationSchema.statics.cleanupOldSubscriptions = function(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    return this.deleteMany({
        isActive: false,
        lastUsed: { $lt: cutoffDate }
    });
};

module.exports = mongoose.model('Notification', notificationSchema);
