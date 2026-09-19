const mongoose = require("mongoose");

// ==========================================
// BLOCK SCHEMA & MODEL
// Represents a hostel building / wing (e.g. Block A, Boys Hostel 1)
// ==========================================
const blockSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ""
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Block", blockSchema);
