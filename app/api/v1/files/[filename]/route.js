import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { filename } = await params;

        // Security: Prevent directory traversal
        const safeFilename = path.basename(filename);

        // ponytail: Strict tenant isolation for private files
        const callerInstituteId = session.user.institute?.id || session.user.instituteId || session.user.institute?._id;

        // 1. Prefix-based isolation: <instituteId>_<uuid>.<ext>
        const parts = safeFilename.split('_');
        if (parts.length > 1 && parts[0].length >= 10) {
            const fileTenantId = parts[0];
            if (session.user.role !== 'super_admin' && fileTenantId !== callerInstituteId?.toString()) {
                return NextResponse.json({ error: "Forbidden: Access denied to foreign tenant file" }, { status: 403 });
            }
        } else if (session.user.role !== 'super_admin') {
            // 2. Legacy fallback: check material or document reference in MongoDB
            try {
                const Material = (await import("@/models/Material")).default;
                const material = await Material.findOne({
                    "file.url": { $regex: safeFilename },
                    deletedAt: null
                }).select("institute");

                if (material && material.institute && callerInstituteId && material.institute.toString() !== callerInstituteId.toString()) {
                    return NextResponse.json({ error: "Forbidden: Access denied to foreign tenant file" }, { status: 403 });
                }
            } catch (dbErr) {
                console.error("File tenant verification error:", dbErr);
            }
        }

        const filePath = path.join(process.cwd(), "private_uploads", safeFilename);

        try {
            await fs.access(filePath);
        } catch {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        const fileBuffer = await fs.readFile(filePath);

        // Determine content type manually to avoid external dependencies
        const ext = path.extname(safeFilename).toLowerCase();
        let contentType = "application/octet-stream";

        const mimeTypes = {
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
            ".gif": "image/gif",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".doc": "application/msword"
        };

        if (mimeTypes[ext]) {
            contentType = mimeTypes[ext];
        }

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `attachment; filename="${safeFilename}"`,
                "X-Content-Type-Options": "nosniff",
                "Cache-Control": "private, max-age=3600"
            }
        });

    } catch (error) {
        console.error("File Serve Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
