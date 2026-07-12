export const metadata = {
    title: "Cookie Policy | Quantech",
    description: "Cookie Policy for the Quantech IMS Platform",
};

export default function CookiePolicyPage() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-12 font-sans selection:bg-blue-100">
            <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200/60 p-8 md:p-12 shadow-sm">
                <h1 className="text-3xl font-black tracking-tight mb-2 text-slate-900">Cookie Policy</h1>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-8 border-b border-slate-100 pb-4">
                    Effective Date: July 6, 2026
                </p>
                
                <div className="space-y-6 text-sm leading-relaxed text-slate-600">
                    <p>
                        This Cookie Policy explains how <strong>Quantech Infosystem LLP</strong> ("we," "us," or "our") uses cookies and similar technologies on our Quantech IMS-V2 ERP Platform.
                    </p>

                    <h2 className="text-lg font-bold text-slate-900 pt-4">1. What Are Cookies?</h2>
                    <p>
                        Cookies are small text files stored on your computer or mobile device by your web browser when you visit a website. They allow the website to recognize your device, maintain secure session details, and load user preferences.
                    </p>

                    <h2 className="text-lg font-bold text-slate-900 pt-4">2. Cookies We Use</h2>
                    <p>
                        Our Platform uses <strong>only strictly necessary cookies</strong> to deliver our core ERP services. We do not use any marketing, advertising, analytics, or behavioral tracking cookies on our app portal.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200/60 text-xs">
                            <thead>
                                <tr className="text-left font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                                    <th className="p-3">Cookie Name</th>
                                    <th className="p-3">Provider</th>
                                    <th className="p-3">Purpose</th>
                                    <th className="p-3">Duration</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600">
                                <tr>
                                    <td className="p-3 font-semibold text-slate-800">`next-auth.session-token`</td>
                                    <td className="p-3">Quantech Platform</td>
                                    <td className="p-3">Authenticates the logged-in user and maintains authorization across secure API calls.</td>
                                    <td className="p-3">30 Days</td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-semibold text-slate-800">`next-auth.callback-url`</td>
                                    <td className="p-3">Quantech Platform</td>
                                    <td className="p-3">Redirects users back to their intended dashboard route after a successful login.</td>
                                    <td className="p-3">Session</td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-semibold text-slate-800">`next-auth.csrf-token`</td>
                                    <td className="p-3">Quantech Platform</td>
                                    <td className="p-3">Protects users and database inputs against Cross-Site Request Forgery (CSRF) attacks.</td>
                                    <td className="p-3">Session</td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-semibold text-slate-800">`cookie-consent`</td>
                                    <td className="p-3">Quantech Platform</td>
                                    <td className="p-3">Remembers if you have acknowledged the cookie consent banner.</td>
                                    <td className="p-3">1 Year</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900 pt-4">3. Children's Privacy Compliance</h2>
                    <p>
                        Since the Platform is utilized by minor students, we adhere to strict children's privacy standards:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>No Third-Party Tracking:</strong> We do not deploy third-party analytics trackers (such as Google Analytics or Facebook Pixels) on the student dashboards.</li>
                        <li><strong>No Ads:</strong> No marketing cookies are loaded, eliminating target tracking of minor users.</li>
                    </ul>

                    <h2 className="text-lg font-bold text-slate-900 pt-4">4. Managing Cookies</h2>
                    <p>
                        Since all cookies used on this Platform are strictly necessary for logging in and securing data inputs, they cannot be disabled without breaking the Service. You can block or delete cookies through your web browser settings, but doing so will prevent you from logging in.
                    </p>
                </div>
            </div>
        </div>
    );
}
