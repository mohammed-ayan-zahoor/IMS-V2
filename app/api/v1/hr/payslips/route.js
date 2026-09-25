import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Payslip from "@/models/Payslip";
import User from "@/models/User";
import Collector from "@/models/Collector";
import StaffAttendance from "@/models/StaffAttendance";
import HRSettings from "@/models/HRSettings";
import SalaryComponent from "@/models/SalaryComponent";
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
            .populate('disbursedFromAccount', 'name accountType accountNumber')
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

        // Fetch HR settings for timing rules & deduction/OT rates
        const hrSettings = await HRSettings.findOne({ institute: instituteId }) || {
            shiftStart: "09:00",
            shiftEnd: "18:00",
            checkInGraceMins: 15,
            checkOutGraceMins: 10,
            deductionRatePerHour: 100,
            midDayOutEnabled: true,
            overtimeEnabled: true,
            overtimeBufferMins: 30,
            overtimeRatePerHour: 150
        };

        // Compute timing penalties and overtime across monthly attendance logs
        let totalLateHours = 0;
        let totalEarlyHours = 0;
        let totalMidDayHours = 0;
        let totalOvertimeHours = 0;

        attendanceLogs.forEach(log => {
            // Late check-in penalty: exceeding grace period rounds up to next full hour
            if (log.lateMinutes && log.lateMinutes > (hrSettings.checkInGraceMins || 0)) {
                totalLateHours += Math.ceil(log.lateMinutes / 60);
            }

            // Early check-out penalty: leaving earlier than grace window rounds up to next full hour
            if (log.earlyDepartureMinutes && log.earlyDepartureMinutes > (hrSettings.checkOutGraceMins || 0)) {
                totalEarlyHours += Math.ceil(log.earlyDepartureMinutes / 60);
            }

            // Mid-day out-pass penalty: if enabled, rounds up to next full hour
            if (hrSettings.midDayOutEnabled && log.midDayOutMinutes && log.midDayOutMinutes > 0) {
                totalMidDayHours += Math.ceil(log.midDayOutMinutes / 60);
            }

            // Overtime earning: if enabled and past unpaid buffer, full hours counted
            if (hrSettings.overtimeEnabled && log.overtimeMinutes && log.overtimeMinutes > (hrSettings.overtimeBufferMins || 0)) {
                const effectiveOtMinutes = log.overtimeMinutes - (hrSettings.overtimeBufferMins || 0);
                const otHours = Math.floor(effectiveOtMinutes / 60);
                if (otHours > 0) {
                    totalOvertimeHours += otHours;
                }
            }
        });

        // Fetch all active Salary Components for the institute
        const instituteComponents = await SalaryComponent.find({
            institute: instituteId,
            isActive: true,
            deletedAt: null
        }).sort({ name: 1 });

        // Map assigned staff earnings by component ID/Name
        const staffEarningsMap = new Map();
        (staffMember.hrDetails?.earnings || []).forEach(e => {
            if (e.component?._id) staffEarningsMap.set(e.component._id.toString(), e.amount || 0);
            if (e.component?.name) staffEarningsMap.set(e.component.name.toLowerCase().trim(), e.amount || 0);
        });

        // 1. Build Earnings list: All active earning components in master (excluding Basic Salary) + Overtime (even if 0)
        const earnings = [];
        const earningComponentsMaster = instituteComponents.filter(c => 
            c.type === 'earning' && 
            c.name.trim().toLowerCase() !== 'basic salary' && 
            c.name.trim().toLowerCase() !== 'basic' &&
            c.recurrence !== 'variable'
        );
        
        earningComponentsMaster.forEach(comp => {
            let amount = staffEarningsMap.get(comp._id.toString()) ?? staffEarningsMap.get(comp.name.toLowerCase().trim());
            if (amount === undefined || amount === null) {
                if (comp.calculationType === 'percentage' && comp.defaultValue > 0) {
                    amount = (basicSalary * comp.defaultValue) / 100;
                } else if (comp.calculationType === 'flat' && comp.defaultValue > 0) {
                    amount = comp.defaultValue;
                } else {
                    amount = 0;
                }
            }
            earnings.push({
                componentName: comp.name,
                amount: Math.round(amount * 100) / 100
            });
        });

        // Only inject generic default template allowances if institute has NO master earning components defined
        if (earningComponentsMaster.length === 0) {
            const defaultEarningNames = ["House Rent Allowance", "Conveyance Allowance", "Special Allowance", "Other Allowance"];
            defaultEarningNames.forEach(name => {
                const amt = staffEarningsMap.get(name.toLowerCase().trim()) ?? 0;
                earnings.push({
                    componentName: name,
                    amount: Math.round(amt * 100) / 100
                });
            });
        }

        // If staff had custom earning components not in master, add them (excluding basic salary)
        (staffMember.hrDetails?.earnings || []).forEach(e => {
            const name = e.component?.name;
            if (name && 
                name.trim().toLowerCase() !== 'basic salary' && 
                name.trim().toLowerCase() !== 'basic' && 
                !earnings.some(existing => existing.componentName.toLowerCase() === name.toLowerCase())
            ) {
                earnings.push({
                    componentName: name,
                    amount: Math.round((e.amount || 0) * 100) / 100
                });
            }
        });

        // Add Overtime row (even if 0 hrs / ₹0)
        const overtimeAmount = (totalOvertimeHours > 0 && hrSettings.overtimeRatePerHour > 0)
            ? totalOvertimeHours * hrSettings.overtimeRatePerHour
            : 0;
        earnings.push({
            componentName: totalOvertimeHours > 0 
                ? `Overtime (${totalOvertimeHours} hrs @ ₹${hrSettings.overtimeRatePerHour}/hr)` 
                : "Overtime Allowance (0 hrs)",
            amount: overtimeAmount
        });

        // Pre-compute gross salary for percentage-of-gross deductions (like ESI)
        const currentGrossSalary = basicSalary + earnings.reduce((sum, e) => sum + e.amount, 0);

        // Map assigned staff deductions by component ID/Name
        const staffDeductionsMap = new Map();
        (staffMember.hrDetails?.deductions || []).forEach(d => {
            if (d.component?._id) staffDeductionsMap.set(d.component._id.toString(), d.amount || 0);
            if (d.component?.name) staffDeductionsMap.set(d.component.name.toLowerCase().trim(), d.amount || 0);
        });

        // 2. Build Deductions list: All active deduction components in master + Absence + Timing penalties (even if 0)
        const deductions = [];
        const deductionComponentsMaster = instituteComponents.filter(c => c.type === 'deduction' && c.recurrence !== 'variable');
        
        deductionComponentsMaster.forEach(comp => {
            let amount = staffDeductionsMap.get(comp._id.toString()) ?? staffDeductionsMap.get(comp.name.toLowerCase().trim());
            if (amount === undefined || amount === null) {
                if (comp.calculationType === 'percentage' && comp.defaultValue > 0) {
                    const base = comp.percentageBasis === 'gross' ? currentGrossSalary : basicSalary;
                    amount = (base * comp.defaultValue) / 100;
                } else if (comp.calculationType === 'flat' && comp.defaultValue > 0) {
                    amount = comp.defaultValue;
                } else {
                    amount = 0;
                }
            }
            deductions.push({
                componentName: comp.name,
                amount: Math.round(amount * 100) / 100
            });
        });

        // Only inject generic default template deductions if institute has NO master deduction components defined
        if (deductionComponentsMaster.length === 0) {
            const defaultDeductionNames = ["Federal Income Tax (TDS)", "FICA / Provident Fund (PF)", "Health Insurance (ESI)"];
            defaultDeductionNames.forEach(name => {
                const amt = staffDeductionsMap.get(name.toLowerCase().trim()) ?? 0;
                deductions.push({
                    componentName: name,
                    amount: Math.round(amt * 100) / 100
                });
            });
        }

        // If staff had custom deduction components not in master, add them
        (staffMember.hrDetails?.deductions || []).forEach(d => {
            const name = d.component?.name;
            if (name && !deductions.some(existing => existing.componentName.toLowerCase() === name.toLowerCase())) {
                deductions.push({
                    componentName: name,
                    amount: Math.round((d.amount || 0) * 100) / 100
                });
            }
        });

        // Attendance-based deduction: calculate paid days vs total days in month (Positive worked-days model)
        const dailyRate = totalDaysInMonth > 0 ? (basicSalary / totalDaysInMonth) : 0;
        const paidDays = (attendanceSummary.present || 0) + 
                         ((attendanceSummary.halfDay || 0) * 0.5) + 
                         (attendanceSummary.holiday || 0) + 
                         (attendanceSummary.onLeave || 0);
        
        const unpaidDays = Math.max(0, Math.round((totalDaysInMonth - paidDays) * 10) / 10);
        const absentDeductionAmount = Math.round(unpaidDays * dailyRate * 100) / 100;
        
        const markedTotal = (attendanceSummary.present || 0) + 
                            (attendanceSummary.absent || 0) + 
                            (attendanceSummary.halfDay || 0) + 
                            (attendanceSummary.onLeave || 0) + 
                            (attendanceSummary.holiday || 0);
        const unmarkedDays = Math.max(0, totalDaysInMonth - markedTotal);

        let attendanceDesc = `Attendance Deduction (${unpaidDays}d Unpaid`;
        const parts = [];
        if (attendanceSummary.absent > 0) parts.push(`${attendanceSummary.absent}d Abs`);
        if (attendanceSummary.halfDay > 0) parts.push(`${attendanceSummary.halfDay}d Half`);
        if (unmarkedDays > 0) parts.push(`${unmarkedDays}d Unmarked`);
        if (parts.length > 0) attendanceDesc += `: ${parts.join(', ')}`;
        attendanceDesc += ` @ ₹${dailyRate.toFixed(2)}/d)`;

        deductions.push({
            componentName: unpaidDays > 0 ? attendanceDesc : "Attendance Deduction (0d)",
            amount: absentDeductionAmount
        });

        // Timing penalties: late-in, early-exit, mid-day out-pass (even if 0)
        const totalTimingDeductionHours = totalLateHours + totalEarlyHours + totalMidDayHours;
        const timingDeductionAmount = (totalTimingDeductionHours > 0 && hrSettings.deductionRatePerHour > 0)
            ? totalTimingDeductionHours * hrSettings.deductionRatePerHour
            : 0;

        const detailsList = [];
        if (totalLateHours > 0) detailsList.push(`Late: ${totalLateHours}h`);
        if (totalEarlyHours > 0) detailsList.push(`Early: ${totalEarlyHours}h`);
        if (totalMidDayHours > 0) detailsList.push(`Out-pass: ${totalMidDayHours}h`);
        const timingDesc = detailsList.length > 0
            ? `Timing & Penalty Deduction (${detailsList.join(', ')} @ ₹${hrSettings.deductionRatePerHour}/hr)`
            : "Timing & Late Penalties (0 hrs)";

        deductions.push({
            componentName: timingDesc,
            amount: timingDeductionAmount
        });

        // 3. Include any monthly variable adjustments (e.g. Performance Penalties, Fines, Advances, or Bonuses)
        if (Array.isArray(body.customEarnings)) {
            body.customEarnings.forEach(ce => {
                const amt = parseFloat(ce.amount);
                if (ce.componentName && amt > 0) {
                    earnings.push({
                        componentName: ce.componentName.trim(),
                        amount: Math.round(amt * 100) / 100
                    });
                }
            });
        }

        if (Array.isArray(body.customDeductions)) {
            body.customDeductions.forEach(cd => {
                const amt = parseFloat(cd.amount);
                if (cd.componentName && amt > 0) {
                    deductions.push({
                        componentName: cd.componentName.trim(),
                        amount: Math.round(amt * 100) / 100
                    });
                }
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
