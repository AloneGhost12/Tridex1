const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Root route
app.get('/', (req, res) => {
    res.send('Welcome to Tridex API!');
});

// Dummy signup endpoint
app.post('/signup', (req, res) => {
    console.log('Received signup:', req.body);
    res.json({ message: 'Signup successful!' });
});

// Dummy login endpoint
app.post('/login', (req, res) => {
    console.log('Received login:', req.body);
    res.json({ message: 'Login successful!' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
