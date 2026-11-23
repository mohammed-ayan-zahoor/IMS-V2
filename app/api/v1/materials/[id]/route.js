import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Material from "@/models/Material";
import { unlink } from "fs/promises";
import path from "path";

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;
        const material = await Material.findById(id) // consistent hard-delete strategy
            .populate('course', 'name')
            .populate('courses', 'name')
            .populate('courseBundle', 'title')
            .populate('courseBundles', 'title')
            .populate('batches', 'name');

        if (!material) {
            return NextResponse.json({ error: "Material not found" }, { status: 404 });
        }

        return NextResponse.json({ material });

    } catch (error) {
        console.error("GET Material Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userRole = session.user.role?.toLowerCase();
        const ALLOWED_ROLES = ["admin", "super_admin", "instructor", "teacher", "staff"];
        if (!ALLOWED_ROLES.includes(userRole)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;
        const body = await req.json();

        delete body.uploadedBy; // Prevent changing owner
        delete body.createdAt;
        delete body.deletedAt; // Prevent manual restoration

        // Normalize file.type if provided
        if (body.file?.type) {
            const VALID_FILE_TYPES = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'video', 'image', 'zip', 'other'];
            let resolved = body.file.type.toLowerCase();
            if (resolved === 'document') resolved = 'pdf';
            if (!VALID_FILE_TYPES.includes(resolved)) resolved = 'other';
            body.file.type = resolved;
        }

        // Handle courses and courseBundles field
        if (body.courses && Array.isArray(body.courses)) {
            body.course = body.courses[0] || null;
        } else if (body.course && !body.courses) {
            body.courses = [body.course];
        }

        if (body.courseBundles && Array.isArray(body.courseBundles)) {
            body.courseBundle = body.courseBundles[0] || null;
        } else if (body.courseBundle && !body.courseBundles) {
            body.courseBundles = [body.courseBundle];
        }

        const material = await Material.findByIdAndUpdate(
            id, // consistent hard-delete strategy
            { $set: body },
            { new: true, runValidators: true }
        );

        if (!material) return NextResponse.json({ error: "Material not found" }, { status: 404 });

        return NextResponse.json({ success: true, material });

    } catch (error) {
        console.error("Update Material Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userRole = session.user.role?.toLowerCase();
        const ALLOWED_ROLES = ["admin", "super_admin", "instructor", "teacher", "staff"];
        if (!ALLOWED_ROLES.includes(userRole)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;

        // Non-admin can only delete materials they uploaded
        if (!["admin", "super_admin"].includes(userRole)) {
            const existing = await Material.findById(id).select('uploadedBy');
            if (!existing || existing.uploadedBy.toString() !== session.user.id) {
                return NextResponse.json({ error: "Forbidden: You can only delete your own materials" }, { status: 403 });
            }
        }

        // Atomic Delete (Hard Delete) - Returns document if found and deleted
        const material = await Material.findByIdAndDelete(id);

        if (!material) {
            return NextResponse.json({ error: "Material not found" }, { status: 404 });
        }

        // Secure File Deletion
        if (material.file && material.file.url) {
            try {
                // Validate Filename
                const rawFilename = material.file.url.split("/").pop();
                const safeBasename = path.basename(rawFilename); // Prevent directory traversal

                // Whitelist allowed characters (alphanumeric, dot, dash, underscore)
                if (!/^[a-zA-Z0-9._-]+$/.test(safeBasename)) {
                    console.warn(`Skipping file deletion: Invalid filename format '${safeBasename}'`);
                } else {
                    // Determine directory based on URL structure
                    // Private files are served via /api/v1/files/filename
                    const isPrivate = material.file.url.includes('/api/v1/files/');
                    const uploadsDir = isPrivate
                        ? path.join(process.cwd(), "private_uploads")
                        : path.join(process.cwd(), "public", "uploads");

                    const filepath = path.join(uploadsDir, safeBasename);

                    // Verify path is within expected directory to prevent traversal
                    if (!filepath.startsWith(uploadsDir)) {
                        console.warn(`Skipping file deletion: Path traversal detected '${filepath}'`);
                    } else {
                        await unlink(filepath).catch(err => {
                            // ignore if missing
                            if (err.code !== 'ENOENT') console.error("Failed to delete file:", err);
                        });
                    }
                }
            } catch (fileError) {
                console.error("Error cleaning up file:", fileError);
            }
        }

        return NextResponse.json({ success: true, message: "Material and file permanently deleted" });

    } catch (error) {
        console.error("Delete Material Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
