"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/shared/Skeleton";
import { cn } from "@/lib/utils";
import { 
    CreditCard, 
    Calendar, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    Receipt, 
    ChevronRight, 
    ArrowUpRight,
    Sparkles,
    Smartphone,
    Info,
    Check,
    Loader2,
    Shield,
    Bus,
    Hotel
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import Button from "@/components/ui/Button";

export default function StudentFeesPage() {
    const [fees, setFees] = useState([]);
    const [transportFees, setTransportFees] = useState([]);
    const [hostelAllotments, setHostelAllotments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const router = useRouter();

    // UPI Autopay Simulation States
    const [autopayStates, setAutopayStates] = useState({}); // mapped by feeId: { enabled: boolean, vpa?: string }
    const [activeFeeForAutopay, setActiveFeeForAutopay] = useState(null);
    const [vpaInput, setVpaInput] = useState('');
    const [vpaError, setVpaError] = useState('');
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [setupStep, setSetupStep] = useState(1); // 1: Input VPA, 2: App Pending Approval, 3: Success

    const handleAutopayToggle = (feeId, currentlyEnabled) => {
        if (currentlyEnabled) {
            // Cancel Autopay Simulation
            setAutopayStates(prev => ({
                ...prev,
                [feeId]: { enabled: false }
            }));
        } else {
            // Launch Setup Modal Simulation
            setActiveFeeForAutopay(feeId);
            setVpaInput('');
            setVpaError('');
            setSetupStep(1);
        }
    };

    const handleSetupAutopay = async () => {
        if (!vpaInput.trim() || !vpaInput.includes('@')) {
            setVpaError('Please enter a valid UPI VPA (e.g. name@okaxis)');
            return;
        }
        setVpaError('');
        setIsSettingUp(true);
        
        // Simulating Merchant Request & Push Notification Handshake (1.5 seconds)
        setTimeout(() => {
            setIsSettingUp(false);
            setSetupStep(2);
            
            // Simulating user opening GPay/PhonePe and authenticating with UPI PIN (3.5 seconds)
            setTimeout(() => {
                setSetupStep(3);
                setAutopayStates(prev => ({
                    ...prev,
                    [activeFeeForAutopay]: { enabled: true, vpa: vpaInput }
                }));
            }, 3500);
        }, 1500);
    };

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
                    setTransportFees(data.transportFees || []);
                    setHostelAllotments(data.hostelAllotments || []);
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

            {(() => {
                const isHostelBundled = session?.user?.institute?.settings?.features?.bundleHostelInBaseFee || session?.user?.institute?.settings?.features?.combinedCourseFees;
                const isTransportBundled = session?.user?.institute?.settings?.features?.bundleTransportInBaseFee || session?.user?.institute?.settings?.features?.combinedCourseFees;

                if (!isHostelBundled && !isTransportBundled) return null;

                const bundledText = isHostelBundled && isTransportBundled
                    ? "Course, Hostel & Transport services"
                    : isHostelBundled
                        ? "Course & Hostel services"
                        : "Course & Transport services";

                return (
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200/60 p-4 rounded-2xl text-emerald-800 text-xs font-bold shadow-sm">
                        <span className="text-base">📦</span>
                        <div>
                            <span className="font-black">Bundled Base Fee Schedule:</span> Your main fee schedule covers {bundledText} directly in one structure without separate itemized billing.
                        </div>
                    </div>
                );
            })()}

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

                                {/* UPI Autopay Control Card */}
                                {fee.status !== 'paid' && (
                                    <div className="mb-10 p-6 rounded-[2rem] border border-slate-200/60 bg-gradient-to-r from-slate-50 via-white to-slate-50/50 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="absolute top-0 left-0 w-24 h-24 bg-blue-500/5 rounded-full -ml-12 -mt-12 blur-2xl"></div>
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                                                <Sparkles size={22} className="animate-pulse" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-black text-slate-800 tracking-tight">UPI Autopay (Auto-Debit)</h4>
                                                    <span className="text-[9px] font-black uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md tracking-wider">
                                                        NPCI Standard
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 font-medium mt-1 max-w-xl">
                                                    Automatically clear your upcoming monthly installments using Google Pay, PhonePe, or Paytm. Safe, instant, and completely automated.
                                                </p>
                                                {autopayStates[fee._id]?.enabled && (
                                                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-black text-emerald-700 uppercase tracking-widest animate-fade-in">
                                                        <Check size={12} strokeWidth={3} /> Active Mandate: {autopayStates[fee._id]?.vpa}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="shrink-0 w-full md:w-auto">
                                            <Button
                                                onClick={() => handleAutopayToggle(fee._id, autopayStates[fee._id]?.enabled)}
                                                className={cn(
                                                    "w-full md:w-auto font-black uppercase tracking-widest text-[10px] py-3 px-6 rounded-2xl transition-all shadow-sm",
                                                    autopayStates[fee._id]?.enabled
                                                        ? "bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100"
                                                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10"
                                                )}
                                            >
                                                {autopayStates[fee._id]?.enabled ? "Disable Autopay" : "Configure Autopay"}
                                            </Button>
                                        </div>
                                    </div>
                                )}

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
                                                                {(inst.penaltyAmount > 0 || inst.penaltyPaid > 0) && (
                                                                    <div className="mt-1 text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-100 rounded-md px-1.5 py-0.5 inline-block uppercase tracking-wider">
                                                                        Late
                                                                    </div>
                                                                )}
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
                                                    {/* Also show penalty payment row separately for each installment if active */}
                                                    {fee.installments?.filter(inst => inst.penaltyAmount > 0 || inst.penaltyPaid > 0).map((inst, idx) => (
                                                        <tr key={`penalty-${idx}`} className="bg-rose-50/20 hover:bg-rose-50/40 transition-colors">
                                                            <td className="px-8 py-4 text-xs font-black text-rose-700 italic pl-12 flex items-center gap-1.5">
                                                                <span>↳ Penalty Payment</span>
                                                                <span className="text-[9px] font-medium text-slate-400">(Due: {format(new Date(inst.dueDate), "MMM dd")})</span>
                                                            </td>
                                                            <td className="px-8 py-4 font-black text-rose-700 text-sm tracking-tighter">
                                                                ₹{(inst.penaltyPaid || inst.penaltyAmount).toLocaleString()}
                                                            </td>
                                                            <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                -
                                                            </td>
                                                            <td className="px-8 py-4 text-right">
                                                                <div className="inline-flex justify-end">
                                                                    <span className={cn(
                                                                        "text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider",
                                                                        inst.penaltyStatus === 'paid' ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-rose-100 text-rose-700 border border-rose-200"
                                                                    )}>
                                                                        {inst.penaltyStatus === 'paid' ? 'Paid' : 'Overdue'}
                                                                    </span>
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

                {transportFees.map((fee, tfIdx) => {
                    const finalAmount = fee.totalAmount;
                    return (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: (fees.length + tfIdx) * 0.1 }}
                            key={fee._id} 
                            className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500"
                        >
                            <div className="p-8 md:p-10">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm transition-all">
                                                <Bus size={24} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-2xl font-black text-slate-900 italic tracking-tight">
                                                        {fee.route?.name || "Transport Fee"}
                                                    </h2>
                                                    {fee.preset?.name && (
                                                        <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-full border border-amber-200 uppercase font-medium">
                                                            {fee.preset.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">Vehicle: {fee.vehicle?.registrationNumber || "N/A"}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
                                        <StatusBadge status={fee.status} />
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-10 bg-amber-50/10 p-8 rounded-[2rem] border border-amber-100/50 shadow-inner">
                                    <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Transport Fee</p>
                                            <p className="text-2xl font-black italic tracking-tighter text-slate-900">₹{finalAmount.toLocaleString()}</p>
                                        </div>
                                        <div className="flex wrap gap-8">
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
                                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                                        />
                                    </div>
                                    <div className="flex justify-center mt-4">
                                        <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-4 py-1 rounded-full uppercase tracking-widest shadow-sm">
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
                                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Period / Month</th>
                                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Amount</th>
                                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Due Date</th>
                                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest text-right">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {fee.installments?.map((inst, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group/row">
                                                            <td className="px-8 py-5 font-black text-slate-700 italic">
                                                                {inst.label}
                                                            </td>
                                                            <td className="px-8 py-5 font-black text-slate-900 text-lg tracking-tighter">
                                                                ₹{inst.amount.toLocaleString()}
                                                            </td>
                                                            <td className="px-8 py-5 font-mono text-xs text-slate-500">
                                                                {inst.dueDate && !isNaN(new Date(inst.dueDate)) ? format(new Date(inst.dueDate), "MMM dd, yyyy") : '-'}
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

                {hostelAllotments.map((allotment, hIdx) => {
                    const finalAmount = allotment.totalAmount;
                    return (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: (fees.length + transportFees.length + hIdx) * 0.1 }}
                            key={allotment._id} 
                            className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500"
                        >
                            <div className="p-8 md:p-10">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm transition-all">
                                                <Hotel size={24} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-2xl font-black text-slate-900 italic tracking-tight">
                                                        {allotment.room?.roomNumber ? `Room ${allotment.room.roomNumber}` : 'Hostel Fee'}
                                                    </h2>
                                                    {allotment.block?.blockName && (
                                                        <span className="px-2 py-0.5 text-[10px] bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200 uppercase font-medium">
                                                            {allotment.block.blockName}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1 capitalize">Billing Plan: {allotment.billingCycle} (₹{allotment.feePerCycle?.toLocaleString()}/cycle)</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
                                        <StatusBadge status={allotment.feeStatus} />
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-10 bg-indigo-50/10 p-8 rounded-[2rem] border border-indigo-100/50 shadow-inner">
                                    <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Hostel Fee</p>
                                            <p className="text-2xl font-black italic tracking-tighter text-slate-900">₹{finalAmount.toLocaleString()}</p>
                                        </div>
                                        <div className="flex wrap gap-8">
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-1">Total Paid</p>
                                                <p className="text-xl font-black italic tracking-tighter text-emerald-600">₹{allotment.paidAmount.toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-1">Outstanding</p>
                                                <p className="text-xl font-black italic tracking-tighter text-indigo-600">₹{allotment.balanceAmount.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative h-4 w-full bg-white rounded-full overflow-hidden border border-slate-200 shadow-sm">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${finalAmount > 0 ? (allotment.paidAmount / finalAmount) * 100 : 0}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-full"
                                        />
                                    </div>
                                    <div className="flex justify-center mt-4">
                                        <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-4 py-1 rounded-full uppercase tracking-widest shadow-sm">
                                            {Math.round((allotment.paidAmount / finalAmount) * 100)}% Cleared
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
                                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Period / Month</th>
                                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Amount</th>
                                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Due Date</th>
                                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest text-right">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {allotment.installments?.map((inst, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group/row">
                                                            <td className="px-8 py-5 font-black text-slate-700 italic">
                                                                {inst.label}
                                                            </td>
                                                            <td className="px-8 py-5 font-black text-slate-900 text-lg tracking-tighter">
                                                                ₹{inst.amount.toLocaleString()}
                                                            </td>
                                                            <td className="px-8 py-5 font-mono text-xs text-slate-500">
                                                                {inst.dueDate && !isNaN(new Date(inst.dueDate)) ? format(new Date(inst.dueDate), "MMM dd, yyyy") : '-'}
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

                {!loading && fees.length === 0 && transportFees.length === 0 && hostelAllotments.length === 0 && (
                    <div className="py-32 text-center text-slate-400 bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-inner">
                        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mx-auto mb-6">
                            <CreditCard size={40} />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 tracking-tight italic">Clear Record</h4>
                        <p className="text-slate-400 text-sm mt-2 max-w-[280px] mx-auto font-medium">No fee records found for your account. Please contact the registrar if this is an error.</p>
                    </div>
                )}
            </div>

            {/* UPI Autopay Setup Modal Simulation */}
            <AnimatePresence>
                {activeFeeForAutopay && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                if (setupStep !== 2) setActiveFeeForAutopay(null);
                            }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />

                        {/* Modal Container */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl w-full max-w-lg p-8 relative z-10 overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>

                            {/* Step 1: Input VPA */}
                            {setupStep === 1 && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                                            <Smartphone size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 italic tracking-tight">Configure UPI Autopay</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Step 1 of 2: Authorize Mandate</p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                                        <div className="flex gap-2">
                                            <Shield size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                                                By setting up Autopay, you authorize our secure payment system to auto-debit your scheduled fee installments directly on the due dates.
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                                Under RBI regulations, you will receive a notification 24 hours before any debit. No UPI PIN is required for transactions up to ₹15,000.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block ml-1">Your UPI ID / VPA</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. parent@okaxis" 
                                            value={vpaInput}
                                            onChange={(e) => setVpaInput(e.target.value)}
                                            disabled={isSettingUp}
                                            className={cn(
                                                "w-full px-5 py-4 rounded-2xl border bg-slate-50 text-slate-900 text-sm font-semibold outline-none transition-all shadow-inner focus:bg-white focus:ring-2 focus:ring-blue-500/20",
                                                vpaError ? "border-rose-300 focus:border-rose-500" : "border-slate-200 focus:border-blue-500"
                                            )}
                                        />
                                        {vpaError && (
                                            <p className="text-xs text-rose-500 font-medium ml-1 flex items-center gap-1">
                                                <AlertCircle size={12} /> {vpaError}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1 font-medium">
                                            <span>Accepted: GPay, PhonePe, Paytm, BHIM</span>
                                            <span className="flex items-center gap-1"><Shield size={10} className="text-emerald-500" /> Secure 256-Bit SSL</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => setActiveFeeForAutopay(null)}
                                            disabled={isSettingUp}
                                            className="flex-1 py-4 font-bold border border-slate-200 text-slate-500 rounded-2xl transition-all"
                                        >
                                            Cancel
                                        </Button>
                                        <Button 
                                            onClick={handleSetupAutopay}
                                            disabled={isSettingUp}
                                            className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-500/10 font-bold flex items-center justify-center gap-2"
                                        >
                                            {isSettingUp ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    Connecting...
                                                </>
                                            ) : (
                                                'Initiate Setup'
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Verification Pending inside the UPI App */}
                            {setupStep === 2 && (
                                <div className="space-y-8 py-4 text-center">
                                    <div className="relative w-24 h-24 mx-auto mb-6">
                                        <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping"></div>
                                        <div className="w-24 h-24 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-sm relative">
                                            <Loader2 size={40} className="animate-spin" />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h3 className="text-xl font-black text-slate-900 italic tracking-tight">App Authorization Pending</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Step 2 of 2: Authorize in your App</p>
                                    </div>

                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 max-w-sm mx-auto text-left">
                                        <div className="flex gap-3">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-black shrink-0">1</div>
                                            <p className="text-xs text-slate-600 font-medium">Open your UPI App (**{vpaInput}**).</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-black shrink-0">2</div>
                                            <p className="text-xs text-slate-600 font-medium">Review the pending mandate authorization notification.</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-black shrink-0">3</div>
                                            <p className="text-xs text-slate-600 font-medium">Enter your **UPI PIN** to verify a refundable ₹1 authorization.</p>
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-slate-400 font-medium italic animate-pulse">
                                        Listening for Payment Gateway confirmation...
                                    </p>
                                </div>
                            )}

                            {/* Step 3: Success Screen */}
                            {setupStep === 3 && (
                                <div className="space-y-6 text-center py-4">
                                    <div className="w-20 h-20 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-md mx-auto mb-6">
                                        <CheckCircle2 size={40} className="animate-bounce" />
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-slate-900 italic tracking-tight">UPI Autopay Active!</h3>
                                        <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                                            Mandate registration successful. Upcoming course installments will be automatically debited.
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-left space-y-2.5 max-w-sm mx-auto">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-slate-400">Linked VPA:</span>
                                            <span className="text-slate-800 font-black italic">{vpaInput}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-slate-400">Billing Mode:</span>
                                            <span className="text-slate-800 font-black italic">Auto-Debit (NPCI)</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-slate-400">Pre-Debit Alert:</span>
                                            <span className="text-slate-800 font-black italic">SMS / WhatsApp</span>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <Button 
                                            onClick={() => setActiveFeeForAutopay(null)}
                                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-900/10 transition-all"
                                        >
                                            Got It
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
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
