import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Material from "@/models/Material";
import Batch from "@/models/Batch";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type"); // Optional filter by type

        // 1. Find Student's Batches & Courses
        const studentBatches = await Batch.find({
            "enrolledStudents": {
                $elemMatch: {
                    student: session.user.id,
                    status: "active"
                }
            },
            deletedAt: null
        }).select("course _id");

        if (studentBatches.length === 0) {
            return NextResponse.json({ materials: [] });
        }

        const enrolledCourseIds = studentBatches.map(b => b.course);
        const enrolledBatchIds = studentBatches.map(b => b._id);

        // 2. Build Query
        const query = {
            deletedAt: null,
            visibleToStudents: true,
            course: { $in: enrolledCourseIds },
            $or: [
                { batches: { $in: enrolledBatchIds } }, // Explicitly assigned to my batch
                { batches: { $size: 0 } }, // Assigned to no specific batch (all batches in course)
                { batches: { $exists: false } } // Safety check
            ]
        };

        // Read pagination params
        let page = parseInt(searchParams.get("page")) || 1;
        let limit = parseInt(searchParams.get("limit")) || 20;
        if (limit > 100) limit = 100; // Cap limit
        if (page < 1) page = 1;
        const skip = (page - 1) * limit;

        if (type) {
            query['file.type'] = type;
        }

        const [materials, totalCount] = await Promise.all([
            Material.find(query)
                .populate("course", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Material.countDocuments(query)
        ]);

        return NextResponse.json({
            materials,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });

    } catch (error) {
        console.error("Student Materials Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
