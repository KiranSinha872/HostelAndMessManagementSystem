const mongoose = require("mongoose");

// ==========================================
// REQUEST SCHEMA & MODEL
// Handles student room requests, room changes, and maintenance tickets
// ==========================================
const requestSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    type: {
        type: String,
        enum: ["room_request", "room_change", "maintenance"],
        required: true
    },
    description: {
        type: String,
        trim: true,
        default: ""
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected", "resolved"],
        default: "pending"
    },
    adminRemark: {
        type: String,
        trim: true,
        default: ""
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Request", requestSchema);
