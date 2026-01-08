"use client";

import { useState, useEffect, use } from "react";
import { format } from "date-fns";
import { Loader2, Printer } from "lucide-react";
import Button from "@/components/ui/Button";

const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    });
};

const calculateBalance = (fee) => {
    return (fee.totalAmount - (fee.discount?.amount || 0)) - (fee.paidAmount || 0);
};

export default function ReceiptPage({ params }) {
    const { id } = use(params);
    const [fee, setFee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDualCopy, setIsDualCopy] = useState(false);
    const [previewTemplate, setPreviewTemplate] = useState(null);

    useEffect(() => {
        fetchFeeDetails();
    }, [id]);

    const fetchFeeDetails = async () => {
        try {
            setError(null);
            const res = await fetch(`/api/v1/fees/${id}`);

            if (!res.ok) {
                let message = "Failed to fetch fee details";
                try {
                    const errorData = await res.json();
                    message = errorData.error || message;
                } catch (e) {
                    // Fallback to status text
                }

                const err = new Error(message);
                err.status = res.status;
                throw err;
            }

            const data = await res.json();
            setFee(data.fee);
            setPreviewTemplate(data.fee.institute?.settings?.receiptTemplate || 'classic');
        } catch (error) {
            console.error("fetchFeeDetails error:", error);
            setError({
                message: error.message,
                status: error.status || 500
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        // Wait for images to load before printing
        const images = document.querySelectorAll('.print-area img');
        const promises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve; // Continue anyway if error
            });
        });

        Promise.all(promises).then(() => {
            // Give a tiny extra buffer for rendering engines
            setTimeout(() => window.print(), 100);
        });
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-premium-blue" size={32} /></div>;
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center">
                <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 max-w-md">
                    <h2 className="text-xl font-bold mb-2">{error.status === 404 ? "Receipt Not Found" : "System Error"}</h2>
                    <p className="text-sm opacity-80">{error.message}</p>
                    <Button onClick={() => window.location.reload()} className="mt-4 bg-red-600 hover:bg-red-700 text-white border-none">Try Again</Button>
                </div>
            </div>
        );
    }

    if (!fee) return <div className="p-10 text-center">Receipt not found</div>;

    const template = previewTemplate || 'classic';

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 print:p-0 print:bg-white print:min-h-0 print:h-auto">
            {/* Toolbar (Hidden in Print) */}
            <div className="max-w-4xl mx-auto mb-8 flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
                <div className="flex items-center gap-6">
                    <h1 className="text-xl font-bold text-slate-800">Fee Receipt</h1>
                    <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
                        <button
                            onClick={() => setPreviewTemplate('classic')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${template === 'classic' ? 'bg-white shadow-sm text-premium-blue' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Classic
                        </button>
                        <button
                            onClick={() => setPreviewTemplate('compact')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${template === 'compact' ? 'bg-white shadow-sm text-premium-blue' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Compact
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {template === 'compact' && (
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={isDualCopy}
                                onChange={(e) => setIsDualCopy(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-premium-blue focus:ring-premium-blue"
                            />
                            <span className="text-xs font-bold text-slate-600 group-hover:text-premium-blue transition-colors">Print Dual Copy (2 per A4)</span>
                        </label>
                    )}
                    <Button onClick={handlePrint} className="bg-premium-blue hover:bg-premium-blue/90">
                        <Printer size={18} className="mr-2" />
                        Print
                    </Button>
                </div>
            </div>

            {/* Receipt Content */}
            <div className={`print-area max-w-4xl mx-auto ${template === 'compact' && isDualCopy ? 'print:max-w-none print:w-[210mm]' : ''}`}>
                {template === 'compact' ? (
                    <div className={isDualCopy ? "flex flex-col gap-0 relative print:h-auto" : ""}>
                        <CompactSlip fee={fee} />
                        {isDualCopy && (
                            <>
                                <div className="hidden print:block absolute top-1/2 left-0 right-0 border-t-2 border-dashed border-slate-400 z-10 -translate-y-1/2">
                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[9px] text-slate-400 uppercase font-black tracking-[0.3em]">Cut Here</div>
                                </div>
                                <CompactSlip fee={fee} isCopy />
                            </>
                        )}
                    </div>
                ) : (
                    <ClassicReceipt fee={fee} />
                )}
            </div>

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
                    .receipt-slip {
                        height: 148mm !important;
                        page-break-inside: avoid;
                        overflow: hidden !important;
                        border: none !important;
                        box-sizing: border-box;
                    }
                    img {
                        image-rendering: -webkit-optimize-contrast;
                    }
                }
            `}</style>
        </div>
    );
}

// --- Layout Components ---

function ClassicReceipt({ fee }) {
    const { student, batch, institute } = fee;
    const installments = fee.installments || [];
    const paidInstallments = installments.filter(i => i.status === 'paid');

    return (
        <div className="bg-white shadow-lg rounded-xl p-10 print:shadow-none print:p-12 card-receipt">
            <div className="flex justify-between items-start border-b border-slate-200 pb-8 mb-8">
                <div>
                    {institute?.branding?.logo ? (
                        <img
                            src={institute.branding.logo}
                            alt={institute.name}
                            className="h-16 mb-4 object-contain"
                            crossOrigin="anonymous"
                            decoding="async"
                            loading="eager"
                        />
                    ) : (
                        <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center mb-4 text-slate-400 font-bold text-xs">NO LOGO</div>
                    )}
                    <h2 className="text-2xl font-black text-slate-900">{institute?.name}</h2>
                    <div className="text-sm text-slate-500 mt-2 space-y-1">
                        {institute?.address?.street && <p>{institute.address.street}</p>}
                        <p>{institute?.address?.city} {institute?.address?.state} {institute?.address?.pincode}</p>
                        <p>{institute?.contactEmail} | {institute?.contactPhone}</p>
                    </div>
                </div>
                <div className="text-right">
                    <h3 className="text-4xl font-black text-slate-800 uppercase tracking-widest mb-2">FEE RECEIPT</h3>
                    <p className="text-sm font-bold text-slate-500">Date: {format(new Date(), "PP")}</p>
                    <p className="text-sm text-slate-400">Ref: #{fee._id.toString().slice(-8).toUpperCase()}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-12">
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Received From</h4>
                    <p className="text-lg font-bold text-slate-900">{student?.profile ? `${student.profile.firstName} ${student.profile.lastName}` : 'Student'}</p>
                    <p className="text-sm text-slate-500">{student?.email}</p>
                    <p className="text-sm text-slate-500">ID: {student?.enrollmentNumber || "N/A"}</p>
                </div>
                <div className="text-right">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">For Course</h4>
                    <p className="text-lg font-bold text-slate-900">{batch?.name}</p>
                    <p className="text-sm text-slate-500 mb-3">{batch?.course?.name}</p>
                    <div className="border-t border-slate-100 pt-2 mt-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Fee</span>
                        <span className="text-2xl font-black text-slate-900">{formatCurrency(fee.totalAmount)}</span>
                    </div>
                </div>
            </div>

            <div className="mb-12">
                <h4 className="text-sm font-bold text-slate-900 mb-4 border-l-4 border-premium-blue pl-3">Payment History</h4>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                            <th className="text-left py-3 pl-2">Date</th>
                            <th className="text-left py-3">Mode</th>
                            <th className="text-left py-3">Reference</th>
                            <th className="text-right py-3 pr-2">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paidInstallments.map((inst, i) => (
                            <tr key={i}>
                                <td className="py-3 pl-2 text-slate-700">{inst.paidDate ? format(new Date(inst.paidDate), "MMM d, yyyy") : "-"}</td>
                                <td className="py-3 text-slate-700 capitalize">{inst.paymentMethod || "Cash"}</td>
                                <td className="py-3 text-slate-500 font-mono text-[10px]">{inst.transactionId || "-"}</td>
                                <td className="py-3 pr-2 text-right font-bold text-slate-900">{formatCurrency(inst.amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end border-t border-slate-200 pt-8">
                <div className="w-64 space-y-3">
                    {fee.discount?.amount > 0 && (
                        <div className="flex justify-between text-sm text-red-500">
                            <span className="font-medium">Discount ({fee.discount.reason || 'General Discount'})</span>
                            <span className="font-bold">- {formatCurrency(fee.discount.amount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-base border-t border-slate-100 pt-3 font-black text-slate-900">
                        <span>Paid Amount</span>
                        <span className="text-emerald-600">{formatCurrency(fee.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                        <span className="text-slate-500">Balance</span>
                        <span className="text-amber-500">{formatCurrency(calculateBalance(fee))}</span>
                    </div>
                </div>
            </div>

            <div className="mt-16 pt-8 border-t border-slate-100 text-center text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                <p>Computer Generated Receipt | {institute?.name}</p>
            </div>
        </div>
    );
}

function CompactSlip({ fee, isCopy = false }) {
    const { student, batch, institute } = fee;
    const paidInstallments = (fee.installments || []).filter(i => i.status === 'paid');

    return (
        <div className={`bg-white shadow-md rounded-xl p-8 print:shadow-none print:rounded-none print:p-10 receipt-slip relative overflow-hidden flex flex-col justify-between`}>
            {isCopy && <div className="absolute top-4 right-4 text-[10px] font-black text-slate-300 uppercase rotate-6 border border-slate-200 px-2 py-0.5 rounded">Institute Copy</div>}

            <div>
                {/* Compact Header */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        {institute?.branding?.logo ? (
                            <img
                                src={institute.branding.logo}
                                alt="Logo"
                                className="h-10 object-contain"
                                crossOrigin="anonymous"
                                decoding="async"
                                loading="eager"
                            />
                        ) : (
                            <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-bold text-[8px]">NO LOGO</div>
                        )}
                        <div>
                            <h2 className="text-base font-black text-slate-900 leading-tight uppercase tracking-tight">{institute?.name}</h2>
                            <p className="text-[10px] text-slate-400 font-bold">{institute?.address?.city}, {institute?.address?.state}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Fee Slip</span>
                        <p className="text-[10px] font-bold text-slate-900 border-t border-slate-100 pt-1">#{fee._id.toString().slice(-8).toUpperCase()}</p>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-xs mb-6">
                    <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">Student Details</span>
                        <p className="font-bold text-slate-900">{student?.profile ? `${student.profile.firstName} ${student.profile.lastName}` : 'Student'}</p>
                        <p className="text-slate-500 text-[10px] font-medium italic">ID: {student?.enrollmentNumber || 'N/A'}</p>
                    </div>
                    <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">Course Info</span>
                        <p className="font-bold text-slate-900 truncate">{batch?.name}</p>
                        <p className="text-slate-500 text-[10px] font-medium">{batch?.course?.name}</p>
                    </div>
                </div>

                {/* Simplified Payment History */}
                <div className="mb-6">
                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-2 underline decoration-premium-blue/30 underline-offset-4">Transaction History</span>
                    <div className="space-y-2">
                        {paidInstallments.map((inst, i) => (
                            <div key={i} className="flex justify-between text-[11px] font-medium">
                                <span className="text-slate-500">{inst.paidDate ? format(new Date(inst.paidDate), "MMM d, yyyy") : "-"} ({inst.paymentMethod || "Cash"})</span>                                <span className="text-slate-900 font-bold">{formatCurrency(inst.amount)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Compact Totals */}
            <div className="mt-auto">
                {fee.discount?.amount > 0 && (
                    <div className="flex justify-between items-baseline px-1 mb-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase italic">Applied Discount: {fee.discount.reason || 'General Discount'}</span>
                        <span className="text-[10px] font-black text-red-500">-{formatCurrency(fee.discount.amount)}</span>
                    </div>
                )}
                <div className="bg-slate-50 rounded-lg p-3 flex justify-between items-end border border-slate-100">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Paid Amount</p>
                        <p className="text-xl font-black text-emerald-600">{formatCurrency(fee.paidAmount)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Balance Due</p>
                        <p className="text-xs font-black text-amber-500">{formatCurrency(calculateBalance(fee))}</p>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <div className="text-[8px] text-slate-400 font-bold">
                        Generated on {format(new Date(), "PPpp")}
                    </div>
                    <div className="h-8 w-1/4 border-b border-slate-200 relative">
                        <span className="absolute bottom-0 right-0 text-[8px] font-black text-slate-300 uppercase tracking-tighter">Authorized Signature</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
