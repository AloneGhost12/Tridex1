const mongoose = require('mongoose');

/**
 * Coupon Schema for Advanced Discount System
 * Supports percentage/fixed discounts, usage limits, category restrictions, and more
 */
const CouponSchema = new mongoose.Schema({
    // Basic coupon information
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        minlength: 3,
        maxlength: 20,
        index: true
    },
    
    name: {
        type: String,
        required: true,
        maxlength: 100
    },
    
    description: {
        type: String,
        maxlength: 500
    },
    
    // Discount configuration
    discountType: {
        type: String,
        required: true,
        enum: ['percentage', 'fixed', 'buy_x_get_y', 'free_shipping'],
        default: 'percentage'
    },
    
    discountValue: {
        type: Number,
        required: true,
        min: 0
    },
    
    // For percentage discounts, maximum discount amount
    maxDiscountAmount: {
        type: Number,
        default: null
    },
    
    // Minimum order requirements
    minimumOrderValue: {
        type: Number,
        default: 0,
        min: 0
    },
    
    minimumQuantity: {
        type: Number,
        default: 1,
        min: 1
    },
    
    // Usage limitations
    usageLimit: {
        type: Number,
        default: null // null means unlimited
    },
    
    usageLimitPerUser: {
        type: Number,
        default: 1,
        min: 1
    },
    
    currentUsageCount: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // Validity period
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    
    endDate: {
        type: Date,
        required: true
    },
    
    // Product/Category restrictions
    applicableProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    
    applicableCategories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    
    excludedProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    
    excludedCategories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    
    // User restrictions
    applicableUserTypes: [{
        type: String,
        enum: ['all', 'new', 'existing', 'premium', 'verified']
    }],
    
    excludedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    
    // Buy X Get Y configuration (for buy_x_get_y type)
    buyXGetY: {
        buyQuantity: {
            type: Number,
            default: 1
        },
        getQuantity: {
            type: Number,
            default: 1
        },
        getDiscountPercentage: {
            type: Number,
            default: 100, // 100% means free
            min: 0,
            max: 100
        }
    },
    
    // Status and settings
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    
    isPublic: {
        type: Boolean,
        default: true // false for private/targeted coupons
    },
    
    // Auto-apply settings
    autoApply: {
        type: Boolean,
        default: false
    },
    
    priority: {
        type: Number,
        default: 0 // Higher priority coupons are applied first
    },
    
    // Stackable with other coupons
    isStackable: {
        type: Boolean,
        default: false
    },
    
    // Admin information
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
CouponSchema.index({ code: 1, isActive: 1 });
CouponSchema.index({ startDate: 1, endDate: 1 });
CouponSchema.index({ isActive: 1, isPublic: 1 });
CouponSchema.index({ autoApply: 1, isActive: 1 });

// Virtual for checking if coupon is currently valid
CouponSchema.virtual('isValid').get(function() {
    const now = new Date();
    return this.isActive && 
           this.startDate <= now && 
           this.endDate >= now &&
           (this.usageLimit === null || this.currentUsageCount < this.usageLimit);
});

// Virtual for checking if coupon is expired
CouponSchema.virtual('isExpired').get(function() {
    return new Date() > this.endDate;
});

// Virtual for remaining usage count
CouponSchema.virtual('remainingUsage').get(function() {
    if (this.usageLimit === null) return null;
    return Math.max(0, this.usageLimit - this.currentUsageCount);
});

// Method to check if coupon is applicable to a user
CouponSchema.methods.isApplicableToUser = function(user) {
    // Check if user is excluded
    if (this.excludedUsers.includes(user._id)) {
        return false;
    }
    
    // Check user type restrictions
    if (this.applicableUserTypes.length > 0) {
        const userTypes = ['all'];
        
        // Determine user type
        if (user.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
            userTypes.push('new');
        } else {
            userTypes.push('existing');
        }
        
        if (user.verified) userTypes.push('verified');
        if (user.isPremium) userTypes.push('premium');
        
        const hasApplicableType = this.applicableUserTypes.some(type => 
            userTypes.includes(type)
        );
        
        if (!hasApplicableType) {
            return false;
        }
    }
    
    return true;
};

// Method to check if coupon is applicable to products in cart
CouponSchema.methods.isApplicableToProducts = function(cartItems) {
    // If no product restrictions, applicable to all
    if (this.applicableProducts.length === 0 && this.applicableCategories.length === 0) {
        return true;
    }
    
    // Check if any cart item matches applicable products/categories
    return cartItems.some(item => {
        // Check if product is excluded
        if (this.excludedProducts.includes(item.productId)) {
            return false;
        }
        
        // Check if category is excluded
        if (item.product && item.product.category && 
            this.excludedCategories.includes(item.product.category)) {
            return false;
        }
        
        // Check if product is in applicable products
        if (this.applicableProducts.length > 0 && 
            !this.applicableProducts.includes(item.productId)) {
            return false;
        }
        
        // Check if category is in applicable categories
        if (this.applicableCategories.length > 0 && 
            item.product && item.product.category &&
            !this.applicableCategories.includes(item.product.category)) {
            return false;
        }
        
        return true;
    });
};

// Method to calculate discount for cart
CouponSchema.methods.calculateDiscount = function(cartItems, cartTotal) {
    if (!this.isValid) {
        return { discount: 0, error: 'Coupon is not valid' };
    }

    // Check minimum order value
    if (cartTotal < this.minimumOrderValue) {
        return {
            discount: 0,
            error: `Minimum order value of ₹${this.minimumOrderValue} required`
        };
    }

    // Check minimum quantity
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity < this.minimumQuantity) {
        return {
            discount: 0,
            error: `Minimum ${this.minimumQuantity} items required`
        };
    }

    let discount = 0;

    switch (this.discountType) {
        case 'percentage':
            discount = (cartTotal * this.discountValue) / 100;
            if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
                discount = this.maxDiscountAmount;
            }
            break;

        case 'fixed':
            discount = Math.min(this.discountValue, cartTotal);
            break;

        case 'free_shipping':
            // This would be handled separately in shipping calculation
            discount = 0;
            break;

        case 'buy_x_get_y':
            // Calculate buy X get Y discount
            const eligibleItems = cartItems.filter(item =>
                this.isApplicableToProducts([item])
            );

            let totalEligibleQuantity = eligibleItems.reduce((sum, item) =>
                sum + item.quantity, 0
            );

            const sets = Math.floor(totalEligibleQuantity / this.buyXGetY.buyQuantity);
            const freeItems = sets * this.buyXGetY.getQuantity;

            // Calculate discount on cheapest items
            const sortedItems = eligibleItems
                .flatMap(item => Array(item.quantity).fill(item.price))
                .sort((a, b) => a - b);

            for (let i = 0; i < Math.min(freeItems, sortedItems.length); i++) {
                discount += sortedItems[i] * (this.buyXGetY.getDiscountPercentage / 100);
            }
            break;
    }

    return { discount: Math.round(discount * 100) / 100 };
};

// Pre-save middleware to update timestamps
CouponSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Coupon', CouponSchema);
