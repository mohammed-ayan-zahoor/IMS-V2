import AuditLog from "@/models/AuditLog";
import { connectDB } from "@/lib/mongodb";

export async function createAuditLog({ actor, action, resource, details, institute, req }) {
    if (!institute) {
        // We throw to enforce compliance, or return null?
        // User said: "throw or return early on invalid input ... add unit/integration test"
        // "Require non-empty ... institute"
        // Better to error out in dev/test to catch bugs.
        // But in prod, we might not want to crash specific flows?
        // User said "throw or return early ... verify AuditLog model ... include institute".
        // I will throw to ensure developers fix the calls.
        console.error(`[AuditLog] Missing institute for action: ${action}`);
        // For safety in existing partially migrated app, maybe return null after logging error?
        // But request said "throw or return early".
        // I'll return null to prevent app crash but log Error.
        return null;
    }

    try {
        await connectDB();

        // Attempt to get IP and User Agent if req is provided
        let ipAddress = "unknown";
        let userAgent = "unknown";

        if (req) {
            const forwardedFor = req.headers.get("x-forwarded-for");
            if (forwardedFor) {
                // Extract first IP (client) from comma-separated list
                ipAddress = forwardedFor.split(",")[0].trim();
            } else {
                ipAddress = req.headers.get("x-real-ip") || "unknown";
            }
            userAgent = req.headers.get("user-agent") || "unknown";
        }

        const log = await AuditLog.create({
            actor,
            action,
            resource,
            details,
            institute, // Pass institute
            ipAddress,
            userAgent
        });

        return log;
    } catch (error) {
        console.error("Failed to create audit log:", error);
        // We don't want to crash the main app if logging fails
        return null;
    }
}
