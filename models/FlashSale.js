const mongoose = require('mongoose');

/**
 * Flash Sale Schema for Limited-Time Offers
 * Supports time-limited sales with countdown timers, limited quantities, and automatic pricing
 */
const FlashSaleSchema = new mongoose.Schema({
    // Basic sale information
    name: {
        type: String,
        required: true,
        maxlength: 100,
        index: true
    },
    
    description: {
        type: String,
        maxlength: 500
    },
    
    // Sale timing
    startTime: {
        type: Date,
        required: true,
        index: true
    },
    
    endTime: {
        type: Date,
        required: true,
        index: true
    },
    
    // Sale status
    status: {
        type: String,
        enum: ['scheduled', 'active', 'ended', 'cancelled'],
        default: 'scheduled',
        index: true
    },
    
    // Sale type
    saleType: {
        type: String,
        enum: ['flash_sale', 'daily_deal', 'weekend_special', 'clearance', 'limited_time'],
        default: 'flash_sale'
    },
    
    // Products in the sale
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        
        // Original pricing
        originalPrice: {
            type: Number,
            required: true
        },
        
        // Sale pricing
        salePrice: {
            type: Number,
            required: true
        },
        
        discountPercentage: {
            type: Number,
            min: 0,
            max: 100
        },
        
        // Quantity limits
        totalQuantity: {
            type: Number,
            default: null // null means unlimited
        },
        
        soldQuantity: {
            type: Number,
            default: 0,
            min: 0
        },
        
        remainingQuantity: {
            type: Number,
            default: null
        },
        
        // Per-user purchase limits
        maxPerUser: {
            type: Number,
            default: null // null means unlimited
        },
        
        // Product-specific sale settings
        isActive: {
            type: Boolean,
            default: true
        },
        
        priority: {
            type: Number,
            default: 0
        }
    }],
    
    // Sale rules and restrictions
    rules: {
        // User eligibility
        eligibleUserTypes: [{
            type: String,
            enum: ['all', 'new', 'existing', 'premium', 'verified']
        }],
        
        // Geographic restrictions
        allowedCountries: [String],
        excludedCountries: [String],
        
        // Minimum requirements
        minimumOrderValue: {
            type: Number,
            default: 0
        },
        
        // Maximum discount per order
        maxDiscountPerOrder: {
            type: Number,
            default: null
        }
    },
    
    // Display settings
    display: {
        // Banner configuration
        bannerTitle: {
            type: String,
            maxlength: 100
        },
        
        bannerSubtitle: {
            type: String,
            maxlength: 200
        },
        
        bannerImage: {
            type: String
        },
        
        bannerColor: {
            type: String,
            default: '#ff4444'
        },
        
        // Countdown timer settings
        showCountdown: {
            type: Boolean,
            default: true
        },
        
        countdownStyle: {
            type: String,
            enum: ['digital', 'analog', 'text', 'minimal'],
            default: 'digital'
        },
        
        // Urgency indicators
        showQuantityLeft: {
            type: Boolean,
            default: true
        },
        
        showSoldCount: {
            type: Boolean,
            default: false
        },
        
        urgencyThreshold: {
            type: Number,
            default: 10 // Show urgency when less than this many items left
        }
    },
    
    // Analytics and tracking
    analytics: {
        totalViews: {
            type: Number,
            default: 0
        },
        
        uniqueViews: {
            type: Number,
            default: 0
        },
        
        totalSales: {
            type: Number,
            default: 0
        },
        
        totalRevenue: {
            type: Number,
            default: 0
        },
        
        conversionRate: {
            type: Number,
            default: 0
        },
        
        averageOrderValue: {
            type: Number,
            default: 0
        }
    },
    
    // Notification settings
    notifications: {
        // Pre-sale notifications
        notifyBeforeStart: {
            type: Boolean,
            default: true
        },
        
        notifyMinutesBefore: {
            type: Number,
            default: 30
        },
        
        // During sale notifications
        notifyLowStock: {
            type: Boolean,
            default: true
        },
        
        lowStockThreshold: {
            type: Number,
            default: 5
        },
        
        // End of sale notifications
        notifyBeforeEnd: {
            type: Boolean,
            default: true
        },
        
        notifyMinutesBeforeEnd: {
            type: Number,
            default: 60
        }
    },
    
    // Admin settings
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    
    isFeatured: {
        type: Boolean,
        default: false
    },
    
    priority: {
        type: Number,
        default: 0
    },
    
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for performance
FlashSaleSchema.index({ startTime: 1, endTime: 1 });
FlashSaleSchema.index({ status: 1, isActive: 1 });
FlashSaleSchema.index({ 'products.productId': 1 });
FlashSaleSchema.index({ isFeatured: 1, priority: -1 });

