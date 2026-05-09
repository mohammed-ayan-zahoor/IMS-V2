import React from 'react';
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
import { SECTION_TYPES } from "@/services/pageBuilderService";
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }) {
    const { instituteCode } = await params;
    await connectDB();
    const institute = await Institute.findOne({ code: instituteCode });
    if (!institute) return {};

    const config = await WebsiteConfig.findOne({ instituteId: institute._id });
    return {
        title: config?.settings?.seoTitle || `${institute.name} - Official Website`,
        description: config?.settings?.seoDescription || `Welcome to ${institute.name}. Explore our programs and activities.`,
    };
}

const renderSection = (section, instituteId, instituteCode) => {
    const props = { key: section.id, content: section.content };
    
    switch (section.type) {
        case SECTION_TYPES.HERO: return <HeroSection {...props} />;
        case SECTION_TYPES.FEATURES: return <FeaturesGrid {...props} />;
        case SECTION_TYPES.CONTACT: return <ContactSection {...props} instituteCode={instituteCode} />;
        case SECTION_TYPES.NOTICES: return <SlidingNotices instituteId={instituteId} />;
        case SECTION_TYPES.FACULTY: return <FacultyDirectory {...props} />;
        case SECTION_TYPES.PLACEMENT_STATS: return <PlacementStats {...props} />;
        case SECTION_TYPES.PROGRAMS: return <ProgramsSection {...props} instituteId={instituteId} />;
        case SECTION_TYPES.TESTIMONIALS: return <TestimonialsSection {...props} />;
        default: return null;
    }
};

export default async function PublicWebsitePage({ params }) {
    const { instituteCode } = await params;
    
    await connectDB();
    
    // 1. Find Institute
    const institute = await Institute.findOne({ code: { $regex: new RegExp(`^${instituteCode}$`, 'i') } });
    if (!institute) notFound();

    // 2. Get Config
    const config = await WebsiteConfig.findOne({ instituteId: institute._id });
    if (!config || !config.isActive) notFound();

    // 3. Get Index Page
    const page = await WebsitePage.findOne({ websiteConfigId: config._id, slug: 'index' });
    if (!page) notFound();

    const websiteData = {
        ...config.toObject(),
        instituteName: institute.name
    };

    return (
        <main className="min-h-screen bg-white">
            <WebsiteHeader config={websiteData} />
            
            <div className="flex flex-col">
                {(page.sections || []).map(section => renderSection(section, institute._id, instituteCode))}
            </div>

            <WebsiteFooter config={websiteData} />
        </main>
    );
}
