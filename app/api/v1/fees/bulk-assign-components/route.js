import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Fee from "@/models/Fee";
import Batch from "@/models/Batch";
import FeeHead from "@/models/FeeHead";
import { getInstituteScope } from "@/middleware/instituteScope";
import { createAuditLog } from "@/services/auditService";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) return NextResponse.json({ error: "Missing institute context" }, { status: 400 });

        const body = await req.json();
        const {
            batchId,
            feeHeadId,
            name: customName,
            category = "other",
            amount,
            action = "apply", // "apply" | "remove"
            target = "all",   // "all" | "selected"
            studentIds = [],
            reason
        } = body;

        if (!batchId) {
            return NextResponse.json({ error: "batchId is required" }, { status: 400 });
        }

        await connectDB();

        const batch = await Batch.findOne({
            _id: batchId,
            institute: scope.instituteId
        }).populate("course", "name fees");

        if (!batch) {
            return NextResponse.json({ error: "Batch not found" }, { status: 404 });
        }

        let componentName = customName;
        let componentCategory = category;
        let componentAmount = parseFloat(amount) || 0;

        if (feeHeadId) {
            const head = await FeeHead.findOne({ _id: feeHeadId, institute: scope.instituteId, deletedAt: null });
            if (head) {
                componentName = head.name;
                componentCategory = head.category;
            }
        }

        if (!componentName) {
            return NextResponse.json({ error: "Component name is required" }, { status: 400 });
        }

        // Determine target student query
        const feeQuery = {
            batch: batchId,
            institute: scope.instituteId,
            deletedAt: null
        };

        if (target === "selected") {
            if (!Array.isArray(studentIds) || studentIds.length === 0) {
                return NextResponse.json({ error: "studentIds list cannot be empty for selected target" }, { status: 400 });
            }
            feeQuery.student = { $in: studentIds };
        }

        const fees = await Fee.find(feeQuery);

        if (fees.length === 0) {
            return NextResponse.json({ error: "No fee records found for the target criteria in this batch." }, { status: 404 });
        }

        let updatedCount = 0;
        const skippedDueToPayments = [];

        for (const fee of fees) {
            if (!fee.components) fee.components = [];

            const existingIdx = fee.components.findIndex(c =>
                (feeHeadId && c.feeHead && c.feeHead.toString() === feeHeadId.toString()) ||
                (c.name && c.name.toLowerCase() === componentName.toLowerCase())
            );

            if (action === "apply") {
                if (existingIdx >= 0) {
                    fee.components[existingIdx].amount = componentAmount > 0 ? componentAmount : fee.components[existingIdx].amount;
                    fee.components[existingIdx].isWaived = false;
                    fee.components[existingIdx].waivedReason = null;
                } else {
                    fee.components.push({
                        feeHead: feeHeadId || null,
                        name: componentName,
                        category: componentCategory,
                        amount: componentAmount,
                        isWaived: false
                    });
                }
            } else if (action === "remove") {
                if (existingIdx >= 0) {
                    // Check if reducing this component would make total payable less than already paid amount
                    const projectedActiveSum = fee.components
                        .filter((c, i) => i === existingIdx ? false : !c.isWaived)
                        .reduce((sum, c) => sum + (c.amount || 0), 0);
                    const discountAmt = fee.discount?.amount || 0;
                    const extraAmt = fee.extraCharges?.amount || 0;
                    const projectedNet = Math.max(0, projectedActiveSum - discountAmt + extraAmt);

                    if (projectedNet < (fee.paidAmount || 0)) {
                        skippedDueToPayments.push(fee.student);
                        continue; // Protect financial integrity: do not reduce fee below collected amount
                    }

                    fee.components[existingIdx].isWaived = true;
                    fee.components[existingIdx].waivedReason = reason || "Opted out / excluded by admin";
                }
            }

            // Recalculate total amount from active components if components exist
            const activeComponentsSum = fee.components
                .filter(c => !c.isWaived)
                .reduce((sum, c) => sum + (c.amount || 0), 0);

            if (fee.components.length > 0 && activeComponentsSum > 0) {
                fee.totalAmount = activeComponentsSum;
            }

            // Recalculate balance and rebalance pending installments
            const discountAmt = fee.discount?.amount || 0;
            const extraAmt = fee.extraCharges?.amount || 0;
            const netPayable = Math.max(0, fee.totalAmount - discountAmt + extraAmt);
            fee.balanceAmount = Math.max(0, netPayable - (fee.paidAmount || 0));

            // Adjust pending installments to sum up to remaining balance
            if (fee.installments && fee.installments.length > 0) {
                const pendingInstallments = fee.installments.filter(i => i.status === "pending");
                if (pendingInstallments.length > 0) {
                    const remainingToSplit = fee.balanceAmount;
                    const perInst = parseFloat((remainingToSplit / pendingInstallments.length).toFixed(2));
                    pendingInstallments.forEach(inst => {
                        inst.amount = perInst;
                    });
                    const pendingSum = pendingInstallments.reduce((acc, i) => acc + i.amount, 0);
                    const diff = parseFloat((remainingToSplit - pendingSum).toFixed(2));
                    if (diff !== 0) {
                        pendingInstallments[pendingInstallments.length - 1].amount += diff;
                    }
                }
            }

            if (fee.balanceAmount <= 0.01 && fee.paidAmount > 0) {
                fee.status = "paid";
            }

            await fee.save();
            updatedCount++;
        }

        await createAuditLog({
            actor: session.user.id,
            action: action === "apply" ? "fee.components.apply" : "fee.components.remove",
            resource: { type: "Batch", id: batchId },
            institute: scope.instituteId,
            details: {
                batchName: batch.name,
                componentName,
                action,
                target,
                updatedCount
            }
        });

        return NextResponse.json({
            success: true,
            message: `Successfully ${action === "apply" ? "applied" : "removed"} "${componentName}" for ${updatedCount} student(s).${skippedDueToPayments.length > 0 ? ` (${skippedDueToPayments.length} student(s) skipped because paid amount exceeds the new fee.)` : ''}`,
            skippedCount: skippedDueToPayments.length,
            updatedCount
        });

    } catch (error) {
        console.error("API Error [BulkAssignComponents]:", error);
        return NextResponse.json({ error: error.message || "Failed to update fee components" }, { status: 500 });
    }
}
