import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { FeeService } from "@/services/feeService";
import { getInstituteScope } from "@/middleware/instituteScope";
import User from "@/models/User";

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !["admin", "super_admin"].includes(session.user.role)) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const { id: studentId } = resolvedParams;

        await connectDB();
        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return Response.json({ error: "Institute scope not verified" }, { status: 401 });
        }

        const student = await User.findById(studentId).select("institute profile");
        if (!student) {
            return Response.json({ error: "Student not found" }, { status: 404 });
        }

        if (!scope.isSuperAdmin && student.institute.toString() !== scope.instituteId) {
            return Response.json({ error: "Access denied" }, { status: 403 });
        }

        const duesInfo = await FeeService.getStudentPendingDues(studentId, student.institute);

        return Response.json({ data: duesInfo });
    } catch (error) {
        console.error("Fee Dues Check Error:", error);
        return Response.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
