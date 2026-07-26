import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const userId = resolvedParams.id;

        const body = await req.json();
        const { descriptor } = body;

        if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
            return NextResponse.json({ error: "Invalid face descriptor vector. Must be array of 128 numbers." }, { status: 400 });
        }

        await connectDB();

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        user.faceDescriptor = descriptor;
        user.faceEnrolledAt = new Date();
        await user.save();

        return NextResponse.json({
            message: "Face enrolled successfully",
            enrolledAt: user.faceEnrolledAt
        });
    } catch (error) {
        console.error("Save Face Descriptor Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
