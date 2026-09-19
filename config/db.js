const mongoose = require("mongoose");

// Connect to MongoDB using the URI from environment variables with connection reuse
const connectDB = async () => {
    try {
        // If already connected, reuse existing connection (crucial for Vercel serverless)
        if (mongoose.connection.readyState === 1) {
            return mongoose.connection;
        }

        // If currently connecting, return
        if (mongoose.connection.readyState === 2) {
            return;
        }

        if (!process.env.MONGO_URI) {
            console.log("MongoDB connection skipped: MONGO_URI not set in environment");
            return;
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected");
    } catch (err) {
        console.error("MongoDB connection error:", err.message);
    }
};

module.exports = connectDB;
