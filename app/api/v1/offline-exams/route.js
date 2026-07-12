import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import OfflineExam from "@/models/OfflineExam";
import { connectDB } from "@/lib/mongodb";

export async function GET(req) {
    try {
        await connectDB();
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized or missing context" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const course = searchParams.get('course');
        const sessionFilter = searchParams.get('session');
        const status = searchParams.get('status');
        
        const query = { deletedAt: null };
        if (scope.instituteId) {
            query.institute = scope.instituteId;
        }
        
        if (course) query.course = course;
        if (sessionFilter) query.session = sessionFilter;
        if (status) query.status = status;

        const exams = await OfflineExam.find(query)
            .populate('course', 'name code')
            .populate('session', 'name')
            .populate('batches', 'name')
            .populate('subjects.subject', 'name code')
            .populate('gradingScale', 'name')
            .sort({ createdAt: -1 });
            
        return NextResponse.json({ exams });
    } catch (error) {
        console.error("API Error [OfflineExams GET]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectDB();
        const session = await getServerSession(authOptions);
        const hasAccess = session && (["admin", "super_admin"].includes(session.user.role) || 
            (session.user.role === "instructor" && session.user.permissions?.includes("manage_exams")));
        if (!hasAccess) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope || !scope.instituteId) {
            return NextResponse.json({ error: "Unauthorized or missing context" }, { status: 401 });
        }

        const body = await req.json();
        
        // Basic validation
        if (!body.title || !body.course || !body.session) {
            return NextResponse.json({ error: "Title, course, and session are required" }, { status: 400 });
        }

        const exam = await OfflineExam.create({
            ...body,
            institute: scope.instituteId,
            createdBy: session.user.id
        });

        return NextResponse.json(exam, { status: 201 });
    } catch (error) {
        console.error("API Error [OfflineExams POST]:", error);
        return NextResponse.json({ error: error.message || "Failed to create offline exam" }, { status: 400 });
    }
}
