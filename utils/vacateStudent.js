const mongoose = require("mongoose");
const User = require("../models/User");
const Room = require("../models/Room");

// ==========================================
// SHARED HELPER: VACATE STUDENT
// Frees the bed (room.occupied -= 1) and removes user's room assignment (user.room = null)
// Always updates both together.
// ==========================================
const vacateStudent = async (userId) => {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return { success: false, message: "Invalid student identifier." };
    }

    const user = await User.findById(userId);
    if (!user) {
        return { success: false, message: "User not found." };
    }

    if (!user.room) {
        return { success: false, message: "Student does not have an allotted room." };
    }

    // Decrement occupied beds on the assigned room
    const room = await Room.findById(user.room);
    if (room && room.occupied > 0) {
        room.occupied -= 1;
        await room.save();
    }

    // Clear the room reference on the student profile
    user.room = null;
    await user.save();

    return {
        success: true,
        message: "Student room successfully vacated."
    };
};

module.exports = vacateStudent;
