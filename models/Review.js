const mongoose = require('mongoose');

// Schema for review media (photos/videos)
const ReviewMediaSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['image', 'video'],
        required: true
    },
    url: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String // Thumbnail URL for videos
    },
    caption: {
        type: String,
        maxlength: 200
    },
    order: {
        type: Number,
        default: 0
    }
});

const ReplySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 1000 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isAdminReply: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const ReviewSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Review content
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        index: true
    },
    title: {
        type: String,
        maxlength: 100,
        default: ''
    },
    text: {
        type: String,
        required: true,
        maxlength: 2000
    },

    // Enhanced review features
    media: [ReviewMediaSchema], // Photos and videos

    // Verification
    isVerifiedPurchase: {
        type: Boolean,
        default: false,
        index: true
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null
    },

    // Interaction metrics
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    helpfulCount: {
        type: Number,
        default: 0
    },
    notHelpfulCount: {
        type: Number,
        default: 0
    },

    // Review quality metrics
    qualityScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    // Moderation
    isApproved: {
        type: Boolean,
        default: true,
        index: true
    },
    moderationNotes: {
        type: String,
        default: ''
    },
    flaggedBy: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: {
            type: String,
            enum: ['spam', 'inappropriate', 'fake', 'offensive', 'other']
        },
        flaggedAt: { type: Date, default: Date.now }
    }],

    // Replies and Q&A
    replies: [ReplySchema],

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
ReviewSchema.index({ product: 1, rating: -1 });
ReviewSchema.index({ product: 1, createdAt: -1 });
ReviewSchema.index({ product: 1, helpfulCount: -1 });
ReviewSchema.index({ user: 1, createdAt: -1 });
ReviewSchema.index({ isVerifiedPurchase: 1, rating: -1 });

// Pre-save middleware
ReviewSchema.pre('save', function(next) {
    this.updatedAt = Date.now();

    // Calculate quality score based on various factors
    let score = 0;

    // Length of review text (more detailed = higher score)
    if (this.text.length > 100) score += 20;
    if (this.text.length > 300) score += 20;

    // Has media
    if (this.media && this.media.length > 0) score += 25;

    // Verified purchase
    if (this.isVerifiedPurchase) score += 25;

    // Has title
    if (this.title && this.title.trim()) score += 10;

    this.qualityScore = Math.min(score, 100);

    next();
});

// Virtual for net helpfulness
ReviewSchema.virtual('netHelpfulness').get(function() {
    return this.helpfulCount - this.notHelpfulCount;
});

// Method to mark as helpful
ReviewSchema.methods.markHelpful = function(userId) {
    if (!this.likes.includes(userId)) {
        this.likes.push(userId);
        this.helpfulCount = this.likes.length;

        // Remove from dislikes if present
        this.dislikes = this.dislikes.filter(id => !id.equals(userId));
        this.notHelpfulCount = this.dislikes.length;

        this.updatedAt = Date.now();
    }
    return this.save();
};

// Method to mark as not helpful
ReviewSchema.methods.markNotHelpful = function(userId) {
    if (!this.dislikes.includes(userId)) {
        this.dislikes.push(userId);
        this.notHelpfulCount = this.dislikes.length;

        // Remove from likes if present
        this.likes = this.likes.filter(id => !id.equals(userId));
        this.helpfulCount = this.likes.length;

        this.updatedAt = Date.now();
    }
    return this.save();
};

module.exports = mongoose.model('Review', ReviewSchema);
