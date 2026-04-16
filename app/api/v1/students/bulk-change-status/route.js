import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { markStudentCompleted, markStudentDropped, revertStudentStatus } from "@/services/completionService";
import AuditLog from "@/models/AuditLog";

const VALID_STATUSES = ["ACTIVE", "COMPLETED", "DROPPED"];

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admins and super_admins can change student status
    if (!["admin", "super_admin"].includes(session.user.role)) {
      return Response.json(
        { error: "Forbidden: Only admins can change student status" },
        { status: 403 }
      );
    }

    const { studentIds, status, reason } = await req.json();

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return Response.json(
        { error: "studentIds array is required and must not be empty" },
        { status: 400 }
      );
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return Response.json(
        {
          error: `status must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return Response.json(
        { error: "reason is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch students
    const students = await User.find({
      _id: { $in: studentIds },
      role: "student",
    });

    if (students.length === 0) {
      return Response.json(
        { error: "No valid students found" },
        { status: 400 }
      );
    }

    // For admin role, verify institute access
    let instituteId = session.user.instituteId;
    if (session.user.role === "admin") {
      const unauthorizedCount = students.filter(
        (s) => s.institute?.toString() !== instituteId
      ).length;
      if (unauthorizedCount > 0) {
        return Response.json(
          { error: "Access denied: Some students are not in your institute" },
          { status: 403 }
        );
      }
    }

    const results = {
      successCount: 0,
      failedCount: 0,
      errors: [],
    };

    // Process each student
    for (const student of students) {
      try {
        let updated = false;

        if (status === "COMPLETED") {
          await markStudentCompleted(
            student._id,
            session.user.id,
            reason
          );
          updated = true;
        } else if (status === "DROPPED") {
          await markStudentDropped(
            student._id,
            session.user.id,
            reason
          );
          updated = true;
        } else if (status === "ACTIVE") {
          // Revert to active status
          await revertStudentStatus(
            student._id,
            session.user.id
          );
          updated = true;
        }

        if (updated) {
          results.successCount++;

          // Log action
          await AuditLog.create({
            action: "STUDENT_STATUS_CHANGED",
            entityType: "Student",
            entityId: student._id,
            userId: session.user.id,
            institute: instituteId,
            details: {
              studentName: student.name,
              oldStatus: student.status,
              newStatus: status,
              reason,
              timestamp: new Date(),
            },
          });
        }
      } catch (error) {
        results.failedCount++;
        results.errors.push({
          studentId: student._id,
          name: student.name,
          error: error.message,
        });
      }
    }

    return Response.json({
      message: `Successfully changed status for ${results.successCount} students to ${status}`,
      successCount: results.successCount,
      failedCount: results.failedCount,
      errors: results.errors,
    });
  } catch (error) {
    console.error("Bulk change status error:", error);
    return Response.json(
      { error: error.message || "Failed to change student status" },
      { status: 500 }
    );
  }
}
