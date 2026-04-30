"use client";

import { useState, useEffect, use } from "react";
import { format } from "date-fns";
import { Loader2, Printer, Download, ChevronLeft, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";

const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    });
};

const calculateBalance = (fee) => {
    const finalAmount = fee.totalAmount - (fee.discount?.amount || 0) + (fee.extraCharges?.amount || 0);
    return finalAmount - (fee.paidAmount || 0);
};

export default function StudentReceiptPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const [fee, setFee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                } catch (e) {}

                const err = new Error(message);
                err.status = res.status;
                throw err;
            }

            const data = await res.json();
            setFee(data.fee);
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
        window.print();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
                <Loader2 className="animate-spin text-premium-blue" size={40} />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Authenticating Receipt...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center bg-slate-50">
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl max-w-md">
                    <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-6">
                        <ShieldCheck size={32} />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mb-2 italic">Access Denied</h2>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed">{error.message}</p>
                    <Button onClick={() => router.push('/student/fees')} className="mt-8 bg-slate-900 text-white px-8 rounded-xl font-bold">Return to Fees</Button>
                </div>
            </div>
        );
    }

    if (!fee) return <div className="p-10 text-center font-bold text-slate-400">Receipt not found</div>;

    const { student, batch, institute } = fee;
    const paidInstallments = (fee.installments || []).filter(i => i.status === 'paid');

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-12 print:p-0 print:bg-white">
            {/* Action Bar */}
            <div className="max-w-4xl mx-auto mb-10 flex items-center justify-between print:hidden">
                <button 
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-sm"
                >
                    <ChevronLeft size={18} /> Back
                </button>
                <div className="flex items-center gap-3">
                    <Button onClick={handlePrint} className="bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-2xl px-6 font-bold shadow-sm">
                        <Printer size={18} className="mr-2" /> Print PDF
                    </Button>
                </div>
            </div>

            {/* Receipt Document */}
            <div className="max-w-4xl mx-auto bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 print:shadow-none print:border-none print:rounded-none">
                {/* Document Header */}
                {/* Document Header - Softened */}
                <div className="bg-premium-blue p-12 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div className="flex items-center gap-6">
                            {institute?.branding?.logo ? (
                                <img src={institute.branding.logo} alt="Logo" className="h-16 w-16 object-contain bg-white rounded-2xl p-2 shadow-sm" />
                            ) : (
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center font-black text-xl italic tracking-tighter">EV</div>
                            )}
                            <div>
                                <h1 className="text-2xl font-black italic tracking-tight uppercase leading-none">{institute?.name}</h1>
                                <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Official Fee Receipt</p>
                            </div>
                        </div>
                        <div className="text-left md:text-right">
                            <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Receipt Number</p>
                            <p className="text-xl font-mono font-black tracking-tighter">#{fee._id.toString().slice(-12).toUpperCase()}</p>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-12 space-y-12">
                    {/* Identification */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-2">Student Information</h4>
                            <div>
                                <p className="text-lg font-black text-slate-900">{student?.profile ? `${student.profile.firstName} ${student.profile.lastName}` : 'N/A'}</p>
                                <p className="text-sm font-bold text-slate-500 italic mt-1">{student?.email}</p>
                                <p className="text-xs font-black text-blue-600 mt-2 uppercase tracking-tight">Reg: {student?.enrollmentNumber || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-2">Course Information</h4>
                            <div>
                                <p className="text-lg font-black text-slate-900">{batch?.name}</p>
                                <p className="text-sm font-bold text-slate-500 italic mt-1">{batch?.course?.name}</p>
                                <p className="text-xs font-black text-slate-400 mt-2 uppercase tracking-tight">Academic Session 2025-26</p>
                            </div>
                        </div>
                    </div>

                    {/* Transaction History */}
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-4 mb-6">Payment Breakdown</h4>
                        <div className="space-y-2">
                            {paidInstallments.map((inst, idx) => (
                                <div key={idx} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm border border-slate-100">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900">Installment Payment</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                                                {format(new Date(inst.paidDate || Date.now()), "MMMM dd, yyyy")} • {inst.paymentMethod?.toUpperCase() || 'OFFLINE'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-slate-900">{formatCurrency(inst.amount)}</p>
                                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Verified</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="flex justify-end pt-8">
                        <div className="w-full md:w-80 space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-slate-400 uppercase tracking-tight">Total Course Fee</span>
                                <span className="font-black text-slate-900">{formatCurrency(fee.totalAmount)}</span>
                            </div>
                            {fee.discount?.amount > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-bold text-rose-400 uppercase tracking-tight">Institutional Discount</span>
                                    <span className="font-black text-rose-500">-{formatCurrency(fee.discount.amount)}</span>
                                </div>
                            )}
                            <div className="h-px bg-slate-100 my-4"></div>
                            <div className="flex justify-between items-center bg-blue-50 border border-blue-100 p-6 rounded-2xl text-slate-900 shadow-sm">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Net Paid</p>
                                    <p className="text-2xl font-black italic tracking-tighter text-premium-blue">{formatCurrency(fee.paidAmount)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Outstanding</p>
                                    <p className="text-lg font-black italic tracking-tighter text-amber-600">{formatCurrency(calculateBalance(fee))}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Verification Footer */}
                    <div className="pt-12 mt-12 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8 opacity-60">
                        <div className="text-[10px] font-bold text-slate-400 max-w-xs text-center md:text-left leading-relaxed">
                            This is a computer-generated document issued by {institute?.name}. 
                            Verification can be performed using the unique receipt reference number above.
                        </div>
                        <div className="flex items-center gap-3">
                            <ShieldCheck size={24} className="text-slate-300" />
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Digitally Signed By</p>
                                <p className="text-[11px] font-black text-slate-900 mt-1 uppercase tracking-tight italic">Registrar Office</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { size: A4; margin: 0; }
                    body { margin: 0; -webkit-print-color-adjust: exact; }
                    .print-hidden { display: none !important; }
                }
            `}</style>
        </div>
    );
}
