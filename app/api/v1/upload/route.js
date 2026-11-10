import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import { getCloudinaryOptions, getUploadFolder } from "@/lib/cloudinaryResolver";

const allowedMimeTypes = {
    'image': ["image/jpeg", "image/png", "image/webp", "image/gif"],
    'logo': ["image/jpeg", "image/png", "image/webp", "image/gif"],
    'document': [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "text/csv",
        "application/zip",
        "application/x-zip-compressed",
        "image/jpeg",
        "image/png",
        "image/webp"
    ],
    'video': [
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/x-matroska",
        "video/mpeg"
    ]
};

// Start handler
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['super_admin', 'admin', 'instructor', 'staff', 'student'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // SECURITY: Extract instituteId from session (never from query params)
        const instituteId = session.user.institute?.id || session.user.instituteId;
        if (!instituteId) {
            return NextResponse.json({ error: "No institute context" }, { status: 400 });
        }

        const formData = await req.formData();
        const file = formData.get("file");

        if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

        const fileType = formData.get("fileType") || 'document';

        if (!fileType || !Object.keys(allowedMimeTypes).includes(fileType)) {
            return NextResponse.json({ error: "Invalid or missing fileType context" }, { status: 400 });
        }

        const validTypes = allowedMimeTypes[fileType] || allowedMimeTypes.document;

        if (!validTypes.includes(file.type)) {
            const extensionsMap = {
                'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
                'application/pdf': 'pdf', 'application/msword': 'doc',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
            };
            const allowedExtensions = validTypes.map(t => extensionsMap[t] || t.split('/')[1]).join(', ');
            return NextResponse.json({ error: `Invalid file type. Allowed: ${allowedExtensions}` }, { status: 400 });
        }

        if (file.size > 25 * 1024 * 1024) {
            return NextResponse.json({ error: "File size exceeds 25MB limit" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Resolve Institute's custom Cloudinary credentials (thread-safe scoped injection)
        // If not configured, getCloudinaryOptions returns {} and falls back to platform IMS credentials
        let tenantOptions = {};
        try {
            tenantOptions = await getCloudinaryOptions(instituteId);
        } catch (error) {
            console.warn(`[Upload] Failed to get tenant Cloudinary options for ${instituteId}, using platform defaults:`, error.message);
        }

        // Determine destination folder
        const subFolder = (fileType === 'document' || fileType === 'video') ? 'materials' : 'uploads';
        const uploadFolder = getUploadFolder(instituteId, subFolder);

        // Configure transformation and resource_type
        let transformation;
        let resourceType = "auto";

        if (fileType === 'logo') {
            transformation = [{ width: 1000, height: 1000, crop: "limit" }];
        } else if (fileType === 'image') {
            transformation = [{ width: 1200, height: 1200, crop: "limit" }];
        }

        // Upload directly to Cloudinary
        const uploadResponse = await new Promise((resolve, reject) => {
            const options = {
                folder: uploadFolder,
                resource_type: resourceType,
                transformation,
                ...tenantOptions
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
            success: true,
            url: uploadResponse.secure_url,
            public_id: uploadResponse.public_id,
            format: uploadResponse.format,
            bytes: uploadResponse.bytes,
            institute: instituteId
        });

    } catch (error) {
        console.error("[Upload Error]:", error.message);
        return NextResponse.json({ error: "Failed to upload file to Cloudinary" }, { status: 500 });
    }
}
