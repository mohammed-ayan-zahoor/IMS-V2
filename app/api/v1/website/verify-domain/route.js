import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import WebsiteConfig from "@/models/WebsiteConfig";
import { getInstituteScope } from "@/middleware/instituteScope";
import { promises as dnsPromises } from "dns";

const { Resolver } = dnsPromises;

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const { domain } = await req.json();
        if (!domain) return Response.json({ error: "Domain is required" }, { status: 400 });

        await connectDB();
        const scope = await getInstituteScope(req);
        
        const config = await WebsiteConfig.findOne({ instituteId: scope.instituteId });
        if (!config) return Response.json({ error: "Website config not found" }, { status: 404 });

        // Expected verification string
        const expectedRecord = `yourapp-verify=${config.instituteId}`;

            // Setup custom resolver to bypass local DNS caching
            const resolver = new Resolver();
            resolver.setServers(['8.8.8.8', '1.1.1.1']); // Google and Cloudflare

            let flatRecords = [];
            
            // Try resolving the exact domain provided
            try {
                const records = await resolver.resolveTxt(domain);
                flatRecords = flatRecords.concat(records.map(r => r.join('')));
            } catch (e) {
                console.log(`No TXT for ${domain}`);
            }

            // If it starts with www., also check the root domain since users often put the TXT record on '@'
            if (domain.startsWith('www.')) {
                const rootDomain = domain.replace(/^www\./, '');
                try {
                    const rootRecords = await resolver.resolveTxt(rootDomain);
                    flatRecords = flatRecords.concat(rootRecords.map(r => r.join('')));
                } catch (e) {
                    console.log(`No TXT for ${rootDomain}`);
                }
            }
            
            // Loose matching to account for quotes or whitespace added by some DNS providers
            const isVerified = flatRecords.some(record => record.includes(expectedRecord));

            if (isVerified) {
                // Verification successful
                // Check if another institute already has this domain
                const existing = await WebsiteConfig.findOne({ domain, instituteId: { $ne: scope.instituteId } });
                if (existing) {
                    return Response.json({ error: "Domain already claimed by another institute" }, { status: 400 });
                }

                config.domain = domain;
                await config.save();
                
                return Response.json({ success: true, message: "Domain verified and linked successfully" });
            } else {
                return Response.json({ 
                    error: "Verification failed. DNS record not found. Note: DNS changes can take up to 48 hours to propagate.",
                    expected: expectedRecord,
                    found: flatRecords
                }, { status: 400 });
            }


    } catch (error) {
        console.error("Verify Domain Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
