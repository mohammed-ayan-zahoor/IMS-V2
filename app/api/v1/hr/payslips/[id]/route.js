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
import Collector from "@/models/Collector";
import Expense from "@/models/Expense";
import ExpenseHead from "@/models/ExpenseHead";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

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
            .populate('disbursedFromAccount', 'name accountType accountNumber phone')
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
        const {
            paymentStatus,
            paymentMode,
            disbursedFromAccount,
            paymentDate,
            paymentReference,
            notes
        } = body;

        await connectDB();

        const payslip = await Payslip.findOne({ _id: id, institute: instituteId }).populate('staff', 'profile');
        if (!payslip) {
            return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
        }

        if (paymentStatus === 'paid') {
            // Validate account if specified
            if (disbursedFromAccount) {
                const collectorDoc = await Collector.findOne({ _id: disbursedFromAccount, institute: instituteId });
                if (!collectorDoc) {
                    return NextResponse.json({ error: "Disbursement account not found" }, { status: 400 });
                }
            }

            // Find or create payroll expense head for Daily Ledger
            let payrollHead = await ExpenseHead.findOne({
                institute: instituteId,
                name: { $regex: /^(Faculty & Staff Payroll|Staff Salary|Salary|Payroll)$/i }
            });
            if (!payrollHead) {
                payrollHead = await ExpenseHead.create({
                    institute: instituteId,
                    name: 'Faculty & Staff Payroll',
                    isActive: true,
                    createdBy: session.user.id
                });
            }

            const firstName = payslip.staff?.profile?.firstName || '';
            const lastName = payslip.staff?.profile?.lastName || '';
            const staffName = `${firstName} ${lastName}`.trim() || 'Staff Member';
            const validPaymentDate = paymentDate ? new Date(paymentDate) : new Date();
            const monthName = MONTH_NAMES[payslip.month - 1] || payslip.month;
            const description = `Salary disbursement for ${monthName} ${payslip.year} (${staffName})${paymentReference ? ` - Ref: ${paymentReference}` : ''}`;

            // Create or update Daily Ledger Expense entry
            if (payslip.expense) {
                await Expense.findByIdAndUpdate(payslip.expense, {
                    date: validPaymentDate,
                    expenseHead: payrollHead._id,
                    amount: payslip.netSalary,
                    description,
                    paidTo: staffName,
                    paymentMode: paymentMode || 'Cash',
                    paidByAccount: disbursedFromAccount || null
                });

                // Adjust balance if account changed
                const oldAccId = payslip.disbursedFromAccount ? payslip.disbursedFromAccount.toString() : null;
                const newAccId = disbursedFromAccount ? disbursedFromAccount.toString() : null;
                if (oldAccId !== newAccId) {
                    if (oldAccId) {
                        await Collector.findByIdAndUpdate(oldAccId, { $inc: { currentBalance: payslip.netSalary } });
                    }
                    if (newAccId) {
                        await Collector.findByIdAndUpdate(newAccId, { $inc: { currentBalance: -payslip.netSalary } });
                    }
                }
            } else {
                const expense = await Expense.create({
                    institute: instituteId,
                    date: validPaymentDate,
                    expenseHead: payrollHead._id,
                    amount: payslip.netSalary,
                    description,
                    paidTo: staffName,
                    paymentMode: paymentMode || 'Cash',
                    paidByAccount: disbursedFromAccount || null,
                    entryBy: session.user.id
                });
                payslip.expense = expense._id;

                if (disbursedFromAccount) {
                    await Collector.findByIdAndUpdate(disbursedFromAccount, {
                        $inc: { currentBalance: -payslip.netSalary }
                    });
                }
            }

            payslip.paymentStatus = 'paid';
            payslip.paymentDate = validPaymentDate;
            payslip.paymentMode = paymentMode || 'Cash';
            payslip.disbursedFromAccount = disbursedFromAccount || null;
            payslip.paymentReference = paymentReference?.trim() || null;
            if (notes !== undefined) payslip.notes = notes;

            try {
                await createAuditLog({
                    actor: session.user.id,
                    action: 'hr.payslip.paid',
                    resource: { type: 'Payslip', id: payslip._id },
                    institute: instituteId,
                    details: {
                        staffName,
                        month: payslip.month,
                        year: payslip.year,
                        amount: payslip.netSalary,
                        account: disbursedFromAccount,
                        paymentMode
                    }
                });
            } catch (auditError) {
                console.error('Audit log failed:', auditError);
            }
        } else if (paymentStatus === 'unpaid') {
            // Clean up linked Expense from Daily Ledger & restore balance
            if (payslip.expense) {
                await Expense.findByIdAndDelete(payslip.expense);
                if (payslip.disbursedFromAccount) {
                    await Collector.findByIdAndUpdate(payslip.disbursedFromAccount, {
                        $inc: { currentBalance: payslip.netSalary }
                    });
                }
            }

            payslip.paymentStatus = 'unpaid';
            payslip.paymentDate = null;
            payslip.paymentMode = null;
            payslip.disbursedFromAccount = null;
            payslip.paymentReference = null;
            payslip.expense = null;
            if (notes !== undefined) payslip.notes = notes;
        }

        await payslip.save();
        await payslip.populate('disbursedFromAccount', 'name accountType accountNumber phone');

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

        // Clean up linked Expense from Daily Ledger and restore balance
        if (payslip.expense) {
            await Expense.findByIdAndDelete(payslip.expense);
            if (payslip.disbursedFromAccount) {
                await Collector.findByIdAndUpdate(payslip.disbursedFromAccount, {
                    $inc: { currentBalance: payslip.netSalary }
                });
            }
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
