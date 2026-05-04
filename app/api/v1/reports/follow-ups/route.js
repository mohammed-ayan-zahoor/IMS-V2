import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Enquiry from "@/models/Enquiry";
import FollowUp from "@/models/FollowUp";
import { getInstituteScope } from "@/middleware/instituteScope";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const scope = await getInstituteScope(req);
        
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "Institute context missing" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('session');
        const showAllSessions = searchParams.get('allSessions') === 'true';

        const now = new Date();
        now.setHours(23, 59, 59, 999); // Include all of today

        // 1. Fetch Enquiries (Enquiries don't have session yet, but we could add it later)
        const enquiries = await Enquiry.find({
            institute: scope.instituteId,
            status: 'Pending',
            followUpDate: { $lte: now }
        })
        .populate('course', 'name')
        .sort({ followUpDate: 1 })
        .lean();

        // 2. Fetch Student Follow-ups
        const studentFollowUpQuery = {
            institute: scope.instituteId,
            nextActionDate: { $lte: now }
        };

        // If session is provided and not showing all, filter by it
        // Or if session is NOT provided, we might want to default to current session for SCHOOLS
        // But for the "Queue", maybe showing ALL is better unless filtered.
        if (sessionId && !showAllSessions) {
            studentFollowUpQuery.session = sessionId;
        }

        const studentFollowUps = await FollowUp.find(studentFollowUpQuery)
        .populate('student', 'profile fullName enrollmentNumber')
        .sort({ nextActionDate: 1 })
        .lean();

        // 3. Unify the data
        const queue = [
            ...enquiries.map(e => ({
                id: e._id,
                name: e.studentName,
                contact: e.contactNumber,
                type: 'Enquiry',
                subType: e.course?.name || 'General',
                dueDate: e.followUpDate,
                lastResponse: e.notes || 'No notes available',
                link: `/admin/enquiries` // Link to enquiry list or specific modal if available
            })),
            ...studentFollowUps.map(f => ({
                id: f._id,
                name: f.student?.fullName || 'Student',
                contact: f.student?.profile?.phone || 'N/A',
                type: 'Student',
                subType: f.student?.enrollmentNumber || 'Existing',
                dueDate: f.nextActionDate,
                lastResponse: f.response,
                link: `/admin/students/${f.student?._id}?tab=follow-ups`
            }))
        ];

        // Sort combined queue by due date (overdue first)
        queue.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        return NextResponse.json({ 
            queue,
            stats: {
                total: queue.length,
                enquiries: enquiries.length,
                students: studentFollowUps.length,
                overdue: queue.filter(item => new Date(item.dueDate) < new Date().setHours(0,0,0,0)).length
            }
        });

    } catch (error) {
        console.error("GET Follow-up Queue Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
