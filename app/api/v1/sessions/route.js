import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getInstituteScope } from "@/middleware/instituteScope";
import Session from "@/models/Session";
import AuditLog from "@/models/AuditLog";

/**
 * GET /api/v1/sessions
 * List all sessions for the current institute
 */
export async function GET(req) {
    try {
        const userSession = await getServerSession(authOptions);
        if (!userSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope.instituteId) {
            return NextResponse.json({ error: "No institute context found" }, { status: 404 });
        }

        // Fetch all non-deleted sessions
        const sessions = await Session.find({
            instituteId: scope.instituteId,
            deletedAt: null
        })
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ sessions });
    } catch (error) {
        console.error("GET /api/v1/sessions error:", error);
        return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
    }
}

/**
 * POST /api/v1/sessions
 * Create a new session (institute admin only)
 */
export async function POST(req) {
    try {
        const userSession = await getServerSession(authOptions);
        if (!userSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);

        // Only admin or super_admin can create sessions
        if (scope.user.role !== "admin" && scope.user.role !== "super_admin") {
            return NextResponse.json({ error: "Forbidden - admin only" }, { status: 403 });
        }

        if (!scope.instituteId) {
            return NextResponse.json({ error: "No institute context found" }, { status: 404 });
        }

        const body = await req.json();

        // Validation
        if (!body.sessionName || !body.startDate || !body.endDate) {
            return NextResponse.json({ 
                error: "Missing required fields: sessionName, startDate, endDate" 
            }, { status: 400 });
        }

        // Validate session name format (e.g., "25-26")
        if (!/^\d{2}-\d{2}$/.test(body.sessionName)) {
            return NextResponse.json({ 
                error: "Invalid session name format. Use format like: 25-26" 
            }, { status: 400 });
        }

        // Validate dates
        const startDate = new Date(body.startDate);
        const endDate = new Date(body.endDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return NextResponse.json({ 
                error: "Invalid date format" 
            }, { status: 400 });
        }

        if (endDate <= startDate) {
            return NextResponse.json({ 
                error: "End date must be after start date" 
            }, { status: 400 });
        }

        // Check for duplicate session name
        const existingSession = await Session.findOne({
            instituteId: scope.instituteId,
            sessionName: body.sessionName,
            deletedAt: null
        });

        if (existingSession) {
            return NextResponse.json({ 
                error: "Session with this name already exists" 
            }, { status: 400 });
        }

        // Create new session
        const newSession = new Session({
            sessionName: body.sessionName,
            instituteId: scope.instituteId,
            startDate,
            endDate,
            isActive: false, // Default to inactive
            isLocked: true   // Sessions are immutable after creation
        });

        await newSession.save();

        // Audit log
        await AuditLog.create({
            actor: userSession.user.id,
            action: 'session.create',
            resource: { type: 'Session', id: newSession._id },
            institute: scope.instituteId,
            details: { sessionName: newSession.sessionName }
        });

        return NextResponse.json({ success: true, session: newSession });
    } catch (error) {
        console.error("POST /api/v1/sessions error:", error);
        return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }
}
