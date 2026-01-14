import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { StudentService } from "@/services/studentService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/services/auditService";

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;

        // Students can only access their own profile
        if (session.user.role === "student" && session.user.id !== id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectDB();

        const data = await StudentService.getStudentProfile(id, session.user.id);

        if (!data) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("API Error [Student GET]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role === "student") {
            // Students might be allowed to update some fields later, but for now restricted to admins
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();

        const { id } = await params;
        const body = await req.json();

        await connectDB();

        if (session.user.role === "instructor") {
            // Verify assignment first
            const profile = await StudentService.getStudentProfile(id, session.user.id);
            if (!profile) {
                return NextResponse.json({ error: "Unauthorized access to student" }, { status: 403 });
            }
        }

        const oldStudent = await User.findOne({ _id: id, role: "student", deletedAt: null });
        const oldStudent = await User.findOne({ _id: id, role: "student", deletedAt: null });
        if (!oldStudent) return NextResponse.json({ error: "Not found or not a student" }, { status: 404 });

        // Mass assignment protection: Allow only specific fields
        const updates = {};
        const updateableFields = {
            firstName: "profile.firstName",
            lastName: "profile.lastName",
            phone: "profile.phone",
            dateOfBirth: "profile.dateOfBirth",
            address: "profile.address",
            avatar: "profile.avatar"
        };

        Object.entries(updateableFields).forEach(([key, path]) => {
            if (body.profile?.[key] !== undefined) {
                updates[path] = body.profile[key];
            }
        });

        if (body.guardianDetails) {
            updates.guardianDetails = body.guardianDetails;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
        }

        const updatedStudent = await User.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select("-passwordHash -passwordResetToken -passwordResetExpires");

        // Prepare audit details (exclude internal fields)
        const formatForAudit = (doc) => {
            const json = doc.toJSON ? doc.toJSON() : doc;
            const { passwordHash, passwordResetToken, passwordResetExpires, ...rest } = json;
            return rest;
        };

        await createAuditLog({
            req,
            actor: session.user.id,
            action: "student.update",
            resource: { type: "Student", id },
            details: {
                before: formatForAudit(oldStudent),
                after: formatForAudit(updatedStudent)
            }
        });

        return NextResponse.json(updatedStudent);
    } catch (error) {
        console.error("API Error [Student PATCH]:", error);
        const status = error.name === 'ValidationError' ? 400 : 500;
        const message = status === 400 ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await connectDB();

        // Perform hard delete via service
        await StudentService.deleteStudent(id, session.user.id);

        return NextResponse.json({ message: "Student deleted successfully" });
    } catch (error) {
        console.error("API Error [Student DELETE]:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
