import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { Types } from 'mongoose';
import Fee from '@/models/Fee';
import { FeeService } from '@/services/feeService';
import { getInstituteScope, validateInstituteAccess } from '@/middleware/instituteScope';

export async function POST(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        // Instructors cannot cancel fees — admin/super_admin only
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        if (!Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid fee ID format" }, { status: 400 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);

        // Verify the fee belongs to the admin's own institute (prevents cross-institute cancel)
        const feeRecord = await Fee.findById(id);
        if (!feeRecord) {
            return NextResponse.json({ error: "Fee record not found" }, { status: 404 });
        }

        const hasAccess = await validateInstituteAccess(feeRecord, scope);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied: This fee record belongs to another institute" }, { status: 403 });
        }

        const fee = await FeeService.cancelFee(id, session.user.id);
        return NextResponse.json({ success: true, fee });

    } catch (error) {
        console.error("Fee Cancel Error:", error);
        return NextResponse.json({ error: error.message || "Failed to cancel fee" }, { status: 500 });
    }
}
