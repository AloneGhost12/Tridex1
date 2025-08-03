/**
 * Cloudinary Setup Helper
 *
 * This script helps you set up Cloudinary for your Tridex application.
 * It will:
 * 1. Check if your Cloudinary credentials are properly configured
 * 2. Create the necessary upload presets if they don't exist
 * 3. Test the connection to Cloudinary
 *
 * Usage:
 * 1. Make sure you have Node.js installed
 * 2. Run: node setup-cloudinary.js
 */

require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt user for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Check if Cloudinary credentials are set in .env
async function checkCredentials() {
  console.log('\n=== Checking Cloudinary Credentials ===');

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  let missingCredentials = false;

  if (!cloudName || cloudName === 'your_new_cloud_name') {
    console.log('❌ CLOUDINARY_CLOUD_NAME is not set in your .env file');
    missingCredentials = true;
  } else {
    console.log('✅ CLOUDINARY_CLOUD_NAME is set to:', cloudName);
  }

  if (!apiKey || apiKey === 'your_new_api_key') {
    console.log('❌ CLOUDINARY_API_KEY is not set in your .env file');
    missingCredentials = true;
  } else {
    console.log('✅ CLOUDINARY_API_KEY is set');
  }

  if (!apiSecret || apiSecret === 'your_new_api_secret') {
    console.log('❌ CLOUDINARY_API_SECRET is not set in your .env file');
    missingCredentials = true;
  } else {
    console.log('✅ CLOUDINARY_API_SECRET is set');
  }

  if (missingCredentials) {
    console.log('\n⚠️ Some Cloudinary credentials are missing or using placeholder values.');
    console.log('Please update your .env file with the correct credentials from your Cloudinary dashboard.');

    const updateNow = await prompt('Would you like to enter your Cloudinary credentials now? (y/n): ');

    if (updateNow.toLowerCase() === 'y') {
      const newCloudName = await prompt('Enter your Cloudinary cloud name: ');
      const newApiKey = await prompt('Enter your Cloudinary API key: ');
      const newApiSecret = await prompt('Enter your Cloudinary API secret: ');

      // Update the environment variables for the current session
      process.env.CLOUDINARY_CLOUD_NAME = newCloudName;
      process.env.CLOUDINARY_API_KEY = newApiKey;
      process.env.CLOUDINARY_API_SECRET = newApiSecret;

      console.log('\n✅ Credentials updated for this session.');
      console.log('⚠️ Remember to update your .env file with these values!');

      return true;
    } else {
      console.log('\n⚠️ Please update your .env file before continuing.');
      return false;
    }
  }

  return true;
}

// Test connection to Cloudinary
async function testConnection() {
  console.log('\n=== Testing Cloudinary Connection ===');

  try {
    // Configure Cloudinary with the credentials
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    // Test the connection by getting account info
    const result = await cloudinary.api.ping();

    if (result.status === 'ok') {
      console.log('✅ Successfully connected to Cloudinary!');
      return true;
    } else {
      console.log('❌ Connection test failed:', result);
      return false;
    }
  } catch (error) {
    console.log('❌ Failed to connect to Cloudinary:', error.message);
    return false;
  }
}

