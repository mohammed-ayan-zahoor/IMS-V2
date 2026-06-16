import { connectDB } from "@/lib/mongodb";
import WebsiteConfig from "@/models/WebsiteConfig";
import WebsitePage from "@/models/WebsitePage";
import Institute from "@/models/Institute";
import WebsiteHeader from "@/components/website/public/WebsiteHeader";
import WebsiteFooter from "@/components/website/public/WebsiteFooter";
import HeroSection from "@/components/website/public/HeroSection";
import FeaturesGrid from "@/components/website/public/FeaturesGrid";
import ContactSection from "@/components/website/public/ContactSection";
import SlidingNotices from "@/components/website/public/SlidingNotices";
import FacultyDirectory from "@/components/website/public/FacultyDirectory";
import PlacementStats from "@/components/website/public/PlacementStats";
import ProgramsSection from "@/components/website/public/ProgramsSection";
import TestimonialsSection from "@/components/website/public/TestimonialsSection";
import GallerySection from "@/components/website/public/GallerySection";
import FooterSection from "@/components/website/public/FooterSection";
import HeroUIComponentSection from "@/components/website/public/HeroUIComponentSection";
import { SECTION_TYPES } from "@/services/pageBuilderService";
import { notFound } from 'next/navigation';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';

export const revalidate = 60;

const THEME_PRESETS = {
    modern:  { primary: '#3B82F6', secondary: '#8B5CF6', font: 'Inter' },
    classic: { primary: '#1e3a5f', secondary: '#c9a84c', font: 'Merriweather' },
    bold:    { primary: '#7C3AED', secondary: '#EC4899', font: 'Outfit' },
    minimal: { primary: '#18181B', secondary: '#71717A', font: 'DM Sans' },
    dark:    { primary: '#10B981', secondary: '#3B82F6', font: 'Space Grotesk' },
};

// ─── SEO Metadata ────────────────────────────────────────────────────────────

export async function generateMetadata({ params }) {
    const { instituteCode, slug } = await params;
    const pageSlug = (slug && slug[0]) || 'index';
    await connectDB();

    let institute = await Institute.findOne({
        code: { $regex: new RegExp(`^${instituteCode}$`, 'i') }
    }).select('name type branding address contactPhone contactEmail');

    let config = null;
    if (institute) {
        config = await WebsiteConfig.findOne({ instituteId: institute._id });
    } else {
        config = await WebsiteConfig.findOne({ subdomain: { $regex: new RegExp(`^${instituteCode}$`, 'i') } });
        if (config) {
            institute = await Institute.findById(config.instituteId).select('name type branding address contactPhone contactEmail');
        }
    }

    if (!institute || !config) return {};

    const page = await WebsitePage.findOne({ websiteConfigId: config._id, slug: pageSlug });

    // Priority: Page-specific SEO Title -> Custom page fallback -> Global SEO title -> School fallback
    const defaultTitle = config?.settings?.seoTitle || `${institute.name} | Official Website`;
    const title = page?.seoTitle 
        ? page.seoTitle 
        : (pageSlug === 'index' ? defaultTitle : `${page?.title || pageSlug.toUpperCase().replace('-', ' ')} | ${defaultTitle}`);

    const description = page?.seoDescription || config?.settings?.seoDescription ||
        `Welcome to ${institute.name}.${institute.address?.city ? ` Located in ${institute.address.city}.` : ''} Admissions open ${new Date().getFullYear()}.`;

    const keywords = page?.keywords || `${institute.name}, ${institute.address?.city || ''} school, admission ${new Date().getFullYear()}, ${institute.address?.state || ''} institute`;

    const subdomain = config?.subdomain || instituteCode.toLowerCase();
    const isLocal = ROOT_DOMAIN.includes('localhost');
    const siteUrl = isLocal
        ? (pageSlug === 'index' 
            ? `http://${ROOT_DOMAIN}/website/${instituteCode}` 
            : `http://${ROOT_DOMAIN}/website/${instituteCode}/${pageSlug}`)
        : (pageSlug === 'index'
            ? `https://${subdomain}.${ROOT_DOMAIN}`
            : `https://${subdomain}.${ROOT_DOMAIN}/${pageSlug}`);

    const logo = institute.branding?.logo || config?.branding?.logo;

    return {
        title,
        description,
        keywords,
        robots: {
            index: true,
            follow: true,
            googleBot: { index: true, follow: true, 'max-image-preview': 'large' }
        },
        alternates: { canonical: siteUrl },
        openGraph: {
            type: 'website',
            url: siteUrl,
            title,
            description,
            siteName: institute.name,
            locale: 'en_IN',
            images: logo
                ? [{ url: logo, width: 1200, height: 630, alt: `${institute.name} logo` }]
                : [],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: logo ? [logo] : [],
        },
    };
}

