import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf"
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES_PER_REQUEST = 10;

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin', 'staff'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized access to financial uploads" }, { status: 401 });
        }

        const instituteId = session.user.institute?.id || session.user.instituteId || session.user.institute?._id;
        if (!instituteId && session.user.role !== 'super_admin') {
            return NextResponse.json({ error: "No institute context" }, { status: 400 });
        }

        const formData = await req.formData();
        
        // Accept both "files" (multiple) and "file" (single)
        let incomingFiles = formData.getAll("files");
        if (!incomingFiles || incomingFiles.length === 0) {
            const single = formData.get("file");
            if (single) incomingFiles = [single];
        }

        if (!incomingFiles || incomingFiles.length === 0) {
            return NextResponse.json({ error: "No files provided" }, { status: 400 });
        }

        if (incomingFiles.length > MAX_FILES_PER_REQUEST) {
            return NextResponse.json({ error: `Cannot upload more than ${MAX_FILES_PER_REQUEST} files at once` }, { status: 400 });
        }

        const uploadsDir = path.join(process.cwd(), "private_uploads", "finance");
        await fs.mkdir(uploadsDir, { recursive: true });

        const savedAttachments = [];

        for (const file of incomingFiles) {
            if (!file || typeof file === "string") continue;

            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json({ error: `File "${file.name}" exceeds the 10MB size limit` }, { status: 400 });
            }

            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Sniff file header magic bytes
            let mimeType = file.type || "application/octet-stream";
            if (buffer.length >= 4) {
                if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) mimeType = "image/jpeg";
                else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) mimeType = "image/png";
                else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) mimeType = "image/gif";
                else if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) mimeType = "application/pdf";
                else if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer.slice(8, 12).toString() === "WEBP") mimeType = "image/webp";
            }

            if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
                return NextResponse.json({ error: `File type "${mimeType}" for "${file.name}" is not supported. Please upload JPG, PNG, WEBP, or PDF.` }, { status: 400 });
            }

            const rawExt = path.extname(file.name).toLowerCase().replace('.', '') || (mimeType === 'application/pdf' ? 'pdf' : 'jpg');
            // Safe extension whitelist
            const validExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'];
            const ext = validExts.includes(rawExt) ? rawExt : 'jpg';

            const uniqueId = crypto.randomUUID();
            // Prefix filename with instituteId for strict multi-tenant isolation
            const tenantPrefix = instituteId || 'global';
            const filename = `${tenantPrefix}_${uniqueId}.${ext}`;
            const filePath = path.join(uploadsDir, filename);

            await fs.writeFile(filePath, buffer);

            savedAttachments.push({
                url: `/api/v1/finance/attachments/${filename}`,
                filename,
                originalName: file.name ? file.name.substring(0, 150) : "receipt",
                mimeType,
                size: file.size,
                uploadedAt: new Date()
            });
        }

        return NextResponse.json({
            success: true,
            attachments: savedAttachments
        });

    } catch (error) {
        console.error("[Finance Upload Error]:", error);
        return NextResponse.json({ error: "Failed to upload attachments" }, { status: 500 });
    }
}
