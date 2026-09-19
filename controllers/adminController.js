const mongoose = require("mongoose");
const Block = require("../models/Block");
const Room = require("../models/Room");
const User = require("../models/User");
const Request = require("../models/Request");
const Menu = require("../models/Menu");
const Feedback = require("../models/Feedback");
const vacateStudent = require("../utils/vacateStudent");

// ==========================================
// 1. GET /admin/dashboard
// Warden overview dashboard with bed stats, block occupancy, and recent requests
// ==========================================
const getDashboard = async (req, res) => {
    try {
        const rooms = await Room.find().populate("block");

        let totalBeds = 0;
        let occupiedBeds = 0;
        const blockMap = {};

        // Calculate totals and group by block using a simple loop (no aggregation pipelines)
        for (const room of rooms) {
            totalBeds += room.capacity;
            occupiedBeds += room.occupied;

            if (room.block) {
                const blockId = room.block._id.toString();
                if (!blockMap[blockId]) {
                    blockMap[blockId] = {
                        name: room.block.name,
                        totalBeds: 0,
                        occupiedBeds: 0
                    };
                }
                blockMap[blockId].totalBeds += room.capacity;
                blockMap[blockId].occupiedBeds += room.occupied;
            }
        }

        const vacantBeds = totalBeds - occupiedBeds;

        // Convert blockMap to an array with calculated vacant beds and percentage
        const blockStats = Object.values(blockMap).map(b => {
            const vacant = b.totalBeds - b.occupiedBeds;
            const percent = b.totalBeds > 0 ? Math.round((b.occupiedBeds / b.totalBeds) * 100) : 0;
            return {
                name: b.name,
                totalBeds: b.totalBeds,
                occupiedBeds: b.occupiedBeds,
                vacantBeds: vacant,
                occupancyPercent: percent
            };
        });

        // Pending requests count and latest 5 pending requests
        const pendingRequestsCount = await Request.countDocuments({ status: "pending" });
        const recentPendingRequests = await Request.find({ status: "pending" })
            .populate("student")
            .sort({ createdAt: -1 })
            .limit(5);

        res.render("admin/dashboard", {
            title: "Warden Dashboard",
            totalBeds,
            occupiedBeds,
            vacantBeds,
            pendingRequestsCount,
            blockStats,
            recentPendingRequests
        });

    } catch (err) {
        console.error("Dashboard error:", err.message);
        res.render("admin/dashboard", {
            title: "Warden Dashboard",
            totalBeds: 0,
            occupiedBeds: 0,
            vacantBeds: 0,
            pendingRequestsCount: 0,
            blockStats: [],
            recentPendingRequests: []
        });
    }
};

// ==========================================
// 2. GET /admin/blocks
// List all hostel blocks with room counts
// ==========================================
const getBlocks = async (req, res) => {
    try {
        const blocks = await Block.find().sort({ name: 1 });

        // Calculate room count for each block without complex aggregation
        const blocksWithCounts = [];
        for (const block of blocks) {
            const roomCount = await Room.countDocuments({ block: block._id });
            blocksWithCounts.push({
                ...block.toObject(),
                roomCount
            });
        }

        res.render("admin/blocks", {
            title: "Manage Hostel Blocks",
            blocks: blocksWithCounts,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error("Error fetching blocks:", err.message);
        res.status(500).render("error", {
            status: 500,
            message: "Unable to load hostel blocks.",
            title: "Server Error"
        });
    }
};

// ==========================================
// 3. POST /admin/blocks
// Create a new hostel block
// ==========================================
const postAddBlock = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.redirect("/admin/blocks?error=" + encodeURIComponent("Block name is required."));
        }

        const trimmedName = name.trim();
        const existingBlock = await Block.findOne({ name: trimmedName });
        if (existingBlock) {
            return res.redirect("/admin/blocks?error=" + encodeURIComponent(`Block '${trimmedName}' already exists.`));
        }

        const newBlock = new Block({
            name: trimmedName,
            description: description ? description.trim() : ""
        });

        await newBlock.save();
        res.redirect("/admin/blocks?success=" + encodeURIComponent(`Block '${trimmedName}' added successfully.`));

    } catch (err) {
        if (err.code === 11000) {
            return res.redirect("/admin/blocks?error=" + encodeURIComponent("Block with this name already exists."));
        }
        console.error("Error creating block:", err.message);
        res.redirect("/admin/blocks?error=" + encodeURIComponent("Failed to create block."));
    }
};

