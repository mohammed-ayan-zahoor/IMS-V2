import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { generateCertificate } from "@/services/completionService";
import AuditLog from "@/models/AuditLog";
import { getInstituteScope } from "@/middleware/instituteScope";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (process.env.NODE_ENV === 'development') {
      console.log("=> Bulk Certificate API:", {
        hasSession: !!session,
        hasUser: !!session?.user,
        userRole: session?.user?.role,
        userInstitute: session?.user?.institute,
      });
    }

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

    const { studentIds, templateId } = await req.json();

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return Response.json(
        { error: "studentIds array is required and must not be empty" },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify institute scope
    const scope = await getInstituteScope(req);
    if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
      return Response.json(
        { error: "Unauthorized - Institute scope not verified" },
        { status: 401 }
      );
    }

    // Fetch students to verify access and existence
    const students = await User.find({
      _id: { $in: studentIds },
      role: "student",
      deletedAt: null, // Only include active (non-deleted) students
    });

    if (students.length === 0) {
      return Response.json(
        { error: "No active students found" },
        { status: 400 }
      );
    }

    // Verify all students belong to the user's institute
    if (!scope.isSuperAdmin) {
      const unauthorizedCount = students.filter(
        (s) => s.institute?.toString() !== scope.instituteId
      ).length;
      if (unauthorizedCount > 0) {
        return Response.json(
          { error: "Access denied: Some students are not in your institute" },
          { status: 403 }
        );
      }
    }

    const instituteId = scope.instituteId;

    const results = {
      successCount: 0,
      failedCount: 0,
      errors: [],
    };

    // Process each student
    for (const student of students) {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`=> Generating certificate for student: ${student._id}, status: ${student.status}`);
        }
        
         const result = await generateCertificate(
           student._id,
           session.user.id,
           'STANDARD',
           {},
           templateId,
           req
         );
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`=> Certificate generation result:`, result);
        }
        
        if (!result.success) {
          throw new Error(result.message || 'Certificate generation failed');
        }
        
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
        if (process.env.NODE_ENV === 'development') {
          console.error(`=> Certificate generation error for ${student._id}:`, error.message);
        }
        
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
