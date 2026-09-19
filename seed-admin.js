// ==========================================
// SEED INITIAL ADMIN USER
// Run with: node seed-admin.js
// ==========================================
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/User");

const seedAdmin = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error("Error: MONGO_URI is not set in .env file.");
            process.exit(1);
        }

        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected for seeding.");

        const adminEmail = "admin@hostel.com";
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log(`Admin user already exists: ${adminEmail}`);
        } else {
            const hashedPassword = await bcrypt.hash("admin123", 10);
            const adminUser = new User({
                name: "Hostel Warden",
                email: adminEmail,
                password: hashedPassword,
                role: "admin"
            });

            await adminUser.save();
            console.log("Admin account created successfully!");
            console.log("Email: admin@hostel.com");
            console.log("Password: admin123");
            console.log("Role: admin");
        }

        await mongoose.disconnect();
        console.log("Database disconnected. Admin setup finished.");
        process.exit(0);

    } catch (err) {
        console.error("Error during admin seeding:", err.message);
        process.exit(1);
    }
};

seedAdmin();
