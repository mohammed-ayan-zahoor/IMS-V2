export const metadata = {
    title: "Privacy Policy | Quantech",
    description: "Privacy Policy for the Quantech IMS Platform",
};

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-12 font-sans selection:bg-blue-100">
            <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200/60 p-8 md:p-12 shadow-sm">
                <h1 className="text-3xl font-black tracking-tight mb-2 text-slate-900">Privacy Policy</h1>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-8 border-b border-slate-100 pb-4">
                    Effective Date: July 6, 2026
                </p>
                
                <div className="space-y-6 text-sm leading-relaxed text-slate-600">
                    <p>
                        This Privacy Policy explains how <strong>Quantech Infosystem LLP</strong> ("we," "us," or "our") collects, uses, stores, processes, and protects personal data in connection with our Quantech Institute Management System (IMS-V2) platform, including any mobile applications and website portals (collectively, the "Platform").
                    </p>
                    <p>
                        As a software provider, Quantech acts primarily as a <strong>Data Processor</strong> on behalf of the educational institutions (schools, colleges, or coaching centers, referred to as the "Institution") who license our Platform. The Institution is the <strong>Data Controller</strong> (or "Data Fiduciary" under the Indian DPDP Act 2023) and governs the collection and use of personal data of their students, parents, teachers, and staff.
                    </p>

                    <h2 className="text-lg font-bold text-slate-900 pt-4">1. Information We Collect</h2>
                    <p>
                        We process information uploaded to the Platform by the Institution or directly by users under their authorization:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Student Identity Data:</strong> Full name, date of birth, gender, blood group, nationality, place of birth, and photographs.</li>
                        <li><strong>Student Academic Data:</strong> Student ID, UDISE code, GR number, standard/class, batch, course enrollment, previous academic history, grades, and certificate records.</li>
                        <li><strong>National Identifiers (Encrypted):</strong> Aadhar Number, APAAR ID, PEN Number (stored securely in encrypted format).</li>
                        <li><strong>Guardian Data:</strong> Parent/guardian names, phone numbers, email addresses, residential addresses, and encrypted parent Aadhar numbers.</li>
                        <li><strong>Financial Data:</strong> Fee payment transaction logs, installments, and payment gateway consent tokens.</li>
                    </ul>

                    <h2 className="text-lg font-bold text-slate-900 pt-4">2. Children's Data & Parental Consent (DPDP Act 2023)</h2>
                    <p>
                        The Platform processes personal data of students, many of whom are minors (under 18). Under Section 9 of the <strong>Digital Personal Data Protection (DPDP) Act 2023 (India)</strong>:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Verifiable Consent:</strong> We only process a child's data upon obtaining verifiable consent from their parent or lawful guardian. Consent is captured electronically via the public admission form, logging the parent's relationship, timestamp, and IP address.</li>
                        <li><strong>No Behavioral Tracking:</strong> We do not conduct behavioral tracking, profiling, or targeted advertisements aimed at minor students.</li>
                        <li><strong>No Harmful Processing:</strong> We do not engage in any processing of personal data that is likely to cause harm to the physical or mental well-being of a child.</li>
                    </ul>

                    <h2 className="text-lg font-bold text-slate-900 pt-4">3. Sub-Processors</h2>
                    <p>
                        We engage the following third-party services to handle specific components of your data under strict confidentiality obligations:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Cloudinary:</strong> Scanned documents, birth certificates, and student photos.</li>
                        <li><strong>Pusher & Pusher Beams:</strong> Real-time syncing and messaging notifications.</li>
                        <li><strong>Exotel & Msg91:</strong> Telephony, call logs, SMS receipts, and verification gateways.</li>
                        <li><strong>Razorpay:</strong> Subscription orders, payment invoicing, and fee mandate processing.</li>
                        <li><strong>MongoDB Atlas:</strong> Secure cloud database storage.</li>
                    </ul>

                    <h2 className="text-lg font-bold text-slate-900 pt-4">4. Data Retention & Deletion</h2>
                    <p>
                        We retain personal data only for as long as necessary to provide Service to the Institution. When a student is hard-deleted from the database by an administrator, we permanently purge their database records and trigger file deletion from our storage sub-processor (Cloudinary). Platform audit logs are automatically purged after 90 days.
                    </p>

                    <h2 className="text-lg font-bold text-slate-900 pt-4">5. Contact Us</h2>
                    <p>
                        If you have any questions or want to exercise your data privacy rights, please contact your educational institution's administrator. If you are an administrator, you may email us directly at <strong>admin@quantechinfosystem.com</strong>.
                    </p>
                </div>
            </div>
        </div>
    );
}
