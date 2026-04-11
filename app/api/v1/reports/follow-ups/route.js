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

        if (!['admin', 'staff', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const now = new Date();
        now.setHours(23, 59, 59, 999); // Include all of today

        // 1. Fetch Enquiries
        const enquiries = await Enquiry.find({
            institute: scope.instituteId,
            status: 'Pending',
            followUpDate: { $lte: now }
        })
        .populate('course', 'name')
        .sort({ followUpDate: 1 })
        .lean();

        // 2. Fetch Student Follow-ups
        // Note: We want the LATEST follow-up record for each student that has a nextActionDate due
        // However, for a "Queue", showing all due reminders is also fine.
        const studentFollowUps = await FollowUp.find({
            institute: scope.instituteId,
            nextActionDate: { $lte: now }
        })
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
