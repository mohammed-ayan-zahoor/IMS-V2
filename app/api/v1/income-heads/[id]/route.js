import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import IncomeHead from "@/models/IncomeHead";
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
            return NextResponse.json({ error: "Invalid income head ID" }, { status: 400 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        await connectDB();
        const incomeHead = await IncomeHead.findOne({
            _id: id,
            institute: instituteId
        });

        if (!incomeHead) {
            return NextResponse.json({ error: "Income head not found" }, { status: 404 });
        }

        incomeHead.isActive = false;
        await incomeHead.save();

        await createAuditLog({
            actor: session.user.id,
            action: 'income_head.delete',
            resource: { type: 'IncomeHead', id: incomeHead._id },
            institute: instituteId,
            details: { name: incomeHead.name }
        });

        return NextResponse.json({ message: "Income head removed" });
    } catch (error) {
        console.error("Error deleting income head:", error);
        return NextResponse.json({ error: "Failed to delete income head" }, { status: 500 });
    }
}
