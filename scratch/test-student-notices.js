const mongoose = require("mongoose");
const { connectDB } = require("../lib/mongodb");
const User = require("../models/User");
const Batch = require("../models/Batch");
const Notice = require("../models/Notice");

async function run() {
    await connectDB();
    console.log("Connected to MongoDB");

    // Find any student
    const student = await User.findOne({ role: "student", deletedAt: null }).lean();
    if (!student) {
        console.log("No student found!");
        mongoose.connection.close();
        return;
    }
    console.log("Found student:", student.profile.firstName, student.profile.lastName, "ID:", student._id.toString());
    console.log("Institute ID:", student.institute ? student.institute.toString() : "None");

    // 1. Get batches using session.user.id as string (nested elemMatch)
    const batchesWithString = await Batch.find({
        "enrolledStudents": {
            $elemMatch: {
                student: student._id.toString(),
                status: "active"
            }
        },
        deletedAt: null
    }).select("course _id").lean();
    console.log("Batches found with string ID query:", batchesWithString.length);

    // 2. Get batches using ObjectId
    const batchesWithObjectId = await Batch.find({
        "enrolledStudents": {
            $elemMatch: {
                student: student._id,
                status: "active"
            }
        },
        deletedAt: null
    }).select("course _id").lean();
    console.log("Batches found with ObjectId query:", batchesWithObjectId.length);

    // 3. Query notices using ObjectId query results
    const enrolledCourseIds = batchesWithObjectId.map(b => b.course);
    const enrolledBatchIds = batchesWithObjectId.map(b => b._id);

    const query = {
        institute: student.institute,
        isActive: true,
        $or: [
            { target: 'all' },
            { 
                target: 'batches', 
                targetIds: { $in: enrolledBatchIds } 
            },
            { 
                target: 'courses', 
                targetIds: { $in: enrolledCourseIds } 
            }
        ]
    };

    const count = await Notice.countDocuments(query);
    console.log("Total matched notices for this student:", count);

    const allNotices = await Notice.find({ institute: student.institute }).lean();
    console.log("Total notices in this institute overall:", allNotices.length);
    console.log("All notices targets:", allNotices.map(n => ({ title: n.title, target: n.target, targetIds: n.targetIds })));

    mongoose.connection.close();
}

run().catch(console.error);
