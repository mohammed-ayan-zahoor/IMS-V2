import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import { StudentService } from "@/services/studentService";
import bcrypt from "bcryptjs";

const COMMON_PASSWORDS = ["password", "123456", "12345678", "qwerty", "welcome123", "admin123"];
const ALLOWED_ROLES = ["student", "admin", "super_admin", "instructor", "staff"]; // Adjust based on actual roles

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();

        await connectDB();
        const user = await User.findById(id);

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Handle Password Update
        if (body.password) {
            // 1. Minimum Length
            if (body.password.length < 8) {
                return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
            }
            // 2. Complexity (Upper, Lower, Digit, Special)
            const complexityRegex = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/;
            if (!complexityRegex.test(body.password)) {
                return NextResponse.json({ error: "Password must contain uppercase, lowercase, number, and special character" }, { status: 400 });
            }
            // 3. Common Password Check
            if (COMMON_PASSWORDS.includes(body.password.toLowerCase())) {
                return NextResponse.json({ error: "Password is too common/breached" }, { status: 400 });
            }

            user.passwordHash = await bcrypt.hash(body.password, 10);
        }

        // Handle Role Update
        if (body.role) {
            // Validate whitelist
            if (!ALLOWED_ROLES.includes(body.role)) {
                return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
            }

            // Only super_admin can create/promote to super_admin
            if (body.role === "super_admin" && session.user.role !== "super_admin") {
                return NextResponse.json({ error: "Insufficient permissions to assign super_admin role" }, { status: 403 });
            }
            user.role = body.role;
        }

        await user.save();

        // Audit Log
        try {
            await AuditLog.create({
                actor: session.user.id,
                action: 'user.update',
                resource: { type: 'User', id: user._id },
                details: {
                    updatedFields: Object.keys(body),
                    targetUser: user.email
                },
                ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
                userAgent: req.headers.get('user-agent') || 'unknown'
            });
        } catch (e) {
            console.error("Audit log failed", e);
        }

        return NextResponse.json({ message: "User updated successfully" });

    } catch (error) {
        console.error("Update User Error:", error);
        // Generic Error
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Prevent self-deletion (Robust String Comparison)
        if (id && session.user.id && String(id) === String(session.user.id)) {
            return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
        }

        await connectDB();
        const user = await User.findById(id);

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Prevent deleting super_admin UNLESS the deleter is also super_admin
        // Self-deletion is already blocked above. 
        if (user.role === "super_admin" && session.user.role !== "super_admin") {
            return NextResponse.json({ error: "Insufficient permissions to delete a super_admin account" }, { status: 403 });
        }

        // Special handling for Students: Hard Delete via Service
        if (user.role === "student") {
            await StudentService.deleteStudent(id, session.user.id);

            // Audit Log
            try {
                await AuditLog.create({
                    actor: session.user.id,
                    action: 'user.delete',
                    resource: { type: 'User', id: user._id },
                    details: {
                        targetUser: user.email,
                        type: 'hard-delete',
                        role: 'student'
                    },
                    ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
                    userAgent: req.headers.get('user-agent') || 'unknown'
                });
            } catch (e) {
                console.error("Audit log failed", e);
            }

            return NextResponse.json({ message: "Student permanently deleted" });
        }

        // Soft Delete for other roles (Admins/Staff)
        // isActive is a virtual based on deletedAt
        user.deletedAt = new Date();
        user.deletedBy = session.user.id;
        await user.save();

        // Audit Log
        try {
            await AuditLog.create({
                actor: session.user.id,
                action: 'user.delete',
                resource: { type: 'User', id: user._id },
                details: {
                    targetUser: user.email,
                    type: 'soft-delete'
                },
                ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
                userAgent: req.headers.get('user-agent') || 'unknown'
            });
        } catch (e) {
            console.error("Audit log failed", e);
        }

        return NextResponse.json({ message: "User deactivated successfully" });

    } catch (error) {
        console.error("Delete User Error:", error);
        // Generic Error
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
