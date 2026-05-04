import { NextResponse } from "next/server";
import { BatchService } from "@/services/courseService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized or missing context" }, { status: 401 });
        }

        const body = await req.json();
        const { sourceSessionId, targetSessionId } = body;

        if (!sourceSessionId || !targetSessionId) {
            return NextResponse.json({ error: "Source and target session IDs are required" }, { status: 400 });
        }

        // Determine target institute
        let targetInstitute = scope.instituteId;
        if (scope.isSuperAdmin && !targetInstitute) {
            targetInstitute = body.institute;
        }

        if (!targetInstitute) {
            return NextResponse.json({ error: "Institute context required" }, { status: 400 });
        }

        const clonedBatches = await BatchService.cloneBatches(sourceSessionId, targetSessionId, targetInstitute, session.user.id);
        
        return NextResponse.json({ success: true, count: clonedBatches.length }, { status: 201 });
    } catch (error) {
        console.error("POST /api/v1/batches/clone error:", error);
        return NextResponse.json({ error: error.message || "Failed to clone batches" }, { status: 400 });
    }
}
