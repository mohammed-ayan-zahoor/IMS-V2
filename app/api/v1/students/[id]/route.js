import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/services/auditService";

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = params;

        // Students can only access their own profile
        if (session.user.role === "student" && session.user.id !== id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectDB();
        const student = await User.findOne({ _id: id, role: "student" });

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        return NextResponse.json(student);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role === "student") {
            // Students might be allowed to update some fields later, but for now restricted to admins
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;
        const body = await req.json();

        await connectDB();

        const oldStudent = await User.findById(id);
        if (!oldStudent) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const updatedStudent = await User.findByIdAndUpdate(
            id,
            { $set: body },
            { new: true, runValidators: true }
        );

        await createAuditLog({
            actor: session.user.id,
            action: "student.update",
            resource: { type: "User", id },
            details: { before: oldStudent, after: updatedStudent }
        });

        return NextResponse.json(updatedStudent);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;
        await connectDB();

        // Soft delete
        const student = await User.findByIdAndUpdate(id, {
            deletedAt: new Date(),
            deletedBy: session.user.id
        });

        await createAuditLog({
            actor: session.user.id,
            action: "student.delete",
            resource: { type: "User", id },
            details: { name: student?.fullName }
        });

        return NextResponse.json({ message: "Student deactivated successfully" });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
