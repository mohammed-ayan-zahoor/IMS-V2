import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { clearDashboardCache } from "@/app/api/v1/dashboard/stats/route";
import { getInstituteScope } from "@/middleware/instituteScope";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Only admins can clear cache
        if (!["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json(
                { error: "Forbidden: Only admins can clear cache" },
                { status: 403 }
            );
        }

        const scope = await getInstituteScope(req);
        
        if (!scope?.instituteId) {
            return NextResponse.json(
                { error: "No institute context found" },
                { status: 404 }
            );
        }

        // Clear dashboard cache for this institute
        clearDashboardCache(scope.instituteId.toString());

        return NextResponse.json({
            message: "Dashboard cache cleared successfully",
            instituteId: scope.instituteId.toString()
        });

    } catch (error) {
        console.error("Cache clear error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to clear cache" },
            { status: 500 }
        );
    }
}
