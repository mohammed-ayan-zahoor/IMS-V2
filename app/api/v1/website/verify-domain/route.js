import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import WebsiteConfig from "@/models/WebsiteConfig";
import { getInstituteScope } from "@/middleware/instituteScope";
import dns from "dns";
import { promisify } from "util";

const resolveTxt = promisify(dns.resolveTxt);

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

        try {
            // DNS Lookup for TXT records
            const records = await resolveTxt(domain);
            
            // Flatten the array of arrays returned by dns.resolveTxt
            const flatRecords = records.map(r => r.join(''));
            
            if (flatRecords.includes(expectedRecord)) {
                // Verification successful
                // Note: Actual saving of domain might happen in a different settings save endpoint, 
                // or you can save it here. Let's save it here for simplicity.
                
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
                    error: "Verification failed. DNS record not found.",
                    expected: expectedRecord,
                    found: flatRecords
                }, { status: 400 });
            }
        } catch (dnsError) {
            console.error("DNS Resolution Error:", dnsError);
            return Response.json({ 
                error: "Failed to resolve DNS records. Ensure the domain exists and has the TXT record.",
                expected: expectedRecord
            }, { status: 400 });
        }

    } catch (error) {
        console.error("Verify Domain Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
