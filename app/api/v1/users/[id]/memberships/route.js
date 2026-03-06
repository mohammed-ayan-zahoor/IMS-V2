import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import Membership from "@/models/Membership";
import Institute from "@/models/Institute";

export async function GET(req, { params }) {
    try {
        await connectDB();
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        /* 
           Next.js 15+ Params are now a Promise. 
           We unwrap them here to access the 'id' property.
        */
        const { id } = await params;
        const userId = id;

        // Ensure valid ObjectId before querying
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return NextResponse.json({ memberships: [] });
        }

        const safeUserId = new mongoose.Types.ObjectId(userId);
        const memberships = await Membership.find({ user: safeUserId })
            .populate('institute', 'name code status');

        return NextResponse.json({ memberships });
    } catch (error) {
        console.error('Membership API error:', error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req, { params }) {
    try {
        await connectDB();
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const ALLOWED_ROLES = ["student", "admin", "instructor", "staff", "super_admin"];
        const { id } = await params;
        const userId = id;

        const { instituteId, role } = await req.json();

        if (!instituteId || !role) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!ALLOWED_ROLES.includes(role)) {
            return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }

        const membership = await Membership.findOneAndUpdate(
            { user: userId, institute: instituteId },
            { role, isActive: true },
            { upsert: true, new: true }
        );

        return NextResponse.json({ membership });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        await connectDB();
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');
        const { id } = await params;
        const userId = id;

        if (!instituteId) {
            return NextResponse.json({ error: "Institute ID required" }, { status: 400 });
        }

        await Membership.deleteOne({ user: userId, institute: instituteId });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
