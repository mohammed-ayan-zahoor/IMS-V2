import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

export async function POST(req) {
    try {
        // ... (auth check: unchanged)
        const session = await getServerSession(authOptions);
        if (!session || !['super_admin', 'admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file");

        if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: "Only images and PDF files are allowed" }, { status: 400 });
        }

        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const isPdf = file.type === "application/pdf";

        if (isPdf) {
            // Local Secure Storage for PDFs
            const uploadsDir = path.join(process.cwd(), "private_uploads");

            // Ensure directory exists
            try {
                await fs.access(uploadsDir);
            } catch {
                await fs.mkdir(uploadsDir, { recursive: true });
            }

            const uniqueId = crypto.randomUUID();
            const filename = `${uniqueId}.pdf`;
            const filePath = path.join(uploadsDir, filename);

            await fs.writeFile(filePath, buffer);

            // Return URL to our secure file serving route
            // The browser will use this URL to call GET /api/v1/files/[filename]
            const secureUrl = `/api/v1/files/${filename}`;

            return NextResponse.json({
                url: secureUrl,
                public_id: uniqueId,
                format: "pdf",
                type: "local_private"
            });

        } else {
            // Cloudinary for Images (Public/Visible)
            const uploadResponse = await new Promise((resolve, reject) => {
                const options = {
                    folder: "ims_v2/uploads",
                    resource_type: "auto",
                    transformation: [{ width: 500, height: 500, crop: "limit" }]
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
