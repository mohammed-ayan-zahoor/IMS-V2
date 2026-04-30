// Cache bust
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import IDCardTemplate from "@/models/IDCardTemplate";
import { connectDB } from "@/lib/mongodb";
import { getInstituteScope } from "@/middleware/instituteScope";

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

        const templates = await IDCardTemplate.find({ institute: scope.instituteId })
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(templates);
    } catch (error) {
        console.error("[IDCardTemplate GET] Error:", error);
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
        if (!body.name || !body.frontImageUrl || !body.backImageUrl) {
            return NextResponse.json(
                { error: "Name and both image URLs are required" },
                { status: 400 }
            );
        }

        // Check if name already exists in this institute
        const existing = await IDCardTemplate.findOne({ 
            name: body.name, 
            institute: scope.instituteId 
        });
        if (existing) {
            return NextResponse.json(
                { error: "Template with this name already exists in this institute" },
                { status: 409 }
            );
        }

        const template = new IDCardTemplate({
            name: body.name,
            frontImageUrl: body.frontImageUrl,
            backImageUrl: body.backImageUrl,
            frontPlaceholders: body.frontPlaceholders || {},
            backPlaceholders: body.backPlaceholders || {},
            cardDimensions: body.cardDimensions || { width: 85.6, height: 53.98 },
            isDefault: body.isDefault || false,
            institute: scope.instituteId,
            createdBy: session.user.id
        });

        await template.save();

        // If this is set as default, unset other defaults FOR THIS INSTITUTE ONLY
        if (template.isDefault) {
            await IDCardTemplate.updateMany(
                { 
                    institute: scope.instituteId, 
                    _id: { $ne: template._id } 
                },
                { isDefault: false }
            );
        }

        console.log(`[IDCardTemplate] Created template: ${template._id} for institute: ${scope.instituteId}`);

        return NextResponse.json(template, { status: 201 });
    } catch (error) {
        console.error("[IDCardTemplate POST] Error:", error);
        return NextResponse.json(
            { error: "Failed to create template" },
            { status: 500 }
        );
    }
}
