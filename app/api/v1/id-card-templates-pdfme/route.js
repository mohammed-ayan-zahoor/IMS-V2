import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import PDFMeIDCardTemplate from "@/models/PDFMeIDCardTemplate";
import { connectDB } from "@/lib/mongodb";
import { getInstituteScope } from "@/middleware/instituteScope";
import { v2 as cloudinary } from "cloudinary";
import { getCloudinaryOptions, getUploadFolder } from "@/lib/cloudinaryResolver";

async function uploadTemplateBasePdfToCloudinary(base64Pdf, instituteId) {
    const scopedOptions = await getCloudinaryOptions(instituteId);
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
            base64Pdf,
            {
                folder: getUploadFolder(instituteId, "id-card-templates-pdfme"),
                resource_type: "raw",
                ...scopedOptions
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
    });
}

export async function GET(req) {
    try {
        await connectDB();
        
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) {
            return NextResponse.json({ error: "Missing institute context" }, { status: 400 });
        }

        const templates = await PDFMeIDCardTemplate.find({ institute: scope.instituteId })
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(templates);
    } catch (error) {
        console.error("[PDFMeIDCardTemplate GET] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch templates" },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try {
        await connectDB();
        
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) {
            return NextResponse.json({ error: "Missing institute context" }, { status: 400 });
        }

        const body = await req.json();
        
        // Validate required fields
        if (!body.name || !body.templateJson) {
            return NextResponse.json(
                { error: "Name and template configuration (templateJson) are required" },
                { status: 400 }
            );
        }

        // Check if name already exists in this institute
        const existing = await PDFMeIDCardTemplate.findOne({ 
            name: body.name, 
            institute: scope.instituteId 
        });
        if (existing) {
            return NextResponse.json(
                { error: "Template with this name already exists in this institute" },
                { status: 409 }
            );
        }

        // If template basePdf contains a base64 string, upload to Cloudinary and replace it with secure URL
        let activeTemplateJson = body.templateJson;
        if (activeTemplateJson && typeof activeTemplateJson.basePdf === "string" && activeTemplateJson.basePdf.startsWith("data:application/pdf;base64,")) {
            const uploadResult = await uploadTemplateBasePdfToCloudinary(activeTemplateJson.basePdf, scope.instituteId);
            activeTemplateJson.basePdf = uploadResult.secure_url;
        }

        const template = new PDFMeIDCardTemplate({
            name: body.name,
            templateJson: activeTemplateJson,
            isDefault: body.isDefault || false,
            institute: scope.instituteId,
            createdBy: session.user.id
        });

        await template.save();

        // If this is set as default, unset other defaults FOR THIS INSTITUTE ONLY
        if (template.isDefault) {
            await PDFMeIDCardTemplate.updateMany(
                { 
                    institute: scope.instituteId, 
                    _id: { $ne: template._id } 
                },
                { isDefault: false }
            );
        }

        console.log(`[PDFMeIDCardTemplate] Created template: ${template._id} for institute: ${scope.instituteId}`);

        return NextResponse.json(template, { status: 201 });
    } catch (error) {
        console.error("[PDFMeIDCardTemplate POST] Error:", error);
        return NextResponse.json(
            { error: "Failed to create template" },
            { status: 500 }
        );
    }
}
