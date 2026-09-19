const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ==============================================================================
// 1. VERIFY TOKEN MIDDLEWARE
// Reads JWT from cookie, verifies it, fetches user, attaches to req and res.locals
// ==============================================================================
const verifyToken = async (req, res, next) => {
    // Check if token exists in cookies
    const token = req.cookies && req.cookies.token;

    // If no token is provided, redirect user to login page
    if (!token) {
        return res.redirect("/login");
    }

    try {
        // Verify token using secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret");

        // Fetch user from database to make sure account still exists (exclude password)
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            res.clearCookie("token");
            return res.redirect("/login");
        }

        // Attach user object to request and response locals (for EJS views)
        req.user = user;
        res.locals.user = user;

        next();
    } catch (err) {
        // Token invalid or expired
        res.clearCookie("token");
        return res.redirect("/login");
    }
};

// ==============================================================================
// 2. IS ADMIN MIDDLEWARE (WARDEN CHECK)
// Restricts route to admin (warden) role only
// ==============================================================================
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        return next();
    }

    return res.status(403).render("error", {
        status: 403,
        message: "Access denied. Only wardens/administrators are allowed to view this page.",
        title: "Access Denied"
    });
};

// ==============================================================================
// 3. IS STUDENT MIDDLEWARE
// Restricts route to student role only
// ==============================================================================
const isStudent = (req, res, next) => {
    if (req.user && (req.user.role === "student" || req.user.role === "admin")) {
        return next();
    }

    return res.status(403).render("error", {
        status: 403,
        message: "Access denied. Only registered students or administrators are allowed to view this page.",
        title: "Access Denied"
    });
};

module.exports = {
    verifyToken,
    isAdmin,
    isStudent
};
