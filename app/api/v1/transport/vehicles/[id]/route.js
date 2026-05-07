import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import Vehicle from "@/models/Vehicle";
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
        const allowedFields = ['registrationNumber', 'type', 'capacity', 'make', 'model', 'year', 'insuranceExpiry', 'fitnessExpiry', 'route', 'isActive'];
        const updateData = {};
        allowedFields.forEach(f => { if (body[f] !== undefined) updateData[f] = body[f]; });

        // If capacity is being reduced, check current occupancy
        if (updateData.capacity) {
            const User = (await import("@/models/User")).default;
            const currentOccupancy = await User.countDocuments({
                'transport.vehicle': id,
                'transport.isAvailing': true,
                deletedAt: null
            });
            if (updateData.capacity < currentOccupancy) {
                return NextResponse.json({ 
                    error: `Cannot reduce capacity below current occupancy (${currentOccupancy} students assigned)` 
                }, { status: 400 });
            }
        }

        const vehicle = await Vehicle.findOneAndUpdate(
            { _id: id, institute: scope.instituteId, deletedAt: null },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

        await createAuditLog({
            actor: session.user.id,
            action: 'transport.vehicle.update',
            resource: { type: 'Vehicle', id: vehicle._id },
            institute: scope.instituteId,
            details: { changes: Object.keys(updateData) }
        });

        return NextResponse.json(vehicle);
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "A vehicle with this registration number already exists" }, { status: 409 });
        }
        console.error("PATCH /api/v1/transport/vehicles/[id] error:", error);
        return NextResponse.json({ error: "Failed to update vehicle" }, { status: 500 });
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

        const User = (await import("@/models/User")).default;
        const studentCount = await User.countDocuments({
            'transport.vehicle': id,
            'transport.isAvailing': true,
            deletedAt: null
        });

        if (studentCount > 0) {
            return NextResponse.json({ 
                error: `Cannot delete vehicle. ${studentCount} student(s) are currently assigned to it.` 
            }, { status: 400 });
        }

        const vehicle = await Vehicle.findOneAndUpdate(
            { _id: id, institute: scope.instituteId, deletedAt: null },
            { deletedAt: new Date() },
            { new: true }
        );

        if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

        await createAuditLog({
            actor: session.user.id,
            action: 'transport.vehicle.delete',
            resource: { type: 'Vehicle', id: vehicle._id },
            institute: scope.instituteId,
            details: { registrationNumber: vehicle.registrationNumber }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/v1/transport/vehicles/[id] error:", error);
        return NextResponse.json({ error: "Failed to delete vehicle" }, { status: 500 });
    }
}