// ─── Section Renderer ─────────────────────────────────────────────────────────

const RenderSection = ({ section, instituteId, instituteCode, instituteName, preset }) => {
    const props = { content: section.content, preset };
    switch (section.type) {
        case SECTION_TYPES.HERO:            return <HeroSection {...props} />;
        case SECTION_TYPES.FEATURES:        return <FeaturesGrid {...props} />;
        case SECTION_TYPES.CONTACT:         return <ContactSection {...props} instituteCode={instituteCode} />;
        case SECTION_TYPES.NOTICES:         return <SlidingNotices {...props} instituteId={instituteId} />;
        case SECTION_TYPES.FACULTY:         return <FacultyDirectory {...props} />;
        case SECTION_TYPES.PLACEMENT_STATS: return <PlacementStats {...props} />;
        case SECTION_TYPES.PROGRAMS:        return <ProgramsSection {...props} instituteId={instituteId} />;
        case SECTION_TYPES.TESTIMONIALS:    return <TestimonialsSection {...props} />;
        case SECTION_TYPES.GALLERY:         return <GallerySection {...props} />;
        case SECTION_TYPES.FOOTER:          return <FooterSection {...props} instituteName={instituteName} />;
        default:                            return null;
    }
};

// ─── Page ─────────────────────────────────────────────────────────────────────

