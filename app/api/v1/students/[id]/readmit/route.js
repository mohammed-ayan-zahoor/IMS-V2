import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getInstituteScope } from "@/middleware/instituteScope";
import { readmitStudent } from "@/services/certificateService";

export async function POST(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !["admin", "super_admin"].includes(session.user.role)) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const { id: studentId } = resolvedParams;
        const { targetSessionId, targetBatchId, reason } = await req.json();

        if (!targetBatchId) {
            return Response.json({ error: "Target section / class batch is required for readmission" }, { status: 400 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return Response.json({ error: "Institute scope not verified" }, { status: 401 });
        }

        const student = await readmitStudent(
            studentId,
            scope.instituteId,
            { targetSessionId, targetBatchId, reason: reason?.trim() || "Student Readmission" },
            session.user.id
        );

        return Response.json({
            message: "Student successfully readmitted to active class roll",
            student
        });
    } catch (error) {
        console.error("Readmission API Error:", error);
        return Response.json({ error: error.message || "Failed to readmit student" }, { status: 400 });
    }
}
