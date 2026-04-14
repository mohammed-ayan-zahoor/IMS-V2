import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";
import User from "@/models/User";
import { getInstituteScope } from "@/middleware/instituteScope";

export async function GET(req) {
    try {
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const targetInstParam = searchParams.get("instituteId");

        const isGlobalView = scope.isSuperAdmin && (targetInstParam === "all" || !targetInstParam);

        const logs = await AuditLog.find(isGlobalView ? {} : { institute: scope.instituteId })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('actor', 'profile.firstName profile.lastName');

        return NextResponse.json({ activityFeed: logs });

    } catch (error) {
        console.error("Dashboard Activity Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
