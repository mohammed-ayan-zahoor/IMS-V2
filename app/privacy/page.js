import TermsSheet from "@/components/legal/TermsSheet";

export const metadata = {
    title: "Privacy Policy | Quantech",
    description: "Privacy Policy and Data Protection for the Quantech Platform",
};

export default function PrivacyPage() {
    return <TermsSheet initialSectionId="privacy" />;
}
