/**
 * Script to fix coupon start dates that are preventing them from showing
 * Run this script to update coupon start dates to current date
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import the Coupon model
const Coupon = require('./models/Coupon');

async function fixCouponDates() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://adharsh:adharsh@cluster0.qlhqy.mongodb.net/tridex?retryWrites=true&w=majority');
        console.log('✅ Connected to MongoDB');

        // Get current date
        const now = new Date();
        console.log('📅 Current server date:', now.toISOString());

        // Find all coupons with future start dates
        const futureCoupons = await Coupon.find({
            startDate: { $gt: now },
            isActive: true
        });

        console.log(`🔍 Found ${futureCoupons.length} coupons with future start dates:`);
        
        futureCoupons.forEach(coupon => {
            console.log(`  - ${coupon.code}: starts ${coupon.startDate.toISOString()}`);
        });

        if (futureCoupons.length === 0) {
            console.log('✅ No coupons need date fixing');
            return;
        }

        // Update all future coupons to start now
        const updateResult = await Coupon.updateMany(
            { 
                startDate: { $gt: now },
                isActive: true 
            },
            { 
                $set: { startDate: now }
            }
        );

        console.log(`✅ Updated ${updateResult.modifiedCount} coupons to start immediately`);

        // Verify the fix by checking public coupons
        const publicCoupons = await Coupon.find({
            isActive: true,
            isPublic: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
        }).select('code name discountType discountValue startDate endDate');

        console.log(`🎫 Now showing ${publicCoupons.length} public coupons:`);
        publicCoupons.forEach(coupon => {
            console.log(`  - ${coupon.code}: ${coupon.discountType} ${coupon.discountValue}${coupon.discountType === 'percentage' ? '%' : '₹'} OFF`);
        });

    } catch (error) {
        console.error('❌ Error fixing coupon dates:', error);
    } finally {
        await mongoose.disconnect();
        console.log('📤 Disconnected from MongoDB');
    }
}

// Run the fix
fixCouponDates();
