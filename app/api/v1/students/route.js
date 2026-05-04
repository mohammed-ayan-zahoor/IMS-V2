import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StudentService } from "@/services/studentService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import { validateAndDeriveSession, logSessionAccess } from "@/middleware/sessionValidation";
import Institute from "@/models/Institute";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || !["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { searchParams } = new URL(req.url);
        const targetInstParam = searchParams.get("instituteId");

        // Global View Logic: 
        // 1. Super Admin + (instituteId='all' OR no instituteId provided)
        const isGlobalView = scope.isSuperAdmin && (!targetInstParam || targetInstParam === "all");

        const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
        const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get("limit")) || 10));
        const search = searchParams.get("search") || "";
        const showDeleted = searchParams.get("showDeleted") === "true";
        const batchId = searchParams.get("batchId");
        const courseId = searchParams.get("courseId");
        const isActive = searchParams.get("isActive");
        const status = searchParams.get("status");
        const templateId = searchParams.get("templateId");

        let instituteType = null;
        let sessionId = null;
        let sessionValidationResult = null;

        const targetInstituteId = isGlobalView ? null : (targetInstParam || scope.instituteId);

        // SECURITY FIX: Server-side session derivation & validation
        // Do NOT trust client-provided x-session-id header
        if (targetInstituteId && !isGlobalView) {
            try {
                // First validate institute exists
                const inst = await Institute.findById(targetInstituteId).select('type code');
                if (!inst) {
                    return NextResponse.json({ error: "Institute not found" }, { status: 404 });
                }
                instituteType = inst.type;

                const sessionResult = await validateAndDeriveSession(req, {
                    ...scope,
                    instituteId: targetInstituteId
                });
                
                sessionId = sessionResult.sessionId;
                instituteType = sessionResult.instituteType;

                // Log session access for audit trail
                await logSessionAccess(session.user.id, targetInstituteId, sessionId, 'student_fetch');
            } catch (err) {
                console.error("[SESSION_ERROR]", err.message);
                // Fail closed for Schools
                return NextResponse.json({ error: err.message }, { status: 403 });
            }
        }

        const data = await StudentService.getStudents({
            page,
            limit,
            search,
            showDeleted,
            batchId,
            courseId,
            isActive,
            status,
            templateId,
            instituteId: targetInstituteId,
            sessionId: sessionId,
            instituteType,
            actorId: session.user.id,
            skipSessionValidation: true // We already validated in the route
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error("API Error [Students GET]:", error);
        return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        // Basic validation check
        if (!body.email || !body.profile?.firstName || !body.profile?.lastName) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Super admins must explicitly specify target institute via query param or validated field
        let targetInstituteId;
        if (scope.isSuperAdmin) {
            // Require explicit institute specification for super admins
            targetInstituteId = body.institute;
            if (!targetInstituteId) {
                return NextResponse.json({ error: "Super admins must specify target institute" }, { status: 400 });
            }
        } else {
            targetInstituteId = scope.instituteId;
        }

        const studentData = {
            ...body,
            institute: targetInstituteId
        };

        // SECURITY FIX: Server-side session derivation for student creation
        let sessionId = null;
        let instituteType = null;

        try {
            // Get institute type to know if session isolation applies
            const inst = await Institute.findById(targetInstituteId).select('type');
            if (!inst) {
                return NextResponse.json({ error: "Institute not found" }, { status: 404 });
            }
            instituteType = inst.type;

            // Derive session server-side
            const sessionValidationResult = await validateAndDeriveSession(req, {
                ...scope,
                instituteId: targetInstituteId
            });

            // PRIORITY: Use explicitly selected sessionId from form if provided, otherwise fallback to derived session
            sessionId = body.sessionId || sessionValidationResult.sessionId;

            // If a manual sessionId was provided, verify it belongs to this institute
            if (body.sessionId) {
                const Session = (await import("@/models/Session")).default;
                const validSession = await Session.findOne({
                    _id: body.sessionId,
                    instituteId: targetInstituteId,
                    deletedAt: null
                });
                if (!validSession) {
                    return NextResponse.json({ error: "The selected academic session is invalid for this institute" }, { status: 400 });
                }
                sessionId = validSession._id;
            }

            // For SCHOOL institutes, session is required
            if (instituteType === 'SCHOOL' && !sessionId) {
                return NextResponse.json(
                    { error: "Cannot create student: No valid session found. Ensure there is an active session for this SCHOOL institute." },
                    { status: 403 }
                );
            }

            // Log session access
            await logSessionAccess(session.user.id, targetInstituteId, sessionId, 'student_create');

        } catch (validationError) {
            console.error('[SECURITY] Session validation failed during student creation:', validationError.message);
            // Fail closed for SCHOOL institutes
            if (instituteType === 'SCHOOL') {
                return NextResponse.json(
                    { error: `Session validation failed: ${validationError.message}` },
                    { status: 403 }
                );
            }
        }

        const student = await StudentService.createStudent(studentData, session.user.id, sessionId);

        return NextResponse.json(student, { status: 201 });
    } catch (error) {
        console.error("API Error [Students POST]:", error);
        const message = error.message || "Failed to create student";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
