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
        if (!["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;
        const body = await req.json();

        delete body.uploadedBy; // Prevent changing owner
        delete body.createdAt;
        delete body.deletedAt; // Prevent manual restoration

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
        if (!["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;

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
                    const uploadsDir = path.join(process.cwd(), "public", "uploads");
                    const filepath = path.join(uploadsDir, safeBasename);

                    // Verify path is within uploads directory
                    if (!filepath.startsWith(uploadsDir)) {
                        console.warn(`Skipping file deletion: Path traversal detected '${filepath}'`);
                    } else {
                        await unlink(filepath).catch(err => {
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
