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

        // Run counts in parallel
        const [institutes, totalUsers] = await Promise.all([
            Institute.countDocuments({}),
            User.countDocuments({})
        ]);

        // For active subscriptions, we can count institutes with status 'active' for now
        // or check the subscription.isActive field if schema supports it
        const activeSubscriptions = await Institute.countDocuments({ "subscription.isActive": true });

        return NextResponse.json({
            institutes,
            totalUsers,
            activeSubscriptions
        });

    } catch (error) {
        console.error("Stats API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
