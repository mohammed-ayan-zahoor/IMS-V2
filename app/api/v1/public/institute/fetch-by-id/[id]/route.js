import { NextResponse } from "next/server";
import Institute from "@/models/Institute";
import { connectDB } from "@/lib/mongodb";

export async function GET(req, { params }) {
    try {
        await connectDB();
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "Institute ID is required" }, { status: 400 });
        }

        const institute = await Institute.findOne({ _id: id, isActive: true })
            .select('name branding address settings.currency');

        if (!institute) {
            return NextResponse.json({ error: "Institute not found" }, { status: 404 });
        }

        return NextResponse.json({ institute });
    } catch (error) {
        console.error("[Public Institute API Error]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
