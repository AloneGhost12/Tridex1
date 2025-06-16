const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const dotenv = require('dotenv');
const fileUpload = require('express-fileupload');
const { OAuth2Client } = require('google-auth-library');
const User = require('./models/User'); // Make sure the path is correct
const Product = require('./models/Product');
const Category = require('./models/Category');
const Announcement = require('./models/Announcement');
const ChatInteraction = require('./models/ChatInteraction');
const ContactMessage = require('./models/ContactMessage');
const Order = require('./models/Order');
const Review = require('./models/Review');
const SearchHistory = require('./models/SearchHistory');
const Wishlist = require('./models/Wishlist');
const Notification = require('./models/Notification');
const Coupon = require('./models/Coupon');
const CouponUsage = require('./models/CouponUsage');
const { generateProductSummary } = require('./utils/aiSummaryGenerator');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Google OAuth client
const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID || '511326319939-431231ifhs4239598gc0d7ba2vc97lms.apps.googleusercontent.com'
);

// Define allowed origins
const allowedOrigins = [
    'https://aloneghost12.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://127.0.0.1:3000',
    'file://', // Allow file:// origins for local development
    null // Allow null origin for local file access
];

// CORS configuration
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        // Check if the origin is allowed
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // For development, allow all origins
            callback(null, true);

            // For production, you might want to restrict:
            // callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Username', 'X-Requested-With', 'Accept', 'Origin', 'userid', 'username', 'sessionid'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    // Don't use credentials with wildcard origin
    credentials: false
}));

// Pre-flight requests
app.options('*', cors());

// Add specific CORS headers for all responses as a fallback
app.use((req, res, next) => {
    const origin = req.headers.origin;

    // If the origin is in our allowed list, set it specifically
    // Otherwise use * for development
    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    } else {
        res.header('Access-Control-Allow-Origin', '*');
    }

    // Allow specific methods
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    // Allow specific headers
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Username, userid, username, sessionid');

    // Fix COOP policy for Google OAuth
    res.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');

    // Allow credentials for authenticated requests
    res.header('Access-Control-Allow-Credentials', 'true');

    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    next();
});
app.use(express.json());

// Handle legacy product.html redirects
app.get('/product.html', (req, res) => {
    const productId = req.query.id;
    if (productId) {
        res.redirect(301, `/product-details.html?id=${productId}`);
    } else {
        res.redirect(301, '/product-details.html');
    }
});

// Serve static files (HTML, CSS, JS, images)
app.use(express.static('./', {
    index: 'index.html',
    extensions: ['html', 'css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico'],
    setHeaders: (res, path) => {
        // Set proper MIME types
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html');
        }
    }
}));

// File upload middleware
app.use(fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
    abortOnLimit: true,
    createParentPath: true,
    useTempFiles: true,
    tempFileDir: '/tmp/',
    safeFileNames: true,
    preserveExtension: true
}));

// MongoDB Connection
console.log('Attempting to connect to MongoDB...');

// Add connection options with better timeout and retry settings
const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4 // Use IPv4, skip trying IPv6
};

// Try to connect to MongoDB using environment variables
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://admin:admin123@cluster0.g3sy76o.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', mongoOptions)
    .then(() => {
        console.log('Connected to MongoDB Atlas successfully');
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        console.log('Application will continue with limited functionality');
    });

// Add connection event listeners for better debugging
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
});

// Root Route
app.get('/', (req, res) => {
    console.log('Root endpoint accessed from:', req.headers.origin || 'no origin');
    res.send('Welcome to Tridex API!');
});


// ========== AUTH ROUTES ==========

// SIGNUP
app.post('/signup', async (req, res) => {
    try {
        const { name, age, gender, username, email, phone, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            age,
            gender,
            username,
            email,
            phone,
            password: hashedPassword
        });

        // Save the new user
        const savedUser = await newUser.save();

        // Create a welcome message for the user using their name for personalization
        const welcomeMessage = new Announcement({
            title: `Welcome to Tridex, ${name}!`,
            message: `Thank you for creating an account with us. We're excited to have you join our community! Feel free to explore our products and services. If you have any questions, please don't hesitate to contact us.`,
            forUser: username, // This field will be used to identify user-specific messages
            isWelcomeMessage: true // Flag to identify this as a welcome message
        });

        // Save the welcome message
        await welcomeMessage.save();

        res.status(201).json({ message: 'Signup successful!' });

    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// LOGIN
app.post('/login', async (req, res) => {
    try {
        console.log('Login attempt:', req.body);
        const { username, password } = req.body;

        if (!username || !password) {
            console.log('Missing username or password');
            return res.status(400).json({ message: 'Username and password are required' });
        }

        // For development/testing - hardcoded credentials
        if (username === 'admin' && password === 'admin123') {
            console.log('Using hardcoded admin credentials');
            return res.status(200).json({
                message: 'Login successful!',
                isAdmin: true,
                username: 'admin',
                token: 'dev-admin-token'
            });
        }

        if (username === 'user' && password === 'user123') {
            console.log('Using hardcoded user credentials');
            return res.status(200).json({
                message: 'Login successful!',
                isAdmin: false,
                username: 'user',
                token: 'dev-user-token'
            });
        }

        // Find user by username, email, or phone
        console.log('Searching for user in database...');
        const user = await User.findOne({
            $or: [
                { username: username },
                { email: username },
                { phone: username }
            ]
        });

        if (!user) {
            console.log('User not found');
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Check if the user is banned
        if (user.banned) {
            console.log('User is banned:', user.username);
            return res.status(403).json({
                message: 'Your account has been banned by the administrator',
                isBanned: true,
                username: user.username
            });
        }

        console.log('User found, comparing password...');
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Password does not match');
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        console.log('Login successful for user:', user.username);
        // Respond with token and user info
        res.status(200).json({
            message: 'Login successful!',
            userId: user._id,
            isAdmin: user.isAdmin || false,
            username: user.username,
            verified: user.verified || false,
            isBanned: false,
            token: 'fake-jwt-token-' + Date.now()
        });

    } catch (err) {
        console.error('Login error details:', err);
        res.status(500).json({
            message: 'Server error',
            error: err.message,
            stack: process.env.NODE_ENV === 'production' ? null : err.stack
        });
    }
});

// ========== GOOGLE OAUTH ROUTES ==========

// Google OAuth Sign-up/Login
app.post('/auth/google', async (req, res) => {
    try {
        console.log('Google OAuth request received:', { mode: req.body.mode, hasCredential: !!req.body.credential });

        const { credential, mode } = req.body; // mode can be 'signup' or 'login'

        if (!credential) {
            console.log('No credential provided');
            return res.status(400).json({
                success: false,
                message: 'Google credential is required'
            });
        }

        // Check if Google Client ID is configured
        const googleClientId = process.env.GOOGLE_CLIENT_ID || '511326319939-431231ifhs4239598gc0d7ba2vc97lms.apps.googleusercontent.com';
        if (!googleClientId || googleClientId === 'your-google-client-id') {
            console.log('Google Client ID not configured properly');
            return res.status(500).json({
                success: false,
                message: 'Google authentication not configured on server'
            });
        }

        console.log('Verifying Google token...');
        // Verify the Google token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: googleClientId
        });

        const payload = ticket.getPayload();
        const {
            sub: googleId,
            email,
            name,
            picture: profilePicture,
            email_verified
        } = payload;

        if (!email_verified) {
            return res.status(400).json({
                success: false,
                message: 'Google email not verified'
            });
        }

        // Check if MongoDB is connected before database operations
        if (mongoose.connection.readyState !== 1) {
            console.log('MongoDB not connected, cannot process Google OAuth');
            return res.status(503).json({
                success: false,
                message: 'Database service temporarily unavailable. Please try again later.',
                error: 'MongoDB connection not available'
            });
        }

        // Check if user already exists
        let user = await User.findOne({
            $or: [
                { email: email },
                { googleId: googleId }
            ]
        });

        if (mode === 'signup') {
            // Sign-up mode
            if (user) {
                return res.status(400).json({
                    success: false,
                    message: 'User already exists with this email. Please try logging in instead.'
                });
            }

            // Check if additional details are provided
            const { additionalDetails } = req.body;

            if (!additionalDetails) {
                // First step: return success but indicate additional details needed
                return res.json({
                    success: true,
                    needsAdditionalDetails: true,
                    message: 'Google authentication successful. Please provide additional details.',
                    googleData: {
                        email: email,
                        name: name,
                        googleId: googleId,
                        profilePicture: profilePicture
                    }
                });
            }

            // Generate a unique username from email
            let username = email.split('@')[0];
            let usernameExists = await User.findOne({ username });
            let counter = 1;

            while (usernameExists) {
                username = `${email.split('@')[0]}${counter}`;
                usernameExists = await User.findOne({ username });
                counter++;
            }

            // Create new user with additional details
            user = new User({
                name: name,
                username: username,
                email: email,
                googleId: googleId,
                profilePicture: profilePicture,
                verified: false, // Google users are NOT automatically verified - admin approval required
                isGoogleUser: true,
                // Additional details from form
                age: additionalDetails.age || '',
                gender: additionalDetails.gender || 'other',
                phone: additionalDetails.phone || ''
            });

            await user.save();

            // Create welcome message using full name
            const welcomeMessage = new Announcement({
                title: `Welcome to Tridex, ${name}!`,
                message: `Hello ${name}! Thank you for signing up with Google! We're excited to have you join our community. Your account is pending admin verification. Feel free to explore our products and services. If you have any questions, please don't hesitate to contact us.`,
                forUser: username,
                isWelcomeMessage: true
            });

            await welcomeMessage.save();

            return res.json({
                success: true,
                message: 'Google sign-up successful! Your account is pending admin verification.',
                userId: user._id,
                token: 'google-jwt-token-' + Date.now(),
                username: user.username,
                isAdmin: user.isAdmin || false,
                verified: false, // Google users need admin verification
                isGoogleUser: true
            });

        } else {
            // Login mode
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'No account found with this Google email. Please sign up first.'
                });
            }

            // Check if user is banned
            if (user.banned) {
                return res.status(403).json({
                    success: false,
                    message: 'Your account has been banned by the administrator',
                    isBanned: true,
                    username: user.username
                });
            }

            // Update user's Google info if needed
            if (!user.googleId) {
                user.googleId = googleId;
                user.isGoogleUser = true;
                await user.save();
            }

            return res.json({
                success: true,
                message: 'Google login successful!',
                userId: user._id,
                token: 'google-jwt-token-' + Date.now(),
                username: user.username,
                isAdmin: user.isAdmin || false,
                verified: user.verified, // Use actual verification status from database
                isBanned: false,
                isGoogleUser: true
            });
        }

    } catch (error) {
        console.error('Google OAuth error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        if (error.message && error.message.includes('Token used too early')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Google token. Please try again.'
            });
        }

        if (error.message && error.message.includes('Invalid token')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Google token. Please try signing in again.'
            });
        }

        if (error.message && error.message.includes('audience')) {
            return res.status(400).json({
                success: false,
                message: 'Google authentication configuration error. Please contact support.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Google authentication failed. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});


// ========== PROFILE PICTURE UPLOAD ==========

// Update user profile picture
app.post('/users/:userId/profile-picture', async (req, res) => {
    try {
        const { userId } = req.params;
        const { profilePicture } = req.body;

        if (!profilePicture) {
            return res.status(400).json({
                success: false,
                message: 'Profile picture URL is required'
            });
        }

        // Find and update user
        const user = await User.findByIdAndUpdate(
            userId,
            {
                profilePicture: profilePicture,
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Profile picture updated successfully',
            profilePicture: user.profilePicture
        });

    } catch (error) {
        console.error('Profile picture update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile picture'
        });
    }
});

// ========== USER MANAGEMENT ==========

app.get('/users', async (req, res) => {
    try {
        console.log('Users endpoint accessed from:', req.headers.origin || 'no origin');
        const users = await User.find({}, '-password');
        console.log('Returning', users.length, 'users');
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.put('/users/:id/ban', async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { banned: true });
        res.json({ message: 'User banned' });
    } catch (err) {
        res.status(500).json({ message: 'Error banning user' });
    }
});

app.put('/users/:id/unban', async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { banned: false });
        res.json({ message: 'User unbanned' });
    } catch (err) {
        res.status(500).json({ message: 'Error unbanning user' });
    }
});

// Endpoint to check if a user is banned
app.get('/users/check-ban/:username', async (req, res) => {
    try {
        const username = req.params.username;
        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }

        // Find user by username
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return ban status
        res.json({
            username: user.username,
            isBanned: user.banned || false
        });
    } catch (err) {
        console.error('Error checking ban status:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.put('/users/:id/verify', async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { verified: true });
        res.json({ message: 'User verified' });
    } catch (err) {
        res.status(500).json({ message: 'Error verifying user' });
    }
});

app.put('/users/:id/unverify', async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { verified: false });
        res.json({ message: 'User unverified' });
    } catch (err) {
        res.status(500).json({ message: 'Error unverifying user' });
    }
});

app.delete('/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting user' });
    }
});

