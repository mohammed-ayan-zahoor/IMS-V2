import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import Driver from "@/models/Driver";
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
        const allowedFields = ['name', 'phone', 'altPhone', 'licenseNumber', 'licenseExpiry', 'address', 'photo', 'assignedVehicle', 'isActive'];
        const updateData = {};
        allowedFields.forEach(f => { if (body[f] !== undefined) updateData[f] = body[f]; });

        const driver = await Driver.findOneAndUpdate(
            { _id: id, institute: scope.instituteId, deletedAt: null },
            { $set: updateData },
            { new: true, runValidators: true }
        ).populate('assignedVehicle', 'registrationNumber type');

        if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

        await createAuditLog({
            actor: session.user.id,
            action: 'transport.driver.update',
            resource: { type: 'Driver', id: driver._id },
            institute: scope.instituteId,
            details: { changes: Object.keys(updateData) }
        });

        return NextResponse.json(driver);
    } catch (error) {
        console.error("PATCH /api/v1/transport/drivers/[id] error:", error);
        return NextResponse.json({ error: "Failed to update driver" }, { status: 500 });
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

        const driver = await Driver.findOneAndUpdate(
            { _id: id, institute: scope.instituteId, deletedAt: null },
            { deletedAt: new Date() },
            { new: true }
        );

        if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

        await createAuditLog({
            actor: session.user.id,
            action: 'transport.driver.delete',
            resource: { type: 'Driver', id: driver._id },
            institute: scope.instituteId,
            details: { name: driver.name }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/v1/transport/drivers/[id] error:", error);
        return NextResponse.json({ error: "Failed to delete driver" }, { status: 500 });
    }
}
