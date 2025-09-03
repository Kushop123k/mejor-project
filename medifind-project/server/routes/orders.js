const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
// This line must match your filename exactly: Order.js
const Order = require('../models/Order');
const Shop = require('../models/Shop');

// @route   POST /api/orders/create-cod
// @desc    Create a new Cash on Delivery order
router.post('/create-cod', auth, async (req, res) => {
    const { shopId, items, couponCode } = req.body;
    try {
        const shop = await Shop.findById(shopId);
        if (!shop) return res.status(404).json({ msg: 'Shop not found' });

        let totalAmount = 0;
        for (const item of items) {
            const medicine = shop.inventory.id(item.medicineId);
            if (!medicine || medicine.stock < item.quantity) {
                return res.status(400).json({ msg: `Medicine out of stock.` });
            }
            totalAmount += medicine.price * item.quantity;
        }

        let discountAmount = 0;
        if (couponCode) {
            const offer = shop.offers.find(o => o.couponCode === couponCode.toUpperCase() && o.isActive);
            if (offer) { discountAmount = (totalAmount * offer.discountPercentage) / 100; }
        }
        const finalAmount = totalAmount - discountAmount;

        const newOrder = new Order({
            customer: req.user.id,
            shop: shopId,
            items, totalAmount, couponUsed: couponCode, discountAmount, finalAmount
        });
        await newOrder.save();
        res.status(201).json(newOrder);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   GET /api/orders/my-orders
// @desc    Get orders for the logged-in customer
router.get('/my-orders', auth, async (req, res) => {
    try {
        const orders = await Order.find({ customer: req.user.id }).sort({ orderDate: -1 }).populate('shop', 'shopName');
        res.json(orders);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   GET /api/orders/shop-orders
// @desc    Get orders for the logged-in shop owner's shop
router.get('/shop-orders', auth, async (req, res) => {
    try {
        if (req.user.role !== 'shop_owner') return res.status(403).json({ msg: 'Access denied.' });
        const shop = await Shop.findOne({ owner: req.user.id });
        if (!shop) return res.status(404).json({ msg: 'No shop found for this owner.' });
        const orders = await Order.find({ shop: shop._id }).sort({ orderDate: -1 }).populate('customer', 'name email');
        res.json(orders);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   PUT /api/orders/update-status/:id
// @desc    Update the status of an order
router.put('/update-status/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'shop_owner') return res.status(403).json({ msg: 'Access denied.' });
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ msg: 'Order not found.' });

        const shop = await Shop.findOne({ owner: req.user.id });
        if (order.shop.toString() !== shop._id.toString()) {
            return res.status(401).json({ msg: 'Not authorized to update this order.' });
        }
        
        order.status = req.body.status || order.status;
        await order.save();
        res.json(order);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;