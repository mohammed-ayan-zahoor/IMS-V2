import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getStockAuth } from "@/lib/stock/auth";
import AssetUnit from "@/models/AssetUnit";
import Item from "@/models/Item";
import StockLocation from "@/models/StockLocation";
import { createAuditLog } from "@/services/auditService";

export async function GET(req) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { searchParams } = new URL(req.url);
        const item = searchParams.get('item');
        const location = searchParams.get('location');
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const limit = Math.min(200, parseInt(searchParams.get('limit') || '100', 10));

        await connectDB();
        const filter = { institute: auth.instituteId };
        if (item) filter.item = item;
        if (location) filter.location = location;
        if (status) filter.status = status;

        if (search) {
            filter.$or = [
                { assetTag: { $regex: search, $options: 'i' } },
                { serialNumber: { $regex: search, $options: 'i' } },
                { 'checkout.holderLabel': { $regex: search, $options: 'i' } }
            ];
        }

        const assets = await AssetUnit.find(filter)
            .populate('item', 'name code unit category')
            .populate('location', 'name code')
            .populate('vendor', 'name')
            .populate('checkout.holderUser', 'name email role')
            .populate('createdBy', 'name email')
            .sort({ assetTag: 1 })
            .limit(limit)
            .lean();

        return NextResponse.json({ assets });
    } catch (error) {
        console.error("Failed to fetch assets:", error);
        return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
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
            locationId,
            assetTag,
            serialNumber,
            purchaseDate,
            purchaseCost,
            vendorId,
            warrantyExpiry,
            notes,
            // Bulk generation options:
            isBulk,
            bulkPrefix,
            startNumber,
            count
        } = body;

        await connectDB();

        const item = await Item.findOne({ _id: itemId, institute: auth.instituteId, isActive: true });
        if (!item) {
            return NextResponse.json({ error: "Item not found or inactive" }, { status: 404 });
        }
        if (item.trackingType !== 'asset') {
            return NextResponse.json({
                error: "Assets can only be registered for items with trackingType: 'asset'"
            }, { status: 400 });
        }

        const location = await StockLocation.findOne({ _id: locationId, institute: auth.instituteId, isActive: true });
        if (!location) {
            return NextResponse.json({ error: "Stock location not found" }, { status: 404 });
        }

        // Single vs Bulk creation
        if (isBulk) {
            const qty = parseInt(count, 10);
            const start = parseInt(startNumber, 10) || 1;
            const prefix = (bulkPrefix || item.code + '-').trim().toUpperCase();

            if (!qty || qty <= 0 || qty > 100) {
                return NextResponse.json({ error: "Bulk count must be between 1 and 100" }, { status: 400 });
            }

            const docs = [];
            for (let i = 0; i < qty; i++) {
                const numStr = String(start + i).padStart(3, '0');
                const tag = `${prefix}${numStr}`;
                docs.push({
                    institute: auth.instituteId,
                    item: item._id,
                    assetTag: tag,
                    location: location._id,
                    status: 'available',
                    purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
                    purchaseCost: purchaseCost ? Number(purchaseCost) : undefined,
                    vendor: vendorId || undefined,
                    warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : undefined,
                    notes: notes?.trim() || undefined,
                    createdBy: auth.userId
                });
            }

            const created = await AssetUnit.insertMany(docs);
            return NextResponse.json({ assets: created, count: created.length }, { status: 201 });
        }

        // Single asset creation
        if (!assetTag || !assetTag.trim()) {
            return NextResponse.json({ error: "Asset Tag is required" }, { status: 400 });
        }

        const newAsset = await AssetUnit.create({
            institute: auth.instituteId,
            item: item._id,
            assetTag: assetTag.trim().toUpperCase(),
            serialNumber: serialNumber?.trim() || undefined,
            location: location._id,
            status: 'available',
            purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
            purchaseCost: purchaseCost ? Number(purchaseCost) : undefined,
            vendor: vendorId || undefined,
            warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : undefined,
            notes: notes?.trim() || undefined,
            createdBy: auth.userId
        });

        const populated = await AssetUnit.findById(newAsset._id)
            .populate('item', 'name code unit')
            .populate('location', 'name code')
            .populate('vendor', 'name')
            .lean();

        return NextResponse.json({ asset: populated }, { status: 201 });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "An asset with this Asset Tag already exists in this institute" }, { status: 400 });
        }
        console.error("Failed to register asset:", error);
        return NextResponse.json({ error: "Failed to register asset" }, { status: 500 });
    }
}
