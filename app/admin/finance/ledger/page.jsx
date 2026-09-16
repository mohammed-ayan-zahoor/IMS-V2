"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Download,
    Printer,
    Search,
    RefreshCw,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

function getTodayIST() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function shiftDate(dateStr, days) {
    const d = new Date(`${dateStr}T12:00:00.000+05:30`);
    d.setDate(d.getDate() + days);
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

function formatTime(isoStr) {
    if (!isoStr) return "—";
    try {
        return new Intl.DateTimeFormat("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata",
        }).format(new Date(isoStr));
    } catch {
        return "—";
    }
}

export default function DayBookLedgerPage() {
    const router = useRouter();
    const toast = useToast();

    const [date, setDate] = useState(getTodayIST());
    const [selectedAccountId, setSelectedAccountId] = useState("");
    const [activeTab, setActiveTab] = useState("all"); // 'all' | 'inflow' | 'outflow' | 'transfers' | 'drawers'
    const [searchQuery, setSearchQuery] = useState("");

    const [ledger, setLedger] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchLedger = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (date) params.set("date", date);
            if (selectedAccountId) params.set("accountId", selectedAccountId);

            const res = await fetch(`/api/v1/finance/ledger?${params.toString()}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Error ${res.status}: Failed to load ledger`);
            }

            const data = await res.json();
            setLedger(data);
        } catch (err) {
            console.error("Ledger fetch failed:", err);
            toast.error(err.message || "Failed to load ledger data");
        } finally {
            setLoading(false);
        }
    }, [date, selectedAccountId, toast]);

    useEffect(() => {
        fetchLedger();
    }, [fetchLedger]);

    // Filter transactions based on tab and search query
    const filteredEntries = useMemo(() => {
        if (!ledger?.entries) return [];

        let list = ledger.entries;

        if (activeTab === "inflow") {
            list = list.filter((e) => e.direction === "IN" && e.type !== "TRANSFER_IN");
        } else if (activeTab === "outflow") {
            list = list.filter((e) => e.direction === "OUT" && e.type !== "TRANSFER_OUT");
        } else if (activeTab === "transfers") {
            list = list.filter((e) => e.category === "Inter-Account Transfer");
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(
                (e) =>
                    (e.party && e.party.toLowerCase().includes(q)) ||
                    (e.category && e.category.toLowerCase().includes(q)) ||
                    (e.account && e.account.toLowerCase().includes(q)) ||
                    (e.reference && e.reference.toLowerCase().includes(q)) ||
                    (e.notes && e.notes.toLowerCase().includes(q))
            );
        }

        return list;
    }, [ledger?.entries, activeTab, searchQuery]);

    // Counts for tabs
    const counts = useMemo(() => {
        const entries = ledger?.entries || [];
        return {
            all: entries.length,
            inflow: entries.filter((e) => e.direction === "IN" && e.type !== "TRANSFER_IN").length,
            outflow: entries.filter((e) => e.direction === "OUT" && e.type !== "TRANSFER_OUT").length,
            transfers: entries.filter((e) => e.category === "Inter-Account Transfer").length,
        };
    }, [ledger?.entries]);

    // Dynamic inflow subtext based on active institute features
    const inflowSubtext = useMemo(() => {
        if (!ledger?.summary) return "";
        const parts = [];
        parts.push(`Fees: ₹${(ledger.summary.feeTotal || 0).toLocaleString()}`);
        if (ledger.features?.transport) {
            parts.push(`Transport: ₹${(ledger.summary.transportTotal || 0).toLocaleString()}`);
        }
        if (ledger.features?.hostel) {
            parts.push(`Hostel: ₹${(ledger.summary.hostelTotal || 0).toLocaleString()}`);
        }
        parts.push(`Income: ₹${(ledger.summary.incomeTotal || 0).toLocaleString()}`);
        return parts.join(" • ");
    }, [ledger]);

    const handleExportExcel = () => {
        if (!ledger) return;

        try {
            const wb = XLSX.utils.book_new();

            // Summary Sheet
            const summaryData = [
                ["FINANCIAL DAY BOOK & LEDGER"],
                ["Date", ledger.date],
                ["Institute Type", ledger.instituteType || "General"],
                ["Mode", ledger.mode === "consolidated" ? "Consolidated (All Accounts)" : `Account: ${ledger.account?.name || ""}`],
                [],
                ["OPENING BALANCE", ledger.openingBalance || 0],
                ["TOTAL INFLOWS (RECEIPTS)", ledger.totalInflow || 0],
                ["TOTAL OUTFLOWS (PAYMENTS)", ledger.totalOutflow || 0],
                ["NET CHANGE", ledger.netChange || 0],
                ["CLOSING BALANCE", ledger.closingBalance || 0],
                [],
                ["COLLECTION BREAKDOWN"],
                ["Academic Fees", ledger.summary?.feeTotal || 0],
            ];

            if (ledger.features?.transport) {
                summaryData.push(["Transport Fees", ledger.summary?.transportTotal || 0]);
            }
            if (ledger.features?.hostel) {
                summaryData.push(["Hostel Fees", ledger.summary?.hostelTotal || 0]);
            }

            summaryData.push(
                ["General Income", ledger.summary?.incomeTotal || 0],
                ["Expenses", ledger.summary?.expenseTotal || 0],
                ["Inter-Account Transfers", ledger.summary?.transfersTotal || 0]
            );

            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

            // Transactions Sheet
            const rows = (ledger.entries || []).map((e, idx) => ({
                "Sl No": idx + 1,
                "Time": formatTime(e.timestamp),
                "Type": e.type,
                "Direction": e.direction === "IN" ? "Receipt (Credit)" : "Payment (Debit)",
                "Category": e.category,
                "Particulars": e.party,
                "Account / Drawer": e.account,
                "Method": e.paymentMethod,
                "Inflow (Cr)": e.direction === "IN" ? e.amount : 0,
                "Outflow (Dr)": e.direction === "OUT" ? e.amount : 0,
                "Reference": e.reference || "",
                "Notes": e.notes || "",
            }));
            const wsTransactions = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, wsTransactions, "Transactions");

            // Drawer Balances Sheet
            if (ledger.breakdownByAccount) {
                const drawerRows = Object.entries(ledger.breakdownByAccount).map(([accountName, netAmount]) => ({
                    "Account / Cash Drawer": accountName,
                    "Net Day Movement (₹)": netAmount,
                }));
                const wsDrawers = XLSX.utils.json_to_sheet(drawerRows);
                XLSX.utils.book_append_sheet(wb, wsDrawers, "Account Balances");
            }

            XLSX.writeFile(wb, `DayBook_${ledger.date}${selectedAccountId ? `_${selectedAccountId}` : ""}.xlsx`);
            toast.success("Day Book exported to Excel");
        } catch (err) {
            console.error("Excel export error:", err);
            toast.error("Failed to export Excel file");
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="w-full space-y-6 animate-fade-in pb-12">
            {/* Print-Only Header */}
            <div className="hidden print:block mb-4 border-b border-slate-300 pb-3">
                <h1 className="text-xl font-bold text-slate-900">Financial Day Book & Ledger</h1>
                <p className="text-xs text-slate-600">
                    Date: {ledger?.date} | Mode: {ledger?.mode === "consolidated" ? "All Accounts (Consolidated)" : `Account: ${ledger?.account?.name}`}
                </p>
            </div>

            {/* Top Bar: Title & Primary Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Day Book & Ledger</h1>
                    <p className="text-sm text-slate-500">
                        Complete daily audit of cash, bank collections, expenses, and drawer movements
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-slate-700">
                        <Printer size={15} />
                        Print Day Book
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5 text-slate-700">
                        <Download size={15} />
                        Export Excel
                    </Button>
                </div>
            </div>

            {/* Filter Bar (No heavy containers) */}
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100 print:hidden">
                {/* Date Controls */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDate((prev) => shiftDate(prev, -1))}
                        title="Previous Day"
                        className="p-2 h-9 w-9 text-slate-600 hover:text-slate-900"
                    >
                        <ChevronLeft size={16} />
                    </Button>

                    <div className="relative">
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-slate-400 transition-colors cursor-pointer"
                        />
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDate((prev) => shiftDate(prev, 1))}
                        title="Next Day"
                        className="p-2 h-9 w-9 text-slate-600 hover:text-slate-900"
                    >
                        <ChevronRight size={16} />
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDate(getTodayIST())}
                        className={cn(
                            "h-9 text-xs font-semibold px-2.5",
                            date === getTodayIST() ? "border-slate-400 text-slate-900" : "text-slate-500"
                        )}
                    >
                        Today
                    </Button>
                </div>

                {/* Account / Drawer Selector */}
                <div className="min-w-[220px]">
                    <Select
                        value={selectedAccountId}
                        onChange={(val) => setSelectedAccountId(val)}
                        placeholder="All Accounts (Consolidated)"
                        options={[
                            { label: "All Accounts (Consolidated)", value: "" },
                            ...(ledger?.accountsList || []).map((acc) => ({
                                label: `${acc.name} [${acc.accountType}]`,
                                value: acc.id,
                            })),
                        ]}
                    />
                </div>

                {/* Search Bar */}
                <div className="flex-1 min-w-[180px] relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search student, particulars, reference..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:border-slate-400 transition-colors text-slate-700"
                    />
                </div>

                {/* Refresh */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchLedger}
                    disabled={loading}
                    className="p-2 h-9 w-9 text-slate-500 hover:text-slate-800"
                    title="Refresh Ledger"
                >
                    <RefreshCw size={15} className={cn(loading && "animate-spin")} />
                </Button>
            </div>

            {/* Financial Summary Row (Containerless, flat typographic theme) */}
            {loading && !ledger ? (
                <div className="py-12 flex items-center justify-center text-slate-400 gap-2">
                    <RefreshCw size={18} className="animate-spin" />
                    <span className="text-sm font-medium">Computing Day Book balances...</span>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-4 border-y border-slate-200">
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Opening Balance
                            </span>
                            <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                                ₹{(ledger?.openingBalance || 0).toLocaleString()}
                            </p>
                            <span className="text-[11px] text-slate-400">At start of {ledger?.date}</span>
                        </div>

                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                                Day Inflows (Credits)
                            </span>
                            <p className="text-2xl font-black text-emerald-600 tracking-tight mt-0.5">
                                +₹{(ledger?.totalInflow || 0).toLocaleString()}
                            </p>
                            <span className="text-[11px] text-slate-400">
                                {inflowSubtext}
                            </span>
                        </div>

                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                                Day Outflows (Debits)
                            </span>
                            <p className="text-2xl font-black text-rose-600 tracking-tight mt-0.5">
                                -₹{(ledger?.totalOutflow || 0).toLocaleString()}
                            </p>
                            <span className="text-[11px] text-slate-400">
                                Expenses: ₹{(ledger?.summary?.expenseTotal || 0).toLocaleString()}
                            </span>
                        </div>

                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                                Closing Balance
                            </span>
                            <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                                ₹{(ledger?.closingBalance || 0).toLocaleString()}
                            </p>
                            <span className="text-[11px] text-slate-400">
                                Net: {ledger?.netChange >= 0 ? `+₹${(ledger?.netChange || 0).toLocaleString()}` : `-₹${Math.abs(ledger?.netChange || 0).toLocaleString()}`}
                            </span>
                        </div>
                    </div>

                    {/* Method Breakdown Strip */}
                    {ledger?.breakdownByMethod && Object.keys(ledger.breakdownByMethod).length > 0 && (
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 print:hidden">
                            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                                Payment Methods:
                            </span>
                            {Object.entries(ledger.breakdownByMethod).map(([method, amount]) => (
                                <span key={method} className="inline-flex items-center gap-1 font-medium">
                                    <span className="text-slate-500">{method}:</span>
                                    <span className={cn("font-bold", amount >= 0 ? "text-slate-800" : "text-rose-600")}>
                                        ₹{amount.toLocaleString()}
                                    </span>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Flat Tabs (Containerless) */}
                    <div className="flex items-center gap-1 border-b border-slate-200 print:hidden">
                        <button
                            onClick={() => setActiveTab("all")}
                            className={cn(
                                "py-2.5 px-3 text-sm font-bold border-b-2 -mb-px transition-colors",
                                activeTab === "all"
                                    ? "border-slate-900 text-slate-900"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                            )}
                        >
                            All Transactions ({counts.all})
                        </button>
                        <button
                            onClick={() => setActiveTab("inflow")}
                            className={cn(
                                "py-2.5 px-3 text-sm font-bold border-b-2 -mb-px transition-colors",
                                activeTab === "inflow"
                                    ? "border-emerald-600 text-emerald-600"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Inflows ({counts.inflow})
                        </button>
                        <button
                            onClick={() => setActiveTab("outflow")}
                            className={cn(
                                "py-2.5 px-3 text-sm font-bold border-b-2 -mb-px transition-colors",
                                activeTab === "outflow"
                                    ? "border-rose-600 text-rose-600"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Outflows ({counts.outflow})
                        </button>
                        <button
                            onClick={() => setActiveTab("transfers")}
                            className={cn(
                                "py-2.5 px-3 text-sm font-bold border-b-2 -mb-px transition-colors",
                                activeTab === "transfers"
                                    ? "border-slate-900 text-slate-900"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Transfers ({counts.transfers})
                        </button>
                        <button
                            onClick={() => setActiveTab("drawers")}
                            className={cn(
                                "py-2.5 px-3 text-sm font-bold border-b-2 -mb-px transition-colors",
                                activeTab === "drawers"
                                    ? "border-slate-900 text-slate-900"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Drawer Balances
                        </button>
                    </div>

                    {/* Tab 1-4: Transactions Table */}
                    {activeTab !== "drawers" ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        <th className="py-2.5 px-2">Time</th>
                                        <th className="py-2.5 px-2">Category</th>
                                        <th className="py-2.5 px-2">Particulars (Student / Payee / Note)</th>
                                        <th className="py-2.5 px-2">Account / Drawer</th>
                                        <th className="py-2.5 px-2">Method</th>
                                        <th className="py-2.5 px-2 text-right">Inflow (Cr)</th>
                                        <th className="py-2.5 px-2 text-right">Outflow (Dr)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {filteredEntries.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                                                No transactions found for this day and filter criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredEntries.map((e) => {
                                            const isInflow = e.direction === "IN";
                                            const isTransfer = e.category === "Inter-Account Transfer";

                                            return (
                                                <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                                                    {/* Time */}
                                                    <td className="py-3 px-2 text-xs font-mono text-slate-500 whitespace-nowrap">
                                                        {formatTime(e.timestamp)}
                                                    </td>

                                                    {/* Category */}
                                                    <td className="py-3 px-2 whitespace-nowrap">
                                                        <span
                                                            className={cn(
                                                                "text-xs font-bold",
                                                                e.type === "FEE" && "text-blue-700",
                                                                e.type === "INCOME" && "text-emerald-700",
                                                                e.type === "EXPENSE" && "text-rose-700",
                                                                isTransfer && "text-indigo-700"
                                                            )}
                                                        >
                                                            {e.category}
                                                        </span>
                                                    </td>

                                                    {/* Particulars */}
                                                    <td className="py-3 px-2">
                                                        <div className="font-semibold text-slate-800 text-sm">
                                                            {e.party}
                                                        </div>
                                                        {(e.reference || e.notes) && (
                                                            <div className="text-xs text-slate-400 mt-0.5">
                                                                {e.reference && <span>Ref: {e.reference}</span>}
                                                                {e.reference && e.notes && <span> • </span>}
                                                                {e.notes && <span>{e.notes}</span>}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Account / Drawer */}
                                                    <td className="py-3 px-2 text-xs font-medium text-slate-600 whitespace-nowrap">
                                                        {e.account}
                                                    </td>

                                                    {/* Payment Method */}
                                                    <td className="py-3 px-2 text-xs text-slate-500 whitespace-nowrap font-medium">
                                                        {e.paymentMethod}
                                                    </td>

                                                    {/* Inflow */}
                                                    <td className="py-3 px-2 text-right whitespace-nowrap font-bold text-sm text-emerald-600">
                                                        {isInflow ? `+₹${e.amount.toLocaleString()}` : "—"}
                                                    </td>

                                                    {/* Outflow */}
                                                    <td className="py-3 px-2 text-right whitespace-nowrap font-bold text-sm text-rose-600">
                                                        {!isInflow ? `-₹${e.amount.toLocaleString()}` : "—"}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* Tab 5: Drawer Balances (Containerless list) */
                        <div className="space-y-4 pt-2">
                            <p className="text-xs text-slate-500">
                                Net movement recorded across registered cash drawers and accounts on this day:
                            </p>
                            <div className="divide-y divide-slate-100">
                                {Object.entries(ledger?.breakdownByAccount || {}).map(([accountName, netAmount]) => (
                                    <div key={accountName} className="py-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{accountName}</p>
                                            <span className="text-xs text-slate-400">
                                                {accountName.includes("Unassigned")
                                                    ? "Payments not assigned to a registered account"
                                                    : "Registered Cashier / Bank Account"}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <p
                                                className={cn(
                                                    "text-base font-black tracking-tight",
                                                    netAmount >= 0 ? "text-emerald-600" : "text-rose-600"
                                                )}
                                            >
                                                {netAmount >= 0 ? `+₹${netAmount.toLocaleString()}` : `-₹${Math.abs(netAmount).toLocaleString()}`}
                                            </p>
                                            <span className="text-[11px] text-slate-400">Day Movement</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Print Sign-off Block */}
                    <div className="hidden print:grid grid-cols-2 gap-12 pt-16 mt-12 border-t border-slate-300 text-xs text-slate-700">
                        <div>
                            <div className="border-b border-slate-400 pb-1 mb-1 font-semibold">Cashier / Accountant Signature</div>
                            <p className="text-[10px] text-slate-500">I verify that the cash and bank movements recorded above match the physical drawer balance.</p>
                        </div>
                        <div>
                            <div className="border-b border-slate-400 pb-1 mb-1 font-semibold">Principal / Authorized Signatory</div>
                            <p className="text-[10px] text-slate-500">Approved and reconciled on {ledger?.date}.</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
