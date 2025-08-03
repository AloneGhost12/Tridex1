const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    user: {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false // Not required for guest checkout
        },
        username: {
            type: String,
            required: false
        },
        email: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        }
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            default: 1
        },
        image: {
            type: String,
            required: false
        }
    }],
    shipping: {
        name: {
            type: String,
            required: true
        },
        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        postalCode: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true,
            default: 'India'
        }
    },
    payment: {
        method: {
            type: String,
            required: true,
            enum: ['razorpay', 'cod', 'paypal'],
            default: 'razorpay'
        },
        transactionId: {
            type: String,
            required: false
        },
        status: {
            type: String,
            required: true,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending'
        },
        amount: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            required: true,
            default: 'INR'
        },
        paymentDate: {
            type: Date,
            required: false
        }
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    totalAmount: {
        type: Number,
        required: true
    },
    shippingFee: {
        type: Number,
        required: true,
        default: 0
    },
    tax: {
        type: Number,
        required: true,
        default: 0
    },

    // Coupon and discount information
    coupons: [{
        couponId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coupon',
            required: true
        },
        code: {
            type: String,
            required: true
        },
        discountAmount: {
            type: Number,
            required: true,
            min: 0
        },
        discountType: {
            type: String,
            required: true,
            enum: ['percentage', 'fixed', 'buy_x_get_y', 'free_shipping']
        }
    }],

    // Total discount applied
    totalDiscount: {
        type: Number,
        default: 0,
        min: 0
    },

    // Subtotal before discounts
    subtotal: {
        type: Number,
        required: true
    },

    notes: {
        type: String,
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
OrderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Order', OrderSchema);
