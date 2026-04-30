"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/shared/Skeleton";
import { CreditCard, Calendar, CheckCircle2, AlertCircle, Clock, Receipt, ChevronRight, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { format } from "date-fns";
import Button from "@/components/ui/Button";

export default function StudentFeesPage() {
    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const controller = new AbortController();
        const fetchFees = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/v1/student/fees", { signal: controller.signal });
                if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
                const data = await res.json();
                if (!controller.signal.aborted) {
                    setFees(data.fees || []);
                }
            } catch (error) {
                if (error.name !== "AbortError") {
                    console.error(error);
                    setError("Unable to load fee details. Please try again later.");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchFees();

        return () => controller.abort();
    }, []);

    if (loading) return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="space-y-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-64 rounded-[2.5rem]" />
            <Skeleton className="h-64 rounded-[2.5rem]" />
        </div>
    );

    if (error) {
        return (
            <div className="max-w-5xl mx-auto">
                <div className="py-20 text-center bg-white rounded-[3rem] border border-slate-100 shadow-xl">
                    <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center text-rose-500 mx-auto mb-6">
                        <AlertCircle size={40} />
                    </div>
                    <p className="text-xl font-black text-slate-900 mb-2 italic">Error Loading Fees</p>
                    <p className="text-slate-500 font-medium">{error}</p>
                    <Button onClick={() => window.location.reload()} className="mt-8 bg-slate-900 text-white px-8 rounded-xl font-bold">Try Again</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 p-10 rounded-[3rem] bg-white border border-slate-100 text-slate-900 relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-premium-blue/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="relative space-y-2">
                    <div className="flex items-center gap-2 text-premium-blue mb-1">
                        <CreditCard size={20} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Finance Hub</span>
                    </div>
                    <h1 className="text-3xl font-black italic tracking-tight">Financial Overview</h1>
                    <p className="text-slate-500 font-medium text-sm">Track your course payments, installment plans, and official receipts.</p>
                </div>
                <div className="relative flex items-center gap-4">
                   <div className="text-right">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next Due Date</p>
                       <p className="text-sm font-black italic text-premium-blue">Check Installments</p>
                   </div>
                </div>
            </div>

            <div className="grid gap-8">
                {fees.map((fee, fIdx) => {
                    const finalAmount = fee.totalAmount - (fee.discount?.amount || 0) + (fee.extraCharges?.amount || 0);
                    return (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: fIdx * 0.1 }}
                            key={fee._id} 
                            className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500"
                        >
                            <div className="p-8 md:p-10">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900 shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-all">
                                                <Receipt size={24} />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black text-slate-900 italic tracking-tight">
                                                    {fee.batch?.name || "Course Fee"}
                                                </h2>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                    Ref: #{fee._id.toString().slice(-8).toUpperCase()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
                                        <StatusBadge status={fee.status} />
                                        <Button 
                                            onClick={() => router.push(`/student/receipts/${fee._id}`)}
                                            className="bg-slate-50 text-slate-900 hover:bg-slate-900 hover:text-white border border-slate-200 rounded-2xl px-6 py-2 font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 group shadow-sm"
                                        >
                                            View Receipt <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-10 bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-inner">
                                    <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Net Payable</p>
                                            <p className="text-2xl font-black italic tracking-tighter text-slate-900">₹{finalAmount.toLocaleString()}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-8">
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-1">Total Paid</p>
                                                <p className="text-xl font-black italic tracking-tighter text-emerald-600">₹{fee.paidAmount.toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-1">Outstanding</p>
                                                <p className="text-xl font-black italic tracking-tighter text-amber-600">₹{fee.balanceAmount.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative h-4 w-full bg-white rounded-full overflow-hidden border border-slate-200 shadow-sm">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${finalAmount > 0 ? (fee.paidAmount / finalAmount) * 100 : 0}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                                        />
                                    </div>
                                    <div className="flex justify-center mt-4">
                                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-4 py-1 rounded-full uppercase tracking-widest shadow-sm">
                                            {Math.round((fee.paidAmount / finalAmount) * 100)}% Cleared
                                        </span>
                                    </div>
                                </div>

                                {/* Installments Table */}
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Installment Plan</h3>
                                    <div className="border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                                        <div className="table-scroll-wrapper">
                                            <table className="w-full text-left text-sm min-w-[500px]">
                                                <thead className="bg-slate-50 border-b border-slate-100">
                                                    <tr>
                                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Due Date</th>
                                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Amount</th>
                                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Method</th>
                                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest text-right">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {fee.installments?.map((inst, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group/row">
                                                            <td className="px-8 py-5 font-black text-slate-700 italic">
                                                                {format(new Date(inst.dueDate), "MMM dd, yyyy")}
                                                            </td>
                                                            <td className="px-8 py-5 font-black text-slate-900 text-lg tracking-tighter">
                                                                ₹{inst.amount.toLocaleString()}
                                                            </td>
                                                            <td className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                {inst.paymentMethod ? inst.paymentMethod.replace('_', ' ') : '-'}
                                                            </td>
                                                            <td className="px-8 py-5 text-right">
                                                                <div className="inline-flex justify-end">
                                                                    <InstallmentStatusBadge status={inst.status} />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {!loading && fees.length === 0 && (
                    <div className="py-32 text-center text-slate-400 bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-inner">
                        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mx-auto mb-6">
                            <CreditCard size={40} />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 tracking-tight italic">Clear Record</h4>
                        <p className="text-slate-400 text-sm mt-2 max-w-[280px] mx-auto font-medium">No fee records found for your account. Please contact the registrar if this is an error.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    if (status === 'paid') return <Badge variant="success" className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border-emerald-100">Paid in Full</Badge>;
    if (status === 'partial') return <Badge variant="warning" className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border-amber-100">Partially Paid</Badge>;
    if (status === 'overdue') return <Badge variant="error" className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border-rose-100">Overdue</Badge>;
    return <Badge variant="neutral" className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 border-slate-100">Not Started</Badge>;
}

function InstallmentStatusBadge({ status }) {
    if (status === 'paid') {
        return (
            <span className="flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-xl border border-emerald-100 uppercase tracking-widest">
                <CheckCircle2 size={12} /> Paid
            </span>
        );
    }
    if (status === 'overdue') {
        return (
            <span className="flex items-center gap-2 text-[10px] font-black text-rose-600 bg-rose-50 px-4 py-1.5 rounded-xl border border-rose-100 uppercase tracking-widest">
                <AlertCircle size={12} /> Overdue
            </span>
        );
    }
    return (
        <span className="flex items-center gap-2 text-[10px] font-black text-amber-600 bg-amber-50 px-4 py-1.5 rounded-xl border border-amber-100 uppercase tracking-widest">
            <Clock size={12} /> Pending
        </span>
    );
}
