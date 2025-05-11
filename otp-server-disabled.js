require('dotenv').config({ path: './demo.env' });
const express = require('express');
const cors = require('cors');
const app = express();

// CORS middleware at the very top
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

app.use(express.json());

// Example root route
app.get('/', (req, res) => {
  res.send('Welcome to Tridex API!');
});

app.listen(3000, () => console.log('Server running on port 3000'));
