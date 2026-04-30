import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { issueCertificate } from "@/services/certificateService";
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

    const { studentIds, templateId, batchId, visibleToStudent, metadata, isDuplicate } = await req.json();

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return Response.json(
        { error: "studentIds array is required and must not be empty" },
        { status: 400 }
      );
    }

    if (!batchId) {
      return Response.json(
        { error: "batchId is required to specify which course the certificates are for" },
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
      skippedCount: 0,
      errors: [],
      certificates: [], 
    };

    // 1. Pre-fetch existing certificates
    const Certificate = (await import("@/models/Certificate")).default;
    const existingCertificates = await Certificate.find({
        studentId: { $in: studentIds },
        institutionId: instituteId,
        "template.templateId": templateId,
        status: { $ne: 'REVOKED' }
    }).select('studentId');

    const existingStudentIds = new Set(existingCertificates.map(c => c.studentId.toString()));

    // 2. Launch a single browser instance for the entire bulk operation
    const puppeteer = (await import('puppeteer')).default;
    let sharedBrowser = null;
    
    try {
      sharedBrowser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      // Process students in parallel batches to speed up generation
      const BATCH_SIZE = 5; // Process 5 students at a time
      for (let i = 0; i < students.length; i += BATCH_SIZE) {
        const currentBatch = students.slice(i, i + BATCH_SIZE);
        
        await Promise.all(currentBatch.map(async (student) => {
          try {
            // SKIP logic to save Cloudinary credits
            if (!isDuplicate && existingStudentIds.has(student._id.toString())) {
              results.skippedCount++;
              return;
            }

            const certificate = await issueCertificate(
              student._id,
              instituteId,
              templateId,
              { 
                batchId,
                visibleToStudent,
                metadata,
                isDuplicate,
                browser: sharedBrowser // PASS THE SHARED BROWSER
              }
            );
            
            if (!certificate) {
              throw new Error('Certificate generation failed');
            }
            
            results.successCount++;
            results.certificates.push({
              studentId: student._id,
              certificateId: certificate._id,
              batchId: batchId
            });

            await AuditLog.create({
              action: "certificate.generate",
              resource: { type: "Student", id: student._id },
              actor: session.user.id,
              institute: instituteId,
              details: {
                studentName: student.fullName || student.name,
                studentId: student._id,
                timestamp: new Date(),
              },
            });
          } catch (error) {
            results.failedCount++;
            results.errors.push({
              studentId: student._id,
              name: student.fullName || student.name,
              error: error.message,
            });
          }
        }));
      }
    } finally {
      if (sharedBrowser) await sharedBrowser.close();
    }

    return Response.json({
      message: `Processed ${students.length} students`,
      successCount: results.successCount,
      failedCount: results.failedCount,
      skippedCount: results.skippedCount,
      errors: results.errors,
      certificates: results.certificates,
    });
  } catch (error) {
    console.error("Bulk generate certificates error:", error);
    return Response.json(
      { error: error.message || "Failed to generate certificates" },
      { status: 500 }
    );
  }
}