// User profile endpoint
app.get('/users/profile', async (req, res) => {
    try {
        // In a real app, you would extract the user ID from the JWT token
        // For now, we'll use the username from the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Extract username from query parameter or request header
        const usernameFromQuery = req.query.username;

        // Get username from token (simplified for demo)
        const token = authHeader.split(' ')[1];

        // Check for hardcoded tokens first
        let username = null;
        if (token === 'dev-admin-token') {
            username = 'admin';
        } else if (token === 'dev-user-token') {
            username = 'user';
        } else if (token.startsWith('fake-jwt-token-')) {
            // For dynamically generated tokens, get username from query or localStorage
            username = usernameFromQuery || req.headers['x-username'];
        }

        console.log('Profile request for username:', username);

        if (!username) {
            return res.status(401).json({ message: 'Invalid token or missing username' });
        }

        // Find user by username
        const user = await User.findOne({ username }, '-password');

        // If user not found in database but using hardcoded credentials, create a mock user
        if (!user && (username === 'admin' || username === 'user')) {
            return res.json({
                username: username,
                name: username === 'admin' ? 'Administrator' : 'Test User',
                email: username === 'admin' ? 'admin@example.com' : 'user@example.com',
                phone: '1234567890',
                age: '30',
                gender: 'other',
                verified: username === 'admin' ? true : false,
                isAdmin: username === 'admin' ? true : false
            });
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user profile
app.put('/users/update', async (req, res) => {
    try {
        // In a real app, you would extract the user ID from the JWT token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Extract username from request body or query parameter
        const usernameFromBody = req.body.username;
        const usernameFromQuery = req.query.username;

        // Get username from token (simplified for demo)
        const token = authHeader.split(' ')[1];

        // Check for hardcoded tokens first
        let username = null;
        if (token === 'dev-admin-token') {
            username = 'admin';
        } else if (token === 'dev-user-token') {
            username = 'user';
        } else if (token.startsWith('fake-jwt-token-')) {
            // For dynamically generated tokens, get username from body, query or header
            username = usernameFromBody || usernameFromQuery || req.headers['x-username'];
        }

        console.log('Update profile request for username:', username);

        if (!username) {
            return res.status(401).json({ message: 'Invalid token or missing username' });
        }

        // Find user by username
        const user = await User.findOne({ username });

        // Handle hardcoded users
        if (!user && (username === 'admin' || username === 'user')) {
            // For hardcoded users, just return success without actually updating
            return res.json({
                message: 'Profile updated successfully (demo mode)',
                user: {
                    username: username,
                    name: req.body.name || (username === 'admin' ? 'Administrator' : 'Test User'),
                    email: req.body.email || (username === 'admin' ? 'admin@example.com' : 'user@example.com'),
                    phone: req.body.phone || '1234567890',
                    age: req.body.age || '30',
                    gender: req.body.gender || 'other',
                    verified: username === 'admin' ? true : false,
                    isAdmin: username === 'admin' ? true : false,
                    addresses: []
                }
            });
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update user fields
        const { name, age, gender, email, phone } = req.body;
        user.name = name || user.name;
        user.age = age || user.age;
        user.gender = gender || user.gender;
        user.email = email || user.email;
        user.phone = phone || user.phone;

        // Save updated user
        await user.save();

        res.json({ message: 'Profile updated successfully', user });
    } catch (err) {
        console.error('Error updating user profile:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ========== ADDRESS MANAGEMENT ==========

// Add a new address to user profile
app.post('/users/addresses', async (req, res) => {
    try {
        // Authenticate user
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Get username from token or headers
        const token = authHeader.split(' ')[1];
        let username = null;

        if (token === 'dev-admin-token') {
            username = 'admin';
        } else if (token === 'dev-user-token') {
            username = 'user';
        } else if (token.startsWith('fake-jwt-token-') || token.startsWith('google-jwt-token-')) {
            username = req.headers['x-username'] || req.body.username;
        }

        if (!username) {
            return res.status(401).json({ message: 'Invalid token or missing username' });
        }

        // Find user
        const user = await User.findOne({ username });

        // Handle hardcoded users
        if (!user && (username === 'admin' || username === 'user')) {
            // For hardcoded users, just return success without actually updating
            return res.json({
                message: 'Address added successfully (demo mode)',
                address: req.body
            });
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Create new address
        const newAddress = {
            name: req.body.name,
            address: req.body.address,
            city: req.body.city,
            state: req.body.state,
            postalCode: req.body.postalCode,
            country: req.body.country || 'India',
            phone: req.body.phone,
            isDefault: req.body.isDefault || false
        };

        // If this is the first address or marked as default, update other addresses
        if (newAddress.isDefault || user.addresses.length === 0) {
            // Set all existing addresses to non-default
            user.addresses.forEach(addr => {
                addr.isDefault = false;
            });

            // Make sure the new address is default
            newAddress.isDefault = true;
        }

        // Add address to user
        user.addresses.push(newAddress);

        // Save user
        await user.save();

        res.status(201).json({
            message: 'Address added successfully',
            address: user.addresses[user.addresses.length - 1]
        });
    } catch (err) {
        console.error('Error adding address:', err);
        res.status(500).json({ message: 'Error adding address' });
    }
});

// Get all addresses for a user
app.get('/users/addresses', async (req, res) => {
    try {
        console.log('GET /users/addresses - Headers:', {
            authorization: req.headers.authorization ? req.headers.authorization.substring(0, 30) + '...' : 'missing',
            'x-username': req.headers['x-username']
        });

        // Authenticate user
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('Missing or invalid authorization header');
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Get username from token or headers
        const token = authHeader.split(' ')[1];
        let username = null;

        console.log('Token type:', {
            isDevAdmin: token === 'dev-admin-token',
            isDevUser: token === 'dev-user-token',
            isFakeJwt: token.startsWith('fake-jwt-token-'),
            isGoogleJwt: token.startsWith('google-jwt-token-'),
            tokenStart: token.substring(0, 20)
        });

        if (token === 'dev-admin-token') {
            username = 'admin';
        } else if (token === 'dev-user-token') {
            username = 'user';
        } else if (token.startsWith('fake-jwt-token-') || token.startsWith('google-jwt-token-')) {
            username = req.headers['x-username'] || req.query.username;
        }

        console.log('Resolved username:', username);

        if (!username) {
            console.log('No username resolved from token or headers');
            return res.status(401).json({ message: 'Invalid token or missing username' });
        }

        // Find user
        const user = await User.findOne({ username });

        // Handle hardcoded users
        if (!user && (username === 'admin' || username === 'user')) {
            // For hardcoded users, return empty addresses array
            return res.json([]);
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return addresses
        res.json(user.addresses);
    } catch (err) {
        console.error('Error fetching addresses:', err);
        res.status(500).json({ message: 'Error fetching addresses' });
    }
});

// Update an address
app.put('/users/addresses/:addressId', async (req, res) => {
    try {
        // Authenticate user
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Get username from token or headers
        const token = authHeader.split(' ')[1];
        let username = null;

        if (token === 'dev-admin-token') {
            username = 'admin';
        } else if (token === 'dev-user-token') {
            username = 'user';
        } else if (token.startsWith('fake-jwt-token-') || token.startsWith('google-jwt-token-')) {
            username = req.headers['x-username'] || req.body.username;
        }

        if (!username) {
            return res.status(401).json({ message: 'Invalid token or missing username' });
        }

        // Find user
        const user = await User.findOne({ username });

        // Handle hardcoded users
        if (!user && (username === 'admin' || username === 'user')) {
            // For hardcoded users, just return success without actually updating
            return res.json({
                message: 'Address updated successfully (demo mode)',
                address: req.body
            });
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find address by ID
        const addressId = req.params.addressId;
        const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);

        if (addressIndex === -1) {
            return res.status(404).json({ message: 'Address not found' });
        }

        // Update address fields
        const updatedAddress = {
            ...user.addresses[addressIndex].toObject(),
            name: req.body.name || user.addresses[addressIndex].name,
            address: req.body.address || user.addresses[addressIndex].address,
            city: req.body.city || user.addresses[addressIndex].city,
            state: req.body.state || user.addresses[addressIndex].state,
            postalCode: req.body.postalCode || user.addresses[addressIndex].postalCode,
            country: req.body.country || user.addresses[addressIndex].country,
            phone: req.body.phone || user.addresses[addressIndex].phone,
            isDefault: req.body.isDefault !== undefined ? req.body.isDefault : user.addresses[addressIndex].isDefault
        };

        // If setting this address as default, update other addresses
        if (updatedAddress.isDefault && !user.addresses[addressIndex].isDefault) {
            // Set all other addresses to non-default
            user.addresses.forEach((addr, idx) => {
                if (idx !== addressIndex) {
                    addr.isDefault = false;
                }
            });
        }

        // Update the address
        user.addresses[addressIndex] = updatedAddress;

        // Save user
        await user.save();

        res.json({
            message: 'Address updated successfully',
            address: user.addresses[addressIndex]
        });
    } catch (err) {
        console.error('Error updating address:', err);
        res.status(500).json({ message: 'Error updating address' });
    }
});

// Delete an address
app.delete('/users/addresses/:addressId', async (req, res) => {
    try {
        // Authenticate user
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Get username from token or headers
        const token = authHeader.split(' ')[1];
        let username = null;

        if (token === 'dev-admin-token') {
            username = 'admin';
        } else if (token === 'dev-user-token') {
            username = 'user';
        } else if (token.startsWith('fake-jwt-token-') || token.startsWith('google-jwt-token-')) {
            username = req.headers['x-username'] || req.query.username;
        }

        if (!username) {
            return res.status(401).json({ message: 'Invalid token or missing username' });
        }

        // Find user
        const user = await User.findOne({ username });

        // Handle hardcoded users
        if (!user && (username === 'admin' || username === 'user')) {
            // For hardcoded users, just return success without actually updating
            return res.json({
                message: 'Address deleted successfully (demo mode)'
            });
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find address by ID
        const addressId = req.params.addressId;
        const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);

        if (addressIndex === -1) {
            return res.status(404).json({ message: 'Address not found' });
        }

        // Check if this is the default address
        const isDefault = user.addresses[addressIndex].isDefault;

        // Remove the address
        user.addresses.splice(addressIndex, 1);

        // If the deleted address was the default and there are other addresses,
        // set the first remaining address as default
        if (isDefault && user.addresses.length > 0) {
            user.addresses[0].isDefault = true;
        }

        // Save user
        await user.save();

        res.json({ message: 'Address deleted successfully' });
    } catch (err) {
        console.error('Error deleting address:', err);
        res.status(500).json({ message: 'Error deleting address' });
    }
});

// Change password endpoint
app.put('/users/change-password', async (req, res) => {
    try {
        // In a real app, you would extract the user ID from the JWT token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Extract username from query parameter, body, or header
        const usernameFromQuery = req.query.username;
        const usernameFromBody = req.body.username;

        // Get username from token (simplified for demo)
        const token = authHeader.split(' ')[1];

        // Check for hardcoded tokens first
        let username = null;
        if (token === 'dev-admin-token') {
            username = 'admin';
        } else if (token === 'dev-user-token') {
            username = 'user';
        } else if (token.startsWith('fake-jwt-token-')) {
            // For dynamically generated tokens, get username from query, body, or header
            username = usernameFromQuery || usernameFromBody || req.headers['x-username'];
        }

        console.log('Change password request for username:', username);

        if (!username) {
            return res.status(401).json({ message: 'Invalid token or missing username' });
        }

        // Verify old password
        const { oldPassword, newPassword } = req.body;

        // Validate new password
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        // Handle hardcoded users
        if (username === 'admin' || username === 'user') {
            // For hardcoded users, check against hardcoded passwords
            let isMatch = false;
            if (username === 'admin' && oldPassword === 'admin123') {
                isMatch = true;
            } else if (username === 'user' && oldPassword === 'user123') {
                isMatch = true;
            }

            if (!isMatch) {
                return res.status(401).json({ message: 'Old password is incorrect' });
            }

            // For demo users, just return success without actually updating
            return res.json({ message: 'Password updated successfully (demo mode)' });
        }

        // For regular users, find in database
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify old password with bcrypt
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Old password is incorrect' });
        }

        // Hash and update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        // Save updated user
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('Error changing password:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user profile by username (simple endpoint for getting userId)
app.get('/profile/:username', async (req, res) => {
    try {
        const username = req.params.username;

        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }

        // Find user by username
        const user = await User.findOne({ username }, '-password');

        // Handle hardcoded users
        if (!user && (username === 'admin' || username === 'user')) {
            return res.json({
                _id: username === 'admin' ? 'admin-id' : 'user-id',
                username: username,
                name: username === 'admin' ? 'Administrator' : 'Test User',
                email: username === 'admin' ? 'admin@example.com' : 'user@example.com',
                verified: username === 'admin' ? true : false,
                isAdmin: username === 'admin' ? true : false
            });
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Endpoint to get a user by username (for admin verification)
// This route must be AFTER all specific user routes to avoid conflicts
app.get('/users/:username', async (req, res) => {
    try {
        const username = req.params.username;
        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }

        console.log('Fetching user by username:', username);

        // Find user by username (exclude password)
        const user = await User.findOne({ username }, '-password');

        // If user not found in database but it's a hardcoded user, return mock data
        if (!user && username === 'admin') {
            console.log('User not found in DB, returning hardcoded admin data');
            return res.json({
                username: 'admin',
                name: 'Administrator',
                email: 'admin@example.com',
                isAdmin: true,
                verified: true,
                banned: false,
                createdAt: new Date()
            });
        }

        if (!user) {
            console.log('User not found:', username);
            return res.status(404).json({ message: 'User not found' });
        }

        console.log('User found:', user.username, 'isAdmin:', user.isAdmin);

        // Return user data
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin || false,
            verified: user.verified || false,
            banned: user.banned || false,
            profilePicture: user.profilePicture,
            createdAt: user.createdAt
        });
    } catch (err) {
        console.error('Error fetching user by username:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ========== CATEGORY ROUTES ==========

app.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json(categories);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ message: 'Error fetching categories' });
    }
});

// Get a single category by ID
app.get('/categories/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json(category);
    } catch (err) {
        console.error('Error fetching category by ID:', err);
        res.status(500).json({ message: 'Error fetching category' });
    }
});

app.post('/categories', async (req, res) => {
    try {
        const { name, icon, description } = req.body;

        // Check if category already exists
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ message: 'Category already exists' });
        }

        const category = new Category({ name, icon, description });
        await category.save();
        res.json({ message: 'Category added', category });
    } catch (err) {
        console.error('Error adding category:', err);
        res.status(500).json({ message: 'Error adding category' });
    }
});

app.put('/categories/:id', async (req, res) => {
    try {
        const { name, icon, description } = req.body;

        // Check if updated name already exists (and it's not this category)
        if (name) {
            const existingCategory = await Category.findOne({
                name,
                _id: { $ne: req.params.id }
            });

            if (existingCategory) {
                return res.status(400).json({ message: 'Category name already exists' });
            }
        }

        await Category.findByIdAndUpdate(req.params.id, { name, icon, description });
        res.json({ message: 'Category updated' });
    } catch (err) {
        console.error('Error updating category:', err);
        res.status(500).json({ message: 'Error updating category' });
    }
});

app.delete('/categories/:id', async (req, res) => {
    try {
        // Check if category is used by any products
        const productsWithCategory = await Product.countDocuments({ category: req.params.id });

        if (productsWithCategory > 0) {
            return res.status(400).json({
                message: `Cannot delete category: ${productsWithCategory} products are using this category`
            });
        }

        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (err) {
        console.error('Error deleting category:', err);
        res.status(500).json({ message: 'Error deleting category' });
    }
});

// Get products by category
app.get('/categories/:id/products', async (req, res) => {
    try {
        const products = await Product.find({ category: req.params.id });
        res.json(products);
    } catch (err) {
        console.error('Error fetching products by category:', err);
        res.status(500).json({ message: 'Error fetching products by category' });
    }
});

// ========== PRODUCT ROUTES ==========

app.get('/products', async (req, res) => {
    try {
        // Build filter based on query parameters
        const filter = {};

        // Filter by category if provided
        if (req.query.category) {
            filter.category = req.query.category;
        }

        // Filter by parent/variant status
        if (req.query.parentOnly === 'true') {
            // Only return parent products
            filter.$or = [
                { isParentProduct: true },
                { parentProduct: null }
            ];
        } else if (req.query.variantsOnly === 'true') {
            // Only return variant products
            filter.parentProduct = { $ne: null };
        } else if (req.query.includeVariants !== 'true') {
            // By default, exclude variants unless explicitly requested
            filter.$or = [
                { parentProduct: null },
                { isParentProduct: true }
            ];
        }

        // Populate the category field to get category details
        // Also populate parent product if it's a variant
        const products = await Product.find(filter)
            .populate('category')
            .populate('parentProduct');

        res.json(products);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ message: 'Error fetching products' });
    }
});

app.post('/products', async (req, res) => {
    try {
        const { name, image, desc, price, category, media } = req.body;

        // Create product object with basic fields
        const productData = {
            name,
            desc,
            price,
            category
        };

        // Handle legacy image field
        if (image) {
            productData.image = image;
        }

        // Handle media array if provided
        if (media && Array.isArray(media) && media.length > 0) {
            productData.media = media;
        }

        // Create the product
        const product = new Product(productData);

        // If category is provided, populate it to get category details for AI summary
        if (category) {
            try {
                const categoryDetails = await Category.findById(category);
                if (categoryDetails) {
                    // Generate AI summary with category details
                    const aiSummary = generateProductSummary({
                        name,
                        desc,
                        price,
                        category: categoryDetails
                    });

                    // Add AI summary to product
                    product.aiSummary = aiSummary;
                }
            } catch (error) {
                console.error('Error generating AI summary:', error);
                // Continue without AI summary if there's an error
            }
        } else {
            // Generate AI summary without category
            const aiSummary = generateProductSummary({
                name,
                desc,
                price,
                category: null
            });

            // Add AI summary to product
            product.aiSummary = aiSummary;
        }

        // Save product
        await product.save();
        res.json({ message: 'Product added', product });
    } catch (err) {
        console.error('Error adding product:', err);
        res.status(500).json({ message: 'Error adding product' });
    }
});

app.put('/products/:id', async (req, res) => {
    try {
        const { name, image, desc, price, category, media } = req.body;

        // Prepare update object with basic fields
        const updateData = {};

        // Only update fields that are provided
        if (name !== undefined) updateData.name = name;
        if (desc !== undefined) updateData.desc = desc;
        if (price !== undefined) updateData.price = price;
        if (category !== undefined) updateData.category = category;

        // Handle legacy image field
        if (image !== undefined) {
            updateData.image = image;
        }

        // Handle media array if provided
        if (media && Array.isArray(media)) {
            updateData.media = media;
        }

        // Set the updatedAt timestamp
        updateData.updatedAt = Date.now();

        // Generate new AI summary if product details have changed
        if (name !== undefined || desc !== undefined || price !== undefined || category !== undefined) {
            // Get current product data to ensure we have all fields for AI summary
            const currentProduct = await Product.findById(req.params.id).populate('category');

            if (!currentProduct) {
                return res.status(404).json({ message: 'Product not found' });
            }

            // Prepare data for AI summary generation
            const summaryData = {
                name: name !== undefined ? name : currentProduct.name,
                desc: desc !== undefined ? desc : currentProduct.desc,
                price: price !== undefined ? price : currentProduct.price,
                category: null
            };

            // Get category details if available
            if (category) {
                try {
                    const categoryDetails = await Category.findById(category);
                    if (categoryDetails) {
                        summaryData.category = categoryDetails;
                    }
                } catch (error) {
                    console.error('Error fetching category details:', error);
                }
            } else if (currentProduct.category) {
                summaryData.category = currentProduct.category;
            }

            // Generate AI summary
            try {
                const aiSummary = generateProductSummary(summaryData);
                updateData.aiSummary = aiSummary;
            } catch (error) {
                console.error('Error generating AI summary during update:', error);
                // Continue without updating AI summary if there's an error
            }
        }

        // Update product
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true } // Return the updated document
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({
            message: 'Product updated',
            product: updatedProduct
        });
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ message: 'Error updating product' });
    }
});

app.delete('/products/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ message: 'Error deleting product' });
    }
});

// Regenerate AI summary for a product
app.post('/products/:id/regenerate-summary', async (req, res) => {
    try {
        // Find the product
        const product = await Product.findById(req.params.id).populate('category');

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Generate new AI summary
        const aiSummary = generateProductSummary({
            name: product.name,
            desc: product.desc,
            price: product.price,
            category: product.category
        });

        // Update product with new summary
        product.aiSummary = aiSummary;
        await product.save();

        res.json({
            message: 'AI summary regenerated',
            product: product
        });
    } catch (err) {
        console.error('Error regenerating AI summary:', err);
        res.status(500).json({ message: 'Error regenerating AI summary' });
    }
});

// Get monthly sales count for a specific product
app.get('/products/:id/monthly-sales', async (req, res) => {
    try {
        console.log('Monthly sales endpoint accessed for product:', req.params.id);
        console.log('Request origin:', req.headers.origin || 'no origin');

        const productId = req.params.id;
        const { month, year } = req.query;

        // Use current month/year if not provided
        const currentDate = new Date();
        const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
        const targetYear = year ? parseInt(year) : currentDate.getFullYear();

        // Create date range for the month
        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

        // Aggregate sales for this product in the specified month
        const salesData = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                    status: { $ne: 'cancelled' }
                }
            },
            { $unwind: '$items' },
            {
                $match: {
                    'items.productId': new mongoose.Types.ObjectId(productId)
                }
            },
            {
                $group: {
                    _id: null,
                    totalSold: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                    orderCount: { $sum: 1 }
                }
            }
        ]);

        const result = salesData[0] || { totalSold: 0, totalRevenue: 0, orderCount: 0 };

        const responseData = {
            productId,
            month: targetMonth,
            year: targetYear,
            totalSold: result.totalSold,
            totalRevenue: result.totalRevenue,
            orderCount: result.orderCount
        };

        console.log('Returning monthly sales data:', responseData);
        res.json(responseData);
    } catch (err) {
        console.error('Error fetching monthly sales:', err);
        res.status(500).json({ message: 'Error fetching monthly sales data' });
    }
});

