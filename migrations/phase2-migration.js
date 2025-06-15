/**
 * Phase 2 Migration Script for Tridex E-commerce Platform
 * Sets up PWA, notifications, and advanced e-commerce features
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const Notification = require('../models/Notification');
const User = require('../models/User');
const Product = require('../models/Product');

// MongoDB connection
async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
}

// Create indexes for notifications
async function createNotificationIndexes() {
    try {
        console.log('📊 Creating notification indexes...');
        
        const notificationCollection = mongoose.connection.db.collection('notifications');
        
        // Create indexes
        await notificationCollection.createIndex({ userId: 1, isActive: 1 });
        await notificationCollection.createIndex({ 'subscription.endpoint': 1 }, { unique: true });
        await notificationCollection.createIndex({ lastUsed: 1 });
        await notificationCollection.createIndex({ createdAt: 1 });
        
        console.log('✅ Notification indexes created');
    } catch (error) {
        console.error('❌ Error creating notification indexes:', error);
    }
}

// Add PWA-related fields to users
async function enhanceUserModel() {
    try {
        console.log('👤 Enhancing user model for PWA...');
        
        const users = await User.find({});
        let updatedCount = 0;
        
        for (const user of users) {
            let needsUpdate = false;
            
            // Add PWA preferences if not exists
            if (!user.pwaPreferences) {
                user.pwaPreferences = {
                    installPromptShown: false,
                    installPromptDismissed: false,
                    notificationsEnabled: false,
                    lastInstallPrompt: null
                };
                needsUpdate = true;
            }
            
            // Add analytics fields if not exists
            if (!user.analytics) {
                user.analytics = {
                    lastLogin: user.lastLogin || new Date(),
                    loginCount: 1,
                    deviceInfo: {
                        lastUserAgent: '',
                        lastPlatform: '',
                        preferredLanguage: 'en'
                    },
                    engagement: {
                        searchCount: 0,
                        productViews: 0,
                        cartAdditions: 0,
                        purchases: 0,
                        wishlistAdditions: 0
                    }
                };
                needsUpdate = true;
            }
            
            if (needsUpdate) {
                await user.save();
                updatedCount++;
            }
        }
        
        console.log(`✅ Enhanced ${updatedCount} user records`);
    } catch (error) {
        console.error('❌ Error enhancing user model:', error);
    }
}

// Add PWA-related fields to products
async function enhanceProductModel() {
    try {
        console.log('📦 Enhancing product model for Phase 2...');
        
        const products = await Product.find({});
        let updatedCount = 0;
        
        for (const product of products) {
            let needsUpdate = false;
            
            // Add recommendation fields if not exists
            if (!product.recommendations) {
                product.recommendations = {
                    score: 0,
                    categories: [],
                    tags: product.tags || [],
                    relatedProducts: [],
                    lastUpdated: new Date()
                };
                needsUpdate = true;
            }
            
            // Add analytics fields if not exists
            if (!product.analytics) {
                product.analytics = {
                    dailyViews: 0,
                    weeklyViews: 0,
                    monthlyViews: 0,
                    conversionRate: 0,
                    averageTimeOnPage: 0,
                    bounceRate: 0,
                    lastAnalyticsUpdate: new Date()
                };
                needsUpdate = true;
            }
            
            // Add PWA-specific fields
            if (!product.pwaOptimized) {
                product.pwaOptimized = {
                    offlineAvailable: true,
                    quickActions: [],
                    notificationTriggers: {
                        priceDropEnabled: true,
                        backInStockEnabled: true,
                        promotionEnabled: true
                    }
                };
                needsUpdate = true;
            }
            
            if (needsUpdate) {
                await product.save();
                updatedCount++;
            }
        }
        
        console.log(`✅ Enhanced ${updatedCount} product records`);
    } catch (error) {
        console.error('❌ Error enhancing product model:', error);
    }
}

// Create sample notification preferences for existing users
async function createDefaultNotificationPreferences() {
    try {
        console.log('🔔 Setting up default notification preferences...');
        
        const users = await User.find({});
        let createdCount = 0;
        
        for (const user of users) {
            // Check if user already has notification preferences
            const existingNotification = await Notification.findOne({ userId: user._id });
            
            if (!existingNotification) {
                // Create default notification record (without subscription)
                const defaultNotification = new Notification({
                    userId: user._id,
                    subscription: {
                        endpoint: `placeholder-${user._id}`,
                        keys: {
                            p256dh: 'placeholder',
                            auth: 'placeholder'
                        }
                    },
                    preferences: {
                        orderUpdates: true,
                        promotions: true,
                        newProducts: false,
                        priceDrops: true,
                        backInStock: true,
                        recommendations: false
                    },
                    isActive: false // Will be activated when user actually subscribes
                });
                
                await defaultNotification.save();
                createdCount++;
            }
        }
        
        console.log(`✅ Created ${createdCount} default notification preference records`);
    } catch (error) {
        console.error('❌ Error creating notification preferences:', error);
    }
}

// Create additional indexes for Phase 2 features
async function createPhase2Indexes() {
    try {
        console.log('📊 Creating Phase 2 performance indexes...');
        
        const productCollection = mongoose.connection.db.collection('products');
        const userCollection = mongoose.connection.db.collection('users');
        
        // Product indexes for recommendations and analytics
        await productCollection.createIndex({ 'recommendations.score': -1 });
        await productCollection.createIndex({ 'analytics.conversionRate': -1 });
        await productCollection.createIndex({ 'analytics.dailyViews': -1 });
        await productCollection.createIndex({ 'pwaOptimized.offlineAvailable': 1 });
        
        // User indexes for analytics and PWA
        await userCollection.createIndex({ 'analytics.lastLogin': -1 });
        await userCollection.createIndex({ 'analytics.engagement.purchases': -1 });
        await userCollection.createIndex({ 'pwaPreferences.notificationsEnabled': 1 });
        
        console.log('✅ Phase 2 indexes created');
    } catch (error) {
        console.error('❌ Error creating Phase 2 indexes:', error);
    }
}

// Main migration function
async function runMigration() {
    console.log('🚀 Starting Phase 2 Migration...');
    
    await connectToDatabase();
    
    try {
        await createNotificationIndexes();
        await enhanceUserModel();
        await enhanceProductModel();
        await createDefaultNotificationPreferences();
        await createPhase2Indexes();
        
        console.log('✅ Phase 2 Migration completed successfully!');
        console.log('');
        console.log('📱 PWA Features Ready:');
        console.log('   - Service Worker support');
        console.log('   - Push notifications');
        console.log('   - Offline functionality');
        console.log('   - App installation');
        console.log('');
        console.log('🔔 Notification System Ready:');
        console.log('   - User subscription management');
        console.log('   - Preference controls');
        console.log('   - Analytics tracking');
        console.log('');
        console.log('📊 Enhanced Analytics Ready:');
        console.log('   - User engagement tracking');
        console.log('   - Product performance metrics');
        console.log('   - Recommendation scoring');
        
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
    createNotificationIndexes,
    enhanceUserModel,
    enhanceProductModel,
    createDefaultNotificationPreferences,
    createPhase2Indexes
};
