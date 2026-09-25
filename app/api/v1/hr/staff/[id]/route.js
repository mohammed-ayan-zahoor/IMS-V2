import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Payslip from "@/models/Payslip";
import StaffAttendance from "@/models/StaffAttendance";
import SalaryComponent from "@/models/SalaryComponent";
import Designation from "@/models/Designation";
import { createAuditLog } from "@/services/auditService";
import mongoose from "mongoose";

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
        const id = resolvedParams?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid staff ID" }, { status: 400 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        await connectDB();

        const staff = await User.findOne({ _id: id, institute: instituteId, deletedAt: null })
            .populate('hrDetails.designation', 'name')
            .populate('hrDetails.earnings.component', 'name type calculationType percentageBasis defaultValue isActive')
            .populate('hrDetails.deductions.component', 'name type calculationType percentageBasis defaultValue isActive')
            .select('-passwordHash -faceDescriptor');

        if (!staff) {
            return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
        }

        // Fetch current month attendance metrics
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const currentMonthLogs = await StaffAttendance.find({
            institute: instituteId,
            staff: id,
            date: { $gte: startOfMonth, $lte: endOfMonth }
        }).sort({ date: 1 });

        const attendanceSummary = {
            present: 0,
            absent: 0,
            halfDay: 0,
            onLeave: 0,
            holiday: 0,
            totalLateHours: 0,
            totalOvertimeHours: 0
        };

        currentMonthLogs.forEach(log => {
            if (log.status === 'present') attendanceSummary.present++;
            else if (log.status === 'absent') attendanceSummary.absent++;
            else if (log.status === 'half_day') attendanceSummary.halfDay++;
            else if (log.status === 'on_leave') attendanceSummary.onLeave++;
            else if (log.status === 'holiday') attendanceSummary.holiday++;

            if (log.lateMinutes && log.lateMinutes > 15) {
                attendanceSummary.totalLateHours += Math.ceil(log.lateMinutes / 60);
            }
            if (log.overtimeMinutes && log.overtimeMinutes > 30) {
                attendanceSummary.totalOvertimeHours += Math.floor((log.overtimeMinutes - 30) / 60);
            }
        });

        // Fetch payslips history
        const payslips = await Payslip.find({ institute: instituteId, staff: id })
            .sort({ year: -1, month: -1 });

        // Fetch active salary components for master selection
        const availableComponents = await SalaryComponent.find({
            institute: instituteId,
            isActive: true,
            deletedAt: null
        }).sort({ type: 1, name: 1 });

        return NextResponse.json({
            staff,
            attendanceMetrics: {
                summary: attendanceSummary,
                currentMonthLogs
            },
            payslips,
            availableComponents
        });
    } catch (error) {
        console.error("Error fetching staff member profile:", error);
        return NextResponse.json({ error: "Failed to fetch staff member profile" }, { status: 500 });
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
            return NextResponse.json({ error: "Invalid staff ID" }, { status: 400 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        const body = await req.json();
        await connectDB();

        const staff = await User.findOne({ _id: id, institute: instituteId, deletedAt: null });
        if (!staff) {
            return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
        }

        // 1. Profile fields
        if (!staff.profile) staff.profile = {};
        if (body.firstName !== undefined) staff.profile.firstName = body.firstName.trim();
        if (body.lastName !== undefined) staff.profile.lastName = body.lastName.trim();
        if (body.phone !== undefined) staff.profile.phone = body.phone.trim();
        if (body.avatar !== undefined) staff.profile.avatar = body.avatar;
        if (body.gender !== undefined) staff.profile.gender = body.gender;
        if (body.bloodGroup !== undefined) staff.profile.bloodGroup = body.bloodGroup;
        if (body.dob !== undefined) staff.profile.dateOfBirth = body.dob ? new Date(body.dob) : null;
        if (body.address !== undefined) staff.profile.address = body.address;

        // 2. Role & Login Access
        if (body.role && ['admin', 'instructor', 'staff'].includes(body.role)) {
            staff.role = body.role;
        }
        if (body.allowLogin !== undefined) {
            staff.allowLogin = !!body.allowLogin;
        }

        // 3. HR details
        if (!staff.hrDetails) staff.hrDetails = {};
        if (body.designation !== undefined) {
            staff.hrDetails.designation = (body.designation && mongoose.Types.ObjectId.isValid(body.designation)) ? body.designation : null;
        }
        if (body.qualification !== undefined) staff.hrDetails.qualification = body.qualification.trim();
        if (body.joiningDate !== undefined) staff.hrDetails.joiningDate = body.joiningDate ? new Date(body.joiningDate) : null;
        if (body.basicSalary !== undefined) staff.hrDetails.basicSalary = Math.max(0, parseFloat(body.basicSalary) || 0);

        // 4. Statutory numbers & Bank details
        if (body.panNumber !== undefined) staff.hrDetails.panNumber = body.panNumber.trim();
        if (body.uanNumber !== undefined) staff.hrDetails.uanNumber = body.uanNumber.trim();
        if (body.esiNumber !== undefined) staff.hrDetails.esiNumber = body.esiNumber.trim();
        if (body.bankDetails !== undefined) {
            staff.hrDetails.bankDetails = {
                accountName: body.bankDetails.accountName?.trim() || "",
                accountNumber: body.bankDetails.accountNumber?.trim() || "",
                bankName: body.bankDetails.bankName?.trim() || "",
                ifscCode: body.bankDetails.ifscCode?.trim() || "",
                branch: body.bankDetails.branch?.trim() || ""
            };
        }

        // 5. Salary Structure: Earnings Array
        if (Array.isArray(body.earnings)) {
            staff.hrDetails.earnings = body.earnings
                .filter(e => e.component && mongoose.Types.ObjectId.isValid(e.component))
                .map(e => ({
                    component: e.component,
                    amount: Math.max(0, parseFloat(e.amount) || 0)
                }));
        }

        // 6. Deductions Array
        if (Array.isArray(body.deductions)) {
            staff.hrDetails.deductions = body.deductions
                .filter(d => d.component && mongoose.Types.ObjectId.isValid(d.component))
                .map(d => ({
                    component: d.component,
                    amount: Math.max(0, parseFloat(d.amount) || 0)
                }));
        }

        await staff.save();

        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'hr.staff.update',
                resource: { type: 'User', id: staff._id },
                institute: instituteId,
                details: { name: `${staff.profile?.firstName} ${staff.profile?.lastName}`, role: staff.role }
            });
        } catch (auditError) {
            console.error('Audit log failed:', auditError);
        }

        const updatedStaff = await User.findById(id)
            .populate('hrDetails.designation', 'name')
            .populate('hrDetails.earnings.component', 'name type calculationType percentageBasis defaultValue isActive')
            .populate('hrDetails.deductions.component', 'name type calculationType percentageBasis defaultValue isActive')
            .select('-passwordHash -faceDescriptor');

        return NextResponse.json({ staff: updatedStaff, message: "Staff profile updated successfully" });
    } catch (error) {
        console.error("Error updating staff member:", error);
        return NextResponse.json({ error: error.message || "Failed to update staff member" }, { status: 500 });
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
            return NextResponse.json({ error: "Invalid staff ID" }, { status: 400 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        await connectDB();

        const staff = await User.findOne({ _id: id, institute: instituteId, deletedAt: null });
        if (!staff) {
            return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
        }

        staff.deletedAt = new Date();
        staff.deletedBy = session.user.id;
        staff.isActive = false;
        await staff.save();

        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'hr.staff.delete',
                resource: { type: 'User', id: staff._id },
                institute: instituteId,
                details: { name: `${staff.profile?.firstName} ${staff.profile?.lastName}`, role: staff.role }
            });
        } catch (auditError) {
            console.error('Audit log failed:', auditError);
        }

        return NextResponse.json({ message: "Staff member removed successfully" });
    } catch (error) {
        console.error("Error deleting staff member:", error);
        return NextResponse.json({ error: "Failed to delete staff member" }, { status: 500 });
    }
}