async function PublicWebsitePage({ params }) {
    const { instituteCode, slug } = await params;
    const pageSlug = (slug && slug[0]) || 'index';
    await connectDB();

    let institute = await Institute.findOne({
        code: { $regex: new RegExp(`^${instituteCode}$`, 'i') }
    }).select('name type branding address contactPhone contactEmail');

    let config = null;
    if (institute) {
        config = await WebsiteConfig.findOne({ instituteId: institute._id });
    } else {
        config = await WebsiteConfig.findOne({ subdomain: { $regex: new RegExp(`^${instituteCode}$`, 'i') } });
        if (config) {
            institute = await Institute.findById(config.instituteId).select('name type branding address contactPhone contactEmail');
        }
    }

    if (!institute || !config || !config.isActive || config.status !== 'published') notFound();

    let page = await WebsitePage.findOne({ websiteConfigId: config._id, slug: pageSlug });
    if (!page) notFound();

    page = JSON.parse(JSON.stringify(page));

    // Fetch all pages to generate navigation menu
    let pages = await WebsitePage.find({ websiteConfigId: config._id }).select('title slug').sort({ title: 1 });
    pages = JSON.parse(JSON.stringify(pages));

    const websiteData = JSON.parse(JSON.stringify({
        ...config.toObject(),
        instituteName: institute.name,
        instituteLogo: institute.branding?.logo
    }));

    // ── Theme CSS Variables ──────────────────────────────────────────────────
    const preset = THEME_PRESETS[config?.theme?.preset || 'modern'];
    const primaryColor   = config?.branding?.primaryColor   || preset.primary;
    const secondaryColor = config?.branding?.secondaryColor || preset.secondary;
    const fontFamily     = config?.branding?.fontFamily     || preset.font;

    // ── JSON-LD Structured Data ──────────────────────────────────────────────
    const subdomain = config?.subdomain || instituteCode.toLowerCase();
    const isLocal = ROOT_DOMAIN.includes('localhost');
    const siteUrl = isLocal
        ? (pageSlug === 'index'
            ? `http://${ROOT_DOMAIN}/website/${instituteCode}`
            : `http://${ROOT_DOMAIN}/website/${instituteCode}/${pageSlug}`)
        : (pageSlug === 'index'
            ? `https://${subdomain}.${ROOT_DOMAIN}`
            : `https://${subdomain}.${ROOT_DOMAIN}/${pageSlug}`);

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": institute.type === 'VOCATIONAL' ? "EducationalOrganization" : "School",
        "name": institute.name,
        "url": siteUrl,
        ...(institute.branding?.logo && { "logo": institute.branding.logo }),
        ...(institute.contactPhone   && { "telephone": institute.contactPhone }),
        ...(institute.contactEmail   && { "email": institute.contactEmail }),
        "address": {
            "@type": "PostalAddress",
            ...(institute.address?.street  && { "streetAddress": institute.address.street }),
            ...(institute.address?.city    && { "addressLocality": institute.address.city }),
            ...(institute.address?.state   && { "addressRegion": institute.address.state }),
            ...(institute.address?.pincode && { "postalCode": institute.address.pincode }),
            "addressCountry": "IN"
        }
    };

    // ── Layout Helpers ───────────────────────────────────────────────────────
    // Public site strictly reads from liveContent.
    const liveContent = page.liveContent;

    // ── GrapesJS page path ───────────────────────────────────────────────────
    // If this page was built with GrapesJS, liveContent is an object with
    // gjsHtml / gjsCss fields. Render the raw HTML directly.
    if (liveContent && liveContent.gjsHtml) {
        // SECURITY / STABILITY FIX:
        // Empty `src=""` on iframes/images or `<meta http-equiv="refresh">` tags
        // cause the browser to endlessly request the current page URL in a loop,
        // spamming the Next.js server and blocking the event loop.
        const safeHtml = liveContent.gjsHtml
            .replace(/<meta[^>]*http-equiv=["']?refresh["']?[^>]*>/gi, '')
            .replace(/src=["']\s*["']/gi, 'src="about:blank"');

        return (
            <>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
                {liveContent.gjsCss && (
                    <style dangerouslySetInnerHTML={{ __html: liveContent.gjsCss }} />
                )}
                <div
                    dangerouslySetInnerHTML={{ __html: safeHtml }}
                    style={{ fontFamily: `'${fontFamily}', sans-serif` }}
                />
            </>
        );
    }

    // ── Legacy V1 section path ───────────────────────────────────────────────
    const rawSections       = Array.isArray(liveContent) ? liveContent : [];
    const hasDynamicFooter  = rawSections.some(s => s.type === SECTION_TYPES.FOOTER);
    const noticeSection     = rawSections.find(s  => s.type === SECTION_TYPES.NOTICES);
    const mainSections      = rawSections.filter(s => s.type !== SECTION_TYPES.NOTICES);
    const isFirstSectionHero = mainSections[0]?.type === SECTION_TYPES.HERO;

    return (
        <main
            className={`min-h-screen theme-${config?.theme?.preset || 'modern'} ${config?.theme?.preset === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'}`}
            style={{
                '--color-primary': primaryColor,
                '--color-secondary': secondaryColor,
                '--font-family': fontFamily,
                fontFamily: `'${fontFamily}', sans-serif`
            }}
        >
            {/* JSON-LD for Google Knowledge Panel */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Top Notices Bar */}
            {noticeSection && (
                <div className="fixed top-0 left-0 w-full z-[110]">
                    <RenderSection
                        section={noticeSection}
                        instituteId={String(institute._id)}
                        instituteCode={instituteCode}
                        instituteName={institute.name}
                        preset={config?.theme?.preset || 'modern'}
                    />
                </div>
            )}

            {/* Sticky Header */}
            <div className={`fixed left-0 w-full z-[100] ${noticeSection ? "top-[48px]" : "top-0"}`}>
                <WebsiteHeader
                    config={websiteData}
                    pages={pages}
                    instituteCode={instituteCode}
                    isDark={isFirstSectionHero}
                />
            </div>

            {/* Page Sections */}
            <div className={`flex flex-col ${noticeSection ? "pt-[48px]" : "pt-[80px]"}`}>
                {mainSections.map(section => (
                    <RenderSection
                        key={section.id}
                        section={section}
                        instituteId={String(institute._id)}
                        instituteCode={instituteCode}
                        instituteName={institute.name}
                        preset={config?.theme?.preset || 'modern'}
                    />
                ))}
            </div>

            {!hasDynamicFooter && <WebsiteFooter config={websiteData} />}
        </main>
    );
}

export default PublicWebsitePage;
