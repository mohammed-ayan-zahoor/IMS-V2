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
import { SECTION_TYPES } from "@/services/pageBuilderService";
import { notFound } from 'next/navigation';
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }) {
    const { instituteCode } = await params;
    await connectDB();
    const institute = await Institute.findOne({ code: { $regex: new RegExp(`^${instituteCode}$`, 'i') } });
    if (!institute) return {};

    const config = await WebsiteConfig.findOne({ instituteId: institute._id });
    return {
        title: config?.settings?.seoTitle || `${institute.name} - Official Website`,
        description: config?.settings?.seoDescription || `Welcome to ${institute.name}. Explore our programs and activities.`,
    };
}

const RenderSection = ({ section, instituteId, instituteCode }) => {
    const props = { content: section.content };
    
    switch (section.type) {
        case SECTION_TYPES.HERO: return <HeroSection {...props} />;
        case SECTION_TYPES.FEATURES: return <FeaturesGrid {...props} />;
        case SECTION_TYPES.CONTACT: return <ContactSection {...props} instituteCode={instituteCode} />;
        case SECTION_TYPES.NOTICES: return <SlidingNotices instituteId={instituteId} />;
        case SECTION_TYPES.FACULTY: return <FacultyDirectory {...props} />;
        case SECTION_TYPES.PLACEMENT_STATS: return <PlacementStats {...props} />;
        case SECTION_TYPES.PROGRAMS: return <ProgramsSection {...props} instituteId={instituteId} />;
        case SECTION_TYPES.TESTIMONIALS: return <TestimonialsSection {...props} />;
        case SECTION_TYPES.GALLERY: return <GallerySection {...props} />;
        case SECTION_TYPES.FOOTER: return <FooterSection {...props} />;
        default: return null;
    }
};

async function PublicWebsitePage({ params }) {
    const { instituteCode } = await params;
    
    await connectDB();
    
    // 1. Find Institute
    const institute = await Institute.findOne({ code: { $regex: new RegExp(`^${instituteCode}$`, 'i') } });
    if (!institute) notFound();

    // 2. Get Config
    const config = await WebsiteConfig.findOne({ instituteId: institute._id });
    if (!config || !config.isActive) notFound();

    // 3. Get Index Page
    let page = await WebsitePage.findOne({ websiteConfigId: config._id, slug: 'index' });
    if (!page) notFound();

    page = JSON.parse(JSON.stringify(page));

    const websiteData = JSON.parse(JSON.stringify({
        ...config.toObject(),
        instituteName: institute.name,
        instituteLogo: institute.branding?.logo
    }));

    const hasDynamicFooter = (page.sections || []).some(s => s.type === SECTION_TYPES.FOOTER);

    const sections = page.sections || [];
    const noticeSection = sections.find(s => s.type === SECTION_TYPES.NOTICES);
    const mainSections = sections.filter(s => s.type !== SECTION_TYPES.NOTICES);
    const isFirstSectionHero = mainSections[0]?.type === SECTION_TYPES.HERO;

    return (
        <main className="min-h-screen bg-white">
            {/* Top Bar Notices (Fixed) */}
            {noticeSection && (
                <div className="fixed top-0 left-0 w-full z-[110]">
                    <RenderSection 
                        section={noticeSection} 
                        instituteId={String(institute._id)} 
                        instituteCode={instituteCode} 
                    />
                </div>
            )}

            {/* Header (Fixed) */}
            <div className={`fixed left-0 w-full z-[100] ${noticeSection ? "top-[48px]" : "top-0"}`}>
                <WebsiteHeader config={websiteData} isDark={isFirstSectionHero} />
            </div>
            
            {/* Main Content with Padding Offset */}
            <div className={`flex flex-col ${noticeSection ? "pt-[48px]" : ""}`}>
                {mainSections.map(section => (
                    <RenderSection 
                        key={section.id} 
                        section={section} 
                        instituteId={String(institute._id)} 
                        instituteCode={instituteCode} 
                    />
                ))}
            </div>

            {!hasDynamicFooter && <WebsiteFooter config={websiteData} />}
        </main>
    );
}

export default PublicWebsitePage;
