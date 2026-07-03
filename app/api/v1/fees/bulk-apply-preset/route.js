import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getInstituteScope } from "@/middleware/instituteScope";
import FeePreset from "@/models/FeePreset";
import Fee from "@/models/Fee";
import Batch from "@/models/Batch";
import User from "@/models/User";
import { createAuditLog } from "@/services/auditService";

/**
 * POST /api/v1/fees/bulk-apply-preset
 * Body: { batchId, presetId, numInstallments }
 *
 * Applies a fee preset to every active student in the given batch.
 * Skips students who already have a fee record for that batch.
 */
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) {
            return NextResponse.json({ error: "Missing institute context" }, { status: 400 });
        }

        const { batchId, presetId, numInstallments = 1 } = await req.json();

        if (!batchId || !presetId) {
            return NextResponse.json({ error: "batchId and presetId are required" }, { status: 400 });
        }

        await connectDB();

        // Validate preset belongs to this institute
        const preset = await FeePreset.findOne({
            _id: presetId,
            institute: scope.instituteId,
            deletedAt: null
        });
        if (!preset) {
            return NextResponse.json({ error: "Fee preset not found" }, { status: 404 });
        }

        // Validate batch belongs to this institute
        const batch = await Batch.findOne({
            _id: batchId,
            institute: scope.instituteId
        }).select("session course");
        if (!batch) {
            return NextResponse.json({ error: "Batch not found" }, { status: 404 });
        }

        // Get all active students in this batch
        const students = await User.find({
            institute: scope.instituteId,
            role: "student",
            isActive: true,
            deletedAt: null,
            batches: batchId
        }).select("_id fullName");

        if (students.length === 0) {
            return NextResponse.json({ error: "No active students found in this batch" }, { status: 404 });
        }

        // Find which students already have a fee record for this batch (skip them)
        const existingFees = await Fee.find({
            batch: batchId,
            institute: scope.instituteId,
            deletedAt: null
        }).select("student");
        const existingStudentIds = new Set(existingFees.map(f => f.student.toString()));

        const toCreate = students.filter(s => !existingStudentIds.has(s._id.toString()));
        const skippedCount = students.length - toCreate.length;

        if (toCreate.length === 0) {
            return NextResponse.json({
                message: "All students in this batch already have a fee record. No new records created.",
                skippedCount,
                createdCount: 0
            });
        }

        // Build installments from preset amount
        const totalAmount = preset.amount;
        const n = Math.max(1, parseInt(numInstallments, 10));
        const baseInstallmentAmount = parseFloat((totalAmount / n).toFixed(2));
        const today = new Date();

        const buildInstallments = () => {
            const installments = [];
            for (let i = 0; i < n; i++) {
                const dueDate = new Date(today);
                dueDate.setMonth(dueDate.getMonth() + (i + 1));
                installments.push({
                    amount: baseInstallmentAmount,
                    dueDate,
                    status: "pending"
                });
            }
            // Fix rounding on last installment
            const sum = installments.reduce((acc, x) => acc + x.amount, 0);
            const diff = parseFloat((totalAmount - sum).toFixed(2));
            if (diff !== 0) installments[installments.length - 1].amount = parseFloat((installments[installments.length - 1].amount + diff).toFixed(2));
            return installments;
        };

        // Bulk insert fee records
        const feeDocs = toCreate.map(student => ({
            student: student._id,
            batch: batchId,
            session: batch.session || null,
            institute: scope.instituteId,
            totalAmount,
            installments: buildInstallments(),
            feePreset: preset._id,
            status: "not_started"
        }));

        const inserted = await Fee.insertMany(feeDocs, { ordered: false });

        await createAuditLog({
            actor: session.user.id,
            action: "fee.bulk_apply_preset",
            resource: { type: "FeePreset", id: preset._id },
            institute: scope.instituteId,
            details: { batchId, presetId, createdCount: inserted.length, skippedCount }
        });

        return NextResponse.json({
            message: `Fee preset applied to ${inserted.length} students.`,
            createdCount: inserted.length,
            skippedCount
        });

    } catch (error) {
        console.error("Bulk Apply Preset Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
