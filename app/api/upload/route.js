import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file");
        const fileType = formData.get("fileType");

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

        const getMimeType = (buf, browserType) => {
            if (buf.length >= 4) {
                // JPEG: FF D8 FF
                if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return "image/jpeg";
                // PNG: 89 50 4E 47
                if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return "image/png";
                // GIF: 47 49 46 38
                if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
                // PDF: 25 50 44 46
                if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
                // WEBP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
                if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf.slice(8, 12).toString() === "WEBP") return "image/webp";
            }
            
            // Fallback to browser-provided type if it's one of the allowed ones
            const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
            if (browserType && allowed.includes(browserType)) return browserType;
            
            return null;
        };

        const detectedType = getMimeType(buffer, file.type);
        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];

        if (!detectedType || !allowedTypes.includes(detectedType)) {
            console.error("Invalid file type detected:", { detectedType, browserType: file.type });
            return NextResponse.json({ error: "File type not allowed or unrecognizable" }, { status: 400 });
        }

        // Special Case: Certificate Templates go to Cloudinary
        if (fileType === "certificate-template") {
            console.log("Routing to Cloudinary for certificate template...");
            try {
                const result = await uploadToCloudinary(buffer, "ims/certificate-templates");
                console.log("Cloudinary upload successful:", result.secure_url);
                return NextResponse.json({ 
                    success: true, 
                    url: result.secure_url, 
                    originalName: file.name, 
                    type: file.type,
                    provider: "cloudinary"
                });
            } catch (cloudErr) {
                console.error("Detailed Cloudinary Upload Error:", cloudErr);
                return NextResponse.json({ 
                    error: "Cloudinary upload failed", 
                    details: cloudErr.message || String(cloudErr)
                }, { status: 500 });
            }
        }

        // Default: Local Storage (for other types if needed, though Cloudinary is preferred)
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

        // Return the API route URL instead of direct /uploads/ path
        const url = `/api/uploads/files/${filename}`;

        console.log("File uploaded successfully locally:", { filename, url, filepath });

        return NextResponse.json({ success: true, url, originalName: file.name, type: file.type, provider: "local" });

    } catch (error) {
        console.error("Upload Error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
