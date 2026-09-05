import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import MouSubmission from "@/models/MouSubmission";
import Notification from "@/models/Notification";

// POST /api/v1/mou/submissions (Public endpoint for logging MOU clicks)
export async function POST(req) {
    try {
        await connectDB();
        const body = await req.json();

        const {
            refId,
            schoolName,
            city,
            principalName,
            designation,
            contactEmail,
            contactPhone,
            studentCount,
            udiseCode,
            address,
            totalPrice,
            upfrontPrice,
            mouDuration,
            perStudentRate,
            planType,
            instituteType,
            yearWiseCounts,
            coupon,
            action,
            status,
            notes,
            signatureDataUrl,
            screenWidth,
            screenHeight
        } = body;

        // Validation — city is optional; studentCount must be a number
        if (!refId || !schoolName || !principalName || !contactEmail || studentCount === undefined || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Get IP and UserAgent
        const ip = req.headers.get("x-forwarded-for") || req.ip || "127.0.0.1";
        const userAgent = req.headers.get("user-agent") || "";

        const duration = Math.max(1, Number(mouDuration) || 1);
        const count = Math.max(0, Number(studentCount) || 0);
        const rate = Math.max(1, Number(perStudentRate) || 59);
        const plan = ['standard', 'plus', 'custom'].includes(planType) ? planType : (rate === 69 ? 'plus' : (rate === 59 ? 'standard' : 'custom'));

        let upfrontPercent = 0.5;
        if (count <= 500) {
            upfrontPercent = 1;
        } else if (count <= 1000) {
            upfrontPercent = 0.75;
        }

        const calculatedTotal = count * rate * duration;
        const calculatedUpfront = calculatedTotal * upfrontPercent;

        let finalTotalPrice = Number(totalPrice);
        if (!finalTotalPrice || (duration > 1 && finalTotalPrice === count * rate)) {
            finalTotalPrice = calculatedTotal;
        }

        let finalUpfrontPrice = Number(upfrontPrice);
        if (!finalUpfrontPrice) {
            finalUpfrontPrice = calculatedUpfront;
        }

        const submissionData = {
            refId,
            schoolName: schoolName.trim(),
            city: (city || "").trim(),
            principalName: principalName.trim(),
            designation: (designation || "Principal").trim(),
            contactEmail: contactEmail.trim(),
            contactPhone: (contactPhone || "").trim(),
            studentCount: count,
            udiseCode: (udiseCode || "").trim(),
            address: (address || "").trim(),
            totalPrice: finalTotalPrice,
            upfrontPrice: finalUpfrontPrice,
            mouDuration: duration,
            perStudentRate: rate,
            planType: plan,
            instituteType: ['school', 'college_degree', 'college_pu'].includes(instituteType) ? instituteType : 'school',
            ...(yearWiseCounts && { yearWiseCounts }),
            ...(coupon && { coupon: coupon.trim().toUpperCase() }),
            action,
            ...(status && { status }),
            ...(notes && { notes }),
            metadata: {
                ip,
                userAgent,
                screenWidth: Number(screenWidth) || undefined,
                screenHeight: Number(screenHeight) || undefined
            }
        };

        if (signatureDataUrl) {
            submissionData.signatureDataUrl = signatureDataUrl;
        }

        // Upsert by refId so re-submitting / re-downloading updates the existing MOU tracker record
        const submission = await MouSubmission.findOneAndUpdate(
            { refId },
            { $set: submissionData },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // Notify Super Admins of new MOU submission
        try {
            await Notification.create({
                institute: submission._id, // placeholder for system notifications
                recipientRole: "super_admin",
                title: "New MOU Submission",
                message: `${schoolName.trim()} submitted MOU for ${count} students (₹${finalTotalPrice.toLocaleString('en-IN')})`,
                type: "SYSTEM",
                link: "/admin/mou-tracker"
            });
        } catch (nErr) {
            // Non-blocking notification creation error
        }

        return NextResponse.json({ success: true, submission });
    } catch (error) {
        console.error("MOU Submission Logging failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';

// GET /api/v1/mou/submissions (Admin-only list submissions)
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        const query = {};
        if (search) {
            query.$or = [
                { schoolName: { $regex: search, $options: 'i' } },
                { principalName: { $regex: search, $options: 'i' } },
                { contactEmail: { $regex: search, $options: 'i' } },
                { city: { $regex: search, $options: 'i' } },
                { refId: { $regex: search, $options: 'i' } }
            ];
        }

        if (status) {
            query.status = status;
        }

        const skip = (page - 1) * limit;

        const [submissions, total] = await Promise.all([
            MouSubmission.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            MouSubmission.countDocuments(query)
        ]);

        return NextResponse.json({
            success: true,
            submissions,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("GET /api/v1/mou/submissions error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
