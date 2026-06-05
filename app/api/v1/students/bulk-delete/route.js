import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import { StudentService } from "@/services/studentService";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admins and super_admins can delete students
    if (!["admin", "super_admin"].includes(session.user.role)) {
      return Response.json(
        { error: "Forbidden: Only admins can delete students" },
        { status: 403 }
      );
    }

    const { studentIds } = await req.json();

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return Response.json(
        { error: "studentIds array is required and must not be empty" },
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
        // Delete student using StudentService
        await StudentService.deleteStudent(student._id, session.user.id);

        results.successCount++;

        // Log action
        await AuditLog.create({
          action: "STUDENT_DELETED",
          entityType: "Student",
          entityId: student._id,
          userId: session.user.id,
          institute: instituteId,
          details: {
            studentName: student.profile?.firstName + " " + student.profile?.lastName || student.name,
            email: student.email,
            timestamp: new Date(),
          },
        });
      } catch (error) {
        results.failedCount++;
        results.errors.push({
          studentId: student._id,
          name: student.profile?.firstName + " " + student.profile?.lastName || student.name,
          error: error.message,
        });
      }
    }

    return Response.json({
      message: `Successfully deleted ${results.successCount} students`,
      successCount: results.successCount,
      failedCount: results.failedCount,
      errors: results.errors,
    });
  } catch (error) {
    console.error("Bulk delete students error:", error);
    return Response.json(
      { error: error.message || "Failed to delete students" },
      { status: 500 }
    );
  }
}
