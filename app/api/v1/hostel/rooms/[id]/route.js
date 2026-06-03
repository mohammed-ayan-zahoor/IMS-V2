import { NextResponse } from "next/server";
import { getInstituteScope, validateInstituteAccess } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import HostelRoom from "@/models/HostelRoom";
import HostelBlock from "@/models/HostelBlock";
import { createAuditLog } from "@/services/auditService";

export async function PATCH(req, { params }) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId || !['admin', 'super_admin'].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;
        await connectDB();

        const room = await HostelRoom.findOne({ _id: id, deletedAt: null });
        if (!room) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
        }

        const hasAccess = await validateInstituteAccess(room, scope);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const body = await req.json();
        const { roomNumber, floor, type, capacity, monthlyRent, amenities } = body;

        const updateData = {};
        if (roomNumber !== undefined) {
            if (typeof roomNumber !== 'string' || roomNumber.trim().length === 0) {
                return NextResponse.json({ error: "Room number is required" }, { status: 400 });
            }
            updateData.roomNumber = roomNumber.trim();
        }
        if (floor !== undefined) {
            updateData.floor = parseInt(floor, 10);
        }
        if (type !== undefined) {
            updateData.type = ['single', 'double', 'triple', 'dormitory'].includes(type) ? type : 'double';
        }
        if (capacity !== undefined) {
            if (parseInt(capacity, 10) < 1) {
                return NextResponse.json({ error: "Capacity must be at least 1" }, { status: 400 });
            }
            updateData.capacity = parseInt(capacity, 10);
        }
        if (monthlyRent !== undefined) {
            if (parseFloat(monthlyRent) < 0) {
                return NextResponse.json({ error: "Rent cannot be negative" }, { status: 400 });
            }
            updateData.monthlyRent = parseFloat(monthlyRent);
        }
        if (amenities !== undefined) {
            updateData.amenities = Array.isArray(amenities) ? amenities : [];
        }

        const updatedRoom = await HostelRoom.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        ).populate('block', 'name');

        try {
            await createAuditLog({
                actor: scope.user.id,
                action: 'hostel.room.update',
                resource: { type: 'HostelRoom', id: updatedRoom._id },
                institute: scope.instituteId,
                details: { before: room.toObject(), after: updatedRoom.toObject() }
            });
        } catch (auditError) {
            console.error("Failed to write audit log:", auditError);
        }

        return NextResponse.json({ room: updatedRoom });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "A room with this number already exists in this block" }, { status: 400 });
        }
        console.error("PATCH /api/v1/hostel/rooms/[id] error:", error);
        return NextResponse.json({ error: "Failed to update hostel room" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId || !['admin', 'super_admin'].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;
        await connectDB();

        const room = await HostelRoom.findOne({ _id: id, deletedAt: null });
        if (!room) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
        }

        const hasAccess = await validateInstituteAccess(room, scope);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Soft delete room
        room.deletedAt = new Date();
        await room.save();

        // Decrement block totalRooms count
        await HostelBlock.findByIdAndUpdate(room.block, { $inc: { totalRooms: -1 } });

        try {
            await createAuditLog({
                actor: scope.user.id,
                action: 'hostel.room.delete',
                resource: { type: 'HostelRoom', id: room._id },
                institute: scope.instituteId,
                details: { roomNumber: room.roomNumber }
            });
        } catch (auditError) {
            console.error("Failed to write audit log:", auditError);
        }

        return NextResponse.json({ success: true, message: "Room deleted successfully" });
    } catch (error) {
        console.error("DELETE /api/v1/hostel/rooms/[id] error:", error);
        return NextResponse.json({ error: "Failed to delete hostel room" }, { status: 500 });
    }
}
