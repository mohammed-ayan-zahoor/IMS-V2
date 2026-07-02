import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import SalaryComponent from "@/models/SalaryComponent";
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
        const salaryComponents = await SalaryComponent.find({ institute: instituteId, deletedAt: null })
            .sort({ type: 1, name: 1 });

        return NextResponse.json({ salaryComponents });
    } catch (error) {
        console.error("Failed to fetch salary components:", error);
        return NextResponse.json({ error: "Failed to fetch salary components" }, { status: 500 });
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
        const { name, type, description } = body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        if (!type || !['earning', 'deduction'].includes(type)) {
            return NextResponse.json({ error: "Type must be either 'earning' or 'deduction'" }, { status: 400 });
        }

        await connectDB();
        const salaryComponent = await SalaryComponent.create({
            institute: instituteId,
            name: name.trim(),
            type,
            description: description?.trim()
        });

        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'hr.component.create',
                resource: { type: 'SalaryComponent', id: salaryComponent._id },
                institute: instituteId,
                details: { name: salaryComponent.name, type: salaryComponent.type }
            });
        } catch (auditError) {
            console.error('Audit log failed:', auditError);
        }

        return NextResponse.json({ salaryComponent });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "A salary component with this name and type already exists" }, { status: 400 });
        }
        console.error('Failed to create salary component:', error);
        return NextResponse.json({ error: "Failed to create salary component" }, { status: 500 });
    }
}
