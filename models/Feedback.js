const mongoose = require("mongoose");

// ==========================================
// FEEDBACK SCHEMA & MODEL
// Stores student reviews and ratings for mess meals
// ==========================================
const feedbackSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    day: {
        type: String,
        enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        required: true
    },
    meal: {
        type: String,
        enum: ["breakfast", "lunch", "snacks", "dinner"],
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    comment: {
        type: String,
        trim: true,
        default: ""
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Feedback", feedbackSchema);
