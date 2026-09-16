import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getStockAuth } from "@/lib/stock/auth";
import Item from "@/models/Item";
import { createAuditLog } from "@/services/auditService";

export async function GET(req) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');
        const trackingType = searchParams.get('trackingType');
        const search = searchParams.get('search');
        const includeInactive = searchParams.get('includeInactive') === 'true';

        await connectDB();

        const filter = { institute: auth.instituteId };
        if (!includeInactive) filter.isActive = true;
        if (category) filter.category = category;
        if (trackingType && ['consumable', 'asset'].includes(trackingType)) {
            filter.trackingType = trackingType;
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } }
            ];
        }

        const items = await Item.find(filter)
            .populate('category', 'name')
            .populate('defaultLocation', 'name code')
            .populate('defaultVendor', 'name phone')
            .sort({ name: 1 })
            .lean();

        return NextResponse.json({ items });
    } catch (error) {
        console.error("Failed to fetch items:", error);
        return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const body = await req.json();
        const { name, code, category, trackingType, unit, reorderLevel, defaultLocation, defaultVendor } = body;

        if (!name || !name.trim()) {
            return NextResponse.json({ error: "Item name is required" }, { status: 400 });
        }
        if (!code || !code.trim()) {
            return NextResponse.json({ error: "Item code (SKU) is required" }, { status: 400 });
        }
        if (!category) {
            return NextResponse.json({ error: "Category is required" }, { status: 400 });
        }
        if (!['consumable', 'asset'].includes(trackingType)) {
            return NextResponse.json({ error: "Tracking type must be either 'consumable' or 'asset'" }, { status: 400 });
        }

        await connectDB();
        const item = await Item.create({
            institute: auth.instituteId,
            name: name.trim(),
            code: code.trim().toUpperCase(),
            category,
            trackingType,
            unit: unit?.trim() || 'pcs',
            reorderLevel: trackingType === 'consumable' ? (Number(reorderLevel) || 0) : 0,
            defaultLocation: defaultLocation || undefined,
            defaultVendor: defaultVendor || undefined,
            createdBy: auth.userId
        });

        try {
            await createAuditLog({
                actor: auth.userId,
                action: 'stock_item.create',
                resource: { type: 'Item', id: item._id },
                institute: auth.instituteId,
                details: { name: item.name, code: item.code, trackingType: item.trackingType }
            });
        } catch (auditErr) {
            console.error('Stock item audit log failed:', auditErr);
        }

        return NextResponse.json({ item }, { status: 201 });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "An item with this code (SKU) already exists in this institute" }, { status: 400 });
        }
        console.error("Failed to create item:", error);
        return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
    }
}
