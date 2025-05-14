const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    forUser: { type: String, default: null }, // If set, message is only for this user
    isWelcomeMessage: { type: Boolean, default: false }, // Flag for welcome messages
    isRead: { type: Boolean, default: false } // Track if message has been read
});

module.exports = mongoose.model('Announcement', AnnouncementSchema);
