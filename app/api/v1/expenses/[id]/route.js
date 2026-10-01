import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import { createAuditLog } from "@/services/auditService";
import mongoose from "mongoose";

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid expense ID" }, { status: 400 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        await connectDB();
        const expense = await Expense.findOne({
            _id: id,
            institute: instituteId
        }).populate('expenseHead', 'name');

        if (!expense) {
            return NextResponse.json({ error: "Expense not found" }, { status: 404 });
        }

        await Expense.deleteOne({ _id: id });

        await createAuditLog({
            actor: session.user.id,
            action: 'expense.delete',
            resource: { type: 'Expense', id: expense._id },
            institute: instituteId,
            details: { amount: expense.amount, expenseHead: expense.expenseHead?.name }
        });

        return NextResponse.json({ message: "Expense deleted" });
    } catch (error) {
        console.error("Error deleting expense:", error);
        return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
    }
}

export async function PUT(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid expense ID" }, { status: 400 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        const body = await req.json();
        const { date, expenseHead, amount, description, paidTo, paymentMode, paidByAccount, attachments } = body;

        await connectDB();
        const expense = await Expense.findOne({ _id: id, institute: instituteId });
        if (!expense) {
            return NextResponse.json({ error: "Expense record not found" }, { status: 404 });
        }

        if (date) expense.date = new Date(date);
        if (expenseHead) expense.expenseHead = expenseHead;
        if (typeof amount === 'number' && amount > 0) expense.amount = amount;
        if (description !== undefined) expense.description = description?.trim();
        if (paidTo !== undefined) expense.paidTo = paidTo?.trim();
        if (paymentMode) expense.paymentMode = paymentMode;
        if (paidByAccount !== undefined) expense.paidByAccount = paidByAccount || null;
        if (Array.isArray(attachments)) expense.attachments = attachments;

        await expense.save();
        await expense.populate('expenseHead', 'name');
        await expense.populate('paidByAccount', 'name accountType');

        return NextResponse.json({ success: true, expense });
    } catch (error) {
        console.error("Error updating expense:", error);
        return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
    }
}