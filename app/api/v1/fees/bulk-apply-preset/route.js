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

        if (!batchId) {
            return NextResponse.json({ error: "batchId is required" }, { status: 400 });
        }

        await connectDB();

        // Validate batch belongs to this institute
        const batch = await Batch.findOne({
            _id: batchId,
            institute: scope.instituteId
        }).populate("course", "name fees").select("session course name");
        if (!batch) {
            return NextResponse.json({ error: "Batch not found" }, { status: 404 });
        }

        let totalAmount = 0;
        let selectedPresetId = null;
        let feeTitle = "";

        if (presetId && presetId !== "base_class_fee") {
            const preset = await FeePreset.findOne({
                _id: presetId,
                institute: scope.instituteId,
                deletedAt: null
            });
            if (!preset) {
                return NextResponse.json({ error: "Fee preset not found" }, { status: 404 });
            }
            totalAmount = preset.amount;
            selectedPresetId = preset._id;
            feeTitle = preset.name;
        } else {
            // Use Class/Course Base Fee
            const baseFee = batch.course?.fees?.amount;
            if (!baseFee || baseFee <= 0) {
                return NextResponse.json({ 
                    error: `No base fee configured for "${batch.course?.name || batch.name}". Please set a fee in the Class page or select a Fee Preset.` 
                }, { status: 400 });
            }
            totalAmount = baseFee;
            feeTitle = `${batch.course?.name || "Class"} Base Fee`;
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

        // Find existing fees for this batch
        const existingFees = await Fee.find({
            batch: batchId,
            institute: scope.instituteId,
            deletedAt: null
        });
        const existingFeeMap = new Map(existingFees.map(f => [f.student.toString(), f]));

        // Build installments from total amount
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

        const toInsert = [];
        let updatedCount = 0;
        let skippedCount = 0;

        for (const student of students) {
            const sId = student._id.toString();
            const existingFee = existingFeeMap.get(sId);

            if (existingFee) {
                // If student has already made a payment, do not overwrite their fee ledger
                if (existingFee.paidAmount > 0) {
                    skippedCount++;
                    continue;
                }
                // If fee exists with 0 paid (e.g. initial placeholder created on bulk import), update it with the new installment schedule
                await Fee.findByIdAndUpdate(existingFee._id, {
                    $set: {
                        totalAmount,
                        installments: buildInstallments(),
                        feePreset: selectedPresetId,
                        session: batch.session || existingFee.session || null,
                        status: "not_started"
                    }
                });
                updatedCount++;
            } else {
                toInsert.push({
                    student: student._id,
                    batch: batchId,
                    session: batch.session || null,
                    institute: scope.instituteId,
                    totalAmount,
                    installments: buildInstallments(),
                    feePreset: selectedPresetId,
                    status: "not_started"
                });
            }
        }

        let insertedCount = 0;
        if (toInsert.length > 0) {
            const inserted = await Fee.insertMany(toInsert, { ordered: false });
            insertedCount = inserted.length;
        }

        const totalConfigured = insertedCount + updatedCount;

        await createAuditLog({
            actor: session.user.id,
            action: "fee.bulk_apply_preset",
            resource: { type: selectedPresetId ? "FeePreset" : "Course", id: selectedPresetId || batch.course?._id },
            institute: scope.instituteId,
            details: { batchId, presetId: selectedPresetId, feeTitle, totalAmount, installments: n, configuredCount: totalConfigured, skippedCount }
        });

        return NextResponse.json({
            message: `Applied ${feeTitle} (₹${totalAmount.toLocaleString()}) in ${n} installment${n > 1 ? 's' : ''} to ${totalConfigured} students.`,
            createdCount: totalConfigured,
            skippedCount
        });

    } catch (error) {
        console.error("Bulk Apply Preset Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
