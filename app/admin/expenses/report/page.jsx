"use client";

import { useState, useEffect } from "react";
import { BarChart3, Calendar, Search, Loader2, ArrowLeft, Download, Lightbulb, CreditCard, Banknote, Landmark, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";

export default function ExpenseReportPage() {
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [expenseHeads, setExpenseHeads] = useState([]);
    const [expenses, setExpenses] = useState([]);
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
        expenseHead: ""
    });

    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [filters.fromDate, filters.toDate, filters.expenseHead]);

    const handleExportCSV = () => {
        if (!expenses.length) {
            toast.error("No data to export");
            return;
        }
        
        const headers = ["Date", "Category", "Description", "Paid To", "Payment Mode", "Paid By", "Amount"];
        const csvRows = [headers.join(",")];
        
        expenses.forEach(e => {
            const row = [
                formatDate(e.date).replace(/,/g, ''),
                `"${(e.expenseHead?.name || 'N/A').replace(/"/g, '""')}"`,
                `"${(e.description || '').replace(/"/g, '""')}"`,
                `"${(e.paidTo || '').replace(/"/g, '""')}"`,
                `"${(e.paymentMode || '').replace(/"/g, '""')}"`,
                `"${(e.paidByAccount?.name || '').replace(/"/g, '""')}"`,
                e.amount
            ];
            csvRows.push(row.join(","));
        });
        
        csvRows.push(`"GRAND TOTAL",,,,,,${summary.totalAmount}`);

        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `Expense_Report_${filters.fromDate}_to_${filters.toDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentExpenses = expenses.slice(indexOfFirstRow, indexOfLastRow);
    const totalPages = Math.ceil(expenses.length / rowsPerPage) || 1;

    useEffect(() => {
        const controller = new AbortController();
        fetchExpenseHeads(controller.signal);
        return () => controller.abort();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchExpenses(controller.signal);
        return () => controller.abort();
    }, [filters.fromDate, filters.toDate, filters.expenseHead]);

    const fetchExpenseHeads = async (signal) => {
        try {
            const res = await fetch("/api/v1/expense-heads", { signal });
            const data = await res.json();
            if (signal?.aborted) return;
            setExpenseHeads(data.expenseHeads || []);
        } catch (error) {
            if (error.name !== 'AbortError') {
                toast.error("Failed to load categories");
            }
        }
    };

    const fetchExpenses = async (signal) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('fromDate', filters.fromDate);
            params.append('toDate', filters.toDate);
            if (filters.expenseHead) {
                params.append('expenseHead', filters.expenseHead);
            }

            const res = await fetch(`/api/v1/expenses?${params}`, { signal });
            const data = await res.json();

            if (signal?.aborted) return;

            if (res.ok) {
                setExpenses(data.expenses || []);
                setSummary(data.summary || { totalAmount: 0, totalCount: 0, categoryWise: {} });
            } else {
                toast.error(data.error || "Failed to load expenses");
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                toast.error("Failed to load expenses");
            }
        } finally {
            if (signal?.aborted) return;
            setLoading(false);
        }
    };

    const expenseHeadOptions = [
        { value: "", label: "All Categories" },
        ...expenseHeads.map(head => ({ value: head._id, label: head.name }))
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
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-0">
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
                        Expense Report
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">View and analyze expense data by date range and category.</p>
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
                            options={expenseHeadOptions}
                            value={filters.expenseHead}
                            onChange={(val) => setFilters({ ...filters, expenseHead: val })}
                            placeholder="All Categories"
                        />
                    </div>

                    <Button variant="outline" onClick={() => setFilters({ ...getDefaultDates(), expenseHead: "" })}>
                        Reset Filters
                    </Button>
                </div>
            </Card>

            {loading ? (
                <div className="py-20 flex flex-col items-center gap-4 text-slate-400 font-medium italic">
                    <Loader2 className="animate-spin text-premium-blue" size={40} />
                    Loading expenses...
                </div>
            ) : (
                <div className="space-y-6">
                    {/* TOP SECTION: Dashboard Grid Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* LEFT COLUMN: Cards & Chart */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="p-4 border-l-4 border-l-premium-blue shadow-sm bg-white">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Expenses</p>
                                    <p className="text-2xl font-black mt-1 text-slate-900">{formatCurrency(summary.totalAmount)}</p>
                                    <p className="text-[10px] font-medium text-slate-400 mt-1">{summary.totalCount || 0} transactions</p>
                                </Card>
                                <Card className="p-4 border-l-4 border-l-purple-500 shadow-sm bg-white">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category Count</p>
                                    <p className="text-2xl font-black text-slate-900 mt-1">{categoryEntries.length}</p>
                                    <p className="text-[10px] font-medium text-slate-400 mt-1">unique categories</p>
                                </Card>
                                <Card className="p-4 border-l-4 border-l-emerald-500 shadow-sm bg-white">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Average Spend</p>
                                    <p className="text-2xl font-black text-slate-900 mt-1">
                                        {summary.totalCount > 0 ? formatCurrency(summary.totalAmount / summary.totalCount) : formatCurrency(0)}
                                    </p>
                                    <p className="text-[10px] font-medium text-slate-400 mt-1">per expense</p>
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
                                                    ? `100% of your current filtered expenses are attributed to the ${categoryEntries[0][0]} category.` 
                                                    : `Your highest spending area is ${categoryEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0]}, making up ${Math.round((categoryEntries.reduce((a, b) => a[1] > b[1] ? a : b)[1] / summary.totalAmount) * 100)}% of your total expenditures.`}
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
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Expense Records</h3>
                                <span className="text-xs font-medium text-slate-500 bg-slate-200/50 px-3 py-1 rounded-md">{expenses.length} entries</span>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 gap-2 text-xs font-bold" disabled={expenses.length === 0}>
                                <Download size={14} /> Export CSV
                            </Button>
                        </div>
                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                            <table className="w-full text-left border-collapse relative min-w-[800px]">
                                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                                    <tr>
                                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50">Date</th>
                                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50">Category</th>
                                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50">Description</th>
                                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50">Paid To</th>
                                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50">Source / Mode</th>
                                        <th className="text-right px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {currentExpenses.length > 0 ? (
                                        currentExpenses.map((expense) => {
                                            const modeIcon = expense.paymentMode === 'Cash' ? <Banknote size={14} className="inline mr-1" /> : 
                                                             expense.paymentMode === 'Bank Transfer' ? <Landmark size={14} className="inline mr-1" /> : 
                                                             expense.paymentMode === 'UPI' ? <Smartphone size={14} className="inline mr-1" /> : <CreditCard size={14} className="inline mr-1" />;
                                            return (
                                                <tr key={expense._id} className="group hover:bg-blue-50/40 border-l-2 border-transparent hover:border-premium-blue transition-all cursor-default">
                                                    <td className="px-5 py-4 text-sm font-medium text-slate-600 whitespace-nowrap">
                                                        {formatDate(expense.date)}
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold group-hover:bg-blue-100 group-hover:text-premium-blue transition-colors">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5 group-hover:bg-premium-blue"></div>
                                                            {expense.expenseHead?.name || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-sm text-slate-600 max-w-[200px] truncate">
                                                        {expense.description || <span className="text-slate-300 italic">No notes</span>}
                                                    </td>
                                                    <td className="px-5 py-4 text-sm font-medium text-slate-700 whitespace-nowrap">
                                                        {expense.paidTo || '-'}
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-700">{expense.paidByAccount?.name || '-'}</span>
                                                            <span className="text-xs text-slate-500 flex items-center mt-0.5">
                                                                {modeIcon} {expense.paymentMode}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-sm font-black text-slate-900 text-right whitespace-nowrap group-hover:text-premium-blue transition-colors">
                                                        {formatCurrency(expense.amount)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-5 py-16 text-center">
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                                                        <Search size={28} className="text-slate-300" />
                                                    </div>
                                                    <p className="text-slate-500 font-medium">No expenses match your filters.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                {expenses.length > 0 && (
                                    <tfoot className="bg-slate-50 sticky bottom-0 z-10 border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                        <tr>
                                            <td colSpan={5} className="px-5 py-4 text-sm font-bold text-slate-700 text-right bg-slate-50">Grand Total</td>
                                            <td className="px-5 py-4 text-sm font-black text-premium-blue text-right bg-slate-50">{formatCurrency(summary.totalAmount)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                        
                        {/* Pagination Controls */}
                        {expenses.length > 0 && (
                            <div className="bg-white border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
                                <p className="text-xs text-slate-500 font-medium">
                                    Showing <span className="font-bold text-slate-700">{indexOfFirstRow + 1}</span> to <span className="font-bold text-slate-700">{Math.min(indexOfLastRow, expenses.length)}</span> of <span className="font-bold text-slate-700">{expenses.length}</span> entries
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