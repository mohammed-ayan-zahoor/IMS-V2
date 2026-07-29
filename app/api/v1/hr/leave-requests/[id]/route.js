import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import LeaveRequest from "@/models/LeaveRequest";
import StaffAttendance from "@/models/StaffAttendance";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { status, adminComment } = body;

        const role = session.user.role;
        const instituteId = session.user.institute?.id;

        if (!instituteId) {
            return NextResponse.json({ error: "No institute context found" }, { status: 400 });
        }

        if (!status || !['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
            return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
        }

        await connectDB();

        const leave = await LeaveRequest.findOne({ _id: id, institute: instituteId });
        if (!leave) {
            return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
        }

        if (role === 'instructor') {
            // Instructors can only cancel their own PENDING requests
            if (leave.user.toString() !== session.user.id) {
                return NextResponse.json({ error: "Forbidden: Not your leave request" }, { status: 403 });
            }
            if (leave.status !== 'PENDING') {
                return NextResponse.json({ error: "Only pending requests can be cancelled" }, { status: 400 });
            }
            if (status !== 'CANCELLED') {
                return NextResponse.json({ error: "Instructors can only cancel requests" }, { status: 400 });
            }

            leave.status = 'CANCELLED';
            await leave.save();
        } else if (['admin', 'super_admin'].includes(role)) {
            // Admins can approve or reject
            if (!['APPROVED', 'REJECTED'].includes(status)) {
                return NextResponse.json({ error: "Admins can only approve or reject requests" }, { status: 400 });
            }
            if (leave.status !== 'PENDING') {
                return NextResponse.json({ error: "Only pending requests can be reviewed" }, { status: 400 });
            }

            leave.status = status;
            leave.approvedBy = session.user.id;
            leave.approvedAt = new Date();
            if (adminComment !== undefined) {
                leave.adminComment = adminComment.trim();
            }

            await leave.save();

            // If APPROVED, auto-mark Staff Attendance as 'on_leave'
            if (status === 'APPROVED') {
                const start = new Date(leave.startDate);
                const end = new Date(leave.endDate);
                const dates = [];

                let current = new Date(start);
                // Simple date loop
                while (current <= end) {
                    dates.push(new Date(current));
                    current.setDate(current.getDate() + 1);
                }

                for (const date of dates) {
                    // Normalize date to start of day (midnight) in local time
                    const startOfDay = new Date(date);
                    startOfDay.setHours(0, 0, 0, 0);

                    await StaffAttendance.findOneAndUpdate(
                        { institute: instituteId, staff: leave.user, date: startOfDay },
                        { status: 'on_leave', markedBy: session.user.id, remarks: `Leave Approved: ${leave.reason}` },
                        { upsert: true, new: true }
                    );
                }
            }
        } else {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json({ success: true, leaveRequest: leave });
    } catch (error) {
        console.error("PATCH /api/v1/hr/leave-requests/[id] error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
