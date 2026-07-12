export const metadata = {
    title: "Terms of Service | Quantech",
    description: "Terms of Service for the Quantech IMS Platform",
};

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-12 font-sans selection:bg-blue-100">
            <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200/60 p-8 md:p-12 shadow-sm">
                <h1 className="text-3xl font-black tracking-tight mb-2 text-slate-900">Terms of Service</h1>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-8 border-b border-slate-100 pb-4">
                    Effective Date: July 6, 2026
                </p>
                
                <div className="space-y-6 text-sm leading-relaxed text-slate-600">
                    <p>
                        Please read these Terms of Service ("Terms") carefully before using the IMS-V2 Institute Management System ERP platform (the "Platform" or "Service"), operated by <strong>Quantech Infosystem LLP</strong> ("we," "us," or "our").
                    </p>
                    <p>
                        By executing a Memorandum of Understanding (MOU), subscribing to a billing quota, or accessing the Service, the educational institution (the "Institution" or "Customer") agrees to be bound by these Terms.
                    </p>

                    <h2 className="text-lg font-bold text-slate-900 pt-4">1. Description of Service</h2>
                    <p>
                        The Platform is a multi-tenant, cloud-based educational ERP system designed to manage student admissions, courses, fees, attendance, proctored exams, and payroll. Access is provided to the Institution and its designated administrators, instructors, staff, students, and parents.
                    </p>

                    <h2 className="text-lg font-bold text-slate-900 pt-4">2. Quota Billing, Payments, & Tax Handling</h2>
                    <p>
                        The Service is billed on a tier-based student quota model ("slots"). One (1) subscription slot grants a quota to add up to ten (10) active student records on the Platform. 
                    </p>
                    <p>
                        For Institutions based in India, a standard <strong>18% Goods and Services Tax (GST)</strong> is calculated and invoiced dynamically during slot purchase. 
                    </p>
                    <p>
                        If the Institution exceeds its purchased student quota, the Platform will restrict the creation or conversion of new student profiles until additional slots are purchased. We reserve the right to suspend Service after seven (7) days' notice in the event of non-payment.
                    </p>

                    <h2 className="text-lg font-bold text-slate-900 pt-4">3. License Grant & Intellectual Property Restrictions</h2>
                    <p>
                        We grant the Institution a limited, non-exclusive, non-transferable, revocable license to access the Service during the active subscription period. The Institution and its users shall not:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Reverse-engineer, decompile, or disassemble the Platform source code.</li>
                        <li>Sub-license, resell, lease, or rent access to the Platform to any third party.</li>
                        <li>Use the Service to build a competitive product.</li>
                    </ul>
                    <p>
                        We retain all rights, title, and interest in and to the Platform software. The Institution retains sole ownership of all data, files, and templates uploaded by its users.
                    </p>

                    <h2 className="text-lg font-bold text-slate-900 pt-4">4. Limitation of Liability</h2>
                    <p>
                        To the maximum extent permitted by applicable law, Quantech Infosystem LLP's total aggregate liability arising out of or related to the Service shall not exceed the total fees paid by the Institution to us during the <strong>three (3) months</strong> immediately preceding the event giving rise to liability. We shall not be liable for any indirect, special, incidental, or consequential damages.
                    </p>

                    <h2 className="text-lg font-bold text-slate-900 pt-4">5. Termination & Data Grace Period</h2>
                    <p>
                        Either party may terminate the Service agreement by providing <strong>30 days' written notice</strong>. Upon termination, the Institution has a <strong>30-day grace period</strong> to export its administrative data (via integrated Excel exporters). After this period, all database records, user profiles, and associated file uploads stored on third-party sub-processors (Cloudinary) will be permanently deleted and cannot be recovered.
                    </p>

                    <h2 className="text-lg font-bold text-slate-900 pt-4">6. Governing Law</h2>
                    <p>
                        These Terms shall be governed by and construed in accordance with the laws of India. Any dispute arising out of these Terms shall be subject to the exclusive jurisdiction of the courts located in <strong>Dhule, Maharashtra, India</strong>.
                    </p>
                </div>
            </div>
        </div>
    );
}
