import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import User from '../models/User.js';
import Institute from '../models/Institute.js';
import Membership from '../models/Membership.js';

const MONGODB_URI = process.env.MONGODB_URI;

async function checkStudentCreds() {
    if (!MONGODB_URI) {
        console.error("No MONGODB_URI found");
        process.exit(1);
    }
    await mongoose.connect(MONGODB_URI);

    const institute = await Institute.findOne({ status: 'active' });
    console.log("Active Institute Code:", institute?.code || 'QUANTECH');

    const studentMemberships = await Membership.find({ role: 'student', isActive: true }).populate('user').limit(5);

    if (studentMemberships.length === 0) {
        console.log("No student memberships found");
    } else {
        console.log("Found Student Accounts:");
        for (const m of studentMemberships) {
            if (m.user) {
                console.log(`- Email: ${m.user.email}, Name: ${m.user.profile?.firstName || ''} ${m.user.profile?.lastName || ''}, Code: ${institute?.code}`);
            }
        }
    }

    // Set a known test password for the first student user
    if (studentMemberships.length > 0 && studentMemberships[0].user) {
        const studentUser = studentMemberships[0].user;
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('student123', salt);
        
        await User.findByIdAndUpdate(studentUser._id, { passwordHash: hash });
        console.log(`\nUpdated Test Student Password for ${studentUser.email} to: student123`);
    }

    process.exit(0);
}

checkStudentCreds().catch(err => {
    console.error(err);
    process.exit(1);
});
