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
            action,
            signatureDataUrl,
            screenWidth,
            screenHeight
        } = body;

        // Strict validation
        if (!refId || !schoolName || !city || !principalName || !contactEmail || !studentCount || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Get IP and UserAgent
        const ip = req.headers.get("x-forwarded-for") || req.ip || "127.0.0.1";
        const userAgent = req.headers.get("user-agent") || "";

        const submission = await MouSubmission.create({
            refId,
            schoolName,
            city,
            principalName,
            designation,
            contactEmail,
            contactPhone,
            studentCount: Number(studentCount),
            udiseCode,
            address,
            totalPrice: Number(totalPrice),
            upfrontPrice: Number(upfrontPrice),
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

        return NextResponse.json({
            submissions,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Failed to fetch MOU submissions:", error);
        return NextResponse.json({ error: "Failed to fetch MOU submissions" }, { status: 500 });
    }
}
