import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import Vehicle from "@/models/Vehicle";
import User from "@/models/User";
import { createAuditLog } from "@/services/auditService";

export async function GET(req) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const routeId = searchParams.get('routeId');

        await connectDB();
        const query = { institute: scope.instituteId, deletedAt: null };
        if (routeId) query.route = routeId;

        const vehicles = await Vehicle.find(query)
            .populate('route', 'name')
            .sort({ registrationNumber: 1 })
            .lean();

        // Compute current occupancy for each vehicle
        const vehicleIds = vehicles.map(v => v._id);
        const occupancyCounts = await User.aggregate([
            { $match: { 'transport.isAvailing': true, 'transport.vehicle': { $in: vehicleIds }, deletedAt: null } },
            { $group: { _id: '$transport.vehicle', count: { $sum: 1 } } }
        ]);
        const occupancyMap = {};
        occupancyCounts.forEach(o => { occupancyMap[o._id.toString()] = o.count; });

        const enriched = vehicles.map(v => ({
            ...v,
            currentOccupancy: occupancyMap[v._id.toString()] || 0
        }));

        return NextResponse.json({ vehicles: enriched });
    } catch (error) {
        console.error("GET /api/v1/transport/vehicles error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "Institute context required" }, { status: 400 });
        }

        await connectDB();
        const body = await req.json();

        if (!body.registrationNumber?.trim()) {
            return NextResponse.json({ error: "Registration number is required" }, { status: 400 });
        }
        if (!body.capacity || body.capacity < 1) {
            return NextResponse.json({ error: "Valid capacity is required" }, { status: 400 });
        }

        const vehicle = await Vehicle.create({
            ...body,
            institute: scope.instituteId,
            createdBy: session.user.id
        });

        await createAuditLog({
            actor: session.user.id,
            action: 'transport.vehicle.create',
            resource: { type: 'Vehicle', id: vehicle._id },
            institute: scope.instituteId,
            details: { registrationNumber: vehicle.registrationNumber, type: vehicle.type }
        });

        return NextResponse.json(vehicle, { status: 201 });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "A vehicle with this registration number already exists" }, { status: 409 });
        }
        console.error("POST /api/v1/transport/vehicles error:", error);
        return NextResponse.json({ error: "Failed to create vehicle" }, { status: 500 });
    }
}
