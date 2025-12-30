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

// Adding a basic Counter schema and model to support the new seed function's Counter.deleteMany() call
const CounterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});
const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

async function seed() {
    if (process.env.NODE_ENV === 'production') {
        console.error("Cowardly refusing to seed in production!");
        process.exit(1);
    }

    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        if (!MONGODB_URI) throw new Error("MONGODB_URI is not defined");

        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Counter.deleteMany({});
        console.log('Cleared existing users and counters');

        const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
        const studentPassword = process.env.SEED_STUDENT_PASSWORD || 'Student@123';

        // Create Admin
        const adminSalt = await bcrypt.genSalt(10);
        const adminHash = await bcrypt.hash(adminPassword, adminSalt);
        await User.create({
            email: 'admin@ims.com',
            passwordHash: adminHash,
            role: 'super_admin',
            profile: { firstName: 'System', lastName: 'Admin' }
        });

        // Create Student
        const studentSalt = await bcrypt.genSalt(10);
        const studentHash = await bcrypt.hash(studentPassword, studentSalt);
        await User.create({
            email: 'student@ims.com',
            passwordHash: studentHash,
            role: 'student',
            profile: { firstName: 'Test', lastName: 'Student' }
        });

        console.log('Seed completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
