const mongoose = require('mongoose');

const ShopSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    shopName: { type: String, required: true, trim: true },
    address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true }
    },
    location: {
        type: {
            type: String,
            enum: ['Point'], // 'location.type' must be 'Point'
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
    licenseNumber: { type: String, required: true, unique: true },
    contactNumber: { type: String, required: true },
    isOpen: { type: Boolean, default: true },
    
    inventory: [{
        medicineName: { type: String, required: true },
        brand: String,
        price: { type: Number, required: true },
        stock: { type: Number, required: true, default: 0 },
        discountPercent: { type: Number, default: 0 },
        imageUrl: { type: String, default: 'https://placehold.co/400x400/e9ecef/6c757d?text=No+Image' },
    }],

    offers: [{
        couponCode: { type: String, required: true, trim: true, uppercase: true },
        discountPercentage: { type: Number, required: true, min: 1, max: 100 },
        isActive: { type: Boolean, default: true }
    }],
    
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// This line is CRITICAL. It tells MongoDB to create the special index
// needed for geospatial queries like finding nearby shops.
ShopSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Shop', ShopSchema);

