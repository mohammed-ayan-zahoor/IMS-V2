import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Membership from "@/models/Membership";

export async function GET(req) {
    try {
        await connectDB();
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const memberships = await Membership.find({
            user: session.user.id,
            isActive: true
        }).populate({
            path: 'institute',
            select: 'name code branding type settings.features'
        });

        const availableInstitutes = memberships
            .filter(m => m.institute && m.institute._id)
            .map(m => ({
                id: m.institute._id.toString(),
                name: m.institute.name,
                code: m.institute.code,
                logo: m.institute.branding?.logo || null,
                role: m.role,
                type: m.institute.type
            }));

        return NextResponse.json({ availableInstitutes });
    } catch (error) {
        console.error("Failed to fetch available institutes:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