// ==========================================
// 4. POST /admin/blocks/:id/delete
// Delete a block (blocked if rooms exist)
// ==========================================
const postDeleteBlock = async (req, res) => {
    try {
        const blockId = req.params.id;

        if (!blockId || !mongoose.Types.ObjectId.isValid(blockId)) {
            return res.redirect("/admin/blocks?error=" + encodeURIComponent("Invalid block identifier."));
        }

        // Check if any rooms exist inside this block
        const roomCount = await Room.countDocuments({ block: blockId });
        if (roomCount > 0) {
            return res.redirect("/admin/blocks?error=" + encodeURIComponent(`Cannot delete block because it still contains ${roomCount} room(s). Delete rooms first.`));
        }

        const deletedBlock = await Block.findByIdAndDelete(blockId);
        if (!deletedBlock) {
            return res.redirect("/admin/blocks?error=" + encodeURIComponent("Block not found."));
        }

        res.redirect("/admin/blocks?success=" + encodeURIComponent(`Block '${deletedBlock.name}' deleted successfully.`));

    } catch (err) {
        console.error("Error deleting block:", err.message);
        res.redirect("/admin/blocks?error=" + encodeURIComponent("Failed to delete block."));
    }
};

// ==========================================
// 5. GET /admin/rooms
// List all rooms with occupied/vacant stats & add form
// ==========================================
const getRooms = async (req, res) => {
    try {
        const blocks = await Block.find().sort({ name: 1 });
        const rooms = await Room.find().populate("block").sort({ roomNumber: 1 });

        res.render("admin/rooms", {
            title: "Manage Hostel Rooms",
            blocks,
            rooms,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error("Error fetching rooms:", err.message);
        res.status(500).render("error", {
            status: 500,
            message: "Unable to load rooms.",
            title: "Server Error"
        });
    }
};

// ==========================================
// 6. POST /admin/rooms
// Create a new hostel room
// ==========================================
const postAddRoom = async (req, res) => {
    try {
        const { block, roomNumber, type, capacity } = req.body;

        if (!block || !roomNumber || !type) {
            return res.redirect("/admin/rooms?error=" + encodeURIComponent("Please fill in Block, Room Number, and Room Type."));
        }

        if (!mongoose.Types.ObjectId.isValid(block)) {
            return res.redirect("/admin/rooms?error=" + encodeURIComponent("Invalid block selection."));
        }

        // Determine capacity: use provided value or fallback to standard defaults
        let finalCapacity = parseInt(capacity, 10);
        if (isNaN(finalCapacity) || finalCapacity < 1) {
            if (type === "Single") finalCapacity = 1;
            else if (type === "Double") finalCapacity = 2;
            else if (type === "Triple") finalCapacity = 3;
            else finalCapacity = 1;
        }

        const trimmedRoomNumber = roomNumber.trim();

        // Check if room number already exists in this block
        const existingRoom = await Room.findOne({ block, roomNumber: trimmedRoomNumber });
        if (existingRoom) {
            return res.redirect("/admin/rooms?error=" + encodeURIComponent(`Room ${trimmedRoomNumber} already exists in the selected block.`));
        }

        const newRoom = new Room({
            block,
            roomNumber: trimmedRoomNumber,
            type,
            capacity: finalCapacity,
            occupied: 0
        });

        await newRoom.save();
        res.redirect("/admin/rooms?success=" + encodeURIComponent(`Room ${trimmedRoomNumber} created successfully.`));

    } catch (err) {
        if (err.code === 11000) {
            return res.redirect("/admin/rooms?error=" + encodeURIComponent("Room number already exists in the selected block."));
        }
        console.error("Error creating room:", err.message);
        res.redirect("/admin/rooms?error=" + encodeURIComponent("Failed to create room."));
    }
};

// ==========================================
// 7. GET /admin/rooms/:id/edit
// Render edit form for a room
// ==========================================
const getEditRoom = async (req, res) => {
    try {
        if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.redirect("/admin/rooms?error=" + encodeURIComponent("Invalid room identifier."));
        }

        const room = await Room.findById(req.params.id).populate("block");
        if (!room) {
            return res.redirect("/admin/rooms?error=" + encodeURIComponent("Room not found."));
        }

        const blocks = await Block.find().sort({ name: 1 });

        res.render("admin/editRoom", {
            title: `Edit Room ${room.roomNumber}`,
            room,
            blocks,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error("Error loading room for edit:", err.message);
        res.redirect("/admin/rooms?error=" + encodeURIComponent("Unable to load room."));
    }
};

// ==========================================
// 8. POST /admin/rooms/:id/update
// Update room details (capacity cannot be reduced below current occupants)
// ==========================================
const postUpdateRoom = async (req, res) => {
    try {
        const roomId = req.params.id;
        const { block, roomNumber, type, capacity } = req.body;

        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
            return res.redirect("/admin/rooms?error=" + encodeURIComponent("Invalid room identifier."));
        }

        if (!block || !mongoose.Types.ObjectId.isValid(block)) {
            return res.redirect(`/admin/rooms/${roomId}/edit?error=` + encodeURIComponent("Invalid block selected."));
        }

        const room = await Room.findById(roomId);
        if (!room) {
            return res.redirect("/admin/rooms?error=" + encodeURIComponent("Room not found."));
        }

        const newCapacity = parseInt(capacity, 10);
        if (isNaN(newCapacity) || newCapacity < 1) {
            return res.redirect(`/admin/rooms/${roomId}/edit?error=` + encodeURIComponent("Capacity must be at least 1."));
        }

        // Capacity check: Cannot reduce below currently occupied beds
        if (newCapacity < room.occupied) {
            return res.redirect(`/admin/rooms/${roomId}/edit?error=` + encodeURIComponent(`Capacity cannot be reduced below current occupied count (${room.occupied} beds taken).`));
        }

        const trimmedRoomNumber = (roomNumber || "").trim();
        if (!trimmedRoomNumber) {
            return res.redirect(`/admin/rooms/${roomId}/edit?error=` + encodeURIComponent("Room number cannot be empty."));
        }

        // Check uniqueness if block or roomNumber changed
        const duplicate = await Room.findOne({
            block,
            roomNumber: trimmedRoomNumber,
            _id: { $ne: roomId }
        });

        if (duplicate) {
            return res.redirect(`/admin/rooms/${roomId}/edit?error=` + encodeURIComponent(`Room ${trimmedRoomNumber} already exists in that block.`));
        }

        room.block = block;
        room.roomNumber = trimmedRoomNumber;
        room.type = type;
        room.capacity = newCapacity;

        await room.save();
        res.redirect("/admin/rooms?success=" + encodeURIComponent(`Room ${trimmedRoomNumber} updated successfully.`));

    } catch (err) {
        if (err.code === 11000) {
            return res.redirect(`/admin/rooms/${req.params.id}/edit?error=` + encodeURIComponent("Room number already exists in that block."));
        }
        console.error("Error updating room:", err.message);
        res.redirect(`/admin/rooms/${req.params.id}/edit?error=` + encodeURIComponent("Failed to update room."));
    }
};

// ==========================================
// 9. POST /admin/rooms/:id/delete
// Delete room (blocked if occupied > 0)
// ==========================================
const postDeleteRoom = async (req, res) => {
    try {
        const roomId = req.params.id;

        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
            return res.redirect("/admin/rooms?error=" + encodeURIComponent("Invalid room identifier."));
        }

        const room = await Room.findById(roomId);

        if (!room) {
            return res.redirect("/admin/rooms?error=" + encodeURIComponent("Room not found."));
        }

        // Block deletion if students are assigned to this room
        if (room.occupied > 0) {
            return res.redirect("/admin/rooms?error=" + encodeURIComponent(`Cannot delete Room ${room.roomNumber} because it currently has ${room.occupied} active resident(s). Vacate them first.`));
        }

        await Room.findByIdAndDelete(roomId);
        res.redirect("/admin/rooms?success=" + encodeURIComponent(`Room ${room.roomNumber} deleted successfully.`));

    } catch (err) {
        console.error("Error deleting room:", err.message);
        res.redirect("/admin/rooms?error=" + encodeURIComponent("Failed to delete room."));
    }
};

// ==========================================
// 10. GET /admin/requests
// Table of all student requests with filters & room allotment/change options
// ==========================================
const getRequests = async (req, res) => {
    try {
        const { status, type } = req.query;

        const filter = {};
        if (status && status !== "all") filter.status = status;
        if (type && type !== "all") filter.type = type;

        const requests = await Request.find(filter)
            .populate({
                path: "student",
                populate: {
                    path: "room",
                    populate: { path: "block" }
                }
            })
            .sort({ createdAt: -1 });

        // Find only rooms that still have space available (occupied < capacity)
        const allRooms = await Room.find().populate("block").sort({ roomNumber: 1 });
        const availableRooms = allRooms.filter(r => r.occupied < r.capacity);

        res.render("admin/requests", {
            title: "Student Requests Management",
            requests,
            availableRooms,
            currentStatus: status || "all",
            currentType: type || "all",
            error: req.query.error || null,
            success: req.query.success || null
        });

    } catch (err) {
        console.error("Error fetching requests:", err.message);
        res.status(500).render("error", {
            status: 500,
            message: "Unable to load student requests.",
            title: "Server Error"
        });
    }
};

// ==========================================
// 11. POST /admin/requests/:id/approve
// Approve room request or room change (strictly re-checks capacity and updates occupied counts)
// Allowed only while status is "pending"
// ==========================================
const postApproveRequest = async (req, res) => {
    try {
        const requestId = req.params.id;
        const { roomId, adminRemark } = req.body;

        if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
            return res.redirect("/admin/requests?error=" + encodeURIComponent("Invalid request identifier."));
        }

        const request = await Request.findById(requestId);
        if (!request) {
            return res.redirect("/admin/requests?error=" + encodeURIComponent("Request not found."));
        }

        // Rule: Approve allowed only while status is "pending"
        if (request.status !== "pending") {
            return res.redirect("/admin/requests?error=" + encodeURIComponent("Action allowed only while request is pending."));
        }

        if (request.type === "room_request") {
            if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
                return res.redirect("/admin/requests?error=" + encodeURIComponent("Please select a valid room to allot."));
            }

            // Strictly re-check in controller: never trust dropdown state
            const room = await Room.findById(roomId).populate("block");
            if (!room) {
                return res.redirect("/admin/requests?error=" + encodeURIComponent("Selected room does not exist."));
            }

            if (room.occupied >= room.capacity) {
                return res.redirect("/admin/requests?error=" + encodeURIComponent(`Room ${room.roomNumber} is full (${room.occupied}/${room.capacity}). Cannot allot.`));
            }

            const student = await User.findById(request.student);
            if (!student) {
                return res.redirect("/admin/requests?error=" + encodeURIComponent("Student user not found."));
            }

            if (student.room) {
                return res.redirect("/admin/requests?error=" + encodeURIComponent("Student already has an allotted room. Vacate current room first."));
            }

            // Crucial: Update BOTH room.occupied and student.room together
            student.room = room._id;
            await student.save();

            room.occupied += 1;
            await room.save();

            request.status = "approved";
            request.adminRemark = adminRemark ? adminRemark.trim() : `Allotted to ${room.block ? room.block.name : 'Hostel'} - Room ${room.roomNumber}`;
            await request.save();

            return res.redirect("/admin/requests?success=" + encodeURIComponent(`Room ${room.roomNumber} successfully allotted to ${student.name}.`));

        } else if (request.type === "room_change") {
            if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
                return res.redirect("/admin/requests?error=" + encodeURIComponent("Please select a valid target room for room change."));
            }

            // Re-check capacity of the new room
            const newRoom = await Room.findById(roomId).populate("block");
            if (!newRoom || newRoom.occupied >= newRoom.capacity) {
                return res.redirect("/admin/requests?error=" + encodeURIComponent("Selected new room is full or no longer available."));
            }

            const student = await User.findById(request.student);
            if (!student) {
                return res.redirect("/admin/requests?error=" + encodeURIComponent("Student not found."));
            }

            const oldRoomId = student.room;
            if (oldRoomId && oldRoomId.toString() === newRoom._id.toString()) {
                return res.redirect("/admin/requests?error=" + encodeURIComponent("Student is already in this room. Choose a different room."));
            }

            // Decrement old room.occupied
            if (oldRoomId) {
                const oldRoom = await Room.findById(oldRoomId);
                if (oldRoom && oldRoom.occupied > 0) {
                    oldRoom.occupied -= 1;
                    await oldRoom.save();
                }
            }

            // Increment new room.occupied and update student.room
            newRoom.occupied += 1;
            await newRoom.save();

            student.room = newRoom._id;
            await student.save();

            request.status = "approved";
            request.adminRemark = adminRemark ? adminRemark.trim() : `Room changed to ${newRoom.block ? newRoom.block.name : 'Hostel'} - Room ${newRoom.roomNumber}`;
            await request.save();

            return res.redirect("/admin/requests?success=" + encodeURIComponent(`Room change approved! ${student.name} moved to Room ${newRoom.roomNumber}.`));

        } else {
            // General approval fallback
            request.status = "approved";
            request.adminRemark = adminRemark ? adminRemark.trim() : "Approved by warden.";
            await request.save();

            return res.redirect("/admin/requests?success=" + encodeURIComponent("Request marked as approved."));
        }

    } catch (err) {
        console.error("Error approving request:", err.message);
        res.redirect("/admin/requests?error=" + encodeURIComponent("Failed to approve request."));
    }
};

