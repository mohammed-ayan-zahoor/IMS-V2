import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getStockAuth } from "@/lib/stock/auth";
import StockTransfer from "@/models/StockTransfer";
import Item from "@/models/Item";
import StockLocation from "@/models/StockLocation";
import { getStockOnHand } from "@/lib/stock/computeStockLevel";
import { createAuditLog } from "@/services/auditService";

export async function GET(req) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { searchParams } = new URL(req.url);
        const item = searchParams.get('item');
        const fromLocation = searchParams.get('fromLocation');
        const toLocation = searchParams.get('toLocation');

        await connectDB();
        const filter = { institute: auth.instituteId };
        if (item) filter.item = item;
        if (fromLocation) filter.fromLocation = fromLocation;
        if (toLocation) filter.toLocation = toLocation;

        const transfers = await StockTransfer.find(filter)
            .populate('item', 'name code unit')
            .populate('fromLocation', 'name code')
            .populate('toLocation', 'name code')
            .populate('recordedBy', 'name email')
            .sort({ transferDate: -1, createdAt: -1 })
            .limit(100)
            .lean();

        return NextResponse.json({ transfers });
    } catch (error) {
        console.error("Failed to fetch stock transfers:", error);
        return NextResponse.json({ error: "Failed to fetch stock transfers" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const body = await req.json();
        const {
            itemId,
            fromLocationId,
            toLocationId,
            quantity: rawQty,
            transferDate,
            referenceNumber,
            notes
        } = body;

        const quantity = Number(rawQty);
        if (isNaN(quantity) || quantity <= 0) {
            return NextResponse.json({ error: "Valid positive quantity is required" }, { status: 400 });
        }

        if (!fromLocationId || !toLocationId) {
            return NextResponse.json({ error: "Source and destination locations are required" }, { status: 400 });
        }

        if (String(fromLocationId) === String(toLocationId)) {
            return NextResponse.json({ error: "Source and destination locations must be different" }, { status: 400 });
        }

        await connectDB();

        // Check item
        const item = await Item.findOne({ _id: itemId, institute: auth.instituteId, isActive: true });
        if (!item) {
            return NextResponse.json({ error: "Consumable item not found" }, { status: 404 });
        }
        if (item.trackingType !== 'consumable') {
            return NextResponse.json({ error: "Transfers only apply to consumable stock items" }, { status: 400 });
        }

        // Check locations
        const [fromLoc, toLoc] = await Promise.all([
            StockLocation.findOne({ _id: fromLocationId, institute: auth.instituteId, isActive: true }),
            StockLocation.findOne({ _id: toLocationId, institute: auth.instituteId, isActive: true })
        ]);

        if (!fromLoc || !toLoc) {
            return NextResponse.json({ error: "One or both locations not found or inactive" }, { status: 404 });
        }

        // Check sufficient stock at source location
        const stockLevel = await getStockOnHand({
            instituteId: auth.instituteId,
            itemId: item._id,
            locationId: fromLoc._id
        });

        if (stockLevel.totalStock < quantity) {
            return NextResponse.json({
                error: `Insufficient stock at ${fromLoc.name}. Available: ${stockLevel.totalStock} ${item.unit || 'pcs'}, Requested: ${quantity} ${item.unit || 'pcs'}`
            }, { status: 400 });
        }

        const transfer = await StockTransfer.create({
            institute: auth.instituteId,
            item: item._id,
            fromLocation: fromLoc._id,
            toLocation: toLoc._id,
            quantity,
            transferDate: transferDate ? new Date(transferDate) : new Date(),
            referenceNumber: referenceNumber?.trim() || undefined,
            notes: notes?.trim() || undefined,
            recordedBy: auth.userId
        });

        try {
            await createAuditLog({
                actor: auth.userId,
                action: 'stock_transfer.create',
                resource: { type: 'StockTransfer', id: transfer._id },
                institute: auth.instituteId,
                details: { item: item.name, quantity, from: fromLoc.name, to: toLoc.name }
            });
        } catch (auditErr) {
            console.error("Stock transfer audit log failed:", auditErr);
        }

        const populated = await StockTransfer.findById(transfer._id)
            .populate('item', 'name code unit')
            .populate('fromLocation', 'name code')
            .populate('toLocation', 'name code')
            .populate('recordedBy', 'name email')
            .lean();

        return NextResponse.json({ transfer: populated }, { status: 201 });
    } catch (error) {
        console.error("Failed to record stock transfer:", error);
        return NextResponse.json({ error: "Failed to record stock transfer" }, { status: 500 });
    }
}
