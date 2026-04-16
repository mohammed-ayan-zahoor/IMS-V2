import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { generateCertificate } from "@/services/completionService";
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

    // Only admins and super_admins can generate certificates
    if (!["admin", "super_admin"].includes(session.user.role)) {
      return Response.json(
        { error: "Forbidden: Only admins can generate certificates" },
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

    // Fetch students to verify access and existence
    const students = await User.find({
      _id: { $in: studentIds },
      role: "student",
      status: "COMPLETED",
    });

    if (students.length === 0) {
      return Response.json(
        { error: "No completed students found" },
        { status: 400 }
      );
    }

    // For admin role, verify institute access
    let instituteId = session.user.instituteId;
    if (session.user.role === "admin") {
      // Verify all students belong to admin's institute
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
        await generateCertificate(
          student._id,
          session.user.id
        );
        results.successCount++;

        // Log action
        await AuditLog.create({
          action: "CERTIFICATE_GENERATED",
          entityType: "Certificate",
          entityId: student._id,
          userId: session.user.id,
          institute: instituteId,
          details: {
            studentName: student.name,
            studentId: student._id,
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
    console.error("Bulk generate certificates error:", error);
    return Response.json(
      { error: error.message || "Failed to generate certificates" },
      { status: 500 }
    );
  }
}
