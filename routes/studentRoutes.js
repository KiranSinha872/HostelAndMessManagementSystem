const express = require("express");
const router = express.Router();
const { verifyToken, isStudent } = require("../middleware/auth");
const studentController = require("../controllers/studentController");

// ==========================================
// STUDENT ROUTE PROTECTION
// All student routes require valid JWT token & "student" role
// ==========================================
router.use(verifyToken, isStudent);

// Student Dashboard
router.get("/dashboard", studentController.getDashboard);

// Room Allotment & Status
router.get("/room", studentController.getRoom);
router.post("/room/request", studentController.postRoomRequest);
router.post("/room/vacate", studentController.postVacateRoom);

// Student Requests (Room Change & Maintenance)
router.get("/requests", studentController.getRequests);
router.get("/requests/new", studentController.getNewRequest);
router.post("/requests/new", studentController.postNewRequest);

// Mess Module (Weekly Menu & Feedback)
router.get("/menu", studentController.getMenu);
router.get("/feedback", studentController.getFeedback);
router.post("/feedback", studentController.postFeedback);

module.exports = router;
