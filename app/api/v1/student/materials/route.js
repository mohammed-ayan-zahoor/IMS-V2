import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Material from "@/models/Material";
import Batch from "@/models/Batch";
import Session from "@/models/Session";
import mongoose from "mongoose";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type"); // Optional filter by type
        const querySessionId = searchParams.get("sessionId");

        let activeSession = null;
        if (querySessionId && session.user.institute?.id) {
            try {
                activeSession = await Session.findOne({
                    _id: new mongoose.Types.ObjectId(querySessionId),
                    instituteId: new mongoose.Types.ObjectId(session.user.institute.id),
                    deletedAt: null
                }).select("_id").lean();
            } catch {
                activeSession = null;
            }
        }

        if (!activeSession && session.user.institute?.id) {
            activeSession = await Session.findOne({
                instituteId: new mongoose.Types.ObjectId(session.user.institute.id),
                isActive: true,
                deletedAt: null
            }).select("_id").lean();
            if (!activeSession) {
                activeSession = await Session.findOne({
                    instituteId: new mongoose.Types.ObjectId(session.user.institute.id),
                    deletedAt: null
                }).select("_id").sort({ startDate: -1 }).lean();
            }
        }

        const studentObjId = mongoose.Types.ObjectId.isValid(session.user.id)
            ? new mongoose.Types.ObjectId(session.user.id)
            : session.user.id;

        const batchQuery = {
            "enrolledStudents": {
                $elemMatch: {
                    student: studentObjId,
                    status: { $in: ["active", "completed"] }
                }
            },
            deletedAt: null
        };
        if (activeSession) {
            batchQuery.session = activeSession._id;
        }

        // 1. Find Student's Batches & Courses
        const studentBatches = await Batch.find(batchQuery).select("course courseBundle _id").lean();

        const enrolledCourseIds = studentBatches.map(b => b.course).filter(Boolean);
        const enrolledBundleIds = studentBatches.map(b => b.courseBundle).filter(Boolean);
        const enrolledBatchIds = studentBatches.map(b => b._id.toString());
        const enrolledBatchObjIds = studentBatches.map(b => new mongoose.Types.ObjectId(b._id));
        const allBatchIdentifiers = [...enrolledBatchIds, ...enrolledBatchObjIds];

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
            $or: [
                { course: { $in: enrolledCourseIds } },
                { courses: { $in: enrolledCourseIds } },
                { courseBundle: { $in: enrolledBundleIds } },
                { courseBundles: { $in: enrolledBundleIds } },
                { batches: { $in: allBatchIdentifiers } }
            ],
            $and: [
                {
                    $or: [
                        { batches: { $in: allBatchIdentifiers } }, // Explicitly assigned to my batch
                        { batches: { $size: 0 } }, // Assigned to no specific batch (all batches in course)
                        { batches: { $exists: false } } // Safety check
                    ]
                }
            ]
        };

        const courseId = searchParams.get("courseId");
        const batchId = searchParams.get("batchId");

        if (courseId) {
            // Verify student is enrolled in this course or bundle
            const allEnrolledIds = [
                ...enrolledCourseIds.map(id => id.toString()),
                ...enrolledBundleIds.map(id => id.toString())
            ];
            if (!allEnrolledIds.includes(courseId)) {
                return NextResponse.json({ materials: [], pagination: { page, limit, totalCount: 0, totalPages: 0 } });
            }
            const courseObjId = mongoose.Types.ObjectId.isValid(courseId) ? new mongoose.Types.ObjectId(courseId) : courseId;
            query.$or = [
                { course: courseObjId },
                { courses: courseObjId },
                { courseBundle: courseObjId },
                { courseBundles: courseObjId }
            ];
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
                .populate("courseBundle", "title")
                .populate("courseBundles", "title")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
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
