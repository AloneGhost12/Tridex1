// Configuration for API endpoints
// This file helps you easily switch between development and production environments

const CONFIG = {
    // Set this to true for local development, false for production
    isDevelopment: false,

    // API endpoints
    endpoints: {
        development: {
            base: 'http://localhost:3000',
            auth: 'http://localhost:3000/auth/google',
            signup: 'http://localhost:3000/signup',
            login: 'http://localhost:3000/login',
            users: 'http://localhost:3000/users',
            products: 'http://localhost:3000/products',
            categories: 'http://localhost:3000/categories',
            orders: 'http://localhost:3000/orders',
            contact: 'http://localhost:3000/contact',
            cloudinary: 'http://localhost:3000/cloudinary-config'
        },
        production: {
            base: 'https://tridex1.onrender.com',
            auth: 'https://tridex1.onrender.com/auth/google',
            signup: 'https://tridex1.onrender.com/signup',
            login: 'https://tridex1.onrender.com/login',
            users: 'https://tridex1.onrender.com/users',
            products: 'https://tridex1.onrender.com/products',
            categories: 'https://tridex1.onrender.com/categories',
            orders: 'https://tridex1.onrender.com/orders',
            contact: 'https://tridex1.onrender.com/contact',
            cloudinary: 'https://tridex1.onrender.com/cloudinary-config'
        }
    },

    // Google OAuth Client IDs
    googleClientId: {
        development: '511326319939-431231ifhs4239598gc0d7ba2vc97lms.apps.googleusercontent.com',
        production: '511326319939-431231ifhs4239598gc0d7ba2vc97lms.apps.googleusercontent.com'
    }
};

// Helper functions
const API = {
    // Get the current environment's endpoints
    getEndpoint: function(name) {
        const env = CONFIG.isDevelopment ? 'development' : 'production';
        return CONFIG.endpoints[env][name];
    },

    // Get the Google Client ID for current environment
    getGoogleClientId: function() {
        const env = CONFIG.isDevelopment ? 'development' : 'production';
        return CONFIG.googleClientId[env];
    },

    // Make a fetch request with automatic endpoint resolution
    fetch: async function(endpointName, options = {}) {
        const url = this.getEndpoint(endpointName);

        // Add default headers
        const defaultHeaders = {
            'Content-Type': 'application/json'
        };

        const fetchOptions = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, fetchOptions);
            return response;
        } catch (error) {
            console.error(`API request failed for ${endpointName}:`, error);
            throw error;
        }
    },

    // Make a POST request to any endpoint
    post: async function(endpointName, data, additionalOptions = {}) {
        return this.fetch(endpointName, {
            method: 'POST',
            body: JSON.stringify(data),
            ...additionalOptions
        });
    },

    // Make a GET request to any endpoint
    get: async function(endpointName, additionalOptions = {}) {
        return this.fetch(endpointName, {
            method: 'GET',
            ...additionalOptions
        });
    }
};

// Auto-detect environment based on current URL
if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    const currentProtocol = window.location.protocol;

    // If running locally (localhost or file://) and you want to use local server
    if ((currentHost === 'localhost' || currentHost === '127.0.0.1') && currentProtocol === 'http:') {
        CONFIG.isDevelopment = true;
        console.log('🔧 Development environment detected');
    } else {
        // Default to production for file:// protocol and all other cases
        CONFIG.isDevelopment = false;
        console.log('🌐 Production environment detected');
    }

    console.log(`📡 API Base URL: ${API.getEndpoint('base')}`);
    console.log(`🔑 Google Client ID: ${API.getGoogleClientId()}`);
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, API };
}

// Usage Examples:
/*
// In your HTML files, include this script before other scripts:
// <script src="js/config.js"></script>

// Then use it like this:

// For Google OAuth:
const clientId = API.getGoogleClientId();

// For API calls:
API.post('auth', { credential: token, mode: 'login' })
    .then(response => response.json())
    .then(data => console.log(data));

// Or get specific endpoints:
const authUrl = API.getEndpoint('auth');
fetch(authUrl, { method: 'POST', ... });

// To switch environments, just change CONFIG.isDevelopment to true/false
*/