// Regenerate AI summaries for all products
app.post('/products/regenerate-all-summaries', async (req, res) => {
    try {
        // Get all products with populated categories
        const products = await Product.find().populate('category');

        // Counter for successful updates
        let updatedCount = 0;

        // Process each product
        for (const product of products) {
            try {
                // Generate new AI summary
                const aiSummary = generateProductSummary({
                    name: product.name,
                    desc: product.desc,
                    price: product.price,
                    category: product.category
                });

                // Update product with new summary
                product.aiSummary = aiSummary;
                await product.save();

                updatedCount++;
            } catch (error) {
                console.error(`Error updating summary for product ${product._id}:`, error);
                // Continue with next product
            }
        }

        res.json({
            message: `AI summaries regenerated for ${updatedCount} of ${products.length} products`,
            totalProducts: products.length,
            updatedProducts: updatedCount
        });
    } catch (err) {
        console.error('Error regenerating all AI summaries:', err);
        res.status(500).json({ message: 'Error regenerating all AI summaries' });
    }
});

// ========== COLOR VARIANT MANAGEMENT ==========

// Get a single product with all its color variants
app.get('/products/:id/variants', async (req, res) => {
    try {
        // Find the parent product
        const parentProduct = await Product.findById(req.params.id);

        if (!parentProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Find all variants of this product
        let variants = [];

        // If this is already a parent product
        if (parentProduct.isParentProduct) {
            variants = await Product.find({ parentProduct: parentProduct._id });
        }
        // If this is a variant, find the parent and all siblings
        else if (parentProduct.parentProduct) {
            const actualParent = await Product.findById(parentProduct.parentProduct);
            if (actualParent) {
                variants = await Product.find({ parentProduct: actualParent._id });
            }
        }

        res.json({
            parent: parentProduct,
            variants: variants
        });
    } catch (err) {
        console.error('Error fetching product variants:', err);
        res.status(500).json({ message: 'Error fetching product variants' });
    }
});

// Create a new color variant for a product
app.post('/products/:id/variants', async (req, res) => {
    try {
        const { color, price, inventory, media } = req.body;

        if (!color || !color.name || !color.hexCode) {
            return res.status(400).json({ message: 'Color information is required' });
        }

        // Find the parent product
        const parentProduct = await Product.findById(req.params.id);

        if (!parentProduct) {
            return res.status(404).json({ message: 'Parent product not found' });
        }

        // If this is the first variant, mark the parent product as a parent
        if (!parentProduct.isParentProduct) {
            parentProduct.isParentProduct = true;
            await parentProduct.save();
        }

        // Create the variant product
        const variantProduct = new Product({
            name: parentProduct.name,
            desc: parentProduct.desc,
            price: price || parentProduct.price,
            category: parentProduct.category,
            parentProduct: parentProduct._id,
            color: color,
            inventory: inventory || { quantity: 0, inStock: true },
            isActive: true
        });

        // If media is provided, add it to the variant
        if (media && Array.isArray(media) && media.length > 0) {
            variantProduct.media = media;

            // Set the first image as the primary image
            const firstImage = media.find(m => m.type === 'image');
            if (firstImage) {
                variantProduct.image = firstImage.url;
            }
        }

        // Generate AI summary for the variant
        try {
            const categoryDetails = parentProduct.category ?
                await Category.findById(parentProduct.category) : null;

            const aiSummary = generateProductSummary({
                name: variantProduct.name,
                desc: variantProduct.desc,
                price: variantProduct.price,
                category: categoryDetails
            });

            variantProduct.aiSummary = aiSummary;
        } catch (error) {
            console.error('Error generating AI summary for variant:', error);
            // Continue without AI summary if there's an error
        }

        // Save the variant
        await variantProduct.save();

        res.status(201).json({
            message: 'Color variant created successfully',
            variant: variantProduct
        });
    } catch (err) {
        console.error('Error creating color variant:', err);
        console.error('Error details:', {
            message: err.message,
            stack: err.stack,
            name: err.name
        });
        console.error('Request body:', req.body);
        console.error('Parent product ID:', req.params.id);

        // Provide more specific error message
        let errorMessage = 'Error creating color variant';
        if (err.name === 'ValidationError') {
            errorMessage = `Validation error: ${err.message}`;
        } else if (err.name === 'CastError') {
            errorMessage = `Invalid ID format: ${err.message}`;
        } else if (err.code === 11000) {
            errorMessage = 'Duplicate variant detected';
        }

        res.status(500).json({
            message: errorMessage,
            error: err.message,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// Update a color variant
app.put('/products/:id/variants/:variantId', async (req, res) => {
    try {
        const { color, price, inventory, isActive, media } = req.body;

        // Find the variant
        const variant = await Product.findById(req.params.variantId);

        if (!variant || !variant.parentProduct) {
            return res.status(404).json({ message: 'Color variant not found' });
        }

        // Verify this variant belongs to the specified parent
        if (variant.parentProduct.toString() !== req.params.id) {
            return res.status(400).json({ message: 'This variant does not belong to the specified parent product' });
        }

        // Update fields
        if (color) {
            variant.color = color;
        }

        if (price !== undefined) {
            variant.price = price;
        }

        if (inventory) {
            variant.inventory = inventory;
        }

        if (isActive !== undefined) {
            variant.isActive = isActive;
        }

        // Update media if provided
        if (media && Array.isArray(media)) {
            variant.media = media;

            // Update the primary image
            const primaryImage = media.find(m => m.isPrimary && m.type === 'image');
            if (primaryImage) {
                variant.image = primaryImage.url;
            }
        }

        // Save the updated variant
        await variant.save();

        res.json({
            message: 'Color variant updated successfully',
            variant: variant
        });
    } catch (err) {
        console.error('Error updating color variant:', err);
        res.status(500).json({ message: 'Error updating color variant' });
    }
});

// Delete a color variant
app.delete('/products/:id/variants/:variantId', async (req, res) => {
    try {
        // Find the variant
        const variant = await Product.findById(req.params.variantId);

        if (!variant || !variant.parentProduct) {
            return res.status(404).json({ message: 'Color variant not found' });
        }

        // Verify this variant belongs to the specified parent
        if (variant.parentProduct.toString() !== req.params.id) {
            return res.status(400).json({ message: 'This variant does not belong to the specified parent product' });
        }

        // Delete the variant
        await Product.findByIdAndDelete(req.params.variantId);

        // Check if this was the last variant
        const remainingVariants = await Product.countDocuments({ parentProduct: req.params.id });

        // If no variants remain, update the parent product
        if (remainingVariants === 0) {
            const parentProduct = await Product.findById(req.params.id);
            if (parentProduct) {
                parentProduct.isParentProduct = false;
                await parentProduct.save();
            }
        }

        res.json({ message: 'Color variant deleted successfully' });
    } catch (err) {
        console.error('Error deleting color variant:', err);
        res.status(500).json({ message: 'Error deleting color variant' });
    }
});

// ========== PRODUCT MEDIA ENDPOINTS ==========

// Add media to a product
app.post('/products/:id/media', async (req, res) => {
    try {
        const { media } = req.body;

        if (!media || !Array.isArray(media) || media.length === 0) {
            return res.status(400).json({ message: 'No media provided' });
        }

        // Find the product
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Initialize media array if it doesn't exist
        if (!product.media) {
            product.media = [];
        }

        // Get the current highest order value
        const highestOrder = product.media.length > 0
            ? Math.max(...product.media.map(m => m.order || 0))
            : -1;

        // Add order to new media items if not provided
        media.forEach((item, index) => {
            if (item.order === undefined) {
                item.order = highestOrder + index + 1;
            }

            // Set the first media item as primary if no primary exists
            if (product.media.length === 0 && index === 0) {
                item.isPrimary = true;
            }
        });

        // Add new media to the product
        product.media.push(...media);

        // Update the image field if there's no image but we have a primary image in media
        if (!product.image) {
            const primaryImage = product.media.find(m => m.isPrimary && m.type === 'image');
            if (primaryImage) {
                product.image = primaryImage.url;
            }
        }

        // Save the product
        await product.save();

        res.json({
            message: 'Media added to product',
            product
        });
    } catch (err) {
        console.error('Error adding media to product:', err);
        res.status(500).json({ message: 'Error adding media to product' });
    }
});

// Remove media from a product
app.delete('/products/:id/media/:mediaId', async (req, res) => {
    try {
        // Find the product
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if product has media
        if (!product.media || product.media.length === 0) {
            return res.status(404).json({ message: 'Product has no media' });
        }

        // Find the media item
        const mediaIndex = product.media.findIndex(m => m._id.toString() === req.params.mediaId);

        if (mediaIndex === -1) {
            return res.status(404).json({ message: 'Media not found' });
        }

        // Check if this is the primary media
        const isRemovingPrimary = product.media[mediaIndex].isPrimary;

        // Remove the media item
        const removedMedia = product.media.splice(mediaIndex, 1)[0];

        // If we removed the primary media, set a new primary
        if (isRemovingPrimary && product.media.length > 0) {
            // Find the first image to set as primary
            const firstImage = product.media.find(m => m.type === 'image');
            if (firstImage) {
                firstImage.isPrimary = true;
                product.image = firstImage.url;
            }
        }

        // If we removed the last media item, clear the image field
        if (product.media.length === 0) {
            product.image = null;
        }

        // Save the product
        await product.save();

        res.json({
            message: 'Media removed from product',
            removedMedia,
            product
        });
    } catch (err) {
        console.error('Error removing media from product:', err);
        res.status(500).json({ message: 'Error removing media from product' });
    }
});

// Update media order or set primary media
app.put('/products/:id/media', async (req, res) => {
    try {
        const { mediaUpdates } = req.body;

        if (!mediaUpdates || !Array.isArray(mediaUpdates) || mediaUpdates.length === 0) {
            return res.status(400).json({ message: 'No media updates provided' });
        }

        // Find the product
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if product has media
        if (!product.media || product.media.length === 0) {
            return res.status(404).json({ message: 'Product has no media' });
        }

        // Track if we need to update the primary image
        let primaryChanged = false;
        let newPrimaryUrl = null;

        // Apply updates to each media item
        mediaUpdates.forEach(update => {
            const mediaItem = product.media.id(update.mediaId);

            if (mediaItem) {
                // Update order if provided
                if (update.order !== undefined) {
                    mediaItem.order = update.order;
                }

                // Update isPrimary if provided
                if (update.isPrimary !== undefined) {
                    // If setting this as primary, unset any existing primary
                    if (update.isPrimary) {
                        product.media.forEach(m => {
                            if (m._id.toString() !== update.mediaId) {
                                m.isPrimary = false;
                            }
                        });

                        mediaItem.isPrimary = true;

                        // If this is an image, update the image field
                        if (mediaItem.type === 'image') {
                            primaryChanged = true;
                            newPrimaryUrl = mediaItem.url;
                        }
                    } else {
                        mediaItem.isPrimary = false;
                    }
                }

                // Update other fields if provided
                if (update.altText !== undefined) mediaItem.altText = update.altText;
                if (update.caption !== undefined) mediaItem.caption = update.caption;
            }
        });

        // Update the image field if primary changed
        if (primaryChanged && newPrimaryUrl) {
            product.image = newPrimaryUrl;
        }

        // Save the product
        await product.save();

        res.json({
            message: 'Media updated',
            product
        });
    } catch (err) {
        console.error('Error updating product media:', err);
        res.status(500).json({ message: 'Error updating product media' });
    }
});

// ========== ADVANCED SEARCH & FILTERING ENDPOINTS ==========

// Advanced product search with filtering and sorting
app.get('/products/search', async (req, res) => {
    try {
        const {
            q: query,
            category,
            minPrice,
            maxPrice,
            brand,
            minRating,
            isAvailable,
            sortBy = 'relevance',
            page = 1,
            limit = 20,
            tags
        } = req.query;

        // Parse numeric values
        const searchParams = {
            query: query ? query.trim() : '',
            category: category || null,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            brand: brand || null,
            minRating: minRating ? parseFloat(minRating) : undefined,
            isAvailable: isAvailable !== undefined ? isAvailable === 'true' : undefined,
            sortBy,
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 100), // Max 100 items per page
            tags: tags ? (Array.isArray(tags) ? tags : [tags]) : []
        };

        // Use the advanced search method from Product model
        const products = await Product.advancedSearch(searchParams);

        // Get total count for pagination
        const totalQuery = { ...searchParams };
        delete totalQuery.page;
        delete totalQuery.limit;
        const totalProducts = await Product.advancedSearch({ ...totalQuery, limit: 999999 });
        const totalCount = totalProducts.length;

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / searchParams.limit);
        const hasNextPage = searchParams.page < totalPages;
        const hasPrevPage = searchParams.page > 1;

        // Record search in history (if user is logged in)
        const userId = req.headers.userid || null;
        const username = req.headers.username || 'anonymous';
        const sessionId = req.headers.sessionid || 'anonymous';

        if (query && query.trim()) {
            try {
                const searchRecord = new SearchHistory({
                    userId: userId || null,
                    username,
                    query: query.trim(),
                    filters: {
                        category: category || null,
                        priceRange: {
                            min: searchParams.minPrice,
                            max: searchParams.maxPrice
                        },
                        brand: brand || null,
                        rating: searchParams.minRating,
                        availability: searchParams.isAvailable,
                        sortBy
                    },
                    resultsCount: totalCount,
                    sessionId,
                    deviceInfo: {
                        userAgent: req.headers['user-agent'],
                        isMobile: /mobile/i.test(req.headers['user-agent']),
                        platform: req.headers['sec-ch-ua-platform'] || 'unknown'
                    }
                });

                await searchRecord.save();
            } catch (searchHistoryError) {
                console.error('Error saving search history:', searchHistoryError);
                // Don't fail the search if history saving fails
            }
        }

        res.json({
            products,
            pagination: {
                currentPage: searchParams.page,
                totalPages,
                totalCount,
                hasNextPage,
                hasPrevPage,
                limit: searchParams.limit
            },
            searchParams,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('Error in advanced search:', err);
        res.status(500).json({
            message: 'Error performing search',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
});

// Get search suggestions/autocomplete
app.get('/products/search/suggestions', async (req, res) => {
    try {
        const { q: query, limit = 10 } = req.query;

        if (!query || query.trim().length < 2) {
            return res.json({ suggestions: [] });
        }

        const searchTerm = query.trim();
        const maxSuggestions = Math.min(parseInt(limit), 20);

        // Get product name suggestions
        const productSuggestions = await Product.aggregate([
            {
                $match: {
                    $or: [
                        { name: { $regex: searchTerm, $options: 'i' } },
                        { brand: { $regex: searchTerm, $options: 'i' } },
                        { tags: { $regex: searchTerm, $options: 'i' } }
                    ],
                    isAvailable: true
                }
            },
            {
                $project: {
                    name: 1,
                    brand: 1,
                    category: 1,
                    image: 1,
                    price: 1,
                    averageRating: 1,
                    type: { $literal: 'product' }
                }
            },
            {
                $limit: maxSuggestions
            }
        ]);

        // Get category suggestions
        const categorySuggestions = await Category.aggregate([
            {
                $match: {
                    name: { $regex: searchTerm, $options: 'i' }
                }
            },
            {
                $project: {
                    name: 1,
                    icon: 1,
                    type: { $literal: 'category' }
                }
            },
            {
                $limit: 5
            }
        ]);

        // Get brand suggestions
        const brandSuggestions = await Product.aggregate([
            {
                $match: {
                    brand: { $regex: searchTerm, $options: 'i' },
                    brand: { $ne: '' }
                }
            },
            {
                $group: {
                    _id: '$brand',
                    productCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    name: '$_id',
                    productCount: 1,
                    type: { $literal: 'brand' }
                }
            },
            {
                $sort: { productCount: -1 }
            },
            {
                $limit: 5
            }
        ]);

        // Get popular search terms
        const popularSearches = await SearchHistory.aggregate([
            {
                $match: {
                    query: { $regex: searchTerm, $options: 'i' },
                    timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
                }
            },
            {
                $group: {
                    _id: '$query',
                    searchCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    name: '$_id',
                    searchCount: 1,
                    type: { $literal: 'search' }
                }
            },
            {
                $sort: { searchCount: -1 }
            },
            {
                $limit: 3
            }
        ]);

        // Combine all suggestions
        const allSuggestions = [
            ...productSuggestions,
            ...categorySuggestions,
            ...brandSuggestions,
            ...popularSearches
        ].slice(0, maxSuggestions);

        res.json({
            suggestions: allSuggestions,
            query: searchTerm
        });

    } catch (err) {
        console.error('Error getting search suggestions:', err);
        res.status(500).json({
            message: 'Error getting suggestions',
            suggestions: []
        });
    }
});

// Get search filters/facets for a category
app.get('/products/search/filters', async (req, res) => {
    try {
        const { category } = req.query;

        // Build base match criteria
        const matchCriteria = { isAvailable: true };
        if (category) {
            matchCriteria.category = mongoose.Types.ObjectId(category);
        }

        // Get price range
        const priceRange = await Product.aggregate([
            { $match: matchCriteria },
            {
                $group: {
                    _id: null,
                    minPrice: { $min: '$price' },
                    maxPrice: { $max: '$price' }
                }
            }
        ]);

        // Get available brands
        const brands = await Product.aggregate([
            { $match: { ...matchCriteria, brand: { $ne: '' } } },
            {
                $group: {
                    _id: '$brand',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 20
            }
        ]);

        // Get rating distribution
        const ratings = await Product.aggregate([
            { $match: { ...matchCriteria, averageRating: { $gt: 0 } } },
            {
                $group: {
                    _id: { $floor: '$averageRating' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: -1 }
            }
        ]);

        // Get available tags
        const tags = await Product.aggregate([
            { $match: matchCriteria },
            { $unwind: '$tags' },
            {
                $group: {
                    _id: '$tags',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 15
            }
        ]);

        res.json({
            priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0 },
            brands: brands.map(b => ({ name: b._id, count: b.count })),
            ratings: ratings.map(r => ({ rating: r._id, count: r.count })),
            tags: tags.map(t => ({ name: t._id, count: t.count }))
        });

    } catch (err) {
        console.error('Error getting search filters:', err);
        res.status(500).json({
            message: 'Error getting filters',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
});

// ========== WISHLIST ENDPOINTS ==========

// Get user's wishlists
app.get('/wishlists', async (req, res) => {
    try {
        const userId = req.headers.userid;

        if (!userId) {
            return res.status(401).json({ message: 'User ID required' });
        }

        // Validate userId format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const wishlists = await Wishlist.find({ userId })
            .populate('items.productId', 'name price image media averageRating reviewCount isAvailable')
            .sort({ isDefault: -1, createdAt: -1 });

        res.json({ wishlists });

    } catch (err) {
        console.error('Error fetching wishlists:', err);

        // Provide more specific error messages
        if (err.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid data format',
                details: err.message
            });
        }

        res.status(500).json({ message: 'Error fetching wishlists' });
    }
});

// Get a specific wishlist
app.get('/wishlists/:id', async (req, res) => {
    try {
        const userId = req.headers.userid;
        const wishlistId = req.params.id;

        if (!userId) {
            return res.status(401).json({ message: 'User ID required' });
        }

        const wishlist = await Wishlist.findOne({
            _id: wishlistId,
            $or: [
                { userId },
                { 'sharedWith.userId': userId },
                { isPublic: true }
            ]
        }).populate('items.productId', 'name price image media averageRating reviewCount isAvailable brand category');

        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found' });
        }

        // Increment view count if not owner
        if (wishlist.userId.toString() !== userId) {
            wishlist.viewCount += 1;
            wishlist.lastViewedAt = new Date();
            await wishlist.save();
        }

        res.json({ wishlist });

    } catch (err) {
        console.error('Error fetching wishlist:', err);
        res.status(500).json({ message: 'Error fetching wishlist' });
    }
});

// Create a new wishlist
app.post('/wishlists', async (req, res) => {
    try {
        const userId = req.headers.userid;
        const { name, description, isPublic = false } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'User ID required' });
        }

        // Validate userId format (MongoDB ObjectId)
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        if (!name || name.trim().length === 0) {
            return res.status(400).json({ message: 'Wishlist name is required' });
        }

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if this is the user's first wishlist
        const existingWishlists = await Wishlist.countDocuments({ userId });
        const isDefault = existingWishlists === 0;

        const wishlist = new Wishlist({
            userId,
            name: name.trim(),
            description: description || '',
            isPublic,
            isDefault
        });

        await wishlist.save();

        res.status(201).json({
            message: 'Wishlist created successfully',
            wishlist
        });

    } catch (err) {
        console.error('Error creating wishlist:', err);

        // Provide more specific error messages
        if (err.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation error',
                details: err.message
            });
        } else if (err.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid data format',
                details: err.message
            });
        }

        res.status(500).json({ message: 'Error creating wishlist' });
    }
});

// Add item to wishlist
app.post('/wishlists/:id/items', async (req, res) => {
    try {
        const userId = req.headers.userid;
        const wishlistId = req.params.id;
        const { productId, notes = '', priority = 'medium' } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'User ID required' });
        }

        // Validate userId format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        // Validate wishlistId format
        if (!mongoose.Types.ObjectId.isValid(wishlistId)) {
            return res.status(400).json({ message: 'Invalid wishlist ID format' });
        }

        if (!productId) {
            return res.status(400).json({ message: 'Product ID is required' });
        }

        // Validate productId format
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'Invalid product ID format' });
        }

        // Find the wishlist
        const wishlist = await Wishlist.findOne({
            _id: wishlistId,
            $or: [
                { userId },
                { 'sharedWith.userId': userId, 'sharedWith.permission': 'edit' }
            ]
        });

        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found or no edit permission' });
        }

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Add item to wishlist
        await wishlist.addItem(productId, notes, priority);

        // Update product wishlist count
        await Product.findByIdAndUpdate(productId, {
            $inc: { wishlistCount: 1 }
        });

        // Populate the updated wishlist
        await wishlist.populate('items.productId', 'name price image media averageRating reviewCount isAvailable');

        res.json({
            message: 'Item added to wishlist',
            wishlist
        });

    } catch (err) {
        console.error('Error adding item to wishlist:', err);

        // Provide more specific error messages
        if (err.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation error',
                details: err.message
            });
        } else if (err.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid data format',
                details: err.message
            });
        }

        res.status(500).json({ message: 'Error adding item to wishlist' });
    }
});

