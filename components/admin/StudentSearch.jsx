"use client";

import { Search } from "lucide-react";

export default function StudentSearch() {
    const handleOpen = () => {
        window.dispatchEvent(new CustomEvent("open-spotlight"));
    };

    return (
        <button
            type="button"
            onClick={handleOpen}
            className="w-full flex items-center justify-between px-3.5 py-1.5 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-slate-500 rounded-full text-[13px] font-medium transition-colors cursor-pointer group"
            aria-label="Open Spotlight Search (⌘K)"
        >
            <div className="flex items-center gap-2">
                <Search size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                <span className="text-slate-400 group-hover:text-slate-600 transition-colors">Search anything...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-2xs">
                ⌘K
            </kbd>
        </button>
    );
}
