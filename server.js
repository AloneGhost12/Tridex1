const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

// Dummy signup endpoint
app.post('/signup', (req, res) => {
    console.log('Received signup:', req.body);
    // You can add your logic here (e.g., save user to DB)
    res.json({ message: 'Signup successful!' });
});

// Dummy login endpoint
app.post('/login', (req, res) => {
    console.log('Received login:', req.body);
    // You can add your logic here (e.g., check user credentials)
    res.json({ message: 'Login successful!' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
