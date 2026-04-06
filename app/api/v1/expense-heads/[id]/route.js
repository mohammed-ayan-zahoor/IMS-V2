import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import ExpenseHead from "@/models/ExpenseHead";
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
            return NextResponse.json({ error: "Invalid expense head ID" }, { status: 400 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        await connectDB();
        const expenseHead = await ExpenseHead.findOne({
            _id: id,
            institute: instituteId
        });

        if (!expenseHead) {
            return NextResponse.json({ error: "Expense head not found" }, { status: 404 });
        }

        expenseHead.isActive = false;
        await expenseHead.save();

        await createAuditLog({
            actor: session.user.id,
            action: 'expense_head.delete',
            resource: { type: 'ExpenseHead', id: expenseHead._id },
            institute: instituteId,
            details: { name: expenseHead.name }
        });

        return NextResponse.json({ message: "Expense head removed" });
    } catch (error) {
        console.error("Error deleting expense head:", error);
        return NextResponse.json({ error: "Failed to delete expense head" }, { status: 500 });
    }
}