const mongoose = require('mongoose');
const { connectDB } = require('@/lib/mongodb');
const Batch = require('@/models/Batch');

async function test() {
    await connectDB();
    const batches = await Batch.find({}).populate('enrolledStudents.student');
    console.log("Batches found:", batches.length);
    for (const b of batches) {
        console.log(`Batch: ${b.name} (${b._id})`);
        console.log(`- Enrolled Count (Array Length): ${b.enrolledStudents.length}`);
        console.log(`- Enrolled Students:`, JSON.stringify(b.enrolledStudents, null, 2));
        console.log(`- Virtual activeEnrollmentCount: ${b.activeEnrollmentCount}`);
        console.log(`- JSON Output activeEnrollmentCount: ${b.toJSON().activeEnrollmentCount}`);
    }
    process.exit(0);
}

test().catch(console.error);
