import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Income from "@/models/Income";
import { createAuditLog } from "@/services/auditService";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const fromDate = searchParams.get('fromDate');
        const toDate = searchParams.get('toDate');
        const incomeHeadId = searchParams.get('incomeHead');

        await connectDB();

        const query = { institute: instituteId };

        if (fromDate || toDate) {
            query.date = {};
            if (fromDate) query.date.$gte = new Date(fromDate);
            if (toDate) {
                const endDate = new Date(toDate);
                endDate.setHours(23, 59, 59, 999);
                query.date.$lte = endDate;
            }
        }

        if (incomeHeadId) {
            query.incomeHead = incomeHeadId;
        }

        const incomes = await Income.find(query)
            .populate('incomeHead', 'name')
            .populate('receivedInAccount', 'name accountType')
            .populate('entryBy', 'name')
            .sort({ date: -1 });

        const totalAmount = incomes.reduce((sum, inc) => sum + inc.amount, 0);

        const categoryWise = {};
        incomes.forEach(inc => {
            const headName = inc.incomeHead?.name || 'Unknown';
            if (!categoryWise[headName]) {
                categoryWise[headName] = 0;
            }
            categoryWise[headName] += inc.amount;
        });

        return NextResponse.json({
            incomes,
            summary: {
                totalAmount,
                totalCount: incomes.length,
                categoryWise
            }
        });
    } catch (error) {
        console.error("Failed to fetch incomes:", error);
        return NextResponse.json({ error: "Failed to fetch incomes" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        const body = await req.json();
        const { date, incomeHead, amount, description, receivedFrom, paymentMode, receivedInAccount } = body;

        if (!date || !incomeHead || !amount) {
            return NextResponse.json({ error: "Date, income category and amount are required" }, { status: 400 });
        }

        if (typeof amount !== 'number' || amount <= 0) {
            return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
        }

        await connectDB();
        const income = await Income.create({
            institute: instituteId,
            date: new Date(date),
            incomeHead,
            amount,
            description: description?.trim(),
            receivedFrom: receivedFrom?.trim(),
            paymentMode: paymentMode || 'Cash',
            receivedInAccount: receivedInAccount || null,
            entryBy: session.user.id
        });

        await income.populate('incomeHead', 'name');
        await income.populate('receivedInAccount', 'name accountType');

        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'income.create',
                resource: { type: 'Income', id: income._id },
                institute: instituteId,
                details: { amount: income.amount, incomeHead: income.incomeHead?.name }
            });
        } catch (auditError) {
            console.error('Audit log failed:', auditError);
        }

        return NextResponse.json({ income });
    } catch (error) {
        console.error('Failed to create income:', error);
        return NextResponse.json({ error: "Failed to create income" }, { status: 500 });
    }
}
