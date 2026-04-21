import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import CertificateTemplate from "@/models/CertificateTemplate";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";

export async function GET(req) {
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

        const { searchParams } = new URL(req.url);
        const includeDeleted = searchParams.get("includeDeleted") === "true";

        const query = {
            institute: scope.instituteId,
            ...(includeDeleted ? {} : { deletedAt: null })
        };

        const templates = await CertificateTemplate.find(query)
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            data: templates,
            count: templates.length
        });
    } catch (error) {
        console.error("Error fetching certificate templates:", error);
        return NextResponse.json(
            { error: "Failed to fetch templates" },
            { status: 500 }
        );
    }
}

export async function POST(req) {
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

        const body = await req.json();
        const {
            name,
            description,
            type = "CUSTOM",
            isDefault = false,
            imageUrl = null,
            styles = {},
            placeholders = {},
            htmlTemplate = null
        } = body;

        if (!name || name.trim() === "") {
            return NextResponse.json(
                { error: "Template name is required" },
                { status: 400 }
            );
        }

        // Validate template name uniqueness within institute
        const existing = await CertificateTemplate.findOne({
            institute: scope.instituteId,
            name: { $regex: `^${name.trim()}$`, $options: "i" },
            deletedAt: null
        });

        if (existing) {
            return NextResponse.json(
                { error: "Template with this name already exists" },
                { status: 400 }
            );
        }

        const template = new CertificateTemplate({
            institute: scope.instituteId,
            name: name.trim(),
            description: description?.trim(),
            type,
            isDefault,
            imageUrl,
            styles,
            placeholders,
            htmlTemplate,
            createdBy: session.user.id
        });

        await template.save();

        return NextResponse.json(
            { success: true, data: template },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating certificate template:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create template" },
            { status: 500 }
        );
    }
}
