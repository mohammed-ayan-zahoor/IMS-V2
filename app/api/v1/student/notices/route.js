import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Notice from "@/models/Notice";
import Batch from "@/models/Batch";

/**
 * @route   GET /api/v1/student/notices
 * @desc    Get notices relevant to the logged-in student
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
                    student: session.user.id,
                    status: "active"
                }
            },
            deletedAt: null
        }).select("course _id");

        const enrolledCourseIds = studentBatches.map(b => b.course);
        const enrolledBatchIds = studentBatches.map(b => b._id);

        // 2. Build Query
        const query = {
            institute: session.user.institute.id,
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

        const notices = await Notice.find(query)
            .sort({ isPinned: -1, priority: -1, createdAt: -1 })
            .limit(50);

        return NextResponse.json({ notices });

    } catch (error) {
        console.error("Student Notice API Error:", error);
        return NextResponse.json({ error: "Failed to fetch notices" }, { status: 500 });
    }
}
