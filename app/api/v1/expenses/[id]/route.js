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