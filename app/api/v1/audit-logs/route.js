import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // Multi-tenancy Scope
        const query = {};
        if (session.user.role !== 'super_admin') {
            if (!session.user.institute?.id) {
                return NextResponse.json({ error: "Institute context missing" }, { status: 403 });
            }
            query.institute = session.user.institute.id;
        }

        // Fetch last 100 logs
        const logs = await AuditLog.find(query)
            .populate("actor", "profile.firstName profile.lastName email role")
            .sort({ createdAt: -1 })
            .limit(100);

        return NextResponse.json({ logs });

    } catch (error) {
        console.error("Audit logs fetch error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
