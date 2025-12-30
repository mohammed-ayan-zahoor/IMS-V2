const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// We can't use imports here if we run with 'node seed.js' unless we use mjs or babel
// So using require for this standalone script

const UserSchema = new mongoose.Schema({
    email: String,
    passwordHash: String,
    role: String,
    profile: { firstName: String, lastName: String }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI not found in .env.local");
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log("Connected to MongoDB for seeding...");

    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('Admin@123', salt);
    const studentPassword = await bcrypt.hash('Student@123', salt);

    await User.deleteMany({}); // Warning: Clear existing users

    await User.create([
        {
            email: 'admin@ims.com',
            passwordHash: adminPassword,
            role: 'admin',
            profile: { firstName: 'System', lastName: 'Administrator' }
        },
        {
            email: 'student@ims.com',
            passwordHash: studentPassword,
            role: 'student',
            profile: { firstName: 'John', lastName: 'Doe' }
        }
    ]);

    console.log("Seed data created successfully!");
    console.log("Admin: admin@ims.com / Admin@123");
    console.log("Student: student@ims.com / Student@123");

    await mongoose.disconnect();
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
