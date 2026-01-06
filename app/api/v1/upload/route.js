import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const allowedMimeTypes = {
    'image': ["image/jpeg", "image/png", "image/webp", "image/gif"],
    'logo': ["image/jpeg", "image/png", "image/webp", "image/gif"],
    'document': ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
};

// Start handler
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['super_admin', 'admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file");

        if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

        const fileType = formData.get("fileType");

        if (!fileType || !Object.keys(allowedMimeTypes).includes(fileType)) {
            return NextResponse.json({ error: "Invalid or missing fileType context" }, { status: 400 });
        }

        const validTypes = allowedMimeTypes[fileType] || allowedMimeTypes.image;

        if (!validTypes.includes(file.type)) {
            // Create user-friendly error message
            const extensionsMap = {
                'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
                'application/pdf': 'pdf', 'application/msword': 'doc',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
            };
            const allowedExtensions = validTypes.map(t => extensionsMap[t] || t.split('/')[1]).join(', ');
            return NextResponse.json({ error: `Invalid file type. Allowed: ${allowedExtensions}` }, { status: 400 });
        }

        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const isDocument = allowedMimeTypes.document.includes(file.type);

        if (isDocument) {
            // Local Secure Storage for PDFs and Docs
            const uploadsDir = path.join(process.cwd(), "private_uploads");

            // Idempotent creation
            await fs.mkdir(uploadsDir, { recursive: true });

            const uniqueId = crypto.randomUUID();
            // preserve extension or default to pdf if unknown
            const ext = file.name.split('.').pop() || 'pdf';
            const filename = `${uniqueId}.${ext}`;
            const filePath = path.join(uploadsDir, filename);

            await fs.writeFile(filePath, buffer);

            const secureUrl = `/api/v1/files/${filename}`;

            return NextResponse.json({
                url: secureUrl,
                public_id: uniqueId,
                format: ext,
                type: "local_private"
            });

        } else {
            // Cloudinary for Images (Public/Visible)

            // Configure transformation based on file type
            let transformation;
            if (fileType === 'logo') {
                transformation = [{ width: 1000, height: 1000, crop: "limit" }]; // Higher quality for logos
            } else {
                transformation = [{ width: 500, height: 500, crop: "limit" }];
            }

            const uploadResponse = await new Promise((resolve, reject) => {
                const options = {
                    folder: "ims_v2/uploads",
                    resource_type: "auto",
                    transformation
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

            return NextResponse.json({
                url: uploadResponse.secure_url,
                public_id: uploadResponse.public_id
            });
        }

    } catch (error) {
        console.error("Upload Error:", error);
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
}
