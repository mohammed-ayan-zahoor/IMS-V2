import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import { StudentService } from "@/services/studentService";
import { getInstituteScope } from "@/middleware/instituteScope";
import { clearDashboardCache } from "@/app/api/v1/dashboard/stats/route";

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
    
    const scope = await getInstituteScope(req);
    if (!scope.instituteId) {
      return Response.json(
        { error: "No institute context found" },
        { status: 404 }
      );
    }

    // Fetch students
    const students = await User.find({
      _id: { $in: studentIds },
      role: "student",
      institute: scope.instituteId
    });

    if (students.length === 0) {
      return Response.json(
        { error: "No valid students found" },
        { status: 400 }
      );
    }
    
    // Verify all requested students were found (to catch any that don't belong to this institute)
    if (students.length !== studentIds.length) {
      return Response.json(
        { error: "Access denied: Some students are not in your institute" },
        { status: 403 }
      );
    }
    
    let instituteId = scope.instituteId;

    const results = {
      successCount: 0,
      failedCount: 0,
      errors: [],
    };

    // Process each student
    for (const student of students) {
      try {
        // Delete student using StudentService (which handles all cleanup)
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

    // Clear dashboard cache for this institute to reflect new student count
    clearDashboardCache(instituteId.toString());

    // If all succeeded or all failed, return appropriate status
    if (results.failedCount === 0) {
      return Response.json({
        message: `Successfully deleted ${results.successCount} students`,
        successCount: results.successCount,
        failedCount: 0,
        errors: [],
      }, { status: 200 });
    } else if (results.successCount === 0) {
      return Response.json({
        error: `Failed to delete all ${results.failedCount} students`,
        successCount: 0,
        failedCount: results.failedCount,
        errors: results.errors,
      }, { status: 500 });
    } else {
      // Partial success - return 207 Multi-Status
      return Response.json({
        message: `Deleted ${results.successCount} students, failed for ${results.failedCount}`,
        successCount: results.successCount,
        failedCount: results.failedCount,
        errors: results.errors,
      }, { status: 207 });
    }
  } catch (error) {
    console.error("Bulk delete students error:", error);
    return Response.json(
      { error: error.message || "Failed to delete students" },
      { status: 500 }
    );
  }
}
