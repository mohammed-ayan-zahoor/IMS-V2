import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Types } from 'mongoose';
import { FeeService } from '@/services/feeService';

export async function POST(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        if (!Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid fee ID format" }, { status: 400 });
        }

        const fee = await FeeService.cancelFee(id, session.user.id);
        return NextResponse.json({ success: true, fee });

    } catch (error) {
        console.error("Fee Cancel Error:", error);
        return NextResponse.json({ error: error.message || "Failed to cancel fee" }, { status: 500 });
    }
}
