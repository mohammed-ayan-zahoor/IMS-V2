import AuditLog from "@/models/AuditLog";
import { connectDB } from "@/lib/mongodb";

export async function createAuditLog({ actor, action, resource, details, institute, req }) {
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
