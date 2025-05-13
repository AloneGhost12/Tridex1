 // server.js

require('dotenv').config(); // Load environment variables first

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const User = require('./models/User');
const Product = require('./models/Product');
const Announcement = require('./models/Announcement');

const app = express();
const PORT = process.env.PORT || 3000;

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'TridexUploads',
    allowed_formats: ['jpg', 'jpeg', 'png'],
  },
});
const upload = multer({ storage });

// Middleware
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'https://aloneghost12.github.io'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://admin:admin123@cluster0.g3sy76o.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch((err) => console.error('MongoDB connection error:', err));

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to Tridex API!');
});

// ================= AUTH ROUTES ================= //

// SIGNUP
app.post('/signup', async (req, res) => {
  try {
    const { name, age, gender, username, email, phone, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, age, gender, username, email, phone, password: hashedPassword });

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
    const user = await User.findOne({ username });

    if (!user) return res.status(401).json({ message: 'Invalid username' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid password' });

    const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      message: 'Login successful!',
      isAdmin: user.isAdmin || false,
      username: user.username,
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ================= USER MANAGEMENT ================= //

app.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users' });
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

app.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// ================= PRODUCT ROUTES ================= //

app.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching products' });
  }
});

app.post('/products', upload.single('image'), async (req, res) => {
  try {
    const { name, price, desc } = req.body;
    const imageUrl = req.file.path;

    const newProduct = new Product({ name, price, desc, image: imageUrl });
    await newProduct.save();
    res.status(201).json({ message: 'Product added', product: newProduct });
  } catch (err) {
    res.status(500).json({ message: 'Error adding product' });
  }
});

app.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching product' });
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

// ================= ANNOUNCEMENT ROUTES ================= //

app.get('/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
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

// ================= START SERVER ================= //
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
