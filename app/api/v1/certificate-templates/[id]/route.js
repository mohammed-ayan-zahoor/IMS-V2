import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import CertificateTemplate from "@/models/CertificateTemplate";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const template = await CertificateTemplate.findOne({
            _id: id,
            institute: scope.instituteId,
            deletedAt: null
        }).lean();

        if (!template) {
            return NextResponse.json(
                { error: "Template not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: template });
    } catch (error) {
        console.error("Error fetching certificate template:", error);
        return NextResponse.json(
            { error: "Failed to fetch template" },
            { status: 500 }
        );
    }
}

export async function PUT(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();

        const template = await CertificateTemplate.findOne({
            _id: id,
            institute: scope.instituteId,
            deletedAt: null
        });

        if (!template) {
            return NextResponse.json(
                { error: "Template not found" },
                { status: 404 }
            );
        }

        // Update allowed fields
        const {
            name,
            description,
            type,
            isDefault,
            imageUrl,
            styles,
            placeholders,
            htmlTemplate
        } = body;

        if (name && name.trim() !== template.name) {
            // Check uniqueness if name is being changed
            const existing = await CertificateTemplate.findOne({
                institute: scope.instituteId,
                name: { $regex: `^${name.trim()}$`, $options: "i" },
                _id: { $ne: id },
                deletedAt: null
            });

            if (existing) {
                return NextResponse.json(
                    { error: "Template with this name already exists" },
                    { status: 400 }
                );
            }

            template.name = name.trim();
        }

        if (description !== undefined) template.description = description?.trim();
        if (type !== undefined) template.type = type;
        if (isDefault !== undefined) template.isDefault = isDefault;
        if (imageUrl !== undefined) template.imageUrl = imageUrl;
        if (styles !== undefined) template.styles = { ...template.styles, ...styles };
        if (placeholders !== undefined) {
            // Debug: Log what we're about to save
            if (process.env.NODE_ENV === 'development') {
                console.log('=> Saving template placeholders:', JSON.stringify(placeholders, null, 2));
            }
            template.placeholders = { ...template.placeholders, ...placeholders };
        }
        if (htmlTemplate !== undefined) template.htmlTemplate = htmlTemplate;

        await template.save();

        return NextResponse.json({ success: true, data: template });
    } catch (error) {
        console.error("Error updating certificate template:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update template" },
            { status: 500 }
        );
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const template = await CertificateTemplate.findOne({
            _id: id,
            institute: scope.instituteId,
            deletedAt: null
        });

        if (!template) {
            return NextResponse.json(
                { error: "Template not found" },
                { status: 404 }
            );
        }

        // Soft delete
        template.deletedAt = new Date();
        
        // If this was the default template, make no template default
        if (template.isDefault) {
            template.isDefault = false;
        }

        await template.save();

        return NextResponse.json({
            success: true,
            message: "Template deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting certificate template:", error);
        return NextResponse.json(
            { error: "Failed to delete template" },
            { status: 500 }
        );
    }
}
