const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const dotenv = require('dotenv');
const fileUpload = require('express-fileupload');
const User = require('./models/User'); // Make sure the path is correct
const Product = require('./models/Product');
const Category = require('./models/Category');
const Announcement = require('./models/Announcement');
const ChatInteraction = require('./models/ChatInteraction');
const ContactMessage = require('./models/ContactMessage');
const Order = require('./models/Order');
const { generateProductSummary } = require('./utils/aiSummaryGenerator');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Define allowed origins
const allowedOrigins = [
    'https://aloneghost12.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:5500'
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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Username', 'X-Requested-With', 'Accept', 'Origin'],
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
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Username');

    // Don't use credentials with wildcard origin
    // res.header('Access-Control-Allow-Credentials', 'true');

    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    next();
});
app.use(express.json());

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
        res.status(500).json({ message: 'Error checking ban status' });
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
        // If category query parameter is provided, filter by category
        const filter = {};
        if (req.query.category) {
            filter.category = req.query.category;
        }

        // Populate the category field to get category details
        const products = await Product.find(filter).populate('category');
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

// Create a new order
app.post('/orders/create', async (req, res) => {
    try {
        // Extract order data from request body
        const orderData = req.body;

        // Create new order
        const newOrder = new Order(orderData);

        // Save order to database
        const savedOrder = await newOrder.save();

        // Return order ID
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

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
