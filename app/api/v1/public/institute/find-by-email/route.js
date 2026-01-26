import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Institute from "@/models/Institute";

export async function POST(req) {
    try {
        const body = await req.json();
        const email = body.email?.toLowerCase();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        await connectDB();

        // Find potential user with this email
        const users = await User.find({
            email,
            deletedAt: null
        }).populate({
            path: 'institute',
            select: 'name code branding status isActive deletedAt'
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
            code: validUser.institute.code
        });
    } catch (error) {
        console.error("Find Institute by Email Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