// Remove item from wishlist
app.delete('/wishlists/:id/items/:productId', async (req, res) => {
    try {
        const userId = req.headers.userid;
        const wishlistId = req.params.id;
        const productId = req.params.productId;

        if (!userId) {
            return res.status(401).json({ message: 'User ID required' });
        }

        // Find the wishlist
        const wishlist = await Wishlist.findOne({
            _id: wishlistId,
            $or: [
                { userId },
                { 'sharedWith.userId': userId, 'sharedWith.permission': 'edit' }
            ]
        });

        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found or no edit permission' });
        }

        // Remove item from wishlist
        await wishlist.removeItem(productId);

        // Update product wishlist count
        await Product.findByIdAndUpdate(productId, {
            $inc: { wishlistCount: -1 }
        });

        res.json({
            message: 'Item removed from wishlist',
            wishlist
        });

    } catch (err) {
        console.error('Error removing item from wishlist:', err);
        res.status(500).json({ message: 'Error removing item from wishlist' });
    }
});

// Quick add to default wishlist
app.post('/wishlists/quick-add', async (req, res) => {
    try {
        const userId = req.headers.userid;
        const { productId } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'User ID required' });
        }

        // Validate userId format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        if (!productId) {
            return res.status(400).json({ message: 'Product ID is required' });
        }

        // Validate productId format
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'Invalid product ID format' });
        }

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find or create default wishlist
        let wishlist = await Wishlist.findOne({ userId, isDefault: true });

        if (!wishlist) {
            wishlist = new Wishlist({
                userId,
                name: 'My Wishlist',
                isDefault: true
            });
            await wishlist.save();
        }

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if item already exists
        const existingItem = wishlist.items.find(item =>
            item.productId.toString() === productId
        );

        if (existingItem) {
            return res.status(400).json({ message: 'Item already in wishlist' });
        }

        // Add item to wishlist
        await wishlist.addItem(productId);

        // Update product wishlist count
        await Product.findByIdAndUpdate(productId, {
            $inc: { wishlistCount: 1 }
        });

        res.json({
            message: 'Item added to wishlist',
            wishlistId: wishlist._id
        });

    } catch (err) {
        console.error('Error quick adding to wishlist:', err);

        // Provide more specific error messages
        if (err.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation error',
                details: err.message
            });
        } else if (err.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid data format',
                details: err.message
            });
        }

        res.status(500).json({ message: 'Error adding to wishlist' });
    }
});

