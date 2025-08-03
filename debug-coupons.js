/**
 * Comprehensive Coupon System Debug Script
 * Run this in browser console to diagnose coupon issues
 */

window.debugCoupons = async function() {
    console.log('🔍 Starting Coupon System Debug...');
    console.log('=====================================');

    const results = {
        apiTest: null,
        systemCheck: null,
        domCheck: null,
        cartCheck: null,
        errors: []
    };

    // 1. Test API Endpoint
    console.log('\n📡 Testing API Endpoint...');
    try {
        const response = await fetch('http://localhost:3000/coupons/public');
        const data = await response.json();
        
        results.apiTest = {
            status: response.status,
            ok: response.ok,
            couponsCount: data.coupons?.length || 0,
            coupons: data.coupons || []
        };

        console.log(`✅ API Status: ${response.status}`);
        console.log(`📦 Coupons Found: ${data.coupons?.length || 0}`);
        
        if (data.coupons && data.coupons.length > 0) {
            data.coupons.forEach(coupon => {
                console.log(`  🎫 ${coupon.code}: ${coupon.discountType} ${coupon.discountValue}${coupon.discountType === 'percentage' ? '%' : '₹'} OFF`);
            });
        }
    } catch (error) {
        console.error('❌ API Test Failed:', error);
        results.errors.push(`API Error: ${error.message}`);
    }

    // 2. Check Coupon System
    console.log('\n🔧 Checking Coupon System...');
    results.systemCheck = {
        couponSystemExists: typeof window.couponSystem !== 'undefined',
        couponSystemClass: typeof CouponSystem !== 'undefined',
        availableCoupons: window.couponSystem?.availableCoupons?.length || 0,
        cartData: window.couponSystem?.cartItems?.length || 0,
        cartTotal: window.couponSystem?.cartTotal || 0
    };

    if (window.couponSystem) {
        console.log('✅ Coupon System: Available');
        console.log(`📊 Available Coupons: ${window.couponSystem.availableCoupons?.length || 0}`);
        console.log(`🛒 Cart Items: ${window.couponSystem.cartItems?.length || 0}`);
        console.log(`💰 Cart Total: ₹${window.couponSystem.cartTotal || 0}`);
    } else {
        console.log('❌ Coupon System: Not Available');
        results.errors.push('Coupon System not initialized');
    }

    // 3. Check DOM Elements
    console.log('\n🏗️ Checking DOM Elements...');
    const domElements = {
        couponSection: document.getElementById('coupon-section'),
        couponForm: document.getElementById('coupon-form'),
        couponInput: document.getElementById('coupon-input'),
        couponMessage: document.getElementById('coupon-message'),
        appliedCoupons: document.getElementById('applied-coupons'),
        availableCoupons: document.getElementById('available-coupons')
    };

    results.domCheck = {};
    Object.keys(domElements).forEach(key => {
        const element = domElements[key];
        results.domCheck[key] = element !== null;
        console.log(`${element ? '✅' : '❌'} ${key}: ${element ? 'Found' : 'Missing'}`);
        
        if (!element) {
            results.errors.push(`DOM Element Missing: ${key}`);
        }
    });

    // 4. Check Cart Simulation
    console.log('\n🛒 Testing Cart Simulation...');
    if (window.couponSystem) {
        try {
            const testCartItems = [
                { productId: 'test1', quantity: 1, price: 300 },
                { productId: 'test2', quantity: 1, price: 200 }
            ];
            
            window.couponSystem.setCartData(testCartItems, 500);
            
            results.cartCheck = {
                success: true,
                cartItems: window.couponSystem.cartItems.length,
                cartTotal: window.couponSystem.cartTotal
            };
            
            console.log('✅ Cart Simulation: Success');
            console.log(`📦 Items Set: ${window.couponSystem.cartItems.length}`);
            console.log(`💰 Total Set: ₹${window.couponSystem.cartTotal}`);
        } catch (error) {
            console.error('❌ Cart Simulation Failed:', error);
            results.cartCheck = { success: false, error: error.message };
            results.errors.push(`Cart Simulation Error: ${error.message}`);
        }
    }

    // 5. Force Reload Coupons
    console.log('\n🔄 Force Reloading Coupons...');
    if (window.couponSystem) {
        try {
            await window.couponSystem.loadAvailableCoupons();
            console.log('✅ Coupons Reloaded');
        } catch (error) {
            console.error('❌ Reload Failed:', error);
            results.errors.push(`Reload Error: ${error.message}`);
        }
    }

    // 6. Summary
    console.log('\n📋 Debug Summary');
    console.log('================');
    console.log(`🔗 API Working: ${results.apiTest?.ok ? 'Yes' : 'No'}`);
    console.log(`🔧 System Ready: ${results.systemCheck?.couponSystemExists ? 'Yes' : 'No'}`);
    console.log(`🏗️ DOM Complete: ${Object.values(results.domCheck || {}).every(v => v) ? 'Yes' : 'No'}`);
    console.log(`🛒 Cart Working: ${results.cartCheck?.success ? 'Yes' : 'No'}`);
    console.log(`❌ Errors Found: ${results.errors.length}`);

    if (results.errors.length > 0) {
        console.log('\n🚨 Errors to Fix:');
        results.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`);
        });
    }

    console.log('\n🎯 Next Steps:');
    if (results.apiTest?.couponsCount === 0) {
        console.log('  - Check coupon creation in admin panel');
        console.log('  - Verify coupon start/end dates');
        console.log('  - Ensure isActive and isPublic are true');
    }
    
    if (!results.systemCheck?.couponSystemExists) {
        console.log('  - Check if coupon-system.js is loaded');
        console.log('  - Verify script order in HTML');
    }
    
    if (results.errors.length === 0 && results.apiTest?.couponsCount > 0) {
        console.log('  ✅ Everything looks good! Coupons should be visible.');
    }

    return results;
};

// Auto-run if in test environment
if (window.location.pathname.includes('test-coupons.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            console.log('🧪 Auto-running debug in test environment...');
            window.debugCoupons();
        }, 2000);
    });
}

console.log('🔍 Debug script loaded. Run debugCoupons() in console to start debugging.');
