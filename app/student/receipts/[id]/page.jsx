"use client";

import { useState, useEffect, use } from "react";
import { format } from "date-fns";
import { 
    Loader2, 
    Printer, 
    Download, 
    ChevronLeft, 
    ShieldCheck, 
    CheckCircle2, 
    FileText,
    ExternalLink
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";

const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    });
};

const calculateBalance = (fee) => {
    const finalAmount = (fee.totalAmount || 0) - (fee.discount?.amount || 0) + (fee.extraCharges?.amount || 0);
    return Math.max(0, finalAmount - (fee.paidAmount || 0));
};

export default function StudentReceiptPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const toast = useToast();

    const [fee, setFee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

    useEffect(() => {
        const fetchFeeDetails = async () => {
            try {
                setError(null);
                const res = await fetch(`/api/v1/fees/${id}`);

                if (!res.ok) {
                    let message = "Failed to fetch fee details";
                    try {
                        const errorData = await res.json();
                        message = errorData.error || message;
                    } catch (e) {}

                    const err = new Error(message);
                    err.status = res.status;
                    throw err;
                }

                const data = await res.json();
                setFee(data.fee);
            } catch (err) {
                console.error("fetchFeeDetails error:", err);
                setError({
                    message: err.message,
                    status: err.status || 500
                });
            } finally {
                setLoading(false);
            }
        };

        fetchFeeDetails();
    }, [id]);

    // Realtime Puppeteer PDF Print
    const handlePrintPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            const res = await fetch(`/api/v1/fees/${id}/pdf`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to generate receipt PDF");
            }

            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            // Create invisible iframe to trigger native browser print preview on the Puppeteer PDF
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.src = blobUrl;
            document.body.appendChild(iframe);

            iframe.onload = () => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } catch (e) {
                    // Fallback to opening in new window if iframe print is blocked
                    window.open(blobUrl, '_blank');
                }
                setTimeout(() => {
                    document.body.removeChild(iframe);
                    window.URL.revokeObjectURL(blobUrl);
                }, 60000);
            };

            if (toast?.success) {
                toast.success("Receipt PDF generated with Puppeteer");
            }
        } catch (err) {
            console.error("Print PDF Error:", err);
            if (toast?.error) {
                toast.error(err.message || "Failed to print PDF");
            } else {
                alert(err.message || "Failed to print PDF");
            }
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // Realtime Puppeteer PDF Direct Download
    const handleDownloadPdf = async () => {
        setIsDownloadingPdf(true);
        try {
            const res = await fetch(`/api/v1/fees/${id}/pdf`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to generate receipt PDF");
            }

            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const receiptNo = fee?._id ? fee._id.toString().slice(-8).toUpperCase() : id.slice(-8).toUpperCase();

            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `Receipt-${receiptNo}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => {
                window.URL.revokeObjectURL(blobUrl);
            }, 1000);

            if (toast?.success) {
                toast.success("Receipt PDF downloaded successfully");
            }
        } catch (err) {
            console.error("Download PDF Error:", err);
            if (toast?.error) {
                toast.error(err.message || "Failed to download PDF");
            } else {
                alert(err.message || "Failed to download PDF");
            }
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#F8F7FA]">
                <Loader2 className="animate-spin text-[#6E5AE0]" size={32} />
                <p className="text-xs font-semibold text-[#8D8A9B]">
                    Authenticating Official Receipt...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F8F7FA]">
                <div className="bg-white p-8 rounded-[16px] border border-[#E9E8F0] max-w-md text-center space-y-4">
                    <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-[#F4586A] mx-auto border border-rose-100">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-[#1E1B2E]">Access Denied</h2>
                        <p className="text-xs text-[#8D8A9B] mt-1">{error.message}</p>
                    </div>
                    <button 
                        onClick={() => router.push('/student/fees')} 
                        className="px-6 py-2 bg-[#2C2A46] text-white text-xs font-semibold rounded-full hover:bg-[#1E1B2E] transition-colors"
                    >
                        Return to Fees
                    </button>
                </div>
            </div>
        );
    }

    if (!fee) return <div className="p-10 text-center text-xs font-semibold text-[#8D8A9B]">Receipt not found</div>;

    const { student, batch, institute } = fee;
    const paidInstallments = (fee.installments || []).filter(i => i.status === 'paid');
    const receiptNo = fee._id.toString().slice(-12).toUpperCase();

    const d = new Date(fee.createdAt || Date.now());
    const year = d.getFullYear();
    const month = d.getMonth();
    const sessionStr = month >= 3 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;

    return (
        <div className="min-h-screen bg-[#F8F7FA] p-4 sm:p-8 md:p-12 print:p-0 print:bg-white safe-pb">
            {/* Top Action Bar (Adtech Style Pill Controls) */}
            <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <button 
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8D8A9B] hover:text-[#1E1B2E] transition-colors"
                >
                    <ChevronLeft size={16} /> Back to Fees
                </button>

                <div className="flex items-center gap-2">
                    <button 
                        disabled={isDownloadingPdf || isGeneratingPdf}
                        onClick={handleDownloadPdf}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-white text-[#1E1B2E] border border-[#E9E8F0] hover:bg-[#F4F3F7] transition-colors disabled:opacity-50"
                    >
                        {isDownloadingPdf ? (
                            <>
                                <Loader2 size={13} className="animate-spin text-[#6E5AE0]" />
                                Downloading...
                            </>
                        ) : (
                            <>
                                <Download size={13} />
                                Download PDF
                            </>
                        )}
                    </button>

                    <button 
                        disabled={isGeneratingPdf || isDownloadingPdf}
                        onClick={handlePrintPdf}
                        className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-full bg-[#0066FF] hover:bg-[#0052CC] text-white transition-colors disabled:opacity-50"
                    >
                        {isGeneratingPdf ? (
                            <>
                                <Loader2 size={13} className="animate-spin text-white" />
                                Rendering with Puppeteer...
                            </>
                        ) : (
                            <>
                                <Printer size={13} />
                                Print PDF
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Receipt Document Card */}
            <div className="max-w-4xl mx-auto bg-white rounded-[16px] overflow-hidden border border-[#E9E8F0] print:border-none print:rounded-none">
                {/* Blue Top Header Banner */}
                <div className="bg-[#0066FF] p-6 sm:p-10 text-white relative overflow-hidden">
                    <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                        <div className="flex items-center gap-4">
                            {institute?.branding?.logo ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={institute.branding.logo} alt="Logo" className="h-12 w-12 object-contain bg-white rounded-[10px] p-1.5" />
                            ) : (
                                <div className="w-12 h-12 bg-white text-[#0066FF] rounded-[10px] flex items-center justify-center font-bold text-lg italic">
                                    {institute?.name?.slice(0, 3)?.toUpperCase() || 'AQS'}
                                </div>
                            )}
                            <div>
                                <h1 className="text-xl sm:text-2xl font-black italic tracking-tight uppercase leading-none">
                                    {institute?.name || 'AQS'}
                                </h1>
                                <p className="text-blue-100 text-[10px] font-bold uppercase tracking-[0.2em] mt-1.5">
                                    Official Fee Receipt
                                </p>
                            </div>
                        </div>
                        <div className="text-left sm:text-right">
                            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider opacity-80">
                                Receipt Number
                            </p>
                            <p className="text-base sm:text-lg font-mono font-bold tracking-tight mt-0.5">
                                #{receiptNo}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 sm:p-10 space-y-8">
                    {/* Identification Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pb-6 border-b border-[#E9E8F0]">
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B]">
                                Student Information
                            </span>
                            <div className="text-base font-bold text-[#1E1B2E]">
                                {student?.profile ? `${student.profile.firstName || ''} ${student.profile.lastName || ''}`.trim() : 'Mohammed Arman Shaikh'}
                            </div>
                            <div className="text-xs text-[#8D8A9B] italic">
                                {student?.email}
                            </div>
                            <div className="text-xs font-bold text-[#0066FF] mt-1 uppercase">
                                Reg: {student?.enrollmentNumber || 'STU20260005'}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B]">
                                Course Information
                            </span>
                            <div className="text-base font-bold text-[#1E1B2E]">
                                {batch?.name || "Batch 01"}
                            </div>
                            <div className="text-xs text-[#8D8A9B] italic">
                                {batch?.course?.name || "DCA"}
                            </div>
                            <div className="text-xs font-semibold text-[#8D8A9B] mt-1 uppercase">
                                Academic Session {sessionStr}
                            </div>
                        </div>
                    </div>

                    {/* Payment Breakdown */}
                    <div className="space-y-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B]">
                            Payment Breakdown
                        </span>
                        <div className="space-y-2">
                            {paidInstallments.map((inst, idx) => (
                                <div key={inst._id || idx} className="flex items-center justify-between p-4 bg-[#F8F7FA] rounded-[12px] border border-[#E9E8F0]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-emerald-50 text-[#33C481] rounded-full flex items-center justify-center border border-emerald-200">
                                            <ShieldCheck size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-[#1E1B2E]">
                                                Installment Payment #{idx + 1}
                                            </p>
                                            <p className="text-[10px] text-[#8D8A9B] uppercase font-semibold mt-0.5">
                                                {format(new Date(inst.paidDate || Date.now()), "MMMM dd, yyyy")} • {inst.paymentMethod?.replace('_', ' ')?.toUpperCase() || 'ONLINE'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-[#1E1B2E]">{formatCurrency(inst.amount)}</p>
                                        <span className="text-[9px] font-bold text-[#33C481] uppercase tracking-wider">
                                            Verified
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="flex justify-end pt-4">
                        <div className="w-full sm:w-80 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-[#8D8A9B] uppercase tracking-wider">Total Course Fee</span>
                                <span className="font-bold text-[#1E1B2E] text-sm">{formatCurrency(fee.totalAmount)}</span>
                            </div>
                            {fee.discount?.amount > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-semibold text-rose-500 uppercase tracking-wider">Discount Applied</span>
                                    <span className="font-bold text-rose-500">-{formatCurrency(fee.discount.amount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center bg-[#F8F7FA] border border-[#E9E8F0] p-4 rounded-[12px]">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B]">Net Paid</p>
                                    <p className="text-lg font-bold text-[#0066FF] mt-0.5">{formatCurrency(fee.paidAmount)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B]">Outstanding</p>
                                    <p className="text-base font-bold text-amber-600 mt-0.5">{formatCurrency(calculateBalance(fee))}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Verification Footer */}
                    <div className="pt-8 border-t border-[#E9E8F0] flex flex-col sm:flex-row items-center justify-between gap-4 text-[#8D8A9B] text-xs">
                        <div className="max-w-md text-center sm:text-left text-[11px] leading-relaxed">
                            This is an official computer-generated receipt issued by {institute?.name || 'AQS'}. Generated via secure headless document rendering under reference #{receiptNo}.
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <CheckCircle2 size={16} className="text-[#33C481]" />
                            <div className="text-right">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-[#8D8A9B]">Verified By</p>
                                <p className="text-xs font-bold text-[#1E1B2E]">Registrar & Accounts</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
