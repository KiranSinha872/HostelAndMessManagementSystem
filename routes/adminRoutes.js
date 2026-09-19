const express = require("express");
const router = express.Router();
const { verifyToken, isAdmin } = require("../middleware/auth");
const adminController = require("../controllers/adminController");

// ==========================================
// ADMIN ROUTE PROTECTION
// All admin routes require valid JWT token & "admin" role
// ==========================================
router.use(verifyToken, isAdmin);

// Dashboard
router.get("/dashboard", adminController.getDashboard);

// Blocks Management
router.get("/blocks", adminController.getBlocks);
router.post("/blocks", adminController.postAddBlock);
router.post("/blocks/:id/delete", adminController.postDeleteBlock);

// Rooms Management
router.get("/rooms", adminController.getRooms);
router.post("/rooms", adminController.postAddRoom);
router.get("/rooms/:id/edit", adminController.getEditRoom);
router.post("/rooms/:id/update", adminController.postUpdateRoom);
router.post("/rooms/:id/delete", adminController.postDeleteRoom);

// Student Requests Management (Approve, Reject, Resolve)
router.get("/requests", adminController.getRequests);
router.post("/requests/:id/approve", adminController.postApproveRequest);
router.post("/requests/:id/reject", adminController.postRejectRequest);
router.post("/requests/:id/resolve", adminController.postResolveRequest);

// Student Residents Management
router.get("/students", adminController.getStudents);
router.post("/students/:id/vacate", adminController.postVacateStudent);

// Mess Management (Menu & Feedback)
router.get("/menu", adminController.getMenu);
router.post("/menu", adminController.postMenu);
router.get("/feedback", adminController.getFeedback);

module.exports = router;
