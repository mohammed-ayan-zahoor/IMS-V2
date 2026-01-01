import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file");

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Validate file size (e.g., 10MB limit)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json({ error: "File too large" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Magic Number Validation
        const getMimeType = (buf) => {
            if (buf.length < 4) return null;
            // JPEG: FF D8 FF
            if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return "image/jpeg";
            // PNG: 89 50 4E 47
            if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return "image/png";
            // GIF: 47 49 46 38
            if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
            // PDF: 25 50 44 46
            if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
            return null;
        };

        const detectedType = getMimeType(buffer);
        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"];

        if (!detectedType || !allowedTypes.includes(detectedType)) {
            return NextResponse.json({ error: "File type not allowed or unrecognizable" }, { status: 400 });
        }

        // Sanitize filename: remove path separators and dangerous characters
        const sanitizedName = file.name
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .replace(/\.+/g, ".")
            .substring(0, 255);

        // Ensure sanitized name has meaningful content (not just underscores/dots)
        const meaningfulPart = sanitizedName.replace(/[_.-]/g, "");
        if (meaningfulPart.length === 0) {
            return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
        }

        const filename = `${Date.now()}_${sanitizedName}`;
        const uploadDir = path.join(process.cwd(), "public/uploads");

        // Ensure directory exists
        await mkdir(uploadDir, { recursive: true });

        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, buffer);

        // Return the public URL
        const url = `/uploads/${filename}`;

        return NextResponse.json({ success: true, url, originalName: file.name, type: file.type });

    } catch (error) {
        console.error("Upload Error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
