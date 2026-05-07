import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import TransportFee from "@/models/TransportFee";
import TransportFeePreset from "@/models/TransportFeePreset";
import { createAuditLog } from "@/services/auditService";

// Generate installments based on billing cycle
function generateInstallments(billingCycle, amount, sessionStartMonth, sessionMonths = 12) {
    const installments = [];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const startMonth = sessionStartMonth || 3; // Default April (0-indexed: 3)
    const startYear = new Date().getFullYear();

    if (billingCycle === 'monthly') {
        for (let i = 0; i < sessionMonths; i++) {
            const monthIndex = (startMonth + i) % 12;
            const year = startYear + Math.floor((startMonth + i) / 12);
            const dueDate = new Date(year, monthIndex, 10); // Due on 10th
            installments.push({
                month: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
                label: `${months[monthIndex]} ${year}`,
                amount: amount,
                dueDate,
                status: 'pending'
            });
        }
    } else if (billingCycle === 'quarterly') {
        const quarterCount = Math.ceil(sessionMonths / 3);
        for (let i = 0; i < quarterCount; i++) {
            const monthIndex = (startMonth + (i * 3)) % 12;
            const year = startYear + Math.floor((startMonth + (i * 3)) / 12);
            const dueDate = new Date(year, monthIndex, 10);
            installments.push({
                month: `Q${i + 1}-${year}`,
                label: `Q${i + 1} ${year}-${String(year + 1).slice(-2)}`,
                amount: amount,
                dueDate,
                status: 'pending'
            });
        }
    } else if (billingCycle === 'annual') {
        const dueDate = new Date(startYear, startMonth, 10);
        installments.push({
            month: `${startYear}-annual`,
            label: `Annual ${startYear}-${String(startYear + 1).slice(-2)}`,
            amount: amount,
            dueDate,
            status: 'pending'
        });
    }

    return installments;
}

export async function GET(req) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('studentId');
        const sessionId = searchParams.get('sessionId');

        await connectDB();
        const query = { institute: scope.instituteId, deletedAt: null };
        if (studentId) query.student = studentId;
        if (sessionId) query.session = sessionId;

        const fees = await TransportFee.find(query)
            .populate('student', 'profile.firstName profile.lastName enrollmentNumber')
            .populate('route', 'name')
            .populate('vehicle', 'registrationNumber type')
            .populate('preset', 'name')
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ fees });
    } catch (error) {
        console.error("GET /api/v1/transport/fees error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "Institute context required" }, { status: 400 });
        }

        await connectDB();
        const body = await req.json();

        if (!body.student) {
            return NextResponse.json({ error: "Student is required" }, { status: 400 });
        }
        if (!body.presetId && (!body.billingCycle || !body.feePerCycle)) {
            return NextResponse.json({ error: "Fee preset or manual billing details required" }, { status: 400 });
        }

        let billingCycle = body.billingCycle;
        let feePerCycle = body.feePerCycle;

        // If preset is provided, use its values
        if (body.presetId) {
            const preset = await TransportFeePreset.findById(body.presetId).lean();
            if (!preset) {
                return NextResponse.json({ error: "Fee preset not found" }, { status: 404 });
            }
            billingCycle = preset.billingCycle;
            feePerCycle = preset.amount;
        }

        // Generate installments
        const installments = generateInstallments(billingCycle, feePerCycle);

        const transportFee = await TransportFee.create({
            institute: scope.instituteId,
            session: body.sessionId || null,
            student: body.student,
            route: body.route || null,
            vehicle: body.vehicle || null,
            preset: body.presetId || null,
            billingCycle,
            feePerCycle,
            installments
        });

        await createAuditLog({
            actor: session.user.id,
            action: 'transport.fee.create',
            resource: { type: 'TransportFee', id: transportFee._id },
            institute: scope.instituteId,
            details: { studentId: body.student, billingCycle, feePerCycle, installmentCount: installments.length }
        });

        return NextResponse.json(transportFee, { status: 201 });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "Transport fee already exists for this student in this session" }, { status: 409 });
        }
        console.error("POST /api/v1/transport/fees error:", error);
        return NextResponse.json({ error: "Failed to create transport fee" }, { status: 500 });
    }
}
