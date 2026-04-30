import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Certificate from "@/models/Certificate";

/**
 * @route   PATCH /api/v1/certificates/[id]/toggle-visibility
 * @desc    Toggle student visibility for a specific certificate
 */
export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const { id } = await params;
        const certificate = await Certificate.findById(id);
        if (!certificate) {
            return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
        }

        certificate.visibleToStudent = !certificate.visibleToStudent;
        await certificate.save();

        return NextResponse.json({
            success: true,
            visibleToStudent: certificate.visibleToStudent,
            message: `Certificate is now ${certificate.visibleToStudent ? 'visible' : 'hidden'} for the student.`
        });

    } catch (error) {
        console.error("Toggle Visibility API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
