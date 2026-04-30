import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Notice from "@/models/Notice";
import { createAuditLog } from "@/services/auditService";

/**
 * @route   GET /api/v1/notices
 * @desc    Get all notices for the institute (Admin View)
 */
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const notices = await Notice.find({ 
            institute: session.user.institute.id 
        }).sort({ isPinned: -1, createdAt: -1 });

        return NextResponse.json({ notices });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch notices" }, { status: 500 });
    }
}

/**
 * @route   POST /api/v1/notices
 * @desc    Create a new notice
 */
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        await connectDB();

        const notice = await Notice.create({
            ...body,
            institute: session.user.institute.id,
            createdBy: session.user.id
        });

        await createAuditLog({
            actor: session.user.id,
            action: 'notice.create',
            resource: { type: 'Notice', id: notice._id },
            institute: session.user.institute.id,
            details: { title: notice.title, target: notice.target }
        });

        return NextResponse.json({ message: "Notice created successfully", notice });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
