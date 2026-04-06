import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
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
        const expenseHeadId = searchParams.get('expenseHead');

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

        if (expenseHeadId) {
            query.expenseHead = expenseHeadId;
        }

        const expenses = await Expense.find(query)
            .populate('expenseHead', 'name')
            .populate('paidByAccount', 'name accountType')
            .populate('entryBy', 'name')
            .sort({ date: -1 });

        const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

        const categoryWise = {};
        expenses.forEach(exp => {
            const headName = exp.expenseHead?.name || 'Unknown';
            if (!categoryWise[headName]) {
                categoryWise[headName] = 0;
            }
            categoryWise[headName] += exp.amount;
        });

        return NextResponse.json({
            expenses,
            summary: {
                totalAmount,
                totalCount: expenses.length,
                categoryWise
            }
        });
    } catch (error) {
        console.error("Failed to fetch expenses:", error);
        return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
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
        const { date, expenseHead, amount, description, paidTo, paymentMode, paidByAccount } = body;

        if (!date || !expenseHead || !amount) {
            return NextResponse.json({ error: "Date, expense head and amount are required" }, { status: 400 });
        }

        if (typeof amount !== 'number' || amount <= 0) {
            return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
        }

        await connectDB();
        const expense = await Expense.create({
            institute: instituteId,
            date: new Date(date),
            expenseHead,
            amount,
            description: description?.trim(),
            paidTo: paidTo?.trim(),
            paymentMode: paymentMode || 'Cash',
            paidByAccount: paidByAccount || null,
            entryBy: session.user.id
        });

        await expense.populate('expenseHead', 'name');
        await expense.populate('paidByAccount', 'name accountType');

        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'expense.create',
                resource: { type: 'Expense', id: expense._id },
                institute: instituteId,
                details: { amount: expense.amount, expenseHead: expense.expenseHead?.name }
            });
        } catch (auditError) {
            console.error('Audit log failed:', auditError);
        }

        return NextResponse.json({ expense });
    } catch (error) {
        console.error('Failed to create expense:', error);
        return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
    }
}