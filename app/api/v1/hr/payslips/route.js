import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Payslip from "@/models/Payslip";
import User from "@/models/User";
import StaffAttendance from "@/models/StaffAttendance";
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
        const monthStr = searchParams.get('month');
        const yearStr = searchParams.get('year');

        if (!monthStr || !yearStr) {
            return NextResponse.json({ error: "Month and Year query parameters are required" }, { status: 400 });
        }

        const month = parseInt(monthStr);
        const year = parseInt(yearStr);

        await connectDB();
        const payslips = await Payslip.find({ institute: instituteId, month, year })
            .populate('staff', 'profile role hrDetails')
            .sort({ createdAt: -1 });

        return NextResponse.json({ payslips });
    } catch (error) {
        console.error("Failed to fetch payslips:", error);
        return NextResponse.json({ error: "Failed to fetch payslips" }, { status: 500 });
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
        const { staffId, month, year, paymentMode, paymentStatus, notes } = body;

        if (!staffId || !month || !year) {
            return NextResponse.json({ error: "Staff ID, Month, and Year are required" }, { status: 400 });
        }

        await connectDB();

        // Check if payslip already exists
        const exists = await Payslip.exists({ institute: instituteId, staff: staffId, month, year });
        if (exists) {
            return NextResponse.json({ error: "A payslip for this staff member already exists for the chosen month and year" }, { status: 400 });
        }

        // Fetch staff details
        const staffMember = await User.findOne({ _id: staffId, institute: instituteId, deletedAt: null })
            .populate('hrDetails.earnings.component')
            .populate('hrDetails.deductions.component');

        if (!staffMember) {
            return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
        }

        const basicSalary = staffMember.hrDetails?.basicSalary || 0;

        // Calculate date range of the selected month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        const totalDaysInMonth = new Date(year, month, 0).getDate();

        // Fetch all attendance records for this staff in this range
        const attendanceLogs = await StaffAttendance.find({
            institute: instituteId,
            staff: staffId,
            date: { $gte: startDate, $lte: endDate }
        });

        const attendanceSummary = {
            present: 0,
            absent: 0,
            halfDay: 0,
            onLeave: 0,
            holiday: 0
        };

        attendanceLogs.forEach(log => {
            if (log.status === 'present') attendanceSummary.present++;
            else if (log.status === 'absent') attendanceSummary.absent++;
            else if (log.status === 'half_day') attendanceSummary.halfDay++;
            else if (log.status === 'on_leave') attendanceSummary.onLeave++;
            else if (log.status === 'holiday') attendanceSummary.holiday++;
        });

        // Compute salary calculations
        const earnings = (staffMember.hrDetails?.earnings || []).map(e => ({
            componentName: e.component?.name || "Earning Component",
            amount: e.amount || 0
        }));

        const configuredDeductions = (staffMember.hrDetails?.deductions || []).map(d => ({
            componentName: d.component?.name || "Deduction Component",
            amount: d.amount || 0
        }));

        // Attendance-based deduction: deduction for absent and half-day
        const dailyRate = basicSalary / totalDaysInMonth;
        const absentDeductionAmount = Math.round((attendanceSummary.absent * dailyRate + (attendanceSummary.halfDay * 0.5 * dailyRate)) * 100) / 100;

        const deductions = [...configuredDeductions];
        if (absentDeductionAmount > 0) {
            deductions.push({
                componentName: `Attendance Deduction (${attendanceSummary.absent}d Abs, ${attendanceSummary.halfDay}d Half)`,
                amount: absentDeductionAmount
            });
        }

        const totalEarnings = basicSalary + earnings.reduce((sum, e) => sum + e.amount, 0);
        const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
        const netSalary = Math.max(0, totalEarnings - totalDeductions);

        const payslip = await Payslip.create({
            institute: instituteId,
            staff: staffId,
            month,
            year,
            attendanceSummary,
            basicSalary,
            earnings,
            deductions,
            netSalary,
            paymentStatus: paymentStatus || 'unpaid',
            paymentDate: paymentStatus === 'paid' ? new Date() : null,
            paymentMode: paymentStatus === 'paid' ? (paymentMode || 'Cash') : null,
            notes: notes?.trim() || "",
            generatedBy: session.user.id
        });

        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'hr.payslip.generate',
                resource: { type: 'Payslip', id: payslip._id },
                institute: instituteId,
                details: { staffName: staffMember.fullName, month, year, netSalary }
            });
        } catch (auditError) {
            console.error('Audit log failed:', auditError);
        }

        return NextResponse.json({ payslip });
    } catch (error) {
        console.error("Failed to generate payslip:", error);
        return NextResponse.json({ error: "Failed to generate payslip" }, { status: 500 });
    }
}
