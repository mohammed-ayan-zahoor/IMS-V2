"use client";

import { useState, useEffect, useMemo } from "react";
import { 
    Bell, 
    Pin, 
    Calendar, 
    AlertTriangle, 
    Info, 
    PartyPopper,
    Search, 
    Printer, 
    Share2, 
    ArrowLeft, 
    Check, 
    ShieldCheck, 
    Building2,
    SlidersHorizontal
} from "lucide-react";
import { format } from "date-fns";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";

export default function StudentNoticeBoardPage() {
    const toast = useToast();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [mobileView, setMobileView] = useState("list"); // 'list' | 'reader'
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const loadNotices = async () => {
            try {
                const res = await fetch("/api/v1/student/notices");
                const data = await res.json();
                if (!isMounted) return;
                if (res.ok) {
                    const list = data.notices || [];
                    setNotices(list);
                    if (list.length > 0) {
                        setSelectedId(list[0]._id);
                    }
                } else {
                    toast?.error(data.error || "Failed to load notices");
                }
            } catch (error) {
                if (isMounted) toast?.error("Network error. Please try again.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadNotices();
        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Filter and search
    const filteredNotices = useMemo(() => {
        return notices.filter(n => {
            const matchesSearch = (n.title || "").toLowerCase().includes(search.toLowerCase()) || 
                                 (n.content || "").toLowerCase().includes(search.toLowerCase());
            const matchesFilter = filter === "all" || 
                                 (filter === "pinned" ? n.isPinned : n.type === filter);
            return matchesSearch && matchesFilter;
        });
    }, [notices, filter, search]);

    // Ensure selected notice points to valid filtered or first notice
    const activeNotice = useMemo(() => {
        if (!filteredNotices.length) return null;
        const found = filteredNotices.find(n => n._id === selectedId);
        return found || filteredNotices[0];
    }, [filteredNotices, selectedId]);

    const handleSelectNotice = (id) => {
        setSelectedId(id);
        setMobileView("reader");
    };

    const handleCopyLink = () => {
        if (typeof window !== "undefined") {
            navigator.clipboard?.writeText(window.location.href);
            setCopied(true);
            toast?.success("Notice link copied to clipboard");
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const handlePrint = () => {
        if (typeof window !== "undefined") {
            window.print();
        }
    };

    if (loading) return <LoadingSpinner fullPage />;

    const urgentCount = notices.filter(n => n.type === "urgent").length;
    const pinnedCount = notices.filter(n => n.isPinned).length;

    return (
        <div className="max-w-7xl mx-auto space-y-5 safe-pb p-2 sm:p-4">
            
            {/* Header & Filter Pill Strip */}
            <div className="bg-white rounded-[16px] border border-[#E9E8F0] p-5 sm:p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl sm:text-2xl font-bold text-[#1E1B2E]">
                                Campus Bulletin & Notices
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full bg-[#EDE8FB] text-[#6E5AE0] text-xs font-semibold">
                                {notices.length} Published
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-[#8D8A9B] mt-1">
                            Official institutional circulars, academic advisories, and administrative notices.
                        </p>
                    </div>

                    {/* Quick Search */}
                    <div className="relative w-full md:w-80 shrink-0">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8D8A9B]" size={16} />
                        <input
                            type="text"
                            placeholder="Search circulars or directives..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white border border-[#E9E8F0] rounded-full pl-9 pr-4 py-2 text-xs sm:text-sm text-[#1E1B2E] placeholder:text-[#8D8A9B] focus:outline-none focus:border-[#6E5AE0] transition-colors"
                        />
                    </div>
                </div>

                {/* Filter Pills Bar */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#E9E8F0] flex-wrap">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {[
                            { id: "all", label: `All Notices (${notices.length})` },
                            { id: "urgent", label: `Urgent (${urgentCount})`, highlight: urgentCount > 0 },
                            { id: "pinned", label: `Pinned (${pinnedCount})` },
                            { id: "event", label: "Events & Meets" },
                            { id: "info", label: "General Circulars" },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setFilter(tab.id)}
                                className={cn(
                                    "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
                                    filter === tab.id
                                        ? "bg-[#2C2A46] text-white shadow-sm"
                                        : tab.highlight
                                            ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                            : "bg-white border border-[#E9E8F0] text-[#8D8A9B] hover:text-[#1E1B2E] hover:border-[#8D8A9B]"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Status Highlights */}
                    <div className="hidden sm:flex items-center gap-3 text-xs text-[#8D8A9B]">
                        {urgentCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                                Action Required
                            </span>
                        )}
                        <span>Official Channel</span>
                    </div>
                </div>
            </div>

            {/* Non-Card Communique Ledger Layout: Feed on Left + Official Document Reader on Right */}
            {filteredNotices.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    
                    {/* Left Pane: Chronological Communique Feed (List View) */}
                    <div className={cn(
                        "lg:col-span-5 bg-white rounded-[16px] border border-[#E9E8F0] overflow-hidden flex flex-col",
                        mobileView === "reader" ? "hidden lg:flex" : "flex"
                    )}>
                        <div className="px-5 py-3.5 bg-[#FAF9FC] border-b border-[#E9E8F0] flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#8D8A9B]">
                                Communique Stream ({filteredNotices.length})
                            </span>
                            <span className="text-[11px] text-[#8D8A9B]">
                                Tap to inspect
                            </span>
                        </div>

                        {/* Continuous Divided Feed Items (No card wrappers) */}
                        <div className="divide-y divide-[#E9E8F0] overflow-y-auto max-h-[calc(100vh-280px)]">
                            {filteredNotices.map((notice) => {
                                const isSelected = activeNotice?._id === notice._id;
                                const typeMeta = getNoticeTypeMeta(notice.type);

                                return (
                                    <div
                                        key={notice._id}
                                        onClick={() => handleSelectNotice(notice._id)}
                                        className={cn(
                                            "p-4 sm:p-5 transition-all cursor-pointer relative text-left group",
                                            isSelected 
                                                ? "bg-[#F7F5FC] border-l-4 border-l-[#6E5AE0]" 
                                                : "hover:bg-[#FAF9FC] border-l-4 border-l-transparent"
                                        )}
                                    >
                                        {/* Top Meta Line: Tag + Pin + Timestamp */}
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                    typeMeta.badgeClass
                                                )}>
                                                    {typeMeta.label}
                                                </span>
                                                {notice.isPinned && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-[#F4586A] font-semibold">
                                                        <Pin size={11} className="fill-current rotate-45" />
                                                        Pinned
                                                    </span>
                                                )}
                                            </div>

                                            <span className="text-[11px] text-[#8D8A9B] whitespace-nowrap">
                                                {format(new Date(notice.createdAt), "MMM d, yyyy")}
                                            </span>
                                        </div>

                                        {/* Headline */}
                                        <h3 className={cn(
                                            "text-sm sm:text-base font-bold leading-snug line-clamp-2 transition-colors",
                                            isSelected ? "text-[#6E5AE0]" : "text-[#1E1B2E] group-hover:text-[#6E5AE0]"
                                        )}>
                                            {notice.title}
                                        </h3>

                                        {/* Content Excerpt */}
                                        <p className="text-xs text-[#8D8A9B] line-clamp-2 mt-1.5 leading-relaxed">
                                            {notice.content}
                                        </p>

                                        {/* Bottom Metadata row */}
                                        <div className="flex items-center justify-between gap-2 mt-3 pt-2 text-[11px] text-[#8D8A9B]">
                                            <span className="flex items-center gap-1 truncate">
                                                <Building2 size={12} className="text-[#8D8A9B]" />
                                                Office of Academic Affairs
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Pane: Official Communique Document Reader */}
                    {activeNotice ? (
                        <div className={cn(
                            "lg:col-span-7 bg-white rounded-[16px] border border-[#E9E8F0] overflow-hidden flex flex-col",
                            mobileView === "list" ? "hidden lg:flex" : "flex"
                        )}>
                            {/* Document Actions Bar */}
                            <div className="px-5 py-3.5 bg-[#FAF9FC] border-b border-[#E9E8F0] flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setMobileView("list")}
                                        className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E9E8F0] text-xs font-semibold text-[#1E1B2E]"
                                    >
                                        <ArrowLeft size={13} />
                                        <span>Back to Stream</span>
                                    </button>
                                    <span className="text-xs font-mono font-semibold text-[#8D8A9B] tracking-wider">
                                        REF: NOT/{activeNotice._id?.toString().slice(-6).toUpperCase()}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleCopyLink}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-[#E9E8F0] text-xs font-semibold text-[#1E1B2E] hover:bg-[#F8F7FA] transition-colors"
                                        title="Copy notice reference link"
                                    >
                                        {copied ? <Check size={12} className="text-emerald-600" /> : <Share2 size={12} />}
                                        <span>{copied ? "Copied" : "Share"}</span>
                                    </button>
                                    <button
                                        onClick={handlePrint}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#2C2A46] text-white text-xs font-semibold hover:bg-[#1E1B2E] transition-colors"
                                        title="Print official notice document"
                                    >
                                        <Printer size={12} />
                                        <span>Print</span>
                                    </button>
                                </div>
                            </div>

                            {/* Official Document Sheet */}
                            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-280px)]">
                                
                                {/* Official Notice Letterhead */}
                                <div className="border-b border-[#E9E8F0] pb-6 space-y-4">
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6E5AE0]">
                                                Official Institutional Communique
                                            </p>
                                            <p className="text-xs text-[#8D8A9B]">
                                                Division of Academic Administration & Student Registry
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={cn(
                                                "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                                getNoticeTypeMeta(activeNotice.type).badgeClass
                                            )}>
                                                {getNoticeTypeMeta(activeNotice.type).label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Headline */}
                                    <h2 className="text-xl sm:text-2xl font-bold text-[#1E1B2E] leading-tight">
                                        {activeNotice.title}
                                    </h2>

                                    {/* Circular Metadata Details Bar */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-[#F1EFFB] text-xs">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B] block">Date Issued</span>
                                            <span className="font-semibold text-[#1E1B2E]">
                                                {format(new Date(activeNotice.createdAt), "MMMM d, yyyy")}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B] block">Target Audience</span>
                                            <span className="font-semibold text-[#1E1B2E]">
                                                All Enrolled Students
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D8A9B] block">Issuing Authority</span>
                                            <span className="font-semibold text-[#1E1B2E]">
                                                Academic Council
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Body Text - High Readability Typography */}
                                <div className="text-[#2C2A46] text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap font-normal">
                                    {activeNotice.content}
                                </div>



                                {/* Institutional Verification Seal */}
                                <div className="pt-6 border-t border-[#E9E8F0] flex items-center justify-between gap-4 text-xs text-[#8D8A9B] flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                                        <span>Digitally authorized and recorded in student institutional log.</span>
                                    </div>
                                    <span className="font-mono text-[11px]">
                                        STATUS: ACTIVE DIRECTIVE
                                    </span>
                                </div>

                            </div>
                        </div>
                    ) : null}

                </div>
            ) : (
                /* Empty State */
                <div className="bg-white rounded-[16px] border border-[#E9E8F0] p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#F7F7FA] border border-[#E9E8F0] flex items-center justify-center mx-auto text-[#8D8A9B]">
                        <Bell size={22} />
                    </div>
                    <h3 className="text-base font-bold text-[#1E1B2E]">No circulars found</h3>
                    <p className="text-xs text-[#8D8A9B] max-w-sm mx-auto">
                        There are no institutional circulars matching your selected filter or search terms.
                    </p>
                    {(search || filter !== "all") && (
                        <button
                            onClick={() => { setSearch(""); setFilter("all"); }}
                            className="px-4 py-2 rounded-full bg-[#2C2A46] text-white text-xs font-semibold hover:bg-[#1E1B2E] transition-colors"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            )}

        </div>
    );
}

function getNoticeTypeMeta(type) {
    switch (type) {
        case "urgent":
            return {
                label: "Urgent Directive",
                badgeClass: "bg-rose-50 text-rose-700 border border-rose-200/80",
                accentClass: "border-l-rose-500",
                dotClass: "bg-rose-500"
            };
        case "event":
            return {
                label: "Event Advisory",
                badgeClass: "bg-purple-50 text-purple-700 border border-purple-200/80",
                accentClass: "border-l-purple-500",
                dotClass: "bg-purple-500"
            };
        case "warning":
            return {
                label: "Advisory Notice",
                badgeClass: "bg-amber-50 text-amber-700 border border-amber-200/80",
                accentClass: "border-l-amber-500",
                dotClass: "bg-amber-500"
            };
        case "success":
            return {
                label: "Official Update",
                badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
                accentClass: "border-l-emerald-500",
                dotClass: "bg-emerald-500"
            };
        default:
            return {
                label: "General Notice",
                badgeClass: "bg-blue-50 text-blue-700 border border-blue-200/80",
                accentClass: "border-l-blue-500",
                dotClass: "bg-blue-500"
            };
    }
}

