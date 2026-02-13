"use client";

import { useState, useEffect } from "react";
import {
    CreditCard,
    Search,
    MoreVertical,
    Filter,
    CheckCircle,
    AlertCircle,
    Clock,
    DollarSign,
    Trash2
} from "lucide-react";
import Select from "@/components/ui/Select";
// Verified: Usage of Select component is compatible with onChange(value) signature.
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { format } from "date-fns";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import * as XLSX from "xlsx";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default function FeesPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedFee, setSelectedFee] = useState(null); // For detail/payment view
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    const [showOverdueOnly, setShowOverdueOnly] = useState(false);

    // Payment Form state
    const [paymentData, setPaymentData] = useState({
        installmentId: "",
        amount: "",
        method: "cash",
        transactionId: "",
        collectedBy: "",
        notes: "",
        date: format(new Date(), "yyyy-MM-dd"), // Default to today
        nextDueDate: "" // Optional
    });
    const [collectors, setCollectors] = useState([]);

    // Filters & Report State
    const [courses, setCourses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [selectedBatch, setSelectedBatch] = useState("");
    const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0 });

    useEffect(() => {
        fetchFees();
        fetchCourses();
        const controller = new AbortController();
        fetchCollectors(controller.signal);
        return () => controller.abort();
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            fetchBatches(selectedCourse);
        } else {
            setBatches([]);
        }
        setSelectedBatch(""); // Reset batch when course changes
    }, [selectedCourse]);

    const fetchCourses = async () => {
        try {
            const res = await fetch("/api/v1/courses");
            if (res.ok) {
                const data = await res.json();
                setCourses(data.courses || []);
            }
        } catch (error) {
            console.error("Failed to fetch courses", error);
        }
    };

    const fetchBatches = async (courseId) => {
        try {
            const res = await fetch(`/api/v1/batches?courseId=${courseId}`);
            if (res.ok) {
                const data = await res.json();
                setBatches(data.batches || []);
            }
        } catch (error) {
            console.error("Failed to fetch batches", error);
        }
    };

    const fetchFees = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/fees");
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch fees: ${res.statusText}`);
            }
            const data = await res.json();
            if (Array.isArray(data)) {
                setFees(data);
            } else {
                console.error("Expected array but got:", data);
                setFees([]);
                toast.error("Received invalid data from server");
            }
        } catch (error) {
            console.error("Failed to fetch fees", error);
            toast.error(error.message || "Failed to load fee records");
        } finally {
            setLoading(false);
        }
    };

    const fetchCollectors = async (signal) => {
        try {
            const res = await fetch("/api/v1/collectors", {
                signal: signal || AbortSignal.timeout(10000)
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch collectors (${res.status})`);
            }
            const data = await res.json();
            if (signal?.aborted) return;
            setCollectors(data.collectors || []);
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error("Failed to fetch collectors", error);
            toast.error(error.message || "Failed to load fee collectors");
        }
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        if (isSubmittingPayment) return;

        // Allow if installmentId is set OR if we are in adhoc mode (where we send null/undefined)
        // But currently our Select uses "adhoc" string.
        if (!selectedFee) return;

        // Validate Amount
        const amountNum = parseFloat(paymentData.amount);
        if (!paymentData.amount || isNaN(amountNum) || amountNum <= 0) {
            toast.warning("Please enter a valid positive amount");
            return;
        }

        if (amountNum > (selectedFee.balanceAmount || 0)) {
            toast.warning("Amount exceeds pending balance");
            return;
        }

        const payload = {
            ...paymentData,
            amount: amountNum
        };

        // Conditional Validation for Transaction ID
        if (["upi", "card", "bank_transfer"].includes(paymentData.method) && !paymentData.transactionId) {
            toast.warning("Transaction reference is required for this payment method");
            return;
        }

        if (payload.installmentId === 'adhoc') {
            delete payload.installmentId; // Remove it so backend sees it as ad-hoc
        } else if (!payload.installmentId) {
            toast.warning("Please select an installment or choose Ad-hoc Payment");
            return;
        }

        try {
            setIsSubmittingPayment(true);
            const res = await fetch(`/api/v1/fees/${selectedFee._id}/payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setIsPaymentModalOpen(false);
                setPaymentData({ installmentId: "", amount: "", method: "cash", transactionId: "", collectedBy: "", notes: "" });
                fetchFees(); // Refresh list to update balance/status
                toast.success("Payment recorded successfully");
            } else {
                let errorMessage = "Failed to record payment";
                try {
                    const error = await res.json();
                    errorMessage = error.error || errorMessage;
                } catch (e) { /* ignore parse error */ }

                toast.error(errorMessage);
            }
        } catch (err) {
            console.error(err);
            toast.error("Network error while recording payment");
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    const openPaymentModal = (fee) => {
        setSelectedFee(fee);
        // Default to first pending installment
        const firstPending = fee.installments.find(i => i.status === 'pending');
        if (firstPending) {
            setPaymentData(prev => ({ ...prev, installmentId: firstPending._id, amount: firstPending.amount, collectedBy: "" }));
        }
        fetchCollectors();
        setIsPaymentModalOpen(true);
    };

    const filteredFees = fees.filter(fee => {
        // 1. Search Filter
        const q = search.toLowerCase();
        const matchesSearch =
            fee.student?.profile?.firstName?.toLowerCase()?.includes(q) ||
            fee.student?.enrollmentNumber?.toLowerCase()?.includes(q);

        // 2. Batch Filter (Direct)
        if (selectedBatch && fee.batch?._id !== selectedBatch) return false;

        // 3. Course Filter (Indirect via Batch)
        // If Course is selected but NO Batch is selected, check if fee's batch matches any fetched batch
        if (selectedCourse && !selectedBatch && batches.length > 0) {
            const belongsToCourse = batches.some(b => b._id === fee.batch?._id);
            if (!belongsToCourse) return false;
        }

        // 4. Overdue Filter
        if (showOverdueOnly) {
            const isOverdue = fee.installments?.some(i => i.status === 'pending' && new Date(i.dueDate) < new Date());
            if (!isOverdue) return false;
        }

        return matchesSearch;
    });



    const handleExport = (formatType = 'xlsx') => {
        if (!filteredFees.length) {
            toast.error("No data to export");
            return;
        }

        const dataToExport = filteredFees.map(fee => ({
            "Student Name": `${fee.student?.profile?.firstName || ''} ${fee.student?.profile?.lastName || ''}`.trim(),
            "Enrollment No": fee.student?.enrollmentNumber || "N/A",
            "Batch": fee.batch?.name || "N/A",
            "Total Fee": fee.totalAmount || 0,
            "Paid Amount": fee.paidAmount || 0,
            "Balance Amount": fee.balanceAmount || 0,
            "Status": (fee.balanceAmount || 0) <= 0 ? "Paid" : "Pending",
            "Installments": fee.installments?.length || 0,
            "Next Due Date": fee.installments?.find(i => i.status === 'pending')?.dueDate ? format(new Date(fee.installments.find(i => i.status === 'pending').dueDate), 'yyyy-MM-dd') : "N/A"
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Fee Ledger");

        // Auto-width columns (Enterprise Polish)
        if (formatType === 'xlsx') {
            worksheet["!cols"] = [
                { wch: 25 }, // Student Name
                { wch: 18 }, // Enrollment No
                { wch: 20 }, // Batch
                { wch: 12 }, // Total Fee
                { wch: 12 }, // Paid
                { wch: 12 }, // Balance
                { wch: 12 }, // Status
                { wch: 12 }, // Installments
                { wch: 16 }  // Next Due Date
            ];
        }

        const fileName = `Fee_Ledger_Export_${format(new Date(), 'yyyy-MM-dd')}.${formatType}`;
        XLSX.writeFile(workbook, fileName);
        toast.success(`Export started (${formatType.toUpperCase()})`);
    };

    useEffect(() => {
        // Calculate Summary
        const newSummary = filteredFees.reduce((acc, fee) => ({
            total: acc.total + (fee.totalAmount || 0),
            paid: acc.paid + (fee.paidAmount || 0),
            pending: acc.pending + (fee.balanceAmount || 0)
        }), { total: 0, paid: 0, pending: 0 });
        setSummary(newSummary);
    }, [fees, search, selectedCourse, selectedBatch, batches, showOverdueOnly]); // Re-run when filters change
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Fee Ledger</h1>
                    <p className="text-slate-400 mt-1 text-sm font-medium">Track incoming payments, manage dues and view financial status.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('csv')}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
                    >
                        <span className="font-mono text-xs font-bold">CSV</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('xlsx')}
                        className="flex items-center gap-2"
                    >
                        <DollarSign size={16} className="text-emerald-600" />
                        Export Excel
                    </Button>
                </div>
            </div>


            {/* Report Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 border-l-4 border-l-slate-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Expected</p>
                            <h3 className="text-2xl font-black text-slate-700 mt-1">₹{summary.total.toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                            <DollarSign size={20} />
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-emerald-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-wider">Total Collected</p>
                            <h3 className="text-2xl font-black text-emerald-600 mt-1">₹{summary.paid.toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                            <CheckCircle size={20} />
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-amber-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-amber-600/70 uppercase tracking-wider">Total Pending</p>
                            <h3 className="text-2xl font-black text-amber-600 mt-1">₹{summary.pending.toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                            <AlertCircle size={20} />
                        </div>
                    </div>
                </Card>
            </div >

            <Card className="transition-all border-transparent shadow-sm">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 space-y-0">
                    <div className="flex-1 max-w-sm relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400/50 transition-colors group-focus-within:text-premium-blue" size={18} />
                        <input
                            type="text"
                            placeholder="Search student..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-premium-blue/30 focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium"
                        />
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <Select
                            className="w-full md:w-48"
                            value={selectedCourse}
                            onChange={(val) => setSelectedCourse(val)}
                            options={[
                                { label: "All Courses", value: "" },
                                ...courses.map(c => ({ label: c.name, value: c._id }))
                            ]}
                            placeholder="Filter Course"
                        />
                        <Select
                            className="w-full md:w-48"
                            value={selectedBatch}
                            onChange={(val) => setSelectedBatch(val)}
                            options={[
                                { label: "All Batches", value: "" },
                                ...batches.map(b => ({ label: b.name, value: b._id }))
                            ]}
                            disabled={!selectedCourse}
                            placeholder="Filter Batch"
                        />
                    </div>
                </CardHeader>
                <div className="px-6 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-premium-blue focus:ring-premium-blue/20"
                            checked={showOverdueOnly}
                            onChange={(e) => setShowOverdueOnly(e.target.checked)}
                        />
                        Show Overdue Only
                    </label>
                </div>
                <CardContent className="p-0">
                    {loading ? (
                        <LoadingSpinner />
                    ) : filteredFees.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white border-y border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Student</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Batch</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Total Fee</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Paid</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Balance</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredFees.map((fee) => (
                                        <tr key={fee._id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">
                                                        {fee.student?.profile?.firstName} {fee.student?.profile?.lastName}
                                                    </p>
                                                    <p className="text-[11px] font-medium text-slate-400 font-mono tracking-wide">{fee.student?.enrollmentNumber}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="secondary" className="font-mono text-[10px] uppercase bg-slate-100 text-slate-500">
                                                    {fee.batch?.name}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-600">
                                                ₹{fee.totalAmount?.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-emerald-600">
                                                ₹{fee.paidAmount?.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-sm font-bold ${fee.balanceAmount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                    ₹{fee.balanceAmount?.toLocaleString()}
                                                </div>
                                                {fee.installments?.some(i => i.status === 'pending' && new Date(i.dueDate) < new Date()) && (
                                                    <Badge className="mt-1 bg-rose-100 text-rose-600 border-rose-200">
                                                        Overdue
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openPaymentModal(fee)}
                                                        className="border-slate-200 hover:border-premium-blue hover:text-premium-blue"
                                                    >
                                                        <DollarSign size={14} className="mr-1" /> Pay
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                        onClick={async () => {
                                                            if (!await confirm({
                                                                title: "Delete Fee Record?",
                                                                message: "This will soft-delete the fee record. It will be removed from all views.",
                                                                type: "danger"
                                                            })) return;

                                                            try {
                                                                const res = await fetch(`/api/v1/fees/${fee._id}`, { method: 'DELETE' });
                                                                if (res.ok) {
                                                                    toast.success("Fee record deleted");
                                                                    fetchFees();
                                                                } else {
                                                                    const err = await res.json().catch(() => ({}));
                                                                    toast.error(err.error || "Failed to delete");
                                                                }
                                                            } catch (e) {
                                                                console.error(e);
                                                                toast.error("Error deleting fee");
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState
                            icon={CreditCard}
                            title="No fee records found"
                            description="Fee records are created when students are admitted."
                        />
                    )}
                </CardContent>
            </Card>

            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                title="Record Payment"
            >
                {selectedFee && (
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Student</p>
                                <p className="font-bold text-slate-700">{selectedFee.student?.profile?.firstName} {selectedFee.student?.profile?.lastName}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] uppercase font-bold text-slate-400">Current Balance</p>
                                <p className="font-bold text-amber-600 text-lg">₹{selectedFee.balanceAmount?.toLocaleString()}</p>
                            </div>
                        </div>

                        <form onSubmit={handleRecordPayment} className="space-y-5">
                            <div className="space-y-1.5">
                                <Select
                                    value={paymentData.installmentId}
                                    onChange={(val) => {
                                        const inst = selectedFee.installments.find(i => i._id === val);
                                        setPaymentData({
                                            ...paymentData,
                                            installmentId: val,
                                            amount: inst ? inst.amount : ""
                                        });
                                    }}
                                    options={[
                                        { label: "-- Select Installment --", value: "" },
                                        { label: "+ Record New / Ad-hoc Payment", value: "adhoc" },
                                        ...selectedFee.installments
                                            .filter(i => i.status !== 'paid')
                                            .map((inst) => ({
                                                label: `Installment - ₹${inst.amount} (Due: ${format(new Date(inst.dueDate), 'MMM d')})`,
                                                value: inst._id
                                            }))
                                    ]}
                                />
                            </div>


                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    id="paymentDate"
                                    label="Payment Date"
                                    type="date"
                                    value={paymentData.date}
                                    onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                                    required
                                />
                                <Input
                                    id="nextDueDate"
                                    label="Next Due Date (Remaining Balance)"
                                    type="date"
                                    value={paymentData.nextDueDate}
                                    onChange={(e) => setPaymentData({ ...paymentData, nextDueDate: e.target.value })}
                                    placeholder="Optional"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    id="amount"
                                    label="Amount Received (₹)"
                                    type="number"
                                    value={paymentData.amount}
                                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                                    required
                                />
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">Payment Method</label>
                                    <Select
                                        value={paymentData.method}
                                        onChange={(val) => setPaymentData({ ...paymentData, method: val })}
                                        options={[
                                            { label: "Cash", value: "cash" },
                                            { label: "UPI", value: "upi" },
                                            { label: "Card", value: "card" },
                                            { label: "Bank Transfer", value: "bank_transfer" },
                                            { label: "Cheque", value: "cheque" }
                                        ]}
                                    />
                                </div>
                            </div>

                            <Input
                                id="transactionId"
                                label="Transaction ID / Ref No."
                                placeholder="Optional"
                                value={paymentData.transactionId}
                                onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                            />

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">Collected By</label>
                                <Select
                                    value={paymentData.collectedBy}
                                    onChange={(val) => setPaymentData({ ...paymentData, collectedBy: val })}
                                    options={[
                                        { label: "Select Collector", value: "" },
                                        ...collectors.map(c => ({ label: c.name, value: c.name }))
                                    ]}
                                    required
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmittingPayment} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20">
                                    {isSubmittingPayment ? "Recording..." : "Record Payment"}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </Modal>
        </div >
    );
}

