import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req, { params }) {
    try {
        const { filename } = params;

        // Validate filename to prevent directory traversal attacks
        if (!filename || filename.includes("..") || filename.includes("/")) {
            return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
        }

        const uploadDir = path.join(process.cwd(), "public/uploads");
        const filepath = path.join(uploadDir, filename);

        // Ensure the resolved path is within the uploads directory
        if (!filepath.startsWith(uploadDir)) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Read the file
        const fileBuffer = await readFile(filepath);

        // Determine mime type from extension
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".pdf": "application/pdf"
        };

        const contentType = mimeTypes[ext] || "application/octet-stream";

        // Return file with proper headers
        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=3600", // Cache for 1 hour
                "Content-Disposition": `inline; filename="${filename}"`
            }
        });
    } catch (error) {
        console.error("File serve error:", error);
        return NextResponse.json({ error: "File not found or server error" }, { status: 404 });
    }
}
