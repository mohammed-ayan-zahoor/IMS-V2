import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getStockAuth } from "@/lib/stock/auth";
import AssetUnit from "@/models/AssetUnit";
import StockLocation from "@/models/StockLocation";
import mongoose from "mongoose";

export async function GET(req, { params }) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { id } = await params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid asset ID" }, { status: 400 });
        }

        await connectDB();
        const asset = await AssetUnit.findOne({ _id: id, institute: auth.instituteId })
            .populate('item', 'name code unit category')
            .populate('location', 'name code')
            .populate('vendor', 'name phone')
            .populate('checkout.holderUser', 'name email role')
            .populate('createdBy', 'name email')
            .lean();

        if (!asset) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        return NextResponse.json({ asset });
    } catch (error) {
        console.error("Failed to fetch asset:", error);
        return NextResponse.json({ error: "Failed to fetch asset" }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { id } = await params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid asset ID" }, { status: 400 });
        }

        const body = await req.json();
        await connectDB();

        const asset = await AssetUnit.findOne({ _id: id, institute: auth.instituteId });
        if (!asset) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        if (body.locationId) {
            const loc = await StockLocation.findOne({ _id: body.locationId, institute: auth.instituteId, isActive: true });
            if (!loc) return NextResponse.json({ error: "Location not found" }, { status: 404 });
            asset.location = loc._id;
        }

        if (body.status && ['available', 'assigned', 'checked_out', 'in_repair', 'lost', 'disposed'].includes(body.status)) {
            asset.status = body.status;
            // If marked disposed or lost, clear active checkout
            if (['lost', 'disposed'].includes(body.status)) {
                asset.checkout = undefined;
            }
        }

        if (body.serialNumber !== undefined) asset.serialNumber = body.serialNumber?.trim();
        if (body.notes !== undefined) asset.notes = body.notes?.trim();
        if (body.purchaseCost !== undefined) asset.purchaseCost = Number(body.purchaseCost) || 0;
        if (body.warrantyExpiry !== undefined) asset.warrantyExpiry = body.warrantyExpiry ? new Date(body.warrantyExpiry) : undefined;

        await asset.save();

        const updated = await AssetUnit.findById(asset._id)
            .populate('item', 'name code unit category')
            .populate('location', 'name code')
            .populate('vendor', 'name phone')
            .populate('checkout.holderUser', 'name email role')
            .lean();

        return NextResponse.json({ asset: updated });
    } catch (error) {
        console.error("Failed to update asset:", error);
        return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
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
            return NextResponse.json({ error: "Invalid asset ID" }, { status: 400 });
        }

        await connectDB();
        const asset = await AssetUnit.findOne({ _id: id, institute: auth.instituteId });
        if (!asset) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        // Marking status as disposed preserves assetTag uniqueness and history
        asset.status = 'disposed';
        asset.checkout = undefined;
        await asset.save();

        return NextResponse.json({ message: "Asset marked as disposed" });
    } catch (error) {
        console.error("Failed to dispose asset:", error);
        return NextResponse.json({ error: "Failed to dispose asset" }, { status: 500 });
    }
}
