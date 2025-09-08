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
        const shops = await Shop.find().populate('owner', ['name', 'email']);
        res.json(shops);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- NEW ENDPOINT 1: Delete a specific user ---
// @route   DELETE /api/admin/users/:id
// @desc    Delete a user and their associated shop if they are an owner
// @access  Private (Admin only)
router.delete('/users/:id', [auth, adminAuth], async (req, res) => {
    try {
        const userToDelete = await User.findById(req.params.id);
        if (!userToDelete) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (userToDelete.id === req.user.id) {
            return res.status(400).json({ msg: 'You cannot delete your own admin account.' });
        }

        if (userToDelete.role === 'shop_owner' && userToDelete.shopId) {
            await Shop.findOneAndDelete({ _id: userToDelete.shopId });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ msg: 'User removed successfully.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- NEW ENDPOINT 2: Delete a specific shop ---
// @route   DELETE /api/admin/shops/:id
// @desc    Delete a shop and update its owner
// @access  Private (Admin only)
router.delete('/shops/:id', [auth, adminAuth], async (req, res) => {
    try {
        const shopToDelete = await Shop.findById(req.params.id);
        if (!shopToDelete) {
            return res.status(404).json({ msg: 'Shop not found' });
        }
        await User.findByIdAndUpdate(shopToDelete.owner, { $unset: { shopId: "" } });
        await Shop.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Shop removed successfully.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;

