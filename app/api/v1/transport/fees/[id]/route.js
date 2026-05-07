import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import TransportFee from "@/models/TransportFee";
import { createAuditLog } from "@/services/auditService";

export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const fee = await TransportFee.findOne({
            _id: id,
            institute: scope.instituteId,
            deletedAt: null
        })
        .populate('student', 'profile.firstName profile.lastName enrollmentNumber')
        .populate('route', 'name stops')
        .populate('vehicle', 'registrationNumber type')
        .populate('preset', 'name billingCycle amount');

        if (!fee) return NextResponse.json({ error: "Transport fee not found" }, { status: 404 });

        return NextResponse.json({ fee });
    } catch (error) {
        console.error("GET /api/v1/transport/fees/[id] error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

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

        const fee = await TransportFee.findOne({
            _id: id,
            institute: scope.instituteId,
            deletedAt: null
        });

        if (!fee) return NextResponse.json({ error: "Transport fee not found" }, { status: 404 });

        // Allow updating route, vehicle, status
        if (body.route !== undefined) fee.route = body.route;
        if (body.vehicle !== undefined) fee.vehicle = body.vehicle;
        if (body.status) fee.status = body.status;

        await fee.save(); // Triggers pre-save hook for balance calculation

        await createAuditLog({
            actor: session.user.id,
            action: 'transport.fee.update',
            resource: { type: 'TransportFee', id: fee._id },
            institute: scope.instituteId,
            details: { changes: Object.keys(body) }
        });

        return NextResponse.json(fee);
    } catch (error) {
        console.error("PATCH /api/v1/transport/fees/[id] error:", error);
        return NextResponse.json({ error: "Failed to update transport fee" }, { status: 500 });
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
        const { TransportService } = await import("@/services/transportService");

        console.log("Attempting to delete transport fee:", { id, instituteId: scope.instituteId });

        // Find by ID ONLY for deep diagnostics
        const fee = await TransportFee.findById(id);

        if (!fee) {
            console.log("Transport fee TOTALLY MISSING from DB for ID:", id);
            return NextResponse.json({ 
                error: `Transport fee record does not exist in database (ID: ${id})` 
            }, { status: 404 });
        }

        if (fee.deletedAt) {
            console.log("Transport fee ALREADY deleted in DB:", { id, deletedAt: fee.deletedAt });
            return NextResponse.json({ 
                error: `This transport fee was already deleted at ${fee.deletedAt.toLocaleString()}.` 
            }, { status: 410 }); // Gone
        }

        // Now check institute
        if (fee.institute.toString() !== scope.instituteId.toString()) {
            console.log("Institute mismatch for transport fee:", { 
                feeInst: fee.institute, 
                scopeInst: scope.instituteId 
            });
            return NextResponse.json({ 
                error: `Institute mismatch. Record belongs to ${fee.institute} but you are logged into ${scope.instituteId}.` 
            }, { status: 403 });
        }

        // Soft delete the fee record
        fee.deletedAt = new Date();
        fee.deletedBy = session.user.id;
        fee.status = 'cancelled';
        await fee.save();

        // RESET student transport status
        await User.findByIdAndUpdate(fee.student, {
            $set: { 'transport.isAvailing': false }
        });

        // SYNC vehicle occupancy
        if (fee.vehicle) {
            await TransportService.updateVehicleOccupancy(fee.vehicle);
        }

        await createAuditLog({
            actor: session.user.id,
            action: 'transport.fee.delete',
            resource: { type: 'TransportFee', id: fee._id },
            institute: scope.instituteId,
            details: { student: fee.student }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/v1/transport/fees/[id] error:", error);
        return NextResponse.json({ error: "Failed to delete transport fee" }, { status: 500 });
    }
}
