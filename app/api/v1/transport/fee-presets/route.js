import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import TransportFeePreset from "@/models/TransportFeePreset";
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
        if (routeId) {
            // Show presets linked to this route OR generic (no route)
            query.$or = [{ route: routeId }, { route: null }, { route: { $exists: false } }];
        }

        const presets = await TransportFeePreset.find(query)
            .populate('route', 'name')
            .sort({ name: 1 })
            .lean();

        return NextResponse.json({ presets });
    } catch (error) {
        console.error("GET /api/v1/transport/fee-presets error:", error);
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
            return NextResponse.json({ error: "Preset name is required" }, { status: 400 });
        }
        if (!body.billingCycle) {
            return NextResponse.json({ error: "Billing cycle is required" }, { status: 400 });
        }
        if (!body.amount || body.amount < 0) {
            return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
        }

        const preset = await TransportFeePreset.create({
            ...body,
            institute: scope.instituteId,
            createdBy: session.user.id
        });

        await createAuditLog({
            actor: session.user.id,
            action: 'transport.feePreset.create',
            resource: { type: 'TransportFeePreset', id: preset._id },
            institute: scope.instituteId,
            details: { name: preset.name, amount: preset.amount, billingCycle: preset.billingCycle }
        });

        return NextResponse.json(preset, { status: 201 });
    } catch (error) {
        console.error("POST /api/v1/transport/fee-presets error:", error);
        return NextResponse.json({ error: "Failed to create preset" }, { status: 500 });
    }
}
