"use client";

import { useState, useEffect, useCallback } from "react";
import { Receipt, Save, Loader2, ArrowLeft, Calendar, Lightbulb } from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";

const paymentModeOptions = [
    { value: "Cash", label: "Cash" },
    { value: "Bank Transfer", label: "Bank Transfer" },
    { value: "UPI", label: "UPI" },
    { value: "Cheque", label: "Cheque" },
    { value: "Other", label: "Other" }
];

export default function AddIncomePage() {
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [incomeHeads, setIncomeHeads] = useState([]);
    const [accounts, setAccounts] = useState([]);

    const today = new Date().toISOString().split('T')[0];
    const [formData, setFormData] = useState({
        date: today,
        incomeHead: "",
        amount: "",
        description: "",
        receivedFrom: "",
        paymentMode: "Cash",
        receivedInAccount: ""
    });

    const fetchData = useCallback(async (signal) => {
        try {
            const [headsRes, accountsRes] = await Promise.all([
                fetch("/api/v1/income-heads", { signal }),
                fetch("/api/v1/collectors", { signal })
            ]);

            const headsData = await headsRes.json();
            const accountsData = await accountsRes.json();

            if (signal?.aborted) return;

            setIncomeHeads(headsData.incomeHeads || []);
            setAccounts(accountsData.collectors || []);
        } catch (error) {
            if (error.name !== 'AbortError') {
                toast.error("Failed to load initial data");
            }
        } finally {
            if (signal?.aborted) return;
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        const controller = new AbortController();
        fetchData(controller.signal);
        return () => controller.abort();
    }, [fetchData]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.incomeHead) {
            toast.error("Please select an income category");
            return;
        }
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/v1/incomes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: formData.date,
                    incomeHead: formData.incomeHead,
                    amount: parseFloat(formData.amount),
                    description: formData.description,
                    receivedFrom: formData.receivedFrom,
                    paymentMode: formData.paymentMode,
                    receivedInAccount: formData.receivedInAccount || null
                })
            });
            const data = await res.json();

            if (res.ok) {
                toast.success("Income recorded successfully");
                setFormData({
                    date: today,
                    incomeHead: "",
                    amount: "",
                    description: "",
                    receivedFrom: "",
                    paymentMode: "Cash",
                    receivedInAccount: ""
                });
            } else {
                toast.error(data.error || "Failed to record income");
            }
        } catch (error) {
            toast.error("Error recording income");
        } finally {
            setSaving(false);
        }
    };

    const incomeHeadOptions = incomeHeads.map(head => ({
        value: head._id,
        label: head.name
    }));

    const accountOptions = accounts.map(acc => ({
        value: acc._id,
        label: acc.accountType === 'Bank' ? `${acc.name} (${acc.accountNumber})` : acc.name
    }));

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-premium-blue" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-0">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} className="text-slate-500" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Receipt className="text-premium-blue" size={28} />
                        Add Income
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">Log non-fee incoming revenues and transactions.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT SIDE: Inputs */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            
                            {/* SECTION: Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Basic Info</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                                            <Calendar size={18} className="text-slate-400" />
                                        </div>
                                        <Input
                                            label="Date"
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="pl-10 focus:bg-white transition-all"
                                            required
                                        />
                                    </div>
                                    <Select
                                        label="Income Category"
                                        options={incomeHeadOptions}
                                        value={formData.incomeHead}
                                        onChange={(val) => setFormData({ ...formData, incomeHead: val })}
                                        placeholder="Select category"
                                        required
                                    />
                                </div>
                            </div>

                            {/* SECTION: Payment Details */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Payment Details</h3>
                                
                                {/* BIG AMOUNT FIELD */}
                                <div className="mb-6">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1 block mb-1.5">Amount</label>
                                    <div className="relative flex items-center">
                                        <span className="absolute left-4 text-2xl font-black text-slate-400">₹</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            required
                                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-12 pr-4 py-4 text-3xl font-black text-slate-800 outline-none transition-all duration-200 focus:border-premium-blue focus:bg-white focus:ring-4 focus:ring-premium-blue/10 placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Select
                                        label="Payment Mode"
                                        options={paymentModeOptions}
                                        value={formData.paymentMode}
                                        onChange={(val) => setFormData({ ...formData, paymentMode: val })}
                                    />
                                    <Input
                                        label="Received From"
                                        placeholder="e.g. Bookstore customer"
                                        value={formData.receivedFrom}
                                        onChange={(e) => setFormData({ ...formData, receivedFrom: e.target.value })}
                                        className="focus:bg-white"
                                    />
                                    <Select
                                        label="Received In (Destination Account)"
                                        options={accountOptions}
                                        value={formData.receivedInAccount}
                                        onChange={(val) => setFormData({ ...formData, receivedInAccount: val })}
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            {/* SECTION: Notes */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Notes</h3>
                                <div>
                                    <textarea
                                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 outline-none transition-all duration-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 focus:bg-white placeholder:text-slate-400 text-sm resize-none"
                                        rows={3}
                                        placeholder="Add any additional details or context about this transaction..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                    onClick={() => setFormData({
                                        date: today,
                                        incomeHead: "",
                                        amount: "",
                                        description: "",
                                        receivedFrom: "",
                                        paymentMode: "Cash",
                                        receivedInAccount: ""
                                    })}
                                >
                                    Reset
                                </Button>
                                <Button type="submit" disabled={saving} className="min-w-[160px] bg-premium-blue hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/30">
                                    {saving ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin mr-2" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} className="mr-2" />
                                            Save Income
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Card>

                    {incomeHeads.length === 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mt-6">
                            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 shrink-0">
                                <Receipt size={16} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-amber-800">No income categories found</p>
                                <p className="text-xs text-amber-700 mt-1">
                                    Please create income categories first in <span className="font-medium">Income Master</span> before adding records.
                                </p>
                                <Button variant="ghost" size="sm" className="mt-2 text-amber-700 hover:text-amber-800" onClick={() => router.push('/admin/incomes/master')}>
                                    Go to Income Master
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT SIDE: Live Summary */}
                <div className="space-y-6">
                    <Card className="p-6 bg-slate-50 border-slate-200 border">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Live Preview</h3>
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase">Amount</p>
                                    <p className="text-3xl font-black text-slate-800 mt-1">
                                        ₹{formData.amount ? parseFloat(formData.amount).toLocaleString('en-IN') : "0"}
                                    </p>
                                </div>
                                <div className="bg-blue-50 text-premium-blue px-3 py-1 rounded-full text-xs font-bold">
                                    {formData.paymentMode}
                                </div>
                            </div>
                            
                            <hr className="border-slate-100" />
                            
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs font-medium text-slate-400">Category</p>
                                    <p className="text-sm font-bold text-slate-700">
                                        {formData.incomeHead ? incomeHeadOptions.find(h => h.value === formData.incomeHead)?.label : "Not selected"}
                                    </p>
                                </div>
                                {formData.receivedFrom && (
                                    <div>
                                        <p className="text-xs font-medium text-slate-400">Received From</p>
                                        <p className="text-sm font-bold text-slate-700">{formData.receivedFrom}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl shadow-slate-900/20 glass shadow-none border-none">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-white">Quick Tip</h3>
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-amber-300">
                                <Lightbulb size={16} />
                            </div>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            Always record details (e.g. receipt number or purpose) in notes to make cash flow audit clean.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
}
