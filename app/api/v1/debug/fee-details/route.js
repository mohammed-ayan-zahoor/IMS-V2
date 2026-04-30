import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Fee from "@/models/Fee";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        
        // Only allow admin access
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { searchParams } = new URL(req.url);
        const feeId = searchParams.get("feeId");

        if (!feeId) {
            return NextResponse.json({ error: "feeId is required" }, { status: 400 });
        }

        const fee = await Fee.findById(feeId)
            .populate('student', 'profile.firstName profile.lastName enrollmentNumber')
            .populate('batch', 'name');

        if (!fee) {
            return NextResponse.json({ error: "Fee not found" }, { status: 404 });
        }

        // Return detailed installment info
        const installmentDetails = fee.installments.map((inst, idx) => ({
            index: idx,
            amount: inst.amount,
            status: inst.status,
            paidDate: inst.paidDate,
            dueDate: inst.dueDate,
            paymentMethod: inst.paymentMethod,
            transactionId: inst.transactionId,
            _id: inst._id
        }));

        return NextResponse.json({
            feeId: fee._id,
            student: fee.student,
            batch: fee.batch,
            totalAmount: fee.totalAmount,
            paidAmount: fee.paidAmount,
            balanceAmount: fee.balanceAmount,
            status: fee.status,
            discount: fee.discount,
            extraCharges: fee.extraCharges,
            createdAt: fee.createdAt,
            installmentsCount: fee.installments.length,
            installments: installmentDetails,
            paidInstallmentsCount: fee.installments.filter(i => i.status === 'paid').length,
            totalPaidFromInstallments: fee.installments.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0)
        });

    } catch (error) {
        console.error("Debug Fee Error:", error);
        return NextResponse.json({ 
            error: "Internal server error",
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}
