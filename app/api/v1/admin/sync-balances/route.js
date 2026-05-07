import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Collector from "@/models/Collector";
import Fee from "@/models/Fee";
import TransportFee from "@/models/TransportFee";
import CollectorTransfer from "@/models/CollectorTransfer";
import mongoose from "mongoose";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized. Admin required for sync." }, { status: 401 });
        }

        await connectDB();
        const instituteId = session.user.institute?.id;

        // 1. Fetch all collectors for this institute
        const collectors = await Collector.find({ institute: instituteId });
        const balanceMap = {}; // { collectorName: amount }
        
        collectors.forEach(c => {
            balanceMap[c.name] = 0;
        });

        // 2. Scan Academic Fees
        const academicFees = await Fee.find({ institute: instituteId, deletedAt: null });
        academicFees.forEach(fee => {
            fee.installments.forEach(inst => {
                if (inst.status === 'paid' && inst.collectedBy) {
                    if (balanceMap[inst.collectedBy] !== undefined) {
                        balanceMap[inst.collectedBy] += inst.amount;
                    }
                }
            });
        });

        // 3. Scan Transport Fees
        const transportFees = await TransportFee.find({ institute: instituteId, deletedAt: null });
        transportFees.forEach(fee => {
            fee.installments.forEach(inst => {
                if (inst.status === 'paid' && inst.collectedBy) {
                    if (balanceMap[inst.collectedBy] !== undefined) {
                        balanceMap[inst.collectedBy] += inst.amount;
                    }
                }
            });
        });

        // 4. Subtract/Add recorded transfers to ensure net balance is correct
        const transfers = await CollectorTransfer.find({ institute: instituteId });
        for (const t of transfers) {
            // Need to populate or find names for collectors in transfers
            const fromColl = collectors.find(c => c._id.toString() === t.fromCollector.toString());
            const toColl = collectors.find(c => c._id.toString() === t.toCollector.toString());

            if (fromColl) balanceMap[fromColl.name] -= t.amount;
            if (toColl) balanceMap[toColl.name] += t.amount;
        }

        // 5. Update DB
        const updates = [];
        for (const collector of collectors) {
            collector.currentBalance = balanceMap[collector.name] || 0;
            updates.push(collector.save());
        }

        await Promise.all(updates);

        return NextResponse.json({ 
            message: "Sync complete", 
            balances: balanceMap 
        });

    } catch (error) {
        console.error("Sync error:", error);
        return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
}
