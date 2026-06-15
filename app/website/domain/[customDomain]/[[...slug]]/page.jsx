import { connectDB } from "@/lib/mongodb";
import WebsiteConfig from "@/models/WebsiteConfig";
import PublicWebsitePage, { generateMetadata as publicGenerateMetadata } from "@/app/website/[instituteCode]/[[...slug]]/page";
import { notFound } from "next/navigation";

export const revalidate = 60; // We can't easily rely on revalidatePath when using domain routes dynamically without specific config, but we can do our best.

export async function generateMetadata({ params }) {
    const { customDomain, slug } = await params;
    await connectDB();

    const config = await WebsiteConfig.findOne({ domain: customDomain, isActive: true });
    if (!config) return {};

    // Forward to the standard metadata generator but pass the found instituteCode
    return publicGenerateMetadata({ 
        params: Promise.resolve({ instituteCode: config.subdomain, slug }) 
    });
}

export default async function CustomDomainPage({ params }) {
    const { customDomain, slug } = await params;
    await connectDB();

    // Secure domain validation (hard safety)
    const config = await WebsiteConfig.findOne({ domain: customDomain, isActive: true });
    
    if (!config) {
        notFound();
    }

    // Delegate to the standard renderer component, simulating the exact same parameters
    return <PublicWebsitePage params={Promise.resolve({ instituteCode: config.subdomain, slug })} />;
}
