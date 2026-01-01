import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import { StudentService } from "@/services/studentService";
import bcrypt from "bcryptjs";

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
            if (body.password.length < 6) {
                return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
            }
            user.passwordHash = await bcrypt.hash(body.password, 10);
        }

        // Handle Role Update (Optional, if needed later)
        if (body.role) {
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Prevent self-deletion
        if (id === session.user.id) {
            return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
        }

        await connectDB();
        const user = await User.findById(id);

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Prevent deleting super_admin if not super_admin
        if (user.role === "super_admin" && session.user.role !== "super_admin") {
            return NextResponse.json({ error: "Insufficient permissions to delete super_admin" }, { status: 403 });
        }

        // Special handling for Students: Hard Delete via Service
        if (user.role === "student") {
            await StudentService.deleteStudent(id, session.user.id);
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
