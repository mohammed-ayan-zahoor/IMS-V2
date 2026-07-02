import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Income from "@/models/Income";
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
            return NextResponse.json({ error: "Invalid income ID" }, { status: 400 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        await connectDB();
        const income = await Income.findOne({
            _id: id,
            institute: instituteId
        }).populate('incomeHead', 'name');

        if (!income) {
            return NextResponse.json({ error: "Income not found" }, { status: 404 });
        }

        await Income.deleteOne({ _id: id });

        await createAuditLog({
            actor: session.user.id,
            action: 'income.delete',
            resource: { type: 'Income', id: income._id },
            institute: instituteId,
            details: { amount: income.amount, incomeHead: income.incomeHead?.name }
        });

        return NextResponse.json({ message: "Income deleted" });
    } catch (error) {
        console.error("Error deleting income:", error);
        return NextResponse.json({ error: "Failed to delete income" }, { status: 500 });
    }
}
