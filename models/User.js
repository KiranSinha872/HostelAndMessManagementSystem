const mongoose = require("mongoose");

// ==========================================
// USER SCHEMA & MODEL
// Roles: 'student' (default) or 'admin' (warden)
// ==========================================
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["student", "admin"],
        default: "student"
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room",
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);
