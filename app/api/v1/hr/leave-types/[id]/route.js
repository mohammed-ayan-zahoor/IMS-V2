import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import LeaveType from "@/models/LeaveType";
import User from "@/models/User";
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
            return NextResponse.json({ error: "Invalid leave type ID" }, { status: 400 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        await connectDB();

        // Check if assigned in User's leaveBalances
        const isAssigned = await User.exists({
            institute: instituteId,
            "hrDetails.leaveBalances.leaveType": id,
            deletedAt: null
        });

        if (isAssigned) {
            return NextResponse.json({ error: "Cannot delete leave type as it is currently assigned to staff members" }, { status: 400 });
        }

        const leaveType = await LeaveType.findOne({ _id: id, institute: instituteId });
        if (!leaveType) {
            return NextResponse.json({ error: "Leave type not found" }, { status: 404 });
        }

        leaveType.deletedAt = new Date();
        await leaveType.save();

        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'hr.leave.delete',
                resource: { type: 'LeaveType', id: leaveType._id },
                institute: instituteId,
                details: { name: leaveType.name, code: leaveType.code }
            });
        } catch (auditError) {
            console.error('Audit log failed:', auditError);
        }

        return NextResponse.json({ message: "Leave type removed successfully" });
    } catch (error) {
        console.error("Error deleting leave type:", error);
        return NextResponse.json({ error: "Failed to delete leave type" }, { status: 500 });
    }
}
