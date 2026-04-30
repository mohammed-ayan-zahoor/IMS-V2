import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Certificate from "@/models/Certificate";

/**
 * @route   GET /api/v1/student/documents
 * @desc    Fetch student's personal documents and visible certificates
 */
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // 1. Fetch Student's KYC Documents from User model
        const student = await User.findById(session.user.id).select("documents institute");
        
        // 2. Fetch Visible Certificates
        const certificates = await Certificate.find({
            studentId: session.user.id,
            visibleToStudent: true,
            status: { $ne: 'REVOKED' }
        }).sort({ issueDate: -1 });

        return NextResponse.json({
            kyc: student.documents || [],
            certificates: certificates || [],
            instituteId: student.institute
        });

    } catch (error) {
        console.error("Student Documents API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
