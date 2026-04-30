import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import AdmissionApplication from "@/models/AdmissionApplication";
import { StudentService } from "@/services/studentService";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();
        const { applicationId, batchId } = body;

        if (!applicationId || !batchId) {
            return NextResponse.json({ error: "Application ID and Batch ID are required" }, { status: 400 });
        }

        // 1. Fetch the application
        const application = await AdmissionApplication.findById(applicationId);
        if (!application) {
            console.error(`[CONVERSION ERROR] Application not found: ${applicationId}`);
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        console.log(`[CONVERSION START] AppID: ${applicationId}, InstID in App: ${application.institute}`);

        if (application.status === 'converted') {
            return NextResponse.json({ error: "This application has already been converted to a student" }, { status: 400 });
        }

        // 2. Map data to Student schema
        const studentData = {
            email: application.email,
            institute: application.institute, // Use the ObjectId directly from the doc
            profile: {
                firstName: application.firstName,
                lastName: application.lastName,
                phone: application.phone,
                dateOfBirth: application.dateOfBirth,
                address: application.address,
                ...(application.photo && { avatar: application.photo })
            },
            guardianDetails: {
                name: application.guardian.name,
                phone: application.guardian.phone,
                relation: application.guardian.relation.toLowerCase() // Student doc uses lowercase enum
            },
            referredBy: application.referredBy,
            // Family & Identity Mapping
            fatherName: application.fatherName,
            fatherAadhar: application.fatherAadhar,
            motherName: application.motherName,
            motherAadhar: application.motherAadhar,
            aadharNumber: application.studentAadhar
        };

        console.log(`[CONVERSION DATA] Email: ${studentData.email}, Target Inst: ${studentData.institute}`);

        // 3. Create the Student (User)
        const student = await StudentService.createStudent(studentData, session.user.id);
        
        console.log(`[CONVERSION SUCCESS] Student Created. ID: ${student._id}, Role: ${student.role}, Inst in Student: ${student.institute}`);

        // 4. Enroll in Batch
        await StudentService.enrollInBatch(
            student._id, 
            batchId, 
            session.user.id, 
            application.institute // Use the ObjectId directly
        );

        console.log(`[CONVERSION ENROLLED] BatchID: ${batchId}`);

        // 5. Mark application as converted
        application.status = 'converted';
        application.notes = application.notes ? `${application.notes}\n[System]: Converted to student on ${new Date().toLocaleString()}` : `[System]: Converted to student on ${new Date().toLocaleString()}`;
        await application.save();

        return NextResponse.json({ 
            success: true, 
            message: "Student created and enrolled successfully",
            studentId: student._id
        });

    } catch (error) {
        console.error("[Admission Conversion Error]:", error);
        return NextResponse.json({ 
            error: error.message || "An error occurred during conversion" 
        }, { status: 500 });
    }
}
