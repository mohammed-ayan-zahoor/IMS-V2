import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Certificate from "@/models/Certificate";

/**
 * @route   PATCH /api/v1/certificates/bulk-visibility
 * @desc    Toggle visibility for multiple certificates at once
 */
export async function PATCH(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { ids, visible } = await req.json();
        if (!ids || !Array.isArray(ids)) {
            return NextResponse.json({ error: "Invalid certificate IDs provided" }, { status: 400 });
        }

        await connectDB();

        // Perform bulk update
        const result = await Certificate.updateMany(
            { _id: { $in: ids } },
            { $set: { visibleToStudent: visible } }
        );

        return NextResponse.json({ 
            success: true, 
            message: `Successfully updated visibility for ${result.modifiedCount} certificates.`,
            count: result.modifiedCount
        });

    } catch (error) {
        console.error("Bulk Visibility API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