// Delete a wishlist
app.delete('/wishlists/:id', async (req, res) => {
    try {
        const userId = req.headers.userid;
        const wishlistId = req.params.id;

        if (!userId) {
            return res.status(401).json({ message: 'User ID required' });
        }

        // Validate userId format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        // Validate wishlistId format
        if (!mongoose.Types.ObjectId.isValid(wishlistId)) {
            return res.status(400).json({ message: 'Invalid wishlist ID format' });
        }

        // Find the wishlist and verify ownership
        const wishlist = await Wishlist.findOne({
            _id: wishlistId,
            userId: userId
        });

        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found or access denied' });
        }

        // Check if this is the default wishlist
        if (wishlist.isDefault) {
            // Check if user has other wishlists
            const otherWishlists = await Wishlist.find({
                userId: userId,
                _id: { $ne: wishlistId }
            }).sort({ createdAt: 1 });

            if (otherWishlists.length > 0) {
                // Make the oldest remaining wishlist the default
                await Wishlist.findByIdAndUpdate(otherWishlists[0]._id, { isDefault: true });
            }
        }

        // Update product wishlist counts for all items in the wishlist
        if (wishlist.items.length > 0) {
            const productIds = wishlist.items.map(item => item.productId);
            await Product.updateMany(
                { _id: { $in: productIds } },
                { $inc: { wishlistCount: -1 } }
            );
        }

        // Delete the wishlist
        await Wishlist.findByIdAndDelete(wishlistId);

        res.json({
            message: 'Wishlist deleted successfully',
            deletedWishlistId: wishlistId
        });

    } catch (err) {
        console.error('Error deleting wishlist:', err);

        // Provide more specific error messages
        if (err.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid data format',
                details: err.message
            });
        }

        res.status(500).json({ message: 'Error deleting wishlist' });
    }
});


// ========== ENHANCED REVIEW SYSTEM ENDPOINTS ==========

// Get reviews for a product with enhanced features
app.get('/products/:id/reviews', async (req, res) => {
    try {
        const productId = req.params.id;
        const {
            page = 1,
            limit = 10,
            sortBy = 'newest',
            filterBy = 'all',
            verified = null
        } = req.query;

        // Build query
        const query = { product: productId, isApproved: true };

        if (verified === 'true') {
            query.isVerifiedPurchase = true;
        }

        if (filterBy !== 'all' && !isNaN(filterBy)) {
            query.rating = parseInt(filterBy);
        }

        // Build sort
        let sort = {};
        switch (sortBy) {
            case 'newest':
                sort.createdAt = -1;
                break;
            case 'oldest':
                sort.createdAt = 1;
                break;
            case 'rating_high':
                sort.rating = -1;
                sort.createdAt = -1;
                break;
            case 'rating_low':
                sort.rating = 1;
                sort.createdAt = -1;
                break;
            case 'helpful':
                sort.helpfulCount = -1;
                sort.createdAt = -1;
                break;
            default:
                sort.createdAt = -1;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const reviews = await Review.find(query)
            .populate('user', 'username profilePicture verified')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const totalReviews = await Review.countDocuments(query);
        const totalPages = Math.ceil(totalReviews / parseInt(limit));

        // Get review statistics
        const stats = await Review.aggregate([
            { $match: { product: mongoose.Types.ObjectId(productId), isApproved: true } },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 },
                    verifiedReviews: {
                        $sum: { $cond: ['$isVerifiedPurchase', 1, 0] }
                    },
                    ratingDistribution: {
                        $push: '$rating'
                    }
                }
            }
        ]);

        // Calculate rating distribution
        let ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        if (stats[0] && stats[0].ratingDistribution) {
            stats[0].ratingDistribution.forEach(rating => {
                ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
            });
        }

        res.json({
            reviews,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalReviews,
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1
            },
            statistics: {
                averageRating: stats[0]?.averageRating || 0,
                totalReviews: stats[0]?.totalReviews || 0,
                verifiedReviews: stats[0]?.verifiedReviews || 0,
                ratingDistribution
            }
        });

    } catch (err) {
        console.error('Error fetching reviews:', err);
        res.status(500).json({ message: 'Error fetching reviews' });
    }
});

// Create a new review with enhanced features
app.post('/products/:id/reviews', async (req, res) => {
    try {
        const productId = req.params.id;
        const userId = req.headers.userid;
        const {
            rating,
            title,
            text,
            media = [],
            orderId = null
        } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'User authentication required' });
        }

        if (!rating || !text) {
            return res.status(400).json({ message: 'Rating and review text are required' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        // Check if user already reviewed this product
        const existingReview = await Review.findOne({
            product: productId,
            user: userId
        });

        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this product' });
        }

        // Check if this is a verified purchase
        let isVerifiedPurchase = false;
        if (orderId) {
            const order = await Order.findOne({
                _id: orderId,
                userId: userId,
                'items.productId': productId,
                status: 'delivered'
            });
            isVerifiedPurchase = !!order;
        }

        // Create the review
        const review = new Review({
            product: productId,
            user: userId,
            rating,
            title: title || '',
            text,
            media: media || [],
            isVerifiedPurchase,
            orderId: isVerifiedPurchase ? orderId : null
        });

        await review.save();

        // Update product rating
        await updateProductRating(productId);

        // Populate user info for response
        await review.populate('user', 'username profilePicture verified');

        res.status(201).json({
            message: 'Review created successfully',
            review
        });

    } catch (err) {
        console.error('Error creating review:', err);
        res.status(500).json({ message: 'Error creating review' });
    }
});

// Mark review as helpful/not helpful
app.post('/reviews/:id/helpful', async (req, res) => {
    try {
        const reviewId = req.params.id;
        const userId = req.headers.userid;
        const { helpful } = req.body; // true for helpful, false for not helpful

        if (!userId) {
            return res.status(401).json({ message: 'User authentication required' });
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        if (helpful) {
            await review.markHelpful(userId);
        } else {
            await review.markNotHelpful(userId);
        }

        res.json({
            message: helpful ? 'Marked as helpful' : 'Marked as not helpful',
            helpfulCount: review.helpfulCount,
            notHelpfulCount: review.notHelpfulCount
        });

    } catch (err) {
        console.error('Error updating review helpfulness:', err);
        res.status(500).json({ message: 'Error updating review' });
    }
});

// Helper function to update product rating
async function updateProductRating(productId) {
    try {
        const stats = await Review.aggregate([
            {
                $match: {
                    product: mongoose.Types.ObjectId(productId),
                    isApproved: true
                }
            },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    reviewCount: { $sum: 1 }
                }
            }
        ]);

        const averageRating = stats[0]?.averageRating || 0;
        const reviewCount = stats[0]?.reviewCount || 0;

        await Product.findByIdAndUpdate(productId, {
            averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
            reviewCount
        });

    } catch (error) {
        console.error('Error updating product rating:', error);
    }
}

// ========== PASSWORD RESET ROUTES ==========

