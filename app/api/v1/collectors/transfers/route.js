import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Collector from "@/models/Collector";
import CollectorTransfer from "@/models/CollectorTransfer";
import { createAuditLog } from "@/services/auditService";
import mongoose from "mongoose";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const instituteId = session.user.institute?.id;

        const transfers = await CollectorTransfer.find({ institute: instituteId })
            .populate('fromCollector', 'name accountType')
            .populate('toCollector', 'name accountType')
            .populate('recordedBy', 'profile.firstName profile.lastName')
            .sort({ transferDate: -1 });

        return NextResponse.json({ transfers });
    } catch (error) {
        console.error("Fetch transfers error:", error);
        return NextResponse.json({ error: "Failed to fetch transfer history" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { fromCollectorId, toCollectorId, amount, transferDate, referenceNumber, notes } = body;

        if (!fromCollectorId || !toCollectorId || !amount) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await connectDB();
        const instituteId = session.user.institute?.id;

        // 1. Fetch Collectors
        const [fromColl, toColl] = await Promise.all([
            Collector.findOne({ _id: fromCollectorId, institute: instituteId }),
            Collector.findOne({ _id: toCollectorId, institute: instituteId })
        ]);

        if (!fromColl || !toColl) {
            return NextResponse.json({ error: "One or both collectors not found" }, { status: 404 });
        }

        if (fromCollectorId === toCollectorId) {
            return NextResponse.json({ error: "Source and destination collectors must be different" }, { status: 400 });
        }

        const transferAmount = parseFloat(amount);
        if (isNaN(transferAmount) || transferAmount <= 0) {
            return NextResponse.json({ error: "Invalid transfer amount" }, { status: 400 });
        }

        // 2. Perform Transfer (Transaction-like but simple for now)
        // Check if fromCollector has enough balance
        if (fromColl.currentBalance < transferAmount) {
            // Optional: User might want to allow negative balance if they record transfer BEFORE collection?
            // But usually, it should be blocked.
            return NextResponse.json({ error: `Insufficient balance. ${fromColl.name} only has ₹${fromColl.currentBalance}` }, { status: 400 });
        }

        // 3. Create Transfer Record
        const transfer = await CollectorTransfer.create({
            institute: instituteId,
            fromCollector: fromCollectorId,
            toCollector: toCollectorId,
            amount: transferAmount,
            transferDate: transferDate ? new Date(transferDate) : new Date(),
            referenceNumber,
            notes,
            recordedBy: session.user.id
        });

        // 4. Update Balances
        fromColl.currentBalance -= transferAmount;
        toColl.currentBalance += transferAmount;

        await Promise.all([fromColl.save(), toColl.save()]);

        // 5. Audit Log
        await createAuditLog({
            actor: session.user.id,
            action: 'collector.transfer',
            resource: { type: 'CollectorTransfer', id: transfer._id },
            institute: instituteId,
            details: {
                from: fromColl.name,
                to: toColl.name,
                amount: transferAmount
            }
        });

        return NextResponse.json({ transfer });

    } catch (error) {
        console.error("Create transfer error:", error);
        return NextResponse.json({ error: "Failed to record transfer" }, { status: 500 });
    }
}
