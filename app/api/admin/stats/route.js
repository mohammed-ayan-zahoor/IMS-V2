import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Institute from "@/models/Institute";
import User from "@/models/User";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || session.user.role !== "super_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfToday = new Date(now.setHours(0, 0, 0, 0));
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Run counts in parallel
        const [
            institutes,
            totalUsers,
            activeSubscriptions,
            newInstitutesThisMonth,
            newUsersToday,
            newTrials
        ] = await Promise.all([
            Institute.countDocuments({}),
            User.countDocuments({}),
            Institute.countDocuments({ "subscription.isActive": true }),
            Institute.countDocuments({ createdAt: { $gte: startOfMonth } }),
            User.countDocuments({ createdAt: { $gte: startOfToday } }),
            Institute.countDocuments({ status: 'trial', createdAt: { $gte: sevenDaysAgo } })
        ]);

        // Calculate simple trends
        const prevMonthCount = institutes - newInstitutesThisMonth;
        const institutePercentage = prevMonthCount > 0
            ? Math.round((newInstitutesThisMonth / prevMonthCount) * 100)
            : 100;

        return NextResponse.json({
            institutes,
            totalUsers,
            activeSubscriptions,
            trendInstitutes: `+${institutePercentage}% this month`,
            trendUsers: `+${newUsersToday} today`,
            trendSubscriptions: `+${newTrials} new trials`
        });

    } catch (error) {
        console.error("Stats API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
