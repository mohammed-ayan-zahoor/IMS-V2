import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Payslip from "@/models/Payslip";
import { createAuditLog } from "@/services/auditService";
import mongoose from "mongoose";

import Institute from "@/models/Institute";
import User from "@/models/User";
import Designation from "@/models/Designation";

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin', 'instructor', 'staff'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
        const id = resolvedParams?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid payslip ID" }, { status: 400 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        await connectDB();

        const payslip = await Payslip.findOne({ _id: id, institute: instituteId })
            .populate({
                path: 'staff',
                select: 'profile role email phone hrDetails username enrollmentNumber',
                populate: {
                    path: 'hrDetails.designation',
                    select: 'name'
                }
            })
            .populate('institute', 'name code address contact contactEmail contactPhone email logo branding settings')
            .populate('generatedBy', 'profile role');

        if (!payslip) {
            return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
        }

        return NextResponse.json({ payslip });
    } catch (error) {
        console.error("Error fetching payslip:", error);
        return NextResponse.json({ error: "Failed to fetch payslip" }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
        const id = resolvedParams?.id;
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

        const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
        const id = resolvedParams?.id;
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
