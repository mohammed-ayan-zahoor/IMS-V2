import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StudentService } from "@/services/studentService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await connectDB();

        const updatedStudent = await StudentService.toggleStudentStatus(id, session.user.id);

        return NextResponse.json({ 
            success: true, 
            message: updatedStudent.deletedAt ? "Student disabled successfully" : "Student enabled successfully",
            isActive: !updatedStudent.deletedAt
        });
    } catch (error) {
        console.error("API Error [Student Status Toggle]:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
