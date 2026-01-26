"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, User, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function StudentSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const dropdownRef = useRef(null);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim()) {
                fetchResults();
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Handle clicks outside dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchResults = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/students?search=${encodeURIComponent(query)}&limit=5`);
            if (res.ok) {
                const data = await res.json();
                setResults(data.students || []);
                setIsOpen(true);
            }
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (studentId) => {
        router.push(`/admin/students/${studentId}`);
        setIsOpen(false);
        setQuery("");
    };

    return (
        <div className="relative w-full max-w-md group" ref={dropdownRef}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-premium-blue transition-colors" size={18} />
                <input
                    type="text"
                    placeholder="Search students by name, email or ID..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.trim() && results.length > 0 && setIsOpen(true)}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-premium-blue/5 focus:border-premium-blue transition-all shadow-sm"
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-premium-blue animate-spin" size={18} />
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {results.length > 0 ? (
                        <div className="py-2">
                            <div className="px-4 py-2 border-b border-slate-50">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Search Results</span>
                            </div>
                            {results.map((student) => (
                                <button
                                    key={student._id}
                                    onClick={() => handleSelect(student._id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors group/item"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-soft-blue flex items-center justify-center text-premium-blue font-bold shrink-0">
                                        {student.profile?.firstName?.[0] || <User size={18} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-slate-900 truncate">
                                                {student.profile?.firstName} {student.profile?.lastName}
                                            </p>
                                            <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-200 uppercase tracking-tighter">
                                                {student.enrollmentNumber}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 truncate">{student.email}</p>
                                    </div>
                                    <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover/item:opacity-100 -translate-x-2 group-hover/item:translate-x-0 transition-all" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="px-4 py-8 text-center text-slate-400">
                            <Search size={24} className="mx-auto mb-2 opacity-20" />
                            <p className="text-sm font-medium">No students found matching "{query}"</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
