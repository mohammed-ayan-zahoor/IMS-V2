import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
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
        const normalizedEmail = body.email.toLowerCase().trim();
        const existing = await User.findOne({ email: normalizedEmail, deletedAt: null });
        if (existing) {
            return NextResponse.json({ error: "Email already exists" }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(body.password, 10);
        const allowedRoles = ["user", "admin", "super_admin"];
        if (!allowedRoles.includes(body.role)) {
            return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }

        // Prevent privilege escalation: only super_admin can create super_admin
        if (body.role === "super_admin" && session.user.role !== "super_admin") {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        /* 
         * Transactions require a replica set. For standalone/dev environments,
         * we run these sequentially. 
         */

        // 1. Create User
        const createdUser = await User.create({
            email: normalizedEmail,
            passwordHash,
            role: body.role,
            profile: {
                firstName: body.firstName,
                lastName: body.lastName,
                phone: body.phone,
            }
        });

        // 2. Audit Log (Best effort)
        try {
            await AuditLog.create({
                actor: session.user.id,
                action: 'user.create',
                resource: { type: 'User', id: createdUser._id },
                details: {
                    role: body.role,
                    name: `${body.firstName} ${body.lastName}`,
                    email: normalizedEmail
                },
                ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
                userAgent: req.headers.get('user-agent') || 'unknown'
            });
        } catch (auditError) {
            console.error("Audit log creation failed:", auditError);
            // We don't fail the request if audit log fails, but we should log it.
        }

        // Remove password from response
        const userObj = createdUser.toObject();
        delete userObj.passwordHash;

        return NextResponse.json({ user: userObj }, { status: 201 });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
