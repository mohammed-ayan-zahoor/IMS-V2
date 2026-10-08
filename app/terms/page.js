import TermsSheet from "@/components/legal/TermsSheet";

export const metadata = {
    title: "Terms & Conditions | Quantech",
    description: "Terms and Conditions for the Quantech Platform",
};

export default function TermsPage() {
    return <TermsSheet initialSectionId="overview" />;
}
