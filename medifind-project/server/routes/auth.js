const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const User = require('../models/User'); // Import our User model

// --- REGISTRATION ENDPOINT ---
// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Basic Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    // 2. Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User with this email already exists' });
    }

    // 3. Create a new user instance
    user = new User({
      name,
      email,
      password,
      role,
    });

    // 4. Hash the password for security
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // 5. Save the user to the database
    await user.save();

    res.status(201).json({ msg: 'User registered successfully!' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// --- LOGIN ENDPOINT ---
// @route   POST /api/auth/login
// @desc    Authenticate a user and get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Basic Validation
    if (!email || !password) {
      return res.status(400).json({ msg: 'Please provide email and password' });
    }

    // 2. Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // 3. Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // 4. User is valid, create JWT payload
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    // 5. Sign the token
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' }, // Token expires in 5 hours
      (err, token) => {
        if (err) throw err;
        res.json({ token }); // Send the token to the client
      }
    );

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


module.exports = router;

