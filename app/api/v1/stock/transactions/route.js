import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getStockAuth } from "@/lib/stock/auth";
import StockTransaction from "@/models/StockTransaction";
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
        const location = searchParams.get('location');
        const type = searchParams.get('type');
        const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));

        await connectDB();
        const filter = { institute: auth.instituteId };
        if (item) filter.item = item;
        if (location) filter.location = location;
        if (type) filter.type = type;

        const transactions = await StockTransaction.find(filter)
            .populate('item', 'name code unit')
            .populate('location', 'name code')
            .populate('vendor', 'name')
            .populate('issuedToUser', 'name email')
            .populate('performedBy', 'name email')
            .sort({ transactionDate: -1, createdAt: -1 })
            .limit(limit)
            .lean();

        return NextResponse.json({ transactions });
    } catch (error) {
        console.error("Failed to fetch stock transactions:", error);
        return NextResponse.json({ error: "Failed to fetch stock transactions" }, { status: 500 });
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
            type,
            direction: reqDirection,
            quantity: rawQty,
            unitPrice,
            vendorId,
            referenceNo,
            issuedToUser,
            issuedToLabel,
            reason,
            notes,
            transactionDate
        } = body;

        const quantity = Number(rawQty);
        if (isNaN(quantity) || quantity <= 0) {
            return NextResponse.json({ error: "Valid positive quantity is required" }, { status: 400 });
        }

        if (!['PURCHASE_IN', 'ISSUE_OUT', 'ADJUSTMENT'].includes(type)) {
            return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
        }

        let direction;
        if (type === 'PURCHASE_IN') direction = 'IN';
        else if (type === 'ISSUE_OUT') direction = 'OUT';
        else {
            if (!['IN', 'OUT'].includes(reqDirection)) {
                return NextResponse.json({ error: "Direction ('IN' or 'OUT') is required for adjustments" }, { status: 400 });
            }
            direction = reqDirection;
            if (!reason || !reason.trim()) {
                return NextResponse.json({ error: "Reason is required for inventory adjustments" }, { status: 400 });
            }
        }

        // Mutual exclusivity: issuedToUser vs issuedToLabel
        if (issuedToUser && issuedToLabel && issuedToLabel.trim()) {
            return NextResponse.json({
                error: "Specify either a specific User or a department/room label for issue, not both."
            }, { status: 400 });
        }

        await connectDB();

        // Validate item
        const item = await Item.findOne({ _id: itemId, institute: auth.instituteId, isActive: true });
        if (!item) {
            return NextResponse.json({ error: "Consumable item not found" }, { status: 404 });
        }
        if (item.trackingType !== 'consumable') {
            return NextResponse.json({
                error: "Stock transactions only apply to consumable items. Use the Asset Register for serialized equipment."
            }, { status: 400 });
        }

        // Validate location
        const location = await StockLocation.findOne({ _id: locationId, institute: auth.instituteId, isActive: true });
        if (!location) {
            return NextResponse.json({ error: "Stock location not found" }, { status: 404 });
        }

        // Guard against negative inventory for OUT transactions
        if (direction === 'OUT') {
            const stockLevel = await getStockOnHand({
                instituteId: auth.instituteId,
                itemId: item._id,
                locationId: location._id
            });
            if (stockLevel.totalStock < quantity) {
                return NextResponse.json({
                    error: `Insufficient stock at ${location.name}. Available: ${stockLevel.totalStock} ${item.unit || 'pcs'}, Requested: ${quantity} ${item.unit || 'pcs'}`
                }, { status: 400 });
            }
        }

        const transaction = await StockTransaction.create({
            institute: auth.instituteId,
            item: item._id,
            location: location._id,
            type,
            direction,
            quantity,
            unitPrice: unitPrice ? Number(unitPrice) : undefined,
            vendor: vendorId || undefined,
            referenceNo: referenceNo?.trim() || undefined,
            issuedToUser: issuedToUser || undefined,
            issuedToLabel: issuedToLabel?.trim() || undefined,
            reason: reason?.trim() || undefined,
            notes: notes?.trim() || undefined,
            transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
            performedBy: auth.userId
        });

        try {
            await createAuditLog({
                actor: auth.userId,
                action: `stock_transaction.${type.toLowerCase()}`,
                resource: { type: 'StockTransaction', id: transaction._id },
                institute: auth.instituteId,
                details: { item: item.name, quantity, direction, location: location.name }
            });
        } catch (auditErr) {
            console.error("Stock transaction audit log failed:", auditErr);
        }

        const populated = await StockTransaction.findById(transaction._id)
            .populate('item', 'name code unit')
            .populate('location', 'name code')
            .populate('vendor', 'name')
            .populate('issuedToUser', 'name email')
            .populate('performedBy', 'name email')
            .lean();

        return NextResponse.json({ transaction: populated }, { status: 201 });
    } catch (error) {
        console.error("Failed to record stock transaction:", error);
        return NextResponse.json({ error: "Failed to record stock transaction" }, { status: 500 });
    }
}
