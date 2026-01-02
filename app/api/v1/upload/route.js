import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['super_admin', 'admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file");

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate file type
        if (!file.type.startsWith("image/")) {
            return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
        }

        // Validate file size (e.g., max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 });
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Cloudinary
        const uploadResponse = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: "ims_v2/avatars",
                    resource_type: "image",
                    transformation: [{ width: 500, height: 500, crop: "limit" }] // Resize huge images
                },
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

    } catch (error) {
        console.error("Upload Error:", error);
        return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
    }
}
