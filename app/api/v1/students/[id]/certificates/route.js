import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Certificate from "@/models/Certificate";

/**
 * @route   GET /api/v1/students/[id]/certificates
 * @desc    Get all certificates issued to a specific student
 */
export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: studentId } = await params;
        await connectDB();

        const certificates = await Certificate.find({ 
            studentId,
            status: { $ne: 'REVOKED' }
        })
        .select('certificateNumber template metadata issueDate pdfUrl visibleToStudent status')
        .sort({ issueDate: -1 });

        return NextResponse.json({ success: true, certificates });

    } catch (error) {
        console.error("Fetch Student Certificates Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
