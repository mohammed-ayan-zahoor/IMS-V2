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

        const enrolledCourseIds = studentBatches.map(b => b.course);
        const enrolledBatchIds = studentBatches.map(b => b._id.toString()); // Ensure string comparison

        // Read pagination params
        let page = parseInt(searchParams.get("page")) || 1;
        let limit = parseInt(searchParams.get("limit")) || 20;
        if (limit > 100) limit = 100; // Cap limit
        if (limit < 1) limit = 1; // Ensure minimum limit
        if (page < 1) page = 1;
        const skip = (page - 1) * limit;

        if (studentBatches.length === 0) {
            return NextResponse.json({
                materials: [],
                pagination: { page, limit, totalCount: 0, totalPages: 0 }
            });
        }

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

        const courseId = searchParams.get("courseId");
        const batchId = searchParams.get("batchId");

        if (courseId) {
            // Verify student is enrolled in this course (by checking if it's in their enrolled batches' courses)
            // Note: enrolledCourseIds contains IDs of courses the student has at least one active batch in.
            if (!enrolledCourseIds.map(id => id.toString()).includes(courseId)) {
                return NextResponse.json({ materials: [], pagination: { page, limit, totalCount: 0, totalPages: 0 } });
            }
            query.course = courseId;
        }

        if (batchId) {
            // CRITICAL: Ensure student is enrolled in this specific batch
            if (!enrolledBatchIds.includes(batchId)) {
                return NextResponse.json({ error: "Not enrolled in this batch" }, { status: 403 });
            }
            // Narrow down query to this specific batch
            // The $or clause above already restricts to enrolled batches generally, 
            // but we need to override it to filter specifically for this batch.
            // However, we must still respect the 'visible to whole course' logic if the user intends to see batch-specific items ONLY.
            // Usually 'batchId' filter implies "show me things for this batch".
            // A material assigned to the whole course is ALSO relevant to this batch.
            // But strict filtering might mean "assigned explicitly to this batch".
            // Let's assume the user wants everything relevant to this batch (Explicit + Global).

            // Actually, the prompt described bypassing enrollment. 
            // "If batchId provided... verify batch belongs to course and student is enrolled... query.batches = batchId"
            // The prompt snippet suggests replacing the query.batches logic.

            // Let's adopt the prompt's suggested secure logic pattern but adapted to my variables:

            // Enforce that the requested batchId is one of the enrolled ones
            query.batches = { $in: [batchId], $eq: batchId };

            // Note: If we do `query.batches = batchId`, it might miss "Global" materials (batches: []).
            // If the goal is "Filter by context", we usually want everything relevant.
            // But the prompt implies strict equality for `query.batches`. 
            // I will match the prompt's intent to secure the `query.batches` field assignment.
            // BUT, if I set `query.batches = batchId`, I lose the `$or` condition that allows global materials.
            // If the UI sends batchId, it probably expects to see context-specific stuff.
            // I will strictly follow the prompt's security pattern which sets `query.batches`.
        }

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
