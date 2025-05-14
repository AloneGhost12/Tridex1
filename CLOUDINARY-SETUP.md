# Cloudinary Setup Guide for Tridex

This guide will help you properly set up Cloudinary for your Tridex e-commerce application.

## Security Notice

If you've received a notification that your Cloudinary API keys were exposed on GitHub, follow these steps immediately:

1. **Revoke your exposed API keys** by visiting [Cloudinary Security Settings](https://cloudinary.com/console/settings/security)
2. **Generate new API keys** from the same page
3. **Update your .env file** with the new credentials
4. **Make sure your .env file is in .gitignore** to prevent future exposure

## Setting Up Cloudinary

### 1. Create a Cloudinary Account

If you don't already have one, sign up for a free Cloudinary account at [cloudinary.com](https://cloudinary.com/users/register/free).

### 2. Get Your Cloudinary Credentials

After signing up or logging in:

1. Go to your [Cloudinary Dashboard](https://cloudinary.com/console)
2. Note your **Cloud Name**, **API Key**, and **API Secret**

### 3. Create an Upload Preset

For secure client-side uploads, you need to create an unsigned upload preset:

1. Go to [Settings > Upload](https://cloudinary.com/console/settings/upload)
2. Scroll down to "Upload presets" and click "Add upload preset"
3. Set the following:
   - **Preset name**: `tridex_products` (must match exactly)
   - **Signing Mode**: Unsigned
   - **Folder**: `product_images` (optional but recommended)
4. Click "Save" to create the preset

### 4. Update Your .env File

Update your `.env` file with your Cloudinary credentials:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Replace `your_cloud_name`, `your_api_key`, and `your_api_secret` with your actual Cloudinary credentials.

### 5. Verify Your Setup

Run the provided setup verification script:

```bash
node setup-cloudinary.js
```

This script will:
- Check if your credentials are properly configured
- Test the connection to Cloudinary
- Verify that the upload preset exists and is configured correctly
- Perform a test upload

## Troubleshooting

### Common Issues

1. **"Unknown API key" Error**
   - Make sure your API key is correct in the .env file
   - Check if your API key has been revoked
   - Generate a new API key if necessary

2. **Upload Fails with 401 Unauthorized**
   - Verify that you've created the `tridex_products` upload preset
   - Ensure the preset is set to "Unsigned" mode
   - Check that you're using the correct cloud name

3. **Images Not Appearing in Cloudinary Media Library**
   - Make sure you're logged into the correct Cloudinary account
   - Check the "product_images" folder in your Media Library
   - Verify that uploads are actually succeeding in the console logs

### Testing Cloudinary Connection

You can test your Cloudinary connection directly from the admin panel:

1. Go to the Admin Panel
2. Click the "Check Cloudinary Connection" button at the top
3. Review the results in the popup dialog

## Best Practices

1. **Never commit your .env file to Git**
   - Add `.env` to your `.gitignore` file
   - Use `.env.example` as a template without real credentials

2. **Use the check-secrets.sh script regularly**
   - Run `bash check-secrets.sh` to scan for exposed credentials
   - Fix any issues it identifies

3. **Use unsigned upload presets for client-side uploads**
   - This avoids exposing your API secret in the frontend code
   - Set appropriate upload restrictions in the preset settings

4. **Set up proper CORS configuration**
   - If you experience cross-origin issues, configure allowed origins in your Cloudinary settings

## Additional Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Cloudinary Node.js SDK](https://cloudinary.com/documentation/node_integration)
- [Cloudinary Upload Widget](https://cloudinary.com/documentation/upload_widget)
- [Cloudinary Security Best Practices](https://cloudinary.com/documentation/security_best_practices)
