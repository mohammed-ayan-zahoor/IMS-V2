import { NextResponse } from "next/server";
import { FeeService } from "@/services/feeService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);

        const filters = {
            batch: searchParams.get('batch'),
            course: searchParams.get('course'),
            session: searchParams.get('session') || req.headers.get('x-session-id')
        };

        // Enforce Institute Scope
        if (session.user.role !== 'super_admin' || session.user.institute?.id) {
            filters.institute = session.user.institute?.id;
        }

        const stats = await FeeService.getFeeStats(filters);
        return NextResponse.json(stats);
    } catch (error) {
        console.error("Fee Stats API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
