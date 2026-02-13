import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Collector from "@/models/Collector";
import { createAuditLog } from "@/services/auditService";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        const isSuperAdmin = session?.user?.role === 'super_admin';
        const instituteId = session?.user?.institute?.id;

        if (!session || (!instituteId && !isSuperAdmin) || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const query = { isActive: true };
        if (instituteId) {
            query.institute = instituteId;
        }

        const collectors = await Collector.find(query).sort({ name: 1 });

        return NextResponse.json({ collectors });
    } catch (error) {
        console.error("Failed to fetch collectors:", error);
        return NextResponse.json({ error: "Failed to fetch collectors" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        const isSuperAdmin = session?.user?.role === 'super_admin';
        const instituteId = session?.user?.institute?.id;

        if (!session || (!instituteId && !isSuperAdmin) || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, phone, designation } = body;

        // Validation
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        if (name.trim().length > 100) {
            return NextResponse.json({ error: "Name must not exceed 100 characters" }, { status: 400 });
        }

        if (phone && (typeof phone !== 'string' || phone.trim().length > 20)) {
            return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
        }

        if (designation && (typeof designation !== 'string' || designation.trim().length > 100)) {
            return NextResponse.json({ error: "Invalid designation" }, { status: 400 });
        }

        await connectDB();
        const collectorData = {
            name: name.trim(),
            phone: phone?.trim(),
            designation: designation?.trim()
        };

        if (instituteId) {
            collectorData.institute = instituteId;
        }

        const collector = await Collector.create(collectorData);

        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'collector.create',
                resource: { type: 'Collector', id: collector._id },
                institute: session.user.institute.id,
                details: { name: collector.name }
            });
        } catch (auditError) {
            console.error('Audit log failed for collector creation:', auditError);
        }

        return NextResponse.json({ collector });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "A collector with this name already exists" }, { status: 400 });
        }
        console.error('Failed to create collector:', error);
        return NextResponse.json({ error: "Failed to create collector" }, { status: 500 });
    }
}
