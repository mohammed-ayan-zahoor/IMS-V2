const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
const isLocal = ROOT_DOMAIN.includes('localhost');
const baseUrl = isLocal ? `http://${ROOT_DOMAIN}` : `https://${ROOT_DOMAIN}`;

export default function robots() {
    return {
        rules: [
            {
                userAgent: '*',
                allow: ['/', '/landing.html', '/website/'],
                disallow: ['/admin/', '/api/', '/student/', '/super-admin/', '/login', '/unauthorized'],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
