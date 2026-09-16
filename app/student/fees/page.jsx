"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { 
    CreditCard, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    Receipt, 
    ArrowUpRight,
    Building2,
    Check,
    ShieldCheck,
    Info
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function StudentFeesPage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [fees, setFees] = useState([]);
    const [transportFees, setTransportFees] = useState([]);
    const [hostelAllotments, setHostelAllotments] = useState([]);
    const [selectedTab, setSelectedTab] = useState("all"); // "all", "course", "transport", "hostel"
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchFees = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/v1/student/fees");
            if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
            const data = await res.json();
            setFees(data.fees || []);
            setTransportFees(data.transportFees || []);
            setHostelAllotments(data.hostelAllotments || []);
        } catch (err) {
            console.error(err);
            setError("Unable to load fee details. Please try again later.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFees();
    }, [fetchFees]);

    // Financial calculations across active fees
    const summaryMetrics = useMemo(() => {
        let totalPayable = 0;
        let totalPaid = 0;
        let totalBalance = 0;
        let hasOverdue = false;

        fees.forEach(f => {
            const finalAmt = (f.totalAmount || 0) - (f.discount?.amount || 0) + (f.extraCharges?.amount || 0);
            totalPayable += finalAmt;
            totalPaid += (f.paidAmount || 0);
            totalBalance += (f.balanceAmount || 0);
            if (f.status === 'overdue') hasOverdue = true;
        });

        transportFees.forEach(tf => {
            totalPayable += (tf.totalAmount || 0);
            totalPaid += (tf.paidAmount || 0);
            totalBalance += (tf.balanceAmount || 0);
            if (tf.status === 'overdue') hasOverdue = true;
        });

        hostelAllotments.forEach(ha => {
            totalPayable += (ha.totalAmount || 0);
            totalPaid += (ha.paidAmount || 0);
            totalBalance += (ha.balanceAmount || 0);
            if (ha.feeStatus === 'overdue') hasOverdue = true;
        });

        const percentCleared = totalPayable > 0 ? Math.round((totalPaid / totalPayable) * 100) : 100;

        return {
            totalPayable,
            totalPaid,
            totalBalance,
            percentCleared,
            hasOverdue
        };
    }, [fees, transportFees, hostelAllotments]);

    if (loading) {
        return (
            <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
                <div className="h-10 w-48 bg-[#F1EFFB] rounded-full" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(n => (
                        <div key={n} className="h-24 bg-white rounded-[16px] border border-[#E9E8F0]" />
                    ))}
                </div>
                <div className="h-72 bg-white rounded-[16px] border border-[#E9E8F0]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-6xl mx-auto">
                <div className="py-16 text-center bg-white rounded-[16px] border border-[#E9E8F0]">
                    <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center text-[#F4586A] mx-auto mb-4 border border-rose-100">
                        <AlertCircle size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-[#1E1B2E]">Unable to Load Fee Details</h3>
                    <p className="text-xs text-[#8D8A9B] mt-1 max-w-sm mx-auto">{error}</p>
                    <button 
                        onClick={() => fetchFees()} 
                        className="mt-6 px-6 py-2.5 bg-[#2C2A46] text-white text-xs font-semibold rounded-full hover:bg-[#1E1B2E] transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const isHostelBundled = session?.user?.institute?.settings?.features?.bundleHostelInBaseFee || session?.user?.institute?.settings?.features?.combinedCourseFees;
    const isTransportBundled = session?.user?.institute?.settings?.features?.bundleTransportInBaseFee || session?.user?.institute?.settings?.features?.combinedCourseFees;

    const visibleFees = selectedTab === "all" || selectedTab === "course" ? fees : [];
    const visibleTransport = selectedTab === "all" || selectedTab === "transport" ? transportFees : [];
    const visibleHostel = selectedTab === "all" || selectedTab === "hostel" ? hostelAllotments : [];

    const isAllEmpty = fees.length === 0 && transportFees.length === 0 && hostelAllotments.length === 0;

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12 safe-pb">
            {/* Top Header & Context Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[#1E1B2E] tracking-tight">
                        Fees & Payments
                    </h1>
                    <p className="text-xs text-[#8D8A9B] mt-0.5">
                        Manage course tuition, installments, payment schedules & receipts
                    </p>
                </div>

                {/* Filter Tabs Bar */}
                <div className="flex items-center gap-1.5 p-1 bg-white rounded-full border border-[#E9E8F0] overflow-x-auto">
                    <button
                        onClick={() => setSelectedTab("all")}
                        className={cn(
                            "px-4 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all",
                            selectedTab === "all"
                                ? "bg-[#2C2A46] text-white"
                                : "text-[#8D8A9B] hover:text-[#1E1B2E]"
                        )}
                    >
                        All Schedules
                    </button>
                    <button
                        onClick={() => setSelectedTab("course")}
                        className={cn(
                            "px-4 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all",
                            selectedTab === "course"
                                ? "bg-[#2C2A46] text-white"
                                : "text-[#8D8A9B] hover:text-[#1E1B2E]"
                        )}
                    >
                        Academic Tuition ({fees.length})
                    </button>
                    {transportFees.length > 0 && (
                        <button
                            onClick={() => setSelectedTab("transport")}
                            className={cn(
                                "px-4 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all",
                                selectedTab === "transport"
                                    ? "bg-[#2C2A46] text-white"
                                    : "text-[#8D8A9B] hover:text-[#1E1B2E]"
                            )}
                        >
                            Transport ({transportFees.length})
                        </button>
                    )}
                    {hostelAllotments.length > 0 && (
                        <button
                            onClick={() => setSelectedTab("hostel")}
                            className={cn(
                                "px-4 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all",
                                selectedTab === "hostel"
                                    ? "bg-[#2C2A46] text-white"
                                    : "text-[#8D8A9B] hover:text-[#1E1B2E]"
                            )}
                        >
                            Hostel ({hostelAllotments.length})
                        </button>
                    )}
                </div>
            </div>

            {/* Adtech 4-Metric Summary Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                {/* 1. Total Net Fee */}
                <div className="bg-white rounded-[16px] border border-[#E9E8F0] p-4.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase tracking-wider">
                            Total Course Fee
                        </span>
                        <div className="w-8 h-8 rounded-full bg-[#F4F3F7] flex items-center justify-center text-[#2C2A46]">
                            <Receipt size={16} />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold text-[#1E1B2E] tracking-tight">
                        ₹{summaryMetrics.totalPayable.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-[#8D8A9B] mt-0.5">
                        Net approved schedule
                    </p>
                </div>

                {/* 2. Total Paid */}
                <div className="bg-white rounded-[16px] border border-[#E9E8F0] p-4.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase tracking-wider">
                            Total Paid
                        </span>
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-[#33C481]">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold text-[#33C481] tracking-tight">
                        ₹{summaryMetrics.totalPaid.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-[#8D8A9B] mt-0.5">
                        <span className="font-semibold text-[#33C481]">{summaryMetrics.percentCleared}%</span> cleared to date
                    </p>
                </div>

                {/* 3. Outstanding Due */}
                <div className="bg-white rounded-[16px] border border-[#E9E8F0] p-4.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase tracking-wider">
                            Outstanding Due
                        </span>
                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-[#F4C24A]">
                            <Clock size={16} />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold text-[#F4C24A] tracking-tight">
                        ₹{summaryMetrics.totalBalance.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-[#8D8A9B] mt-0.5">
                        {summaryMetrics.totalBalance === 0 ? "Zero outstanding balance" : "Due for next cycle"}
                    </p>
                </div>

                {/* 4. Account Compliance Status */}
                <div className="bg-white rounded-[16px] border border-[#E9E8F0] p-4.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase tracking-wider">
                            Account Standing
                        </span>
                        <div className="w-8 h-8 rounded-full bg-[#F1EFFB] flex items-center justify-center text-[#6E5AE0]">
                            <ShieldCheck size={16} />
                        </div>
                    </div>
                    <div className="mt-2 text-base font-bold text-[#1E1B2E] flex items-center gap-1.5">
                        <span className={cn(
                            "w-2 h-2 rounded-full",
                            summaryMetrics.totalBalance === 0 
                                ? "bg-[#33C481]" 
                                : summaryMetrics.hasOverdue 
                                    ? "bg-[#F4586A]" 
                                    : "bg-[#6E5AE0]"
                        )} />
                        {summaryMetrics.totalBalance === 0 ? "Fully Cleared" : "Good Standing"}
                    </div>
                    <p className="text-[11px] text-[#8D8A9B] mt-0.5">
                        Enrolled in active DCA batch
                    </p>
                </div>
            </div>

            {/* Registrar Payment Instruction Notice */}
            <div className="p-4 rounded-[16px] bg-[#F8F7FA] border border-[#E9E8F0] flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#EDE8FB] text-[#6E5AE0] flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 size={16} />
                </div>
                <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-[#1E1B2E]">Payment Processing Notice</h4>
                    <p className="text-xs text-[#8D8A9B]">
                        Fee payments and installment collections are processed through the institute registrar or accounts counter. Official digital receipts are recorded and issued here once verified.
                    </p>
                </div>
            </div>

            {/* Bundled Services Notice */}
            {(isHostelBundled || isTransportBundled) && (
                <div className="p-4 rounded-[16px] bg-emerald-50/60 border border-emerald-200/50 flex items-start gap-3">
                    <span className="text-base mt-0.5">📦</span>
                    <div>
                        <span className="text-xs font-bold text-emerald-900">Bundled Base Fee Schedule: </span>
                        <span className="text-xs text-emerald-800">
                            Your academic tuition structure includes combined coverage for {isHostelBundled && isTransportBundled ? "Course, Hostel & Transport services" : isHostelBundled ? "Course & Hostel services" : "Course & Transport services"} in one integrated schedule.
                        </span>
                    </div>
                </div>
            )}

            {/* Academic Fee Cards */}
            <div className="space-y-6">
                {visibleFees.map((fee) => {
                    const finalAmount = fee.totalAmount - (fee.discount?.amount || 0) + (fee.extraCharges?.amount || 0);
                    const percentPaid = finalAmount > 0 ? Math.round((fee.paidAmount / finalAmount) * 100) : 100;

                    return (
                        <div 
                            key={fee._id} 
                            className="bg-white rounded-[16px] border border-[#E9E8F0] overflow-hidden transition-all"
                        >
                            {/* Card Header & Summary Banner */}
                            <div className="p-5 sm:p-6 border-b border-[#E9E8F0]">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#EDE8FB] text-[#6E5AE0]">
                                                {fee.batch?.course?.code || "DCA"}
                                            </span>
                                            <h2 className="text-base sm:text-lg font-bold text-[#1E1B2E]">
                                                {fee.batch?.name || "Batch 01"} {fee.batch?.course?.name ? `· ${fee.batch.course.name}` : ""}
                                            </h2>
                                        </div>
                                        <p className="text-xs text-[#8D8A9B]">
                                            Institute Ref: #{fee._id.toString().slice(-8).toUpperCase()} · Created {format(new Date(fee.createdAt), "MMM yyyy")}
                                        </p>
                                    </div>

                                    {/* Action Buttons: Purely View Receipts (No Online Pay) */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <StatusPill status={fee.status} />
                                        <button
                                            onClick={() => router.push(`/student/receipts/${fee._id}`)}
                                            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full bg-[#F4F3F7] text-[#1E1B2E] border border-[#E9E8F0] hover:bg-[#EDE8FB] hover:text-[#6E5AE0] transition-colors"
                                        >
                                            <Receipt size={13} />
                                            Official Receipt
                                            <ArrowUpRight size={12} className="opacity-70" />
                                        </button>
                                    </div>
                                </div>

                                {/* Clean Progress Clearance Bar */}
                                <div className="mt-5 pt-4 border-t border-[#F4F3F7]">
                                    <div className="flex justify-between items-center text-xs mb-2">
                                        <span className="font-semibold text-[#1E1B2E]">
                                            Clearance Progress: <span className="text-[#33C481]">{percentPaid}%</span>
                                        </span>
                                        <span className="text-[#8D8A9B]">
                                            ₹{fee.paidAmount.toLocaleString()} of ₹{finalAmount.toLocaleString()} paid
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-[#F4F3F7] rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-[#33C481] rounded-full transition-all duration-500"
                                            style={{ width: `${percentPaid}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Installment Plan Matrix (Dual Responsive View) */}
                            <div className="p-5 sm:p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#8D8A9B]">
                                        Installment Schedule
                                    </h3>
                                    <span className="text-xs text-[#8D8A9B]">
                                        {fee.installments?.length || 0} scheduled periods
                                    </span>
                                </div>

                                {/* Desktop Table (>= 768px) */}
                                <div className="hidden md:block rounded-[12px] border border-[#E9E8F0] overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-[#F8F7FA] border-b border-[#E9E8F0]">
                                            <tr>
                                                <th className="px-5 py-3 font-semibold text-[#8D8A9B] uppercase text-[10px] tracking-wider">Installment</th>
                                                <th className="px-5 py-3 font-semibold text-[#8D8A9B] uppercase text-[10px] tracking-wider">Due Date</th>
                                                <th className="px-5 py-3 font-semibold text-[#8D8A9B] uppercase text-[10px] tracking-wider">Amount</th>
                                                <th className="px-5 py-3 font-semibold text-[#8D8A9B] uppercase text-[10px] tracking-wider">Payment Details</th>
                                                <th className="px-5 py-3 font-semibold text-[#8D8A9B] uppercase text-[10px] tracking-wider">Status</th>
                                                <th className="px-5 py-3 font-semibold text-[#8D8A9B] uppercase text-[10px] tracking-wider text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E9E8F0]">
                                            {fee.installments?.map((inst, idx) => (
                                                <tr key={inst._id || idx} className="hover:bg-[#F8F7FA]/60 transition-colors">
                                                    <td className="px-5 py-3.5 font-bold text-[#1E1B2E]">
                                                        Installment #{idx + 1}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-[#8D8A9B]">
                                                        {format(new Date(inst.dueDate), "MMM dd, yyyy")}
                                                    </td>
                                                    <td className="px-5 py-3.5 font-bold text-[#1E1B2E] text-sm">
                                                        ₹{inst.amount.toLocaleString()}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-xs text-[#8D8A9B]">
                                                        {inst.status === 'paid' ? (
                                                            <div className="space-y-0.5">
                                                                <span className="font-semibold text-[#1E1B2E] capitalize">
                                                                    {inst.paymentMethod ? inst.paymentMethod.replace('_', ' ') : 'Counter Payment'}
                                                                </span>
                                                                {inst.transactionId && (
                                                                    <div className="text-[10px] font-mono text-[#8D8A9B]">
                                                                        Ref: {inst.transactionId}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[#8D8A9B] italic">Payable at registrar</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <InstallmentStatusPill status={inst.status} />
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        {inst.status === 'paid' ? (
                                                            <button
                                                                onClick={() => router.push(`/student/receipts/${fee._id}`)}
                                                                className="px-3 py-1 text-[11px] font-semibold rounded-full bg-white border border-[#E9E8F0] text-[#1E1B2E] hover:bg-[#F1EFFB] hover:text-[#6E5AE0] transition-colors"
                                                            >
                                                                Receipt
                                                            </button>
                                                        ) : (
                                                            <span className="text-[11px] text-[#8D8A9B] font-medium">
                                                                Counter Due
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Stacked Cards (< 768px) */}
                                <div className="md:hidden space-y-3">
                                    {fee.installments?.map((inst, idx) => (
                                        <div 
                                            key={inst._id || idx}
                                            className="p-4 rounded-[12px] border border-[#E9E8F0] bg-[#F8F7FA]/40 space-y-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-[#1E1B2E]">
                                                    Installment #{idx + 1}
                                                </span>
                                                <InstallmentStatusPill status={inst.status} />
                                            </div>

                                            <div className="flex items-baseline justify-between">
                                                <div className="text-lg font-bold text-[#1E1B2E]">
                                                    ₹{inst.amount.toLocaleString()}
                                                </div>
                                                <div className="text-xs text-[#8D8A9B]">
                                                    Due: {format(new Date(inst.dueDate), "MMM dd, yyyy")}
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-[#E9E8F0] flex items-center justify-between text-xs">
                                                {inst.status === 'paid' ? (
                                                    <>
                                                        <span className="text-[#8D8A9B] font-mono text-[11px]">
                                                            {inst.transactionId || "Verified Payment"}
                                                        </span>
                                                        <button
                                                            onClick={() => router.push(`/student/receipts/${fee._id}`)}
                                                            className="px-3 py-1 text-xs font-semibold rounded-full bg-white border border-[#E9E8F0] text-[#1E1B2E]"
                                                        >
                                                            View Receipt
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-[#8D8A9B] text-xs italic">
                                                        Payable at accounts counter
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Transport Fees Rendering */}
                {visibleTransport.map((tf) => (
                    <div key={tf._id} className="bg-white rounded-[16px] border border-[#E9E8F0] p-5 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-[#1E1B2E]">
                                    {tf.route?.name || "Transport Service"}
                                </h3>
                                <p className="text-xs text-[#8D8A9B]">
                                    Vehicle: {tf.vehicle?.registrationNumber || "Campus Bus"}
                                </p>
                            </div>
                            <StatusPill status={tf.status} />
                        </div>

                        <div className="grid grid-cols-3 gap-3 p-3.5 rounded-[12px] bg-[#F8F7FA] text-xs">
                            <div>
                                <span className="text-[#8D8A9B]">Total Fee:</span>
                                <p className="font-bold text-[#1E1B2E]">₹{tf.totalAmount.toLocaleString()}</p>
                            </div>
                            <div>
                                <span className="text-[#8D8A9B]">Paid:</span>
                                <p className="font-bold text-[#33C481]">₹{tf.paidAmount.toLocaleString()}</p>
                            </div>
                            <div>
                                <span className="text-[#8D8A9B]">Balance:</span>
                                <p className="font-bold text-[#F4C24A]">₹{tf.balanceAmount.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Hostel Allotments Rendering */}
                {visibleHostel.map((ha) => (
                    <div key={ha._id} className="bg-white rounded-[16px] border border-[#E9E8F0] p-5 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-[#1E1B2E]">
                                    {ha.room?.roomNumber ? `Hostel Room ${ha.room.roomNumber}` : 'Hostel Allotment'}
                                </h3>
                                <p className="text-xs text-[#8D8A9B]">
                                    Block: {ha.block?.blockName || "Residence"} · {ha.billingCycle} billing
                                </p>
                            </div>
                            <StatusPill status={ha.feeStatus} />
                        </div>

                        <div className="grid grid-cols-3 gap-3 p-3.5 rounded-[12px] bg-[#F8F7FA] text-xs">
                            <div>
                                <span className="text-[#8D8A9B]">Total Fee:</span>
                                <p className="font-bold text-[#1E1B2E]">₹{ha.totalAmount.toLocaleString()}</p>
                            </div>
                            <div>
                                <span className="text-[#8D8A9B]">Paid:</span>
                                <p className="font-bold text-[#33C481]">₹{ha.paidAmount.toLocaleString()}</p>
                            </div>
                            <div>
                                <span className="text-[#8D8A9B]">Balance:</span>
                                <p className="font-bold text-[#F4C24A]">₹{ha.balanceAmount.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Empty State */}
                {isAllEmpty && (
                    <div className="py-16 text-center bg-white rounded-[16px] border border-[#E9E8F0]">
                        <div className="w-12 h-12 bg-[#F1EFFB] text-[#6E5AE0] rounded-full flex items-center justify-center mx-auto mb-3">
                            <CreditCard size={22} />
                        </div>
                        <h4 className="text-base font-bold text-[#1E1B2E]">No Fee Schedules Found</h4>
                        <p className="text-xs text-[#8D8A9B] mt-1 max-w-xs mx-auto">
                            There are currently no active fee records or pending dues assigned to your account.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Visual Status Pills
function StatusPill({ status }) {
    if (status === 'paid') {
        return (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#33C481] border border-emerald-200">
                <CheckCircle2 size={12} /> Paid in Full
            </span>
        );
    }
    if (status === 'partial') {
        return (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-[#F4C24A] border border-amber-200">
                <Clock size={12} /> Partially Paid
            </span>
        );
    }
    if (status === 'overdue') {
        return (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-[#F4586A] border border-rose-200">
                <AlertCircle size={12} /> Overdue
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#F4F3F7] text-[#8D8A9B] border border-[#E9E8F0]">
            Not Started
        </span>
    );
}

function InstallmentStatusPill({ status }) {
    if (status === 'paid') {
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#33C481] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <Check size={11} strokeWidth={2.5} /> Paid
            </span>
        );
    }
    if (status === 'overdue') {
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F4586A] bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                <AlertCircle size={11} /> Overdue
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F4C24A] bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
            <Clock size={11} /> Pending
        </span>
    );
}
