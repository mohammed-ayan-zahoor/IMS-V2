import { NextResponse } from 'next/server';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const text = searchParams.get('text') || 'Hello, this is an automated reminder from your institute.';

        // ExOML (Exotel XML format) for Text-to-Speech
        const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="female" language="en-IN">${text}</Say>
</Response>`;

        return new NextResponse(xmlContent, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    } catch (error) {
        console.error("GET /api/v1/telephony/voice-xml error:", error);
        return new NextResponse('<Response><Say>System error in voice generator.</Say></Response>', {
            status: 500,
            headers: { 'Content-Type': 'application/xml' }
        });
    }
}

// Support POST as well, since some telephony webhooks call POST
export async function POST(req) {
    return GET(req);
}
