const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Shop = require('../models/Shop');

// Middleware to check for admin role
const adminAuth = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied. Admin role required.' });
    }
    next();
};

// @route   GET /api/admin/users
// @desc    Get all registered users
// @access  Private (Admin only)
router.get('/users', [auth, adminAuth], async (req, res) => {
    try {
        // Find all users but exclude their passwords from the result
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/admin/shops
// @desc    Get all registered shops
// @access  Private (Admin only)
router.get('/shops', [auth, adminAuth], async (req, res) => {
    try {
        // Find all shops and populate the owner's name and email
        const shops = await Shop.find().populate('owner', ['name', 'email']);
        res.json(shops);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
