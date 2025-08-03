/**
 * Color Variant Schema
 * This schema defines standardized color options for products
 */
const mongoose = require('mongoose');

const ColorVariantSchema = new mongoose.Schema({
    // Color name (e.g., "Red", "Navy Blue")
    name: {
        type: String,
        required: true
    },
    
    // Color code in hex format (e.g., "#FF0000" for red)
    hexCode: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
            },
            message: props => `${props.value} is not a valid hex color code!`
        }
    },
    
    // Display order for consistent presentation
    displayOrder: {
        type: Number,
        default: 0
    },
    
    // Whether this color is active/available
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Creation timestamp
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ColorVariant', ColorVariantSchema);
