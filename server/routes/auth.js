// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/userModel'); // Import the corrected User model

// ------------------------------------------------------------------
// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
// ------------------------------------------------------------------
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    // 1. Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // 2. Create new user instance
    user = new User({
      name,
      email,
      password,
      role: role || 'employee' 
    });

    // 3. Save user (triggers password hashing)
    await user.save();

    // 4. User created: Create and return JWT
    const payload = {
      user: {
        id: user.id,
        email: user.email,     
        role: user.role,       
        isAdmin: user.role === 'admin'
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({ token });
      }
    );
  } catch (err) {
    console.error('Registration Error:', err.message);
    res.status(500).json({ msg: 'Server Error during registration', error: err.message });
  }
});

// ------------------------------------------------------------------
// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
// ------------------------------------------------------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Check if user exists by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    // 2. Check if password matches (uses userModel.js method)
    const isMatch = await user.comparePassword(password); 

    if (!isMatch) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    // 3. User authenticated: Create and return JWT
    const payload = {
      user: {
        id: user.id,
        email: user.email,     
        role: user.role,       
        isAdmin: user.role === 'admin'
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).send('Server Error during login');
  }
});

module.exports = router;