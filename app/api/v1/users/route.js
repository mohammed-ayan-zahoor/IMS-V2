import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import bcrypt from "bcryptjs";
import { getInstituteScope, addInstituteFilter } from "@/middleware/instituteScope";

export async function GET(req) {
    try {
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Allowed roles: admin, super_admin
        // Staff/Instructors might also list users? Restrict for now.
        if (!["admin", "super_admin"].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const role = searchParams.get("role");

        const query = { deletedAt: null };
        if (role) query.role = role;

        // Apply Scope
        const scopedQuery = addInstituteFilter(query, scope);

        const users = await User.find(scopedQuery)
            .select("-passwordHash")
            .populate("institute", "name code")
            .sort({ createdAt: -1 });

        return NextResponse.json({ users });

    } catch (error) {
        console.error("GET /api/v1/users error:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope || !["admin", "super_admin"].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        // Basic validation
        if (!body.email || !body.password || !body.firstName || !body.lastName || !body.role) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Institute Context
        // If Super Admin, they might specify institute in body.
        // If Admin, forced to their institute.
        let targetInstituteId = scope.instituteId;

        if (scope.isSuperAdmin && body.instituteId) {
            targetInstituteId = body.instituteId;
        }

        if (!targetInstituteId) {
            return NextResponse.json({ error: "Institute context missing" }, { status: 400 });
        }

        // Check duplicates (Scoped by Institute!)
        const normalizedEmail = body.email.toLowerCase().trim();
        const existing = await User.findOne({
            email: normalizedEmail,
            institute: targetInstituteId,
            deletedAt: null
        });

        if (existing) {
            return NextResponse.json({ error: "Email already exists in this institute" }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(body.password, 10);
        const allowedRoles = ["student", "admin", "super_admin", "instructor", "staff"];
        if (!allowedRoles.includes(body.role)) {
            return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }

        // Prevent privilege escalation
        if (body.role === "super_admin" && scope.user.role !== "super_admin") {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const userPayload = {
            email: normalizedEmail,
            passwordHash,
            role: body.role,
            profile: {
                firstName: body.firstName,
                lastName: body.lastName,
                phone: body.phone
            },
            institute: targetInstituteId,
            isActive: true
        };

        const enableTransactions = process.env.ENABLE_TRANSACTIONS === 'true' || process.env.NODE_ENV === 'production';
        let session = null;

        try {
            if (enableTransactions) {
                session = await mongoose.startSession();
                session.startTransaction();
            }

            // 1. Create User
            const createdUsers = await User.create([userPayload], { session });
            const user = createdUsers[0];

            // 2. Audit Log
            await AuditLog.create([{
                actor: scope.user.id,
                action: 'user.create',
                resource: { type: 'User', id: user._id },
                institute: targetInstituteId, // Audit Log needs institute too
                details: {
                    role: body.role,
                    name: `${body.firstName} ${body.lastName}`,
                    email: normalizedEmail
                },
                ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
                userAgent: req.headers.get('user-agent') || 'unknown'
            }], { session });

            if (session) {
                await session.commitTransaction();
            }

            // Prepare response
            const userObj = user.toObject();
            delete userObj.passwordHash;
            return NextResponse.json({ user: userObj }, { status: 201 });

        } catch (error) {
            if (session) {
                await session.abortTransaction();
            }
            console.error("User Creation Error:", error);
            throw error;
        } finally {
            if (session) {
                session.endSession();
            }
        }

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
