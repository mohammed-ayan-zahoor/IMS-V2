import { connectDB } from '@/lib/mongodb';
import WebsiteConfig from '@/models/WebsiteConfig';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';

export default async function sitemap() {
    try {
        await connectDB();
        const configs = await WebsiteConfig.find({ isActive: true }).select('subdomain updatedAt');
        const isLocal = ROOT_DOMAIN.includes('localhost');

        const schoolEntries = configs.map(config => ({
            url: isLocal
                ? `http://${ROOT_DOMAIN}/website/${config.subdomain}`
                : `https://${config.subdomain}.${ROOT_DOMAIN}`,
            lastModified: config.updatedAt || new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        }));

        return [
            {
                url: isLocal ? `http://${ROOT_DOMAIN}` : `https://${ROOT_DOMAIN}`,
                lastModified: new Date(),
                changeFrequency: 'monthly',
                priority: 1.0,
            },
            ...schoolEntries,
        ];
    } catch (error) {
        console.error('[Sitemap] Error generating sitemap:', error);
        return [];
    }
}
