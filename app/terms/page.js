import TermsSheet from "@/components/legal/TermsSheet";

export const metadata = {
    title: "Terms & Conditions | Quantech",
    description: "Terms and Conditions for the Quantech Platform",
};

export default function TermsPage() {
    return (
        <div className="min-h-screen w-full bg-[#FBEDE6] flex items-center justify-center p-4 md:p-8">
            <TermsSheet initialSectionId="overview" />
        </div>
    );
}
