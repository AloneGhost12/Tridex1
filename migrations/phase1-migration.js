/**
 * Phase 1 Migration Script for Tridex E-commerce Platform
 * Migrates existing data to support advanced search and wishlist features
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Product = require('../models/Product');
const User = require('../models/User');
const Review = require('../models/Review');
const Wishlist = require('../models/Wishlist');
const SearchHistory = require('../models/SearchHistory');

async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://gff130170:JKMdheztoUBmjDBM@ghost.k971z8m.mongodb.net/?retryWrites=true&w=majority&appName=ghost', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

async function migrateProducts() {
    console.log('🔄 Migrating products...');
    
    try {
        // Update existing products with new fields
        const products = await Product.find({});
        let updatedCount = 0;

        for (const product of products) {
            let needsUpdate = false;
            
            // Add missing fields with default values
            if (product.brand === undefined) {
                product.brand = '';
                needsUpdate = true;
            }
            
            if (product.tags === undefined) {
                product.tags = [];
                needsUpdate = true;
            }
            
            if (product.stock === undefined) {
                product.stock = 10; // Default stock
                needsUpdate = true;
            }
            
            if (product.isAvailable === undefined) {
                product.isAvailable = true;
                needsUpdate = true;
            }
            
            if (product.viewCount === undefined) {
                product.viewCount = 0;
                needsUpdate = true;
            }
            
            if (product.purchaseCount === undefined) {
                product.purchaseCount = 0;
                needsUpdate = true;
            }
            
            if (product.wishlistCount === undefined) {
                product.wishlistCount = 0;
                needsUpdate = true;
            }
            
            if (product.averageRating === undefined) {
                product.averageRating = 0;
                needsUpdate = true;
            }
            
            if (product.reviewCount === undefined) {
                product.reviewCount = 0;
                needsUpdate = true;
            }
            
            if (product.searchKeywords === undefined) {
                // Generate search keywords from name and description
                const keywords = [];
                if (product.name) {
                    keywords.push(...product.name.toLowerCase().split(' '));
                }
                if (product.desc) {
                    keywords.push(...product.desc.toLowerCase().split(' '));
                }
                product.searchKeywords = [...new Set(keywords)]; // Remove duplicates
                needsUpdate = true;
            }
            
            if (product.createdAt === undefined) {
                product.createdAt = new Date();
                needsUpdate = true;
            }
            
            if (product.updatedAt === undefined) {
                product.updatedAt = new Date();
                needsUpdate = true;
            }

            if (needsUpdate) {
                await product.save();
                updatedCount++;
            }
        }

        console.log(`✅ Updated ${updatedCount} products`);
        
        // Create text indexes for search
        try {
            await Product.collection.createIndex({
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
            console.log('✅ Created text search index for products');
        } catch (error) {
            if (error.code === 85) {
                console.log('ℹ️ Text search index already exists');
            } else {
                console.error('❌ Error creating text search index:', error);
            }
        }

    } catch (error) {
        console.error('❌ Error migrating products:', error);
    }
}

async function migrateReviews() {
    console.log('🔄 Migrating reviews...');
    
    try {
        const reviews = await Review.find({});
        let updatedCount = 0;

        for (const review of reviews) {
            let needsUpdate = false;
            
            // Add missing fields
            if (review.title === undefined) {
                review.title = '';
                needsUpdate = true;
            }
            
            if (review.media === undefined) {
                review.media = [];
                needsUpdate = true;
            }
            
            if (review.isVerifiedPurchase === undefined) {
                review.isVerifiedPurchase = false;
                needsUpdate = true;
            }
            
            if (review.helpfulCount === undefined) {
                review.helpfulCount = review.likes ? review.likes.length : 0;
                needsUpdate = true;
            }
            
            if (review.notHelpfulCount === undefined) {
                review.notHelpfulCount = review.dislikes ? review.dislikes.length : 0;
                needsUpdate = true;
            }
            
            if (review.qualityScore === undefined) {
                // Calculate initial quality score
                let score = 0;
                if (review.text && review.text.length > 100) score += 20;
                if (review.text && review.text.length > 300) score += 20;
                if (review.isVerifiedPurchase) score += 25;
                review.qualityScore = score;
                needsUpdate = true;
            }
            
            if (review.isApproved === undefined) {
                review.isApproved = true;
                needsUpdate = true;
            }
            
            if (review.flaggedBy === undefined) {
                review.flaggedBy = [];
                needsUpdate = true;
            }
            
            if (review.updatedAt === undefined) {
                review.updatedAt = review.createdAt || new Date();
                needsUpdate = true;
            }

            if (needsUpdate) {
                await review.save();
                updatedCount++;
            }
        }

        console.log(`✅ Updated ${updatedCount} reviews`);

        // Update product ratings based on reviews
        const products = await Product.find({});
        for (const product of products) {
            const productReviews = await Review.find({ 
                product: product._id, 
                isApproved: true 
            });
            
            if (productReviews.length > 0) {
                const totalRating = productReviews.reduce((sum, review) => sum + review.rating, 0);
                const averageRating = totalRating / productReviews.length;
                
                product.averageRating = Math.round(averageRating * 10) / 10;
                product.reviewCount = productReviews.length;
                await product.save();
            }
        }

        console.log('✅ Updated product ratings');

    } catch (error) {
        console.error('❌ Error migrating reviews:', error);
    }
}

async function createDefaultWishlists() {
    console.log('🔄 Creating default wishlists for existing users...');
    
    try {
        const users = await User.find({});
        let createdCount = 0;

        for (const user of users) {
            // Check if user already has a default wishlist
            const existingWishlist = await Wishlist.findOne({ 
                userId: user._id, 
                isDefault: true 
            });

            if (!existingWishlist) {
                const defaultWishlist = new Wishlist({
                    userId: user._id,
                    name: 'My Wishlist',
                    description: 'My default wishlist',
                    isDefault: true,
                    isPublic: false,
                    items: []
                });

                await defaultWishlist.save();
                createdCount++;
            }
        }

        console.log(`✅ Created ${createdCount} default wishlists`);

    } catch (error) {
        console.error('❌ Error creating default wishlists:', error);
    }
}

async function createIndexes() {
    console.log('🔄 Creating database indexes...');
    
    try {
        // Product indexes
        await Product.collection.createIndex({ category: 1, price: 1 });
        await Product.collection.createIndex({ category: 1, averageRating: -1 });
        await Product.collection.createIndex({ category: 1, createdAt: -1 });
        await Product.collection.createIndex({ category: 1, viewCount: -1 });
        await Product.collection.createIndex({ isAvailable: 1, price: 1 });
        await Product.collection.createIndex({ brand: 1, category: 1 });

        // Review indexes
        await Review.collection.createIndex({ product: 1, rating: -1 });
        await Review.collection.createIndex({ product: 1, createdAt: -1 });
        await Review.collection.createIndex({ product: 1, helpfulCount: -1 });
        await Review.collection.createIndex({ user: 1, createdAt: -1 });

        // Wishlist indexes
        await Wishlist.collection.createIndex({ userId: 1, isDefault: 1 });
        await Wishlist.collection.createIndex({ userId: 1, createdAt: -1 });

        // SearchHistory indexes
        await SearchHistory.collection.createIndex({ query: 'text' });
        await SearchHistory.collection.createIndex({ userId: 1, timestamp: -1 });
        await SearchHistory.collection.createIndex({ timestamp: -1 });

        console.log('✅ Created database indexes');

    } catch (error) {
        console.error('❌ Error creating indexes:', error);
    }
}

async function runMigration() {
    console.log('🚀 Starting Phase 1 Migration...');
    
    await connectToDatabase();
    
    try {
        await migrateProducts();
        await migrateReviews();
        await createDefaultWishlists();
        await createIndexes();
        
        console.log('✅ Phase 1 Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('📝 Database connection closed');
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    runMigration();
}

module.exports = {
    runMigration,
    migrateProducts,
    migrateReviews,
    createDefaultWishlists,
    createIndexes
};
