const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Shop = require('../models/Shop');
const User = require('../models/User');

// --- SHOP OWNER ROUTES (PRIVATE) ---
// This is the code you already have, and it is correct.
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

router.put('/inventory', auth, async (req, res) => {
    if (req.user.role !== 'shop_owner') {
        return res.status(403).json({ msg: 'Forbidden: Only shop owners can manage inventory' });
    }
    const { medicineName, brand, price, stock, discountPercent } = req.body;
    if (!medicineName || !price || !stock) {
        return res.status(400).json({ msg: 'Please provide medicine name, price, and stock' });
    }
    try {
        const shop = await Shop.findOne({ owner: req.user.id });
        if (!shop) { return res.status(404).json({ msg: 'Shop not found for this owner.' }); }
        const newMedicine = { medicineName, brand, price: parseFloat(price), stock: parseInt(stock), discountPercent: discountPercent ? parseFloat(discountPercent) : 0 };
        shop.inventory.push(newMedicine);
        await shop.save();
        res.json(shop);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.get('/me', auth, async (req, res) => {
    try {
        const shop = await Shop.findOne({ owner: req.user.id });
        if (!shop) { return res.status(404).json({ msg: 'No shop found for this owner.' }); }
        res.json(shop);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});


// --- NEW CUSTOMER SEARCH ROUTE (PUBLIC) ---
// This is the missing piece of code.
// @route   GET api/shops/search/:medicine
// @desc    Search for a medicine in nearby shops
// @access  Public
router.get('/search/:medicine', async (req, res) => {
    const { medicine } = req.params;
    const { longitude, latitude } = req.query;

    if (!longitude || !latitude) {
        return res.status(400).json({ msg: 'User location (longitude and latitude) is required.' });
    }

    try {
        const shops = await Shop.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
                    distanceField: 'distance',
                    maxDistance: 5000, // 5 kilometers
                    spherical: true
                }
            },
            { $unwind: '$inventory' },
            { $match: { 'inventory.medicineName': new RegExp(medicine, 'i') } },
            { $sort: { 'inventory.price': 1 } },
            {
                $project: {
                    _id: 1,
                    shopName: 1,
                    address: 1,
                    distance: 1,
                    matchedMedicine: '$inventory'
                }
            }
        ]);

        if (shops.length === 0) {
            return res.status(404).json({ msg: 'No shops found with this medicine nearby.' });
        }

        res.json(shops);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;

