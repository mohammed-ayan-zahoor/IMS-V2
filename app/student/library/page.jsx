"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    BookOpen,
    Clock,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Bookmark,
    Search,
    ChevronRight,
    Loader2,
    FileText,
    Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Skeleton from "@/components/shared/Skeleton";

export default function StudentLibraryPage() {
    const [libraryData, setLibraryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("loans"); // "loans" | "history" | "holds"

    useEffect(() => {
        fetchLibrary();
    }, []);

    const fetchLibrary = async () => {
        try {
            const res = await fetch("/api/v1/student/library");
            if (res.ok) {
                const data = await res.json();
                setLibraryData(data);
                setError(null);
            } else {
                setError("Unable to load library records.");
            }
        } catch (err) {
            console.error("Library Fetch Error:", err);
            setError("Network connection issue. Please refresh.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto pb-8">
                <Skeleton className="h-14 w-full rounded-[16px]" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-[14px]" />)}
                </div>
                <Skeleton className="h-64 w-full rounded-[16px]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
                <AlertCircle size={40} className="text-[#F4586A]" />
                <h3 className="text-[16px] font-bold text-[#1E1B2E]">Library Sync Issue</h3>
                <p className="text-[13px] text-[#8D8A9B]">{error}</p>
                <button
                    onClick={fetchLibrary}
                    className="px-4 py-2 rounded-full bg-[#6E5AE0] text-white text-[12px] font-medium"
                >
                    Retry
                </button>
            </div>
        );
    }

    const stats = libraryData?.stats || {
        currentlyBorrowed: 0,
        maxAllowed: 3,
        overdueCount: 0,
        totalFines: 0,
        totalReturned: 0
    };

    const activeLoans = libraryData?.activeLoans || [];
    const returnedHistory = libraryData?.returnedHistory || [];
    const activeHolds = libraryData?.activeHolds || [];

    // Filter active loans
    const filteredLoans = activeLoans.filter(l =>
        l.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.authors.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-8">
            
            {/* Header with Search & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9E8F0]">
                <div>
                    <h2 className="text-[18px] font-bold text-[#1E1B2E]">Student Library</h2>
                    <p className="text-[12px] text-[#8D8A9B]">Manage your active loans, due returns, and catalog reserves</p>
                </div>

                {/* Tab Pill Switcher */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-[#F1EFFB] p-1 rounded-full border border-[#E9E8F0]">
                        <button
                            onClick={() => setActiveTab("loans")}
                            className={cn(
                                "px-3.5 py-1 rounded-full text-[12px] font-medium transition-colors",
                                activeTab === "loans" ? "bg-white text-[#1E1B2E] shadow-sm" : "text-[#8D8A9B] hover:text-[#1E1B2E]"
                            )}
                        >
                            Active Loans ({activeLoans.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("history")}
                            className={cn(
                                "px-3.5 py-1 rounded-full text-[12px] font-medium transition-colors",
                                activeTab === "history" ? "bg-white text-[#1E1B2E] shadow-sm" : "text-[#8D8A9B] hover:text-[#1E1B2E]"
                            )}
                        >
                            History ({returnedHistory.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("holds")}
                            className={cn(
                                "px-3.5 py-1 rounded-full text-[12px] font-medium transition-colors",
                                activeTab === "holds" ? "bg-white text-[#1E1B2E] shadow-sm" : "text-[#8D8A9B] hover:text-[#1E1B2E]"
                            )}
                        >
                            Holds ({activeHolds.length})
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics Row (Adtech Spec: hairline-divided 1px border boxes, zero shadow) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-[14px] border border-[#E9E8F0] bg-white">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase tracking-wider">Borrowed</span>
                        <BookOpen size={15} className="text-[#6E5AE0]" />
                    </div>
                    <p className="text-[22px] font-bold text-[#1E1B2E] mt-1">
                        {stats.currentlyBorrowed} <span className="text-[13px] text-[#8D8A9B] font-normal">/ {stats.maxAllowed}</span>
                    </p>
                    <p className="text-[11px] text-[#8D8A9B]">Quota utilization</p>
                </div>

                <div className="p-4 rounded-[14px] border border-[#E9E8F0] bg-white">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase tracking-wider">Overdue</span>
                        <span className={cn("w-2 h-2 rounded-full", stats.overdueCount > 0 ? "bg-[#F4586A]" : "bg-[#33C481]")} />
                    </div>
                    <p className={cn("text-[22px] font-bold mt-1", stats.overdueCount > 0 ? "text-[#F4586A]" : "text-[#1E1B2E]")}>
                        {stats.overdueCount}
                    </p>
                    <p className="text-[11px] text-[#8D8A9B]">Books past deadline</p>
                </div>

                <div className="p-4 rounded-[14px] border border-[#E9E8F0] bg-white">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase tracking-wider">Pending Fines</span>
                        <Clock size={15} className="text-[#F4C24A]" />
                    </div>
                    <p className="text-[22px] font-bold text-[#1E1B2E] mt-1">₹{stats.totalFines}</p>
                    <p className="text-[11px] text-[#8D8A9B]">Accumulated late charges</p>
                </div>

                <div className="p-4 rounded-[14px] border border-[#E9E8F0] bg-white">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#8D8A9B] uppercase tracking-wider">Returned</span>
                        <CheckCircle2 size={15} className="text-[#33C481]" />
                    </div>
                    <p className="text-[22px] font-bold text-[#1E1B2E] mt-1">{stats.totalReturned}</p>
                    <p className="text-[11px] text-[#8D8A9B]">Completed borrowings</p>
                </div>
            </div>

            {/* Overdue Alert Banner if any */}
            {stats.overdueCount > 0 && (
                <div className="p-3.5 rounded-[12px] bg-[#FBE3E6] border border-[#F4586A]/20 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle size={18} className="text-[#F4586A] shrink-0" />
                        <p className="text-[12px] font-medium text-[#F4586A]">
                            You have {stats.overdueCount} overdue book(s). Please return them to the library counter to prevent additional late fees.
                        </p>
                    </div>
                </div>
            )}

            {/* Tab 1: Active Loans */}
            {activeTab === "loans" && (
                <div className="rounded-[16px] border border-[#E9E8F0] bg-white p-5 sm:p-6 space-y-4 shadow-none">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E9E8F0]">
                        <div>
                            <h3 className="text-[15px] font-bold text-[#1E1B2E]">Currently Issued Books</h3>
                            <p className="text-[12px] text-[#8D8A9B]">Books in your possession with countdown to return date</p>
                        </div>

                        {/* Search Pill */}
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D8A9B]" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by title or author"
                                className="w-52 sm:w-64 h-8 pl-8 pr-3 text-[12px] text-[#1E1B2E] placeholder:text-[#8D8A9B] bg-white border border-[#E9E8F0] rounded-full focus:outline-none focus:border-[#6E5AE0]"
                            />
                        </div>
                    </div>

                    {filteredLoans.length > 0 ? (
                        <div className="divide-y divide-[#E9E8F0]">
                            {filteredLoans.map((loan) => {
                                const dueDateFormatted = loan.dueDate ? format(new Date(loan.dueDate), "MMM d, yyyy") : "N/A";
                                const isOverdue = loan.isOverdue;
                                const isDueSoon = !isOverdue && loan.daysRemaining <= 3;

                                return (
                                    <div key={loan.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-start gap-3.5">
                                            {loan.coverUrl ? (
                                                <img
                                                    src={loan.coverUrl}
                                                    alt={loan.bookTitle}
                                                    className="w-12 h-16 rounded-[6px] object-cover border border-[#E9E8F0] shrink-0"
                                                />
                                            ) : (
                                                <div className="w-12 h-16 rounded-[6px] bg-[#F1EFFB] border border-[#E9E8F0] flex flex-col items-center justify-center text-[#6E5AE0] shrink-0">
                                                    <BookOpen size={20} />
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="text-[14px] font-bold text-[#1E1B2E] leading-tight">
                                                    {loan.bookTitle}
                                                </h4>
                                                <p className="text-[12px] text-[#8D8A9B] mt-0.5">
                                                    By {loan.authors?.length > 0 ? loan.authors.join(", ") : "Unknown Author"}
                                                </p>
                                                <div className="flex items-center gap-3 text-[11px] text-[#8D8A9B] mt-2 flex-wrap">
                                                    <span>Accession: <span className="font-medium text-[#1E1B2E]">{loan.accessionNumber}</span></span>
                                                    {loan.shelfLocation && (
                                                        <>
                                                            <span>•</span>
                                                            <span>Shelf: <span className="font-medium text-[#1E1B2E]">{loan.shelfLocation}</span></span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 md:text-right self-end md:self-center">
                                            <div>
                                                <p className="text-[11px] text-[#8D8A9B]">Due Date</p>
                                                <p className="text-[13px] font-bold text-[#1E1B2E]">{dueDateFormatted}</p>
                                            </div>

                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-[11px] font-semibold tracking-tight",
                                                isOverdue && "bg-[#FBE3E6] text-[#F4586A]",
                                                isDueSoon && "bg-[#FEF6E6] text-[#D97706]",
                                                !isOverdue && !isDueSoon && "bg-[#EDE8FB] text-[#6E5AE0]"
                                            )}>
                                                {isOverdue
                                                    ? `Overdue (${Math.abs(loan.daysRemaining)}d)`
                                                    : isDueSoon
                                                        ? `Due in ${loan.daysRemaining} days`
                                                        : `${loan.daysRemaining} days left`}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-[#8D8A9B]">
                            <BookOpen size={32} className="mx-auto text-[#8D8A9B]/40 mb-2" />
                            <h4 className="text-[14px] font-bold text-[#1E1B2E]">No Books Currently Issued</h4>
                            <p className="text-[12px] text-[#8D8A9B] mt-0.5">Visit the campus library or reserve a book online</p>
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: Borrowing History */}
            {activeTab === "history" && (
                <div className="rounded-[16px] border border-[#E9E8F0] bg-white p-5 sm:p-6 space-y-4 shadow-none">
                    <div className="pb-3 border-b border-[#E9E8F0]">
                        <h3 className="text-[15px] font-bold text-[#1E1B2E]">Borrowing History</h3>
                        <p className="text-[12px] text-[#8D8A9B]">Past transactions and returned records</p>
                    </div>

                    {returnedHistory.length > 0 ? (
                        <div className="divide-y divide-[#E9E8F0]">
                            {returnedHistory.map((item, idx) => (
                                <div key={idx} className="py-3 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-[8px] bg-[#E8F8F0] flex items-center justify-center text-[#059669] shrink-0">
                                            <CheckCircle2 size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-bold text-[#1E1B2E]">{item.book?.title || "Book Title"}</p>
                                            <p className="text-[11px] text-[#8D8A9B]">
                                                Returned on {item.returnedAt ? format(new Date(item.returnedAt), "MMM d, yyyy") : "N/A"}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full bg-[#E8F8F0] text-[#059669] text-[11px] font-semibold">
                                        Returned
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-[#8D8A9B]">
                            <p className="text-[13px]">No past returned books on record.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Tab 3: Active Holds */}
            {activeTab === "holds" && (
                <div className="rounded-[16px] border border-[#E9E8F0] bg-white p-5 sm:p-6 space-y-4 shadow-none">
                    <div className="pb-3 border-b border-[#E9E8F0]">
                        <h3 className="text-[15px] font-bold text-[#1E1B2E]">Reserved Book Holds</h3>
                        <p className="text-[12px] text-[#8D8A9B]">Reserved titles awaiting pickup at the circulation desk</p>
                    </div>

                    {activeHolds.length > 0 ? (
                        <div className="divide-y divide-[#E9E8F0]">
                            {activeHolds.map((hold, idx) => (
                                <div key={idx} className="py-3 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-[8px] bg-[#FEF6E6] flex items-center justify-center text-[#D97706] shrink-0">
                                            <Bookmark size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-bold text-[#1E1B2E]">{hold.book?.title || "Title"}</p>
                                            <p className="text-[11px] text-[#8D8A9B]">
                                                Requested on {hold.requestedAt ? format(new Date(hold.requestedAt), "MMM d, yyyy") : "N/A"}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full bg-[#FEF6E6] text-[#D97706] text-[11px] font-semibold capitalize">
                                        {hold.status === 'ready' ? 'Ready for Pickup' : 'Waiting in Queue'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-[#8D8A9B]">
                            <p className="text-[13px]">No active book reservations.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
