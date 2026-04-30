import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getInstituteScope } from "@/middleware/instituteScope";
import Session from "@/models/Session";
import Batch from "@/models/Batch";
import AuditLog from "@/models/AuditLog";

/**
 * DELETE /api/v1/sessions/:id
 * Soft delete a session (only if no active batches in this session)
 */
export async function DELETE(req, { params }) {
    try {
        const userSession = await getServerSession(authOptions);
        if (!userSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);

        // Only admin or super_admin can delete sessions
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

        // Check if this is the active session
        if (targetSession.isActive) {
            return NextResponse.json({ 
                error: "Cannot delete active session. Activate another session first." 
            }, { status: 400 });
        }

        // Check for batches in this session
        const batchCount = await Batch.countDocuments({
            session: id,
            deletedAt: null
        });

        if (batchCount > 0) {
            return NextResponse.json({ 
                error: `Cannot delete session with ${batchCount} active batch(es). Delete batches first or mark them as deleted.` 
            }, { status: 400 });
        }

        // Soft delete the session
        targetSession.deletedAt = new Date();
        await targetSession.save();

        // Audit log
        await AuditLog.create({
            actor: userSession.user.id,
            action: 'session.delete',
            resource: { type: 'Session', id: targetSession._id },
            institute: scope.instituteId,
            details: { sessionName: targetSession.sessionName }
        });

        return NextResponse.json({ 
            success: true, 
            message: `Session ${targetSession.sessionName} deleted successfully`,
            session: targetSession 
        });
    } catch (error) {
        console.error("DELETE /api/v1/sessions error:", error);
        return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
    }
}