// ==========================================
// 12. POST /admin/requests/:id/reject
// Reject request with warden remarks (allowed only while status is pending)
// ==========================================
const postRejectRequest = async (req, res) => {
    try {
        const requestId = req.params.id;
        const { adminRemark } = req.body;

        if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
            return res.redirect("/admin/requests?error=" + encodeURIComponent("Invalid request identifier."));
        }

        const request = await Request.findById(requestId);
        if (!request) {
            return res.redirect("/admin/requests?error=" + encodeURIComponent("Request not found."));
        }

        // Rule: Reject allowed only while status is "pending"
        if (request.status !== "pending") {
            return res.redirect("/admin/requests?error=" + encodeURIComponent("Action allowed only while request is pending."));
        }

        request.status = "rejected";
        request.adminRemark = adminRemark ? adminRemark.trim() : "Request rejected by warden.";
        await request.save();

        res.redirect("/admin/requests?success=" + encodeURIComponent("Request has been marked as rejected."));

    } catch (err) {
        console.error("Error rejecting request:", err.message);
        res.redirect("/admin/requests?error=" + encodeURIComponent("Failed to reject request."));
    }
};

// ==========================================
// 13. POST /admin/requests/:id/resolve
// Mark maintenance request as resolved (allowed only while status is pending)
// ==========================================
const postResolveRequest = async (req, res) => {
    try {
        const requestId = req.params.id;
        const { adminRemark } = req.body;

        if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
            return res.redirect("/admin/requests?error=" + encodeURIComponent("Invalid request identifier."));
        }

        const request = await Request.findById(requestId);
        if (!request) {
            return res.redirect("/admin/requests?error=" + encodeURIComponent("Request not found."));
        }

        // Rule: Resolve allowed only while status is "pending"
        if (request.status !== "pending") {
            return res.redirect("/admin/requests?error=" + encodeURIComponent("Action allowed only while request is pending."));
        }

        request.status = "resolved";
        request.adminRemark = adminRemark ? adminRemark.trim() : "Maintenance completed and issue resolved.";
        await request.save();

        res.redirect("/admin/requests?success=" + encodeURIComponent("Maintenance request marked as resolved."));

    } catch (err) {
        console.error("Error resolving request:", err.message);
        res.redirect("/admin/requests?error=" + encodeURIComponent("Failed to resolve maintenance request."));
    }
};

