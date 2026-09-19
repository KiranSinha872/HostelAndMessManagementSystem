const mongoose = require("mongoose");

// ==========================================
// MENU SCHEMA & MODEL
// Stores daily meal plans for the weekly hostel mess
// ==========================================
const menuSchema = new mongoose.Schema({
    day: {
        type: String,
        enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        unique: true,
        required: true
    },
    breakfast: {
        type: String,
        default: ""
    },
    lunch: {
        type: String,
        default: ""
    },
    snacks: {
        type: String,
        default: ""
    },
    dinner: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Menu", menuSchema);
