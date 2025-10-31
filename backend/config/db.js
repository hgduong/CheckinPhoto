const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            console.warn('MONGO_URI not set - skipping MongoDB connection. Database functionality will be disabled.');
            return;
        }
        await mongoose.connect(uri);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error("MongoDB connection failed: ", error);
        // do not exit the whole process; allow server to run in degraded mode
        // so the developer can still use the app without a DB for local testing
    }
};

module.exports = connectDB;