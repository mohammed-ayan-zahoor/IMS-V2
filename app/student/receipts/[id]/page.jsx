"use client";

import { useState, useEffect, use } from "react";
import { 
    Loader2, 
    Printer, 
    Download, 
    ChevronLeft, 
    ShieldCheck, 
    CheckCircle2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";

function numberToWordsINR(num) {
    const a = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function inWords(n) {
        if (n < 20) return a[n];
        const digit = n % 10;
        return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
    }

    if (!num || num === 0) return 'Zero Rupees Only';
    let n = Math.floor(num);
    let str = '';
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const hundred = Math.floor(n / 100);
    const rest = n % 100;

    if (crore > 0) str += inWords(crore) + ' Crore ';
    if (lakh > 0) str += inWords(lakh) + ' Lakh ';
    if (thousand > 0) str += inWords(thousand) + ' Thousand ';
    if (hundred > 0) str += inWords(hundred) + ' Hundred ';
    if (rest > 0) str += (str ? 'and ' : '') + inWords(rest) + ' ';

    return (str.trim() + ' Rupees Only');
}

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
            a.download = `Fee-Receipt-${receiptNo}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => {
                window.URL.revokeObjectURL(blobUrl);
            }, 1000);

            if (toast?.success) {
                toast.success("Official receipt PDF downloaded");
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

    const studentProfile = fee.student?.profile || {};
    const studentName = (studentProfile.firstName || studentProfile.lastName) 
        ? `${studentProfile.firstName || ''} ${studentProfile.lastName || ''}`.trim()
        : (fee.student?.displayName || fee.student?.name || 'Mohammed Arman Shaikh');
    const studentEmail = fee.student?.email || 'arman.aqs@ims.com';
    const studentPhone = studentProfile.phone || '7845125674';
    const regNo = fee.student?.enrollmentNumber || 'STU20260005';

    const instituteName = fee.institute?.name || 'AQS Institute of Learning';
    const instituteLogo = fee.institute?.branding?.logo || fee.institute?.logo;
    const addressObj = fee.institute?.address || {};
    const instituteAddress = addressObj.street
        ? `${addressObj.street}, ${addressObj.city || ''} ${addressObj.state || ''} ${addressObj.pincode || ''}`.trim()
        : 'Campus Boulevard, Knowledge Park, Dhule, Maharashtra';
    const contactEmail = fee.institute?.contactEmail || 'accounts@aqs-institute.edu';
    const contactPhone = fee.institute?.contactPhone || '+91 98765 43210';

    const batchName = fee.batch?.name || 'Batch 01';
    const courseName = fee.batch?.course?.name || 'Diploma in Computer Applications';
    const courseCode = fee.batch?.course?.code || 'DCA';
    const receiptNo = `REC-${fee._id.toString().slice(-8).toUpperCase()}`;

    const d = new Date(fee.createdAt || Date.now());
    const year = d.getFullYear();
    const month = d.getMonth();
    const sessionStr = month >= 3 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
    const issueDateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const paidInstallments = (fee.installments || []).filter(i => i.status === 'paid');
    const finalAmount = (fee.totalAmount || 0) - (fee.discount?.amount || 0) + (fee.extraCharges?.amount || 0);
    const balanceAmount = Math.max(0, finalAmount - (fee.paidAmount || 0));
    const amountInWords = numberToWordsINR(fee.paidAmount || 0);

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
                        className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-full bg-[#0F172A] hover:bg-[#1E293B] text-white transition-colors disabled:opacity-50"
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

            {/* Executive Document Layout */}
            <div className="max-w-4xl mx-auto bg-white rounded-[12px] border border-[#E2E8F0] p-8 sm:p-12 print:p-0 print:border-none print:rounded-none">
                {/* Institutional Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-[#0F172A] pb-6 mb-6">
                    <div className="flex items-start gap-4">
                        {instituteLogo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={instituteLogo}
                                alt={instituteName}
                                className="h-14 w-auto max-w-[170px] object-contain shrink-0"
                                crossOrigin="anonymous"
                            />
                        ) : null}
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#0F172A]">
                                {instituteName}
                            </h1>
                            <p className="text-xs text-[#475569] mt-0.5">
                                {instituteAddress}
                            </p>
                            <p className="text-[11px] text-[#64748B] mt-0.5">
                                Email: {contactEmail} • Phone: {contactPhone}
                            </p>
                        </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                        <div className="text-lg font-black tracking-wider uppercase text-[#0F172A]">
                            FEE RECEIPT
                        </div>
                        <div className="inline-block bg-[#F1F5F9] border border-[#CBD5E1] px-2 py-0.5 rounded text-[10px] font-bold text-[#334155] uppercase mt-1">
                            Original For Student
                        </div>
                        <div className="text-xs text-[#334155] mt-2 space-y-0.5">
                            <div>Receipt No: <span className="font-mono font-bold text-[#0F172A]">{receiptNo}</span></div>
                            <div>Date of Issue: <span className="font-bold text-[#0F172A]">{issueDateStr}</span></div>
                            <div>Session: <span className="font-bold text-[#0F172A]">{sessionStr}</span></div>
                        </div>
                    </div>
                </div>

                {/* Billed To / Student & Academic Details Panels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] border-b border-[#E2E8F0] pb-1.5 mb-2.5">
                            Student Information
                        </div>
                        <div className="text-sm font-bold text-[#0F172A] mb-2">{studentName}</div>
                        <div className="text-xs space-y-1 text-[#475569]">
                            <div className="flex justify-between">
                                <span className="text-[#64748B]">Enrollment ID:</span>
                                <span className="font-semibold text-[#0F172A] font-mono">{regNo}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#64748B]">Email Address:</span>
                                <span className="font-semibold text-[#0F172A]">{studentEmail}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#64748B]">Contact Number:</span>
                                <span className="font-semibold text-[#0F172A]">{studentPhone}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#64748B]">Admission Category:</span>
                                <span className="font-semibold text-[#0F172A]">Regular (General)</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] border-b border-[#E2E8F0] pb-1.5 mb-2.5">
                            Program & Batch Details
                        </div>
                        <div className="text-sm font-bold text-[#0F172A] mb-2">{courseName}</div>
                        <div className="text-xs space-y-1 text-[#475569]">
                            <div className="flex justify-between">
                                <span className="text-[#64748B]">Course Code:</span>
                                <span className="font-semibold text-[#0F172A] font-mono">{courseCode}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#64748B]">Assigned Batch:</span>
                                <span className="font-semibold text-[#0F172A]">{batchName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#64748B]">Academic Session:</span>
                                <span className="font-semibold text-[#0F172A]">{sessionStr}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#64748B]">Payment Status:</span>
                                <span className={balanceAmount === 0 ? "font-bold text-[#059669]" : "font-bold text-[#D97706]"}>
                                    {balanceAmount === 0 ? "Full Clearance" : "Partially Cleared"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ledger Table */}
                <div className="border border-[#E2E8F0] rounded-lg overflow-hidden mb-6">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-[#F1F5F9] border-b-2 border-[#0F172A]">
                            <tr>
                                <th className="px-4 py-3 font-bold text-[#0F172A] uppercase text-[10px] tracking-wider text-center w-12">#</th>
                                <th className="px-4 py-3 font-bold text-[#0F172A] uppercase text-[10px] tracking-wider">Particulars / Fee Component</th>
                                <th className="px-4 py-3 font-bold text-[#0F172A] uppercase text-[10px] tracking-wider">Payment Mode & Ref</th>
                                <th className="px-4 py-3 font-bold text-[#0F172A] uppercase text-[10px] tracking-wider text-center">Date</th>
                                <th className="px-4 py-3 font-bold text-[#0F172A] uppercase text-[10px] tracking-wider text-center">Status</th>
                                <th className="px-4 py-3 font-bold text-[#0F172A] uppercase text-[10px] tracking-wider text-right">Amount (INR)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                            {paidInstallments.map((inst, idx) => (
                                <tr key={inst._id || idx} className="hover:bg-[#F8FAFC]">
                                    <td className="px-4 py-3 text-center text-[#64748B] font-mono">0{idx + 1}</td>
                                    <td className="px-4 py-3 font-semibold text-[#0F172A]">
                                        {inst.notes || `Academic Course Tuition Fee — Installment #${idx + 1}`}
                                        <div className="text-[10px] text-[#64748B] font-normal mt-0.5">
                                            {courseName} ({courseCode}) • {batchName}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-[#334155] font-mono text-[11px]">
                                        {(inst.paymentMethod || 'Cash').replace('_', ' ').toUpperCase()}
                                        <div className="text-[10px] text-[#64748B]">Txn: {inst.transactionId || 'AQS-COUNTER'}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center text-[#334155]">
                                        {inst.paidDate ? new Date(inst.paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : issueDateStr}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                                            PAID
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-[#0F172A] text-sm">
                                        ₹{inst.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Bottom Summary Section */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                    <div className="md:col-span-7 space-y-4">
                        <div className="bg-[#F8FAFC] border-l-4 border-[#0F172A] p-3.5 rounded-r-lg">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                                Amount Cleared in Words:
                            </div>
                            <div className="text-xs font-bold italic text-[#0F172A] mt-1">
                                {amountInWords}
                            </div>
                        </div>

                        <div className="text-[11px] text-[#64748B] space-y-1">
                            <div className="font-bold text-[#334155] uppercase text-[10px] tracking-wider">
                                Terms & Official Acknowledgments:
                            </div>
                            <ol className="list-decimal list-inside space-y-0.5 text-[10.5px]">
                                <li>This document serves as an authentic institutional tax receipt for tuition fees paid.</li>
                                <li>All payments are non-refundable and non-transferable under academic bylaws.</li>
                                <li>Please preserve this receipt for examination hall ticket issuance and course clearance.</li>
                            </ol>
                        </div>
                    </div>

                    <div className="md:col-span-5">
                        <div className="border border-[#E2E8F0] rounded-lg overflow-hidden text-xs">
                            <div className="flex justify-between p-2.5 border-b border-[#E2E8F0]">
                                <span className="text-[#475569]">Approved Course Tuition:</span>
                                <span className="font-bold text-[#0F172A]">₹{(fee.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {fee.discount?.amount > 0 && (
                                <div className="flex justify-between p-2.5 border-b border-[#E2E8F0] text-red-600">
                                    <span>Less: Institutional Concession:</span>
                                    <span className="font-bold">- ₹{fee.discount.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div className="flex justify-between p-2.5 border-b border-[#E2E8F0] font-semibold">
                                <span className="text-[#0F172A]">Net Payable Schedule:</span>
                                <span className="font-bold text-[#0F172A]">₹{finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-[#ECFDF5] border-b border-[#E2E8F0]">
                                <span className="font-bold text-[#065F46]">Total Amount Cleared:</span>
                                <span className="font-black text-[#065F46] text-sm">₹{(fee.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between p-2.5 bg-[#FFFBEB]">
                                <span className="font-bold text-[#92400E]">Balance Outstanding Due:</span>
                                <span className="font-bold text-[#92400E]">₹{balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* System-Generated Verification Note */}
                <div className="mt-10 pt-4 border-t border-[#E2E8F0] text-center space-y-1">
                    <p className="text-[10px] font-semibold text-[#64748B]">
                        This is an authentic computer-generated receipt issued from the Student Portal. Since the transaction is recorded and verified in the system, no physical signature is required.
                    </p>
                    <p className="text-[9px] text-[#94A3B8]">
                        Official secure document issued by {instituteName} (IMS V2 Enterprise) • Generated on {issueDateStr} • Reference #{receiptNo}
                    </p>
                </div>
            </div>
        </div>
    );
}
