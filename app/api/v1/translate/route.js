import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { translateText } from "@/services/translationService";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { text, targetLang = 'kn' } = body;

        if (!text || typeof text !== 'string') {
            return NextResponse.json({ error: "Missing text to translate" }, { status: 400 });
        }

        const translated = await translateText(text, targetLang);
        return NextResponse.json({
            originalText: text,
            targetLang,
            translatedText: translated
        });

    } catch (error) {
        console.error("Translate API Error:", error);
        return NextResponse.json({ error: "Failed to translate text" }, { status: 500 });
    }
}
