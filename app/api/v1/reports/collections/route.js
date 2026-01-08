import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Fee from "@/models/Fee";
import "@/models/User";
import "@/models/Batch";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // Get pagination params from query string
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '100');
        const skip = (page - 1) * limit;

        // Find all fees for the institute
        const fees = await Fee.find({ institute: session.user.institute.id })
            .skip(skip)
            .limit(limit)
            .populate('student', 'fullName email enrollmentNumber profile')
            .populate('batch', 'name');
        // Extract and flatten paid installments
        const collections = [];
        fees.forEach(fee => {
            (fee.installments || []).forEach(inst => {
                if (inst.status === 'paid') {
                    collections.push({
                        _id: inst._id,
                        feeId: fee._id,
                        student: fee.student,
                        batch: fee.batch,
                        amount: inst.amount,
                        paidDate: inst.paidDate,
                        method: inst.paymentMethod,
                        collectedBy: inst.collectedBy || "System/Unknown",
                        notes: inst.notes
                    });
                }
            });
        });

        // Sort by date descending
        collections.sort((a, b) => {
            const dateA = a.paidDate ? new Date(a.paidDate) : new Date(0);
            const dateB = b.paidDate ? new Date(b.paidDate) : new Date(0);
            return dateB - dateA;
        });
        return NextResponse.json({ collections });
    } catch (error) {
        console.error("Collections report error:", error);
        return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 });
    }
}
