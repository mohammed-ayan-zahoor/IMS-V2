import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import FollowUp from "@/models/FollowUp";
import User from "@/models/User";
import { getInstituteScope } from "@/middleware/instituteScope";
import { createAuditLog } from "@/services/auditService";

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id: studentId } = await params;
        await connectDB();

        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "Institute context missing" }, { status: 400 });
        }

        // Only Admin, Staff, or Super Admin can view follow-ups
        if (!['admin', 'staff', 'super_admin', 'instructor'].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('session');

        const query = {
            student: studentId,
            institute: scope.instituteId
        };

        if (sessionId) {
            query.session = sessionId;
        }

        const followUps = await FollowUp.find(query)
        .populate('staff', 'profile fullName')
        .sort({ date: -1 })
        .lean();

        return NextResponse.json({ followUps });
    } catch (error) {
        console.error("GET Follow-ups Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id: studentId } = await params;
        const body = await req.json();

        await connectDB();
        const scope = await getInstituteScope(req);
        
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "Institute context missing" }, { status: 400 });
        }

        if (!['admin', 'staff', 'super_admin', 'instructor'].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const followUpData = {
            institute: scope.instituteId,
            student: studentId,
            staff: session.user.id,
            date: body.date || new Date(),
            method: body.method,
            status: body.status,
            response: body.response,
            nextActionDate: body.nextActionDate || null
        };

        if (body.session) {
            followUpData.session = body.session;
        }

        const followUp = await FollowUp.create(followUpData);

        // Audit Log
        await createAuditLog({
            req,
            actor: session.user.id,
            action: 'student.followup_create',
            resource: { type: 'Student', id: studentId },
            details: {
                followUpId: followUp._id,
                status: followUp.status,
                method: followUp.method
            }
        });

        return NextResponse.json({ success: true, followUp }, { status: 201 });
    } catch (error) {
        console.error("POST Follow-up Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