// Virtual for checking if sale is currently active
FlashSaleSchema.virtual('isCurrentlyActive').get(function() {
    const now = new Date();
    return this.isActive && 
           this.status === 'active' && 
           this.startTime <= now && 
           this.endTime > now;
});

// Virtual for time remaining
FlashSaleSchema.virtual('timeRemaining').get(function() {
    const now = new Date();
    if (this.endTime <= now) return 0;
    return this.endTime.getTime() - now.getTime();
});

// Virtual for time until start
FlashSaleSchema.virtual('timeUntilStart').get(function() {
    const now = new Date();
    if (this.startTime <= now) return 0;
    return this.startTime.getTime() - now.getTime();
});

// Method to update sale status based on current time
FlashSaleSchema.methods.updateStatus = function() {
    const now = new Date();
    
    if (now < this.startTime) {
        this.status = 'scheduled';
    } else if (now >= this.startTime && now < this.endTime) {
        this.status = 'active';
    } else {
        this.status = 'ended';
    }
    
    this.updatedAt = Date.now();
    return this.save();
};

// Method to add product to sale
FlashSaleSchema.methods.addProduct = function(productData) {
    // Calculate discount percentage
    const discountPercentage = Math.round(
        ((productData.originalPrice - productData.salePrice) / productData.originalPrice) * 100
    );
    
    const productSale = {
        ...productData,
        discountPercentage,
        remainingQuantity: productData.totalQuantity
    };
    
    this.products.push(productSale);
    this.updatedAt = Date.now();
    return this.save();
};

// Method to update product quantities after purchase
FlashSaleSchema.methods.updateProductQuantity = function(productId, quantityPurchased) {
    const product = this.products.find(p => p.productId.toString() === productId.toString());
    
    if (product) {
        product.soldQuantity += quantityPurchased;
        if (product.totalQuantity !== null) {
            product.remainingQuantity = Math.max(0, product.totalQuantity - product.soldQuantity);
        }
        
        // Update analytics
        this.analytics.totalSales += quantityPurchased;
        this.analytics.totalRevenue += product.salePrice * quantityPurchased;
        
        this.updatedAt = Date.now();
        return this.save();
    }
    
    return Promise.resolve(this);
};

// Static method to get active sales
FlashSaleSchema.statics.getActiveSales = function() {
    const now = new Date();
    return this.find({
        isActive: true,
        status: 'active',
        startTime: { $lte: now },
        endTime: { $gt: now }
    }).populate('products.productId', 'name image media price stock');
};

// Static method to get upcoming sales
FlashSaleSchema.statics.getUpcomingSales = function() {
    const now = new Date();
    return this.find({
        isActive: true,
        status: 'scheduled',
        startTime: { $gt: now }
    }).populate('products.productId', 'name image media price');
};

// Pre-save middleware
FlashSaleSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    
    // Auto-update status based on current time
    const now = new Date();
    if (now < this.startTime && this.status !== 'cancelled') {
        this.status = 'scheduled';
    } else if (now >= this.startTime && now < this.endTime && this.status !== 'cancelled') {
        this.status = 'active';
    } else if (now >= this.endTime && this.status !== 'cancelled') {
        this.status = 'ended';
    }
    
    next();
});

module.exports = mongoose.model('FlashSale', FlashSaleSchema);
