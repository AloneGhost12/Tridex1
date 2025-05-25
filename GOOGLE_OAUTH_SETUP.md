# Google OAuth 2.0 Setup Guide for Tridex

This guide will help you set up Google OAuth 2.0 authentication for both sign-up and login functionality in your Tridex application.

## Prerequisites

1. A Google account
2. Access to Google Cloud Console
3. Your Tridex application running

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: "Tridex OAuth"
4. Click "Create"

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google+ API" or "Google Identity"
3. Click on "Google+ API" and click "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" user type
   - Fill in required fields:
     - App name: "Tridex"
     - User support email: your email
     - Developer contact information: your email
   - Add scopes: email, profile, openid
   - Add test users if needed

4. For OAuth client ID:
   - Application type: "Web application"
   - Name: "Tridex Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for local development)
     - `https://aloneghost12.github.io` (for production)
     - `https://your-domain.com` (replace with your actual domain)
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback`
     - `https://aloneghost12.github.io/login.html`
     - `https://aloneghost12.github.io/signup.html`

5. Click "Create"
6. Copy the Client ID (you'll need this)

## Step 4: Update Environment Variables

Create a `.env` file in your project root and add:

```env
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

## Step 5: Update HTML Files

Replace the placeholder Google Client ID in both `login.html` and `signup.html`:

**In login.html (line 64):**
```html
data-client_id="YOUR_ACTUAL_GOOGLE_CLIENT_ID"
```

**In signup.html (line 179):**
```html
data-client_id="YOUR_ACTUAL_GOOGLE_CLIENT_ID"
```

## Step 6: Install Dependencies

Run the following command to install the Google Auth Library:

```bash
npm install google-auth-library
```

## Step 7: Test the Implementation

1. Start your server: `npm start`
2. Open your application in a browser
3. Try signing up with Google
4. Try logging in with Google

## Features Implemented

### Sign-up with Google
- Creates a new user account using Google profile information
- Automatically generates a unique username
- Sets user as verified
- Creates a welcome message
- Redirects to home page after successful signup

### Login with Google
- Authenticates existing users with Google
- Handles banned users appropriately
- Updates user's Google information if needed
- Maintains existing user data
- Redirects to home page after successful login

### Error Handling
- Handles cases where user already exists (signup)
- Handles cases where no account found (login)
- Provides appropriate error messages
- Suggests alternative actions (login vs signup)

## Security Features

1. **Token Verification**: All Google tokens are verified server-side
2. **Email Verification**: Only verified Google emails are accepted
3. **Ban System Integration**: Google users are subject to the same ban system
4. **Secure Storage**: User data is properly stored in MongoDB

## Troubleshooting

### Common Issues:

1. **"Invalid Client ID" Error**
   - Make sure you've replaced the placeholder with your actual Google Client ID
   - Verify the Client ID is correct in Google Cloud Console

2. **"Unauthorized Domain" Error**
   - Add your domain to Authorized JavaScript origins in Google Cloud Console
   - Make sure the domain matches exactly (including http/https)

3. **"Token Verification Failed"**
   - Check that GOOGLE_CLIENT_ID environment variable is set correctly
   - Ensure the google-auth-library package is installed

4. **CORS Issues**
   - Make sure your domain is added to the CORS configuration in server.js
   - Check that the server is running and accessible

## Production Deployment

When deploying to production:

1. Update the Google Client ID in both HTML files
2. Add your production domain to Google Cloud Console
3. Set the GOOGLE_CLIENT_ID environment variable on your server
4. Test thoroughly in the production environment

## Support

If you encounter any issues:
1. Check the browser console for error messages
2. Check the server logs for backend errors
3. Verify all configuration steps have been completed
4. Test with a different Google account

The Google OAuth implementation is now ready for use in your Tridex application!
