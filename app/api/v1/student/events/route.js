import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Batch from "@/models/Batch";
import mongoose from "mongoose";

/**
 * @route   GET /api/v1/student/events
 * @desc    Get calendar events relevant to the logged-in student
 */
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // 1. Get student's current batches and courses
        const studentBatches = await Batch.find({
            "enrolledStudents": {
                $elemMatch: {
                    student: new mongoose.Types.ObjectId(session.user.id),
                    status: "active"
                }
            },
            deletedAt: null
        }).select("course _id");

        const enrolledCourseIds = studentBatches.map(b => b.course);
        const enrolledBatchIds = studentBatches.map(b => b._id);

        // 2. Build Query
        const query = {
            institute: new mongoose.Types.ObjectId(session.user.institute.id),
            deletedAt: null,
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

        const events = await Event.find(query)
            .sort({ startDate: 1 });

        return NextResponse.json({ events });

    } catch (error) {
        console.error("Student Events API Error:", error);
        return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
    }
}
