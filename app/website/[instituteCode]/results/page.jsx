import { connectDB } from "@/lib/mongodb";
import Institute from "@/models/Institute";
import WebsiteConfig from "@/models/WebsiteConfig";
import Session from "@/models/Session";
import WebsiteHeader from "@/components/website/public/WebsiteHeader";
import WebsiteFooter from "@/components/website/public/WebsiteFooter";
import WebsitePage from "@/models/WebsitePage";
import ResultLookupWidget from "@/components/website/public/ResultLookupWidget";
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, GraduationCap } from 'lucide-react';

export const revalidate = 60;

export async function generateMetadata({ params }) {
    const { instituteCode } = await params;
    await connectDB();

    let institute = await Institute.findOne({
        code: { $regex: new RegExp(`^${instituteCode}$`, 'i') }
    }).select('name branding');

    if (!institute) {
        const config = await WebsiteConfig.findOne({ subdomain: { $regex: new RegExp(`^${instituteCode}$`, 'i') } });
        if (config) {
            institute = await Institute.findById(config.instituteId).select('name branding');
        }
    }

    const title = institute ? `${institute.name} — Student Examination Results` : 'Examination Results';
    return {
        title,
        description: 'Check official student examination results and statements of marks.',
    };
}

export default async function StudentResultsPage({ params }) {
    const { instituteCode } = await params;
    await connectDB();

    let institute = await Institute.findOne({
        code: { $regex: new RegExp(`^${instituteCode}$`, 'i') }
    }).select('name type branding address contactPhone contactEmail code');

    let config = null;
    if (institute) {
        config = await WebsiteConfig.findOne({ instituteId: institute._id });
    } else {
        config = await WebsiteConfig.findOne({ subdomain: { $regex: new RegExp(`^${instituteCode}$`, 'i') } });
        if (config) {
            institute = await Institute.findById(config.instituteId).select('name type branding address contactPhone contactEmail code');
        }
    }

    if (!institute) notFound();

    // Fetch active session
    let activeSession = await Session.findOne({
        instituteId: institute._id,
        isActive: true,
        deletedAt: null
    });

    if (!activeSession) {
        activeSession = await Session.findOne({
            instituteId: institute._id,
            deletedAt: null
        }).sort({ createdAt: -1 });
    }

    // Fetch website pages for header nav
    let pages = [];
    if (config) {
        pages = await WebsitePage.find({ websiteConfigId: config._id }).select('title slug').sort({ title: 1 });
        pages = JSON.parse(JSON.stringify(pages));
    }

    const websiteData = JSON.parse(JSON.stringify({
        ...(config ? config.toObject() : {}),
        instituteName: institute.name,
        instituteLogo: institute.branding?.logo
    }));

    const homeUrl = `/website/${institute.code || instituteCode}`;

    return (
        <main className="min-h-screen bg-[#f8fafc] flex flex-col justify-between font-sans text-[#0f172a]">
            {/* Top Navigation Bar */}
            <header className="no-print bg-[#f8fafc] border-b border-[#e2e8f0] sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 sm:px-12 h-14 flex items-center justify-between">
                    <Link
                        href={homeUrl}
                        className="inline-flex items-center gap-2 text-sm text-[#64748b] hover:text-[#0f172a] transition font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to website
                    </Link>

                    <div className="text-xs sm:text-sm text-[#64748b] font-medium">
                        Results Portal
                    </div>
                </div>
            </header>

            {/* Main Interactive Results Component */}
            <div className="flex-1 w-full">
                <ResultLookupWidget
                    instituteCode={institute.code || instituteCode}
                    instituteName={institute.name}
                    instituteLogo={institute.branding?.logo}
                    customTitle={config?.resultsPage?.customTitle}
                    customSubtitle={config?.resultsPage?.customSubtitle}
                    activeSessionName={activeSession?.sessionName}
                />
            </div>

            {/* Simple Calm Footer */}
            <footer className="no-print border-t border-[#e2e8f0] bg-[#f8fafc] text-[#64748b] py-8 text-center text-xs sm:text-sm">
                <div className="max-w-6xl mx-auto px-6 sm:px-12 space-y-1">
                    <p>© {new Date().getFullYear()} {institute.name}. All rights reserved.</p>
                </div>
            </footer>

        </main>
    );
}
