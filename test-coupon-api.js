/**
 * Test script to verify coupon API with different scenarios
 */

// Use dynamic import for node-fetch in newer Node.js versions
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testCouponAPI() {
    const baseUrl = 'http://localhost:3000';
    
    console.log('🧪 Testing Coupon API...\n');

    // Test 1: No headers (should work)
    console.log('1️⃣ Testing without headers...');
    try {
        const response = await fetch(`${baseUrl}/coupons/public`);
        const data = await response.json();
        console.log(`✅ Status: ${response.status}`);
        console.log(`📦 Coupons: ${data.coupons?.length || 0}`);
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 2: Valid user ID format
    console.log('\n2️⃣ Testing with valid user ID format...');
    try {
        const response = await fetch(`${baseUrl}/coupons/public`, {
            headers: { userid: '507f1f77bcf86cd799439011' } // Valid ObjectId format
        });
        const data = await response.json();
        console.log(`✅ Status: ${response.status}`);
        console.log(`📦 Coupons: ${data.coupons?.length || 0}`);
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 3: Invalid user ID format (this might cause 500 error)
    console.log('\n3️⃣ Testing with invalid user ID format...');
    try {
        const response = await fetch(`${baseUrl}/coupons/public`, {
            headers: { userid: 'invalid-user-id' }
        });
        const data = await response.json();
        console.log(`✅ Status: ${response.status}`);
        console.log(`📦 Coupons: ${data.coupons?.length || 0}`);
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test 4: Empty user ID
    console.log('\n4️⃣ Testing with empty user ID...');
    try {
        const response = await fetch(`${baseUrl}/coupons/public`, {
            headers: { userid: '' }
        });
        const data = await response.json();
        console.log(`✅ Status: ${response.status}`);
        console.log(`📦 Coupons: ${data.coupons?.length || 0}`);
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }

    console.log('\n🏁 Test completed!');
}

// Run if called directly
if (require.main === module) {
    testCouponAPI().catch(console.error);
}

module.exports = testCouponAPI;
