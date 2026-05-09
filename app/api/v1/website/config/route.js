import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import WebsiteConfig from "@/models/WebsiteConfig";
import WebsitePage from "@/models/WebsitePage";
import { getInstituteScope } from "@/middleware/instituteScope";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const scope = await getInstituteScope(req);
        
        if (!scope?.instituteId) {
            return Response.json({ error: "Institute scope not verified" }, { status: 401 });
        }

        let config = await WebsiteConfig.findOne({ instituteId: scope.instituteId });
        
        // Auto-create config if missing
        if (!config) {
            const Institute = (await import("@/models/Institute")).default;
            const institute = await Institute.findById(scope.instituteId);
            
            config = await WebsiteConfig.create({
                instituteId: scope.instituteId,
                subdomain: institute?.code?.toLowerCase() || `school-${scope.instituteId.toString().slice(-6)}`,
                template: institute?.type || 'SCHOOL'
            });
        }

        const pages = await WebsitePage.find({ websiteConfigId: config._id }).sort({ createdAt: 1 });

        return Response.json({ config, pages });
    } catch (error) {
        console.error("Website Config GET Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope?.instituteId) {
            return Response.json({ error: "Institute scope not verified" }, { status: 401 });
        }

        const config = await WebsiteConfig.findOneAndUpdate(
            { instituteId: scope.instituteId },
            { $set: body },
            { new: true }
        );

        return Response.json({ success: true, config });
    } catch (error) {
        console.error("Website Config PUT Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
