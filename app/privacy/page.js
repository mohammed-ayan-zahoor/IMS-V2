import TermsSheet from "@/components/legal/TermsSheet";

export const metadata = {
    title: "Privacy Policy | Quantech",
    description: "Privacy Policy and Data Protection for the Quantech Platform",
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen w-full bg-[#FBEDE6] flex items-center justify-center p-4 md:p-8">
            <TermsSheet initialSectionId="privacy" />
        </div>
    );
}
