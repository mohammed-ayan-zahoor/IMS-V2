import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import TransportRoute from "@/models/TransportRoute";
import { createAuditLog } from "@/services/auditService";

export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const route = await TransportRoute.findOne({
            _id: id,
            institute: scope.instituteId,
            deletedAt: null
        }).lean();

        if (!route) {
            return NextResponse.json({ error: "Route not found" }, { status: 404 });
        }

        return NextResponse.json({ route });
    } catch (error) {
        console.error("GET /api/v1/transport/routes/[id] error:", error);
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
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "Institute context required" }, { status: 400 });
        }

        await connectDB();
        const body = await req.json();
        const allowedFields = ['name', 'description', 'stops', 'distance', 'isActive'];
        const updateData = {};
        allowedFields.forEach(f => { if (body[f] !== undefined) updateData[f] = body[f]; });

        // Sort stops by order
        if (updateData.stops?.length) {
            updateData.stops = updateData.stops.map((s, i) => ({ ...s, order: s.order ?? i }));
        }

        const route = await TransportRoute.findOneAndUpdate(
            { _id: id, institute: scope.instituteId, deletedAt: null },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!route) {
            return NextResponse.json({ error: "Route not found" }, { status: 404 });
        }

        await createAuditLog({
            actor: session.user.id,
            action: 'transport.route.update',
            resource: { type: 'TransportRoute', id: route._id },
            institute: scope.instituteId,
            details: { changes: Object.keys(updateData) }
        });

        return NextResponse.json(route);
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "A route with this name already exists" }, { status: 409 });
        }
        console.error("PATCH /api/v1/transport/routes/[id] error:", error);
        return NextResponse.json({ error: "Failed to update route" }, { status: 500 });
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
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "Institute context required" }, { status: 400 });
        }

        await connectDB();

        // Check for students using this route
        const User = (await import("@/models/User")).default;
        const studentCount = await User.countDocuments({
            'transport.route': id,
            'transport.isAvailing': true,
            deletedAt: null
        });

        if (studentCount > 0) {
            return NextResponse.json({ 
                error: `Cannot delete route. ${studentCount} student(s) are currently assigned to it.` 
            }, { status: 400 });
        }

        const route = await TransportRoute.findOneAndUpdate(
            { _id: id, institute: scope.instituteId, deletedAt: null },
            { deletedAt: new Date() },
            { new: true }
        );

        if (!route) {
            return NextResponse.json({ error: "Route not found" }, { status: 404 });
        }

        await createAuditLog({
            actor: session.user.id,
            action: 'transport.route.delete',
            resource: { type: 'TransportRoute', id: route._id },
            institute: scope.instituteId,
            details: { name: route.name }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/v1/transport/routes/[id] error:", error);
        return NextResponse.json({ error: "Failed to delete route" }, { status: 500 });
    }
}
