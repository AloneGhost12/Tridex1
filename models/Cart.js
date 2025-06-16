const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    price: {
        type: Number,
        required: true
    },
    isFlashSale: {
        type: Boolean,
        default: false
    },
    originalPrice: {
        type: Number
    },
    discountPercentage: {
        type: Number,
        default: 0
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [cartItemSchema],
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Update the updatedAt field before saving
cartSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Calculate total price
cartSchema.methods.calculateTotal = function() {
    return this.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);
};

// Get total item count
cartSchema.methods.getItemCount = function() {
    return this.items.reduce((count, item) => {
        return count + item.quantity;
    }, 0);
};

// Remove expired flash sale items
cartSchema.methods.removeExpiredFlashSaleItems = async function() {
    const FlashSale = require('./FlashSale');
    
    for (let i = this.items.length - 1; i >= 0; i--) {
        const item = this.items[i];
        if (item.isFlashSale) {
            // Check if the flash sale is still active
            const activeFlashSales = await FlashSale.find({
                isActive: true,
                status: 'active',
                startTime: { $lte: new Date() },
                endTime: { $gte: new Date() },
                'products.productId': item.productId
            });
            
            if (activeFlashSales.length === 0) {
                // Flash sale expired, remove item or convert to regular price
                this.items.splice(i, 1);
            }
        }
    }
};

module.exports = mongoose.model('Cart', cartSchema);
