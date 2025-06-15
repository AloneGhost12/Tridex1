const mongoose = require('mongoose');
const MediaSchema = require('./Media');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true, index: true },
    // Legacy image field for backward compatibility
    image: { type: String },
    // New media array for multiple images and videos
    media: [MediaSchema],
    desc: { type: String, index: true },
    price: { type: Number, required: true, index: true },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null,
        index: true
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

    // Enhanced product fields for advanced search
    brand: {
        type: String,
        default: '',
        index: true
    },

    sku: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },

    tags: [{
        type: String,
        index: true
    }],

    // Inventory management
    stock: {
        type: Number,
        default: 0,
        min: 0
    },

    isAvailable: {
        type: Boolean,
        default: true,
        index: true
    },

    // Pricing
    originalPrice: {
        type: Number,
        default: null
    },

    discountPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    // Product metrics for search ranking
    viewCount: {
        type: Number,
        default: 0,
        index: true
    },

    purchaseCount: {
        type: Number,
        default: 0,
        index: true
    },

    wishlistCount: {
        type: Number,
        default: 0
    },

    // Rating and reviews
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
        index: true
    },

    reviewCount: {
        type: Number,
        default: 0
    },

    // SEO and search optimization
    searchKeywords: [{
        type: String,
        index: true
    }],

    metaTitle: {
        type: String,
        maxlength: 60
    },

    metaDescription: {
        type: String,
        maxlength: 160
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

// Text search index for advanced search functionality
ProductSchema.index({
    name: 'text',
    desc: 'text',
    brand: 'text',
    tags: 'text',
    searchKeywords: 'text'
}, {
    weights: {
        name: 10,
        brand: 8,
        tags: 6,
        searchKeywords: 5,
        desc: 3
    },
    name: 'product_text_search'
});

// Compound indexes for filtering and sorting
ProductSchema.index({ category: 1, price: 1 });
ProductSchema.index({ category: 1, averageRating: -1 });
ProductSchema.index({ category: 1, createdAt: -1 });
ProductSchema.index({ category: 1, viewCount: -1 });
ProductSchema.index({ category: 1, purchaseCount: -1 });
ProductSchema.index({ isAvailable: 1, price: 1 });
ProductSchema.index({ brand: 1, category: 1 });

// Virtual for calculating effective price (with discount)
ProductSchema.virtual('effectivePrice').get(function() {
    if (this.discountPercentage > 0 && this.originalPrice) {
        return this.originalPrice * (1 - this.discountPercentage / 100);
    }
    return this.price;
});

// Virtual for checking if product is on sale
ProductSchema.virtual('isOnSale').get(function() {
    return this.discountPercentage > 0 && this.originalPrice && this.originalPrice > this.price;
});

// Method to increment view count
ProductSchema.methods.incrementViewCount = function() {
    this.viewCount = (this.viewCount || 0) + 1;
    this.updatedAt = Date.now();
    return this.save();
};

// Method to update rating
ProductSchema.methods.updateRating = function(newRating, reviewCount) {
    this.averageRating = newRating;
    this.reviewCount = reviewCount;
    this.updatedAt = Date.now();
    return this.save();
};

// Static method for advanced search
ProductSchema.statics.advancedSearch = function(searchParams) {
    const {
        query,
        category,
        minPrice,
        maxPrice,
        brand,
        minRating,
        isAvailable,
        sortBy = 'relevance',
        page = 1,
        limit = 20,
        tags
    } = searchParams;

    // Build the aggregation pipeline
    const pipeline = [];

    // Match stage
    const matchStage = {};

    // Text search
    if (query && query.trim()) {
        matchStage.$text = { $search: query.trim() };
    }

    // Category filter
    if (category) {
        matchStage.category = mongoose.Types.ObjectId(category);
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
        matchStage.price = {};
        if (minPrice !== undefined) matchStage.price.$gte = minPrice;
        if (maxPrice !== undefined) matchStage.price.$lte = maxPrice;
    }

    // Brand filter
    if (brand) {
        matchStage.brand = new RegExp(brand, 'i');
    }

    // Rating filter
    if (minRating !== undefined) {
        matchStage.averageRating = { $gte: minRating };
    }

    // Availability filter
    if (isAvailable !== undefined) {
        matchStage.isAvailable = isAvailable;
    }

    // Tags filter
    if (tags && tags.length > 0) {
        matchStage.tags = { $in: tags };
    }

    pipeline.push({ $match: matchStage });

    // Add score for text search
    if (query && query.trim()) {
        pipeline.push({
            $addFields: {
                searchScore: { $meta: 'textScore' }
            }
        });
    }

    // Populate category
    pipeline.push({
        $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'category'
        }
    });

    pipeline.push({
        $unwind: {
            path: '$category',
            preserveNullAndEmptyArrays: true
        }
    });

    // Sort stage
    let sortStage = {};
    switch (sortBy) {
        case 'price_asc':
            sortStage.price = 1;
            break;
        case 'price_desc':
            sortStage.price = -1;
            break;
        case 'rating':
            sortStage.averageRating = -1;
            sortStage.reviewCount = -1;
            break;
        case 'newest':
            sortStage.createdAt = -1;
            break;
        case 'popularity':
            sortStage.viewCount = -1;
            sortStage.purchaseCount = -1;
            break;
        case 'relevance':
        default:
            if (query && query.trim()) {
                sortStage.searchScore = { $meta: 'textScore' };
            } else {
                sortStage.viewCount = -1;
                sortStage.purchaseCount = -1;
            }
            break;
    }

    pipeline.push({ $sort: sortStage });

    // Pagination
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    return this.aggregate(pipeline);
};

module.exports = mongoose.model('Product', ProductSchema);
