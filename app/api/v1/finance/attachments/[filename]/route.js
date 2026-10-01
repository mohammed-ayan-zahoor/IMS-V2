import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized access to financial document" }, { status: 401 });
        }

        // Role check: Only admin, super_admin, and authorized staff may access financial receipts
        if (!['admin', 'super_admin', 'staff'].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden: You do not have permission to view financial records" }, { status: 403 });
        }

        const { filename } = await params;
        if (!filename) {
            return NextResponse.json({ error: "Missing filename" }, { status: 400 });
        }

        // Security: Prevent path traversal
        const safeFilename = path.basename(filename);
        if (safeFilename.includes("..") || safeFilename.includes("/") || safeFilename.includes("\\")) {
            return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
        }

        // Multi-tenant isolation: verify institute prefix
        const callerInstituteId = session.user.institute?.id || session.user.instituteId || session.user.institute?._id;
        const parts = safeFilename.split('_');
        if (parts.length > 1 && parts[0].length >= 10) {
            const fileTenantId = parts[0];
            if (session.user.role !== 'super_admin' && callerInstituteId && fileTenantId !== callerInstituteId.toString()) {
                return NextResponse.json({ error: "Forbidden: Access denied to foreign tenant financial record" }, { status: 403 });
            }
        }

        // Locate file in private_uploads/finance
        let filePath = path.join(process.cwd(), "private_uploads", "finance", safeFilename);
        let exists = false;
        try {
            await fs.access(filePath);
            exists = true;
        } catch {
            // Fallback to legacy private_uploads root
            const fallbackPath = path.join(process.cwd(), "private_uploads", safeFilename);
            try {
                await fs.access(fallbackPath);
                filePath = fallbackPath;
                exists = true;
            } catch {
                exists = false;
            }
        }

        if (!exists) {
            return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
        }

        const fileBuffer = await fs.readFile(filePath);

        const ext = path.extname(safeFilename).toLowerCase();
        const mimeTypes = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".gif": "image/gif",
            ".pdf": "application/pdf"
        };

        const contentType = mimeTypes[ext] || "application/octet-stream";

        const { searchParams } = new URL(req.url);
        const isDownload = searchParams.get("download") === "true";
        const disposition = isDownload ? `attachment; filename="${safeFilename}"` : `inline; filename="${safeFilename}"`;

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": disposition,
                "X-Content-Type-Options": "nosniff",
                "Cache-Control": "private, max-age=3600"
            }
        });

    } catch (error) {
        console.error("[Finance Attachment Serve Error]:", error);
        return NextResponse.json({ error: "Failed to load financial attachment" }, { status: 500 });
    }
}
