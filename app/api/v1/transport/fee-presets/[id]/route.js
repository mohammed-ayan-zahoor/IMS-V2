import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import TransportFeePreset from "@/models/TransportFeePreset";
import { createAuditLog } from "@/services/auditService";

export async function PATCH(req, { params }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) return NextResponse.json({ error: "Institute context required" }, { status: 400 });

        await connectDB();
        const body = await req.json();
        const allowedFields = ['name', 'route', 'billingCycle', 'amount', 'description', 'isActive'];
        const updateData = {};
        allowedFields.forEach(f => { if (body[f] !== undefined) updateData[f] = body[f]; });

        const preset = await TransportFeePreset.findOneAndUpdate(
            { _id: id, institute: scope.instituteId, deletedAt: null },
            { $set: updateData },
            { new: true, runValidators: true }
        ).populate('route', 'name');

        if (!preset) return NextResponse.json({ error: "Preset not found" }, { status: 404 });

        await createAuditLog({
            actor: session.user.id,
            action: 'transport.feePreset.update',
            resource: { type: 'TransportFeePreset', id: preset._id },
            institute: scope.instituteId,
            details: { changes: Object.keys(updateData) }
        });

        return NextResponse.json(preset);
    } catch (error) {
        console.error("PATCH /api/v1/transport/fee-presets/[id] error:", error);
        return NextResponse.json({ error: "Failed to update preset" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) return NextResponse.json({ error: "Institute context required" }, { status: 400 });

        await connectDB();
        const TransportFee = (await import("@/models/TransportFee")).default;
        const User = (await import("@/models/User")).default;
        const { TransportService } = await import("@/services/transportService");

        // 1. Check if ANY student is currently using this preset (paid or unpaid)
        const isAssignedToStudents = await TransportFee.exists({
            preset: id,
            deletedAt: null
        });

        if (isAssignedToStudents) {
            return NextResponse.json({ 
                error: "This preset cannot be deleted because it is still assigned to active students. Please unassign or move these students to a different plan before deleting this preset." 
            }, { status: 400 });
        }

        // 2. Delete the preset (only if no students are assigned)
        const preset = await TransportFeePreset.findOneAndUpdate(
            { _id: id, institute: scope.instituteId, deletedAt: null },
            { deletedAt: new Date() },
            { new: true }
        );

        if (!preset) return NextResponse.json({ error: "Preset not found" }, { status: 404 });

        await createAuditLog({
            actor: session.user.id,
            action: 'transport.feePreset.delete',
            resource: { type: 'TransportFeePreset', id: preset._id },
            institute: scope.instituteId,
            details: { name: preset.name }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/v1/transport/fee-presets/[id] error:", error);
        return NextResponse.json({ error: "Failed to delete preset" }, { status: 500 });
    }
}
