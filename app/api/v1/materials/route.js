import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Material from "@/models/Material";

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

        // Admin sees all, Student/Instructor sees filtered
        if (session.user.role === 'student') {
            query.visibleToStudents = true;
            // Student filtering logic (usually handled by a specific student route, but basic filtering here)
            if (!courseId) {
                // If no course specified, technically we should filter by student's enrollment
                // But typically the frontend calls this with context. 
                // We'll let the specific /api/v1/student/materials route handle strict enrollment filtering if needed.
                // For now, open read if they know the course ID.
            }
        }

        if (courseId) query.course = courseId;
        if (batchId) query.batches = batchId; // Matches if batchId is in the array
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
        return NextResponse.json({ error: error.message }, { status: 500 });
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

        const material = await Material.create({
            ...body,
            uploadedBy: session.user.id
        });

        return NextResponse.json({ success: true, material }, { status: 201 });

    } catch (error) {
        console.error("Create Material Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
