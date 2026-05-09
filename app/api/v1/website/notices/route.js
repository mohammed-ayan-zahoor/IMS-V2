import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import WebsiteNotice from "@/models/WebsiteNotice";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');

        await connectDB();
        
        const now = new Date();
        const notices = await WebsiteNotice.find({ 
            instituteId,
            status: 'active',
            $and: [
                { $or: [{ scheduledStart: { $exists: false } }, { scheduledStart: null }, { scheduledStart: { $lte: now } }] },
                { $or: [{ scheduledEnd: { $exists: false } }, { scheduledEnd: null }, { scheduledEnd: { $gte: now } }] }
            ]
        }).sort({ displayOrder: 1 });

        // Increment views (async, don't wait)
        WebsiteNotice.updateMany(
            { _id: { $in: notices.map(n => n._id) } },
            { $inc: { 'stats.views': 1 } }
        ).catch(err => console.error("Stats Error:", err));

        return Response.json({ notices });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const data = await req.json();

        await connectDB();
        
        const notice = await WebsiteNotice.create({
            ...data,
            instituteId: session.user.instituteId
        });

        return Response.json({ success: true, notice });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const { _id, ...updateData } = await req.json();

        await connectDB();
        const notice = await WebsiteNotice.findOneAndUpdate(
            { _id, instituteId: session.user.instituteId },
            { $set: updateData },
            { new: true }
        );

        if (!notice) return Response.json({ error: "Notice not found" }, { status: 404 });

        return Response.json({ success: true, notice });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        await connectDB();
        const notice = await WebsiteNotice.findOneAndDelete({ _id: id, instituteId: session.user.instituteId });
        if (!notice) return Response.json({ error: "Notice not found" }, { status: 404 });

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
