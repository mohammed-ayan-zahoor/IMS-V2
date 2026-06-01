"use client";

import { useState, useEffect, use } from "react";
import { format } from "date-fns";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

// Indian Rupees Number to Words Converter
const numberToWords = (num) => {
    if (num === 0) return "Zero Rupees Only";
    
    // Handle decimals if any
    const parts = num.toString().split('.');
    let wholePart = parseInt(parts[0], 10);
    let decimalPart = parts[1] ? parseInt(parts[1].slice(0, 2), 10) : 0;
    
    const a = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = [
        '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
    ];
    
    const convert = (n) => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
        if (n < 1000) {
            const hundreds = Math.floor(n / 100);
            const remaining = n % 100;
            return a[hundreds] + ' Hundred' + (remaining !== 0 ? ' and ' + convert(remaining) : '');
        }
        return '';
    };

    let words = '';
    
    // Crore
    if (wholePart >= 10000000) {
        words += convert(Math.floor(wholePart / 10000000)) + ' Crore ';
        wholePart %= 10000000;
    }
    // Lakh
    if (wholePart >= 100000) {
        words += convert(Math.floor(wholePart / 100000)) + ' Lakh ';
        wholePart %= 100000;
    }
    // Thousand
    if (wholePart >= 1000) {
        words += convert(Math.floor(wholePart / 1000)) + ' Thousand ';
        wholePart %= 1000;
    }
    // Hundreds/Tens/Ones
    if (wholePart > 0) {
        words += convert(wholePart);
    }
    
    let result = words.trim() + ' Rupees';
    
    if (decimalPart > 0) {
        result += ' and ' + convert(decimalPart) + ' Paise';
    }
    
    return result + ' Only';
};

