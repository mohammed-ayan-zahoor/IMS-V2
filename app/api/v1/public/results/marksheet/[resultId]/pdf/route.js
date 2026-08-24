import { generateMarksheetPdf } from "@/services/marksheetDocumentService";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
    try {
        const { resultId } = await params;

        if (!resultId) {
            return new Response("Marksheet result ID is required", { status: 400 });
        }

        const url = new URL(req.url);
        const baseUrl = `${url.protocol}//${url.host}`;

        const { pdfBuffer, filename } = await generateMarksheetPdf(resultId, baseUrl);

        return new Response(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${filename}"`,
                'Cache-Control': 'public, max-age=3600'
            }
        });
    } catch (error) {
        console.error("[Marksheet PDF Generation Error]:", error);
        return new Response(`Error generating marksheet PDF: ${error.message}`, { status: 500 });
    }
}
