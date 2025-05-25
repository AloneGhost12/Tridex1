const mongoose = require('mongoose');

// Address schema for user addresses
const AddressSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true, default: 'India' },
    phone: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Add ban, unban, verify fields to user schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    age: { type: String, required: false }, // Changed to String and not required for Google users
    gender: { type: String, required: false }, // Not required for Google users
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: false }, // Not required for Google users
    password: { type: String, required: false }, // Not required for Google users
    banned: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    addresses: [AddressSchema], // Array of saved addresses

    // Google OAuth fields
    googleId: { type: String, unique: true, sparse: true }, // Google user ID
    profilePicture: { type: String }, // Google profile picture URL
    isGoogleUser: { type: Boolean, default: false }, // Flag to identify Google users

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
