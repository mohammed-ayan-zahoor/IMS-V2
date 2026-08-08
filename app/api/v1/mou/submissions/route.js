import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import MouSubmission from "@/models/MouSubmission";

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
            action,
            signatureDataUrl,
            screenWidth,
            screenHeight
        } = body;

        // Strict validation — city is optional; not all schools fill it in
        if (!refId || !schoolName || !principalName || !contactEmail || !studentCount || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Get IP and UserAgent
        const ip = req.headers.get("x-forwarded-for") || req.ip || "127.0.0.1";
        const userAgent = req.headers.get("user-agent") || "";

        const duration = Math.max(1, Number(mouDuration) || 1);
        const count = Math.max(0, Number(studentCount) || 0);

        let upfrontPercent = 0.5;
        if (count <= 500) {
            upfrontPercent = 1;
        } else if (count <= 1000) {
            upfrontPercent = 0.75;
        }

        const calculatedTotal = count * 59 * duration;
        const calculatedUpfront = calculatedTotal * upfrontPercent;

        // If client-provided price is missing duration multiplier or invalid, use calculated
        let finalTotalPrice = Number(totalPrice);
        if (!finalTotalPrice || (duration > 1 && finalTotalPrice === count * 59)) {
            finalTotalPrice = calculatedTotal;
        }

        let finalUpfrontPrice = Number(upfrontPrice);
        if (!finalUpfrontPrice || (duration > 1 && Math.abs(finalUpfrontPrice - (count * 59 * 0.7)) < 1)) {
            finalUpfrontPrice = calculatedUpfront;
        }

        const submission = await MouSubmission.create({
            refId,
            schoolName,
            city,
            principalName,
            designation,
            contactEmail,
            contactPhone,
            studentCount: count,
            udiseCode,
            address,
            totalPrice: finalTotalPrice,
            upfrontPrice: finalUpfrontPrice,
            mouDuration: duration,
            action,
            signatureDataUrl,
            metadata: {
                ip,
                userAgent,
                screenWidth: Number(screenWidth) || undefined,
                screenHeight: Number(screenHeight) || undefined
            }
        });

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

        // Extract query parameters
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";
        const status = searchParams.get("status") || "";
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const skip = (page - 1) * limit;

        const query = {};

        if (status) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { schoolName: { $regex: search, $options: "i" } },
                { principalName: { $regex: search, $options: "i" } },
                { refId: { $regex: search, $options: "i" } },
                { contactEmail: { $regex: search, $options: "i" } }
            ];
        }

        const total = await MouSubmission.countDocuments(query);
        const submissions = await MouSubmission.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Auto-heal legacy records where mouDuration > 1 but totalPrice was not multiplied by duration
        for (const sub of submissions) {
            const count = sub.studentCount || 0;
            const duration = sub.mouDuration || 1;
            if (count > 0 && duration > 1 && sub.totalPrice === count * 59) {
                let upfrontPercent = 0.5;
                if (count <= 500) upfrontPercent = 1;
                else if (count <= 1000) upfrontPercent = 0.75;

                sub.totalPrice = count * 59 * duration;
                sub.upfrontPrice = sub.totalPrice * upfrontPercent;
                await sub.save().catch(e => console.error("Auto-heal MouSubmission error:", e));
            }
        }

        return NextResponse.json(
            {
                submissions,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            },
            {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
                }
            }
        );
    } catch (error) {
        console.error("Failed to fetch MOU submissions:", error);
        return NextResponse.json({ error: "Failed to fetch MOU submissions" }, { status: 500 });
    }
}
