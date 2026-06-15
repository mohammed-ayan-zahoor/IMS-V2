import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import WebsiteConfig from "@/models/WebsiteConfig";
import WebsitePage from "@/models/WebsitePage";
import { getInstituteScope } from "@/middleware/instituteScope";
import { revalidatePath } from "next/cache";

export async function POST(req) {
    let session_db;
    try {
        const session = await getServerSession(authOptions);
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const scope = await getInstituteScope(req);
        
        // Start MongoDB Transaction
        session_db = await mongoose.startSession();
        
        await session_db.withTransaction(async () => {
            const config = await WebsiteConfig.findOne({ instituteId: scope.instituteId }).session(session_db);
            if (!config) throw new Error("Website configuration not found");

            // Atomic update to copy draftContent to liveContent for all pages of this website
            await WebsitePage.updateMany(
                { websiteConfigId: config._id },
                [
                    {
                        $set: {
                            liveContent: { $ifNull: ["$draftContent", "$sections"] }
                        }
                    }
                ],
                { session: session_db }
            );

            // Update WebsiteConfig status to published
            config.status = 'published';
            await config.save({ session: session_db });
        });

        // End session
        await session_db.endSession();

        // Invalidate Next.js cache so the public site updates instantly
        const configToInvalidate = await WebsiteConfig.findOne({ instituteId: scope.instituteId });
        if (configToInvalidate) {
            // Revalidate the subdomain path
            revalidatePath(`/website/${configToInvalidate.subdomain}`, 'layout');
            // If custom domain exists, we can't easily revalidate it using revalidatePath based on host.
            // But we can trigger a revalidatePath on the generic paths to be safe.
            if (configToInvalidate.domain) {
                revalidatePath(`/website/domain/${configToInvalidate.domain}`, 'layout');
            }
        }

        return Response.json({ success: true, message: "Website published successfully" });
    } catch (error) {
        if (session_db) await session_db.endSession();
        console.error("Website Publish Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
