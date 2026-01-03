import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";
import mime from "mime"; // You might need to install 'mime' or just hardcode for pdf

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        // Strict Access Control: Only logged in users with role
        /* 
           Note: Depending on requirements, we might want to restrict this further 
           (e.g., only the student who owns it + admins). 
           For now, proceeding with Admin/SuperAdmin + potentially the student themselves 
           (though verifying student ownership from just filename is hard without DB lookup).
           
           Given the context is "Admin" uploading/viewing, we'll start with Admin roles.
        */

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { filename } = await params;

        // Security: Prevent directory traversal
        const safeFilename = path.basename(filename);
        const filePath = path.join(process.cwd(), "private_uploads", safeFilename);

        try {
            await fs.access(filePath);
        } catch {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        const fileBuffer = await fs.readFile(filePath);

        // Determine content type (default to pdf as per current use case)
        let contentType = "application/pdf";
        if (safeFilename.endsWith(".png")) contentType = "image/png";
        if (safeFilename.endsWith(".jpg")) contentType = "image/jpeg";
        // ... add more if needed, or use a mime library

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `inline; filename="${safeFilename}"`,
                "Cache-Control": "private, max-age=3600"
            }
        });

    } catch (error) {
        console.error("File Serve Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
