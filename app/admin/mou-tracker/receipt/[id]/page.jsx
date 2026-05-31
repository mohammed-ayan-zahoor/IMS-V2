"use client";

import { useState, useEffect, use } from "react";
import { format } from "date-fns";
import { Loader2, Printer, CheckCircle2, ShieldCheck, Mail, MapPin, School, Landmark } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

export default function MouReceiptPage({ params }) {
    const { id } = use(params);
    const { data: session, status: sessionStatus } = useSession();
    const router = useRouter();

    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Client-side authentication role protection redirect
    useEffect(() => {
        if (sessionStatus === "authenticated" && session?.user?.role !== "super_admin") {
            router.push("/admin/dashboard");
        }
    }, [session, sessionStatus, router]);

    useEffect(() => {
        if (sessionStatus === "authenticated" && session?.user?.role === "super_admin") {
            fetchSubmissionDetails();
        }
    }, [id, sessionStatus]);

    const fetchSubmissionDetails = async () => {
        try {
            setError(null);
            const res = await fetch(`/api/v1/mou/submissions/${id}`);

            if (!res.ok) {
                let message = "Failed to fetch MOU submission details";
                try {
                    const errorData = await res.json();
                    message = errorData.error || message;
                } catch (e) {}

                const err = new Error(message);
                err.status = res.status;
                throw err;
            }

            const data = await res.json();
            setSubmission(data.submission);
        } catch (error) {
            console.error("fetchSubmissionDetails error:", error);
            setError({
                message: error.message,
                status: error.status || 500
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        // Wait for signature image to load before printing
        const images = document.querySelectorAll('.print-area img');
        const promises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
            });
        });

        Promise.all(promises).then(() => {
            setTimeout(() => window.print(), 150);
        });
    };

    if (sessionStatus === "loading" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center bg-slate-50">
                <div className="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100 max-w-md">
                    <h2 className="text-xl font-bold mb-2">{error.status === 404 ? "MOU Submission Not Found" : "System Error"}</h2>
                    <p className="text-sm opacity-80">{error.message}</p>
                    <Button onClick={() => window.location.reload()} className="mt-4 bg-red-600 hover:bg-red-700 text-white border-none">Try Again</Button>
                </div>
            </div>
        );
    }

    if (!submission) return <div className="p-10 text-center">MOU details not found</div>;

    const receiptNo = `QT-MOU-${new Date(submission.createdAt).getFullYear()}-${submission.refId.split('/').pop() || submission._id.toString().slice(-6).toUpperCase()}`;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 print:p-0 print:bg-white print:min-h-0 print:h-auto">
            {/* Toolbar (Hidden in Print) */}
            <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-sm print:hidden">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 text-indigo-600 p-2 rounded-2xl">
                        <Landmark size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-800 leading-tight">Agreement Invoice & Receipt</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Pipeline Reference: {submission.refId}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        variant="secondary" 
                        onClick={() => router.push('/admin/mou-tracker')}
                        className="rounded-xl px-4 py-2 text-xs font-bold"
                    >
                        Back to Tracker
                    </Button>
                    <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2 text-xs font-bold">
                        <Printer size={16} className="mr-2" />
                        Print Commercial Invoice
                    </Button>
                </div>
            </div>

            {/* Receipt Content Card */}
            <div className="print-area max-w-4xl mx-auto bg-white shadow-xl rounded-[32px] p-10 md:p-12 print:shadow-none print:p-8 border border-slate-100 print:border-none card-receipt relative overflow-hidden">
                {/* Decorative Premium Border Stamp */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start border-b border-slate-100 pb-8 mb-8 gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
                                <Landmark size={18} />
                            </div>
                            <span className="text-lg font-black tracking-tight text-slate-800">QUANTECH PLATFORM</span>
                        </div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Enterprise LMS & ERP Implementations</p>
                        <div className="text-xs text-slate-500 mt-3 space-y-1">
                            <p>Suite 404, Tech Park Sector V</p>
                            <p>Kolkata, West Bengal - 700091</p>
                            <p>contact@quantech.in | +91 33 4005 8891</p>
                        </div>
                    </div>
                    <div className="text-left md:text-right space-y-1.5">
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                            <ShieldCheck size={12} /> Converted / Signed
                        </span>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight mt-2">COMMERCIAL INVOICE</h2>
                        <p className="text-xs text-slate-400 font-bold">No: <span className="text-slate-700 font-mono font-black">{receiptNo}</span></p>
                        <p className="text-xs text-slate-400 font-bold">Agreement Date: {format(new Date(submission.createdAt), "PPpp")}</p>
                    </div>
                </div>

                {/* Billing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Billed To (Institution Details)</h4>
                        <p className="text-base font-black text-slate-800">{submission.schoolName}</p>
                        {submission.udiseCode && (
                            <p className="text-xs font-bold text-slate-500 mt-1">UDISE Code: {submission.udiseCode}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-2 flex items-start gap-1 leading-relaxed">
                            <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                            <span>{submission.address || submission.city}</span>
                        </p>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Institutional Signatory</h4>
                        <p className="text-base font-black text-slate-800">{submission.principalName}</p>
                        {submission.designation && (
                            <p className="text-xs text-slate-500 mt-0.5">{submission.designation}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                            <Mail size={14} className="text-slate-400" />
                            {submission.contactEmail}
                        </p>
                        {submission.contactPhone && (
                            <p className="text-xs text-slate-500 mt-1">Phone: {submission.contactPhone}</p>
                        )}
                    </div>
                </div>

                {/* Particulars Table */}
                <div className="mb-10">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Financial Breakup Summary</h4>
                    <div className="border border-slate-200/60 rounded-2xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                    <th className="p-4">Implementation Description</th>
                                    <th className="p-4 text-center">Unit / Students</th>
                                    <th className="p-4 text-right">License Cost</th>
                                    <th className="p-4 text-right pr-6">Total Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                <tr>
                                    <td className="p-4 max-w-sm">
                                        <p className="font-bold text-slate-800">Quantech ERP & Learning Portal Integration License</p>
                                        <p className="text-xs text-slate-400 mt-1">Full curriculum, admin console, exam sheets module, parent-teacher app access, and student badges platform.</p>
                                    </td>
                                    <td className="p-4 text-center font-bold text-slate-800">
                                        {submission.studentCount.toLocaleString('en-IN')}
                                    </td>
                                    <td className="p-4 text-right text-slate-600">
                                        ₹59.00 / student
                                    </td>
                                    <td className="p-4 text-right font-black text-slate-800 pr-6">
                                        {formatCurrency(submission.totalPrice)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Totals & Payments */}
                <div className="flex flex-col md:flex-row justify-between items-start pt-6 border-t border-slate-100 gap-8">
                    <div className="max-w-md text-xs text-slate-400 space-y-1.5 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/40">
                        <p className="font-bold text-slate-500 uppercase text-[9px] tracking-wider mb-1">MOU Terms & Notes</p>
                        <p>1. As per MOU, 70% upfront payment is due within 10 days of signoff.</p>
                        <p>2. Implementing batch sync requires active student counts validation.</p>
                        <p>3. This document acts as confirmation of the conversion of the lead status to converted in Quantech's core partner logs.</p>
                    </div>
                    <div className="w-full md:w-80 space-y-3 shrink-0">
                        <div className="flex justify-between items-baseline text-sm text-slate-500">
                            <span className="font-bold">Total Valuation (MOU value)</span>
                            <span className="font-mono">{formatCurrency(submission.totalPrice)}</span>
                        </div>
                        <div className="flex justify-between items-baseline text-sm text-slate-500 pb-2 border-b border-slate-100">
                            <span className="font-bold">Remaining Balance (30%)</span>
                            <span className="font-mono text-amber-600">{formatCurrency(submission.totalPrice - submission.upfrontPrice)}</span>
                        </div>
                        <div className="flex justify-between items-baseline bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                            <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">Upfront Paid (70%)</span>
                            <span className="text-lg font-black text-emerald-700 font-mono">{formatCurrency(submission.upfrontPrice)}</span>
                        </div>
                    </div>
                </div>

                {/* Signatures */}
                <div className="mt-16 pt-8 border-t border-slate-100 grid grid-cols-2 gap-8 text-center">
                    <div className="flex flex-col items-center justify-between h-36">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Client Authorized Signatory</p>
                        {submission.signatureDataUrl ? (
                            <div className="h-20 w-44 flex items-center justify-center overflow-hidden border border-slate-100 rounded-xl bg-slate-50/50 p-1">
                                <img 
                                    src={submission.signatureDataUrl} 
                                    alt="Client Signature" 
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>
                        ) : (
                            <div className="h-20 flex items-end justify-center">
                                <div className="w-36 border-b border-slate-300 border-dashed" />
                            </div>
                        )}
                        <p className="text-xs font-bold text-slate-700 mt-2">{submission.principalName}</p>
                    </div>

                    <div className="flex flex-col items-center justify-between h-36">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">For Quantech Platform</p>
                        <div className="h-20 w-44 flex items-center justify-center relative bg-indigo-50/20 rounded-xl border border-indigo-100/50">
                            {/* Modern vector branding badge stamp */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-10">
                                <Landmark size={48} className="text-indigo-600" />
                            </div>
                            <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase border border-indigo-200 px-3 py-1 rounded-md rotate-3 bg-white shadow-sm">
                                APPROVED / VERIFIED
                            </span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 mt-2">Authorized Signatory</p>
                    </div>
                </div>

                {/* Footer Stamp */}
                <div className="mt-16 pt-6 border-t border-slate-100 text-center">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                        Computer Generated Electronic Agreement Receipt | Quantech Platform ERP Core
                    </p>
                </div>
            </div>

            {/* Print Styles Injection */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0mm !important;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        height: auto !important;
                        min-height: auto !important;
                        background: white;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .min-h-screen {
                        min-height: 0 !important;
                        padding: 0 !important;
                    }
                    .card-receipt {
                        border: none !important;
                        border-radius: 0 !important;
                        padding: 20mm !important;
                        box-shadow: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
