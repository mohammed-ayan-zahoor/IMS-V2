import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import IDCardTemplate from "@/models/IDCardTemplate";
import dbConnect from "@/lib/dbConnect";

export async function GET(req) {
    try {
        await dbConnect();
        
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const templates = await IDCardTemplate.find()
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
        await dbConnect();
        
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        
        // Validate required fields
        if (!body.name || !body.frontImageUrl || !body.backImageUrl) {
            return NextResponse.json(
                { error: "Name and both image URLs are required" },
                { status: 400 }
            );
        }

        // Check if name already exists
        const existing = await IDCardTemplate.findOne({ name: body.name });
        if (existing) {
            return NextResponse.json(
                { error: "Template with this name already exists" },
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
            createdBy: session.user.id
        });

        await template.save();

        // If this is set as default, unset other defaults
        if (template.isDefault) {
            await IDCardTemplate.updateMany(
                { _id: { $ne: template._id } },
                { isDefault: false }
            );
        }

        console.log(`[IDCardTemplate] Created template: ${template._id}`);

        return NextResponse.json(template, { status: 201 });
    } catch (error) {
        console.error("[IDCardTemplate POST] Error:", error);
        return NextResponse.json(
            { error: "Failed to create template" },
            { status: 500 }
        );
    }
}
