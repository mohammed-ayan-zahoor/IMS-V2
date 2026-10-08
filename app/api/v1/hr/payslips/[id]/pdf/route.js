import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generatePayslipPdfBuffer } from "@/services/payslipPdfService";
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
            return NextResponse.json({ error: "Invalid payslip ID" }, { status: 400 });
        }

        const instituteId = session.user?.institute?.id;
        const { pdfBuffer, filename, payslip } = await generatePayslipPdfBuffer(id, instituteId);

        // Ownership and access check: staff can only view their own
        if (session.user.role === 'staff' || session.user.role === 'instructor') {
            if (payslip.staff?._id?.toString() !== session.user.id) {
                return NextResponse.json({ error: "Forbidden: Cannot access other staff's payslip" }, { status: 403 });
            }
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
        console.error("[PAYSLIP PDF ROUTE ERROR]", error);
        return NextResponse.json({ error: error.message || "Failed to generate payslip PDF" }, { status: 500 });
    }
}
