const mongoose = require('mongoose');

/**
 * CouponUsage Schema for tracking individual coupon usage
 * Tracks when and how coupons are used by users
 */
const CouponUsageSchema = new mongoose.Schema({
    // Coupon reference
    couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
        required: true,
        index: true
    },
    
    couponCode: {
        type: String,
        required: true,
        index: true
    },
    
    // User information
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    username: {
        type: String,
        required: true
    },
    
    // Order information
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        index: true
    },
    
    // Usage details
    discountAmount: {
        type: Number,
        required: true,
        min: 0
    },
    
    orderTotal: {
        type: Number,
        required: true,
        min: 0
    },
    
    orderTotalAfterDiscount: {
        type: Number,
        required: true,
        min: 0
    },
    
    // Metadata
    usedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    // IP address for fraud detection
    ipAddress: {
        type: String,
        default: null
    },
    
    // User agent for analytics
    userAgent: {
        type: String,
        default: null
    }
});

// Compound indexes for efficient queries
CouponUsageSchema.index({ couponId: 1, userId: 1 });
CouponUsageSchema.index({ userId: 1, usedAt: -1 });
CouponUsageSchema.index({ couponCode: 1, usedAt: -1 });

// Static method to get usage count for a coupon by a user
CouponUsageSchema.statics.getUserUsageCount = async function(couponId, userId) {
    return await this.countDocuments({ couponId, userId });
};

// Static method to get total usage count for a coupon
CouponUsageSchema.statics.getTotalUsageCount = async function(couponId) {
    return await this.countDocuments({ couponId });
};

// Static method to get user's coupon usage history
CouponUsageSchema.statics.getUserHistory = async function(userId, limit = 10) {
    return await this.find({ userId })
        .populate('couponId', 'code name discountType discountValue')
        .sort({ usedAt: -1 })
        .limit(limit);
};

module.exports = mongoose.model('CouponUsage', CouponUsageSchema);
