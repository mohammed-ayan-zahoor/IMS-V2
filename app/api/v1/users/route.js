import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { searchParams } = new URL(req.url);
        const role = searchParams.get("role");

        const query = { deletedAt: null };
        if (role) query.role = role;

        const users = await User.find(query)
            .select("-passwordHash")
            .sort({ createdAt: -1 });

        return NextResponse.json({ users });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();

        // Basic validation
        if (!body.email || !body.password || !body.firstName || !body.lastName || !body.role) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check duplicates
        const existing = await User.findOne({ email: body.email.toLowerCase(), deletedAt: null });
        if (existing) {
            return NextResponse.json({ error: "Email already exists" }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(body.password, 10);

        const newUser = await User.create({
            email: body.email,
            passwordHash,
            role: body.role,
            profile: {
                firstName: body.firstName,
                lastName: body.lastName,
                phone: body.phone,
            }
        });

        // Remove password from response
        const userObj = newUser.toObject();
        delete userObj.passwordHash;

        return NextResponse.json({ user: userObj }, { status: 201 });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
