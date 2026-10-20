"use client";

import { useEffect, useRef } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function FilterSelect({ label, value, onChange, options, isNonDefault, className }) {
    return (
        <div className={cn("relative inline-flex items-center shrink-0", className)}>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                    "h-9 appearance-none rounded-lg border bg-white pl-3 pr-8 text-xs font-medium cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                    isNonDefault
                        ? "border-blue-300 bg-blue-50/50 text-blue-900"
                        : "border-slate-200 text-slate-700 hover:border-slate-300"
                )}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {label}: {opt.label}
                    </option>
                ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-slate-400" />
        </div>
    );
}

export default function ListToolbar({
    search,
    onSearchChange,
    searchPlaceholder = "Search…",
    filters = [],
    hasActiveFilters = false,
    onClearFilters,
    summaryChips = [],
    children,
    className
}) {
    const inputRef = useRef(null);

    // Keyboard shortcut: "/" to focus search
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <div className={cn("flex flex-wrap items-center justify-between gap-2.5 p-3.5 border-b border-slate-200/80 bg-white", className)}>
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                {/* Search Input with 36px height and left icon */}
                <div className="relative flex-1 max-w-sm min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={searchPlaceholder}
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-xs font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => onSearchChange("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            title="Clear search"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>

                {/* Filter Dropdowns */}
                {filters.map((f, idx) => (
                    <FilterSelect
                        key={idx}
                        label={f.label}
                        value={f.value}
                        onChange={f.onChange}
                        options={f.options}
                        isNonDefault={f.isNonDefault}
                    />
                ))}

                {/* Clear filters link */}
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={onClearFilters}
                        className="h-9 px-2.5 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <X size={13} />
                        <span>Clear</span>
                    </button>
                )}
            </div>

            {/* Summary Chips / Extra Controls */}
            {(summaryChips.length > 0 || children) && (
                <div className="flex items-center gap-1.5 flex-wrap">
                    {summaryChips.map((chip, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={chip.onClick}
                            className={cn(
                                "h-7 px-2.5 inline-flex items-center gap-1.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer",
                                chip.active
                                    ? chip.activeClassName || "bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-300 shadow-2xs"
                                    : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:text-slate-900"
                            )}
                            title={chip.title}
                        >
                            {chip.dotColor && (
                                <span className={cn("w-1.5 h-1.5 rounded-full", chip.dotColor)} />
                            )}
                            <span>{chip.label}</span>
                            <span className="font-bold tabular-nums text-slate-900">{chip.count}</span>
                        </button>
                    ))}
                    {children}
                </div>
            )}
        </div>
    );
}
