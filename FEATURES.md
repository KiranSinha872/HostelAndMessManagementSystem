# 🏢 Hostel Room Allotment & Mess Management System
## Complete Feature Specification & Architecture Guide

This document provides an exhaustive, component-by-component breakdown of all features, business rules, workflows, and database models implemented in the **Hostel Room Allotment & Mess Management System**.

---

## 📑 Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [User Roles & Access Control](#2-user-roles--access-control)
3. [Hostel Blocks & Room Inventory Module](#3-hostel-blocks--room-inventory-module)
4. [Room Allotment & Bed Allocation Engine](#4-room-allotment--bed-allocation-engine)
5. [Vacating & Synchronization Logic](#5-vacating--synchronization-logic)
6. [Grievance & Maintenance Ticketing Module](#6-grievance--maintenance-ticketing-module)
7. [Mess Dining & Feedback Module](#7-mess-dining--feedback-module)
8. [Interactive Dashboards & Analytics](#8-interactive-dashboards--analytics)
9. [Security & Validation Architecture](#9-security--validation-architecture)
10. [Database Schema & Collections Reference](#10-database-schema--collections-reference)
11. [Complete Route & Endpoint Matrix](#11-complete-route--endpoint-matrix)
12. [Cloud Architecture & Deployment Readiness](#12-cloud-architecture--deployment-readiness)

---

## 1. Executive Summary

The **Hostel Room Allotment & Mess Management System** is a full-stack web application designed to replace physical paper registers and uncoordinated manual processes in college hostel administration. Built using **Node.js**, **Express 5**, **MongoDB Atlas**, **Mongoose 9**, and **EJS**, the platform digitizes:
- Physical room and bed inventory tracking.
- Room allotment requests and capacity-controlled approvals.
- Student grievance reporting (maintenance and room change tickets).
- Weekly 7-day dining menus with automated student meal review averages.
- High-level administrative analytics and block occupancy visualization.

---

## 2. User Roles & Access Control

The application implements a strict **Role-Based Access Control (RBAC)** architecture with two primary roles:

### 👤 2.1 Student Role (`role: 'student'`)
- **Self-Registration & Login**: Students can create an account using their name, email, and a secure password.
- **Room Allotment Requests**: Non-allotted students can submit a room allotment application.
- **Room Management**: View allotted block, room number, room type, and roommates; initiate self-vacating when moving out.
- **Grievance Ticketing**: Submit maintenance tickets (e.g. electrical, plumbing) or room change applications, and track ticket lifecycle with warden remarks.
- **Mess Dining**: View the complete weekly meal schedule with today's meals automatically highlighted.
- **Meal Feedback**: Submit 1–5 star ratings and reviews for any meal slot and inspect their past feedback history.

### 🛡️ 2.2 Warden / Administrator Role (`role: 'admin'`)
- **Executive Analytics**: Real-time overview of total beds, occupied beds, vacant beds, pending tickets, and block-wise occupancy percentages.
- **Hostel Infrastructure**: Full CRUD operations on hostel blocks and individual rooms.
- **Ticket & Allotment Processing**: Review pending student applications; approve room requests only into rooms with available vacancy; reject tickets with explanatory remarks; mark maintenance tickets resolved.
- **Resident Directory**: View all registered students, their allotment status, assigned rooms, and administratively vacate students.
- **Mess Administration**: Publish and update the 7-day weekly menu across 4 daily meal slots; monitor dining feedback ratings and average satisfaction scores per meal.

### 🔐 2.3 Authentication Mechanics
- **Stateless JWT Tokens**: Tokens are generated on login/registration with a 7-day expiration (`jwt.sign`).
- **HTTP-Only Cookies**: Tokens are stored in a secure cookie named `token`, protecting sessions against Cross-Site Scripting (XSS).
- **Password Security**: Passwords are salted and hashed using `bcryptjs` (salt rounds: 10) before saving to the database.
- **Middleware Guards**:
  - `verifyToken`: Validates JWT authenticity and attaches user data to `req.user` and template locals `res.locals.currentUser`.
  - `isAdmin`: Restricts `/admin/*` routes strictly to users with `role === 'admin'`.
  - `isStudent`: Restricts `/student/*` routes strictly to users with `role === 'student'`.

---

## 3. Hostel Blocks & Room Inventory Module

### 🏢 3.1 Block Management (`/admin/blocks`)
- **Create Blocks**: Add hostel blocks with a unique name (e.g., *Block A*, *Block B*) and optional description.
- **Block Uniqueness**: Duplicate block names are rejected with user-friendly error messages.
- **Safe Block Deletion**: The system prohibits deleting any block that currently contains rooms, preventing orphaned room records.

### 🚪 3.2 Room Inventory (`/admin/rooms`)
- **Add Rooms**: Define room numbers under specific blocks with predefined configurations:
  - **Room Types**: `Single` (1 bed), `Double` (2 beds), or `Triple` (3 beds).
  - **Capacity**: Maximum occupant threshold for the room.
  - **Initial Occupancy**: Starts at `0`.
- **Duplicate Prevention**: Rejects creating a room number that already exists within the same block.
- **Occupancy Badges**: Real-time visual status indicator:
  - 🟢 **Vacant**: `occupied === 0`
  - 🟡 **Partially Occupied**: `0 < occupied < capacity`
  - 🔴 **Full**: `occupied >= capacity`
- **Safe Room Edit (`/admin/rooms/:id/edit`)**: Administrators can update room type and capacity. However, a strict validation check prevents lowering capacity below the room's current resident count.
- **Safe Room Deletion**: The system blocks deleting any room that currently houses active occupants (`occupied > 0`).

---

## 4. Room Allotment & Bed Allocation Engine

### 📝 4.1 Allotment Request Flow (`/student/room`)
1. **Unallotted State**: A student without an assigned room sees their status as *"Not Allotted"* with a direct *"Request Room Allotment"* action.
2. **Single Pending Request Constraint**: A student can have at most **one active pending request** across the system. Submitting a second request while one is pending is strictly blocked with a clear warning message.
3. **Automatic Ticket Creation**: Submitting the form creates a document in the `requests` collection with `type: 'allotment'` and `status: 'pending'`.

### ⚖️ 4.2 Warden Allocation & Capacity Enforcement (`/admin/requests`)
1. **Incoming Queue**: The warden views all incoming student allotment tickets.
2. **Dynamic Room Selection**: The allotment interface renders a dropdown populated with available rooms. Rooms that are full are clearly indicated or excluded.
3. **Strict Capacity Validation**: If an administrator attempts to approve a student into a room where `room.occupied >= room.capacity`, the server immediately rejects the transaction with an error: *"Selected room is already full"*.
4. **Atomic Synchronization**:
   - Student record updated: `user.room = selectedRoom._id`.
   - Room record updated: `room.occupied = room.occupied + 1`.
   - Request record updated: `request.status = 'approved'`, `request.adminRemark = remark`.

### 👥 4.3 Roommate Visibility (`/student/room`)
- Once allotted, the student's room view renders full details: Block Name, Room Number, Room Type, Capacity, and Bed Count.
- Lists all co-residents (roommates) currently allotted to the same room with their names and emails.

---

## 5. Vacating & Synchronization Logic

### 🔄 5.1 Shared Vacate Utility (`utils/vacateStudent.js`)
To guarantee consistency across both student self-service and warden administrative actions, vacating logic is centralized into an atomic helper function:
```javascript
async function vacateStudent(studentId) {
    const student = await User.findById(studentId);
    if (!student || !student.room) return null;
    
    // 1. Decrement room occupied count (preventing negative counts)
    await Room.findByIdAndUpdate(student.room, {
        : { occupied: -1 }
    });
    
    // 2. Clear student room reference
    student.room = null;
    await student.save();
    return true;
}
```

### 🚪 5.2 Student Self-Vacate (`POST /student/room/vacate`)
- Allotted students can vacate their room directly from their dashboard.
- The system resets their allotment status and frees their bed immediately.

### 🛡️ 5.3 Administrative Vacate (`POST /admin/students/:id/vacate`)
- Wardens can manually vacate any resident from the **Student Directory** (`/admin/students`), instantly updating the room's available bed count.

---

## 6. Grievance & Maintenance Ticketing Module

### 🎟️ 6.1 Raising Tickets (`/student/requests/new`)
Students can submit two types of support tickets:
1. **Room Change Request (`type: 'change'`)**: Request a transfer to a different room or block with justification.
2. **Maintenance Request (`type: 'maintenance'`)**: Report infrastructure or facility issues (e.g. faulty electrical switch, leaking tap, broken furniture).

### 📊 6.2 Ticket Lifecycle & Tracking (`/student/requests`)
- Tickets transition through four deterministic statuses:
  - ⏳ **`pending`**: Awaiting warden review.
  - 🟢 **`approved`**: Room change accepted and executed.
  - 🛠️ **`resolved`**: Maintenance work completed.
  - 🔴 **`rejected`**: Ticket declined with warden remarks.
- Students view the timeline, ticket date, current status badge, and warden remarks.

### 🛠️ 6.3 Warden Ticket Management (`/admin/requests`)
- **Status & Type Filtering**: Wardens can filter tickets by status (`All`, `Pending`, `Approved`, `Resolved`, `Rejected`) and type (`All`, `Allotment`, `Room Change`, `Maintenance`).
- **Resolve Maintenance**: Wardens can mark repairs as *Resolved* with optional repair notes.
- **Reject Tickets**: Wardens can decline tickets with documented administrative feedback.

---

## 7. Mess Dining & Feedback Module

### 📅 7.1 Weekly 7-Day Menu Publishing (`/admin/menu`)
- **Comprehensive Weekly Matrix**: Wardens configure meals for all 7 days of the week (Monday through Sunday).
- **4 Meal Slots Per Day**:
  1. 🍳 **Breakfast**
  2. 🍛 **Lunch**
  3. ☕ **Snacks**
  4. 🍲 **Dinner**
- **Bulk Upsert Mechanism**: The warden edits all days in a single responsive table. Saving runs an upsert loop (`findOneAndUpdate` with `upsert: true`) that updates existing days or inserts new day entries.

### 🍽️ 7.2 Student Menu Interface (`/student/menu`)
- Renders the weekly meal schedule in a clean, responsive table.
- **Dynamic "Today" Highlighting**: The application detects the current day of the week in real-time and adds a prominent highlight badge and background to today's menu row.

### ⭐ 7.3 Student Dining Feedback (`/student/feedback`)
- **Review Submission**: Students select the day and meal slot (Breakfast, Lunch, Snacks, Dinner), assign a rating from **1 to 5 stars**, and submit qualitative comments.
- **Personal History**: Students can view all their past submitted feedback entries below the submission form.

### 📈 7.4 Warden Feedback Analytics (`/admin/feedback`)
- **Dynamic Rating Averages**: Automatically computes aggregate satisfaction ratings across all four meal categories using JavaScript accumulator loops:
  - 🍳 *Breakfast Average Rating*
  - 🍛 *Lunch Average Rating*
  - ☕ *Snacks Average Rating*
  - 🍲 *Dinner Average Rating*
- **Feedback Audit Table**: Chronological table of all student dining reviews showing Student Name, Day, Meal Slot, Star Rating, Comments, and Submission Date.

---

## 8. Interactive Dashboards & Analytics

### 📊 8.1 Warden Analytics Dashboard (`/admin/dashboard`)
1. **Four Key Metric Cards**:
   - 🛏️ **Total Beds**: Aggregate sum of all room capacities across all blocks.
   - 👥 **Occupied Beds**: Current total count of active resident occupants.
   - 🟢 **Vacant Beds**: Total unoccupied beds immediately available for allotment (`Total - Occupied`).
   - ⏳ **Pending Requests**: Count of unreviewed student tickets awaiting action.
2. **Block-Wise Occupancy Overview**:
   - Loop over rooms grouped by block (using Mongoose `.populate('block')`).
   - Displays Total Beds, Occupied Beds, Vacant Beds, and Occupancy Percentage for each block.
   - **CSS Progress Bar**: Visual percentage bar colored by utilization.
3. **Recent Pending Requests**:
   - Quick preview list of the 5 most recent pending student tickets with direct approval links.
4. **Quick Navigation Hub**:
   - One-click access to Blocks, Rooms, Requests, Students, Menu, and Feedback.

### 📱 8.2 Student Personal Dashboard (`/student/dashboard`)
1. **My Room Card**: Displays current assigned room details or a prompt to request one.
2. **Pending Requests Counter**: Real-time count of active tickets submitted by the student.
3. **Today's Menu Card**: Shows today's meal schedule fetched directly from the `menus` collection.
4. **Quick Action Buttons**: Fast shortcuts to request a room, file a ticket, view the weekly menu, or leave feedback.

---

## 9. Security & Validation Architecture

- **Zero-Crash Resilience**: All `POST` controllers validate input presence, object ID formats, and business constraints before touching the database.
- **Friendly Flash Messaging**: Success and error messages are passed dynamically to views via query parameters and rendered in alert banners.
- **Database Connection Re-use**: `config/db.js` checks Mongoose `readyState` before connecting, ensuring serverless instances reuse cached database pools without redundant connections.
- **Zero Secrets Committed**: All secrets (`MONGO_URI`, `JWT_SECRET`, `PORT`) are stored in `.env` (gitignored), with `.env.example` provided for safe onboarding.

---

## 10. Database Schema & Collections Reference

| Collection | Model File | Fields & Types | Description |
|---|---|---|---|
| **`users`** | `models/User.js` | `name` (String, req)<br>`email` (String, unique, req)<br>`password` (String, req, hashed)<br>`role` (enum: 'student' \| 'admin')<br>`room` (ref: 'Room', default: null)<br>`createdAt` (Date) | Stores student and warden accounts and active room assignments |
| **`blocks`** | `models/Block.js` | `name` (String, unique, req)<br>`description` (String)<br>`createdAt` (Date) | Stores hostel buildings/blocks |
| **`rooms`** | `models/Room.js` | `block` (ref: 'Block', req)<br>`roomNumber` (String, req)<br>`type` (enum: 'Single' \| 'Double' \| 'Triple')<br>`capacity` (Number, min: 1)<br>`occupied` (Number, default: 0)<br>`createdAt` (Date) | Stores rooms, maximum capacity, and current resident counts |
| **`requests`** | `models/Request.js` | `student` (ref: 'User', req)<br>`type` (enum: 'allotment' \| 'change' \| 'maintenance')<br>`description` (String, req)<br>`status` (enum: 'pending' \| 'approved' \| 'rejected' \| 'resolved')<br>`adminRemark` (String)<br>`createdAt` (Date) | Stores allotment requests, room transfers, and maintenance grievances |
| **`menus`** | `models/Menu.js` | `day` (enum: Monday–Sunday, unique)<br>`breakfast` (String, req)<br>`lunch` (String, req)<br>`snacks` (String, req)<br>`dinner` (String, req)<br>`updatedAt` (Date) | Stores 7-day dining schedules across 4 daily meal slots |
| **`feedbacks`** | `models/Feedback.js` | `student` (ref: 'User', req)<br>`day` (String, req)<br>`meal` (enum: 'breakfast' \| 'lunch' \| 'snacks' \| 'dinner')<br>`rating` (Number, min: 1, max: 5)<br>`comment` (String)<br>`createdAt` (Date) | Stores student meal satisfaction ratings and comments |

---

## 11. Complete Route & Endpoint Matrix

### 🔓 Public Authentication Routes (`routes/authRoutes.js`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Public landing page with portal overview |
| `GET` | `/login` | Render account login page |
| `POST` | `/login` | Authenticate credentials and set HTTP-only JWT cookie |
| `GET` | `/register` | Render student registration page |
| `POST` | `/register` | Register new student, hash password, and set JWT cookie |
| `GET` | `/logout` | Clear auth cookie and redirect to login |

### 👤 Student Protected Routes (`routes/studentRoutes.js` - guarded by `verifyToken`, `isStudent`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/student/dashboard` | Student dashboard (room card, tickets count, today's menu) |
| `GET` | `/student/room` | Room status, roommate directory, or request room form |
| `POST` | `/student/room/request` | Submit new room allotment request |
| `POST` | `/student/room/vacate` | Self-vacate assigned room |
| `GET` | `/student/requests` | List and track personal tickets and warden remarks |
| `GET` | `/student/requests/new` | Form to submit maintenance or room change ticket |
| `POST` | `/student/requests/new` | Create maintenance or room change ticket |
| `GET` | `/student/menu` | Weekly mess schedule with today's meals highlighted |
| `GET` | `/student/feedback` | Meal feedback form and personal past review history |
| `POST` | `/student/feedback` | Submit meal rating (1–5) and review comment |

### 🛡️ Warden Protected Routes (`routes/adminRoutes.js` - guarded by `verifyToken`, `isAdmin`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/dashboard` | Executive analytics dashboard (bed stats, occupancy bars, pending queue) |
| `GET` | `/admin/blocks` | List hostel blocks and block addition form |
| `POST` | `/admin/blocks` | Add a new hostel block |
| `POST` | `/admin/blocks/:id/delete` | Delete a block (blocked if block contains rooms) |
| `GET` | `/admin/rooms` | List rooms grouped by block with occupancy badges |
| `POST` | `/admin/rooms` | Add a new room to a block |
| `GET` | `/admin/rooms/:id/edit` | Form to edit room type and capacity |
| `POST` | `/admin/rooms/:id/update` | Update room (blocked if capacity < current occupied) |
| `POST` | `/admin/rooms/:id/delete` | Delete room (blocked if occupied > 0) |
| `GET` | `/admin/requests` | Review student tickets with status and type filters |
| `POST` | `/admin/requests/:id/approve` | Approve room allotment/change (blocked if room is full) |
| `POST` | `/admin/requests/:id/reject` | Reject request with warden remark |
| `POST` | `/admin/requests/:id/resolve` | Mark maintenance request as resolved |
| `GET` | `/admin/students` | Student directory with room allotments and vacate buttons |
| `POST` | `/admin/students/:id/vacate` | Administratively vacate a student from their room |
| `GET` | `/admin/menu` | Weekly menu editor for all 7 days |
| `POST` | `/admin/menu` | Save / update weekly mess menu |
| `GET` | `/admin/feedback` | View all dining reviews and average rating per meal slot |

---

## 12. Cloud Architecture & Deployment Readiness

- **Platform**: Configured for **Vercel** serverless functions with zero external configuration required.
- **Serverless Export**: `server.js` exports the Express app instance (`module.exports = app`) and only invokes `app.listen()` during local development (`process.env.NODE_ENV !== 'production'`).
- **Static Assets**: All CSS stylesheets and icons are served from `/public` via CDN-friendly root paths (`/css/style.css`).
- **Database**: Cloud connectivity via **MongoDB Atlas** cluster with global network access whitelist (`0.0.0.0/0`).
- **Quality Assurance**: Complete test coverage via 32 automated integration tests verifying authentication, capacity boundaries, room allotments, and ticketing.
