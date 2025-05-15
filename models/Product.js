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

    next();
});

module.exports = mongoose.model('Product', ProductSchema);
