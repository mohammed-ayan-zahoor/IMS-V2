import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Membership from "@/models/Membership";
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
        if (!["admin", "super_admin"].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const role = searchParams.get("role");
        const targetInstParam = searchParams.get("instituteId");

        let query = { deletedAt: null };
        let memberships = [];

        // Hybrid Scoping Logic:
        // 1. Super Admin Global View: ?instituteId=all or missing param
        // 2. Focused/Admin View: Specific instituteId or forced from scope
        const isGlobalView = scope.isSuperAdmin && (!targetInstParam || targetInstParam === "all");

        if (!isGlobalView) {
            // Use active institute from scope (or param override)
            const instituteToQuery = targetInstParam && targetInstParam !== "all" ? targetInstParam : scope.instituteId;
            if (!mongoose.Types.ObjectId.isValid(instituteToQuery)) {
                return NextResponse.json({ error: "Invalid institute ID format" }, { status: 400 });
            }
            const safeInstituteId = new mongoose.Types.ObjectId(instituteToQuery);

            memberships = await Membership.find({
                institute: safeInstituteId,
                isActive: true
            }).select('user role');

            const userIdsFromMemberships = memberships.map(m => m.user);

            query = {
                $or: [
                    { _id: { $in: userIdsFromMemberships } },
                    { institute: safeInstituteId }
                ],
                deletedAt: null
            };
        }

        // Apply role filter if provided
        if (role) {
            query.role = role;
        }

        const users = await User.find(query)
            .select("-passwordHash")
            .sort({ createdAt: -1 });

        // Map users and attach roles from membership records
        const usersWithRoles = users.map(u => {
            const userObj = u.toObject();
            const memberRecord = memberships.find(m => m.user && m.user.toString() === u._id.toString());
            return {
                ...userObj,
                instituteRole: memberRecord?.role || u.role
            };
        });

        return NextResponse.json({ users: usersWithRoles });

    } catch (error) {
        console.error("GET /api/v1/users error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch users" }, { status: 500 });
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

        if (!body.email || !body.password || !body.firstName || !body.lastName || !body.role) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        let targetInstituteId = scope.instituteId;
        if (scope.isSuperAdmin && body.instituteId) {
            targetInstituteId = body.instituteId;
        }

        if (!targetInstituteId) {
            return NextResponse.json({ error: "Institute context missing" }, { status: 400 });
        }

        const allowedRoles = ["student", "admin", "instructor", "staff", "super_admin"];
        const requestedRole = body.role?.toLowerCase() || 'student';

        if (!allowedRoles.includes(requestedRole)) {
            return NextResponse.json({ error: "Invalid role provided" }, { status: 400 });
        }

        if (requestedRole === 'super_admin' && scope.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Unauthorized role assignment" }, { status: 403 });
        }

        const normalizedEmail = body.email.toLowerCase().trim();
        let user = await User.findOne({ email: normalizedEmail, deletedAt: null });

        if (user) {
            const existingMembership = await Membership.findOne({
                user: user._id,
                institute: targetInstituteId,
                isActive: true
            });

            if (existingMembership) {
                return NextResponse.json({ error: "User is already a member of this institute" }, { status: 400 });
            }

            await Membership.create({
                user: user._id,
                institute: targetInstituteId,
                role: requestedRole,
                isActive: true
            });
        } else {
            const passwordHash = await bcrypt.hash(body.password, 10);
            const userPayload = {
                email: normalizedEmail,
                passwordHash,
                role: requestedRole,
                profile: {
                    firstName: body.firstName,
                    lastName: body.lastName,
                    phone: body.phone
                },
                institute: targetInstituteId,
                isActive: true
            };

            if (requestedRole === 'instructor') {
                const batches = Array.isArray(body.assignedBatches) ? body.assignedBatches : [];
                const courses = Array.isArray(body.assignedCourses) ? body.assignedCourses : [];
                userPayload.assignments = { batches, courses };
            }

            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                [user] = await User.create([userPayload], { session });

                await Membership.create([{
                    user: user._id,
                    institute: targetInstituteId,
                    role: requestedRole,
                    isActive: true
                }], { session });
                await session.commitTransaction();
            } catch (err) {
                await session.abortTransaction();
                throw err;
            } finally {
                session.endSession();
            }
        }

        try {
            const ipAddress = getClientIp(req);
            await AuditLog.create({
                actor: scope.user.id,
                action: 'user.create',
                resource: { type: 'User', id: user._id },
                institute: targetInstituteId,
                details: {
                    role: requestedRole,
                    name: `${body.firstName} ${body.lastName}`,
                    email: normalizedEmail
                },
                ipAddress,
                userAgent: req.headers.get('user-agent') || 'unknown'
            });
        } catch (auditError) {
            console.error("Audit Log Creation Failed:", auditError);
        }

        const userObj = user.toObject();
        delete userObj.passwordHash;
        return NextResponse.json({ user: userObj }, { status: 201 });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
