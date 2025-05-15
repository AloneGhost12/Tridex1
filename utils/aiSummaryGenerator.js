/**
 * AI Summary Generator for Product Descriptions
 * 
 * This utility generates AI-like summaries for products based on their details.
 * It uses simple NLP techniques to analyze product information and create
 * unique, tailored summaries that highlight key features and benefits.
 */

// Common phrases to start summaries
const introductionPhrases = [
    "This premium {category} offers",
    "Experience exceptional quality with this {category} featuring",
    "Discover the perfect {category} with",
    "Elevate your experience with this {category} that provides",
    "This high-quality {category} delivers",
    "Introducing a versatile {category} that combines",
    "Meet your needs with this reliable {category} offering",
    "Enhance your lifestyle with this innovative {category} that includes",
    "This feature-rich {category} comes with",
    "Designed for performance, this {category} boasts"
];

// Common phrases for mid-section
const featurePhrases = [
    "impressive {feature}",
    "outstanding {feature}",
    "exceptional {feature}",
    "superior {feature}",
    "excellent {feature}",
    "remarkable {feature}",
    "top-notch {feature}",
    "high-quality {feature}",
    "premium {feature}",
    "state-of-the-art {feature}"
];

// Common phrases for ending
const conclusionPhrases = [
    "Perfect for those seeking quality and reliability.",
    "An excellent choice for discerning customers.",
    "Ideal for anyone looking to upgrade their {category} experience.",
    "A smart investment for long-term satisfaction.",
    "The perfect balance of quality and value.",
    "Designed to exceed your expectations.",
    "A must-have addition to your collection.",
    "Satisfaction guaranteed with this exceptional product.",
    "Experience the difference quality makes.",
    "Don't miss out on this outstanding offering."
];

// Value proposition phrases
const valuePhrases = [
    "offering exceptional value for money",
    "combining quality and affordability",
    "providing premium features at a competitive price",
    "delivering high-end performance without the premium price tag",
    "ensuring you get the most for your investment",
    "balancing cost-effectiveness with superior quality",
    "giving you premium quality at an accessible price point",
    "representing excellent value in its category"
];

/**
 * Extract key features from product description
 * @param {string} description - Product description
 * @returns {Array} - Array of key features
 */
function extractFeatures(description) {
    if (!description) return [];
    
    // Split description into sentences
    const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Extract key phrases (simple approach)
    const features = [];
    const words = description.toLowerCase().split(/\s+/);
    
    // Look for feature indicators
    const featureIndicators = [
        'featuring', 'with', 'includes', 'boasts', 'offers', 'provides',
        'equipped', 'built-in', 'designed', 'made of', 'crafted'
    ];
    
    sentences.forEach(sentence => {
        const lowerSentence = sentence.toLowerCase();
        featureIndicators.forEach(indicator => {
            if (lowerSentence.includes(indicator)) {
                // Extract the part after the indicator
                const parts = lowerSentence.split(indicator);
                if (parts.length > 1) {
                    features.push(parts[1].trim());
                }
            }
        });
    });
    
    // If no features found with indicators, use sentences as features
    if (features.length === 0 && sentences.length > 0) {
        // Use up to 3 sentences as features
        return sentences.slice(0, 3).map(s => s.trim());
    }
    
    return features.slice(0, 3); // Return up to 3 features
}

/**
 * Get category name from category object or fallback to generic term
 * @param {Object} category - Category object
 * @returns {string} - Category name or generic term
 */
function getCategoryName(category) {
    if (!category) return 'product';
    
    if (typeof category === 'object' && category.name) {
        return category.name.toLowerCase();
    }
    
    return 'product';
}

/**
 * Select a random item from an array
 * @param {Array} array - Array to select from
 * @returns {*} - Random item from array
 */
function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate a unique product summary based on product details
 * @param {Object} product - Product object with name, description, price, category
 * @returns {string} - Generated product summary
 */
function generateProductSummary(product) {
    if (!product) return null;
    
    const { name, desc, price, category } = product;
    
    // Get category name
    const categoryName = getCategoryName(category);
    
    // Extract features from description
    const features = extractFeatures(desc);
    
    // Generate introduction
    let intro = getRandomItem(introductionPhrases).replace('{category}', categoryName);
    
    // Generate feature descriptions
    let featureText = '';
    if (features.length > 0) {
        const featureDescriptions = features.map(feature => {
            return getRandomItem(featurePhrases).replace('{feature}', feature);
        });
        
        // Join features with appropriate conjunctions
        if (featureDescriptions.length === 1) {
            featureText = featureDescriptions[0];
        } else if (featureDescriptions.length === 2) {
            featureText = `${featureDescriptions[0]} and ${featureDescriptions[1]}`;
        } else {
            featureText = `${featureDescriptions[0]}, ${featureDescriptions[1]}, and ${featureDescriptions[2]}`;
        }
    } else {
        // If no features extracted, use generic feature text
        featureText = `quality craftsmanship and attention to detail`;
    }
    
    // Add value proposition
    const valueProposition = getRandomItem(valuePhrases);
    
    // Generate conclusion
    const conclusion = getRandomItem(conclusionPhrases).replace('{category}', categoryName);
    
    // Combine all parts
    return `${intro} ${featureText}, ${valueProposition}. ${conclusion}`;
}

module.exports = { generateProductSummary };
