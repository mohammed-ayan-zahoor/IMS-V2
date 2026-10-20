"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { 
    format, 
    subDays, 
    startOfMonth, 
    endOfMonth, 
    subMonths, 
    startOfQuarter, 
    startOfYear, 
    parseISO, 
    isValid 
} from "date-fns";
import { 
    Calendar as CalendarIcon, 
    Search, 
    Download, 
    ArrowLeft, 
    Lightbulb, 
    CreditCard, 
    Banknote, 
    Landmark, 
    Smartphone, 
    Receipt, 
    ChevronDown, 
    Check, 
    X, 
    RefreshCw, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown, 
    Layers, 
    Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReceiptViewerModal from "@/components/finance/ReceiptViewerModal";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { SPRING } from "@/lib/apple-motion";
import { cn } from "@/lib/utils";

// Standard preset options for accounting date scopes
const DATE_PRESETS = [
    { id: "this_month", label: "This Month" },
    { id: "last_month", label: "Last Month" },
    { id: "last_30_days", label: "Last 30 Days" },
    { id: "this_quarter", label: "This Quarter" },
    { id: "this_year", label: "This Year" },
    { id: "custom", label: "Custom Range" }
];

export default function IncomeReportPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const toast = useToast();
    const confirm = useConfirm();

    // Default dates: start of current month to today
    const defaultFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const defaultTo = format(new Date(), "yyyy-MM-dd");

    // URL Param Initializers
    const initialFrom = searchParams.get("from") || defaultFrom;
    const initialTo = searchParams.get("to") || defaultTo;
    const initialHead = searchParams.get("head") || "";
    const initialPreset = searchParams.get("preset") || "this_month";

    // Filter States
    const [selectedPreset, setSelectedPreset] = useState(initialPreset);
    const [fromDate, setFromDate] = useState(initialFrom);
    const [toDate, setToDate] = useState(initialTo);
    const [selectedHead, setSelectedHead] = useState(initialHead);
    const [searchQuery, setSearchQuery] = useState("");

    // Popover Toggle States
    const [datePopoverOpen, setDatePopoverOpen] = useState(false);
    const [headPopoverOpen, setHeadPopoverOpen] = useState(false);
    const [headSearch, setHeadSearch] = useState("");

    // Sorting State
    const [sortKey, setSortKey] = useState("date"); // date | amount
    const [sortDir, setSortDir] = useState("desc");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 15;

    // Data States
    const [incomeHeads, setIncomeHeads] = useState([]);
    const [incomes, setIncomes] = useState([]);
    const [summary, setSummary] = useState({ totalAmount: 0, totalCount: 0, categoryWise: {} });
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Modal State
    const [viewerModal, setViewerModal] = useState({ isOpen: false, attachments: [], title: "" });

    const searchInputRef = useRef(null);
    const abortControllerRef = useRef(null);

    // Sync Filter State to URL
    useEffect(() => {
        const params = new URLSearchParams();
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);
        if (selectedHead) params.set("head", selectedHead);
        if (selectedPreset && selectedPreset !== "this_month") params.set("preset", selectedPreset);

        const newQuery = params.toString();
        const currentQuery = searchParams.toString();
        if (newQuery !== currentQuery) {
            router.replace(`${pathname}${newQuery ? `?${newQuery}` : ""}`, { scroll: false });
        }
    }, [fromDate, toDate, selectedHead, selectedPreset, pathname, router, searchParams]);

    // Keyboard Shortcuts: "/" for search, "Escape" to dismiss popovers
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.key === "Escape") {
                setDatePopoverOpen(false);
                setHeadPopoverOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Apply preset date calculations
    const applyPreset = useCallback((presetId) => {
        setSelectedPreset(presetId);
        const today = new Date();

        switch (presetId) {
            case "this_month":
                setFromDate(format(startOfMonth(today), "yyyy-MM-dd"));
                setToDate(format(today, "yyyy-MM-dd"));
                break;
            case "last_month": {
                const prev = subMonths(today, 1);
                setFromDate(format(startOfMonth(prev), "yyyy-MM-dd"));
                setToDate(format(endOfMonth(prev), "yyyy-MM-dd"));
                break;
            }
            case "last_30_days":
                setFromDate(format(subDays(today, 30), "yyyy-MM-dd"));
                setToDate(format(today, "yyyy-MM-dd"));
                break;
            case "this_quarter":
                setFromDate(format(startOfQuarter(today), "yyyy-MM-dd"));
                setToDate(format(today, "yyyy-MM-dd"));
                break;
            case "this_year":
                setFromDate(format(startOfYear(today), "yyyy-MM-dd"));
                setToDate(format(today, "yyyy-MM-dd"));
                break;
            case "custom":
                break;
            default:
                break;
        }
    }, []);

    // Fetch Income Heads on mount
    useEffect(() => {
        const controller = new AbortController();
        const fetchHeads = async () => {
            try {
                const res = await fetch("/api/v1/income-heads", { signal: controller.signal });
                const data = await res.json();
                if (controller.signal.aborted) return;
                setIncomeHeads(data.incomeHeads || []);
            } catch (err) {
                if (err.name !== "AbortError") {
                    console.error("Failed to load categories:", err);
                }
            }
        };
        fetchHeads();
        return () => controller.abort();
    }, []);

    // Fetch Incomes whenever date range or category changes
    const loadIncomes = useCallback(async (isManualRefresh = false) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        if (isManualRefresh) setIsRefreshing(true);
        else setLoading(true);

        try {
            const params = new URLSearchParams();
            if (fromDate) params.append("fromDate", fromDate);
            if (toDate) params.append("toDate", toDate);
            if (selectedHead) params.append("incomeHead", selectedHead);

            const res = await fetch(`/api/v1/incomes?${params.toString()}`, { signal: controller.signal });
            const data = await res.json();

            if (controller.signal.aborted) return;

            if (res.ok) {
                setIncomes(data.incomes || []);
                setSummary(data.summary || { totalAmount: 0, totalCount: 0, categoryWise: {} });
                setCurrentPage(1);
            } else {
                toast.error(data.error || "Failed to load incomes");
            }
        } catch (err) {
            if (err.name !== "AbortError") {
                toast.error("Failed to load incomes");
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
                setIsRefreshing(false);
            }
        }
    }, [fromDate, toDate, selectedHead, toast]);

    useEffect(() => {
        loadIncomes();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [loadIncomes]);

    const handleDelete = async (id, category, amount) => {
        if (await confirm({
            title: "Delete Income Entry?",
            message: `Are you sure you want to delete this income of ${formatCurrency(amount)} under "${category}"? This action cannot be undone.`,
            type: "danger"
        })) {
            try {
                const res = await fetch(`/api/v1/incomes/${id}`, { method: "DELETE" });
                if (res.ok) {
                    toast.success("Income record deleted successfully");
                    loadIncomes(true);
                } else {
                    const data = await res.json();
                    toast.error(data.error || "Failed to delete record");
                }
            } catch (error) {
                toast.error("Error deleting record");
            }
        }
    };

    // Formatters
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const d = new Date(dateString);
        return isValid(d) ? format(d, "dd MMM yyyy") : "-";
    };

    // Client-side text search & sorting
    const filteredIncomes = useMemo(() => {
        let list = [...incomes];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(e => {
                const desc = (e.description || "").toLowerCase();
                const from = (e.receivedFrom || "").toLowerCase();
                const category = (e.incomeHead?.name || "").toLowerCase();
                const account = (e.receivedInAccount?.name || "").toLowerCase();
                const mode = (e.paymentMode || "").toLowerCase();
                const amount = String(e.amount || "");
                return desc.includes(q) || from.includes(q) || category.includes(q) || account.includes(q) || mode.includes(q) || amount.includes(q);
            });
        }

        list.sort((a, b) => {
            if (sortKey === "date") {
                const dateA = new Date(a.date).getTime() || 0;
                const dateB = new Date(b.date).getTime() || 0;
                return sortDir === "asc" ? dateA - dateB : dateB - dateA;
            }
            if (sortKey === "amount") {
                const amtA = a.amount || 0;
                const amtB = b.amount || 0;
                return sortDir === "asc" ? amtA - amtB : amtB - amtA;
            }
            return 0;
        });

        return list;
    }, [incomes, searchQuery, sortKey, sortDir]);

    // Pagination
    const totalPages = Math.ceil(filteredIncomes.length / rowsPerPage) || 1;
    const paginatedIncomes = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return filteredIncomes.slice(start, start + rowsPerPage);
    }, [filteredIncomes, currentPage, rowsPerPage]);

    // CSV Export
    const handleExportCSV = () => {
        if (!filteredIncomes.length) {
            toast.error("No incomes to export");
            return;
        }

        const headers = ["Date", "Category", "Description", "Received From", "Payment Mode", "Account", "Receipts", "Amount"];
        const rows = [headers.join(",")];

        filteredIncomes.forEach(e => {
            const row = [
                formatDate(e.date).replace(/,/g, ""),
                `"${(e.incomeHead?.name || "Uncategorized").replace(/"/g, '""')}"`,
                `"${(e.description || "").replace(/"/g, '""')}"`,
                `"${(e.receivedFrom || "").replace(/"/g, '""')}"`,
                `"${(e.paymentMode || "").replace(/"/g, '""')}"`,
                `"${(e.receivedInAccount?.name || "").replace(/"/g, '""')}"`,
                e.attachments?.length || 0,
                e.amount || 0
            ];
            rows.push(row.join(","));
        });

        const totalFiltered = filteredIncomes.reduce((sum, e) => sum + (e.amount || 0), 0);
        rows.push(`"TOTAL",,,,,,,${totalFiltered}`);

        const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Income_Report_${fromDate}_to_${toDate}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`Exported ${filteredIncomes.length} income records`);
    };

    // Category Distribution helper
    const categoryEntries = useMemo(() => {
        return Object.entries(summary.categoryWise || {}).sort((a, b) => b[1] - a[1]);
    }, [summary.categoryWise]);

    // Active Category name
    const selectedCategoryName = useMemo(() => {
        if (!selectedHead) return "All Categories";
        return incomeHeads.find(h => h._id === selectedHead)?.name || "All Categories";
    }, [selectedHead, incomeHeads]);

    // Filtered categories in popover search
    const filteredIncomeHeads = useMemo(() => {
        if (!headSearch.trim()) return incomeHeads;
        return incomeHeads.filter(h => h.name.toLowerCase().includes(headSearch.toLowerCase().trim()));
    }, [incomeHeads, headSearch]);

    // Format human-friendly active date display
    const dateRangeLabel = useMemo(() => {
        if (!fromDate || !toDate) return "Select dates";
        const f = parseISO(fromDate);
        const t = parseISO(toDate);
        if (!isValid(f) || !isValid(t)) return "Select dates";

        const presetMatch = DATE_PRESETS.find(p => p.id === selectedPreset);
        const presetName = (presetMatch && selectedPreset !== "custom") ? presetMatch.label : "Custom";
        return `${presetName} (${format(f, "MMM d")} – ${format(t, "MMM d, yyyy")})`;
    }, [fromDate, toDate, selectedPreset]);

    const hasActiveFilters = Boolean(
        selectedPreset !== "this_month" ||
        selectedHead !== "" ||
        searchQuery.trim() !== ""
    );

    const handleResetFilters = () => {
        applyPreset("this_month");
        setSelectedHead("");
        setSearchQuery("");
        setCurrentPage(1);
    };

    const toggleSort = (key) => {
        if (sortKey === key) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
    };

    return (
        <div className="w-full space-y-6">
            {/* ── 1. Page Header with Canonical Breadcrumbs & Instant Refresh ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95 transition-all duration-150 cursor-pointer"
                        title="Back"
                        aria-label="Back"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                            <span>Incomes</span>
                            <span>›</span>
                            <span className="text-slate-700 font-semibold">Income Report</span>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                            Income Overview
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                        onClick={() => loadIncomes(true)}
                        disabled={isRefreshing}
                        className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:scale-[0.97] transition-all duration-120 cursor-pointer"
                        title="Refresh data"
                    >
                        <RefreshCw size={13} className={cn("text-slate-500", isRefreshing && "animate-spin text-blue-600")} />
                        <span>Refresh</span>
                    </button>
                    <button
                        onClick={handleExportCSV}
                        disabled={filteredIncomes.length === 0}
                        className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:scale-[0.97] transition-all duration-120 cursor-pointer"
                    >
                        <Download size={13} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* ── 2. Unified Single-Row 32px Filter Bar ── */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* Date Scope Popover */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setDatePopoverOpen(!datePopoverOpen);
                            setHeadPopoverOpen(false);
                        }}
                        className={cn(
                            "h-8 px-3 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all duration-120 active:scale-[0.98] cursor-pointer shadow-2xs",
                            datePopoverOpen 
                                ? "bg-blue-50 border-blue-400 text-blue-700 ring-2 ring-blue-100" 
                                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/80"
                        )}
                    >
                        <CalendarIcon size={14} className={datePopoverOpen ? "text-blue-600" : "text-slate-500"} />
                        <span>{dateRangeLabel}</span>
                        <ChevronDown size={13} className={cn("text-slate-400 transition-transform duration-150", datePopoverOpen && "rotate-180 text-blue-600")} />
                    </button>

                    <AnimatePresence>
                        {datePopoverOpen && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setDatePopoverOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                                    transition={SPRING.ui}
                                    className="absolute left-0 top-full mt-1.5 w-76 bg-white rounded-xl border border-slate-200 shadow-xl z-40 p-3 space-y-3"
                                >
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Quick Presets</p>
                                        <div className="grid grid-cols-2 gap-1">
                                            {DATE_PRESETS.map((preset) => {
                                                const isActive = selectedPreset === preset.id;
                                                return (
                                                    <button
                                                        key={preset.id}
                                                        onClick={() => {
                                                            applyPreset(preset.id);
                                                            if (preset.id !== "custom") setDatePopoverOpen(false);
                                                        }}
                                                        className={cn(
                                                            "px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors flex items-center justify-between cursor-pointer",
                                                            isActive 
                                                                ? "bg-blue-50 text-blue-700 font-bold" 
                                                                : "text-slate-600 hover:bg-slate-100/80"
                                                        )}
                                                    >
                                                        <span>{preset.label}</span>
                                                        {isActive && <Check size={12} className="text-blue-600" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Custom Range Inputs */}
                                    <div className="pt-2 border-t border-slate-100 space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Custom Range</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] font-medium text-slate-500 mb-0.5 block">From</label>
                                                <input
                                                    type="date"
                                                    value={fromDate}
                                                    onChange={(e) => {
                                                        setFromDate(e.target.value);
                                                        setSelectedPreset("custom");
                                                    }}
                                                    className="w-full h-7 px-2 text-xs border border-slate-200 rounded-md text-slate-700 bg-slate-50 focus:bg-white focus:border-blue-400 focus:outline-hidden"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-medium text-slate-500 mb-0.5 block">To</label>
                                                <input
                                                    type="date"
                                                    value={toDate}
                                                    onChange={(e) => {
                                                        setToDate(e.target.value);
                                                        setSelectedPreset("custom");
                                                    }}
                                                    className="w-full h-7 px-2 text-xs border border-slate-200 rounded-md text-slate-700 bg-slate-50 focus:bg-white focus:border-blue-400 focus:outline-hidden"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setDatePopoverOpen(false)}
                                            className="w-full h-7 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold cursor-pointer active:scale-[0.98] transition-all"
                                        >
                                            Apply Date Range
                                        </button>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                {/* Category Popover */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setHeadPopoverOpen(!headPopoverOpen);
                            setDatePopoverOpen(false);
                        }}
                        className={cn(
                            "h-8 px-3 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all duration-120 active:scale-[0.98] cursor-pointer shadow-2xs",
                            selectedHead 
                                ? "bg-purple-50 border-purple-300 text-purple-800" 
                                : headPopoverOpen 
                                    ? "bg-slate-100 border-slate-300 text-slate-900" 
                                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/80"
                        )}
                    >
                        <Layers size={13} className={selectedHead ? "text-purple-600" : "text-slate-500"} />
                        <span>Category: <span className="font-bold">{selectedCategoryName}</span></span>
                        <ChevronDown size={13} className={cn("text-slate-400 transition-transform duration-150", headPopoverOpen && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                        {headPopoverOpen && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setHeadPopoverOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                                    transition={SPRING.ui}
                                    className="absolute left-0 top-full mt-1.5 w-68 bg-white rounded-xl border border-slate-200 shadow-xl z-40 p-2 space-y-1.5"
                                >
                                    <div className="relative px-1 pt-1">
                                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={headSearch}
                                            onChange={(e) => setHeadSearch(e.target.value)}
                                            placeholder="Filter categories..."
                                            className="w-full h-7 pl-7 pr-2 text-xs border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 bg-slate-50 focus:bg-white focus:border-blue-400 focus:outline-hidden"
                                        />
                                    </div>
                                    <div className="max-h-56 overflow-y-auto pt-1 space-y-0.5">
                                        <button
                                            onClick={() => {
                                                setSelectedHead("");
                                                setHeadPopoverOpen(false);
                                            }}
                                            className={cn(
                                                "w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-left flex items-center justify-between cursor-pointer transition-colors",
                                                selectedHead === "" ? "bg-purple-50 text-purple-800 font-bold" : "text-slate-600 hover:bg-slate-100"
                                            )}
                                        >
                                            <span>All Categories</span>
                                            {selectedHead === "" && <Check size={12} className="text-purple-600" />}
                                        </button>
                                        {filteredIncomeHeads.map((head) => {
                                            const isSelected = selectedHead === head._id;
                                            return (
                                                <button
                                                    key={head._id}
                                                    onClick={() => {
                                                        setSelectedHead(head._id);
                                                        setHeadPopoverOpen(false);
                                                    }}
                                                    className={cn(
                                                        "w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-left flex items-center justify-between cursor-pointer transition-colors",
                                                        isSelected ? "bg-purple-50 text-purple-800 font-bold" : "text-slate-600 hover:bg-slate-100"
                                                    )}
                                                >
                                                    <span className="truncate">{head.name}</span>
                                                    {isSelected && <Check size={12} className="text-purple-600 shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                {/* Instant Search Bar with "/" hint */}
                <div className="relative min-w-[200px] flex-1 max-w-xs">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        placeholder="Search payer, notes... (/)"
                        className="w-full h-8 pl-8 pr-7 text-xs border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 bg-white hover:border-slate-300 focus:bg-white focus:border-blue-400 focus:outline-hidden transition-all shadow-2xs"
                    />
                    {searchQuery ? (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                            <X size={12} />
                        </button>
                    ) : (
                        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 border border-slate-200 bg-slate-50 px-1 py-0.2 rounded pointer-events-none">
                            /
                        </kbd>
                    )}
                </div>

                {/* Reset Filters Shortcut */}
                {hasActiveFilters && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={SPRING.ui}
                        onClick={handleResetFilters}
                        className="h-8 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1 active:scale-[0.97] transition-all cursor-pointer"
                        title="Reset all filters"
                    >
                        <X size={12} />
                        <span>Reset</span>
                    </motion.button>
                )}
            </div>

            {/* ── 3. High-Contrast Stat Cards (Without Icon Containers) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Income Card */}
                <div className="rounded-xl border border-emerald-300 bg-emerald-100/70 p-4 transition-all duration-150 shadow-xs">
                    <span className="text-[11px] font-bold tracking-wider text-emerald-950 uppercase block mb-2">Total Income</span>
                    <div className="flex flex-col gap-0.5">
                        {loading ? (
                            <div className="h-7 w-28 bg-emerald-200/60 animate-pulse rounded mt-1" />
                        ) : (
                            <h2 className="text-[26px] font-bold text-emerald-950 leading-none tracking-tight font-mono tabular-nums">
                                {formatCurrency(summary.totalAmount)}
                            </h2>
                        )}
                        <p className="text-[11px] font-semibold text-emerald-800 mt-1.5 flex items-center gap-1">
                            <span>{summary.totalCount || 0}</span>
                            <span className="text-emerald-700/80 font-medium">recorded receipts</span>
                        </p>
                    </div>
                </div>

                {/* Categories Count Card */}
                <div className="rounded-xl border border-purple-300 bg-purple-100/70 p-4 transition-all duration-150 shadow-xs">
                    <span className="text-[11px] font-bold tracking-wider text-purple-900 uppercase block mb-2">Active Categories</span>
                    <div className="flex flex-col gap-0.5">
                        {loading ? (
                            <div className="h-7 w-16 bg-purple-200/60 animate-pulse rounded mt-1" />
                        ) : (
                            <h2 className="text-[26px] font-bold text-purple-950 leading-none tracking-tight font-mono tabular-nums">
                                {categoryEntries.length}
                            </h2>
                        )}
                        <p className="text-[11px] font-semibold text-purple-800 mt-1.5 flex items-center gap-1">
                            <span>{incomeHeads.length}</span>
                            <span className="text-purple-700/80 font-medium">total heads configured</span>
                        </p>
                    </div>
                </div>

                {/* Average Revenue Card */}
                <div className="rounded-xl border border-blue-300 bg-blue-100/70 p-4 transition-all duration-150 shadow-xs">
                    <span className="text-[11px] font-bold tracking-wider text-blue-900 uppercase block mb-2">Average / Entry</span>
                    <div className="flex flex-col gap-0.5">
                        {loading ? (
                            <div className="h-7 w-24 bg-blue-200/60 animate-pulse rounded mt-1" />
                        ) : (
                            <h2 className="text-[26px] font-bold text-blue-950 leading-none tracking-tight font-mono tabular-nums">
                                {formatCurrency(summary.totalCount > 0 ? Math.round(summary.totalAmount / summary.totalCount) : 0)}
                            </h2>
                        )}
                        <p className="text-[11px] font-semibold text-blue-800 mt-1.5 flex items-center gap-1">
                            <span className="text-blue-700/80 font-medium">calculated per revenue log</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* ── 4. Category Breakdown & Smart Insights Section (when populated) ── */}
            {categoryEntries.length > 0 && summary.totalAmount > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Category Distribution Bars */}
                    <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3.5">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Category Distribution</h3>
                            <span className="text-[11px] text-slate-400 font-medium">{categoryEntries.length} categories with revenue</span>
                        </div>
                        <div className="space-y-3 pt-1">
                            {categoryEntries.map(([category, amount]) => {
                                const percentage = Math.round((amount / summary.totalAmount) * 100) || 0;
                                return (
                                    <div key={category} className="space-y-1">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-semibold text-slate-800">{category}</span>
                                            <div className="flex items-center gap-2 font-mono tabular-nums">
                                                <span className="font-bold text-slate-900">{formatCurrency(amount)}</span>
                                                <span className="text-[11px] text-slate-400 w-9 text-right font-semibold">{percentage}%</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                            <motion.div
                                                initial={{ scaleX: 0 }}
                                                animate={{ scaleX: 1 }}
                                                transition={SPRING.ui}
                                                style={{ width: `${percentage}%`, transformOrigin: "left" }}
                                                className="bg-emerald-600 h-2 rounded-full"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Smart Insight Callout Card */}
                    <div className="lg:col-span-4 bg-emerald-100/60 border border-emerald-300 rounded-xl p-5 shadow-xs space-y-3">
                        <div className="flex items-center gap-2 text-emerald-950">
                            <Lightbulb size={16} className="text-emerald-700 shrink-0" />
                            <span className="text-xs font-bold uppercase tracking-wider">Revenue Insight</span>
                        </div>
                        <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                            {categoryEntries.length === 1 ? (
                                <>All recorded income for this period comes from <span className="font-bold text-emerald-900">{categoryEntries[0][0]}</span>.</>
                            ) : (
                                <>
                                    Your top revenue stream is <span className="font-bold text-emerald-900">{categoryEntries[0][0]}</span>, representing{" "}
                                    <span className="font-bold text-emerald-900">{Math.round((categoryEntries[0][1] / summary.totalAmount) * 100)}%</span> of total incoming funds ({formatCurrency(categoryEntries[0][1])}).
                                </>
                            )}
                        </p>
                    </div>
                </div>
            )}

            {/* ── 5. Records Table Section with Fluid Apple Design ── */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                {/* Table Header Bar */}
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Income Records</span>
                        <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-mono tabular-nums">
                            {filteredIncomes.length} entries
                        </span>
                    </div>
                    {filteredIncomes.length > 0 && (
                        <div className="text-xs font-semibold text-slate-500">
                            Subtotal: <span className="font-bold text-slate-900 font-mono tabular-nums">{formatCurrency(filteredIncomes.reduce((s, e) => s + (e.amount || 0), 0))}</span>
                        </div>
                    )}
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-500">
                                <th className="px-4 py-3">
                                    <button
                                        onClick={() => toggleSort("date")}
                                        className="flex items-center gap-1 hover:text-slate-800 cursor-pointer select-none font-bold"
                                    >
                                        <span>Date</span>
                                        {sortKey === "date" ? (
                                            sortDir === "asc" ? <ArrowUp size={12} className="text-blue-600" /> : <ArrowDown size={12} className="text-blue-600" />
                                        ) : (
                                            <ArrowUpDown size={11} className="text-slate-300" />
                                        )}
                                    </button>
                                </th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3">Description</th>
                                <th className="px-4 py-3">Received from</th>
                                <th className="px-4 py-3">Destination / Mode</th>
                                <th className="px-4 py-3 text-center">Receipts</th>
                                <th className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => toggleSort("amount")}
                                        className="inline-flex items-center gap-1 hover:text-slate-800 cursor-pointer select-none font-bold"
                                    >
                                        <span>Amount</span>
                                        {sortKey === "amount" ? (
                                            sortDir === "asc" ? <ArrowUp size={12} className="text-blue-600" /> : <ArrowDown size={12} className="text-blue-600" />
                                        ) : (
                                            <ArrowUpDown size={11} className="text-slate-300" />
                                        )}
                                    </button>
                                </th>
                                <th className="w-10 px-2 py-3 text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {loading ? (
                                // Anti-CLS Skeleton Rows
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-4 py-3.5"><div className="h-3.5 w-20 bg-slate-100 rounded" /></td>
                                        <td className="px-4 py-3.5"><div className="h-5 w-24 bg-slate-100 rounded-md" /></td>
                                        <td className="px-4 py-3.5"><div className="h-3.5 w-40 bg-slate-100 rounded" /></td>
                                        <td className="px-4 py-3.5"><div className="h-3.5 w-24 bg-slate-100 rounded" /></td>
                                        <td className="px-4 py-3.5"><div className="h-3.5 w-28 bg-slate-100 rounded" /></td>
                                        <td className="px-4 py-3.5 text-center"><div className="h-4 w-12 bg-slate-100 rounded mx-auto" /></td>
                                        <td className="px-4 py-3.5 text-right"><div className="h-3.5 w-16 bg-slate-100 rounded ml-auto" /></td>
                                        <td className="w-10 px-2 py-3.5"></td>
                                    </tr>
                                ))
                            ) : paginatedIncomes.length > 0 ? (
                                paginatedIncomes.map((income) => {
                                    const mode = income.paymentMode || "Cash";
                                    const ModeIcon = mode === "Bank Transfer" ? Landmark :
                                                     mode === "UPI" ? Smartphone :
                                                     mode === "Card" ? CreditCard : Banknote;

                                    return (
                                        <tr 
                                            key={income._id} 
                                            className="hover:bg-slate-50/80 transition-colors duration-100 group"
                                        >
                                            {/* Date */}
                                            <td className="px-4 py-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                                                {formatDate(income.date)}
                                            </td>

                                            {/* Category */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80 group-hover:border-emerald-200 group-hover:bg-emerald-50 group-hover:text-emerald-800 transition-colors">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-emerald-500" />
                                                    <span>{income.incomeHead?.name || "Uncategorized"}</span>
                                                </span>
                                            </td>

                                            {/* Description */}
                                            <td className="px-4 py-3 text-slate-600 max-w-[240px] truncate" title={income.description}>
                                                {income.description || <span className="text-slate-300 italic">No notes</span>}
                                            </td>

                                            {/* Received From */}
                                            <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                                                {income.receivedFrom || "—"}
                                            </td>

                                            {/* Destination & Mode */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800">{income.receivedInAccount?.name || "Main Account"}</span>
                                                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <ModeIcon size={12} className="text-slate-500" />
                                                        <span>{mode}</span>
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Receipts Preview Button */}
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                {income.attachments && income.attachments.length > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewerModal({
                                                            isOpen: true,
                                                            attachments: income.attachments,
                                                            title: `Receipts · ${income.incomeHead?.name || "Income"} (${formatCurrency(income.amount)})`
                                                        })}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold shadow-2xs active:scale-[0.96] transition-all cursor-pointer"
                                                        title="View receipts"
                                                    >
                                                        <Receipt size={12} />
                                                        <span>{income.attachments.length} {income.attachments.length === 1 ? "file" : "files"}</span>
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </td>

                                            {/* Amount */}
                                            <td className="px-4 py-3 text-right font-black font-mono tabular-nums text-slate-900 whitespace-nowrap group-hover:text-emerald-700 transition-colors">
                                                {formatCurrency(income.amount)}
                                            </td>

                                            {/* Quiet Delete Action */}
                                            <td className="w-10 px-2 py-3 text-right">
                                                <button
                                                    onClick={() => handleDelete(income._id, income.incomeHead?.name || "Income", income.amount)}
                                                    className="w-6 h-6 inline-flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                                    title="Delete Entry"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-4 py-16 text-center">
                                        <div className="max-w-sm mx-auto flex flex-col items-center gap-2">
                                            <Search size={28} className="text-slate-300 mb-1" />
                                            <h4 className="text-sm font-bold text-slate-800">No incomes found</h4>
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                {searchQuery 
                                                    ? `No incomes matched "${searchQuery}". Try adjusting your keywords.`
                                                    : "No income records found for the selected date range and category."}
                                            </p>
                                            {hasActiveFilters && (
                                                <button
                                                    onClick={handleResetFilters}
                                                    className="mt-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
                                                >
                                                    Reset all filters
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>

                        {/* Grand Total Footer */}
                        {filteredIncomes.length > 0 && !loading && (
                            <tfoot className="bg-slate-50/80 border-t border-slate-200">
                                <tr>
                                    <td colSpan={6} className="px-4 py-3 text-xs font-bold text-slate-600 text-right uppercase tracking-wider">
                                        Grand Total
                                    </td>
                                    <td className="px-4 py-3 text-right font-black font-mono tabular-nums text-sm text-emerald-950">
                                        {formatCurrency(filteredIncomes.reduce((s, e) => s + (e.amount || 0), 0))}
                                    </td>
                                    <td className="w-10"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {/* ── 6. Pagination Footer ── */}
                {filteredIncomes.length > rowsPerPage && (
                    <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">
                            Showing <span className="font-bold text-slate-800">{((currentPage - 1) * rowsPerPage) + 1}</span>–
                            <span className="font-bold text-slate-800">{Math.min(currentPage * rowsPerPage, filteredIncomes.length)}</span> of{" "}
                            <span className="font-bold text-slate-800 font-mono tabular-nums">{filteredIncomes.length}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-semibold active:scale-[0.97] transition-all cursor-pointer shadow-2xs"
                            >
                                Previous
                            </button>
                            <span className="px-2 font-semibold text-slate-600 font-mono tabular-nums">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-semibold active:scale-[0.97] transition-all cursor-pointer shadow-2xs"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── 7. Receipts Lightbox Modal ── */}
            <ReceiptViewerModal
                isOpen={viewerModal.isOpen}
                onClose={() => setViewerModal(prev => ({ ...prev, isOpen: false }))}
                attachments={viewerModal.attachments}
                title={viewerModal.title}
            />
        </div>
    );
}
