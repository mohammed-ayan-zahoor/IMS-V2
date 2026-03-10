const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { connectDB } = require('../lib/mongodb');
const User = require('../models/User').default || require('../models/User');
const Membership = require('../models/Membership').default || require('../models/Membership');

async function fixMemberships() {
    try {
        console.log(`Starting Migration: Missing Student Memberships...`);
        await connectDB();

        const students = await User.find({ role: 'student', deletedAt: null });
        let fixedCount = 0;
        let processedCount = 0;

        for (const student of students) {
            processedCount++;
            if (!student.institute) {
                continue;
            }

            const existing = await Membership.findOne({ user: student._id, institute: student.institute });
            if (!existing) {
                console.log(`[User ${student._id}] MIGRATING: Creating membership for institute ${student.institute}`);
                await Membership.create({
                    user: student._id,
                    institute: student.institute,
                    role: 'student',
                    isActive: true
                });
                fixedCount++;
            }
        }

        console.log(`Migration Complete. Processed ${processedCount} students, Created ${fixedCount} memberships.`);
        process.exit(0);
    } catch (error) {
        console.error("Migration Failed:", error);
        process.exit(1);
    }
}

fixMemberships();
