"use client";

import { useState, useMemo } from "react";
import { Search, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import Input from "@/components/ui/Input";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

/**
 * Universal Containerless DataTable Component
 * Features:
 * - Containerless surface styling (no heavy outer frames or nested icon boxes)
 * - Automatic right-alignment for currency and numeric columns
 * - Interactive sorting per column
 * - Search filtering & pagination controls
 * - Built-in loading and empty state handling
 */
export default function DataTable({
    columns = [],
    data = [],
    loading = false,
    searchPlaceholder = "Search records...",
    searchFields = [],
    emptyTitle = "No records found",
    emptyDescription = "Get started by adding your first entry.",
    emptyIcon,
    headerActions,
    filters,
    rowsPerPage = 15,
    className
}) {
    const [search, setSearch] = useState("");
    const [sortField, setSortField] = useState(null);
    const [sortDirection, setSortDirection] = useState("asc"); // "asc" | "desc"
    const [currentPage, setCurrentPage] = useState(1);

    // Search Filtering
    const filteredData = useMemo(() => {
        if (!search.trim()) return data;
        const query = search.toLowerCase();

        return data.filter((row) => {
            if (searchFields.length > 0) {
                return searchFields.some((field) => {
                    const val = field.split('.').reduce((obj, key) => obj?.[key], row);
                    return String(val || '').toLowerCase().includes(query);
                });
            }
            // Fallback: search all values in object
            return JSON.stringify(row).toLowerCase().includes(query);
        });
    }, [data, search, searchFields]);

    // Column Sorting
    const sortedData = useMemo(() => {
        if (!sortField) return filteredData;

        return [...filteredData].sort((a, b) => {
            let valA = sortField.split('.').reduce((obj, key) => obj?.[key], a);
            let valB = sortField.split('.').reduce((obj, key) => obj?.[key], b);

            // Handle numbers
            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortDirection === 'asc' ? valA - valB : valB - valA;
            }

            // Handle strings
            valA = String(valA || '').toLowerCase();
            valB = String(valB || '').toLowerCase();

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredData, sortField, sortDirection]);

    // Pagination
    const totalPages = Math.ceil(sortedData.length / rowsPerPage) || 1;
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return sortedData.slice(start, start + rowsPerPage);
    }, [sortedData, currentPage, rowsPerPage]);

    const handleSort = (field) => {
        if (!field) return;
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    return (
        <div className={cn("bg-white rounded-xl border border-slate-200/80 overflow-hidden space-y-0", className)}>
            {/* Header Control Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 bg-slate-50/60 border-b border-slate-200/80">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
                    {filters}
                    <div className="w-full md:max-w-md">
                        <Input
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                            icon={Search}
                            className="bg-white border-slate-200 shadow-xs"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {headerActions}
                    <span className="text-xs font-medium text-slate-500 font-mono">
                        {sortedData.length} Total
                    </span>
                </div>
            </div>

            {/* Table Area */}
            <div>
                {loading ? (
                    <div className="p-12 flex justify-center"><LoadingSpinner /></div>
                ) : paginatedData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200/80 bg-white text-xs font-semibold text-slate-400">
                                    {columns.map((col, index) => {
                                        const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                                        return (
                                            <th
                                                key={col.key || index}
                                                className={cn(
                                                    "px-6 py-3.5 uppercase tracking-wider select-none",
                                                    alignClass,
                                                    col.sortField && "cursor-pointer hover:text-slate-700 transition-colors"
                                                )}
                                                onClick={() => col.sortField && handleSort(col.sortField)}
                                            >
                                                <div className={cn("inline-flex items-center gap-1.5", col.align === 'right' && "flex-row-reverse")}>
                                                    <span>{col.header}</span>
                                                    {col.sortField && (
                                                        sortField === col.sortField ? (
                                                            sortDirection === 'asc' ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />
                                                        ) : (
                                                            <ArrowUpDown size={13} className="text-slate-300 group-hover:text-slate-400" />
                                                        )
                                                    )}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedData.map((row, rowIndex) => (
                                    <tr key={row._id || row.id || rowIndex} className="hover:bg-slate-50/50 transition-colors group">
                                        {columns.map((col, colIndex) => {
                                            const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                                            return (
                                                <td key={col.key || colIndex} className={cn("px-6 py-4 text-sm text-slate-700 font-medium", alignClass)}>
                                                    {col.render ? col.render(row, rowIndex) : row[col.key]}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState
                        icon={emptyIcon}
                        title={emptyTitle}
                        description={emptyDescription}
                    />
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 bg-slate-50/60 border-t border-slate-200/80 text-xs text-slate-500">
                    <span>
                        Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, sortedData.length)} of {sortedData.length} entries
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                        >
                            Previous
                        </button>
                        <span className="font-semibold text-slate-700">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