// ==========================================
// 14. GET /admin/students
// List all registered students with room allotment status
// ==========================================
const getStudents = async (req, res) => {
    try {
        const students = await User.find({ role: "student" })
            .populate({
                path: "room",
                populate: { path: "block" }
            })
            .sort({ name: 1 });

        res.render("admin/students", {
            title: "Student Residents",
            students,
            error: req.query.error || null,
            success: req.query.success || null
        });

    } catch (err) {
        console.error("Error fetching students:", err.message);
        res.status(500).render("error", {
            status: 500,
            message: "Unable to load students.",
            title: "Server Error"
        });
    }
};

// ==========================================
// 15. POST /admin/students/:id/vacate
// Warden vacates a student's room (calls shared vacateStudent helper)
// ==========================================
const postVacateStudent = async (req, res) => {
    try {
        if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.redirect("/admin/students?error=" + encodeURIComponent("Invalid student identifier."));
        }

        const result = await vacateStudent(req.params.id);

        if (!result.success) {
            return res.redirect("/admin/students?error=" + encodeURIComponent(result.message));
        }

        res.redirect("/admin/students?success=" + encodeURIComponent("Student room vacated successfully. Bed is now available."));

    } catch (err) {
        console.error("Error vacating student:", err.message);
        res.redirect("/admin/students?error=" + encodeURIComponent("Failed to vacate student."));
    }
};

