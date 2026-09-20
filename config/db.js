const mongoose = require("mongoose");

// Prevent indefinite buffering when disconnected (fails fast instead of hanging)
mongoose.set("bufferCommands", false);

// Global cache object across serverless lambda invocations
let cached = global._mongooseCache;
if (!cached) {
    cached = global._mongooseCache = { conn: null, promise: null };
}

const connectDB = async () => {
    // 1. If already connected, reuse connection immediately
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    // 2. If disconnected (readyState 0) or disconnecting (readyState 3), reset cached promise
    if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
        cached.promise = null;
        cached.conn = null;
    }

    if (!process.env.MONGO_URI) {
        const errorMsg = "MongoDB connection error: MONGO_URI is not set in environment variables.";
        console.warn(errorMsg);
        throw new Error(errorMsg);
    }

    // 3. Initiate new connection if no active promise is in flight
    if (!cached.promise) {
        cached.promise = mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
            maxPoolSize: 10,
            socketTimeoutMS: 45000,
        }).then((m) => {
            console.log("MongoDB connected successfully");
            return m.connection;
        }).catch((err) => {
            cached.promise = null;
            cached.conn = null;
            console.error("MongoDB connection error:", err.message);
            throw err;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (err) {
        cached.promise = null;
        cached.conn = null;
        throw err;
    }

    return cached.conn;
};

module.exports = connectDB;
