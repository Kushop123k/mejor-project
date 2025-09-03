const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    items: [{
        medicineId: { type: mongoose.Schema.Types.ObjectId, required: true },
        medicineName: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }
    }],
    totalAmount: { // The price before any discounts
        type: Number,
        required: true
    },
    couponUsed: {
        type: String,
        trim: true,
        uppercase: true
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    finalAmount: { // The price the customer actually pays
        type: Number,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Unpaid', 'Paid'], // Simplified for COD
        default: 'Unpaid'
    },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Packed', 'Ready for Pickup', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    orderDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Order', OrderSchema);

