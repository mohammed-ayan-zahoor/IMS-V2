import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import GatePass from "@/models/GatePass";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = session.user.role;
        const instituteId = session.user.institute?.id;

        if (!instituteId) {
            return NextResponse.json({ error: "No institute context found" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const recipientType = searchParams.get('recipientType');
        const date = searchParams.get('date');

        await connectDB();

        const query = { institute: instituteId };

        if (role === 'instructor') {
            query.$or = [
                { requestedBy: session.user.id },
                { user: session.user.id }
            ];
        } else if (!['admin', 'super_admin', 'staff'].includes(role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (status && status !== 'ALL') {
            query.status = status;
        }

        if (recipientType && recipientType !== 'ALL') {
            query.recipientType = recipientType;
        }

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            query.requestDate = { $gte: startOfDay, $lte: endOfDay };
        }

        const permissions = await GatePass.find(query)
            .populate('requestedBy', 'profile.firstName profile.lastName email role')
            .populate('approvedBy', 'profile.firstName profile.lastName email role')
            .populate('user', 'profile.firstName profile.lastName email profile.phone profile.avatar')
            .sort({ createdAt: -1 });

        return NextResponse.json({ success: true, permissions });
    } catch (error) {
        console.error("GET /api/v1/hr/permissions error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = session.user.role;
        const instituteId = session.user.institute?.id;

        if (!instituteId) {
            return NextResponse.json({ error: "No institute context found" }, { status: 400 });
        }

        if (!['instructor', 'staff', 'admin', 'super_admin'].includes(role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const {
            recipientType = 'staff',
            userId,
            studentId,
            recipientName,
            recipientDetails = {},
            requestDate,
            departureTime,
            expectedReturnTime,
            durationHours = "1 hour",
            category = 'personal_errand',
            reason,
            autoApprove = false
        } = body;

        if (!recipientName?.trim() || !departureTime || !expectedReturnTime || !reason?.trim()) {
            return NextResponse.json({ error: "Recipient name, departure time, expected return time, and reason are required." }, { status: 400 });
        }

        await connectDB();

        // Generate unique pass number: GP-YYYY-XXXXX
        const year = new Date().getFullYear();
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const passNumber = `GP-${year}-${Date.now().toString().slice(-4)}${randomSuffix.toString().slice(-2)}`;

        const isAdmin = ['admin', 'super_admin'].includes(role);
        const shouldAutoApprove = autoApprove && isAdmin;

        const gatePass = await GatePass.create({
            passNumber,
            institute: instituteId,
            recipientType,
            user: userId || (recipientType === 'staff' && !isAdmin ? session.user.id : undefined),
            student: studentId || undefined,
            recipientName: recipientName.trim(),
            recipientDetails,
            requestDate: requestDate ? new Date(requestDate) : new Date(),
            departureTime,
            expectedReturnTime,
            durationHours,
            category,
            reason: reason.trim(),
            status: shouldAutoApprove ? 'APPROVED' : 'PENDING',
            requestedBy: session.user.id,
            approvedBy: shouldAutoApprove ? session.user.id : undefined,
            approvedAt: shouldAutoApprove ? new Date() : undefined,
            adminComment: shouldAutoApprove ? "Directly authorized by Admin" : undefined
        });

        // Trigger notification for admin if submitted as pending
        if (!shouldAutoApprove) {
            try {
                const Notification = (await import("@/models/Notification")).default;
                const requesterName = session.user.name || session.user.email || "Staff Member";
                await Notification.create({
                    institute: instituteId,
                    recipientRole: "admin",
                    title: "New Out-Pass / Permission Request",
                    message: `${requesterName} requested permission for ${recipientName} (${durationHours})`,
                    type: "LEAVE_REQUEST",
                    link: "/admin/hr/leave-requests"
                });
            } catch (nErr) {
                console.error("Failed to create permission notification", nErr);
            }
        }

        return NextResponse.json({ success: true, permission: gatePass }, { status: 201 });
    } catch (error) {
        console.error("POST /api/v1/hr/permissions error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
