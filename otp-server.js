require('dotenv').config({ path: './demo.env' });
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const app = express();

// CORS middleware at the very top
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Explicitly handle preflight requests for all routes
app.options('*', cors());

app.use(express.json());

let otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  const otp = generateOTP();
  otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP is: ${otp}`,
  });

  res.json({ message: 'OTP sent' });
});

app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];
  if (record && record.otp === otp && Date.now() < record.expires) {
    delete otpStore[email];
    return res.json({ success: true, message: 'OTP verified' });
  }
  res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
});

app.listen(3000, () => console.log('Server running on port 3000'));
