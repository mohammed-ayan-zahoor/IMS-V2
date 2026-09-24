import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import HRSettings from "@/models/HRSettings";
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

        let settings = await HRSettings.findOne({ institute: instituteId });
        if (!settings) {
            // Create default settings if not exists
            settings = await HRSettings.create({
                institute: instituteId,
                shiftStart: "09:00",
                shiftEnd: "18:00",
                checkInGraceMins: 15,
                checkOutGraceMins: 10,
                deductionRatePerHour: 100,
                midDayOutEnabled: true,
                overtimeEnabled: true,
                overtimeBufferMins: 30,
                overtimeRatePerHour: 150
            });
        }

        return NextResponse.json({ settings });
    } catch (error) {
        console.error("Failed to fetch HR settings:", error);
        return NextResponse.json({ error: "Failed to fetch HR settings" }, { status: 500 });
    }
}

export async function PATCH(req) {
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
        const allowedFields = [
            'shiftStart',
            'shiftEnd',
            'checkInGraceMins',
            'checkOutGraceMins',
            'deductionRatePerHour',
            'midDayOutEnabled',
            'overtimeEnabled',
            'overtimeBufferMins',
            'overtimeRatePerHour'
        ];

        const updateData = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }

        await connectDB();

        const settings = await HRSettings.findOneAndUpdate(
            { institute: instituteId },
            { $set: updateData },
            { new: true, upsert: true, runValidators: true }
        );

        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'hr.settings.update',
                resource: { type: 'HRSettings', id: settings._id },
                institute: instituteId,
                details: updateData
            });
        } catch (auditError) {
            console.error('Audit log failed:', auditError);
        }

        return NextResponse.json({ success: true, settings });
    } catch (error) {
        console.error("Failed to update HR settings:", error);
        return NextResponse.json({ error: "Failed to update HR settings" }, { status: 500 });
    }
}
