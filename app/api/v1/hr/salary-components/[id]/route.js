import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import SalaryComponent from "@/models/SalaryComponent";
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
            return NextResponse.json({ error: "Invalid component ID" }, { status: 400 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        await connectDB();

        // Check if assigned in User's hrDetails.earnings or hrDetails.deductions
        const isAssigned = await User.exists({
            institute: instituteId,
            $or: [
                { "hrDetails.earnings.component": id },
                { "hrDetails.deductions.component": id }
            ],
            deletedAt: null
        });

        if (isAssigned) {
            return NextResponse.json({ error: "Cannot delete salary component as it is currently assigned to staff members" }, { status: 400 });
        }

        const component = await SalaryComponent.findOne({ _id: id, institute: instituteId });
        if (!component) {
            return NextResponse.json({ error: "Component not found" }, { status: 404 });
        }

        component.deletedAt = new Date();
        await component.save();

        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'hr.component.delete',
                resource: { type: 'SalaryComponent', id: component._id },
                institute: instituteId,
                details: { name: component.name, type: component.type }
            });
        } catch (auditError) {
            console.error('Audit log failed:', auditError);
        }

        return NextResponse.json({ message: "Salary component removed successfully" });
    } catch (error) {
        console.error("Error deleting salary component:", error);
        return NextResponse.json({ error: "Failed to delete salary component" }, { status: 500 });
    }
}
