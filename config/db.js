const mongoose = require("mongoose");

// Prevent indefinite buffering when disconnected (fails fast instead of hanging 10s)
mongoose.set("bufferCommands", false);

// Cache connection promise across serverless invocations
let cachedPromise = null;

const connectDB = async () => {
    // 1. If already connected, reuse connection
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    // 2. If a connection is in progress, await it
    if (cachedPromise) {
        return cachedPromise;
    }

    if (!process.env.MONGO_URI) {
        const errorMsg = "MongoDB connection error: MONGO_URI is not set in environment variables.";
        console.warn(errorMsg);
        throw new Error(errorMsg);
    }

    // 3. Initiate new connection with fast timeout (5s)
    cachedPromise = mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
    }).then((m) => {
        console.log("MongoDB connected:", m.connection.host);
        return m;
    }).catch((err) => {
        cachedPromise = null;
        console.error("MongoDB connection error:", err.message);
        throw err;
    });

    return cachedPromise;
};

module.exports = connectDB;
