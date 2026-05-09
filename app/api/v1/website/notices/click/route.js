import { connectDB } from "@/lib/mongodb";
import WebsiteNotice from "@/models/WebsiteNotice";

export async function POST(req) {
    try {
        const { noticeId } = await req.json();
        if (!noticeId) return Response.json({ error: "Missing noticeId" }, { status: 400 });

        await connectDB();
        await WebsiteNotice.findByIdAndUpdate(noticeId, { $inc: { 'stats.clicks': 1 } });

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
