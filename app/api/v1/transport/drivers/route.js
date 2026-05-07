import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import Driver from "@/models/Driver";
import { createAuditLog } from "@/services/auditService";

export async function GET(req) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const drivers = await Driver.find({
            institute: scope.instituteId,
            deletedAt: null
        })
        .populate('assignedVehicle', 'registrationNumber type route')
        .sort({ name: 1 })
        .lean();

        return NextResponse.json({ drivers });
    } catch (error) {
        console.error("GET /api/v1/transport/drivers error:", error);
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
            return NextResponse.json({ error: "Driver name is required" }, { status: 400 });
        }
        if (!body.phone?.trim()) {
            return NextResponse.json({ error: "Driver phone is required" }, { status: 400 });
        }

        const driver = await Driver.create({
            ...body,
            institute: scope.instituteId,
            createdBy: session.user.id
        });

        await createAuditLog({
            actor: session.user.id,
            action: 'transport.driver.create',
            resource: { type: 'Driver', id: driver._id },
            institute: scope.instituteId,
            details: { name: driver.name }
        });

        return NextResponse.json(driver, { status: 201 });
    } catch (error) {
        console.error("POST /api/v1/transport/drivers error:", error);
        return NextResponse.json({ error: "Failed to create driver" }, { status: 500 });
    }
}
