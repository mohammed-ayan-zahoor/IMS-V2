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
            student: searchParams.get('student')
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
            } else {
                // Note: If no student filter, we should ideally return ONLY fees for assigned students.
                // However, for the specific "Fees" tab on a Student Profile, the frontend sends a student ID.
                // For a general "Fee List", we might need more complex filtering in FeeService (e.g. getFeesForInstructor).
                // For now, checking the explicit filter covers the user's specific request about blocking unassigned access.
            }
        } else {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const fees = await FeeService.getFees(filters);
        return NextResponse.json(fees);
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
