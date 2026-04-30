import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Certificate from "@/models/Certificate";

/**
 * @route   DELETE /api/v1/certificates/[id]
 * @desc    Delete a specific certificate
 */
export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await connectDB();

        // Perform hard delete for mistakes/clean-up as requested
        const deletedCertificate = await Certificate.findByIdAndDelete(id);

        if (!deletedCertificate) {
            return NextResponse.json({ 
                success: false, 
                message: "Certificate not found" 
            }, { status: 404 });
        }

        return NextResponse.json({ 
            success: true, 
            message: "Certificate deleted permanently" 
        });

    } catch (error) {
        console.error("Delete Certificate Error:", error);
        return NextResponse.json({ 
            success: false, 
            message: "Internal server error" 
        }, { status: 500 });
    }
}
