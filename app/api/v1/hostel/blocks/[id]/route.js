import { NextResponse } from "next/server";
import { getInstituteScope, validateInstituteAccess } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import HostelBlock from "@/models/HostelBlock";
import HostelRoom from "@/models/HostelRoom";
import { createAuditLog } from "@/services/auditService";

export async function PATCH(req, { params }) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId || !['admin', 'super_admin'].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await connectDB();

        const block = await HostelBlock.findOne({ _id: id, deletedAt: null });
        if (!block) {
            return NextResponse.json({ error: "Block not found" }, { status: 404 });
        }

        const hasAccess = await validateInstituteAccess(block, scope);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const body = await req.json();
        const { name, type, floors, warden, wardenPhone, amenities, isActive } = body;

        const updateData = {};
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length === 0) {
                return NextResponse.json({ error: "Block name is required" }, { status: 400 });
            }
            updateData.name = name.trim();
        }
        if (type !== undefined) {
            updateData.type = ['boys', 'girls', 'mixed'].includes(type) ? type : 'mixed';
        }
        if (floors !== undefined) {
            updateData.floors = parseInt(floors, 10);
        }
        if (warden !== undefined) {
            updateData.warden = warden || null;
        }
        if (wardenPhone !== undefined) {
            updateData.wardenPhone = wardenPhone || null;
        }
        if (amenities !== undefined) {
            updateData.amenities = Array.isArray(amenities) ? amenities : [];
        }
        if (isActive !== undefined) {
            updateData.isActive = !!isActive;
        }

        const updatedBlock = await HostelBlock.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        ).populate('warden', 'profile.firstName profile.lastName email');

        try {
            await createAuditLog({
                actor: scope.user.id,
                action: 'hostel.block.update',
                resource: { type: 'HostelBlock', id: updatedBlock._id },
                institute: scope.instituteId,
                details: { before: block.toObject(), after: updatedBlock.toObject() }
            });
        } catch (auditError) {
            console.error("Failed to write audit log:", auditError);
        }

        return NextResponse.json({ block: updatedBlock });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "A block with this name already exists" }, { status: 400 });
        }
        console.error("PATCH /api/v1/hostel/blocks/[id] error:", error);
        return NextResponse.json({ error: "Failed to update hostel block" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId || !['admin', 'super_admin'].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await connectDB();

        const block = await HostelBlock.findOne({ _id: id, deletedAt: null });
        if (!block) {
            return NextResponse.json({ error: "Block not found" }, { status: 404 });
        }

        const hasAccess = await validateInstituteAccess(block, scope);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Soft delete block
        block.deletedAt = new Date();
        await block.save();

        // Soft delete all rooms in this block
        await HostelRoom.updateMany(
            { block: id, deletedAt: null },
            { $set: { deletedAt: new Date() } }
        );

        try {
            await createAuditLog({
                actor: scope.user.id,
                action: 'hostel.block.delete',
                resource: { type: 'HostelBlock', id: block._id },
                institute: scope.instituteId,
                details: { name: block.name }
            });
        } catch (auditError) {
            console.error("Failed to write audit log:", auditError);
        }

        return NextResponse.json({ success: true, message: "Block deleted successfully" });
    } catch (error) {
        console.error("DELETE /api/v1/hostel/blocks/[id] error:", error);
        return NextResponse.json({ error: "Failed to delete hostel block" }, { status: 500 });
    }
}
