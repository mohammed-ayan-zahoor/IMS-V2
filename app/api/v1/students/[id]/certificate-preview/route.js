import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getInstituteScope } from "@/middleware/instituteScope";
import { getHydratedContext } from "@/services/certificateService";
import CertificateTemplate from "@/models/CertificateTemplate";

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !["admin", "super_admin"].includes(session.user.role)) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const { id: studentId } = resolvedParams;
        const { searchParams } = new URL(req.url);
        const templateId = searchParams.get("templateId");
        const batchName = searchParams.get("batchName") || "N/A";
        
        // Metadata fields
        const leavingReason = searchParams.get("leavingReason");
        const conduct = searchParams.get("conduct");
        const progress = searchParams.get("progress");

        await connectDB();
        const scope = await getInstituteScope(req);
        
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return Response.json({ error: "Institute scope not verified" }, { status: 401 });
        }

        const student = await User.findById(studentId);
        if (!student) return Response.json({ error: "Student not found" }, { status: 404 });

        // Verify institute
        if (!scope.isSuperAdmin && student.institute.toString() !== scope.instituteId) {
            return Response.json({ error: "Access denied" }, { status: 403 });
        }

        const context = await getHydratedContext(studentId, student.institute, {
            batchName,
            metadata: {
                leavingReason,
                conduct,
                progress
            }
        });

        return Response.json({ data: context });
    } catch (error) {
        console.error("Certificate Preview Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
