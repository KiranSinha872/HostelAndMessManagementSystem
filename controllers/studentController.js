const User = require("../models/User");
const Room = require("../models/Room");
const Request = require("../models/Request");
const Menu = require("../models/Menu");
const Feedback = require("../models/Feedback");
const vacateStudent = require("../utils/vacateStudent");

// ==========================================
// 1. GET /student/dashboard
// Student dashboard home with room info, pending requests, and today's menu
// ==========================================
const getDashboard = async (req, res) => {
    try {
        const student = await User.findById(req.user._id).populate({
            path: "room",
            populate: { path: "block" }
        });

        const pendingRequestsCount = await Request.countDocuments({
            student: req.user._id,
            status: "pending"
        });

        // Determine today's day of week and fetch today's mess menu
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const today = dayNames[new Date().getDay()];
        const todayMenu = await Menu.findOne({ day: today });

        res.render("student/dashboard", {
            title: "Student Dashboard",
            student,
            pendingRequestsCount,
            today,
            todayMenu
        });
    } catch (err) {
        console.error("Student dashboard error:", err.message);
        res.render("student/dashboard", {
            title: "Student Dashboard",
            student: req.user,
            pendingRequestsCount: 0,
            today: "Today",
            todayMenu: null
        });
    }
};

// ==========================================
// 2. GET /student/room
// View current room allotment, roommates, or request status
// ==========================================
const getRoom = async (req, res) => {
    try {
        const student = await User.findById(req.user._id).populate({
            path: "room",
            populate: { path: "block" }
        });

        let roommates = [];
        let pendingRequest = null;

        if (student.room) {
            // Find all other students assigned to the same room
            roommates = await User.find({
                room: student.room._id,
                _id: { $ne: student._id }
            }).select("name email");
        } else {
            // Check if there is already a pending room allotment request
            pendingRequest = await Request.findOne({
                student: student._id,
                type: "room_request",
                status: "pending"
            });
        }

        res.render("student/room", {
            title: "My Room Allotment",
            room: student.room,
            roommates,
            pendingRequest,
            error: req.query.error || null,
            success: req.query.success || null
        });

    } catch (err) {
        console.error("Error loading student room:", err.message);
        res.status(500).render("error", {
            status: 500,
            message: "Unable to load room details.",
            title: "Server Error"
        });
    }
};

// ==========================================
// 3. POST /student/room/request
// Submit a room allotment request
// ==========================================
const postRoomRequest = async (req, res) => {
    try {
        const student = await User.findById(req.user._id);

        // Rule: Cannot request if already allotted a room
        if (student.room) {
            return res.redirect("/student/room?error=" + encodeURIComponent("You already have an allotted room."));
        }

        // Rule: A student can never have two pending room requests
        const existingPending = await Request.findOne({
            student: student._id,
            type: "room_request",
            status: "pending"
        });

        if (existingPending) {
            return res.redirect("/student/room?error=" + encodeURIComponent("You already have a pending room request being reviewed."));
        }

        const description = req.body.description ? req.body.description.trim() : "Standard room allotment request";

        const newRequest = new Request({
            student: student._id,
            type: "room_request",
            description,
            status: "pending"
        });

        await newRequest.save();
        res.redirect("/student/room?success=" + encodeURIComponent("Room allotment request submitted successfully. Waiting for warden review."));

    } catch (err) {
        console.error("Error submitting room request:", err.message);
        res.redirect("/student/room?error=" + encodeURIComponent("Failed to submit room request."));
    }
};

// ==========================================
// 4. POST /student/room/vacate
// Student vacates their own room
// ==========================================
const postVacateRoom = async (req, res) => {
    try {
        const result = await vacateStudent(req.user._id);

        if (!result.success) {
            return res.redirect("/student/room?error=" + encodeURIComponent(result.message));
        }

        res.redirect("/student/room?success=" + encodeURIComponent("You have vacated your room successfully."));

    } catch (err) {
        console.error("Error vacating room:", err.message);
        res.redirect("/student/room?error=" + encodeURIComponent("Failed to vacate room."));
    }
};

