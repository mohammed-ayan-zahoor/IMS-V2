import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateFeeReceiptPdfBuffer } from "@/services/feePdfService";
import mongoose from "mongoose";

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
        const id = resolvedParams?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid fee ID" }, { status: 400 });
        }

        const instituteId = session.user?.institute?.id;
        const { pdfBuffer, filename, fee } = await generateFeeReceiptPdfBuffer(id, instituteId);

        // Ownership and access control
        if (session.user.role === 'student' && fee.student?._id?.toString() !== session.user.id) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        return new Response(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${filename}"`,
                'Cache-Control': 'no-store, max-age=0'
            }
        });

    } catch (error) {
        console.error("Puppeteer Fee Receipt PDF Generation Error:", error);
        return NextResponse.json({ error: "Failed to generate receipt PDF: " + error.message }, { status: 500 });
    }
}
