# Hostel Room Allotment & Mess Management System 🏢🍽️

A full-stack web application designed for college hostel administrations to automate room allocations, manage room change and maintenance tickets, schedule weekly mess menus, and track student dining feedback. Built with **Node.js**, **Express.js**, **MongoDB Atlas (Mongoose)**, **EJS**, and **Vanilla CSS**.

---

## 🌐 Live URL
> **Live URL:** `https://your-hostel-app.onrender.com` *(Replace with your deployed URL)*

---

## 🚀 Key Features

### 👨‍🎓 Student Portal
- **Secure Authentication**: Register and log in with bcrypt-hashed credentials and HTTP-only JWT cookies.
- **Student Dashboard**: Live status of current room allotment, count of pending requests, and today's mess menu.
- **Room Allotment & Vacating**:
  - View allotted room details (Block, Room Number, Type, Capacity, Roommates).
  - Apply for a hostel room (duplicate requests and requesting while already allotted are automatically guarded).
  - Self-vacate room with one click, immediately freeing up bed space for others.
- **Requests & Grievances**:
  - Submit **Room Change** or **Maintenance** requests with custom descriptions.
  - Track real-time status badges (**Pending**, **Approved**, **Resolved**, **Rejected**) and read warden remarks.
- **Mess Module**:
  - View full 7-day weekly mess schedule with today's meals automatically highlighted.
  - Submit 1–5 star ratings and comments for any meal (Breakfast, Lunch, Snacks, Dinner).
  - View personal feedback history.

### 🛡️ Warden (Admin) Portal
- **Warden Dashboard**:
  - 4 live KPI cards: **Total Beds**, **Occupied Beds**, **Vacant Beds**, and **Pending Requests**.
  - Block-wise occupancy table with CSS percentage progress bars.
  - Recent pending requests widget and quick management action links.
- **Hostel Blocks Management**:
  - Add new hostel blocks with descriptions.
  - View live room counts per block.
  - Delete empty blocks (blocks with existing rooms are protected from accidental deletion).
- **Rooms Management**:
  - Create rooms under specific blocks with type-based capacity defaults (Single=1, Double=2, Triple=3) or custom capacities.
  - Edit room capacity (safeguarded: cannot be reduced below current occupant count).
  - Delete rooms (safeguarded: cannot delete rooms with active residents).
- **Student Residents Overview**:
  - Directory of all registered students and their room assignments.
  - One-click administrative vacating that keeps bed counts synchronized.
- **Request Approval System**:
  - Multi-criteria filtering by request status (`pending`, `approved`, `resolved`, `rejected`) and type (`room_request`, `room_change`, `maintenance`).
  - **Room Allotment**: Dynamic dropdown of available rooms only (`occupied < capacity`).
  - **Room Change**: Seamless bed transfer that decrements old room occupancy and increments target room occupancy simultaneously.
  - **Maintenance**: One-click resolution with optional resolution remarks.
- **Mess Menu & Feedback Monitoring**:
  - Publish or update weekly mess menu for all 7 days in a single consolidated grid.
  - Monitor student dining feedback and view auto-calculated average ratings per meal type.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Runtime Environment** | Node.js |
| **Backend Framework** | Express.js (v5) |
| **Database** | MongoDB Atlas (Cloud) via Mongoose ODM |
| **Template Engine** | EJS (Embedded JavaScript) |
| **Authentication & Security** | JSON Web Tokens (`jsonwebtoken`), `bcrypt` password hashing, `cookie-parser` (HTTP-only cookies) |
| **Styling** | Vanilla CSS (Responsive design, CSS Grid/Flexbox, Mobile Media Queries) |

---

## 📂 Folder Structure

```text
HostelAndMessManagementSystem/
├── config/
│   └── db.js                 # MongoDB connection logic using mongoose
├── controllers/
│   ├── adminController.js    # Warden actions (blocks, rooms, requests, menu, feedback)
│   ├── authController.js     # Auth actions (register, login, logout, JWT generation)
│   └── studentController.js  # Student actions (dashboard, room requests, vacate, feedback)
├── middleware/
│   └── auth.js               # JWT verification & role authorization (verifyToken, isAdmin, isStudent)
├── models/
│   ├── Block.js              # Block schema (name, description)
│   ├── Feedback.js           # Mess feedback schema (student, day, meal, rating, comment)
│   ├── Menu.js               # Weekly menu schema (day, breakfast, lunch, snacks, dinner)
│   ├── Request.js            # Request schema (student, type, description, status, adminRemark)
│   ├── Room.js               # Room schema (block, roomNumber, type, capacity, occupied)
│   └── User.js               # User schema (name, email, password, role, room)
├── public/
│   └── css/
│       └── style.css         # Complete design system & mobile-responsive media queries
├── routes/
│   ├── adminRoutes.js        # Admin protected routes (/admin/*)
│   ├── authRoutes.js         # Public authentication routes (/login, /register, /logout)
│   └── studentRoutes.js      # Student protected routes (/student/*)
├── utils/
│   └── vacateStudent.js      # Shared helper for synchronized student vacating
├── views/
│   ├── admin/
│   │   ├── blocks.ejs        # Block management view
│   │   ├── dashboard.ejs     # Warden analytics dashboard
│   │   ├── editRoom.ejs      # Edit room view
│   │   ├── feedback.ejs      # Feedback inspection & meal rating averages
│   │   ├── menu.ejs          # Weekly menu editor
│   │   ├── requests.ejs      # Request approval & allotment interface
│   │   ├── rooms.ejs         # Room management view
│   │   └── students.ejs      # Student directory & vacate action
│   ├── auth/
│   │   ├── login.ejs         # Login form
│   │   └── register.ejs      # Registration form
│   ├── partials/
│   │   ├── footer.ejs        # Common footer partial
│   │   └── header.ejs        # Responsive navbar & meta header partial
│   ├── student/
│   │   ├── dashboard.ejs     # Student dashboard
│   │   ├── feedback.ejs      # Meal feedback submission & past reviews
│   │   ├── menu.ejs          # Weekly mess schedule with today highlighted
│   │   ├── newRequest.ejs    # Raise maintenance / room change ticket
│   │   ├── requests.ejs      # Student ticket tracking view
│   │   └── room.ejs          # Room status, roommates, & vacate view
│   ├── error.ejs             # Friendly error & 404 page
│   └── index.ejs             # Public landing page
├── .env.example              # Environment variables template
├── package.json              # Project dependencies and npm scripts
├── README.md                 # Complete project documentation
├── seed-admin.js             # Initial admin account setup script
└── server.js                 # Express application entry point
```

