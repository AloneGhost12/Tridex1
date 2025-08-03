const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        unique: true 
    },
    icon: { 
        type: String, // URL to the icon image
        default: '' 
    },
    description: { 
        type: String,
        default: '' 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Category', CategorySchema);
