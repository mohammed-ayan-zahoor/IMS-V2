import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Material from "@/models/Material";
import Batch from "@/models/Batch";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get("courseId");
        const batchId = searchParams.get("batchId");
        const search = searchParams.get("search");

        const query = { deletedAt: null };

        // Check permissions
        if (session.user.role === 'student') {
            query.visibleToStudents = true;

            // Verify student enrollment if courseId is provided
            if (courseId) {
                const enrollment = await Batch.findOne({
                    course: courseId,
                    "enrolledStudents": {
                        $elemMatch: {
                            student: session.user.id,
                            status: "active"
                        }
                    }
                });

                if (!enrollment) {
                    return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 });
                }
            } else {
                // If checking globally, only show materials from their active batches
                const myBatches = await Batch.find({
                    "enrolledStudents": {
                        $elemMatch: {
                            student: session.user.id,
                            status: "active"
                        }
                    }
                }).select('_id');
                const batchIds = myBatches.map(b => b._id);
                // Matched materials must be linked to one of my batches
                // Note: Materials have `batches` array.
                query.batches = { $in: batchIds };
            }
        }

        if (courseId) query.course = courseId;
        if (batchId) query.batches = batchId;
        if (search) {
            query.$text = { $search: search };
        }

        const materials = await Material.find(query)
            .populate('course', 'name')
            .populate('batches', 'name')
            .populate('uploadedBy', 'profile.firstName profile.lastName')
            .sort({ createdAt: -1 });

        return NextResponse.json({ materials });

    } catch (error) {
        console.error("Fetch Materials Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();

        // Validate basic fields
        if (!body.title || !body.file?.url || !body.course) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Prevent mass assignment by picking allowed fields
        const safeBody = {
            title: body.title,
            description: body.description,
            type: body.type, // 'video', 'document', 'link'
            category: body.category,
            file: {
                url: body.file.url,
                fileId: body.file.fileId,
                type: body.file.type,
                size: body.file.size
            },
            course: body.course,
            batches: body.batches, // Array of IDs
            visibleToStudents: !!body.visibleToStudents,
            tags: Array.isArray(body.tags) ? body.tags : []
        };

        const material = await Material.create({
            ...safeBody,
            uploadedBy: session.user.id
        });

        return NextResponse.json({ success: true, material }, { status: 201 });

    } catch (error) {
        console.error("Create Material Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