// ==========================================
// 5. GET /student/requests
// List all requests submitted by the logged-in student
// ==========================================
const getRequests = async (req, res) => {
    try {
        const requests = await Request.find({ student: req.user._id }).sort({ createdAt: -1 });

        res.render("student/requests", {
            title: "My Requests",
            requests,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error("Error fetching student requests:", err.message);
        res.status(500).render("error", {
            status: 500,
            message: "Unable to load your requests.",
            title: "Server Error"
        });
    }
};

// ==========================================
// 6. GET /student/requests/new
// Form to submit room change or maintenance request
// ==========================================
const getNewRequest = async (req, res) => {
    try {
        const student = await User.findById(req.user._id).populate({
            path: "room",
            populate: { path: "block" }
        });

        res.render("student/newRequest", {
            title: "Raise New Request",
            hasRoom: Boolean(student.room),
            currentRoom: student.room,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error("Error loading new request form:", err.message);
        res.status(500).render("error", {
            status: 500,
            message: "Unable to load request form.",
            title: "Server Error"
        });
    }
};

// ==========================================
// 7. POST /student/requests/new
// Submit a room change or maintenance request
// ==========================================
const postNewRequest = async (req, res) => {
    try {
        const { type, description } = req.body;
        const student = await User.findById(req.user._id);

        // Rule: Room change and maintenance require the student to have an allotted room
        if (!student.room) {
            return res.redirect("/student/requests/new?error=" + encodeURIComponent("You must have an allotted room to request a room change or maintenance."));
        }

        if (!type || !["room_change", "maintenance"].includes(type)) {
            return res.redirect("/student/requests/new?error=" + encodeURIComponent("Invalid request type. Please choose Room Change or Maintenance."));
        }

        if (!description || !description.trim()) {
            return res.redirect("/student/requests/new?error=" + encodeURIComponent("Please provide a description explaining your request."));
        }

        const newRequest = new Request({
            student: student._id,
            type,
            description: description.trim(),
            status: "pending"
        });

        await newRequest.save();
        res.redirect("/student/requests?success=" + encodeURIComponent("Your request has been submitted for warden review."));

    } catch (err) {
        console.error("Error creating student request:", err.message);
        res.redirect("/student/requests/new?error=" + encodeURIComponent("Failed to submit request."));
    }
};

// ==========================================
// 8. GET /student/menu
// View weekly mess menu as clean table with today's row highlighted
// ==========================================
const getMenu = async (req, res) => {
    try {
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const savedMenus = await Menu.find();
        const menuMap = {};
        savedMenus.forEach(m => { menuMap[m.day] = m; });

        const weekMenu = days.map(d => menuMap[d] || { day: d, breakfast: "", lunch: "", snacks: "", dinner: "" });

        // Determine today's day name to highlight today's row
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const today = dayNames[new Date().getDay()];

        res.render("student/menu", {
            title: "Mess Weekly Menu",
            weekMenu,
            today
        });
    } catch (err) {
        console.error("Error fetching menu for student:", err.message);
        res.status(500).render("error", {
            status: 500,
            message: "Unable to load mess menu.",
            title: "Server Error"
        });
    }
};

// ==========================================
// 9. GET /student/feedback
// Feedback submission form and student's own review history
// ==========================================
const getFeedback = async (req, res) => {
    try {
        const feedbacks = await Feedback.find({ student: req.user._id }).sort({ createdAt: -1 });

        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const today = dayNames[new Date().getDay()];

        res.render("student/feedback", {
            title: "Mess Feedback",
            feedbacks,
            today,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error("Error loading feedback page:", err.message);
        res.status(500).render("error", {
            status: 500,
            message: "Unable to load feedback.",
            title: "Server Error"
        });
    }
};

// ==========================================
// 10. POST /student/feedback
// Submit meal review and rating
// ==========================================
const postFeedback = async (req, res) => {
    try {
        const { day, meal, rating, comment } = req.body;

        if (!day || !meal || !rating) {
            return res.redirect("/student/feedback?error=" + encodeURIComponent("Please select Day, Meal, and Rating."));
        }

        const numRating = parseInt(rating, 10);
        if (isNaN(numRating) || numRating < 1 || numRating > 5) {
            return res.redirect("/student/feedback?error=" + encodeURIComponent("Rating must be between 1 and 5."));
        }

        const newFeedback = new Feedback({
            student: req.user._id,
            day,
            meal,
            rating: numRating,
            comment: comment ? comment.trim() : ""
        });

        await newFeedback.save();
        res.redirect("/student/feedback?success=" + encodeURIComponent("Thank you! Your feedback has been recorded."));

    } catch (err) {
        console.error("Error saving feedback:", err.message);
        res.redirect("/student/feedback?error=" + encodeURIComponent("Failed to submit feedback."));
    }
};

module.exports = {
    getDashboard,
    getRoom,
    postRoomRequest,
    postVacateRoom,
    getRequests,
    getNewRequest,
    postNewRequest,
    getMenu,
    getFeedback,
    postFeedback
};
