import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getStockAuth } from "@/lib/stock/auth";
import Item from "@/models/Item";
import mongoose from "mongoose";

export async function PATCH(req, { params }) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { id } = await params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
        }

        const body = await req.json();
        await connectDB();

        const item = await Item.findOne({
            _id: id,
            institute: auth.instituteId
        });

        if (!item) {
            return NextResponse.json({ error: "Item not found" }, { status: 404 });
        }

        // trackingType is immutable
        if (body.trackingType && body.trackingType !== item.trackingType) {
            return NextResponse.json({
                error: "trackingType is immutable. Deactivate this item and create a new one instead."
            }, { status: 400 });
        }

        if (body.name !== undefined) item.name = body.name.trim();
        if (body.code !== undefined) item.code = body.code.trim().toUpperCase();
        if (body.category !== undefined) item.category = body.category;
        if (body.unit !== undefined) item.unit = body.unit.trim();
        if (body.reorderLevel !== undefined && item.trackingType === 'consumable') {
            item.reorderLevel = Math.max(0, Number(body.reorderLevel) || 0);
        }
        if (body.defaultLocation !== undefined) item.defaultLocation = body.defaultLocation || undefined;
        if (body.defaultVendor !== undefined) item.defaultVendor = body.defaultVendor || undefined;
        if (typeof body.isActive === 'boolean') item.isActive = body.isActive;

        await item.save();

        const updated = await Item.findById(item._id)
            .populate('category', 'name')
            .populate('defaultLocation', 'name code')
            .populate('defaultVendor', 'name phone')
            .lean();

        return NextResponse.json({ item: updated });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "An item with this code (SKU) already exists" }, { status: 400 });
        }
        console.error("Failed to update item:", error);
        return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { id } = await params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
        }

        await connectDB();
        const item = await Item.findOne({
            _id: id,
            institute: auth.instituteId
        });

        if (!item) {
            return NextResponse.json({ error: "Item not found" }, { status: 404 });
        }

        item.isActive = false;
        await item.save();

        return NextResponse.json({ message: "Item deactivated successfully" });
    } catch (error) {
        console.error("Failed to delete item:", error);
        return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }
}
