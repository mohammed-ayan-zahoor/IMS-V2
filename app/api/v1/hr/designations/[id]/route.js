import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Designation from "@/models/Designation";
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
            return NextResponse.json({ error: "Invalid designation ID" }, { status: 400 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        await connectDB();

        // Check if assigned to any user
        const isAssigned = await User.exists({ 
            institute: instituteId, 
            "hrDetails.designation": id,
            deletedAt: null
        });

        if (isAssigned) {
            return NextResponse.json({ error: "Cannot delete designation as it is currently assigned to users" }, { status: 400 });
        }

        const designation = await Designation.findOne({ _id: id, institute: instituteId });
        if (!designation) {
            return NextResponse.json({ error: "Designation not found" }, { status: 404 });
        }

        designation.deletedAt = new Date();
        await designation.save();

        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'hr.designation.delete',
                resource: { type: 'Designation', id: designation._id },
                institute: instituteId,
                details: { name: designation.name }
            });
        } catch (auditError) {
            console.error('Audit log failed:', auditError);
        }

        return NextResponse.json({ message: "Designation removed successfully" });
    } catch (error) {
        console.error("Error deleting designation:", error);
        return NextResponse.json({ error: "Failed to delete designation" }, { status: 500 });
    }
}
