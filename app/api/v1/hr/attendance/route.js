import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import StaffAttendance from "@/models/StaffAttendance";
import User from "@/models/User";
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

        const { searchParams } = new URL(req.url);
        const dateStr = searchParams.get('date');
        const staffId = searchParams.get('staff');

        await connectDB();

        // 1. If date is provided, return attendance list for all staff members on that date
        if (dateStr) {
            const queryDate = new Date(dateStr);
            queryDate.setHours(0, 0, 0, 0);

            // Fetch all staff members (role: instructor or staff)
            const staffList = await User.find({
                institute: instituteId,
                role: { $in: ['instructor', 'staff'] },
                deletedAt: null
            })
            .populate('hrDetails.designation', 'name')
            .select('profile role hrDetails')
            .sort({ "profile.firstName": 1 });

            // Fetch attendance records marked for this date
            const attendanceRecords = await StaffAttendance.find({
                institute: instituteId,
                date: queryDate
            });

            // Map records together
            const data = staffList.map(member => {
                const record = attendanceRecords.find(r => r.staff.toString() === member._id.toString());
                return {
                    staff: member,
                    status: record ? record.status : 'present', // default to present if not marked
                    remarks: record ? record.remarks : '',
                    attendanceId: record ? record._id : null
                };
            });

            return NextResponse.json({ date: dateStr, records: data });
        }

        // 2. If staffId is provided, return their full attendance history
        if (staffId) {
            const records = await StaffAttendance.find({
                institute: instituteId,
                staff: staffId
            })
            .sort({ date: -1 });

            return NextResponse.json({ records });
        }

        return NextResponse.json({ error: "Missing date or staff query parameter" }, { status: 400 });
    } catch (error) {
        console.error("Failed to fetch staff attendance:", error);
        return NextResponse.json({ error: "Failed to fetch staff attendance" }, { status: 500 });
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
        const { date, records } = body; // date: yyyy-mm-dd, records: [{ staffId, status, remarks }]

        if (!date || !Array.isArray(records)) {
            return NextResponse.json({ error: "Date and records array are required" }, { status: 400 });
        }

        const queryDate = new Date(date);
        queryDate.setHours(0, 0, 0, 0);

        await connectDB();

        const bulkOperations = records.map(rec => ({
            updateOne: {
                filter: {
                    institute: instituteId,
                    date: queryDate,
                    staff: rec.staffId
                },
                update: {
                    $set: {
                        status: rec.status,
                        remarks: rec.remarks || "",
                        markedBy: session.user.id
                    }
                },
                upsert: true
            }
        }));

        await StaffAttendance.bulkWrite(bulkOperations);

        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'hr.attendance.mark',
                resource: { type: 'StaffAttendance' },
                institute: instituteId,
                details: { date, totalRecords: records.length }
            });
        } catch (auditError) {
            console.error('Audit log failed:', auditError);
        }

        return NextResponse.json({ success: true, message: "Staff attendance updated successfully" });
    } catch (error) {
        console.error("Failed to update staff attendance:", error);
        return NextResponse.json({ error: "Failed to update staff attendance" }, { status: 500 });
    }
}
