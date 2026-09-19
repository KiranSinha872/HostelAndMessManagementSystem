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

        const adminEmail = process.env.ADMIN_EMAIL || "admin@hostel.com";
        const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

        let adminUser = await User.findOne({ email: adminEmail });

        if (adminUser) {
            adminUser.role = "admin";
            adminUser.password = await bcrypt.hash(adminPassword, 10);
            await adminUser.save();
            console.log(`Admin user verified and updated: ${adminEmail}`);
        } else {
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            adminUser = new User({
                name: "Hostel Warden",
                email: adminEmail,
                password: hashedPassword,
                role: "admin"
            });

            await adminUser.save();
            console.log("Admin account created successfully!");
            console.log(`Email: ${adminEmail}`);
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
