import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cleanupOrphanedFiles, getOrphanedFilesStats } from "@/lib/fileCleanup";

export const runtime = "nodejs";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const action = searchParams.get("action") || "stats";

        if (action === "cleanup") {
            const result = await cleanupOrphanedFiles();
            return NextResponse.json(result);
        } else if (action === "stats") {
            const stats = await getOrphanedFilesStats();
            return NextResponse.json(stats);
        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
    } catch (error) {
        console.error("Cleanup endpoint error:", error);
        return NextResponse.json(
            { error: "Operation failed", details: error.message },
            { status: 500 }
        );
    }
}
