import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getInstituteScope, addInstituteFilter } from "@/middleware/instituteScope";
import { connectDB } from "@/lib/mongodb";
import HostelAllotment from "@/models/HostelAllotment";
import HostelRoom from "@/models/HostelRoom";
import HostelBlock from "@/models/HostelBlock";
import Session from "@/models/Session";
import User from "@/models/User";
import { createAuditLog } from "@/services/auditService";

// Helper to generate installments
function generateInstallments(billingCycle, feePerCycle, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const installments = [];

    if (billingCycle === 'annual') {
        installments.push({
            month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
            label: `Annual Fee (${start.getFullYear()}-${String(end.getFullYear()).slice(-2)})`,
            amount: feePerCycle,
            dueDate: new Date(start.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days after start
            status: 'pending'
        });
    } else if (billingCycle === 'quarterly') {
        let current = new Date(start);
        let qCount = 1;
        while (current < end && qCount <= 4) {
            const qYear = current.getFullYear();
            installments.push({
                month: `Q${qCount}-${qYear}`,
                label: `Quarter ${qCount} Fee (${qYear})`,
                amount: feePerCycle,
                dueDate: new Date(current),
                status: 'pending'
            });
            current.setMonth(current.getMonth() + 3);
            qCount++;
        }
    } else {
        // Monthly
        let current = new Date(start);
        while (current <= end) {
            const year = current.getFullYear();
            const monthVal = current.getMonth() + 1;
            const monthStr = String(monthVal).padStart(2, '0');
            const monthLabel = current.toLocaleString('default', { month: 'long', year: 'numeric' });

            const dueDate = new Date(year, monthVal - 1, 10);

            installments.push({
                month: `${year}-${monthStr}`,
                label: monthLabel,
                amount: feePerCycle,
                dueDate,
                status: 'pending'
            });

            current.setMonth(current.getMonth() + 1);
        }
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
        const session = searchParams.get('session');
        const block = searchParams.get('block');
        const room = searchParams.get('room');
        const student = searchParams.get('student');
        const status = searchParams.get('status');

        await connectDB();

        const filter = addInstituteFilter({ deletedAt: null }, scope);
        if (session) filter.session = session;
        if (block) filter.block = block;
        if (room) filter.room = room;
        if (student) filter.student = student;
        if (status) filter.status = status;

        const allotments = await HostelAllotment.find(filter)
            .populate('student', 'profile.firstName profile.lastName email enrollmentNumber')
            .populate('room', 'roomNumber type capacity monthlyRent')
            .populate('block', 'name type')
            .populate('session', 'sessionName')
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ allotments });
    } catch (error) {
        console.error("GET /api/v1/hostel/allotments error:", error);
        return NextResponse.json({ error: "Failed to fetch allotments" }, { status: 500 });
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
        const { session, student, room, block, allotmentDate, billingCycle, feePerCycle, notes } = body;

        // Validation
        if (!session) return NextResponse.json({ error: "Session is required" }, { status: 400 });
        if (!student) return NextResponse.json({ error: "Student is required" }, { status: 400 });
        if (!room) return NextResponse.json({ error: "Room is required" }, { status: 400 });
        if (!block) return NextResponse.json({ error: "Block is required" }, { status: 400 });
        if (!billingCycle || !['monthly', 'quarterly', 'annual'].includes(billingCycle)) {
            return NextResponse.json({ error: "Valid billing cycle is required" }, { status: 400 });
        }
        if (feePerCycle === undefined || parseFloat(feePerCycle) < 0) {
            return NextResponse.json({ error: "Valid fee per cycle is required" }, { status: 400 });
        }

        // 1. Check if room exists and has capacity
        const existingRoom = await HostelRoom.findOne({ _id: room, institute: scope.instituteId, deletedAt: null });
        if (!existingRoom) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
        }

        const activeOccupancy = await HostelAllotment.countDocuments({
            room,
            session,
            status: 'active',
            deletedAt: null
        });

        if (activeOccupancy >= existingRoom.capacity) {
            return NextResponse.json({ error: "Selected room is already fully occupied" }, { status: 400 });
        }

        // 2. Check if student already has active allotment in this session
        const existingAllotment = await HostelAllotment.findOne({
            student,
            session,
            status: 'active',
            deletedAt: null
        });
        if (existingAllotment) {
            return NextResponse.json({ error: "Student is already allotted to a room in this academic session" }, { status: 400 });
        }

        // 3. Fetch academic session dates
        const academicSession = await Session.findOne({ _id: session, instituteId: scope.instituteId });
        if (!academicSession) {
            return NextResponse.json({ error: "Selected academic session not found" }, { status: 404 });
        }

        // 4. Generate installments
        const feeCycleNum = parseFloat(feePerCycle);
        const installments = generateInstallments(
            billingCycle,
            feeCycleNum,
            academicSession.startDate,
            academicSession.endDate
        );

        const totalAmount = installments.reduce((sum, i) => sum + i.amount, 0);

        const allotmentData = {
            institute: scope.instituteId,
            session,
            student,
            room,
            block,
            allotmentDate: allotmentDate ? new Date(allotmentDate) : new Date(),
            status: 'active',
            billingCycle,
            feePerCycle: feeCycleNum,
            installments,
            totalAmount,
            balanceAmount: totalAmount,
            feeStatus: 'not_started',
            notes: notes || undefined,
            allottedBy: scope.user.id
        };

        const allotment = await HostelAllotment.create(allotmentData);

        try {
            await createAuditLog({
                actor: scope.user.id,
                action: 'hostel.allotment.create',
                resource: { type: 'HostelAllotment', id: allotment._id },
                institute: scope.instituteId,
                details: { student, room, totalAmount }
            });
        } catch (auditError) {
            console.error("Failed to write audit log:", auditError);
        }

        return NextResponse.json({ allotment });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "Student already has an active room allotment for this session" }, { status: 400 });
        }
        console.error("POST /api/v1/hostel/allotments error:", error);
        return NextResponse.json({ error: "Failed to create allotment" }, { status: 500 });
    }
}
