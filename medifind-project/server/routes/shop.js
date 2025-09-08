const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Shop = require('../models/Shop');
const User = require('../models/User');

// @route   POST api/shops
// @desc    Register a new shop
// @access  Private (Shop Owner only)
router.post('/', auth, async (req, res) => {
    if (req.user.role !== 'shop_owner') {
        return res.status(403).json({ msg: 'Forbidden: Only shop owners can register a shop' });
    }
    const { shopName, address, coordinates, licenseNumber, contactNumber } = req.body;
    try {
        let shop = await Shop.findOne({ owner: req.user.id });
        if (shop) { return res.status(400).json({ msg: 'Shop owner can only register one shop' }); }
        shop = await Shop.findOne({ licenseNumber });
        if (shop) { return res.status(400).json({ msg: 'This license number is already registered' }); }
        shop = new Shop({ owner: req.user.id, shopName, address, location: { type: 'Point', coordinates }, licenseNumber, contactNumber });
        await shop.save();
        await User.findByIdAndUpdate(req.user.id, { shopId: shop.id });
        res.status(201).json(shop);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   PUT api/shops/inventory
// @desc    Add a medicine to a shop's inventory
// @access  Private (Shop Owner only)
router.put('/inventory', auth, async (req, res) => {
    if (req.user.role !== 'shop_owner') {
        return res.status(403).json({ msg: 'Forbidden' });
    }
    const { medicineName, brand, price, stock, discountPercent, imageUrl } = req.body;
    if (!medicineName || !price || !stock) {
        return res.status(400).json({ msg: 'Please provide medicine name, price, and stock' });
    }
    try {
        const shop = await Shop.findOne({ owner: req.user.id });
        if (!shop) { return res.status(404).json({ msg: 'Shop not found for this owner.' }); }
        const newMedicine = {
            medicineName, brand, price: parseFloat(price), stock: parseInt(stock),
            discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
            imageUrl: imageUrl || 'https://placehold.co/400x400/e9ecef/6c757d?text=No+Image'
        };
        shop.inventory.push(newMedicine);
        await shop.save();
        res.json(shop);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   GET api/shops/me
// @desc    Get the shop for the logged-in owner
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const shop = await Shop.findOne({ owner: req.user.id });
        if (!shop) { return res.status(404).json({ msg: 'No shop found for this owner.' }); }
        res.json(shop);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   GET api/shops/search/:medicine
// @desc    Search for a medicine in nearby shops
// @access  Public
router.get('/search/:medicine', async (req, res) => {
    const { medicine } = req.params;
    const { longitude, latitude } = req.query;
    if (!longitude || !latitude) {
        return res.status(400).json({ msg: 'User location is required.' });
    }
    try {
        const shops = await Shop.aggregate([
            { $geoNear: { near: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] }, distanceField: 'distance', maxDistance: 5000, spherical: true } },
            { $unwind: '$inventory' },
            { $match: { 'inventory.medicineName': new RegExp(medicine, 'i') } },
            { $sort: { 'inventory.price': 1 } },
            { $project: { _id: 1, shopName: 1, address: 1, distance: 1, matchedMedicine: '$inventory' } }
        ]);
        if (shops.length === 0) {
            return res.status(404).json({ msg: 'No shops found with this medicine nearby.' });
        }
        res.json(shops);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   GET /api/shops/nearby
// @desc    Get a list of shops near a location
// @access  Public
router.get('/nearby', async (req, res) => {
    const { longitude, latitude } = req.query;
    if (!longitude || !latitude) return res.status(400).json({ msg: 'Location is required.' });
    try {
        const shops = await Shop.aggregate([
            { $geoNear: { near: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] }, distanceField: 'distance', maxDistance: 10000, spherical: true } },
            { $limit: 5 }
        ]);
        res.json(shops);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   GET /api/shops/featured
// @desc    Get a random list of popular medicines from nearby shops
// @access  Public
router.get('/featured', async (req, res) => {
    const { longitude, latitude } = req.query;
    if (!longitude || !latitude) return res.status(400).json({ msg: 'Location is required.' });
    try {
        const featuredItems = await Shop.aggregate([
            { $geoNear: { near: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] }, distanceField: 'distance', maxDistance: 10000, spherical: true } },
            { $unwind: '$inventory' },
            { $match: { 'inventory.stock': { $gt: 0 } } },
            { $sample: { size: 4 } },
            { $lookup: { from: 'shops', localField: '_id', foreignField: '_id', as: 'shopInfo' } },
            { $unwind: '$shopInfo' },
            { $project: { _id: '$inventory._id', medicineName: '$inventory.medicineName', imageUrl: '$inventory.imageUrl', price: '$inventory.price', shopName: '$shopInfo.shopName', shopId: '$_id' } }
        ]);
        res.json(featuredItems);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// --- NEW ENDPOINT 1: Edit a specific medicine ---
// @route   PUT /api/shops/inventory/:medicineId
// @desc    Update a medicine in the inventory
// @access  Private (Shop Owner)
router.put('/inventory/:medicineId', auth, async (req, res) => {
    if (req.user.role !== 'shop_owner') return res.status(403).json({ msg: 'Forbidden' });

    try {
        const shop = await Shop.findOne({ owner: req.user.id });
        if (!shop) return res.status(404).json({ msg: 'Shop not found' });

        const medicine = shop.inventory.id(req.params.medicineId);
        if (!medicine) return res.status(404).json({ msg: 'Medicine not found in inventory' });

        // Update the fields from the request body
        const { medicineName, brand, price, stock, discountPercent, imageUrl } = req.body;
        medicine.set({ medicineName, brand, price, stock, discountPercent, imageUrl });
        
        await shop.save();
        res.json(shop);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// --- NEW ENDPOINT 2: Delete a specific medicine ---
// @route   DELETE /api/shops/inventory/:medicineId
// @desc    Delete a medicine from the inventory
// @access  Private (Shop Owner)
router.delete('/inventory/:medicineId', auth, async (req, res) => {
    if (req.user.role !== 'shop_owner') return res.status(403).json({ msg: 'Forbidden' });

    try {
        const shop = await Shop.findOne({ owner: req.user.id });
        if (!shop) return res.status(404).json({ msg: 'Shop not found' });

        // Use the pull method to remove the subdocument from the inventory array
        shop.inventory.pull({ _id: req.params.medicineId });
        
        await shop.save();
        res.json({ msg: 'Medicine removed successfully' });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;

