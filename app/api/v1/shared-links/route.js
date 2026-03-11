import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import SharedLink from "@/models/SharedLink";
import crypto from "crypto";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "super_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const links = await SharedLink.find({})
            .populate('institutes', 'name code')
            .sort({ createdAt: -1 });

        return NextResponse.json({ links });
    } catch (error) {
        console.error("Get Shared Links Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "super_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();

        if (!Array.isArray(body.institutes) || !body.institutes.length || !body.name?.trim()) {
            return NextResponse.json({ error: "Institutes and Name are required" }, { status: 400 });
        }

        // Generate a unique slug
        const slug = crypto.randomBytes(8).toString('hex');

        const newLink = await SharedLink.create({
            slug,
            institutes: body.institutes,
            name: body.name,
            createdBy: session.user.id,
            settings: body.settings || {}
        });

        return NextResponse.json({ success: true, link: newLink });
    } catch (error) {
        console.error("Create Shared Link Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
