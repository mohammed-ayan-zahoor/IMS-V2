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

        // Fetch last 100 logs
        const logs = await AuditLog.find({})
            .populate("actor", "profile.firstName profile.lastName email role")
            .sort({ createdAt: -1 })
            .limit(100);

        return NextResponse.json({ logs });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
