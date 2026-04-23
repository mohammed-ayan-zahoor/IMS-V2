import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import IDCardTemplate from "@/models/IDCardTemplate";
import Student from "@/models/Student";
import Institute from "@/models/Institute";
import { renderIDCardFront, renderIDCardBack } from "@/services/idCardService";
import PDFDocument from "pdfkit";

export const runtime = "nodejs";

export async function POST(req) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { templateId, studentIds } = body;

        if (!templateId || !Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json(
                { error: "TemplateId and studentIds array are required" },
                { status: 400 }
            );
        }

        // Fetch template
        const template = await IDCardTemplate.findById(templateId);
        if (!template) {
            return NextResponse.json(
                { error: "Template not found" },
                { status: 404 }
            );
        }

        // Fetch students
        const students = await Student.find({ _id: { $in: studentIds } })
            .populate("batch");

        if (students.length === 0) {
            return NextResponse.json(
                { error: "No students found" },
                { status: 404 }
            );
        }

        // Fetch institute
        const institute = await Institute.findOne().lean();

        // Create PDF
        const pdfDoc = new PDFDocument({
            size: "A4",
            margin: 0
        });

        const chunks = [];
        pdfDoc.on("data", (chunk) => chunks.push(chunk));

        let pageCount = 0;

        for (let i = 0; i < students.length; i++) {
            const student = students[i];

            try {
                console.log(`[IDCardGeneration] Rendering card for student: ${student._id}`);

                // Render front and back
                const frontCanvas = await renderIDCardFront(student, template);
                const backCanvas = await renderIDCardBack(student, template, institute);

                // Convert to image
                const frontImage = frontCanvas.toDataURL("image/png");
                const backImage = backCanvas.toDataURL("image/png");

                // Add to PDF (front page)
                if (i > 0) pdfDoc.addPage();
                pdfDoc.image(frontImage, 0, 0, { width: 595, height: 842 });
                pageCount++;

                // Add back page
                pdfDoc.addPage();
                pdfDoc.image(backImage, 0, 0, { width: 595, height: 842 });
                pageCount++;

            } catch (cardError) {
                console.error(`[IDCardGeneration] Error rendering card for ${student._id}:`, cardError);
                // Continue with next student
            }
        }

        pdfDoc.end();

        // Wait for PDF to finish
        return new Promise((resolve) => {
            pdfDoc.on("end", () => {
                const pdfBuffer = Buffer.concat(chunks);

                resolve(new NextResponse(pdfBuffer, {
                    status: 200,
                    headers: {
                        "Content-Type": "application/pdf",
                        "Content-Disposition": 'attachment; filename="id-cards.pdf"',
                        "Content-Length": pdfBuffer.length
                    }
                }));
            });
        });

    } catch (error) {
        console.error("[IDCardGeneration] Error:", error);
        return NextResponse.json(
            { error: "Failed to generate ID cards", details: error.message },
            { status: 500 }
        );
    }
}
