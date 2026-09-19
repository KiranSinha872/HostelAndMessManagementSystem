const mongoose = require("mongoose");

// ==========================================
// ROOM SCHEMA & MODEL
// Represents an individual hostel room
// Unique per block + roomNumber
// ==========================================
const roomSchema = new mongoose.Schema({
    block: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Block",
        required: true
    },
    roomNumber: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ["Single", "Double", "Triple"],
        required: true
    },
    capacity: {
        type: Number,
        required: true,
        min: 1
    },
    occupied: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

// Compound unique index: roomNumber must be unique within a given block
roomSchema.index({ block: 1, roomNumber: 1 }, { unique: true });

module.exports = mongoose.model("Room", roomSchema);
