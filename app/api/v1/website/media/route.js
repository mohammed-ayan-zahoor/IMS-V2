import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import WebsiteMedia from "@/models/WebsiteMedia";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        
        const media = await WebsiteMedia.find({ instituteId: session.user.instituteId })
            .sort({ createdAt: -1 });

        return Response.json({ media });
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
        
        const media = await WebsiteMedia.findOne({ _id: id, instituteId: session.user.instituteId });
        if (!media) return Response.json({ error: "Media not found" }, { status: 404 });

        // Delete from Cloudinary
        const { default: cloudinary } = await import("@/lib/cloudinary");
        await cloudinary.uploader.destroy(media.publicId);

        // Delete from DB
        await WebsiteMedia.findByIdAndDelete(id);

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
