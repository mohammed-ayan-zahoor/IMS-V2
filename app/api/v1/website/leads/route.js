import { connectDB } from "@/lib/mongodb";
import WebsiteLead from "@/models/WebsiteLead";
import WebsiteConfig from "@/models/WebsiteConfig";
import Institute from "@/models/Institute";

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, email, phone, subject, message, instituteCode } = body;

        if (!name || !email || !subject || !message || !instituteCode) {
            return Response.json({ error: "Missing required fields" }, { status: 400 });
        }

        await connectDB();

        // Find institute to get its ID
        const institute = await Institute.findOne({ code: { $regex: new RegExp(`^${instituteCode}$`, 'i') } });
        if (!institute) {
            return Response.json({ error: "Institute not found" }, { status: 404 });
        }

        const config = await WebsiteConfig.findOne({ instituteId: institute._id });
        if (!config) {
            return Response.json({ error: "Website configuration not found" }, { status: 404 });
        }

        const lead = await WebsiteLead.create({
            instituteId: institute._id,
            websiteConfigId: config._id,
            name,
            email,
            phone,
            subject,
            message,
            metadata: {
                ip: req.headers.get('x-forwarded-for') || 'unknown',
                userAgent: req.headers.get('user-agent'),
                pageUrl: req.headers.get('referer')
            }
        });

        // TODO: Trigger email notification to institute admins

        return Response.json({ success: true, leadId: lead._id });
    } catch (error) {
        console.error("Lead Capture Error:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
