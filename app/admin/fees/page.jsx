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
    DollarSign
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { format } from "date-fns";

export default function FeesPage() {
    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedFee, setSelectedFee] = useState(null); // For detail/payment view
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Payment Form state
    const [paymentData, setPaymentData] = useState({
        installmentId: "",
        amount: "",
        method: "cash",
        transactionId: "",
        notes: ""
    });

    useEffect(() => {
        fetchFees();
    }, []);

    const fetchFees = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/fees");
            const data = await res.json();
            if (Array.isArray(data)) {
                setFees(data);
            } else {
                console.error("Expected array but got:", data);
                setFees([]);
            }
        } catch (error) {
            console.error("Failed to fetch fees", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        if (!selectedFee || !paymentData.installmentId) return;

        try {
            const res = await fetch(`/api/v1/fees/${selectedFee._id}/payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(paymentData),
            });

            if (res.ok) {
                setIsPaymentModalOpen(false);
                setPaymentData({ installmentId: "", amount: "", method: "cash", transactionId: "", notes: "" });
                fetchFees(); // Refresh list to update balance/status
            } else {
                const error = await res.json();
                alert(error.error || "Failed to record payment");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const openPaymentModal = (fee) => {
        setSelectedFee(fee);
        // Default to first pending installment
        const firstPending = fee.installments.find(i => i.status === 'pending');
        if (firstPending) {
            setPaymentData({ ...paymentData, installmentId: firstPending._id, amount: firstPending.amount });
        }
        setIsPaymentModalOpen(true);
    };

    const filteredFees = fees.filter(fee =>
        fee.student?.profile?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        fee.student?.enrollmentNumber?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Fee Ledger</h1>
                    <p className="text-slate-400 mt-1 text-sm font-medium">Track incoming payments, manage dues and view financial status.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="soft"
                        onClick={async () => {
                            if (!confirm("Create test fee record?")) return;
                            try {
                                // 1. Get a student and batch
                                const [sRes, bRes] = await Promise.all([
                                    fetch("/api/v1/students"),
                                    fetch("/api/v1/batches")
                                ]);
                                const sData = await sRes.json();
                                const bData = await bRes.json();

                                const student = sData.students?.[0] || sData?.[0];
                                const batch = bData.batches?.[0] || bData?.[0];

                                if (!student || !batch) {
                                    alert("Need at least one student and batch to seed fee.");
                                    return;
                                }

                                const res = await fetch("/api/v1/fees", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        student: student._id,
                                        batch: batch._id,
                                        totalAmount: 12000,
                                        installments: [
                                            { amount: 6000, dueDate: new Date() },
                                            { amount: 6000, dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
                                        ]
                                    })
                                });
                                if (res.ok) fetchFees();
                                else alert("Failed to seed");
                            } catch (e) {
                                console.error(e);
                                alert("Error seeding");
                            }
                        }}
                    >
                        + Seed Test Fee
                    </Button>
                </div>
            </div>

            <Card className="transition-all border-transparent shadow-sm">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                    <div className="flex-1 max-w-md relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400/50 transition-colors group-focus-within:text-premium-blue" size={18} />
                        <input
                            type="text"
                            placeholder="Search by student name or ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-premium-blue/30 focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium"
                        />
                    </div>
                </CardHeader>
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
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openPaymentModal(fee)}
                                                    className="border-slate-200 hover:border-premium-blue hover:text-premium-blue"
                                                >
                                                    <DollarSign size={14} className="mr-1" /> Pay
                                                </Button>
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
                                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">Select Installment</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-premium-blue/50 focus:ring-4 focus:ring-premium-blue/10 text-sm text-slate-700 transition-all cursor-pointer"
                                    value={paymentData.installmentId}
                                    onChange={(e) => {
                                        const inst = selectedFee.installments.find(i => i._id === e.target.value);
                                        setPaymentData({
                                            ...paymentData,
                                            installmentId: e.target.value,
                                            amount: inst ? inst.amount : ""
                                        });
                                    }}
                                    required
                                >
                                    <option value="">-- Select Installment --</option>
                                    {selectedFee.installments
                                        .filter(i => i.status !== 'paid')
                                        .map((inst, idx) => (
                                            <option key={inst._id} value={inst._id}>
                                                Installment #{idx + 1} - ₹{inst.amount} (Due: {format(new Date(inst.dueDate), 'MMM d')})
                                            </option>
                                        ))}
                                </select>
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
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-premium-blue/50 focus:ring-4 focus:ring-premium-blue/10 text-sm text-slate-700 transition-all cursor-pointer"
                                        value={paymentData.method}
                                        onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="upi">UPI</option>
                                        <option value="card">Card</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="cheque">Cheque</option>
                                    </select>
                                </div>
                            </div>

                            <Input
                                id="transactionId"
                                label="Transaction ID / Ref No."
                                placeholder="Optional"
                                value={paymentData.transactionId}
                                onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                            />

                            <div className="pt-4 flex gap-3">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
                                <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20">Record Payment</Button>
                            </div>
                        </form>
                    </div>
                )}
            </Modal>
        </div>
    );
}
