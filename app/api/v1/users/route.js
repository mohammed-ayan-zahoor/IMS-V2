import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import bcrypt from "bcryptjs";
import { getInstituteScope, addInstituteFilter } from "@/middleware/instituteScope";
import { getClientIp } from "@/lib/ip-helper";

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

        if (process.env.NODE_ENV !== 'production') {
            console.log(`   Found ${users.length} users.`);
        }

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
        // 1. No one can create a super_admin unless they are super_admin
        if (body.role === "super_admin" && scope.user.role !== "super_admin") {
            return NextResponse.json({ error: "Insufficient permissions to create super_admin users" }, { status: 403 });
        }

        // 2. admins CAN create other admins (for their institute), but not super_admins.
        // The previous check blocked admins from creating admins, which was too strict.


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

        let user;

        try {
            // 1. Create User
            user = await User.create(userPayload);

            // 2. Audit Log (Best Effort)
            try {
                const ipAddress = getClientIp(req);
                await AuditLog.create({
                    actor: scope.user.id,
                    action: 'user.create',
                    resource: { type: 'User', id: user._id },
                    institute: targetInstituteId,
                    details: {
                        role: body.role,
                        name: `${body.firstName} ${body.lastName}`,
                        email: normalizedEmail
                    },
                    ipAddress,
                    userAgent: req.headers.get('user-agent') || 'unknown'
                });
            } catch (auditError) {
                console.error("Audit Log Creation Failed:", auditError);
                // Continue execution, do not fail user creation
            }

            // Prepare response
            const userObj = user.toObject();
            delete userObj.passwordHash;
            return NextResponse.json({ user: userObj }, { status: 201 });

        } catch (error) {
            console.error("User Creation Error:", error);
            // If user was created but something else failed (unlikely here as audit is caught), 
            // but if User.create failed, we explicitly catch it.
            throw error;
        }

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
