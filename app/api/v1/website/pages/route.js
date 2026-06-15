import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import WebsiteConfig from "@/models/WebsiteConfig";
import WebsitePage from "@/models/WebsitePage";
import { getInstituteScope } from "@/middleware/instituteScope";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const { title, slug, sections, websiteConfigId, seoTitle, seoDescription, keywords } = await req.json();

        await connectDB();
        const scope = await getInstituteScope(req);
        
        let configId = websiteConfigId;
        if (!configId) {
            const config = await WebsiteConfig.findOne({ instituteId: scope.instituteId });
            configId = config?._id;
        }

        if (!configId) throw new Error("Website configuration not found");

        // Upsert page by slug
        const page = await WebsitePage.findOneAndUpdate(
            { websiteConfigId: configId, slug: slug || 'index' },
            { 
                $set: { 
                    title: title || 'Home',
                    draftContent: sections,
                    seoTitle,
                    seoDescription,
                    keywords,
                    lastModifiedBy: session.user.id
                } 
            },
            { new: true, upsert: true }
        );

        // Trigger Real-time update
        const { getPusherInstance } = await import("@/lib/pusher");
        const config = await WebsiteConfig.findById(configId);
        const pusher = await getPusherInstance(config.instituteId);
        await pusher.trigger(
            `presence-website-${config.instituteId}-${slug || 'index'}`,
            'page-update',
            { sections, updatedBy: session.user.id }
        );

        return Response.json({ success: true, page });
    } catch (error) {
        console.error("Website Page POST Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const scope = await getInstituteScope(req);
        
        const config = await WebsiteConfig.findOne({ instituteId: scope.instituteId });
        if (!config) return Response.json({ pages: [] });

        const pages = await WebsitePage.find({ websiteConfigId: config._id }).sort({ title: 1 });
        return Response.json({ pages });
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
        const scope = await getInstituteScope(req);
        const config = await WebsiteConfig.findOne({ instituteId: scope.instituteId });

        const page = await WebsitePage.findOneAndDelete({ _id: id, websiteConfigId: config?._id });
        if (!page) return Response.json({ error: "Page not found" }, { status: 404 });

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
