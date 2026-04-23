import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req, { params }) {
    try {
        const { filename } = params;

        console.log("File serve request:", { filename, params });

        // Validate filename to prevent directory traversal attacks
        if (!filename || filename.includes("..") || filename.includes("/")) {
            console.error("Invalid filename validation failed:", { filename, check1: !filename, check2: filename?.includes(".."), check3: filename?.includes("/") });
            return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
        }

        const uploadDir = path.join(process.cwd(), "public/uploads");
        const filepath = path.join(uploadDir, filename);

        console.log("Attempting to serve file:", { uploadDir, filename, filepath });

        // Ensure the resolved path is within the uploads directory
        if (!filepath.startsWith(uploadDir)) {
            console.error("Path traversal attempt detected:", { filepath, uploadDir });
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

        console.log("File served successfully:", { filename, fileSize: fileBuffer.length, contentType });

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
        console.error("File serve error:", { error: error.message, code: error.code, stack: error.stack });
        return NextResponse.json({ error: "File not found or server error", details: error.message }, { status: 404 });
    }
}
