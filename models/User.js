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
    age: { type: Number, required: true },
    gender: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    banned: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    addresses: [AddressSchema] // Array of saved addresses
});

const User = mongoose.model('User', userSchema);

module.exports = User;
