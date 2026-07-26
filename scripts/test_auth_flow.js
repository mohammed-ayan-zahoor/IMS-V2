import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import User from '../models/User.js';
import Institute from '../models/Institute.js';

const MONGODB_URI = process.env.MONGODB_URI;

async function testAuth() {
    await mongoose.connect(MONGODB_URI);
    
    // Set password hash for student@ims.com to 'Student@123' and 'student123'
    const salt = await bcrypt.genSalt(10);
    const hash1 = await bcrypt.hash('Student@123', salt);
    const hash2 = await bcrypt.hash('student123', salt);

    const user = await User.findOne({ email: 'student@ims.com' });
    if (user) {
        await User.findByIdAndUpdate(user._id, { passwordHash: hash1 });
        console.log("✅ Set password for student@ims.com to: Student@123");
    }

    const arman = await User.findOne({ email: 'arman.aqs@ims.com' });
    if (arman) {
        await User.findByIdAndUpdate(arman._id, { passwordHash: hash1 });
        console.log("✅ Set password for arman.aqs@ims.com to: Student@123");
    }

    const inst = await Institute.findOne({ status: 'active' });
    console.log("Institute Code:", inst?.code);

    process.exit(0);
}

testAuth().catch(err => {
    console.error(err);
    process.exit(1);
});
