const mongoose = require('mongoose');

/**
 * Schema for storing contact form submissions
 * This allows for:
 * 1. Tracking user inquiries and support requests
 * 2. Managing customer support workflow
 * 3. Providing admin dashboard functionality for customer service
 */
const ContactMessageSchema = new mongoose.Schema({
    // Contact information
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
    },
    phone: {
        type: String,
        trim: true
    },
    
    // Message details
    subject: {
        type: String,
        required: true,
        enum: ['Product Inquiry', 'Order Issue', 'Technical Support', 'Account Help', 'Feedback', 'Other']
    },
    message: {
        type: String,
        required: true,
        minlength: [10, 'Message must be at least 10 characters long']
    },
    
    // Attachment (optional)
    attachment: {
        filename: String,
        contentType: String,
        data: Buffer
    },
    
    // Status tracking
    status: {
        type: String,
        enum: ['New', 'In Progress', 'Resolved', 'Closed'],
        default: 'New'
    },
    
    // Admin response
    adminResponse: {
        text: String,
        respondedBy: String,
        respondedAt: Date
    },
    
    // User information (if logged in)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    username: {
        type: String,
        default: null
    },
    
    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    
    // Privacy policy acceptance
    acceptedPolicy: {
        type: Boolean,
        required: true,
        default: false
    }
});

// Update the updatedAt field on save
ContactMessageSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Create indexes for efficient queries
ContactMessageSchema.index({ status: 1, createdAt: -1 });
ContactMessageSchema.index({ email: 1 });
ContactMessageSchema.index({ username: 1 });

module.exports = mongoose.model('ContactMessage', ContactMessageSchema);
