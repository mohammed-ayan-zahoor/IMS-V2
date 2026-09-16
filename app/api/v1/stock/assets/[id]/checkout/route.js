import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getStockAuth } from "@/lib/stock/auth";
import AssetUnit from "@/models/AssetUnit";
import User from "@/models/User";
import { createAuditLog } from "@/services/auditService";
import mongoose from "mongoose";

/**
 * POST: Check out or assign an asset to a user or room label.
 * DELETE: Return / Check in an asset back to available status.
 */

export async function POST(req, { params }) {
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
        const { holderUser, holderLabel, dueDate, notes, assignmentType = 'checked_out' } = body;

        // Mutual exclusivity check: holderUser vs holderLabel
        const hasUser = !!holderUser;
        const hasLabel = !!holderLabel && typeof holderLabel === 'string' && holderLabel.trim().length > 0;

        if (!hasUser && !hasLabel) {
            return NextResponse.json({ error: "Specify either a person (holderUser) or a room/department (holderLabel)" }, { status: 400 });
        }

        if (hasUser && hasLabel) {
            return NextResponse.json({ error: "Specify either a person or a room/department label, not both" }, { status: 400 });
        }

        await connectDB();
        const asset = await AssetUnit.findOne({ _id: id, institute: auth.instituteId })
            .populate('item', 'name code');

        if (!asset) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        if (['lost', 'disposed', 'in_repair'].includes(asset.status)) {
            return NextResponse.json({
                error: `Asset cannot be checked out because it is currently '${asset.status}'`
            }, { status: 400 });
        }

        if (hasUser) {
            const user = await User.findOne({ _id: holderUser, institute: auth.instituteId });
            if (!user) {
                return NextResponse.json({ error: "Holder user not found in this institute" }, { status: 404 });
            }
        }

        const newStatus = assignmentType === 'assigned' ? 'assigned' : 'checked_out';
        asset.status = newStatus;
        asset.checkout = {
            holderUser: hasUser ? holderUser : undefined,
            holderLabel: hasLabel ? holderLabel.trim() : undefined,
            checkedOutAt: new Date(),
            dueDate: dueDate ? new Date(dueDate) : undefined
        };
        if (notes?.trim()) {
            asset.notes = notes.trim();
        }

        await asset.save();

        try {
            await createAuditLog({
                actor: auth.userId,
                action: 'asset.checkout',
                resource: { type: 'AssetUnit', id: asset._id },
                institute: auth.instituteId,
                details: {
                    assetTag: asset.assetTag,
                    item: asset.item?.name,
                    status: newStatus,
                    holder: hasUser ? holderUser : holderLabel
                }
            });
        } catch (auditErr) {
            console.error("Asset checkout audit log failed:", auditErr);
        }

        const updated = await AssetUnit.findById(asset._id)
            .populate('item', 'name code unit category')
            .populate('location', 'name code')
            .populate('checkout.holderUser', 'name email role')
            .lean();

        return NextResponse.json({ asset: updated });
    } catch (error) {
        console.error("Failed to check out asset:", error);
        return NextResponse.json({ error: "Failed to check out asset" }, { status: 500 });
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
        const asset = await AssetUnit.findOne({ _id: id, institute: auth.instituteId })
            .populate('item', 'name code');

        if (!asset) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        const previousHolder = asset.checkout?.holderUser || asset.checkout?.holderLabel || 'Unknown';

        asset.status = 'available';
        asset.checkout = undefined;
        await asset.save();

        try {
            await createAuditLog({
                actor: auth.userId,
                action: 'asset.checkin',
                resource: { type: 'AssetUnit', id: asset._id },
                institute: auth.instituteId,
                details: {
                    assetTag: asset.assetTag,
                    item: asset.item?.name,
                    returnedFrom: previousHolder
                }
            });
        } catch (auditErr) {
            console.error("Asset checkin audit log failed:", auditErr);
        }

        const updated = await AssetUnit.findById(asset._id)
            .populate('item', 'name code unit category')
            .populate('location', 'name code')
            .lean();

        return NextResponse.json({
            message: "Asset successfully returned to store",
            asset: updated
        });
    } catch (error) {
        console.error("Failed to check in asset:", error);
        return NextResponse.json({ error: "Failed to check in asset" }, { status: 500 });
    }
}
