import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Institute from "@/models/Institute";
import VoiceCallLog from "@/models/VoiceCallLog";
import User from "@/models/User"; // Ensure registered

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || session.user.role !== "super_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // 1. Fetch all institutes
        const institutes = await Institute.find({}).select('name usage notifications');

        const reports = institutes.map(inst => {
            const voiceCallsSent = inst.usage?.voiceCallsSent || 0;
            const voiceCallsQuota = inst.usage?.voiceCallsQuota || 5000;
            const enabled = inst.notifications?.overdueVoiceReminderEnabled || false;
            const estimatedCost = parseFloat((voiceCallsSent * 0.70).toFixed(2));

            return {
                id: inst._id,
                name: inst.name,
                voiceCallsSent,
                voiceCallsQuota,
                enabled,
                estimatedCost
            };
        });

        // 2. Fetch latest 10 voice call logs
        const recentLogs = await VoiceCallLog.find({})
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('institute', 'name')
            .populate('student', 'profile.firstName profile.lastName');

        const recentCalls = recentLogs.map(log => ({
            id: log._id,
            schoolName: log.institute?.name || 'Unknown School',
            studentName: log.student?.profile 
                ? `${log.student.profile.firstName} ${log.student.profile.lastName}`
                : 'Unknown Student',
            phone: log.phone,
            feeType: log.feeType,
            status: log.status,
            cost: log.cost,
            error: log.error,
            createdAt: log.createdAt
        }));

        return NextResponse.json({
            success: true,
            reports,
            recentCalls
        });

    } catch (error) {
        console.error("Voice billing reports API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
