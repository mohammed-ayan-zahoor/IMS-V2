import { NextResponse } from "next/server";
import { FeeService } from "@/services/feeService";
import { StudentService } from "@/services/studentService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);

        const filters = {
            batch: searchParams.get('batch'),
            status: searchParams.get('status'),
            student: searchParams.get('student'),
            course: searchParams.get('course'),
            percentage: searchParams.get('percentage'),
            includeAll: searchParams.get('includeAll') === 'true',
            includeCancelled: searchParams.get('includeCancelled') === 'true',
            session: searchParams.get('session') || req.headers.get('x-session-id'),
            page: searchParams.get('page') || 1,
            limit: searchParams.get('limit') || 50,
            search: searchParams.get('search') || ""
        };

        // Enforce Institute Scope
        if (session.user.role === 'admin') {
            if (!session.user.institute?.id) {
                return NextResponse.json({ error: "Admin has no institute context" }, { status: 403 });
            }
            filters.institute = session.user.institute.id;
        } else if (session.user.role === 'student') {
            filters.student = session.user.id;
            if (session.user.institute?.id) {
                filters.institute = session.user.institute.id;
            }
        } else if (session.user.role === 'super_admin') {
            if (session.user.institute?.id) {
                filters.institute = session.user.institute.id;
            }
        } else if (session.user.role === 'instructor') {
            if (!session.user.institute?.id) {
                return NextResponse.json({ error: "Instructor has no institute context" }, { status: 403 });
            }
            filters.institute = session.user.institute.id;
            // Security: If specific student is requested, verify assignment
            if (filters.student) {
                const isAssigned = await StudentService.verifyInstructorAccess(session.user.id, filters.student);
                if (!isAssigned) {
                    return NextResponse.json({ error: "Forbidden: You are not assigned to this student" }, { status: 403 });
                }
            }
        } else {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const useExtendedQuery = filters.includeAll || filters.percentage || filters.course;
        const result = useExtendedQuery
            ? await FeeService.getFeesWithStudents(filters)
            : await FeeService.getFees(filters);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Fee API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const fee = await FeeService.createFeeStructure(body, session.user.id);
        return NextResponse.json(fee, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
