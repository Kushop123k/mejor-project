// THIS MUST BE THE VERY FIRST LINE
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// --- Define Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/shop', require('./routes/shop'));
app.use('/api/ai', require('./routes/ai'));


// --- Database Connection ---
const connectDB = async () => {
    try {
        // This line will now correctly find the MONGO_URI from the .env file
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Successfully connected to MongoDB.');
    } catch (err) {
        console.error("Database Connection Error:", err.message);
        process.exit(1); // Exit process with failure
    }
};

connectDB();


// --- Basic Route for checking if server is up ---
app.get('/', (req, res) => {
    res.send('MediFind API is running...');
});


// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

