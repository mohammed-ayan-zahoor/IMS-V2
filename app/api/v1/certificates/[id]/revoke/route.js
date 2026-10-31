import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getInstituteScope } from "@/middleware/instituteScope";
import { revokeCertificate } from "@/services/certificateService";

export async function POST(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !["admin", "super_admin"].includes(session.user.role)) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const { id: certificateId } = resolvedParams;
        const { reason } = await req.json();

        if (!reason || !reason.trim()) {
            return Response.json({ error: "Revocation justification reason is required" }, { status: 400 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return Response.json({ error: "Institute scope not verified" }, { status: 401 });
        }

        const revoked = await revokeCertificate(
            certificateId,
            scope.instituteId,
            session.user.id,
            reason.trim()
        );

        return Response.json({
            message: "Certificate revoked successfully and student status reconciled",
            certificate: revoked
        });
    } catch (error) {
        console.error("Revoke Certificate API Error:", error);
        return Response.json({ error: error.message || "Failed to revoke certificate" }, { status: 400 });
    }
}
