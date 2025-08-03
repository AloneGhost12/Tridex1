const mongoose = require('mongoose');

/**
 * Flash Sale Purchase Schema
 * Tracks individual purchases made during flash sales for analytics and user limits
 */
const FlashSalePurchaseSchema = new mongoose.Schema({
    // Sale reference
    flashSaleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FlashSale',
        required: true,
        index: true
    },
    
    // Product reference
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
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
    
    // Order reference
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        index: true
    },
    
    // Purchase details
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    
    originalPrice: {
        type: Number,
        required: true
    },
    
    salePrice: {
        type: Number,
        required: true
    },
    
    discountAmount: {
        type: Number,
        required: true
    },
    
    totalAmount: {
        type: Number,
        required: true
    },
    
    // Timing information
    purchaseTime: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    timeFromSaleStart: {
        type: Number, // milliseconds from sale start
        required: true
    },
    
    timeToSaleEnd: {
        type: Number, // milliseconds to sale end
        required: true
    },
    
    // User session information
    sessionId: {
        type: String,
        index: true
    },
    
    ipAddress: {
        type: String
    },
    
    userAgent: {
        type: String
    },
    
    // Purchase context
    referrer: {
        type: String
    },
    
    source: {
        type: String,
        enum: ['direct', 'banner', 'notification', 'search', 'category', 'recommendation'],
        default: 'direct'
    },
    
    // Analytics flags
    isFirstPurchase: {
        type: Boolean,
        default: false
    },
    
    isRepeatCustomer: {
        type: Boolean,
        default: false
    }
});

// Compound indexes for efficient queries
FlashSalePurchaseSchema.index({ flashSaleId: 1, userId: 1 });
FlashSalePurchaseSchema.index({ flashSaleId: 1, productId: 1 });
FlashSalePurchaseSchema.index({ userId: 1, purchaseTime: -1 });
FlashSalePurchaseSchema.index({ flashSaleId: 1, purchaseTime: 1 });

// Static method to get user's purchase count for a specific flash sale
FlashSalePurchaseSchema.statics.getUserPurchaseCount = async function(flashSaleId, userId, productId = null) {
    const query = { flashSaleId, userId };
    if (productId) {
        query.productId = productId;
    }
    
    const purchases = await this.find(query);
    return purchases.reduce((total, purchase) => total + purchase.quantity, 0);
};

// Static method to get flash sale analytics
FlashSalePurchaseSchema.statics.getFlashSaleAnalytics = async function(flashSaleId) {
    const analytics = await this.aggregate([
        { $match: { flashSaleId: mongoose.Types.ObjectId(flashSaleId) } },
        {
            $group: {
                _id: null,
                totalPurchases: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' },
                totalRevenue: { $sum: '$totalAmount' },
                totalDiscount: { $sum: '$discountAmount' },
                uniqueCustomers: { $addToSet: '$userId' },
                averageOrderValue: { $avg: '$totalAmount' },
                firstPurchaseTime: { $min: '$purchaseTime' },
                lastPurchaseTime: { $max: '$purchaseTime' }
            }
        },
        {
            $project: {
                totalPurchases: 1,
                totalQuantity: 1,
                totalRevenue: 1,
                totalDiscount: 1,
                uniqueCustomers: { $size: '$uniqueCustomers' },
                averageOrderValue: { $round: ['$averageOrderValue', 2] },
                firstPurchaseTime: 1,
                lastPurchaseTime: 1
            }
        }
    ]);
    
    return analytics[0] || {
        totalPurchases: 0,
        totalQuantity: 0,
        totalRevenue: 0,
        totalDiscount: 0,
        uniqueCustomers: 0,
        averageOrderValue: 0,
        firstPurchaseTime: null,
        lastPurchaseTime: null
    };
};

// Static method to get hourly purchase distribution
FlashSalePurchaseSchema.statics.getHourlyDistribution = async function(flashSaleId) {
    return await this.aggregate([
        { $match: { flashSaleId: mongoose.Types.ObjectId(flashSaleId) } },
        {
            $group: {
                _id: { $hour: '$purchaseTime' },
                purchases: { $sum: 1 },
                quantity: { $sum: '$quantity' },
                revenue: { $sum: '$totalAmount' }
            }
        },
        { $sort: { '_id': 1 } }
    ]);
};

// Static method to get top products in flash sale
FlashSalePurchaseSchema.statics.getTopProducts = async function(flashSaleId, limit = 10) {
    return await this.aggregate([
        { $match: { flashSaleId: mongoose.Types.ObjectId(flashSaleId) } },
        {
            $group: {
                _id: '$productId',
                totalQuantity: { $sum: '$quantity' },
                totalRevenue: { $sum: '$totalAmount' },
                purchaseCount: { $sum: 1 },
                uniqueCustomers: { $addToSet: '$userId' }
            }
        },
        {
            $project: {
                productId: '$_id',
                totalQuantity: 1,
                totalRevenue: 1,
                purchaseCount: 1,
                uniqueCustomers: { $size: '$uniqueCustomers' }
            }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: limit }
    ]);
};

module.exports = mongoose.model('FlashSalePurchase', FlashSalePurchaseSchema);
