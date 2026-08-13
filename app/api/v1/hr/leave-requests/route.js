import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import LeaveRequest from "@/models/LeaveRequest";
import LeaveType from "@/models/LeaveType";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = session.user.role;
        const instituteId = session.user.institute?.id;

        if (!instituteId) {
            return NextResponse.json({ error: "No institute context found" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');

        await connectDB();

        const query = { institute: instituteId };

        if (role === 'instructor') {
            query.user = session.user.id;
        } else if (!['admin', 'super_admin'].includes(role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (status) {
            query.status = status;
        }

        const requests = await LeaveRequest.find(query)
            .populate('leaveType', 'name code')
            .populate('user', 'profile.firstName profile.lastName email')
            .populate('approvedBy', 'profile.firstName profile.lastName')
            .sort({ createdAt: -1 });

        return NextResponse.json({ success: true, leaveRequests: requests });
    } catch (error) {
        console.error("GET /api/v1/hr/leave-requests error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = session.user.role;
        const instituteId = session.user.institute?.id;

        if (!instituteId) {
            return NextResponse.json({ error: "No institute context found" }, { status: 400 });
        }

        if (!['instructor', 'staff', 'admin', 'super_admin'].includes(role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { leaveTypeId, startDate, endDate, reason } = body;

        if (!leaveTypeId || !startDate || !endDate || !reason?.trim()) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
            return NextResponse.json({ error: "Invalid start or end dates" }, { status: 400 });
        }

        await connectDB();

        // Verify LeaveType exists and belongs to the institute
        const lType = await LeaveType.findOne({ _id: leaveTypeId, institute: instituteId, deletedAt: null });
        if (!lType) {
            return NextResponse.json({ error: "Leave type not found or inactive" }, { status: 404 });
        }

        const request = await LeaveRequest.create({
            institute: instituteId,
            user: session.user.id,
            leaveType: leaveTypeId,
            startDate: start,
            endDate: end,
            reason: reason.trim(),
            status: 'PENDING'
        });

        return NextResponse.json({ success: true, leaveRequest: request }, { status: 201 });
    } catch (error) {
        console.error("POST /api/v1/hr/leave-requests error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
