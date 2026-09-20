// ==========================================
// 1. IMPORTS & CONFIGURATION
// ==========================================
require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const jwt = require("jsonwebtoken");

// Connect to MongoDB Atlas
const connectDB = require("./config/db");
connectDB().catch((err) => {
    console.warn("Initial DB connection warning:", err.message);
});

// Initialize Express App
const app = express();

// ==========================================
// 2. VIEW ENGINE & GLOBAL MIDDLEWARE
// ==========================================
// Set EJS as the template engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Parse incoming request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Parse browser cookies
app.use(cookieParser());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

// Middleware to make logged-in user details available to all EJS templates
app.use((req, res, next) => {
    res.locals.user = null;
    if (req.cookies && req.cookies.token) {
        try {
            const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET || "default_secret");
            res.locals.user = decoded;
        } catch (err) {
            res.locals.user = null;
        }
    }
    next();
});

// ==========================================
// 3. ROUTE HANDLING
// ==========================================
// Import route modules
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const adminRoutes = require("./routes/adminRoutes");

// Ensure database connection is active before routes (serverless cold start safe)
app.use(async (req, res, next) => {
    try {
        await connectDB();
    } catch (err) {
        console.warn("Database connection middleware warning:", err.message);
    }
    next();
});

// Home page route
app.get("/", (req, res) => {
    res.render("index", { title: "Home" });
});

// Mount modular routers
app.use("/", authRoutes);
app.use("/student", studentRoutes);
app.use("/admin", adminRoutes);

// ==========================================
// 4. ERROR HANDLING
// ==========================================
// 404 Handler for undefined routes
app.use((req, res) => {
    res.status(404).render("error", {
        status: 404,
        message: "The requested page was not found.",
        title: "404 Not Found"
    });
});

// Global 500 Error Handler
app.use((err, req, res, next) => {
    console.error("Server Error:", err.stack);
    res.status(500).render("error", {
        status: 500,
        message: err.message || "An unexpected server error occurred.",
        title: "500 Server Error"
    });
});

// ==========================================
// 5. SERVER START & EXPORT
// ==========================================
// Only listen when executed directly (node server.js); export app for Vercel serverless
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
