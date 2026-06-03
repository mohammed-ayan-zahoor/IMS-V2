import { NextResponse } from "next/server";
import { getInstituteScope, addInstituteFilter } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import HostelBlock from "@/models/HostelBlock";
import { createAuditLog } from "@/services/auditService";

export async function GET(req) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const filter = addInstituteFilter({ deletedAt: null }, scope);
        const blocks = await HostelBlock.find(filter)
            .populate('warden', 'profile.firstName profile.lastName email')
            .sort({ name: 1 })
            .lean();

        return NextResponse.json({ blocks });
    } catch (error) {
        console.error("GET /api/v1/hostel/blocks error:", error);
        return NextResponse.json({ error: "Failed to fetch hostel blocks" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId || !['admin', 'super_admin'].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const body = await req.json();
        const { name, type, floors, warden, wardenName, wardenPhone, amenities } = body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: "Block name is required" }, { status: 400 });
        }

        // Only set warden (ObjectId) if a valid 24-char hex id is provided;
        // wardenName is the free-text fallback used by the form
        const isValidObjectId = (v) => /^[a-f\d]{24}$/i.test(v);

        const blockData = {
            institute: scope.instituteId,
            name: name.trim(),
            type: ['boys', 'girls', 'mixed'].includes(type) ? type : 'mixed',
            floors: floors ? parseInt(floors, 10) : 1,
            warden: warden && isValidObjectId(warden) ? warden : undefined,
            wardenName: wardenName || (warden && !isValidObjectId(warden) ? warden : undefined) || undefined,
            wardenPhone: wardenPhone || undefined,
            amenities: Array.isArray(amenities) ? amenities : [],
            createdBy: scope.user.id
        };

        const block = await HostelBlock.create(blockData);

        try {
            await createAuditLog({
                actor: scope.user.id,
                action: 'hostel.block.create',
                resource: { type: 'HostelBlock', id: block._id },
                institute: scope.instituteId,
                details: { name: block.name, type: block.type }
            });
        } catch (auditError) {
            console.error("Failed to write audit log:", auditError);
        }

        return NextResponse.json({ block });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "A block with this name already exists" }, { status: 400 });
        }
        console.error("POST /api/v1/hostel/blocks error:", error);
        return NextResponse.json({ error: "Failed to create hostel block" }, { status: 500 });
    }
}
