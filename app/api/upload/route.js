import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import { getCloudinaryOptions, getUploadFolder } from "@/lib/cloudinaryResolver";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // SECURITY: Extract institute ID from session ONLY
        const instituteId = session.user.institute?.id || session.user.instituteId;

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

        const allowedTypes = [
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "application/pdf",
            "font/woff", "font/woff2", "font/ttf", "font/otf", "application/font-woff", "application/font-woff2",
            "application/x-font-ttf", "application/x-font-truetype", "application/x-font-opentype", "application/vnd.ms-fontobject"
        ];

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
                // WOFF: 77 4F 46 46 (wOFF)
                if (buf[0] === 0x77 && buf[1] === 0x4F && buf[2] === 0x46 && buf[3] === 0x46) return "font/woff";
                // WOFF2: 77 4F 46 32 (wOF2)
                if (buf[0] === 0x77 && buf[1] === 0x4F && buf[2] === 0x46 && buf[3] === 0x32) return "font/woff2";
                // TTF/OTF: 00 01 00 00 or 4F 54 54 4F
                if ((buf[0] === 0x00 && buf[1] === 0x01 && buf[2] === 0x00 && buf[3] === 0x00) ||
                    (buf[0] === 0x4F && buf[1] === 0x54 && buf[2] === 0x54 && buf[3] === 0x4F)) return "font/ttf";
            }
            
            // Fallback to browser-provided type if it's one of the allowed ones
            if (browserType && allowedTypes.includes(browserType)) return browserType;
            
            return null;
        };

        const detectedType = getMimeType(buffer, file.type);

        if (!detectedType || !allowedTypes.includes(detectedType)) {
            console.error("Invalid file type detected:", { detectedType, browserType: file.type });
            return NextResponse.json({ error: "File type not allowed or unrecognizable" }, { status: 400 });
        }


        // Special Case: Certificate Templates or Website Media go to Cloudinary
        if (fileType === "certificate-template" || fileType === "website-media") {
            // Determine folder based on file type
            let uploadFolder;
            if (fileType === "certificate-template") {
                uploadFolder = "ims/certificate-templates";
            } else {
                // Website media uses tenant-specific folder
                uploadFolder = getUploadFolder(instituteId, 'website-media');
            }

            console.log(`[Upload] Routing to Cloudinary for ${fileType}...`);
            
            try {
                // Get tenant-specific Cloudinary options (thread-safe scoped injection)
                let tenantOptions = {};
                if (fileType === "website-media" && instituteId) {
                    try {
                        tenantOptions = await getCloudinaryOptions(instituteId);
                    } catch (error) {
                        console.warn(`[Upload] Failed to get tenant options, using defaults:`, error.message);
                    }
                }

                // Perform upload with scoped injection
                const uploadResult = await new Promise((resolve, reject) => {
                    const options = {
                        folder: uploadFolder,
                        resource_type: "auto",
                        ...tenantOptions  // Thread-safe scoped injection
                    };

                    const uploadStream = cloudinary.uploader.upload_stream(
                        options,
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    );
                    uploadStream.end(buffer);
                });

                console.log("[Upload] Cloudinary upload successful:", uploadResult.secure_url);

                // For website media, also register in DB
                if (fileType === "website-media") {
                    const WebsiteMedia = (await import("@/models/WebsiteMedia")).default;
                    await WebsiteMedia.create({
                        instituteId,
                        url: uploadResult.secure_url,
                        publicId: uploadResult.public_id,
                        uploadedBy: session.user.id,
                        metadata: {
                            width: uploadResult.width,
                            height: uploadResult.height,
                            fileSize: uploadResult.bytes,
                            format: uploadResult.format
                        }
                    });
                }

                return NextResponse.json({ 
                    success: true, 
                    url: uploadResult.secure_url,
                    originalName: file.name, 
                    type: file.type,
                    provider: "cloudinary",
                    institute: instituteId
                });
            } catch (cloudErr) {
                console.warn("[Upload] Cloudinary upload unavailable, falling back to local storage:", cloudErr.message);
                // Graceful fallback to local storage below
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

        console.log("[Upload] File uploaded successfully locally:", { filename, url });

        return NextResponse.json({ 
            success: true, 
            url, 
            originalName: file.name, 
            type: file.type, 
            provider: "local" 
        });

    } catch (error) {
        console.error("[Upload] Error:", error.message);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