// ==========================================
// 16. GET /admin/menu
// View weekly mess menu in editable form
// ==========================================
const getMenu = async (req, res) => {
    try {
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const savedMenus = await Menu.find();
        const menuMap = {};
        savedMenus.forEach(m => { menuMap[m.day] = m; });

        const weekMenu = days.map(d => menuMap[d] || { day: d, breakfast: "", lunch: "", snacks: "", dinner: "" });

        res.render("admin/menu", {
            title: "Manage Mess Menu",
            weekMenu,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error("Error fetching menu:", err.message);
        res.status(500).render("error", {
            status: 500,
            message: "Unable to load mess menu.",
            title: "Server Error"
        });
    }
};

// ==========================================
// 17. POST /admin/menu
// Save/Update weekly mess menu for all 7 days
// ==========================================
const postMenu = async (req, res) => {
    try {
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        for (const day of days) {
            const breakfast = (req.body[`breakfast_${day}`] || "").trim();
            const lunch = (req.body[`lunch_${day}`] || "").trim();
            const snacks = (req.body[`snacks_${day}`] || "").trim();
            const dinner = (req.body[`dinner_${day}`] || "").trim();

            let dayMenu = await Menu.findOne({ day });
            if (!dayMenu) {
                dayMenu = new Menu({ day, breakfast, lunch, snacks, dinner });
            } else {
                dayMenu.breakfast = breakfast;
                dayMenu.lunch = lunch;
                dayMenu.snacks = snacks;
                dayMenu.dinner = dinner;
            }
            await dayMenu.save();
        }

        res.redirect("/admin/menu?success=" + encodeURIComponent("Weekly mess menu published successfully."));
    } catch (err) {
        console.error("Error saving menu:", err.message);
        res.redirect("/admin/menu?error=" + encodeURIComponent("Failed to save menu."));
    }
};

// ==========================================
// 18. GET /admin/feedback
// View all student mess feedback and calculated meal averages
// ==========================================
const getFeedback = async (req, res) => {
    try {
        const feedbacks = await Feedback.find()
            .populate("student")
            .sort({ createdAt: -1 });

        // Simple loop to calculate average rating per meal type
        const totals = {
            breakfast: { sum: 0, count: 0 },
            lunch: { sum: 0, count: 0 },
            snacks: { sum: 0, count: 0 },
            dinner: { sum: 0, count: 0 }
        };

        for (const item of feedbacks) {
            if (totals[item.meal]) {
                totals[item.meal].sum += item.rating;
                totals[item.meal].count += 1;
            }
        }

        const averages = {
            breakfast: totals.breakfast.count > 0 ? (totals.breakfast.sum / totals.breakfast.count).toFixed(1) : "N/A",
            lunch: totals.lunch.count > 0 ? (totals.lunch.sum / totals.lunch.count).toFixed(1) : "N/A",
            snacks: totals.snacks.count > 0 ? (totals.snacks.sum / totals.snacks.count).toFixed(1) : "N/A",
            dinner: totals.dinner.count > 0 ? (totals.dinner.sum / totals.dinner.count).toFixed(1) : "N/A"
        };

        res.render("admin/feedback", {
            title: "Mess Feedback & Ratings",
            feedbacks,
            averages,
            totals,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error("Error fetching feedback:", err.message);
        res.status(500).render("error", {
            status: 500,
            message: "Unable to load student feedback.",
            title: "Server Error"
        });
    }
};

module.exports = {
    getDashboard,
    getBlocks,
    postAddBlock,
    postDeleteBlock,
    getRooms,
    postAddRoom,
    getEditRoom,
    postUpdateRoom,
    postDeleteRoom,
    getRequests,
    postApproveRequest,
    postRejectRequest,
    postResolveRequest,
    getStudents,
    postVacateStudent,
    getMenu,
    postMenu,
    getFeedback
};
