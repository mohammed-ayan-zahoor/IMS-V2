import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import IDCardTemplate from "@/models/IDCardTemplate";
import { connectDB } from "@/lib/mongodb";
import { getInstituteScope } from "@/middleware/instituteScope";

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

        const template = await IDCardTemplate.findOne({ 
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
        console.error("[IDCardTemplate GET/:id] Error:", error);
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

        const template = await IDCardTemplate.findOneAndUpdate(
            { _id: id, institute: scope.instituteId },
            {
                ...body,
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!template) {
            return NextResponse.json(
                { error: "Template not found or access denied" },
                { status: 404 }
            );
        }

        // If this is set as default, unset other defaults FOR THIS INSTITUTE ONLY
        if (body.isDefault) {
            await IDCardTemplate.updateMany(
                { 
                    institute: scope.instituteId, 
                    _id: { $ne: id } 
                },
                { isDefault: false }
            );
        }

        console.log(`[IDCardTemplate] Updated template: ${id} for institute: ${scope.instituteId}`);

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

        const template = await IDCardTemplate.findOneAndDelete({ 
            _id: id, 
            institute: scope.instituteId 
        });

        if (!template) {
            return NextResponse.json(
                { error: "Template not found or access denied" },
                { status: 404 }
            );
        }

        console.log(`[IDCardTemplate] Deleted template: ${id} for institute: ${scope.instituteId}`);

        return NextResponse.json({ success: true, message: "Template deleted" });
    } catch (error) {
        console.error("[IDCardTemplate DELETE/:id] Error:", error);
        return NextResponse.json(
            { error: "Failed to delete template" },
            { status: 500 }
        );
    }
}
