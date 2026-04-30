import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getInstituteScope } from "@/middleware/instituteScope";
import Session from "@/models/Session";
import AuditLog from "@/models/AuditLog";

/**
 * PATCH /api/v1/sessions/activate/:id
 * Activate a session (deactivate all others for this institute)
 */
export async function PATCH(req, { params }) {
    try {
        const userSession = await getServerSession(authOptions);
        if (!userSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);

        // Only admin or super_admin can activate sessions
        if (scope.user.role !== "admin" && scope.user.role !== "super_admin") {
            return NextResponse.json({ error: "Forbidden - admin only" }, { status: 403 });
        }

        if (!scope.instituteId) {
            return NextResponse.json({ error: "No institute context found" }, { status: 404 });
        }

        const { id } = await params;

        // Verify session exists and belongs to this institute
        const targetSession = await Session.findOne({
            _id: id,
            instituteId: scope.instituteId,
            deletedAt: null
        });

        if (!targetSession) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // Start transaction-like operation
        // 1. Deactivate all other sessions for this institute
        await Session.updateMany(
            {
                instituteId: scope.instituteId,
                _id: { $ne: id },
                deletedAt: null
            },
            { isActive: false }
        );

        // 2. Activate the target session
        targetSession.isActive = true;
        await targetSession.save();

        // Audit log
        await AuditLog.create({
            actor: userSession.user.id,
            action: 'session.activate',
            resource: { type: 'Session', id: targetSession._id },
            institute: scope.instituteId,
            details: { sessionName: targetSession.sessionName }
        });

        return NextResponse.json({ 
            success: true, 
            message: `Session ${targetSession.sessionName} activated`,
            session: targetSession 
        });
    } catch (error) {
        console.error("PATCH /api/v1/sessions/activate error:", error);
        return NextResponse.json({ error: "Failed to activate session" }, { status: 500 });
    }
}