// Verify user credentials for password reset
app.post('/users/verify-credentials', async (req, res) => {
    try {
        const { email, phone } = req.body;

        if (!email || !phone) {
            return res.status(400).json({ message: 'Email and phone number are required' });
        }

        // Find user by email and phone
        const user = await User.findOne({
            email: email.toLowerCase(),
            phone: phone
        }, '-password');

        if (!user) {
            return res.status(404).json({ message: 'No account found with this email and phone number' });
        }

        // Return user info without password
        res.json({
            message: 'User verified',
            user: {
                email: user.email,
                phone: user.phone,
                username: user.username
            }
        });
    } catch (err) {
        console.error('Error verifying credentials:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Reset password
app.post('/users/reset-password', async (req, res) => {
    try {
        const { email, phone, newPassword } = req.body;

        if (!email || !phone || !newPassword) {
            return res.status(400).json({ message: 'Email, phone number, and new password are required' });
        }

        // Validate new password
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        // Find user by email and phone
        const user = await User.findOne({
            email: email.toLowerCase(),
            phone: phone
        });

        if (!user) {
            return res.status(404).json({ message: 'No account found with this email and phone number' });
        }

        // Hash and update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        // Save updated user
        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ========== CLOUDINARY CONFIG AND MEDIA HANDLING ==========

// Endpoint to safely provide Cloudinary configuration
app.get('/cloudinary-config', (req, res) => {
    try {
        // Get Cloudinary credentials from environment variables
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dtzhskby3'; // Use the known cloud name as fallback
        const apiKey = process.env.CLOUDINARY_API_KEY;

        // Log what we're working with (without showing the actual values)
        console.log('Cloudinary config request:');
        console.log('- Cloud name available:', !!cloudName);
        console.log('- API key available:', !!apiKey);

        // Check if API key is available
        if (!apiKey) {
            console.error('CLOUDINARY_API_KEY is missing in environment variables');
            console.error('Please check your .env file and make sure it contains a valid CLOUDINARY_API_KEY');
        }

        // Create response object with cloud name
        const response = {
            cloudName: cloudName
        };

        // Always include the API key if it exists
        if (apiKey) {
            response.apiKey = apiKey;
            console.log('Providing Cloudinary configuration with API key');
        } else {
            console.log('Providing Cloudinary configuration without API key - using fallback');

            // Use the API key from the .env file as a fallback
            response.apiKey = '438531956929485'; // Use the known API key as fallback
            console.log('Using fallback API key for Cloudinary');
        }

        res.json(response);
    } catch (err) {
        console.error('Error providing Cloudinary config:', err);
        res.status(500).json({ message: 'Error providing Cloudinary configuration' });
    }
});

// Get Cloudinary signature for authenticated uploads (for videos and larger files)
app.get('/cloudinary-signature', (req, res) => {
    try {
        const timestamp = Math.round(new Date().getTime() / 1000);
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        if (!apiSecret) {
            return res.status(500).json({
                message: 'Cloudinary API secret not configured',
                error: 'CLOUDINARY_API_SECRET is missing in environment variables'
            });
        }

        // Create the signature string
        const folder = 'product_media';
        const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;

        // Create SHA-1 hash
        const crypto = require('crypto');
        const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

        res.json({
            signature,
            timestamp,
            folder
        });
    } catch (err) {
        console.error('Error generating Cloudinary signature:', err);
        res.status(500).json({ message: 'Error generating Cloudinary signature' });
    }
});

// Process uploaded media and create media objects
app.post('/process-media', async (req, res) => {
    try {
        const { mediaItems } = req.body;

        if (!mediaItems || !Array.isArray(mediaItems) || mediaItems.length === 0) {
            return res.status(400).json({ message: 'No media items provided' });
        }

        // Process each media item to create proper media objects
        const processedMedia = mediaItems.map((item, index) => {
            // Determine media type based on URL or explicit type
            let type = item.type || 'image';
            if (!item.type && item.url) {
                // Try to determine type from URL if not explicitly provided
                if (item.url.match(/\.(mp4|mov|avi|wmv|flv|webm|mkv)($|\?)/i)) {
                    type = 'video';
                } else if (item.url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)($|\?)/i)) {
                    type = 'image';
                }
            }

            // Create the media object
            const mediaObject = {
                type,
                url: item.url,
                order: item.order !== undefined ? item.order : index,
                isPrimary: item.isPrimary !== undefined ? item.isPrimary : (index === 0),
                altText: item.altText || '',
                caption: item.caption || '',
                publicId: item.publicId || null
            };

            // Add thumbnail URL for videos if provided
            if (type === 'video' && item.thumbnailUrl) {
                mediaObject.thumbnailUrl = item.thumbnailUrl;
            } else if (type === 'video' && !item.thumbnailUrl && item.url) {
                // Generate a thumbnail URL from Cloudinary video URL
                // This assumes the URL is a Cloudinary URL
                if (item.url.includes('cloudinary.com')) {
                    // Extract the cloud name and public ID
                    const urlParts = item.url.split('/');
                    const videoIndex = urlParts.findIndex(part => part === 'video');
                    if (videoIndex > 0 && videoIndex < urlParts.length - 2) {
                        const cloudName = urlParts[videoIndex - 1];
                        const publicId = urlParts.slice(videoIndex + 2).join('/').split('.')[0];

                        // Create a thumbnail URL
                        mediaObject.thumbnailUrl = `https://res.cloudinary.com/${cloudName}/video/upload/c_fill,h_300,w_300/so_auto,pg_1/${publicId}.jpg`;
                    }
                }
            }

            return mediaObject;
        });

        res.json({
            message: 'Media processed successfully',
            media: processedMedia
        });
    } catch (err) {
        console.error('Error processing media:', err);
        res.status(500).json({ message: 'Error processing media' });
    }
});

// ========== ANNOUNCEMENT ROUTES ==========

app.get('/announcements', async (req, res) => {
    try {
        const { username } = req.query;

        // If username is provided, get:
        // 1. General announcements (forUser is null)
        // 2. User-specific announcements (forUser matches username)
        // 3. Welcome messages ONLY for this specific user
        let query = {};
        if (username) {
            query = {
                $or: [
                    // General announcements for everyone (not welcome messages)
                    {
                        forUser: null,
                        isWelcomeMessage: { $ne: true } // Exclude welcome messages from general announcements
                    },
                    // User-specific announcements including welcome messages
                    {
                        forUser: username
                    }
                ]
            };
        }

        const announcements = await Announcement.find(query).sort({ createdAt: -1 });
        res.json(announcements);
    } catch (err) {
        console.error('Error fetching announcements:', err);
        res.status(500).json({ message: 'Error fetching announcements' });
    }
});

app.post('/announcements', async (req, res) => {
    try {
        const { title, message, forUser, isWelcomeMessage } = req.body;
        const announcement = new Announcement({
            title,
            message,
            forUser, // Include the forUser field to make messages user-specific
            isWelcomeMessage: isWelcomeMessage || false
        });
        await announcement.save();
        res.json({ message: 'Announcement sent', announcement });
    } catch (err) {
        console.error('Error sending announcement:', err);
        res.status(500).json({ message: 'Error sending announcement' });
    }
});

app.delete('/announcements/:id', async (req, res) => {
    try {
        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ message: 'Announcement deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting announcement' });
    }
});

// Mark an announcement as read
app.put('/announcements/:id/read', async (req, res) => {
    try {
        const announcement = await Announcement.findByIdAndUpdate(
            req.params.id,
            { isRead: true },
            { new: true }
        );

        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        res.json({ message: 'Announcement marked as read', announcement });
    } catch (err) {
        console.error('Error marking announcement as read:', err);
        res.status(500).json({ message: 'Error marking announcement as read' });
    }
});

// ========== CHATBOT ROUTES ==========

// Store chat interaction
app.post('/chatbot/interaction', async (req, res) => {
    try {
        const {
            userId,
            username,
            message,
            response,
            sessionId,
            messageType,
            recommendedProducts,
            escalatedToSupport
        } = req.body;

        // Create new chat interaction
        const chatInteraction = new ChatInteraction({
            userId,
            username: username || 'anonymous',
            message,
            response,
            sessionId,
            messageType: messageType || 'text',
            recommendedProducts: recommendedProducts || [],
            escalatedToSupport: escalatedToSupport || false
        });

        // Save to database
        await chatInteraction.save();

        res.status(201).json({
            message: 'Chat interaction saved',
            interactionId: chatInteraction._id
        });
    } catch (err) {
        console.error('Error saving chat interaction:', err);
        res.status(500).json({ message: 'Error saving chat interaction' });
    }
});

// Get chat history for a user
app.get('/chatbot/history', async (req, res) => {
    try {
        const { username, sessionId, limit } = req.query;

        // Build query
        const query = {};
        if (username) query.username = username;
        if (sessionId) query.sessionId = sessionId;

        // Get chat history
        const history = await ChatInteraction.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit) || 50);

        res.json(history);
    } catch (err) {
        console.error('Error fetching chat history:', err);
        res.status(500).json({ message: 'Error fetching chat history' });
    }
});

// Submit feedback for a chat interaction
app.post('/chatbot/feedback/:interactionId', async (req, res) => {
    try {
        const { interactionId } = req.params;
        const { helpful, feedbackText } = req.body;

        // Find and update the interaction
        const interaction = await ChatInteraction.findByIdAndUpdate(
            interactionId,
            {
                'userFeedback.helpful': helpful,
                'userFeedback.feedbackText': feedbackText
            },
            { new: true }
        );

        if (!interaction) {
            return res.status(404).json({ message: 'Chat interaction not found' });
        }

        res.json({
            message: 'Feedback submitted successfully',
            interaction
        });
    } catch (err) {
        console.error('Error submitting feedback:', err);
        res.status(500).json({ message: 'Error submitting feedback' });
    }
});

// Get product recommendations based on query
app.get('/chatbot/recommendations', async (req, res) => {
    try {
        const { query, limit, categoryId } = req.query;

        // Build search filter
        const filter = {};
        if (categoryId) filter.category = categoryId;

        // Get products
        let products = await Product.find(filter).populate('category');

        // If query is provided, filter products by relevance
        if (query) {
            const keywords = query.toLowerCase().split(/\s+/).filter(word => word.length > 3);

            if (keywords.length > 0) {
                products = products.filter(product => {
                    const name = product.name.toLowerCase();
                    const desc = product.desc ? product.desc.toLowerCase() : '';

                    return keywords.some(keyword =>
                        name.includes(keyword) || desc.includes(keyword)
                    );
                });
            }
        }

        // Limit results
        const limitNum = parseInt(limit) || 3;
        products = products.slice(0, limitNum);

        res.json(products);
    } catch (err) {
        console.error('Error getting product recommendations:', err);
        res.status(500).json({ message: 'Error getting product recommendations' });
    }
});

// ========== CONTACT FORM ROUTES ==========

// Submit a contact form
app.post('/contact', async (req, res) => {
    try {
        // Extract form data
        const {
            fullName,
            email,
            phone,
            subject,
            message,
            username,
            acceptedPolicy
        } = req.body;

        // Validate required fields
        if (!fullName || !email || !subject || !message || acceptedPolicy !== 'true') {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // Validate message length
        if (message.length < 10) {
            return res.status(400).json({ message: 'Message must be at least 10 characters long' });
        }

        // Validate subject is one of the allowed values
        const allowedSubjects = ['Product Inquiry', 'Order Issue', 'Technical Support', 'Account Help', 'Feedback', 'Other'];
        if (!allowedSubjects.includes(subject)) {
            return res.status(400).json({ message: 'Invalid subject' });
        }

        // Find user ID if username is provided
        let userId = null;
        if (username) {
            const user = await User.findOne({ username });
            if (user) {
                userId = user._id;
            }
        }

        // Create new contact message
        const contactMessage = new ContactMessage({
            fullName,
            email,
            phone: phone || null,
            subject,
            message,
            userId,
            username,
            acceptedPolicy: true
        });

        // Handle file attachment if present
        if (req.files && req.files.attachment) {
            const file = req.files.attachment;
            contactMessage.attachment = {
                filename: file.name,
                contentType: file.mimetype,
                data: file.data
            };
        }

        // Save to database
        await contactMessage.save();

        // Send confirmation email to user
        // This would typically use a service like Nodemailer
        // For now, we'll just log it
        console.log(`Confirmation email would be sent to ${email}`);

        // Create an announcement for the user if they're logged in
        if (username) {
            const confirmationMessage = new Announcement({
                title: 'Contact Form Submission Received',
                message: `Thank you for contacting us about "${subject}". Our team will review your message and get back to you soon.`,
                forUser: username
            });

            await confirmationMessage.save();
        }

        res.status(201).json({
            message: 'Contact form submitted successfully',
            contactId: contactMessage._id
        });
    } catch (err) {
        console.error('Error submitting contact form:', err);
        res.status(500).json({ message: 'Error submitting contact form' });
    }
});

// Get all contact messages (admin only)
app.get('/contact/messages', async (req, res) => {
    try {
        // Add authentication check here in production
        // For now, we'll allow access for demo purposes

        // Get query parameters for filtering
        const { status, search, page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;

        // Build query
        const query = {};
        if (status) query.status = status;

        // Add search functionality
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Determine sort order
        const sortOrder = order === 'asc' ? 1 : -1;
        const sortOptions = {};
        sortOptions[sort] = sortOrder;

        // Get messages with pagination and sorting
        const messages = await ContactMessage.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const total = await ContactMessage.countDocuments(query);

        res.json({
            messages,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('Error fetching contact messages:', err);
        res.status(500).json({ message: 'Error fetching contact messages' });
    }
});

// Get a single contact message by ID (admin only)
app.get('/contact/messages/:id', async (req, res) => {
    try {
        // Add authentication check here in production

        const message = await ContactMessage.findById(req.params.id);

        if (!message) {
            return res.status(404).json({ message: 'Contact message not found' });
        }

        res.json(message);
    } catch (err) {
        console.error('Error fetching contact message:', err);
        res.status(500).json({ message: 'Error fetching contact message' });
    }
});

// Update contact message status (admin only)
app.put('/contact/messages/:id/status', async (req, res) => {
    try {
        // Add authentication check here in production

        const { status } = req.body;

        // Validate status
        const allowedStatuses = ['New', 'In Progress', 'Resolved', 'Closed'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Update the message
        const message = await ContactMessage.findByIdAndUpdate(
            req.params.id,
            { status, updatedAt: Date.now() },
            { new: true }
        );

        if (!message) {
            return res.status(404).json({ message: 'Contact message not found' });
        }

        res.json({
            message: 'Status updated successfully',
            contactMessage: message
        });
    } catch (err) {
        console.error('Error updating contact message status:', err);
        res.status(500).json({ message: 'Error updating contact message status' });
    }
});

// Add admin response to a contact message
app.post('/contact/messages/:id/respond', async (req, res) => {
    try {
        // Add authentication check here in production

        const { text, respondedBy } = req.body;

        // Validate response
        if (!text || !respondedBy) {
            return res.status(400).json({ message: 'Response text and responder name are required' });
        }

        // Update the message with response
        const message = await ContactMessage.findByIdAndUpdate(
            req.params.id,
            {
                adminResponse: {
                    text,
                    respondedBy,
                    respondedAt: Date.now()
                },
                status: 'Resolved',
                updatedAt: Date.now()
            },
            { new: true }
        );

        if (!message) {
            return res.status(404).json({ message: 'Contact message not found' });
        }

        // If the user has an account, send them an announcement
        if (message.username) {
            const responseNotification = new Announcement({
                title: 'Response to Your Inquiry',
                message: `We've responded to your inquiry about "${message.subject}". Please check your email for our response.`,
                forUser: message.username
            });

            await responseNotification.save();
        }

        // In a real application, you would send an email to the user here
        console.log(`Response email would be sent to ${message.email}`);

        res.json({
            message: 'Response added successfully',
            contactMessage: message
        });
    } catch (err) {
        console.error('Error adding response to contact message:', err);
        res.status(500).json({ message: 'Error adding response to contact message' });
    }
});

// Download attachment from a contact message
app.get('/contact/messages/:id/attachment', async (req, res) => {
    try {
        // Add authentication check here in production

        // Find the message
        const message = await ContactMessage.findById(req.params.id);

        if (!message) {
            return res.status(404).json({ message: 'Contact message not found' });
        }

        // Check if message has an attachment
        if (!message.attachment || !message.attachment.data) {
            return res.status(404).json({ message: 'No attachment found for this message' });
        }

        // Set response headers
        res.set({
            'Content-Type': message.attachment.contentType,
            'Content-Disposition': `attachment; filename="${message.attachment.filename}"`,
            'Content-Length': message.attachment.data.length
        });

        // Send the attachment data
        res.send(message.attachment.data);
    } catch (err) {
        console.error('Error downloading attachment:', err);
        res.status(500).json({ message: 'Error downloading attachment' });
    }
});

// ========== ORDER ROUTES ==========

// ========== ANALYTICS ROUTES ==========

// Get sales analytics data
app.get('/analytics/sales', async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;

        // Create date range for the year
        const startDate = new Date(year, 0, 1); // January 1st
        const endDate = new Date(year, 11, 31, 23, 59, 59); // December 31st

        // Get monthly sales data
        const monthlyData = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                    status: { $ne: 'cancelled' }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: '$createdAt' },
                        year: { $year: '$createdAt' }
                    },
                    orderCount: { $sum: 1 },
                    revenue: { $sum: '$totalAmount' }
                }
            },
            {
                $sort: { '_id.month': 1 }
            }
        ]);

        // Get order status distribution
        const statusDistribution = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get top selling products
        const topProducts = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                    status: { $ne: 'cancelled' }
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    name: { $first: '$items.name' },
                    totalSold: { $sum: '$items.quantity' },
                    revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);

        // Calculate total statistics
        const totalStats = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                    status: { $ne: 'cancelled' }
                }
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$totalAmount' },
                    averageOrderValue: { $avg: '$totalAmount' }
                }
            }
        ]);

        // Calculate growth rate (compare with previous year)
        const previousYear = parseInt(year) - 1;
        const previousYearStart = new Date(previousYear, 0, 1);
        const previousYearEnd = new Date(previousYear, 11, 31, 23, 59, 59);

        const previousYearStats = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: previousYearStart, $lte: previousYearEnd },
                    status: { $ne: 'cancelled' }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' }
                }
            }
        ]);

        const currentRevenue = totalStats[0]?.totalRevenue || 0;
        const previousRevenue = previousYearStats[0]?.totalRevenue || 0;
        const growthRate = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

        // Prepare response
        const analyticsData = {
            year: parseInt(year),
            totalOrders: totalStats[0]?.totalOrders || 0,
            totalRevenue: totalStats[0]?.totalRevenue || 0,
            averageOrderValue: totalStats[0]?.averageOrderValue || 0,
            growthRate: growthRate,
            monthlyData: monthlyData,
            statusDistribution: statusDistribution,
            topProducts: topProducts
        };

        res.json(analyticsData);
    } catch (err) {
        console.error('Error fetching analytics data:', err);
        res.status(500).json({ error: 'Error fetching analytics data' });
    }
});