// Check if the upload preset exists, create if it doesn't
async function checkUploadPreset() {
  console.log('\n=== Checking Upload Presets ===');

  try {
    // Get all upload presets
    const presetsResponse = await cloudinary.api.upload_presets();
    const presets = presetsResponse.presets || [];

    // Check if tridex_products preset exists
    const tridexPreset = presets.find(preset => preset.name === 'tridex_products');

    if (tridexPreset) {
      console.log('✅ Upload preset "tridex_products" already exists.');

      // Check if it's unsigned
      if (tridexPreset.unsigned) {
        console.log('✅ The preset is correctly set to unsigned mode.');
      } else {
        console.log('⚠️ The preset is not in unsigned mode. This may cause issues with the frontend upload.');

        const updatePreset = await prompt('Would you like to update it to unsigned mode? (y/n): ');

        if (updatePreset.toLowerCase() === 'y') {
          await cloudinary.api.update_upload_preset('tridex_products', {
            unsigned: true,
            folder: 'product_images'
          });
          console.log('✅ Updated preset to unsigned mode.');
        }
      }
    } else {
      console.log('❌ Upload preset "tridex_products" does not exist.');

      const createPreset = await prompt('Would you like to create it now? (y/n): ');

      if (createPreset.toLowerCase() === 'y') {
        try {
          const result = await cloudinary.api.create_upload_preset({
            name: 'tridex_products',
            unsigned: true,
            folder: 'product_images'
          });
          console.log('✅ Created upload preset "tridex_products" in unsigned mode.');
          console.log('Preset details:', JSON.stringify(result, null, 2));
        } catch (createError) {
          console.log('❌ Failed to create preset:', createError.message);
          console.log('Error details:', JSON.stringify(createError, null, 2));
          return false;
        }
      } else {
        console.log('⚠️ The application will not work correctly without this preset.');
      }
    }

    return true;
  } catch (error) {
    console.log('❌ Failed to check upload presets:', error.message);
    console.log('Error details:', JSON.stringify(error, null, 2));

    // If we get a "name has already been taken" error, the preset exists but we couldn't retrieve it
    if (error.error && error.error.message === "name has already been taken") {
      console.log('✅ The preset "tridex_products" already exists but we had trouble retrieving it.');

      // Try to update the preset to make sure it's configured correctly
      console.log('\nAttempting to update the preset...');
      try {
        const result = await cloudinary.api.update_upload_preset('tridex_products', {
          unsigned: true,
          folder: 'product_images'
        });
        console.log('✅ Updated preset "tridex_products" to unsigned mode.');
        console.log('Preset details:', JSON.stringify(result, null, 2));
        return true;
      } catch (updateError) {
        console.log('❌ Failed to update preset:', updateError.message);
        console.log('Error details:', JSON.stringify(updateError, null, 2));

        // Even if update fails, the preset exists, so we can continue
        console.log('Continuing with existing preset...');
        return true;
      }
    } else {
      // For other errors, try to create the preset directly
      console.log('\nAttempting to create preset directly...');
      try {
        const result = await cloudinary.api.create_upload_preset({
          name: 'tridex_products',
          unsigned: true,
          folder: 'product_images'
        });
        console.log('✅ Created upload preset "tridex_products" in unsigned mode.');
        console.log('Preset details:', JSON.stringify(result, null, 2));
        return true;
      } catch (createError) {
        console.log('❌ Failed to create preset directly:', createError.message);
        console.log('Error details:', JSON.stringify(createError, null, 2));
        return false;
      }
    }
  }
}

// Test upload using the preset
async function testUpload() {
  console.log('\n=== Testing Upload with Preset ===');

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
    return false;
  }
}

// Main function
async function main() {
  console.log('=== Cloudinary Setup Helper ===');

  // Check credentials
  const credentialsOk = await checkCredentials();
  if (!credentialsOk) {
    rl.close();
    return;
  }

  // Test connection
  const connectionOk = await testConnection();
  if (!connectionOk) {
    rl.close();
    return;
  }

  // Check upload preset
  const presetOk = await checkUploadPreset();
  if (!presetOk) {
    rl.close();
    return;
  }

  // Test upload
  const uploadOk = await testUpload();

  console.log('\n=== Summary ===');
  console.log('Credentials:', credentialsOk ? '✅' : '❌');
  console.log('Connection:', connectionOk ? '✅' : '❌');
  console.log('Upload Preset:', presetOk ? '✅' : '❌');
  console.log('Test Upload:', uploadOk ? '✅' : '❌');

  if (credentialsOk && connectionOk && presetOk && uploadOk) {
    console.log('\n🎉 Cloudinary is properly configured and ready to use!');
  } else {
    console.log('\n⚠️ There are still some issues with your Cloudinary setup.');
    console.log('Please review the messages above and fix any problems.');
  }

  rl.close();
}

// Run the main function
main().catch(error => {
  console.error('An unexpected error occurred:', error);
  rl.close();
});
