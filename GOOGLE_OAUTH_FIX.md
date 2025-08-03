# Google OAuth 403 Error Fix Guide

## Problem
You're getting a 403 error: "The given origin is not allowed for the given client ID" when trying to use Google OAuth login/signup.

## Root Cause
The current domain/origin is not authorized in the Google Cloud Console for the Google Client ID being used.

## Solution Options

### Option 1: Add Your Domain to Google Cloud Console (Recommended)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project (or the project that owns the Client ID)

2. **Navigate to Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Find your OAuth 2.0 Client ID

3. **Add Authorized Origins**
   - Click on your OAuth 2.0 Client ID
   - In "Authorized JavaScript origins", add your current domain:
     - For local development: `http://localhost:3000`, `http://127.0.0.1:5500`
     - For GitHub Pages: `https://yourusername.github.io`
     - For your custom domain: `https://yourdomain.com`

4. **Save Changes**
   - Click "Save"
   - Wait a few minutes for changes to propagate

### Option 2: Create Your Own Google OAuth Client ID

1. **Create a New Google Cloud Project**
   - Go to https://console.cloud.google.com/
   - Create a new project

2. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" and enable it

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add your authorized origins and redirect URIs

4. **Update Your Code**
   - Replace the Client ID in `login.html` and `signup.html`
   - Update the Client ID in `js/config.js`
   - Update the environment variable in your server

### Option 3: Keep Google OAuth Disabled (Current State)

Google OAuth is currently disabled in your application with a user-friendly message. Users can still:
- Login/signup using the regular forms
- Access all features except Google OAuth

## Current Status

✅ **Fixed Issues:**
- Google OAuth temporarily disabled to prevent 403 errors
- User-friendly message explaining the situation
- Server startup timer simplified (no more 60-second countdown)
- All authentication still works via regular login forms

## Files Modified

1. **login.html**
   - Google OAuth section disabled with informative message
   - Server startup timer simplified
   - Google OAuth JavaScript function commented out

2. **signup.html**
   - Google OAuth section disabled with informative message
   - Server startup timer simplified

## Re-enabling Google OAuth

When you're ready to re-enable Google OAuth:

1. Fix the domain authorization (Option 1 or 2 above)
2. Uncomment the Google OAuth sections in `login.html` and `signup.html`
3. Uncomment the Google OAuth JavaScript functions
4. Test thoroughly

## Testing

After implementing the fix:
1. Try accessing your site from the authorized domain
2. Test Google OAuth login/signup
3. Verify no 403 errors in browser console
4. Test regular login/signup still works

## Support

If you need help:
1. Check the browser console for specific error messages
2. Verify your domain exactly matches what's in Google Cloud Console
3. Make sure you're using the correct Client ID
4. Wait a few minutes after making changes in Google Cloud Console