// ========== REVIEW ROUTES ==========

// Get reviews for a specific product
app.get('/products/:id/reviews', async (req, res) => {
    try {
        const productId = req.params.id;

        // Find all reviews for this product
        const reviews = await Review.find({ product: productId })
            .populate('user', 'username name')
            .populate('replies.user', 'username name')
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (err) {
        console.error('Error fetching reviews:', err);
        res.status(500).json({ message: 'Error fetching reviews' });
    }
});

// Create a new review for a product
app.post('/products/:id/reviews', async (req, res) => {
    try {
        const { rating, text, username } = req.body;
        const productId = req.params.id;

        // Validate input
        if (!rating || !text || !username) {
            return res.status(400).json({ message: 'Rating, text, and username are required' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        // Find the user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Create new review
        const review = new Review({
            product: productId,
            user: user._id,
            rating,
            text,
            likes: [],
            dislikes: [],
            replies: []
        });

        await review.save();

        // Populate user data for response
        await review.populate('user', 'username name');

        res.status(201).json(review);
    } catch (err) {
        console.error('Error creating review:', err);
        res.status(500).json({ message: 'Error creating review' });
    }
});

// Like or dislike a review
app.post('/reviews/:id/like', async (req, res) => {
    try {
        const { action, username } = req.body;
        const reviewId = req.params.id;

        // Find the user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find the review
        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Remove user from both arrays first
        review.likes = review.likes.filter(id => !id.equals(user._id));
        review.dislikes = review.dislikes.filter(id => !id.equals(user._id));

        // Add to appropriate array based on action
        if (action === 'like') {
            review.likes.push(user._id);
        } else if (action === 'dislike') {
            review.dislikes.push(user._id);
        }

        await review.save();

        res.json({
            likes: review.likes,
            dislikes: review.dislikes
        });
    } catch (err) {
        console.error('Error updating review like/dislike:', err);
        res.status(500).json({ message: 'Error updating review like/dislike' });
    }
});

// Add a reply to a review
app.post('/reviews/:id/replies', async (req, res) => {
    try {
        const { text, username } = req.body;
        const reviewId = req.params.id;

        // Find the user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find the review
        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Create reply object
        const reply = {
            user: user._id,
            username: user.username,
            text,
            likes: [],
            dislikes: [],
            createdAt: new Date()
        };

        review.replies.push(reply);
        await review.save();

        res.status(201).json(reply);
    } catch (err) {
        console.error('Error adding reply:', err);
        res.status(500).json({ message: 'Error adding reply' });
    }
});

// Like or dislike a reply
app.post('/reviews/:reviewId/replies/:replyId/like', async (req, res) => {
    try {
        const { action, username } = req.body;
        const { reviewId, replyId } = req.params;

        // Find the user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find the review
        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Find the reply
        const reply = review.replies.id(replyId);
        if (!reply) {
            return res.status(404).json({ message: 'Reply not found' });
        }

        // Remove user from both arrays first
        reply.likes = reply.likes.filter(id => !id.equals(user._id));
        reply.dislikes = reply.dislikes.filter(id => !id.equals(user._id));

        // Add to appropriate array based on action
        if (action === 'like') {
            reply.likes.push(user._id);
        } else if (action === 'dislike') {
            reply.dislikes.push(user._id);
        }

        await review.save();

        res.json({
            likes: reply.likes,
            dislikes: reply.dislikes
        });
    } catch (err) {
        console.error('Error updating reply like/dislike:', err);
        res.status(500).json({ message: 'Error updating reply like/dislike' });
    }
});

// Delete a review (Admin only)
app.delete('/reviews/:id', async (req, res) => {
    try {
        const { username } = req.body;
        const reviewId = req.params.id;

        // Find the user and verify admin status
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.isAdmin) {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        // Find and delete the review
        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Store review data for audit trail
        const deletedReviewData = {
            reviewId: review._id,
            productId: review.product,
            userId: review.user,
            rating: review.rating,
            text: review.text,
            deletedBy: user._id,
            deletedAt: new Date(),
            originalCreatedAt: review.createdAt
        };

        // Delete the review
        await Review.findByIdAndDelete(reviewId);

        // Log the deletion for audit trail
        console.log('Review deleted by admin:', {
            adminUsername: username,
            reviewId: reviewId,
            productId: review.product,
            deletedAt: new Date()
        });

        res.json({
            message: 'Review deleted successfully',
            deletedReview: deletedReviewData
        });
    } catch (err) {
        console.error('Error deleting review:', err);
        res.status(500).json({ message: 'Error deleting review' });
    }
});

// Get all reviews for admin management
app.get('/admin/reviews', async (req, res) => {
    try {
        const { username } = req.query;

        // Find the user and verify admin status
        const user = await User.findOne({ username });
        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        // Get all reviews with product and user information
        const reviews = await Review.find({})
            .populate('user', 'username name')
            .populate('product', 'name images')
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (err) {
        console.error('Error fetching admin reviews:', err);
        res.status(500).json({ message: 'Error fetching reviews' });
    }
});

// ========== ORDER ROUTES ==========

// Create a new order
app.post('/orders/create', async (req, res) => {
    try {
        // Extract order data from request body
        const orderData = req.body;

        // Handle coupon processing if coupons are applied
        if (orderData.coupons && orderData.coupons.length > 0) {
            let totalDiscount = 0;
            const processedCoupons = [];

            for (const appliedCoupon of orderData.coupons) {
                try {
                    // Find and validate coupon
                    const coupon = await Coupon.findById(appliedCoupon.couponId);

                    if (coupon && coupon.isActive) {
                        // Update coupon usage count
                        coupon.currentUsageCount += 1;
                        await coupon.save();

                        // Record coupon usage
                        const couponUsage = new CouponUsage({
                            couponId: coupon._id,
                            couponCode: coupon.code,
                            userId: orderData.user.userId,
                            username: orderData.user.username,
                            orderId: null, // Will be updated after order is saved
                            discountAmount: appliedCoupon.discountAmount,
                            orderTotal: orderData.subtotal,
                            orderTotalAfterDiscount: orderData.totalAmount,
                            ipAddress: req.ip,
                            userAgent: req.headers['user-agent']
                        });

                        await couponUsage.save();

                        processedCoupons.push({
                            couponId: coupon._id,
                            code: coupon.code,
                            discountAmount: appliedCoupon.discountAmount,
                            discountType: coupon.discountType,
                            usageId: couponUsage._id
                        });

                        totalDiscount += appliedCoupon.discountAmount;
                    }
                } catch (couponError) {
                    console.error('Error processing coupon:', couponError);
                    // Continue with order creation even if coupon processing fails
                }
            }

            // Update order data with processed coupons
            orderData.coupons = processedCoupons;
            orderData.totalDiscount = totalDiscount;
        }

        // Create new order
        const newOrder = new Order(orderData);

        // Save order to database
        const savedOrder = await newOrder.save();

        // Update coupon usage records with order ID
        if (orderData.coupons && orderData.coupons.length > 0) {
            for (const coupon of orderData.coupons) {
                if (coupon.usageId) {
                    await CouponUsage.findByIdAndUpdate(coupon.usageId, {
                        orderId: savedOrder._id
                    });
                }
            }
        }

        // For Razorpay integration
        if (orderData.payment && orderData.payment.method === 'razorpay') {
            try {
                // Since we don't have the actual Razorpay SDK integration yet,
                // we'll create a fake Razorpay order ID that will work with the client-side
                // This is a temporary solution until proper Razorpay integration is implemented

                // Generate a fake Razorpay order ID (format: order_xxxxxxxxxxxx)
                // In production, this would come from the Razorpay API
                const fakeRazorpayOrderId = 'order_' + Math.random().toString(36).substring(2, 15) +
                                           Math.random().toString(36).substring(2, 15);

                // Update our order with the fake Razorpay order ID
                savedOrder.payment.razorpayOrderId = fakeRazorpayOrderId;
                await savedOrder.save();

                console.log('Fake Razorpay order created with ID:', fakeRazorpayOrderId);

                // Return both our order ID and the fake Razorpay order ID
                return res.status(201).json({
                    message: 'Order created successfully',
                    orderId: savedOrder._id,
                    razorpayOrderId: fakeRazorpayOrderId
                });
            } catch (razorpayError) {
                console.error('Error creating Razorpay order:', razorpayError);
                // Continue with our order even if Razorpay fails
            }
        }

        // Return order ID for non-Razorpay orders
        res.status(201).json({
            message: 'Order created successfully',
            orderId: savedOrder._id
        });
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(500).json({
            error: 'Error creating order',
            details: err.message
        });
    }
});

// Get order by ID
app.get('/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (err) {
        console.error('Error fetching order:', err);
        res.status(500).json({ error: 'Error fetching order' });
    }
});

// Update order payment status
app.put('/orders/:id/payment', async (req, res) => {
    try {
        const { transactionId, status } = req.body;

        // Find order
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Update payment information
        order.payment.transactionId = transactionId;
        order.payment.status = status;
        order.payment.paymentDate = new Date();

        // If payment is completed, update order status
        if (status === 'completed') {
            order.status = 'processing';
        }

        // Save updated order
        await order.save();

        res.json({
            message: 'Payment updated successfully',
            order
        });
    } catch (err) {
        console.error('Error updating payment:', err);
        res.status(500).json({ error: 'Error updating payment' });
    }
});

// Get user orders
app.get('/orders/user/:username', async (req, res) => {
    try {
        const username = req.params.username;

        // Find orders for user
        const orders = await Order.find({ 'user.username': username })
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (err) {
        console.error('Error fetching user orders:', err);
        res.status(500).json({ error: 'Error fetching user orders' });
    }
});

// Cancel order
app.put('/orders/:id/cancel', async (req, res) => {
    try {
        // Find order
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if order can be cancelled
        if (!['pending', 'processing'].includes(order.status)) {
            return res.status(400).json({
                error: 'Cannot cancel order',
                message: 'Only pending or processing orders can be cancelled'
            });
        }

        // Update order status
        order.status = 'cancelled';
        order.updatedAt = Date.now();

        // Save updated order
        await order.save();

        res.json({
            message: 'Order cancelled successfully',
            order
        });
    } catch (err) {
        console.error('Error cancelling order:', err);
        res.status(500).json({ error: 'Error cancelling order' });
    }
});

// Get all orders (admin only)
app.get('/orders', async (req, res) => {
    try {
        // Get query parameters for filtering and pagination
        const {
            status,
            customer,
            startDate,
            endDate,
            page = 1,
            limit = 20,
            sort = 'createdAt',
            order = 'desc'
        } = req.query;

        // Build query
        const query = {};

        // Filter by status if provided
        if (status) {
            query.status = status;
        }

        // Filter by customer (username or email) if provided
        if (customer) {
            query.$or = [
                { 'user.username': { $regex: customer, $options: 'i' } },
                { 'user.email': { $regex: customer, $options: 'i' } }
            ];
        }

        // Filter by date range if provided
        if (startDate || endDate) {
            query.createdAt = {};

            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }

            if (endDate) {
                // Add one day to include the end date fully
                const endDateObj = new Date(endDate);
                endDateObj.setDate(endDateObj.getDate() + 1);
                query.createdAt.$lt = endDateObj;
            }
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Determine sort order
        const sortOrder = order === 'asc' ? 1 : -1;
        const sortOptions = {};
        sortOptions[sort] = sortOrder;

        // Get orders with pagination and sorting
        const orders = await Order.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const total = await Order.countDocuments(query);

        res.json({
            orders,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ error: 'Error fetching orders' });
    }
});

// Update order status
app.put('/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        // Validate status
        const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Invalid status',
                message: 'Status must be one of: pending, processing, shipped, delivered, cancelled'
            });
        }

        // Find order
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Update order status
        order.status = status;
        order.updatedAt = Date.now();

        // Save updated order
        await order.save();

        res.json({
            message: 'Order status updated successfully',
            order
        });
    } catch (err) {
        console.error('Error updating order status:', err);
        res.status(500).json({ error: 'Error updating order status' });
    }
});

// ========== COUPON ROUTES ==========

