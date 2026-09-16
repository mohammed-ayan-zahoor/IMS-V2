import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getStockAuth } from "@/lib/stock/auth";
import StockLocation from "@/models/StockLocation";
import { createAuditLog } from "@/services/auditService";

export async function GET(req) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await connectDB();
        const locations = await StockLocation.find({
            institute: auth.instituteId,
            isActive: true
        })
            .populate('inCharge', 'name email')
            .sort({ name: 1 })
            .lean();

        return NextResponse.json({ locations });
    } catch (error) {
        console.error("Failed to fetch stock locations:", error);
        return NextResponse.json({ error: "Failed to fetch stock locations" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const body = await req.json();
        const { name, code, inCharge } = body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: "Location name is required" }, { status: 400 });
        }

        await connectDB();
        const locationData = {
            institute: auth.instituteId,
            name: name.trim(),
            createdBy: auth.userId
        };

        if (code && typeof code === 'string' && code.trim()) {
            locationData.code = code.trim().toUpperCase();
        }

        if (inCharge) {
            locationData.inCharge = inCharge;
        }

        const location = await StockLocation.create(locationData);

        try {
            await createAuditLog({
                actor: auth.userId,
                action: 'stock_location.create',
                resource: { type: 'StockLocation', id: location._id },
                institute: auth.instituteId,
                details: { name: location.name, code: location.code }
            });
        } catch (auditErr) {
            console.error('Stock location audit log failed:', auditErr);
        }

        return NextResponse.json({ location }, { status: 201 });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "A location with this name or code already exists" }, { status: 400 });
        }
        console.error("Failed to create stock location:", error);
        return NextResponse.json({ error: "Failed to create stock location" }, { status: 500 });
    }
}
