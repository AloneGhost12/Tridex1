const mongoose = require('mongoose');

/**
 * Media Schema for product images and videos
 * This schema is used as a subdocument in the Product schema
 */
const MediaSchema = new mongoose.Schema({
    // Type of media (image or video)
    type: {
        type: String,
        enum: ['image', 'video'],
        required: true,
        default: 'image'
    },
    
    // URL to the media file (Cloudinary URL or other)
    url: {
        type: String,
        required: true
    },
    
    // Thumbnail URL (for videos or as a smaller version of images)
    thumbnailUrl: {
        type: String,
        default: null
    },
    
    // Public ID in Cloudinary (useful for deletion and management)
    publicId: {
        type: String,
        default: null
    },
    
    // Display order in the gallery (lower numbers appear first)
    order: {
        type: Number,
        default: 0
    },
    
    // Alt text for images (for accessibility)
    altText: {
        type: String,
        default: ''
    },
    
    // Caption or description for the media
    caption: {
        type: String,
        default: ''
    },
    
    // Whether this is the primary/featured media for the product
    isPrimary: {
        type: Boolean,
        default: false
    },
    
    // Additional metadata (dimensions, duration for videos, etc.)
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // When the media was added
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = MediaSchema;