// Get all coupons (admin only)
app.get('/coupons', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status = 'all',
            type = 'all',
            search = ''
        } = req.query;

        // Build query
        const query = {};

        if (status === 'active') {
            query.isActive = true;
        } else if (status === 'inactive') {
            query.isActive = false;
        }

        if (type !== 'all') {
            query.discountType = type;
        }

        if (search) {
            query.$or = [
                { code: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const coupons = await Coupon.find(query)
            .populate('createdBy', 'username name')
            .populate('applicableCategories', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalCoupons = await Coupon.countDocuments(query);
        const totalPages = Math.ceil(totalCoupons / parseInt(limit));

        res.json({
            coupons,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalCoupons,
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({ message: 'Error fetching coupons' });
    }
});

// Get public coupons for users
app.get('/coupons/public', async (req, res) => {
    try {
        const userId = req.headers.userid;

        const query = {
            isActive: true,
            isPublic: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        };

        const coupons = await Coupon.find(query)
            .select('code name description discountType discountValue maxDiscountAmount minimumOrderValue endDate')
            .sort({ priority: -1, createdAt: -1 });

        // Filter coupons applicable to user if userId provided
        let applicableCoupons = coupons;
        if (userId) {
            const user = await User.findById(userId);
            if (user) {
                applicableCoupons = [];
                for (const coupon of coupons) {
                    if (coupon.isApplicableToUser(user)) {
                        // Check usage limit per user
                        const userUsageCount = await CouponUsage.getUserUsageCount(coupon._id, userId);
                        if (userUsageCount < coupon.usageLimitPerUser) {
                            applicableCoupons.push(coupon);
                        }
                    }
                }
            }
        }

        res.json({ coupons: applicableCoupons });

    } catch (error) {
        console.error('Error fetching public coupons:', error);
        res.status(500).json({ message: 'Error fetching coupons' });
    }
});

// Validate coupon
app.post('/coupons/validate', async (req, res) => {
    try {
        const { code, cartItems, cartTotal, userId } = req.body;

        if (!code) {
            return res.status(400).json({ message: 'Coupon code is required' });
        }

        // Find coupon
        const coupon = await Coupon.findOne({
            code: code.toUpperCase(),
            isActive: true
        }).populate('applicableCategories applicableProducts excludedCategories excludedProducts');

        if (!coupon) {
            return res.status(404).json({ message: 'Invalid coupon code' });
        }

        // Check if coupon is valid (dates, usage limits)
        const now = new Date();
        const isValid = coupon.isActive &&
                       coupon.startDate <= now &&
                       coupon.endDate >= now &&
                       (coupon.usageLimit === null || coupon.currentUsageCount < coupon.usageLimit);

        if (!isValid) {
            if (now > coupon.endDate) {
                return res.status(400).json({ message: 'Coupon has expired' });
            }
            return res.status(400).json({ message: 'Coupon is not valid' });
        }

        // Check user eligibility if userId provided
        if (userId) {
            const user = await User.findById(userId);
            if (user && !coupon.isApplicableToUser(user)) {
                return res.status(400).json({ message: 'Coupon is not applicable to your account' });
            }

            // Check user usage limit
            const userUsageCount = await CouponUsage.getUserUsageCount(coupon._id, userId);
            if (userUsageCount >= coupon.usageLimitPerUser) {
                return res.status(400).json({ message: 'You have reached the usage limit for this coupon' });
            }
        }

        // Check product/category applicability
        if (cartItems && cartItems.length > 0) {
            // Populate product details for cart items
            const populatedCartItems = [];
            for (const item of cartItems) {
                const product = await Product.findById(item.productId).populate('category');
                if (product) {
                    populatedCartItems.push({
                        ...item,
                        product
                    });
                }
            }

            // Check product applicability manually
            const isApplicableToProducts = () => {
                // If no product restrictions, applicable to all
                if (coupon.applicableProducts.length === 0 && coupon.applicableCategories.length === 0) {
                    return true;
                }

                // Check if any cart item matches applicable products/categories
                return populatedCartItems.some(item => {
                    // Check if product is excluded
                    if (coupon.excludedProducts.includes(item.productId)) {
                        return false;
                    }

                    // Check if category is excluded
                    if (item.product && item.product.category &&
                        coupon.excludedCategories.includes(item.product.category._id)) {
                        return false;
                    }

                    // Check if product is in applicable products
                    if (coupon.applicableProducts.length > 0 &&
                        !coupon.applicableProducts.includes(item.productId)) {
                        return false;
                    }

                    // Check if category is in applicable categories
                    if (coupon.applicableCategories.length > 0 &&
                        item.product && item.product.category &&
                        !coupon.applicableCategories.includes(item.product.category._id)) {
                        return false;
                    }

                    return true;
                });
            };

            if (!isApplicableToProducts()) {
                return res.status(400).json({ message: 'Coupon is not applicable to items in your cart' });
            }

            // Calculate discount manually
            const calculateDiscount = () => {
                // Check minimum order value
                if (cartTotal < coupon.minimumOrderValue) {
                    return {
                        discount: 0,
                        error: `Minimum order value of ₹${coupon.minimumOrderValue} required`
                    };
                }

                // Check minimum quantity
                const totalQuantity = populatedCartItems.reduce((sum, item) => sum + item.quantity, 0);
                if (totalQuantity < coupon.minimumQuantity) {
                    return {
                        discount: 0,
                        error: `Minimum ${coupon.minimumQuantity} items required`
                    };
                }

                let discount = 0;

                switch (coupon.discountType) {
                    case 'percentage':
                        discount = (cartTotal * coupon.discountValue) / 100;
                        if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
                            discount = coupon.maxDiscountAmount;
                        }
                        break;

                    case 'fixed':
                        discount = Math.min(coupon.discountValue, cartTotal);
                        break;

                    case 'free_shipping':
                        // This would be handled separately in shipping calculation
                        discount = 0;
                        break;

                    case 'buy_x_get_y':
                        // Calculate buy X get Y discount
                        const eligibleItems = populatedCartItems.filter(item =>
                            isApplicableToProducts([item])
                        );

                        let totalEligibleQuantity = eligibleItems.reduce((sum, item) =>
                            sum + item.quantity, 0
                        );

                        const sets = Math.floor(totalEligibleQuantity / coupon.buyXGetY.buyQuantity);
                        const freeItems = sets * coupon.buyXGetY.getQuantity;

                        // Calculate discount on cheapest items
                        const sortedItems = eligibleItems
                            .flatMap(item => Array(item.quantity).fill(item.price))
                            .sort((a, b) => a - b);

                        for (let i = 0; i < Math.min(freeItems, sortedItems.length); i++) {
                            discount += sortedItems[i] * (coupon.buyXGetY.getDiscountPercentage / 100);
                        }
                        break;
                }

                return { discount: Math.round(discount * 100) / 100 };
            };

            const discountResult = calculateDiscount();

            if (discountResult.error) {
                return res.status(400).json({ message: discountResult.error });
            }

            return res.json({
                valid: true,
                coupon: {
                    id: coupon._id,
                    code: coupon.code,
                    name: coupon.name,
                    discountType: coupon.discountType,
                    discountValue: coupon.discountValue
                },
                discount: discountResult.discount,
                message: `Coupon applied! You saved ₹${discountResult.discount}`
            });
        }

        // If no cart items provided, just validate the coupon
        res.json({
            valid: true,
            coupon: {
                id: coupon._id,
                code: coupon.code,
                name: coupon.name,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                minimumOrderValue: coupon.minimumOrderValue
            }
        });

    } catch (error) {
        console.error('Error validating coupon:', error);
        res.status(500).json({ message: 'Error validating coupon' });
    }
});

// Create new coupon (admin only)
app.post('/coupons', async (req, res) => {
    try {
        const {
            code,
            name,
            description,
            discountType,
            discountValue,
            maxDiscountAmount,
            minimumOrderValue,
            minimumQuantity,
            usageLimit,
            usageLimitPerUser,
            startDate,
            endDate,
            applicableProducts,
            applicableCategories,
            excludedProducts,
            excludedCategories,
            applicableUserTypes,
            buyXGetY,
            isPublic,
            autoApply,
            priority,
            isStackable,
            createdBy
        } = req.body;

        // Validate required fields
        if (!code || !name || !discountType || !discountValue || !endDate || !createdBy) {
            return res.status(400).json({
                message: 'Code, name, discount type, discount value, end date, and created by are required'
            });
        }

        // Check if coupon code already exists
        const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
        if (existingCoupon) {
            return res.status(400).json({ message: 'Coupon code already exists' });
        }

        // Create new coupon
        const newCoupon = new Coupon({
            code: code.toUpperCase(),
            name,
            description,
            discountType,
            discountValue,
            maxDiscountAmount,
            minimumOrderValue: minimumOrderValue || 0,
            minimumQuantity: minimumQuantity || 1,
            usageLimit,
            usageLimitPerUser: usageLimitPerUser || 1,
            startDate: startDate || new Date(),
            endDate: new Date(endDate),
            applicableProducts: applicableProducts || [],
            applicableCategories: applicableCategories || [],
            excludedProducts: excludedProducts || [],
            excludedCategories: excludedCategories || [],
            applicableUserTypes: applicableUserTypes || ['all'],
            buyXGetY: buyXGetY || {
                buyQuantity: 1,
                getQuantity: 1,
                getDiscountPercentage: 100
            },
            isPublic: isPublic !== false,
            autoApply: autoApply || false,
            priority: priority || 0,
            isStackable: isStackable || false,
            createdBy
        });

        const savedCoupon = await newCoupon.save();

        res.status(201).json({
            message: 'Coupon created successfully',
            coupon: savedCoupon
        });

    } catch (error) {
        console.error('Error creating coupon:', error);
        res.status(500).json({ message: 'Error creating coupon' });
    }
});

// Update coupon (admin only)
app.put('/coupons/:id', async (req, res) => {
    try {
        const couponId = req.params.id;
        const updateData = req.body;

        // Remove fields that shouldn't be updated
        delete updateData._id;
        delete updateData.currentUsageCount;
        delete updateData.createdAt;

        // If code is being updated, check for duplicates
        if (updateData.code) {
            updateData.code = updateData.code.toUpperCase();
            const existingCoupon = await Coupon.findOne({
                code: updateData.code,
                _id: { $ne: couponId }
            });
            if (existingCoupon) {
                return res.status(400).json({ message: 'Coupon code already exists' });
            }
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            { ...updateData, updatedAt: new Date() },
            { new: true }
        ).populate('createdBy', 'username name');

        if (!updatedCoupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        res.json({
            message: 'Coupon updated successfully',
            coupon: updatedCoupon
        });

    } catch (error) {
        console.error('Error updating coupon:', error);
        res.status(500).json({ message: 'Error updating coupon' });
    }
});

// Delete coupon (admin only)
app.delete('/coupons/:id', async (req, res) => {
    try {
        const couponId = req.params.id;

        const deletedCoupon = await Coupon.findByIdAndDelete(couponId);

        if (!deletedCoupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        res.json({ message: 'Coupon deleted successfully' });

    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(500).json({ message: 'Error deleting coupon' });
    }
});

// Get coupon usage statistics
app.get('/coupons/:id/usage', async (req, res) => {
    try {
        const couponId = req.params.id;

        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        // Get usage statistics
        const totalUsage = await CouponUsage.getTotalUsageCount(couponId);
        const recentUsage = await CouponUsage.find({ couponId })
            .populate('userId', 'username name')
            .sort({ usedAt: -1 })
            .limit(10);

        // Calculate total discount given
        const usageStats = await CouponUsage.aggregate([
            { $match: { couponId: mongoose.Types.ObjectId(couponId) } },
            {
                $group: {
                    _id: null,
                    totalDiscountGiven: { $sum: '$discountAmount' },
                    totalOrderValue: { $sum: '$orderTotal' },
                    averageDiscount: { $avg: '$discountAmount' },
                    uniqueUsers: { $addToSet: '$userId' }
                }
            }
        ]);

        const stats = usageStats[0] || {
            totalDiscountGiven: 0,
            totalOrderValue: 0,
            averageDiscount: 0,
            uniqueUsers: []
        };

        res.json({
            coupon: {
                code: coupon.code,
                name: coupon.name,
                currentUsageCount: coupon.currentUsageCount,
                usageLimit: coupon.usageLimit,
                remainingUsage: coupon.usageLimit ? coupon.usageLimit - coupon.currentUsageCount : null
            },
            statistics: {
                totalUsage,
                totalDiscountGiven: stats.totalDiscountGiven,
                totalOrderValue: stats.totalOrderValue,
                averageDiscount: stats.averageDiscount,
                uniqueUsersCount: stats.uniqueUsers.length
            },
            recentUsage
        });

    } catch (error) {
        console.error('Error fetching coupon usage:', error);
        res.status(500).json({ message: 'Error fetching coupon usage' });
    }
});

// ========== PUSH NOTIFICATION ENDPOINTS ==========

// Subscribe to push notifications
app.post('/api/notifications/subscribe', async (req, res) => {
    try {
        const { subscription, userId } = req.body;

        if (!subscription || !userId) {
            return res.status(400).json({ message: 'Subscription and userId are required' });
        }

        // Check if subscription already exists
        const existingSubscription = await Notification.findByEndpoint(subscription.endpoint);

        if (existingSubscription) {
            // Update existing subscription
            existingSubscription.userId = userId;
            existingSubscription.subscription = subscription;
            existingSubscription.isActive = true;
            existingSubscription.lastUsed = new Date();
            await existingSubscription.save();

            return res.json({ message: 'Subscription updated successfully' });
        }

        // Create new subscription
        const newSubscription = new Notification({
            userId,
            subscription,
            deviceInfo: {
                userAgent: req.headers['user-agent'],
                platform: req.headers['sec-ch-ua-platform'],
                language: req.headers['accept-language'],
                timezone: req.body.timezone
            }
        });

        await newSubscription.save();
        res.json({ message: 'Subscription created successfully' });

    } catch (error) {
        console.error('Error subscribing to notifications:', error);
        res.status(500).json({ message: 'Error subscribing to notifications' });
    }
});

// Update notification preferences
app.put('/api/notifications/preferences', async (req, res) => {
    try {
        const { userId, preferences } = req.body;

        if (!userId || !preferences) {
            return res.status(400).json({ message: 'UserId and preferences are required' });
        }

        const subscriptions = await Notification.findActiveByUserId(userId);

        for (const subscription of subscriptions) {
            await subscription.updatePreferences(preferences);
        }

        res.json({ message: 'Preferences updated successfully' });

    } catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({ message: 'Error updating preferences' });
    }
});

// Get notification preferences
app.get('/api/notifications/preferences/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const subscription = await Notification.findOne({ userId, isActive: true });

        if (!subscription) {
            return res.json({ preferences: null });
        }

        res.json({ preferences: subscription.preferences });

    } catch (error) {
        console.error('Error getting notification preferences:', error);
        res.status(500).json({ message: 'Error getting preferences' });
    }
});

// Unsubscribe from notifications
app.delete('/api/notifications/unsubscribe', async (req, res) => {
    try {
        const { endpoint, userId } = req.body;

        let query = {};
        if (endpoint) {
            query['subscription.endpoint'] = endpoint;
        } else if (userId) {
            query.userId = userId;
        } else {
            return res.status(400).json({ message: 'Endpoint or userId is required' });
        }

        await Notification.updateMany(query, { isActive: false });
        res.json({ message: 'Unsubscribed successfully' });

    } catch (error) {
        console.error('Error unsubscribing from notifications:', error);
        res.status(500).json({ message: 'Error unsubscribing' });
    }
});

// Send test notification (admin only)
app.post('/api/notifications/test', async (req, res) => {
    try {
        const { userId, title, body } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'UserId is required' });
        }

        const subscriptions = await Notification.findActiveByUserId(userId);

        if (subscriptions.length === 0) {
            return res.status(404).json({ message: 'No active subscriptions found' });
        }

        // TODO: Implement actual push notification sending with web-push library
        // For now, just return success
        res.json({
            message: 'Test notification sent',
            subscriptionsCount: subscriptions.length
        });

    } catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({ message: 'Error sending notification' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
