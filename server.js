 const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const User = require('./models/User'); // Ensure the path is correct
const Product = require('./models/Product');
const Announcement = require('./models/Announcement');
require('dotenv').config(); // To use environment variables

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['https://aloneghost12.github.io'], // Allow only your frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true  // Enable if you plan to send cookies/auth headers
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch((err) => console.error('MongoDB connection error:', err));

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

        await newUser.save();
        res.status(201).json({ message: 'Signup successful!' });

    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// LOGIN
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user by username, email, or phone
        const user = await User.findOne({
            $or: [
                { username: username },
                { email: username },
                { phone: username }
            ]
        });
        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Respond with token and user info
        res.status(200).json({
            message: 'Login successful!',
            isAdmin: user.isAdmin || false,
            username: user.username,
            token: token // Send the actual JWT
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ========== USER MANAGEMENT ==========

// Middleware to verify JWT and set user in request
const authenticateJWT = (req, res, next) => {
    const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token required' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

app.get('/users', authenticateJWT, async (req, res) => {
    try {
        const users = await User.find({}, '-password');
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

app.put('/users/:id/ban', authenticateJWT, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Permission denied' });

    try {
        await User.findByIdAndUpdate(req.params.id, { banned: true });
        res.json({ message: 'User banned' });
    } catch (err) {
        res.status(500).json({ message: 'Error banning user' });
    }
});

app.put('/users/:id/unban', authenticateJWT, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Permission denied' });

    try {
        await User.findByIdAndUpdate(req.params.id, { banned: false });
        res.json({ message: 'User unbanned' });
    } catch (err) {
        res.status(500).json({ message: 'Error unbanning user' });
    }
});

app.put('/users/:id/verify', authenticateJWT, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Permission denied' });

    try {
        await User.findByIdAndUpdate(req.params.id, { verified: true });
        res.json({ message: 'User verified' });
    } catch (err) {
        res.status(500).json({ message: 'Error verifying user' });
    }
});

app.delete('/users/:id', authenticateJWT, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Permission denied' });

    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting user' });
    }
});

// ========== PRODUCT ROUTES ==========

app.get('/products', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const products = await Product.find().skip(skip).limit(limit);
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching products', error: err.message });
    }
});

app.post('/products', authenticateJWT, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Permission denied' });

    try {
        const { name, image, desc, price } = req.body;
        const product = new Product({ name, image, desc, price });
        await product.save();
        res.json({ message: 'Product added', product });
    } catch (err) {
        res.status(500).json({ message: 'Error adding product' });
    }
});

app.put('/products/:id', authenticateJWT, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Permission denied' });

    try {
        const { name, image, desc, price } = req.body;
        await Product.findByIdAndUpdate(req.params.id, { name, image, desc, price });
        res.json({ message: 'Product updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating product' });
    }
});

app.delete('/products/:id', authenticateJWT, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Permission denied' });

    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting product' });
    }
});

// ========== ANNOUNCEMENT ROUTES ==========

app.get('/announcements', async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ createdAt: -1 });
        res.json(announcements);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching announcements' });
    }
});

app.post('/announcements', authenticateJWT, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Permission denied' });

    try {
        const { title, message } = req.body;
        const announcement = new Announcement({ title, message });
        await announcement.save();
        res.json({ message: 'Announcement sent', announcement });
    } catch (err) {
        res.status(500).json({ message: 'Error sending announcement' });
    }
});

app.delete('/announcements/:id', authenticateJWT, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Permission denied' });

    try {
        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ message: 'Announcement deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting announcement' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
