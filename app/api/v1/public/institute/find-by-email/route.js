import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Institute from "@/models/Institute";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get("email")?.toLowerCase();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        await connectDB();

        // Find an active user with this email
        // We prefer active institutes and users
        const users = await User.find({
            email,
            deletedAt: null
        }).populate({
            path: 'institute',
            select: 'name branding status isActive deletedAt'
        });

        // Filter to find the best match (active institute)
        const validUser = users.find(u =>
            u.institute &&
            u.institute.status === 'active' &&
            u.institute.isActive &&
            !u.institute.deletedAt
        );

        if (!validUser) {
            return NextResponse.json({ error: "No active institute found for this email" }, { status: 404 });
        }

        return NextResponse.json({
            name: validUser.institute.name,
            logo: validUser.institute.branding?.logo || null,
            code: validUser.institute.code // Return code so login can use it
        });
    } catch (error) {
        console.error("Find Institute by Email Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
