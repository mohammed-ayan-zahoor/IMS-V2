import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Fee from "@/models/Fee";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Unauthorized. Super Admin only." }, { status: 401 });
        }

        await connectDB();

        // Use cursor for memory efficiency (Scaling Optimization)
        const feeCursor = Fee.find({ deletedAt: null }).cursor();
        const results = {
            totalProcessed: 0,
            fixed: 0,
            skipped: 0,
            errors: []
        };

        let fee = await feeCursor.next();
        while (fee) {
            results.totalProcessed++;
            try {
                const baseAmount = fee.totalAmount || 0;
                const discount = fee.discount?.amount || 0;
                const extraCharges = fee.extraCharges?.amount || 0;
                const expectedTotal = baseAmount - discount + extraCharges;
                
                const installmentsTotal = (fee.installments || []).reduce((sum, i) => sum + i.amount, 0);
                
                // If installments don't match the new total (after discount/extra), fix the last pending one
                if (Math.abs(installmentsTotal - expectedTotal) > 0.01) {
                    const diff = expectedTotal - installmentsTotal;
                    const pendingInstallments = (fee.installments || []).filter(i => i.status !== 'paid');
                    
                    if (pendingInstallments.length > 0) {
                        const lastPending = pendingInstallments[pendingInstallments.length - 1];
                        lastPending.amount += diff;
                        fee.markModified('installments');
                        await fee.save();
                        results.fixed++;
                    } else {
                        results.skipped++;
                    }
                } else {
                    // Even if installments match, re-save to ensure balanceAmount is correct in DB
                    // (The pre-save hook handles the balance calculation)
                    await fee.save();
                    results.skipped++;
                }
            } catch (err) {
                results.errors.push({ id: fee._id, error: err.message });
            }
            fee = await feeCursor.next();
        }

        return NextResponse.json(results);
    } catch (error) {
        console.error("Repair Fee Balances Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
