import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Payslip from "@/models/Payslip";
import { createAuditLog } from "@/services/auditService";
import mongoose from "mongoose";

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid payslip ID" }, { status: 400 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        const body = await req.json();
        const { paymentStatus, paymentMode } = body;

        await connectDB();

        const payslip = await Payslip.findOne({ _id: id, institute: instituteId }).populate('staff', 'profile');
        if (!payslip) {
            return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
        }

        if (paymentStatus) {
            payslip.paymentStatus = paymentStatus;
            if (paymentStatus === 'paid') {
                payslip.paymentDate = new Date();
                payslip.paymentMode = paymentMode || 'Cash';
            } else {
                payslip.paymentDate = null;
                payslip.paymentMode = null;
            }
        }

        await payslip.save();

        return NextResponse.json({ payslip });
    } catch (error) {
        console.error("Error updating payslip:", error);
        return NextResponse.json({ error: "Failed to update payslip" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid payslip ID" }, { status: 400 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        await connectDB();

        const payslip = await Payslip.findOne({ _id: id, institute: instituteId }).populate('staff', 'profile');
        if (!payslip) {
            return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
        }

        await Payslip.deleteOne({ _id: id });

        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'hr.payslip.delete',
                resource: { type: 'Payslip', id: id },
                institute: instituteId,
                details: { staffName: payslip.staff?.fullName, month: payslip.month, year: payslip.year }
            });
        } catch (auditError) {
            console.error('Audit log failed:', auditError);
        }

        return NextResponse.json({ message: "Payslip deleted successfully" });
    } catch (error) {
        console.error("Error deleting payslip:", error);
        return NextResponse.json({ error: "Failed to delete payslip" }, { status: 500 });
    }
}
