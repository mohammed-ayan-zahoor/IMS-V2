"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart3, Calendar, Search, Loader2, ArrowLeft, Download, Lightbulb, CreditCard, Banknote, Landmark, Smartphone, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

export default function IncomeReportPage() {
    const router = useRouter();
    const toast = useToast();
    const confirm = useConfirm();
    const [loading, setLoading] = useState(true);
    const [incomeHeads, setIncomeHeads] = useState([]);
    const [incomes, setIncomes] = useState([]);
    const [summary, setSummary] = useState({ totalAmount: 0, totalCount: 0, categoryWise: {} });

    const getDefaultDates = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
            fromDate: firstDay.toISOString().split('T')[0],
            toDate: today.toISOString().split('T')[0]
        };
    };

    const [filters, setFilters] = useState({
        fromDate: getDefaultDates().fromDate,
        toDate: getDefaultDates().toDate,
        incomeHead: ""
    });

    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [filters.fromDate, filters.toDate, filters.incomeHead]);

    const handleExportCSV = () => {
        if (!incomes.length) {
            toast.error("No data to export");
            return;
        }
        
        const headers = ["Date", "Category", "Description", "Received From", "Payment Mode", "Received In Account", "Amount"];
        const csvRows = [headers.join(",")];
        
        incomes.forEach(e => {
            const row = [
                formatDate(e.date).replace(/,/g, ''),
                `"${(e.incomeHead?.name || 'N/A').replace(/"/g, '""')}"`,
                `"${(e.description || '').replace(/"/g, '""')}"`,
                `"${(e.receivedFrom || '').replace(/"/g, '""')}"`,
                `"${(e.paymentMode || '').replace(/"/g, '""')}"`,
                `"${(e.receivedInAccount?.name || '').replace(/"/g, '""')}"`,
                e.amount
            ];
            csvRows.push(row.join(","));
        });
        
        csvRows.push(`"GRAND TOTAL",,,,,,${summary.totalAmount}`);

        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `Income_Report_${filters.fromDate}_to_${filters.toDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentIncomes = incomes.slice(indexOfFirstRow, indexOfLastRow);
    const totalPages = Math.ceil(incomes.length / rowsPerPage) || 1;

    const fetchIncomeHeads = useCallback(async (signal) => {
        try {
            const res = await fetch("/api/v1/income-heads", { signal });
            const data = await res.json();
            if (signal?.aborted) return;
            setIncomeHeads(data.incomeHeads || []);
        } catch (error) {
            if (error.name !== 'AbortError') {
                toast.error("Failed to load categories");
            }
        }
    }, [toast]);

    const fetchIncomes = useCallback(async (signal) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('fromDate', filters.fromDate);
            params.append('toDate', filters.toDate);
            if (filters.incomeHead) {
                params.append('incomeHead', filters.incomeHead);
            }

            const res = await fetch(`/api/v1/incomes?${params}`, { signal });
            const data = await res.json();

            if (signal?.aborted) return;

            if (res.ok) {
                setIncomes(data.incomes || []);
                setSummary(data.summary || { totalAmount: 0, totalCount: 0, categoryWise: {} });
            } else {
                toast.error(data.error || "Failed to load incomes");
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                toast.error("Failed to load incomes");
            }
        } finally {
            if (signal?.aborted) return;
            setLoading(false);
        }
    }, [filters.fromDate, filters.toDate, filters.incomeHead, toast]);

    useEffect(() => {
        const controller = new AbortController();
        fetchIncomeHeads(controller.signal);
        return () => controller.abort();
    }, [fetchIncomeHeads]);

    useEffect(() => {
        const controller = new AbortController();
        fetchIncomes(controller.signal);
        return () => controller.abort();
    }, [fetchIncomes]);

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
                    fetchIncomes();
                } else {
                    const data = await res.json();
                    toast.error(data.error || "Failed to delete record");
                }
            } catch (error) {
                toast.error("Error deleting record");
            }
        }
    };

    const incomeHeadOptions = [
        { value: "", label: "All Categories" },
        ...incomeHeads.map(head => ({ value: head._id, label: head.name }))
    ];

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const categoryEntries = Object.entries(summary.categoryWise || {});

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
                        <BarChart3 className="text-premium-blue" size={28} />
                        Income Report
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">View and analyze incoming revenue logs by range and category.</p>
                </div>
            </div>

            <Card className="p-4">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                type="date"
                                value={filters.fromDate}
                                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                                className="pl-9 w-36"
                            />
                        </div>
                        <span className="text-slate-400 text-sm">to</span>
                        <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                type="date"
                                value={filters.toDate}
                                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                                className="pl-9 w-36"
                            />
                        </div>
                    </div>

                    <div className="w-48">
                        <Select
                            options={incomeHeadOptions}
                            value={filters.incomeHead}
                            onChange={(val) => setFilters({ ...filters, incomeHead: val })}
                            placeholder="All Categories"
                        />
                    </div>

                    <Button variant="outline" onClick={() => setFilters({ ...getDefaultDates(), incomeHead: "" })}>
                        Reset Filters
                    </Button>
                </div>
            </Card>

            {loading ? (
                <div className="py-20 flex flex-col items-center gap-4 text-slate-400 font-medium italic">
                    <Loader2 className="animate-spin text-premium-blue" size={40} />
                    Loading incomes...
                </div>
            ) : (
                <div className="space-y-6">
                    {/* TOP SECTION: Dashboard Grid Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* LEFT COLUMN: Cards & Chart */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="p-4 border-l-4 border-l-premium-blue shadow-sm bg-white">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Income</p>
                                    <p className="text-2xl font-black mt-1 text-slate-900">{formatCurrency(summary.totalAmount)}</p>
                                    <p className="text-[10px] font-medium text-slate-400 mt-1">{summary.totalCount || 0} transactions</p>
                                </Card>
                                <Card className="p-4 border-l-4 border-l-purple-500 shadow-sm bg-white">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category Count</p>
                                    <p className="text-2xl font-black text-slate-900 mt-1">{categoryEntries.length}</p>
                                    <p className="text-[10px] font-medium text-slate-400 mt-1">unique categories</p>
                                </Card>
                                <Card className="p-4 border-l-4 border-l-emerald-500 shadow-sm bg-white">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Average Revenue</p>
                                    <p className="text-2xl font-black text-slate-900 mt-1">
                                        {summary.totalCount > 0 ? formatCurrency(summary.totalAmount / summary.totalCount) : formatCurrency(0)}
                                    </p>
                                    <p className="text-[10px] font-medium text-slate-400 mt-1">per entry</p>
                                </Card>
                            </div>

                            {categoryEntries.length > 0 && (
                                <Card className="p-5">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Category Distribution</p>
                                    <div className="space-y-4">
                                        {categoryEntries.sort((a,b) => b[1] - a[1]).map(([category, amount]) => {
                                            const percentage = Math.round((amount / summary.totalAmount) * 100) || 0;
                                            return (
                                                <div key={category} className="group">
                                                    <div className="flex justify-between items-end mb-1.5">
                                                        <span className="text-sm font-bold text-slate-700">{category}</span>
                                                        <div className="flex items-baseline gap-3">
                                                            <span className="text-sm font-black text-slate-900">{formatCurrency(amount)}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 w-8 text-right">{percentage}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                        <div 
                                                            className="bg-premium-blue h-2.5 rounded-full transition-all duration-1000 ease-out group-hover:bg-blue-600" 
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            )}
                        </div>

                        {/* RIGHT COLUMN: Insights & Extras */}
                        <div className="space-y-6">
                            {summary.totalAmount > 0 && categoryEntries.length > 0 && (
                                <Card className="border border-blue-100 bg-blue-50/50 shadow-sm p-5 h-full min-h-[160px]">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-0.5 text-premium-blue bg-blue-100 p-2 rounded-full shrink-0"><Lightbulb size={20} /></div>
                                        <div>
                                            <p className="text-xs font-bold text-premium-blue uppercase tracking-wider mb-2">Smart Insight</p>
                                            <p className="text-sm font-medium text-slate-700 leading-relaxed">
                                                {categoryEntries.length === 1 
                                                    ? `100% of your current filtered incomes are generated by the ${categoryEntries[0][0]} category.` 
                                                    : `Your highest incoming source is ${categoryEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0]}, making up ${Math.round((categoryEntries.reduce((a, b) => a[1] > b[1] ? a : b)[1] / summary.totalAmount) * 100)}% of your total logged incoming revenues.`}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            )}
                        </div>
                    </div>

                    {/* BOTTOM SECTION: Scrollable Table */}
                    <Card className="overflow-hidden flex flex-col border border-slate-200">
                        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Income Records</h3>
                                <span className="text-xs font-medium text-slate-500 bg-slate-200/50 px-3 py-1 rounded-md">{incomes.length} entries</span>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 gap-2 text-xs font-bold" disabled={incomes.length === 0}>
                                <Download size={14} /> Export CSV
                            </Button>
                        </div>
                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                            <table className="w-full text-left border-collapse relative min-w-[900px]">
                                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                                    <tr>
                                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50">Date</th>
                                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50">Category</th>
                                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50">Description</th>
                                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50">Received From</th>
                                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50">Destination / Mode</th>
                                        <th className="text-right px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50">Amount</th>
                                        <th className="w-12 px-5 py-4 bg-slate-50"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {currentIncomes.length > 0 ? (
                                        currentIncomes.map((income) => {
                                            const modeIcon = income.paymentMode === 'Cash' ? <Banknote size={14} className="inline mr-1" /> : 
                                                             income.paymentMode === 'Bank Transfer' ? <Landmark size={14} className="inline mr-1" /> : 
                                                             income.paymentMode === 'UPI' ? <Smartphone size={14} className="inline mr-1" /> : <CreditCard size={14} className="inline mr-1" />;
                                            return (
                                                <tr key={income._id} className="group hover:bg-blue-50/40 border-l-2 border-transparent hover:border-premium-blue transition-all cursor-default">
                                                    <td className="px-5 py-4 text-sm font-medium text-slate-600 whitespace-nowrap">
                                                        {formatDate(income.date)}
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold group-hover:bg-blue-100 group-hover:text-premium-blue transition-colors">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5 group-hover:bg-premium-blue"></div>
                                                            {income.incomeHead?.name || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-sm text-slate-600 max-w-[200px] truncate">
                                                        {income.description || <span className="text-slate-300 italic">No notes</span>}
                                                    </td>
                                                    <td className="px-5 py-4 text-sm font-medium text-slate-700 whitespace-nowrap">
                                                        {income.receivedFrom || '-'}
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-700">{income.receivedInAccount?.name || '-'}</span>
                                                            <span className="text-xs text-slate-500 flex items-center mt-0.5">
                                                                {modeIcon} {income.paymentMode}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-sm font-black text-slate-900 text-right whitespace-nowrap group-hover:text-premium-blue transition-colors">
                                                        {formatCurrency(income.amount)}
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-right">
                                                        <button
                                                            onClick={() => handleDelete(income._id, income.incomeHead?.name || 'Unknown', income.amount)}
                                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            title="Delete Entry"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-16 text-center">
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                                                        <Search size={28} className="text-slate-300" />
                                                    </div>
                                                    <p className="text-slate-500 font-medium">No incomes match your filters.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                {incomes.length > 0 && (
                                    <tfoot className="bg-slate-50 sticky bottom-0 z-10 border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                        <tr>
                                            <td colSpan={5} className="px-5 py-4 text-sm font-bold text-slate-700 text-right bg-slate-50">Grand Total</td>
                                            <td className="px-5 py-4 text-sm font-black text-premium-blue text-right bg-slate-50">{formatCurrency(summary.totalAmount)}</td>
                                            <td className="bg-slate-50"></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                        
                        {/* Pagination Controls */}
                        {incomes.length > 0 && (
                            <div className="bg-white border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
                                <p className="text-xs text-slate-500 font-medium">
                                    Showing <span className="font-bold text-slate-700">{indexOfFirstRow + 1}</span> to <span className="font-bold text-slate-700">{Math.min(indexOfLastRow, incomes.length)}</span> of <span className="font-bold text-slate-700">{incomes.length}</span> entries
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 text-xs font-bold" 
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => p - 1)}
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-xs font-bold text-slate-700 px-3">{currentPage} / {totalPages}</span>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 text-xs font-bold" 
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(p => p + 1)}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}
