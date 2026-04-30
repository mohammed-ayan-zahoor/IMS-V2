import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import cloudinary from "@/lib/cloudinary";

export async function POST(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin", "instructor", "staff"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await connectDB();
        
        const body = await req.json();
        const { name, base64, category } = body;

        if (!name || !base64) {
            return NextResponse.json({ error: "Missing document details" }, { status: 400 });
        }

        const student = await User.findById(id);
        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        // Upload to Cloudinary
        let uploadResponse;
        try {
            uploadResponse = await new Promise((resolve, reject) => {
                const options = {
                    folder: `quantech/students/${id}/documents`,
                    resource_type: "auto", // Handles images and PDFs automatically
                };
                cloudinary.uploader.upload(base64, options, (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                });
            });
        } catch (uploadError) {
            console.error("Cloudinary Upload Error:", uploadError);
            return NextResponse.json({ error: "Failed to upload to cloud storage" }, { status: 500 });
        }

        // Add document to user
        const newDoc = {
            name,
            url: uploadResponse.secure_url,
            publicId: uploadResponse.public_id,
            category: category || 'Other',
            uploadedAt: new Date()
        };

        student.documents.push(newDoc);
        await student.save();

        // Audit Log
        await AuditLog.create({
            actor: session.user.id,
            action: 'student.document_upload',
            resource: { type: 'User', id: student._id },
            details: { name, category, publicId: uploadResponse.public_id },
            ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown'
        });

        return NextResponse.json({ success: true, documents: student.documents });
    } catch (error) {
        console.error("Document Upload Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const docId = searchParams.get("docId");

        if (!docId) {
            return NextResponse.json({ error: "Missing document ID" }, { status: 400 });
        }

        await connectDB();
        const student = await User.findById(id);
        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        const document = student.documents.id(docId);
        if (!document) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        // Delete from Cloudinary
        try {
            await cloudinary.uploader.destroy(document.publicId);
        } catch (cloudinaryError) {
            console.warn("Failed to delete from Cloudinary, continuing with DB removal:", cloudinaryError);
        }

        student.documents.pull(docId);
        await student.save();

        // Audit Log
        await AuditLog.create({
            actor: session.user.id,
            action: 'student.document_delete',
            resource: { type: 'User', id: student._id },
            details: { docId, name: document.name, publicId: document.publicId },
            ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown'
        });

        return NextResponse.json({ success: true, documents: student.documents });
    } catch (error) {
        console.error("Document Delete Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
