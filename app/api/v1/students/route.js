import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StudentService } from "@/services/studentService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page")) || 1;
        const limit = parseInt(searchParams.get("limit")) || 10;
        const search = searchParams.get("search") || "";
        const showDeleted = searchParams.get("showDeleted") === "true";

        const data = await StudentService.getStudents({ page, limit, search, showDeleted });

        return NextResponse.json(data);
    } catch (error) {
        console.error("API Error [Students GET]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const body = await req.json();
        const student = await StudentService.createStudent(body, session.user.id);

        return NextResponse.json(student, { status: 201 });
    } catch (error) {
        console.error("API Error [Students POST]:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
