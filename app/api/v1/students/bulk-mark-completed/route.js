import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { markStudentCompleted, markBatchEnrollmentCompleted } from "@/services/completionService";
import { createAuditLog } from "@/services/auditService";
import { getInstituteScope } from "@/middleware/instituteScope";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only admins and super_admins can mark students as completed
        if (!["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json(
                { error: "Forbidden: Only admins can mark students as completed" },
                { status: 403 }
            );
        }

        await connectDB();
        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { studentIds, reason, batchId } = body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json(
                { error: "studentIds array is required and must not be empty" },
                { status: 400 }
            );
        }

        if (!reason || !reason.trim()) {
            return NextResponse.json(
                { error: "reason is required" },
                { status: 400 }
            );
        }

        // Fetch students to verify access and existence
        const students = await User.find({
            _id: { $in: studentIds },
            role: "student",
            deletedAt: null
        });

        if (students.length === 0) {
            return NextResponse.json(
                { error: "No valid active students found" },
                { status: 400 }
            );
        }

        // Use scope instituteId for validation
        const targetInstituteId = scope.instituteId;
        if (!scope.isSuperAdmin) {
            // Verify all students belong to admin's institute
            const unauthorizedCount = students.filter(
                (s) => s.institute?.toString() !== targetInstituteId?.toString()
            ).length;
            
            if (unauthorizedCount > 0) {
                return NextResponse.json(
                    { error: "Access denied: Some students are not in your institute" },
                    { status: 403 }
                );
            }
        }

        let results;
        if (batchId) {
            // CASE 1: Batch-specific completion
            results = await markBatchEnrollmentCompleted(
                batchId,
                studentIds,
                session.user.id,
                reason,
                req
            );
        } else {
            // CASE 2: Global completion
            const outcome = {
                successCount: 0,
                failedCount: 0,
                errors: [],
                globalStatusUpdated: []
            };

            for (const student of students) {
                try {
                    const res = await markStudentCompleted(
                        student._id,
                        session.user.id,
                        reason,
                        req
                    );
                    
                    if (res.success) {
                        outcome.successCount++;
                        outcome.globalStatusUpdated.push({ studentId: student._id, status: 'COMPLETED' });
                    } else {
                        throw new Error(res.message);
                    }
                } catch (error) {
                    outcome.failedCount++;
                    outcome.errors.push({
                        studentId: student._id,
                        name: `${student.profile?.firstName} ${student.profile?.lastName}`,
                        error: error.message,
                    });
                }
            }
            results = { success: outcome.successCount > 0, ...outcome };
        }

        return NextResponse.json({
            message: results.success 
                ? `Successfully processed ${results.successCount} students`
                : "Failed to process students",
            ...results
        });
    } catch (error) {
        console.error("Bulk mark completed error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to mark students as completed" },
            { status: 500 }
        );
    }
}

