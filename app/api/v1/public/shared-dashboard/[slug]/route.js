import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SharedLink from "@/models/SharedLink";
import Fee from "@/models/Fee";
import Institute from "@/models/Institute";

export async function GET(req, { params }) {
    try {
        const { slug } = await params;
        await connectDB();

        const link = await SharedLink.findOne({ slug, isActive: true })
            .populate('institutes', 'name code branding');

        if (!link) {
            return NextResponse.json({ error: "Dashboard not found or inactive" }, { status: 404 });
        }

        // Fetch fees for all associated institutes
        const fees = await Fee.find({ 
            institute: { $in: link.institutes.map(i => i._id) },
            deletedAt: null 
        })
        .populate('student', 'profile.firstName profile.lastName enrollmentNumber')
        .populate('batch', 'name')
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

        const link = await SharedLink.findOne({ slug, isActive: true });
        if (!link) {
            return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
        }

        // Add comment to the shared link
        const newComment = {
            visitorName,
            studentId,
            text,
            followUpDate: followUpDate ? new Date(followUpDate) : null,
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
