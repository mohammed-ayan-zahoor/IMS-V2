import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import { createAuditLog } from "@/services/auditService";

/**
 * @route   GET /api/v1/events
 * @desc    Get all calendar events for the institute (Admin/Instructor View)
 */
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin', 'instructor'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { searchParams } = new URL(req.url);
        const reqInstituteId = searchParams.get('instituteId');
        let instituteId = session.user.institute?.id;
        if (session.user.role === 'super_admin') {
            instituteId = reqInstituteId || session.user.institute?.id;
        } else if (reqInstituteId && reqInstituteId.toString() !== session.user.institute?.id?.toString()) {
            return NextResponse.json({ error: "Forbidden: Cannot access another institute's calendar" }, { status: 403 });
        }

        if (!instituteId) {
            return NextResponse.json({ events: [] });
        }

        const events = await Event.find({ 
            institute: instituteId,
            deletedAt: null
        }).sort({ startDate: 1 });

        return NextResponse.json({ events });
    } catch (error) {
        console.error("Fetch Events API Error:", error);
        return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
    }
}

/**
 * @route   POST /api/v1/events
 * @desc    Create a new calendar event
 */
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        const hasAccess = session && (['admin', 'super_admin'].includes(session.user.role) || 
            (session.user.role === 'instructor' && session.user.permissions?.includes('manage_events')));
        if (!hasAccess) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { title, description, startDate, endDate, category, target, targetIds, instituteId: reqInstituteId } = body;

        if (!title || !startDate || !endDate) {
            return NextResponse.json({ error: "Missing required fields: title, startDate, and endDate are required." }, { status: 400 });
        }

        await connectDB();
        let targetInstitute = session.user.institute?.id;
        if (session.user.role === 'super_admin') {
            targetInstitute = reqInstituteId || session.user.institute?.id;
        } else if (reqInstituteId && reqInstituteId.toString() !== session.user.institute?.id?.toString()) {
            return NextResponse.json({ error: "Forbidden: Cannot create events for another institute" }, { status: 403 });
        }

        if (!targetInstitute) {
            return NextResponse.json({ error: "Institute ID is required" }, { status: 400 });
        }

        const event = await Event.create({
            title,
            description,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            category: category || 'general',
            target: target || 'all',
            targetIds: targetIds || [],
            institute: targetInstitute,
            createdBy: session.user.id
        });

        // Safe audit log creation
        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'event.create',
                resource: { type: 'Event', id: event._id },
                institute: session.user.institute.id,
                details: { title: event.title, category: event.category, startDate }
            });
        } catch (auditErr) {
            console.error("=> Failed to create event audit log:", auditErr);
        }

        return NextResponse.json({ message: "Event created successfully", event });
    } catch (error) {
        console.error("Create Event API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
