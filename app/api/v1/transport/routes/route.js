import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import TransportRoute from "@/models/TransportRoute";
import { createAuditLog } from "@/services/auditService";

export async function GET(req) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const routes = await TransportRoute.find({
            institute: scope.instituteId,
            deletedAt: null
        }).sort({ name: 1 }).lean();

        return NextResponse.json({ routes });
    } catch (error) {
        console.error("GET /api/v1/transport/routes error:", error);
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

        if (!body.name?.trim()) {
            return NextResponse.json({ error: "Route name is required" }, { status: 400 });
        }

        // Sort stops by order
        if (body.stops?.length) {
            body.stops = body.stops.map((s, i) => ({ ...s, order: s.order ?? i }));
        }

        const route = await TransportRoute.create({
            ...body,
            institute: scope.instituteId,
            createdBy: session.user.id
        });

        await createAuditLog({
            actor: session.user.id,
            action: 'transport.route.create',
            resource: { type: 'TransportRoute', id: route._id },
            institute: scope.instituteId,
            details: { name: route.name, stopsCount: route.stops?.length || 0 }
        });

        return NextResponse.json(route, { status: 201 });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "A route with this name already exists" }, { status: 409 });
        }
        console.error("POST /api/v1/transport/routes error:", error);
        return NextResponse.json({ error: "Failed to create route" }, { status: 500 });
    }
}
