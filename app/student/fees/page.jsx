"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/shared/Skeleton";
import { CreditCard, Calendar, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export default function StudentFeesPage() {
    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
        <div className="space-y-8">
            <div className="space-y-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-64 rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
        </div>
    );

    if (error) {
        return (
            <div className="max-w-5xl mx-auto">
                <div className="py-20 text-center">
                    <AlertCircle size={48} className="mx-auto mb-4 text-rose-500" />
                    <p className="text-slate-900 font-semibold mb-2">Error Loading Fees</p>
                    <p className="text-slate-500">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-black text-slate-900">Fee Details</h1>
                <p className="text-slate-500">Track your course payments and due dates.</p>
            </div>

            <div className="grid gap-6">
                {fees.map(fee => (
                    <Card key={fee._id} className="overflow-hidden">
                        <div className="p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                        {fee.batch?.name || "Course Fee"}
                                    </h2>
                                    <p className="text-sm font-medium text-slate-400 mt-1">
                                        Total Payable: ₹{(fee.totalAmount - (fee.discount?.amount || 0)).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <StatusBadge status={fee.status} />
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-8">
                                <div className="flex justify-between text-sm font-bold mb-2">
                                    <span className="text-emerald-600">Paid: ₹{fee.paidAmount.toLocaleString()}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                            {Math.round((fee.paidAmount / (fee.totalAmount - (fee.discount?.amount || 0))) * 100)}% Paid
                                        </span>
                                        <span className="text-slate-400">Balance: ₹{fee.balanceAmount.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                                        style={{
                                            width: `${fee.totalAmount - (fee.discount?.amount || 0) > 0
                                                ? (fee.paidAmount / (fee.totalAmount - (fee.discount?.amount || 0))) * 100
                                                : 0
                                                }%`
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Installments Table */}
                            <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30">
                                <div className="table-scroll-wrapper">
                                    <table className="w-full text-left text-sm min-w-[500px]">
                                        <thead className="bg-slate-50 border-b border-slate-100 italic">
                                            <tr>
                                                <th className="px-6 py-4 font-black text-slate-500 uppercase text-[10px] tracking-widest">Due Date</th>
                                                <th className="px-6 py-4 font-black text-slate-500 uppercase text-[10px] tracking-widest">Amount</th>
                                                <th className="px-6 py-4 font-black text-slate-500 uppercase text-[10px] tracking-widest">Method</th>
                                                <th className="px-6 py-4 font-black text-slate-500 uppercase text-[10px] tracking-widest text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {fee.installments?.map((inst, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-slate-700">
                                                        {new Date(inst.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-6 py-4 font-black text-slate-900">
                                                        ₹{inst.amount.toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                                        {inst.paymentMethod ? inst.paymentMethod.replace('_', ' ') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
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
                    </Card>
                ))}

                {!loading && fees.length === 0 && (
                    <div className="py-20 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <CreditCard size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No fee records found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    if (status === 'paid') return <Badge variant="success" className="px-3 py-1">Paid in Full</Badge>;
    if (status === 'partial') return <Badge variant="warning" className="px-3 py-1">Partially Paid</Badge>;
    if (status === 'overdue') return <Badge variant="error" className="px-3 py-1">Overdue</Badge>;
    return <Badge variant="neutral" className="px-3 py-1">Not Started</Badge>;
}

function InstallmentStatusBadge({ status }) {
    if (status === 'paid') {
        return (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                <CheckCircle2 size={12} /> Paid
            </span>
        );
    }
    if (status === 'overdue') {
        return (
            <span className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                <AlertCircle size={12} /> Overdue
            </span>
        );
    }
    return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
            <Clock size={12} /> Pending
        </span>
    );
}
