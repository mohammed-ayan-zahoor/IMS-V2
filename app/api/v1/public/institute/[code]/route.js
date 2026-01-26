import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Institute from "@/models/Institute";

export async function GET(req, { params }) {
    try {
        const { code } = await params;
        if (!code) {
            return NextResponse.json({ error: "Institute code is required" }, { status: 400 });
        }

        await connectDB();

        const institute = await Institute.findOne({
            code: code.toUpperCase(),
            isActive: true,
            deletedAt: null
        }).select("name branding.logo status");

        if (!institute) {
            return NextResponse.json({ error: "Institute not found" }, { status: 404 });
        }

        if (institute.status !== 'active') {
            return NextResponse.json({ error: "Institute is not active" }, { status: 403 });
        }

        return NextResponse.json({
            name: institute.name,
            logo: institute.branding?.logo || null
        });
    } catch (error) {
        console.error("Public Institute API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
