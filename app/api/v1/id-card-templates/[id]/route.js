import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import IDCardTemplate from "@/models/IDCardTemplate";
import dbConnect from "@/lib/dbConnect";

export async function GET(req, { params }) {
    try {
        await dbConnect();
        
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const template = await IDCardTemplate.findById(id).lean();
        
        if (!template) {
            return NextResponse.json(
                { error: "Template not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(template);
    } catch (error) {
        console.error("[IDCardTemplate GET/:id] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch template" },
            { status: 500 }
        );
    }
}

export async function PATCH(req, { params }) {
    try {
        await dbConnect();
        
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();

        const template = await IDCardTemplate.findByIdAndUpdate(
            id,
            {
                ...body,
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!template) {
            return NextResponse.json(
                { error: "Template not found" },
                { status: 404 }
            );
        }

        // If this is set as default, unset other defaults
        if (body.isDefault) {
            await IDCardTemplate.updateMany(
                { _id: { $ne: id } },
                { isDefault: false }
            );
        }

        console.log(`[IDCardTemplate] Updated template: ${id}`);

        return NextResponse.json(template);
    } catch (error) {
        console.error("[IDCardTemplate PATCH/:id] Error:", error);
        return NextResponse.json(
            { error: "Failed to update template" },
            { status: 500 }
        );
    }
}

export async function DELETE(req, { params }) {
    try {
        await dbConnect();
        
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const template = await IDCardTemplate.findByIdAndDelete(id);

        if (!template) {
            return NextResponse.json(
                { error: "Template not found" },
                { status: 404 }
            );
        }

        console.log(`[IDCardTemplate] Deleted template: ${id}`);

        return NextResponse.json({ success: true, message: "Template deleted" });
    } catch (error) {
        console.error("[IDCardTemplate DELETE/:id] Error:", error);
        return NextResponse.json(
            { error: "Failed to delete template" },
            { status: 500 }
        );
    }
}
