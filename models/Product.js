const mongoose = require('mongoose');
const MediaSchema = require('./Media');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    // Legacy image field for backward compatibility
    image: { type: String },
    // New media array for multiple images and videos
    media: [MediaSchema],
    desc: { type: String },
    price: { type: Number, required: true },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    aiSummary: {
        type: String,
        default: null
    },
    // Featured media item index (for quick access to primary image/video)
    featuredMediaIndex: {
        type: Number,
        default: 0
    },
    // Color variant fields
    // If this is a parent product
    isParentProduct: {
        type: Boolean,
        default: false
    },
    // If this is a color variant, reference to parent product
    parentProduct: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        default: null
    },
    // Color information (if this is a color variant)
    color: {
        name: { type: String, default: null },
        hexCode: { type: String, default: null }
    },
    // SKU (Stock Keeping Unit)
    sku: {
        type: String,
        default: null
    },
    // Inventory tracking
    inventory: {
        quantity: { type: Number, default: 0 },
        inStock: { type: Boolean, default: true }
    },
    // Whether this variant is enabled/visible
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Pre-save middleware to ensure backward compatibility
ProductSchema.pre('save', function(next) {
    // Update the updatedAt timestamp
    this.updatedAt = Date.now();

    // If there's no media array or it's empty but there is an image, add it to media
    if ((!this.media || this.media.length === 0) && this.image) {
        this.media = [{
            type: 'image',
            url: this.image,
            isPrimary: true,
            order: 0
        }];
    }

    // If there's media but no image field set, use the primary image as the image field
    if (this.media && this.media.length > 0 && !this.image) {
        // Find the primary image or use the first one
        const primaryMedia = this.media.find(m => m.isPrimary && m.type === 'image') ||
                            this.media.find(m => m.type === 'image');

        if (primaryMedia) {
            this.image = primaryMedia.url;
        }
    }

    // Generate SKU if not provided and this is a color variant
    if (!this.sku && this.parentProduct && this.color && this.color.name) {
        // Get parent product if available
        if (this.parentProduct._id) {
            // If parent is populated, use its _id
            const parentId = this.parentProduct._id.toString().slice(-6).toUpperCase();
            const colorCode = this.color.name.replace(/\s+/g, '-').toUpperCase();
            this.sku = `${parentId}-${colorCode}`;
        } else {
            // If parent is just an ID reference
            const parentId = this.parentProduct.toString().slice(-6).toUpperCase();
            const colorCode = this.color.name.replace(/\s+/g, '-').toUpperCase();
            this.sku = `${parentId}-${colorCode}`;
        }
    }

    next();
});

module.exports = mongoose.model('Product', ProductSchema);