---

## 🗄️ Database Collections

- **`users`**: Stores student and admin credentials, role, and current room reference.
- **`blocks`**: Hostel blocks/buildings (e.g. Block A, Block B, Block C).
- **`rooms`**: Rooms within blocks with type, capacity, and current occupied count.
- **`requests`**: Allotment, room change, and maintenance tickets with status and warden remarks.
- **`menus`**: Daily mess menu for all 7 days with four meal slots.
- **`feedbacks`**: Student dining reviews with 1–5 star ratings and comments.

---

## ⚙️ Setup & Installation Instructions

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **MongoDB Atlas** account or local MongoDB instance

### 2. Clone the Repository
```bash
git clone https://github.com/KiranSinha872/HostelAndMessManagementSystem.git
cd HostelAndMessManagementSystem
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Create `.env` from `.env.example`:
```bash
cp .env.example .env
```
Open `.env` and fill in your connection details:
```env
PORT=3000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/hostel_db?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
```

### 5. Create Initial Admin Account
Run the admin initialization script (if `seed-admin.js` exists):
```bash
node seed-admin.js
```
*Creates the initial warden administrator account (`admin@hostel.com` / `admin123`).*

### 6. Start the Application
- **Development mode (with auto-reload):**
  ```bash
  npm run dev
  ```
- **Production mode:**
  ```bash
  npm start
  ```
Visit `http://localhost:3000` in your web browser.

---

## 🔑 Default Administrator Credentials

| Role | Email | Password | Details |
|---|---|---|---|
| **Warden (Admin)** | `admin@hostel.com` | `admin123` | Full access to warden dashboard, blocks, rooms, requests, and mess |

---

## 📖 User Workflows

### Student Workflow
1. **Registration & Login**: Create an account at `/register` or sign in at `/login`.
2. **Room Request**: Navigate to **My Room** (`/student/room`) and submit a room allotment request.
3. **Room Tracking & Vacating**: Once allotted, view assigned roommates and room details; vacate when needed.
4. **Tickets**: Raise **Room Change** or **Maintenance** tickets from `/student/requests/new` and track status.
5. **Mess & Feedback**: Check `/student/menu` for the weekly menu and submit meal ratings at `/student/feedback`.

### Warden (Admin) Workflow
1. **Dashboard Overview**: Check aggregate beds, occupancy rates, and pending requests at `/admin/dashboard`.
2. **Manage Blocks & Rooms**: Add hostel blocks (`/admin/blocks`) and configure rooms (`/admin/rooms`).
3. **Approve Requests**: Review incoming student tickets at `/admin/requests`, allocate available rooms, approve transfers, and mark maintenance resolved.
4. **Mess Menu & Reviews**: Set the 7-day menu at `/admin/menu` and inspect student dining feedback and averages at `/admin/feedback`.

---

## 🚀 Deployment (Vercel)

The application is structured for zero-config serverless deployment on Vercel:

### 1. Import Repository
1. Log in to [Vercel](https://vercel.com) and click **Add New...** -> **Project**.
2. Select and import your GitHub repository (`HostelAndMessManagementSystem`).
3. Leave Framework Preset as **Other** (Express zero-config).

### 2. Configure Environment Variables
In the Vercel project setup screen under **Environment Variables**, add:
- `MONGO_URI`: Your full MongoDB Atlas connection string (e.g. `mongodb+srv://<user>:<password>@cluster0.../hostel_db?retryWrites=true&w=majority`)
- `JWT_SECRET`: A strong secret string for signing JWT tokens

### 3. MongoDB Atlas Network Access Whitelist
Because Vercel serverless functions run across dynamic IP ranges:
1. Go to **MongoDB Atlas** -> **Security** -> **Network Access**.
2. Add IP Address: `0.0.0.0/0` (Allow access from anywhere).
3. Confirm that database user credentials have read/write access to the database.

### 4. How to Redeploy
- **Automatic Redeploy**: Push new commits to your GitHub default branch (`main`); Vercel will automatically build and deploy the update.
- **Manual Redeploy**: Go to your Vercel Project Dashboard -> **Deployments** tab -> click the three dots (`...`) next to the deployment -> select **Redeploy**.

