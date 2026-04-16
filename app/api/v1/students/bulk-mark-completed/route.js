import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { markStudentCompleted } from "@/services/completionService";
import AuditLog from "@/models/AuditLog";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admins and super_admins can mark students as completed
    if (!["admin", "super_admin"].includes(session.user.role)) {
      return Response.json(
        { error: "Forbidden: Only admins can mark students as completed" },
        { status: 403 }
      );
    }

    const { studentIds, reason } = await req.json();

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return Response.json(
        { error: "studentIds array is required and must not be empty" },
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

    // Fetch students to verify access and existence
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
    let institueId = session.user.instituteId;
    if (session.user.role === "admin") {
      // Verify all students belong to admin's institute
      const unauthorizedCount = students.filter(
        (s) => s.institute?.toString() !== institueId
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
        await markStudentCompleted(
          student._id,
          session.user.id,
          reason
        );
        results.successCount++;

        // Log action
        await AuditLog.create({
          action: "STUDENT_MARKED_COMPLETED",
          entityType: "Student",
          entityId: student._id,
          userId: session.user.id,
          institute: institueId,
          details: {
            studentName: student.name,
            reason,
            timestamp: new Date(),
          },
        });
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
      message: `Successfully processed ${results.successCount} students`,
      successCount: results.successCount,
      failedCount: results.failedCount,
      errors: results.errors,
    });
  } catch (error) {
    console.error("Bulk mark completed error:", error);
    return Response.json(
      { error: error.message || "Failed to mark students as completed" },
      { status: 500 }
    );
  }
}
