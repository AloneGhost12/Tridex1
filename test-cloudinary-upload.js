/**
 * Simple Cloudinary Upload Test
 *
 * This script tests uploading a simple image to Cloudinary using the tridex_products preset.
 */

require('dotenv').config();
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with the credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Test upload using the preset
async function testUpload() {
  console.log('=== Testing Cloudinary Upload ===');
  console.log('Cloud Name available:', !!process.env.CLOUDINARY_CLOUD_NAME);
  console.log('API Key available:', !!process.env.CLOUDINARY_API_KEY);
  console.log('API Secret available:', !!process.env.CLOUDINARY_API_SECRET);

  try {
    // Create a simple test image
    const testUpload = await cloudinary.uploader.upload(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      {
        upload_preset: 'tridex_products',
        public_id: 'test_' + Date.now()
      }
    );

    console.log('✅ Test upload successful!');
    console.log('Image URL:', testUpload.secure_url);
    return true;
  } catch (error) {
    console.log('❌ Test upload failed:', error.message);
    console.log('Error details:', JSON.stringify(error, null, 2));

    // Try with a different preset name (uppercase first letter)
    try {
      console.log('\nTrying with uppercase preset name "Tridex_products"...');
      const testUpload2 = await cloudinary.uploader.upload(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        {
          upload_preset: 'Tridex_products',
          public_id: 'test_uppercase_' + Date.now()
        }
      );

      console.log('✅ Test upload with uppercase preset name successful!');
      console.log('Image URL:', testUpload2.secure_url);
      console.log('\nIMPORTANT: Update your code to use "Tridex_products" (uppercase T) as the preset name.');
      return true;
    } catch (error2) {
      console.log('❌ Test upload with uppercase preset name failed:', error2.message);

      // Try without a preset (using API key and secret directly)
      try {
        console.log('\nTrying direct upload without preset...');
        const testUpload3 = await cloudinary.uploader.upload(
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          {
            folder: 'test_uploads',
            public_id: 'direct_test_' + Date.now()
          }
        );

        console.log('✅ Direct upload successful!');
        console.log('Image URL:', testUpload3.secure_url);
        console.log('\nIMPORTANT: Your API credentials work, but you need to create an upload preset named "tridex_products" in your Cloudinary dashboard.');
        return true;
      } catch (error3) {
        console.log('❌ Direct upload failed:', error3.message);
        console.log('All upload methods failed. Please check your Cloudinary credentials and account settings.');
        return false;
      }
    }
  }
}

// Run the test
testUpload().then(() => {
  console.log('\nTest completed.');
}).catch(error => {
  console.error('An unexpected error occurred:', error);
});
