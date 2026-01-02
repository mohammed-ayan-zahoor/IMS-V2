import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { StudentService } from "@/services/studentService";
import { getInstituteScope } from "@/middleware/instituteScope";

export async function POST(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        // Ensure strictly institute specific
        if (!scope || !scope.instituteId) {
            return NextResponse.json({ error: "Unauthorized or missing context" }, { status: 401 });
        }

        const { id } = await params;
        const { batchId } = await req.json();

        if (!batchId) {
            return NextResponse.json({ error: "Batch ID is required" }, { status: 400 });
        }

        await connectDB();

        const result = await StudentService.enrollInBatch(id, batchId, session.user.id, scope.instituteId);

        return NextResponse.json({
            message: "Student enrolled successfully",
            data: result
        });

    } catch (error) {
        console.error("API Error [Enroll Student]:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
