import { getMarksheetContext, buildMarksheetHtml } from "@/services/marksheetDocumentService";

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
    try {
        const { resultId } = await params;

        if (!resultId) {
            return new Response("Marksheet result ID is required", { status: 400 });
        }

        const url = new URL(req.url);
        const baseUrl = `${url.protocol}//${url.host}`;

        const context = await getMarksheetContext(resultId, baseUrl);
        const html = buildMarksheetHtml(context);

        return new Response(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=3600'
            }
        });
    } catch (error) {
        console.error("[Marksheet HTML Generation Error]:", error);
        return new Response(`Error rendering marksheet: ${error.message}`, { status: 500 });
    }
}
