import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Institute from "@/models/Institute";

export async function POST(req) {
    try {
        const body = await req.json();
        const email = body.email?.toLowerCase();
        

        // 1. Missing email check (Generic error to prevent enumeration)
        if (!email) {
            return NextResponse.json({ error: "Invalid request or resource not found" }, { status: 404 });
        }

        await connectDB();

        // 2. Find potential user with this email
        const users = await User.find({
            email,
            deletedAt: null
        }).populate({
            path: 'institute',
            select: 'name code branding status isActive deletedAt'
        });

        // 3. Filter to find the best match (active institute)
        const validUser = users.find(u =>
            u.institute &&
            u.institute.status === 'active' &&
            u.institute.isActive &&
            !u.institute.deletedAt
        );

        // 4. No valid institute check (Generic error identical to #1)
        if (!validUser) {
            return NextResponse.json({ error: "Invalid request or resource not found" }, { status: 404 });
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
