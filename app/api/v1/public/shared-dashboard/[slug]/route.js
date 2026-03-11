import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SharedLink from "@/models/SharedLink";
import Fee from "@/models/Fee";
import Institute from "@/models/Institute";
import { getClientIp } from "@/lib/ip-helper";

// Simple in-memory rate limiter
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30;

function isRateLimited(ip) {
    const now = Date.now();
    const userData = rateLimitMap.get(ip) || { count: 0, startTime: now };
    
    if (now - userData.startTime > RATE_LIMIT_WINDOW) {
        userData.count = 1;
        userData.startTime = now;
    } else {
        userData.count++;
    }
    
    rateLimitMap.set(ip, userData);
    return userData.count > MAX_REQUESTS;
}

export async function GET(req, { params }) {
    try {
        const ip = getClientIp(req);
        if (isRateLimited(ip)) {
            return NextResponse.json({ error: "Too many requests" }, { status: 429 });
        }

        const { slug } = await params;
        await connectDB();

        const link = await SharedLink.findOne({ slug, isActive: true })
            .populate('institutes', 'name code branding');

        if (!link) {
            return NextResponse.json({ error: "Dashboard not found or inactive" }, { status: 404 });
        }

        // Check if link is expired
        if (link.settings?.expiresAt && new Date(link.settings.expiresAt) < new Date()) {
            return NextResponse.json({ error: "Dashboard has expired" }, { status: 403 });
        }

        // Fetch fees for all associated institutes
        // PII restriction: Only select id and enrollmentNumber, omit names
        const fees = await Fee.find({
            institute: { $in: link.institutes.map(i => i._id) },
            deletedAt: null
        })
            .populate('student', 'enrollmentNumber')
            .populate('batch', 'name text')
            .populate('institute', 'name')
            .sort({ createdAt: -1 });

        return NextResponse.json({
            success: true,
            link: {
                name: link.name,
                institutes: link.institutes,
                settings: link.settings,
                comments: link.comments // Include existing comments for display
            },
            fees
        });
    } catch (error) {
        console.error("Public Dashboard GET Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req, { params }) {
    try {
        const { slug } = await params;
        const body = await req.json();
        await connectDB();

        const { visitorName, studentId, text, followUpDate } = body;

        if (!visitorName || !studentId || !text) {
            return NextResponse.json({ error: "Missing required fields (Visitor Name, Student, Comment)" }, { status: 400 });
        }

        // Validate input lengths
        if (visitorName.length > 100 || text.length > 5000) {
            return NextResponse.json({ error: "Input exceeds maximum length" }, { status: 400 });
        }

        const link = await SharedLink.findOne({ slug, isActive: true });
        if (!link) {
            return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
        }

        // Verify studentId belongs to one of the shared institutes
        const validStudent = await Fee.exists({
            institute: { $in: link.institutes },
            student: studentId,
            deletedAt: null
        });
        if (!validStudent) {
            return NextResponse.json({ error: "Invalid student for this dashboard" }, { status: 400 });
        }

        const link = await SharedLink.findOne({ slug, isActive: true });
        if (!link) {
            return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
        }

        // Add comment to the shared link
        const newComment = {
            visitorName,
            studentId,
            text,
            followUpDate: followUpDate ? (isNaN(new Date(followUpDate).getTime()) ? null : new Date(followUpDate)) : null,
            createdAt: new Date()
        };

        link.comments.push(newComment);

        // Update visitor list if new
        const existingVisitor = link.visitors.find(v => v.name === visitorName);
        if (existingVisitor) {
            existingVisitor.lastVisited = new Date();
        } else {
            link.visitors.push({ name: visitorName, lastVisited: new Date() });
        }

        await link.save();

        return NextResponse.json({ success: true, comment: newComment });
    } catch (error) {
        console.error("Public Dashboard POST Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
