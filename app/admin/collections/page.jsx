"use client";

import * as XLSX from "xlsx";
import { useState, useEffect } from "react";
import {
    History,
    Search,
    Filter,
    Download,
    User,
    Calendar,
    CreditCard,
    ArrowLeft,
    Loader2,
    FileText,
    ArrowRightLeft,
    Wallet,
    Building2,
    Plus,
    ArrowUpRight,
    CheckCircle2,
    RotateCcw
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { format } from "date-fns";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";

export default function CollectionsPage() {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState("history"); // history, balances, transfers
    
    // Data States
    const [collections, setCollections] = useState([]);
    const [collectors, setCollectors] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // UI States
    const [search, setSearch] = useState("");
    const [filterPerson, setFilterPerson] = useState("all");
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Transfer Form State
    const [transferData, setTransferData] = useState({
        fromCollectorId: "",
        toCollectorId: "",
        amount: "",
        referenceNumber: "",
        notes: "",
        transferDate: format(new Date(), "yyyy-MM-dd")
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [collRes, collectorsRes, transfersRes] = await Promise.all([
                fetch("/api/v1/reports/collections"),
                fetch("/api/v1/collectors"),
                fetch("/api/v1/collectors/transfers")
            ]);

            const [collData, collectorsData, transfersData] = await Promise.all([
                collRes.json(),
                collectorsRes.json(),
                transfersRes.json()
            ]);

            setCollections(collData.collections || []);
            setCollectors(collectorsData.collectors || []);
            setTransfers(transfersData.transfers || []);
        } catch (error) {
            console.error("Fetch data error:", error);
            toast.error("Failed to load collection data");
        } finally {
            setLoading(false);
        }
    };

    const handleRecordTransfer = async (e) => {
        e.preventDefault();
        if (isSubmittingTransfer) return;

        try {
            setIsSubmittingTransfer(true);
            const res = await fetch("/api/v1/collectors/transfers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(transferData)
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("Transfer recorded successfully");
                setIsTransferModalOpen(false);
                setTransferData({
                    fromCollectorId: "",
                    toCollectorId: "",
                    amount: "",
                    referenceNumber: "",
                    notes: "",
                    transferDate: format(new Date(), "yyyy-MM-dd")
                });
                fetchAllData(); // Refresh all
            } else {
                toast.error(data.error || "Failed to record transfer");
            }
        } catch (error) {
            console.error("Transfer error:", error);
            toast.error("Network error during transfer");
        } finally {
            setIsSubmittingTransfer(false);
        }
    };

    const handleSyncBalances = async () => {
        try {
            setIsSyncing(true);
            const res = await fetch("/api/v1/admin/sync-balances", { method: "POST" });
            const data = await res.json();
            
            if (res.ok) {
                toast.success("Balances synchronized with history");
                fetchAllData();
            } else {
                toast.error(data.error || "Sync failed");
            }
        } catch (error) {
            toast.error("Network error during sync");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleExportSummary = () => {
        if (!collectors.length && !collections.length && !transfers.length) {
            toast.error("No data available to export");
            return;
        }

        const workbook = XLSX.utils.book_new();

        // 1. Collector Balances Sheet
        const balanceData = collectors.map(c => ({
            "Collector Name": c.name,
            "Type": c.accountType,
            "Designation": c.designation || "N/A",
            "Current Balance (₹)": c.currentBalance || 0,
            "Status": c.isActive ? "Active" : "Inactive"
        }));
        const balanceSheet = XLSX.utils.json_to_sheet(balanceData);
        XLSX.utils.book_append_sheet(workbook, balanceSheet, "Collector Balances");

        // 2. Collection History Sheet
        const historyData = collections.map(item => ({
            "Date": format(new Date(item.paidDate), "yyyy-MM-dd HH:mm"),
            "Student Name": item.student?.fullName,
            "Enrollment No": item.student?.enrollmentNumber,
            "Batch": item.batch?.name,
            "Collected By": item.collectedBy,
            "Amount (₹)": item.amount,
            "Method": item.method
        }));
        const historySheet = XLSX.utils.json_to_sheet(historyData);
        XLSX.utils.book_append_sheet(workbook, historySheet, "Collection History");

        // 3. Transfer History Sheet
        const transferDataExport = transfers.map(item => ({
            "Transfer Date": format(new Date(item.transferDate), "yyyy-MM-dd"),
            "From (Source)": item.fromCollector?.name,
            "To (Destination)": item.toCollector?.name,
            "Amount (₹)": item.amount,
            "Reference": item.referenceNumber || "Internal",
            "Notes": item.notes || "",
            "Recorded By": `${item.recordedBy?.profile?.firstName} ${item.recordedBy?.profile?.lastName}`
        }));
        const transferSheet = XLSX.utils.json_to_sheet(transferDataExport);
        XLSX.utils.book_append_sheet(workbook, transferSheet, "Internal Transfers");

        // Export
        const fileName = `Financial_Summary_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        toast.success("Report generated successfully");
    };

    const uniqueCollectors = ["all", ...new Set(collections.map(c => c.collectedBy))];

    const filteredCollections = collections.filter(c => {
        const matchesSearch =
            c.student?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
            c.student?.enrollmentNumber?.toLowerCase().includes(search.toLowerCase());
        const matchesPerson = filterPerson === "all" || c.collectedBy === filterPerson;
        return matchesSearch && matchesPerson;
    });

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Wallet className="text-blue-600" size={32} />
                        Financial Collections
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">Manage student payments and internal fund transfers.</p>
                </div>
                <div className="flex gap-3">
                    <Button 
                        variant="primary" 
                        onClick={() => setIsTransferModalOpen(true)}
                        className="px-6"
                    >
                        <ArrowRightLeft size={18} className="mr-2" /> Record Transfer
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => handleExportSummary()}
                        className="px-6 border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                        <Download size={18} className="mr-2" /> Export Report
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => handleSyncBalances()}
                        disabled={isSyncing}
                        className="px-6 border-amber-200 text-amber-700 hover:bg-amber-50"
                    >
                        {isSyncing ? <Loader2 className="animate-spin mr-2" size={18} /> : <RotateCcw size={18} className="mr-2" />}
                        Sync Balances
                    </Button>
                    <Button variant="outline" onClick={fetchAllData} disabled={loading} className="px-6">
                        {loading ? <Loader2 className="animate-spin" size={18} /> : "Refresh"}
                    </Button>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl w-fit backdrop-blur-sm border border-slate-200/50">
                <button
                    onClick={() => setActiveTab("history")}
                    className={cn(
                        "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                        activeTab === "history" ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/30"
                    )}
                >
                    <History size={16} /> History
                </button>
                <button
                    onClick={() => setActiveTab("balances")}
                    className={cn(
                        "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                        activeTab === "balances" ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/30"
                    )}
                >
                    <Wallet size={16} /> Balances
                </button>
                <button
                    onClick={() => setActiveTab("transfers")}
                    className={cn(
                        "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                        activeTab === "transfers" ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/30"
                    )}
                >
                    <ArrowRightLeft size={16} /> Transfers
                </button>
            </div>

            {/* Content Area */}
            <div className="space-y-6">
                {activeTab === "history" && (
                    <>
                        <Card className="p-4 bg-slate-50/50 border-slate-100 flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search student or enrollment no..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-premium-blue outline-none text-sm transition-all bg-white"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <Filter size={16} className="text-slate-400" />
                                <select
                                    value={filterPerson}
                                    onChange={(e) => setFilterPerson(e.target.value)}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 focus:border-premium-blue outline-none text-sm bg-white min-w-[160px]"
                                >
                                    {uniqueCollectors.map(p => (
                                        <option key={p} value={p}>{p === "all" ? "All Collectors" : p}</option>
                                    ))}
                                </select>
                            </div>
                        </Card>

                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            {loading ? (
                                <div className="py-20 flex flex-col items-center gap-4 text-slate-400 font-medium italic">
                                    <Loader2 className="animate-spin text-premium-blue" size={40} />
                                    Loading history...
                                </div>
                            ) : filteredCollections.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Student & Batch</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Collected By</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Method</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredCollections.map((item) => (
                                                <tr key={item._id} className="hover:bg-slate-50/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm font-bold text-slate-900">{format(new Date(item.paidDate), "dd MMM yyyy")}</p>
                                                        <p className="text-[10px] text-slate-400 uppercase font-bold">{format(new Date(item.paidDate), "hh:mm a")}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm font-bold text-slate-900">{item.student?.fullName}</p>
                                                        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-tight">{item.batch?.name}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-premium-blue/10 flex items-center justify-center text-premium-blue">
                                                                <User size={12} />
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-700">{item.collectedBy}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-lg font-black text-emerald-600">₹{item.amount.toLocaleString()}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Badge variant="secondary" className="uppercase text-[9px] font-black tracking-widest bg-slate-100 border-slate-200">
                                                            {item.method}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="xs"
                                                            onClick={() => window.open(`/admin/receipts/${item.feeId}`, '_blank')}
                                                        >
                                                            <FileText size={14} className="mr-1" /> Receipt
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="py-20 text-center text-slate-400">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <History size={32} />
                                    </div>
                                    <p className="font-medium italic text-sm tracking-tight opacity-60">No collection history found.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeTab === "balances" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {collectors.map(collector => (
                            <Card key={collector._id} className="relative overflow-hidden group border-slate-100 hover:border-premium-blue/30 transition-all hover:shadow-xl hover:shadow-premium-blue/5">
                                <div className={cn(
                                    "absolute top-0 right-0 p-4",
                                    collector.accountType === "Bank" ? "text-emerald-100" : "text-premium-blue/5"
                                )}>
                                    {collector.accountType === "Bank" ? <Building2 size={64} /> : <User size={64} />}
                                </div>
                                <div className="p-6 relative z-10 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                                            collector.accountType === "Bank" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-premium-blue/5 text-premium-blue border border-premium-blue/10"
                                        )}>
                                            {collector.accountType === "Bank" ? <Building2 size={20} /> : <User size={20} />}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800 tracking-tight">{collector.name}</h3>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{collector.accountType}</p>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Cash on Hand / Balance</p>
                                        <h2 className={cn(
                                            "text-3xl font-black tracking-tighter",
                                            collector.currentBalance > 0 ? "text-emerald-600" : "text-slate-300"
                                        )}>₹{(collector.currentBalance || 0).toLocaleString()}</h2>
                                    </div>

                                    {collector.accountType === "Person" && collector.currentBalance > 0 && (
                                        <Button 
                                            variant="primary" 
                                            size="sm" 
                                            fullWidth 
                                            onClick={() => {
                                                setTransferData({ ...transferData, fromCollectorId: collector._id, amount: collector.currentBalance });
                                                setIsTransferModalOpen(true);
                                            }}
                                            className="rounded-xl shadow-md"
                                        >
                                            <ArrowUpRight size={16} className="mr-1" /> Transfer Funds
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {activeTab === "transfers" && (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center gap-4 text-slate-400 font-medium italic">
                                <Loader2 className="animate-spin text-premium-blue" size={40} />
                                Loading transfers...
                            </div>
                        ) : transfers.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">From (Person)</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                                                <ArrowRightLeft size={12} className="inline mx-auto" />
                                            </th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">To (Bank)</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Amount</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Recorder</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {transfers.map((item) => (
                                            <tr key={item._id} className="hover:bg-slate-50/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-bold text-slate-900">{format(new Date(item.transferDate), "dd MMM yyyy")}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold">{item.referenceNumber || 'Internal'}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-lg bg-premium-blue/5 text-premium-blue flex items-center justify-center">
                                                            <User size={12} />
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-700">{item.fromCollector?.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <ArrowRightLeft size={14} className="text-slate-300 inline" />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                            <Building2 size={12} />
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-700">{item.toCollector?.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-lg font-black text-slate-900">₹{item.amount.toLocaleString()}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <p className="text-sm font-bold text-slate-700">{item.recordedBy?.profile?.firstName} {item.recordedBy?.profile?.lastName}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Recorded By</p>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-20 text-center text-slate-400">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ArrowRightLeft size={32} />
                                </div>
                                <p className="font-medium italic text-sm tracking-tight opacity-60">No transfer history recorded yet.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Transfer Modal */}
            <Modal
                title="Record Fund Transfer"
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
            >
                <form onSubmit={handleRecordTransfer} className="space-y-5">
                    <div className="p-4 bg-premium-blue/5 rounded-2xl border border-premium-blue/10 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-premium-blue text-white flex items-center justify-center shadow-lg shadow-premium-blue/20">
                                <ArrowRightLeft size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-800 tracking-tight">Internal Fund Transfer</h4>
                                <p className="text-[11px] text-slate-500 font-medium tracking-tight">Record fund movements between staff and accounts.</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Select
                            label="From (Source)"
                            value={transferData.fromCollectorId}
                            onChange={(val) => setTransferData({ ...transferData, fromCollectorId: val })}
                            options={collectors.map(c => ({
                                label: `${c.name} [${c.accountType}] (Balance: ₹${c.currentBalance?.toLocaleString()})`,
                                value: c._id
                            }))}
                            placeholder="Select Source Collector"
                        />

                        <Select
                            label="To (Destination)"
                            value={transferData.toCollectorId}
                            onChange={(val) => setTransferData({ ...transferData, toCollectorId: val })}
                            options={collectors
                                .filter(c => c._id !== transferData.fromCollectorId)
                                .map(c => ({
                                    label: `${c.name} [${c.accountType}] (Balance: ₹${c.currentBalance?.toLocaleString()})`,
                                    value: c._id
                                }))}
                            placeholder="Select Destination Account"
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Amount (₹)"
                                type="number"
                                required
                                value={transferData.amount}
                                onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                                placeholder="0.00"
                            />
                            <Input
                                label="Transfer Date"
                                type="date"
                                required
                                value={transferData.transferDate}
                                onChange={(e) => setTransferData({ ...transferData, transferDate: e.target.value })}
                            />
                        </div>

                        <Input
                            label="Reference Number"
                            value={transferData.referenceNumber}
                            onChange={(e) => setTransferData({ ...transferData, referenceNumber: e.target.value })}
                            placeholder="Transaction ID / Receipt No"
                        />

                        <Input
                            label="Notes (Optional)"
                            value={transferData.notes}
                            onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                            placeholder="Reason or additional info"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-6">
                        <Button type="button" variant="ghost" onClick={() => setIsTransferModalOpen(false)}>Cancel</Button>
                        <Button 
                            type="submit" 
                            className="bg-premium-blue text-white hover:bg-premium-blue/90"
                            disabled={isSubmittingTransfer || !transferData.fromCollectorId || !transferData.toCollectorId || !transferData.amount}
                        >
                            {isSubmittingTransfer ? <Loader2 className="animate-spin mr-2" size={18} /> : <CheckCircle2 className="mr-2" size={18} />}
                            Record Transfer
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
