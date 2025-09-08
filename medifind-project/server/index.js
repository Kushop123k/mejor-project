// THIS MUST BE THE VERY FIRST LINE to load your secrets
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// --- Middleware ---
// This allows your live frontend to talk to your live backend
app.use(cors({
    origin: process.env.CORS_ORIGIN
}));
// This increases the data limit for features like the AI Prescription Scanner
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// --- Define All API Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/shops', require('./routes/shops'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));


// --- Database Connection ---
const connectDB = async () => {
    try {
        // This line reads your MONGO_URI from the .env file
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Successfully connected to MongoDB.');
    } catch (err) {
        console.error("Database Connection Error:", err.message);
        process.exit(1); // Exit the process with failure if connection fails
    }
};

connectDB();


// --- Basic Route to check if the server is up ---
app.get('/', (req, res) => {
    res.send('MediFind API is running...');
});


// --- Start Server ---
const PORT = process.env.PORT || 5000;
// The host '0.0.0.0' is required for deployment services like Render
app.listen(PORT, '0.0.0.0', () => console.log(`Server is running on port ${PORT}`));

