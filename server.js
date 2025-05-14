const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const dotenv = require('dotenv');
const User = require('./models/User'); // Make sure the path is correct
const Product = require('./models/Product');
const Announcement = require('./models/Announcement');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: ['https://aloneghost12.github.io', 'http://localhost:3000', 'http://127.0.0.1:5500', '*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Username', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.options('*', cors());

// Add specific CORS headers for all responses as a fallback
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Username');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});
app.use(express.json());

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

        // Create a welcome message for the user
        const welcomeMessage = new Announcement({
            title: `Welcome to Tridex, ${username}!`,
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
            isAdmin: user.isAdmin || false,
            username: user.username,
            verified: user.verified || false,
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


// ========== USER MANAGEMENT ==========

app.get('/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password');
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
                    isAdmin: username === 'admin' ? true : false
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


// ========== PRODUCT ROUTES ==========

app.get('/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching products' });
    }
});

app.post('/products', async (req, res) => {
    try {
        const { name, image, desc, price } = req.body;
        const product = new Product({ name, image, desc, price });
        await product.save();
        res.json({ message: 'Product added', product });
    } catch (err) {
        res.status(500).json({ message: 'Error adding product' });
    }
});

app.put('/products/:id', async (req, res) => {
    try {
        const { name, image, desc, price } = req.body;
        await Product.findByIdAndUpdate(req.params.id, { name, image, desc, price });
        res.json({ message: 'Product updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating product' });
    }
});

app.delete('/products/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting product' });
    }
});


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

// ========== CLOUDINARY CONFIG ==========

// Endpoint to safely provide Cloudinary configuration
app.get('/cloudinary-config', (req, res) => {
    try {
        // Only return the cloud name, not the API key or secret
        res.json({
            cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'your_cloud_name'
        });
    } catch (err) {
        console.error('Error providing Cloudinary config:', err);
        res.status(500).json({ message: 'Error providing Cloudinary configuration' });
    }
});

// ========== ANNOUNCEMENT ROUTES ==========

app.get('/announcements', async (req, res) => {
    try {
        const { username } = req.query;

        // If username is provided, get general announcements + user-specific ones
        let query = {};
        if (username) {
            query = {
                $or: [
                    { forUser: null }, // General announcements for everyone
                    { forUser: username } // User-specific announcements
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
        const { title, message } = req.body;
        const announcement = new Announcement({ title, message });
        await announcement.save();
        res.json({ message: 'Announcement sent', announcement });
    } catch (err) {
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

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
