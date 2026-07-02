import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import LeaveType from "@/models/LeaveType";
import { createAuditLog } from "@/services/auditService";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        await connectDB();
        const leaveTypes = await LeaveType.find({ institute: instituteId, deletedAt: null })
            .sort({ name: 1 });

        return NextResponse.json({ leaveTypes });
    } catch (error) {
        console.error("Failed to fetch leave types:", error);
        return NextResponse.json({ error: "Failed to fetch leave types" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        const body = await req.json();
        const { name, code, description, maxDaysPerYear } = body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        if (!code || typeof code !== 'string' || code.trim().length === 0) {
            return NextResponse.json({ error: "Code is required" }, { status: 400 });
        }

        await connectDB();
        const leaveType = await LeaveType.create({
            institute: instituteId,
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description?.trim(),
            maxDaysPerYear: typeof maxDaysPerYear === 'number' ? maxDaysPerYear : 12
        });

        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'hr.leave.create',
                resource: { type: 'LeaveType', id: leaveType._id },
                institute: instituteId,
                details: { name: leaveType.name, code: leaveType.code }
            });
        } catch (auditError) {
            console.error('Audit log failed:', auditError);
        }

        return NextResponse.json({ leaveType });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "A leave category with this name or code already exists" }, { status: 400 });
        }
        console.error('Failed to create leave type:', error);
        return NextResponse.json({ error: "Failed to create leave type" }, { status: 500 });
    }
}
