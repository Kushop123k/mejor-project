const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Shop = require('../models/Shop');
const User = require('../models/User');

// --- EXISTING ROUTES (No Changes) ---
router.post('/', auth, /* ... your code ... */);
router.put('/inventory', auth, /* ... your code ... */);
router.get('/me', auth, /* ... your code ... */);
router.get('/search/:medicine', async (req, res) => { /* ... your existing, working search code ... */ });


// --- NEW ENDPOINT 1: Get Nearby Shops ---
// @route   GET /api/shops/nearby
// @desc    Get a list of shops near a location
// @access  Public
router.get('/nearby', async (req, res) => {
    const { longitude, latitude } = req.query;
    if (!longitude || !latitude) {
        return res.status(400).json({ msg: 'Location is required.' });
    }
    try {
        const shops = await Shop.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
                    distanceField: 'distance',
                    maxDistance: 10000, // 10km
                    spherical: true
                }
            },
            { $limit: 5 } // Limit to the 5 closest shops
        ]);
        res.json(shops);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});


// --- NEW ENDPOINT 2: Get Featured Medicines ---
// @route   GET /api/shops/featured
// @desc    Get a random list of popular medicines from nearby shops
// @access  Public
router.get('/featured', async (req, res) => {
    const { longitude, latitude } = req.query;
    if (!longitude || !latitude) {
        return res.status(400).json({ msg: 'Location is required.' });
    }
    try {
        const featuredItems = await Shop.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
                    distanceField: 'distance',
                    maxDistance: 10000,
                    spherical: true
                }
            },
            { $unwind: '$inventory' }, // Open up the inventory of all nearby shops
            { $match: { 'inventory.stock': { $gt: 0 } } }, // Only show items that are in stock
            { $sample: { size: 4 } }, // Get 4 random medicines from the combined inventory
            {
                // Add the shop's name to each medicine
                $lookup: {
                    from: 'shops',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'shopInfo'
                }
            },
            { $unwind: '$shopInfo' },
            {
                // Format the final output
                $project: {
                    _id: '$inventory._id',
                    medicineName: '$inventory.medicineName',
                    imageUrl: '$inventory.imageUrl',
                    price: '$inventory.price',
                    shopName: '$shopInfo.shopName',
                    shopId: '$_id'
                }
            }
        ]);
        res.json(featuredItems);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;