const getMethodLabel = (method) => {
    const labels = {
        cash: 'Cash',
        card: 'Card',
        upi: 'UPI',
        bank_transfer: 'NEFT / RTGS',
        cheque: 'Cheque'
    };
    return labels[method] || method;
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
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center bg-slate-100">
                <div className="bg-red-50 text-red-600 p-8 rounded-3xl border border-red-100 max-w-md shadow-sm">
                    <h2 className="text-xl font-bold mb-2">{error.status === 404 ? "MOU Submission Not Found" : "System Error"}</h2>
                    <p className="text-sm opacity-80 mb-6">{error.message}</p>
                    <Button onClick={() => window.location.reload()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl border-none w-full py-2.5">Try Again</Button>
                </div>
            </div>
        );
    }

    if (!submission) return <div className="p-10 text-center text-slate-500 font-bold">MOU details not found</div>;

    // Calculations & Parameters
    const payments = submission.payments || [];
    const latestPayment = payments.length > 0 ? payments[payments.length - 1] : null;
    
    // Receipt numbers/dates
    const receiptNo = `QT/REC/${new Date(submission.createdAt).getFullYear()}-${(new Date(submission.createdAt).getFullYear() + 1).toString().slice(-2)}/${submission.refId.split('/').pop() || submission._id.toString().slice(-4).toUpperCase()}`;
    const formattedRefNo = `QP/MOU/${new Date(submission.createdAt).getFullYear()}-${(new Date(submission.createdAt).getFullYear() + 1).toString().slice(-2)}/${submission.refId.split('/').pop() || '9837'}`;
    
    // Sum of all payments dynamically
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const receiptAmount = totalPaid > 0 ? totalPaid : (submission.upfrontPrice || submission.totalPrice);
    
    // Dynamic payment methods list formatted as a string (e.g. "Cheque / UPI")
    const uniqueMethods = Array.from(new Set(payments.map(p => getMethodLabel(p.paymentMethod))));
    const paymentMethodUsed = uniqueMethods.length > 0 ? uniqueMethods.join(' / ') : 'Cheque / NEFT / RTGS / UPI';
    
    const receiptDate = latestPayment ? new Date(latestPayment.paidDate) : new Date(submission.createdAt);
    const balanceDue = Math.max(0, submission.totalPrice - totalPaid);

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 print:p-0 print:bg-white print:min-h-0 print:h-auto font-sans text-slate-800">
            
            {/* TOOLBAR (Hidden in Print) */}
            <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center bg-white border border-slate-200 p-4 rounded-xl shadow-sm print:hidden">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.push('/admin/mou-tracker')}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-50"
                        title="Back to Tracker"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-sm font-black text-slate-800 leading-none">Agreement Payment Receipt</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Receipt Ref: {receiptNo}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2 text-xs font-bold shadow-sm flex items-center gap-2">
                        <Printer size={16} />
                        Print Receipt
                    </Button>
                </div>
            </div>

            {/* PAYMENT RECEIPT CONTAINER (Exact WhatsApp Theme) */}
            <div className="print-area max-w-4xl mx-auto bg-white p-6 md:p-12 print:p-8 card-receipt relative">
                
                {/* DOUBLE BORDER FRAME (Matched perfectly with image) */}
                <div className="border-[4px] double-border p-8 md:p-10 relative">
                    
                    {/* TOP SECTION: BRANDING & TITLE */}
                    <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
                        <div>
                            {/* Make the Quantech Logo larger (increased height to h-32 md:h-36) */}
                            <img 
                                src="/quantech/Quantech-Logo.png" 
                                alt="Quantech Infosystem" 
                                className="h-32 md:h-36 object-contain scale-[1.2] origin-left"
                            />
                        </div>

                        <div className="text-left md:text-right">
                            <h2 className="text-3xl md:text-4xl font-extrabold text-[#002d62] tracking-wide uppercase font-serif">PAYMENT RECEIPT</h2>
                            
                            <div className="mt-4 text-sm font-medium text-slate-700 space-y-1">
                                <div className="flex md:justify-end gap-2">
                                    <span className="w-24 text-left md:text-right">Receipt No.</span>
                                    <span>:</span>
                                    <span className="font-bold text-[#002d62] font-mono">{receiptNo}</span>
                                </div>
                                <div className="flex md:justify-end gap-2">
                                    <span className="w-24 text-left md:text-right">Date</span>
                                    <span>:</span>
                                    <span className="font-bold">{format(receiptDate, "do MMMM yyyy")}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* REFERENCE LINE */}
                    <div className="mb-6 text-sm font-medium">
                        <span className="text-slate-600">Ref No.</span>
                        <span className="mx-2">:</span>
                        <span className="font-bold text-[#002d62] font-mono text-base">{formattedRefNo}</span>
                    </div>

                    {/* STATEMENT BLOCK */}
                    <div className="mb-8 text-slate-800 text-sm md:text-base leading-loose font-medium">
                        <p className="text-slate-500 text-xs uppercase tracking-widest font-black mb-1">Received With Thanks From</p>
                        <p className="text-xl md:text-2xl font-black text-[#002d62]">{submission.schoolName}</p>
                        <p className="text-slate-600 font-bold mb-6 text-sm">{submission.address || submission.city}</p>
                        
                        <p className="leading-relaxed">
                            The sum of Rupees <span className="font-bold text-[#002d62] font-serif text-base border-b border-dashed border-slate-400 pb-0.5 px-1">{numberToWords(receiptAmount)}</span>
                        </p>
                        <p className="mt-2">
                            by <span className="font-bold text-slate-800 border-b border-dashed border-slate-400 pb-0.5 px-1">{paymentMethodUsed}</span> towards payment for the following:
                        </p>
                    </div>

                    {/* PARTICULARS & AMOUNT TABLE (Renders one row for each payment transaction dynamically!) */}
                    <div className="mb-8 overflow-hidden border border-[#002d62] rounded-[4px]">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-[#002d62] text-white text-xs font-black uppercase tracking-wider border-b border-[#002d62]">
                                    <th className="p-3 pl-5 border-r border-[#002d62] w-[75%] text-left">PARTICULARS</th>
                                    <th className="p-3 pr-5 text-right w-[25%]">AMOUNT (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#002d62] text-slate-800 font-bold">
                                {payments.length === 0 ? (
                                    <tr className="h-16">
                                        <td className="p-3 pl-5 border-r border-[#002d62] text-slate-800 align-middle">
                                            Quantech School Management ERP Registration
                                        </td>
                                        <td className="p-3 pr-5 text-right font-mono text-[#002d62] align-middle text-base">
                                            {formatCurrency(receiptAmount)}
                                        </td>
                                    </tr>
                                ) : (
                                    payments.map((p, index) => (
                                        <tr key={p._id || index} className="h-16">
                                            <td className="p-3 pl-5 border-r border-[#002d62] text-slate-800 align-middle">
                                                Quantech School Management ERP Registration - Installment #{index + 1} ({getMethodLabel(p.paymentMethod)})
                                                {p.referenceId && (
                                                    <span className="text-[11px] text-slate-400 font-normal block mt-0.5 font-sans">Transaction Ref: {p.referenceId}</span>
                                                )}
                                            </td>
                                            <td className="p-3 pr-5 text-right font-mono text-[#002d62] align-middle text-base">
                                                {formatCurrency(p.amount)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                                <tr className="bg-slate-50/50">
                                    <td className="p-3 pr-5 border-r border-[#002d62] text-right text-xs font-black text-slate-800 uppercase tracking-widest">
                                        TOTAL PAID
                                    </td>
                                    <td className="p-3 pr-5 text-right font-mono text-lg font-black text-[#002d62]">
                                        {formatCurrency(receiptAmount)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* REMARKS & SIGNATURE AREA */}
                    <div className="flex flex-col md:flex-row justify-between items-stretch gap-8 mt-10">
                        
                        {/* Remarks & Registered Quantech Address taken exactly from the MOU */}
                        <div className="flex-1 flex flex-col justify-between">
                            <div className="text-xs font-medium text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <p className="font-bold text-slate-800 mb-1">Remarks:</p>
                                <p>Payment received against Quantech School Management ERP Registration.</p>
                                <p>Thank you for your trust in our solutions.</p>
                            </div>
                            
                            {/* Registered address and email taken directly from the official MOU page */}
                            <div className="mt-6 text-xs text-slate-600 font-medium space-y-1">
                                <p className="font-black text-[#002d62] text-sm uppercase">QUANTECH INFOSYSTEM LLP</p>
                                <p>3rd Floor, Behind Gurudwara, Mumbai-Agra Highway, Dhule, Maharashtra – 424001.</p>
                                <p>Contact: 9488842786, email: admin@quantechinfosystem.com</p>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="w-72 shrink-0 flex flex-col justify-between items-center text-center">
                            <p className="text-xs font-black text-[#002d62] uppercase tracking-wider">For Quantech Infosystem LLP</p>
                            
                            {/* Signature Render Container */}
                            <div className="h-24 w-48 flex items-center justify-center relative mt-2">
                                <img 
                                    src="/assets/sign.png" 
                                    alt="Authorized Signature" 
                                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                                />
                            </div>
                            
                            <div className="w-full mt-2">
                                <div className="border-b border-[#002d62] w-48 mx-auto my-1" />
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Authorised Signature</p>
                            </div>
                        </div>
                    </div>

                    {/* OUTSTANDING LEDGER BOX (Matches Student Receipt style details) */}
                    {payments.length > 0 && (
                        <div className="mt-12 pt-6 border-t border-dashed border-slate-300">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Accounts Outstanding Balance Summary</p>
                            <div className="bg-slate-50 rounded-lg p-4 text-xs font-bold text-slate-700 flex flex-col md:flex-row justify-between gap-4 border border-slate-200/50">
                                <div>
                                    <span className="text-slate-400 text-[10px] uppercase block mb-0.5">Total MOU Agreement Value</span>
                                    <span className="text-sm font-mono font-black text-slate-900">₹{formatCurrency(submission.totalPrice)}</span>
                                </div>
                                <div className="border-l border-slate-200 hidden md:block" />
                                <div>
                                    <span className="text-slate-400 text-[10px] uppercase block mb-0.5">Cumulative Amount Paid</span>
                                    <span className="text-sm font-mono font-black text-emerald-600">₹{formatCurrency(totalPaid)}</span>
                                </div>
                                <div className="border-l border-slate-200 hidden md:block" />
                                <div>
                                    <span className="text-slate-400 text-[10px] uppercase block mb-0.5">Outstanding Balance Due</span>
                                    <span className="text-sm font-mono font-black text-indigo-600">₹{formatCurrency(balanceDue)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* CUSTOM DOUBLE BORDER CSS AND PRINT RULES */}
            <style jsx global>{`
                .double-border {
                    border: 4px double #002d62;
                }
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm 12mm;
                    }

                    /* Force the entire document to white, no clipping */
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 210mm !important;
                        min-height: auto !important;
                        height: auto !important;
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }

                    /* Hide everything except the print area */
                    body > * {
                        display: none !important;
                    }

                    /* The outermost wrapper – make it full width, no padding */
                    .min-h-screen {
                        display: block !important;
                        min-height: 0 !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: white !important;
                        width: 100% !important;
                    }

                    /* Show only the print area */
                    .print-area {
                        display: block !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        border-radius: 0 !important;
                        background: white !important;
                        overflow: visible !important;
                    }

                    /* The inner double-border frame */
                    .double-border {
                        border: 3px double #002d62 !important;
                        padding: 6mm 8mm !important;
                        width: 100% !important;
                        box-sizing: border-box !important;
                        overflow: visible !important;
                        page-break-inside: avoid;
                    }

                    /* Card receipt overrides */
                    .card-receipt {
                        border: none !important;
                        border-radius: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        background: white !important;
                        width: 100% !important;
                        overflow: visible !important;
                    }

                    /* Ensure table doesn't overflow */
                    table {
                        width: 100% !important;
                        table-layout: fixed !important;
                    }

                    td, th {
                        word-break: break-word !important;
                        overflow-wrap: break-word !important;
                    }

                    /* Scale down oversized logo for print */
                    img[alt="Quantech Infosystem"] {
                        height: 60px !important;
                        width: auto !important;
                        transform: none !important;
                    }

                    /* Ensure flex rows don't break on print */
                    .md\\:flex-row {
                        flex-direction: row !important;
                    }

                    /* Grid columns for print */
                    .md\\:grid-cols-2 {
                        grid-template-columns: 1fr 1fr !important;
                    }

                    /* Prevent content from being hidden */
                    * {
                        overflow: visible !important;
                    }
                }
            `}</style>
        </div>
    );
}
