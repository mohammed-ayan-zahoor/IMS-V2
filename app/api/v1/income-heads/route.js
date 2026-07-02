import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import IncomeHead from "@/models/IncomeHead";
import { createAuditLog } from "@/services/auditService";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        await connectDB();
        const incomeHeads = await IncomeHead.find({ institute: instituteId, isActive: true })
            .sort({ name: 1 });

        return NextResponse.json({ incomeHeads });
    } catch (error) {
        console.error("Failed to fetch income heads:", error);
        return NextResponse.json({ error: "Failed to fetch income heads" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        const body = await req.json();
        const { name } = body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        if (name.trim().length > 100) {
            return NextResponse.json({ error: "Name must not exceed 100 characters" }, { status: 400 });
        }

        await connectDB();
        const incomeHead = await IncomeHead.create({
            institute: instituteId,
            name: name.trim(),
            createdBy: session.user.id
        });

        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'income_head.create',
                resource: { type: 'IncomeHead', id: incomeHead._id },
                institute: instituteId,
                details: { name: incomeHead.name }
            });
        } catch (auditError) {
            console.error('Audit log failed:', auditError);
        }

        return NextResponse.json({ incomeHead });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "An income head with this name already exists" }, { status: 400 });
        }
        console.error('Failed to create income head:', error);
        return NextResponse.json({ error: "Failed to create income head" }, { status: 500 });
    }
}
