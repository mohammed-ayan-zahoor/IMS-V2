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
            ".gif": "image/gif"
        };

        if (mimeTypes[ext]) {
            contentType = mimeTypes[ext];
        }

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `inline; filename="${safeFilename}"`,
                "Cache-Control": "private, max-age=3600"
            }
        });

    } catch (error) {
        console.error("File Serve Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
