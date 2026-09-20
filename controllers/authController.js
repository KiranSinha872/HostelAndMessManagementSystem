const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const connectDB = require("../config/db");

// Helper to determine if an error is connection-related
const isDbConnectionError = (err) => {
    if (!err) return false;
    const msg = (err.message || "").toLowerCase();
    return (
        msg.includes("buffercommands") ||
        msg.includes("buffering") ||
        msg.includes("timed out") ||
        msg.includes("enotfound") ||
        msg.includes("server selection") ||
        msg.includes("connection")
    );
};

const DB_ERROR_MESSAGE =
    "Database connection unavailable. Please ensure MONGO_URI is configured in Vercel environment variables and 0.0.0.0/0 is allowed in MongoDB Atlas Network Access.";

// ==========================================
// 1. GET /register
// Render registration form
// ==========================================
const getRegister = (req, res) => {
    // If already logged in, redirect to dashboard
    if (res.locals.user) {
        return res.redirect(res.locals.user.role === "admin" ? "/admin/dashboard" : "/student/dashboard");
    }
    res.render("auth/register", {
        title: "Student Registration",
        error: null,
        values: {}
    });
};

// ==========================================
// 2. POST /register
// Register a new student account
// ==========================================
const postRegister = async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // Basic validation: Check required fields
        if (!name || !email || !password || !confirmPassword) {
            return res.render("auth/register", {
                title: "Student Registration",
                error: "All fields are required.",
                values: { name, email }
            });
        }

        // Validation: Passwords must match
        if (password !== confirmPassword) {
            return res.render("auth/register", {
                title: "Student Registration",
                error: "Passwords do not match.",
                values: { name, email }
            });
        }

        // Ensure database connection is active (handles serverless cold starts)
        if (mongoose.connection.readyState !== 1) {
            try {
                await connectDB();
            } catch (connErr) {
                console.warn("DB reconnection attempt failed during registration:", connErr.message);
            }
        }

        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            return res.render("auth/register", {
                title: "Student Registration",
                error: DB_ERROR_MESSAGE,
                values: { name, email }
            });
        }

        // Validation: Email uniqueness
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return res.render("auth/register", {
                title: "Student Registration",
                error: "This email is already registered. Please login.",
                values: { name, email }
            });
        }

        // Hash password with bcrypt (10 salt rounds)
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new student user (role is always "student")
        const newUser = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: "student"
        });

        await newUser.save();

        // Redirect to login page upon successful registration
        res.redirect("/login");

    } catch (err) {
        console.error("Registration error:", err.message);
        const errorMsg = isDbConnectionError(err)
            ? DB_ERROR_MESSAGE
            : "An error occurred during registration. Please try again.";

        res.render("auth/register", {
            title: "Student Registration",
            error: errorMsg,
            values: req.body
        });
    }
};

// ==========================================
// 3. GET /login
// Render login form
// ==========================================
const getLogin = (req, res) => {
    // If already logged in, redirect to dashboard
    if (res.locals.user) {
        return res.redirect(res.locals.user.role === "admin" ? "/admin/dashboard" : "/student/dashboard");
    }
    res.render("auth/login", {
        title: "Login",
        error: null,
        values: {}
    });
};

// ==========================================
// 4. POST /login
// Authenticate user and issue JWT cookie
// ==========================================
const postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.render("auth/login", {
                title: "Login",
                error: "Please provide both email and password.",
                values: { email }
            });
        }

        // Ensure database connection is active (handles serverless cold starts)
        if (mongoose.connection.readyState !== 1) {
            try {
                await connectDB();
            } catch (connErr) {
                console.warn("DB reconnection attempt failed during login:", connErr.message);
            }
        }

        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            return res.render("auth/login", {
                title: "Login",
                error: DB_ERROR_MESSAGE,
                values: { email }
            });
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.render("auth/login", {
                title: "Login",
                error: "Invalid email or password.",
                values: { email }
            });
        }

        // Compare submitted password with hashed password
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.render("auth/login", {
                title: "Login",
                error: "Invalid email or password.",
                values: { email }
            });
        }

        // Generate JWT token containing userId and role
        const token = jwt.sign(
            {
                userId: user._id,
                role: user.role,
                name: user.name
            },
            process.env.JWT_SECRET || "default_secret",
            {
                expiresIn: "1d"
            }
        );

        // Store JWT in an HTTP-only cookie for secure authentication
        res.cookie("token", token, {
            httpOnly: true
        });

        // Redirect based on user role
        if (user.role === "admin") {
            return res.redirect("/admin/dashboard");
        } else {
            return res.redirect("/student/dashboard");
        }

    } catch (err) {
        console.error("Login error:", err.message);
        const errorMsg = isDbConnectionError(err)
            ? DB_ERROR_MESSAGE
            : "An unexpected error occurred. Please try again.";

        res.render("auth/login", {
            title: "Login",
            error: errorMsg,
            values: req.body
        });
    }
};

// ==========================================
// 5. GET /logout
// Clear authentication cookie and redirect to login
// ==========================================
const getLogout = (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
};

module.exports = {
    getRegister,
    postRegister,
    getLogin,
    postLogin,
    getLogout
};
