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

async function deleteTemplateBasePdfFromCloudinary(pdfUrl, instituteId) {
    if (!pdfUrl || !pdfUrl.includes("cloudinary.com")) return;
    try {
        const parts = pdfUrl.split(/\/upload\/(?:v\d+\/)?/);
        if (parts.length < 2) return;
        const publicIdWithExt = parts[1];
        const dotIndex = publicIdWithExt.lastIndexOf(".");
        const publicId = dotIndex === -1 ? publicIdWithExt : publicIdWithExt.substring(0, dotIndex);
        
        const scopedOptions = await getCloudinaryOptions(instituteId);
        await new Promise((resolve, reject) => {
            cloudinary.uploader.destroy(
                publicId,
                { resource_type: "raw", ...scopedOptions },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
        });
        console.log(`[Cloudinary Template Cleanup] Successfully deleted ${publicId} for institute ${instituteId}`);
    } catch (err) {
        console.error("[Cloudinary Template Cleanup Failed]", err);
    }
}

export async function GET(req, { params }) {
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

        const { id } = await params;

        const template = await PDFMeIDCardTemplate.findOne({ 
            _id: id, 
            institute: scope.instituteId 
        }).lean();
        
        if (!template) {
            return NextResponse.json(
                { error: "Template not found or access denied" },
                { status: 404 }
            );
        }

        return NextResponse.json(template);
    } catch (error) {
        console.error("[PDFMeIDCardTemplate GET/:id] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch template" },
            { status: 500 }
        );
    }
}

export async function PATCH(req, { params }) {
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

        const { id } = await params;
        const body = await req.json();

        // Find existing template first to manage custom Cloudinary assets
        const existingTemplate = await PDFMeIDCardTemplate.findOne({ 
            _id: id, 
            institute: scope.instituteId 
        });
        
        if (!existingTemplate) {
            return NextResponse.json(
                { error: "Template not found or access denied" },
                { status: 404 }
            );
        }

        let updatedTemplateJson = body.templateJson;
        if (updatedTemplateJson && typeof updatedTemplateJson.basePdf === "string" && updatedTemplateJson.basePdf.startsWith("data:application/pdf;base64,")) {
            // Delete the old Cloudinary template background PDF first to prevent storage leak
            const oldPdfUrl = existingTemplate.templateJson?.basePdf;
            if (oldPdfUrl && typeof oldPdfUrl === "string" && oldPdfUrl.includes("cloudinary.com")) {
                await deleteTemplateBasePdfFromCloudinary(oldPdfUrl, scope.instituteId);
            }

            // Upload new background PDF
            const uploadResult = await uploadTemplateBasePdfToCloudinary(updatedTemplateJson.basePdf, scope.instituteId);
            updatedTemplateJson.basePdf = uploadResult.secure_url;
        }

        // Apply modifications
        const updateFields = { ...body };
        if (updatedTemplateJson) {
            updateFields.templateJson = updatedTemplateJson;
        }
        updateFields.updatedAt = new Date();

        const template = await PDFMeIDCardTemplate.findOneAndUpdate(
            { _id: id, institute: scope.instituteId },
            updateFields,
            { new: true }
        );

        // If this is set as default, unset other defaults FOR THIS INSTITUTE ONLY
        if (body.isDefault) {
            await PDFMeIDCardTemplate.updateMany(
                { 
                    institute: scope.instituteId, 
                    _id: { $ne: id } 
                },
                { isDefault: false }
            );
        }

        console.log(`[PDFMeIDCardTemplate] Updated template: ${id} for institute: ${scope.instituteId}`);

        return NextResponse.json(template);
    } catch (error) {
        console.error("[PDFMeIDCardTemplate PATCH/:id] Error:", error);
        return NextResponse.json(
            { error: "Failed to update template" },
            { status: 500 }
        );
    }
}

export async function DELETE(req, { params }) {
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

        const { id } = await params;

        // Find the template first to delete its Cloudinary PDF
        const template = await PDFMeIDCardTemplate.findOne({ 
            _id: id, 
            institute: scope.instituteId 
        });

        if (!template) {
            return NextResponse.json(
                { error: "Template not found or access denied" },
                { status: 404 }
            );
        }

        // Clean up Cloudinary backgrounds
        const pdfUrl = template.templateJson?.basePdf;
        if (pdfUrl && typeof pdfUrl === "string" && pdfUrl.includes("cloudinary.com")) {
            await deleteTemplateBasePdfFromCloudinary(pdfUrl, scope.instituteId);
        }

        // Delete from DB
        await PDFMeIDCardTemplate.deleteOne({ _id: id });

        console.log(`[PDFMeIDCardTemplate] Deleted template: ${id} for institute: ${scope.instituteId}`);

        return NextResponse.json({ success: true, message: "Template deleted" });
    } catch (error) {
        console.error("[PDFMeIDCardTemplate DELETE/:id] Error:", error);
        return NextResponse.json(
            { error: "Failed to delete template" },
            { status: 500 }
        );
    }
}
