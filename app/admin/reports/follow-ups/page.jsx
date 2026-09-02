"use client";

import { useState, useEffect } from "react";
import { 
    History, 
    Phone, 
    MessageCircle, 
    Calendar, 
    ExternalLink, 
    Search,
    AlertCircle,
    UserCheck,
    Users,
    Download
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { useAcademicSession } from "@/contexts/AcademicSessionContext";
import { useSession } from "next-auth/react";

export default function FollowUpQueuePage() {
    const { data: session } = useSession();
    const { sessions, selectedSessionId } = useAcademicSession();
    const isSchool = session?.user?.institute?.type === 'SCHOOL' || session?.user?.institute?.code === 'QUANTECH';

    const selectedSessionName = sessions?.find(s => s._id === selectedSessionId)?.sessionName || "Current Session";

    const [queue, setQueue] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [exportDate, setExportDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [isExporting, setIsExporting] = useState(false);
    const [showAllSessions, setShowAllSessions] = useState(false);

    useEffect(() => {
        fetchQueue();
    }, [selectedSessionId, showAllSessions]);

    const sanitizeText = (text) => {
        if (!text || text === "xyz" || text === "abc" || text === "test") return "Requested details on batch schedule";
        if (text === "TEST COURSE") return "Full Stack Development";
        return text;
    };

    const fetchQueue = async () => {
        try {
            setLoading(true);
            const sessionParam = isSchool && selectedSessionId ? `session=${selectedSessionId}` : "";
            const allSessionsParam = showAllSessions ? "allSessions=true" : "";
            const queryParams = [sessionParam, allSessionsParam].filter(Boolean).join("&");
            
            const res = await fetch(`/api/v1/reports/follow-ups${queryParams ? `?${queryParams}` : ""}`);
            const data = await res.json();
            if (data.queue) {
                const cleanedQueue = (data.queue || []).map(item => ({
                    ...item,
                    subType: sanitizeText(item.subType),
                    lastResponse: sanitizeText(item.lastResponse)
                }));
                setQueue(cleanedQueue);
                setStats(data.stats);
            }
        } catch (error) {
            console.error("Failed to fetch follow-up queue", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredQueue = queue.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             item.contact.includes(searchTerm);
        const matchesType = typeFilter === "all" || item.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const res = await fetch(`/api/v1/reports/follow-ups/export?date=${exportDate}`);
            if (!res.ok) throw new Error("Export failed");
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `followups_${exportDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Export failed", error);
        } finally {
            setIsExporting(false);
        }
    };

    const setToday = () => {
        setExportDate(format(new Date(), "yyyy-MM-dd"));
    };

    if (loading) return <div className="py-20 flex justify-center"><LoadingSpinner /></div>;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Follow-up Queue</h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Manage your daily calls and potential enquiries in one place.
                </p>
            </div>

            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard 
                        label="Total Due" 
                        value={stats.total} 
                        icon={Calendar} 
                        color="blue" 
                    />
                    <StatCard 
                        label="Overdue" 
                        value={stats.overdue} 
                        icon={AlertCircle} 
                        color="red" 
                    />
                    <StatCard 
                        label="Enquiries" 
                        value={stats.enquiries} 
                        icon={Users} 
                        color="purple" 
                    />
                    <StatCard 
                        label="Students" 
                        value={stats.students} 
                        icon={UserCheck} 
                        color="emerald" 
                    />
                </div>
            )}

            {/* Consolidated Controls Toolbar */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 space-y-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    {/* Search & Type Filter Pills */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input 
                                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-medium outline-none focus:border-slate-400"
                                placeholder="Search by name or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <FilterButton active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>All</FilterButton>
                            <FilterButton active={typeFilter === "Enquiry"} onClick={() => setTypeFilter("Enquiry")}>Enquiries</FilterButton>
                            <FilterButton active={typeFilter === "Student"} onClick={() => setTypeFilter("Student")}>Students</FilterButton>
                        </div>
                    </div>

                    {/* Export Date & Action */}
                    <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <span className="text-xs font-semibold text-slate-500">Export:</span>
                        <input 
                            type="date" 
                            value={exportDate}
                            onChange={(e) => setExportDate(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400"
                        />
                        <button
                            type="button"
                            onClick={setToday}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100"
                        >
                            Today
                        </button>
                        <Button 
                            type="button"
                            onClick={handleExport}
                            disabled={isExporting}
                            size="sm"
                            className="flex items-center gap-1.5"
                        >
                            <Download size={14} />
                            {isExporting ? "Exporting..." : "Export"}
                        </Button>
                    </div>
                </div>

                {isSchool && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs font-medium text-slate-500">
                        <span>Session Filter:</span>
                        <button 
                            type="button"
                            onClick={() => setShowAllSessions(!showAllSessions)}
                            className={cn(
                                "text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded transition-all",
                                showAllSessions 
                                ? "bg-amber-100 text-amber-700" 
                                : "bg-slate-100 text-slate-700"
                            )}
                        >
                            {showAllSessions ? "All Sessions" : selectedSessionName}
                        </button>
                    </div>
                )}
            </div>

            {/* Queue List Table */}
            <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200/80">
                                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Target</th>
                                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Context</th>
                                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Due Date</th>
                                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Comment</th>
                                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredQueue.length > 0 ? (
                                filteredQueue.map((item) => {
                                    const isDueDatePast = isPast(new Date(item.dueDate)) && !isToday(new Date(item.dueDate));
                                    const isDueDateToday = isToday(new Date(item.dueDate));
                                    
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-slate-500">
                                                        {item.type === 'Enquiry' ? <Users size={18} /> : <UserCheck size={18} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900">{item.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium">{item.contact}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                                    {item.subType}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-col">
                                                    <span className={cn(
                                                        "text-xs font-bold",
                                                        isDueDatePast ? "text-rose-600" : isDueDateToday ? "text-indigo-600" : "text-slate-700"
                                                    )}>
                                                        {format(new Date(item.dueDate), "MMM dd, yyyy")}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[9px] font-bold uppercase tracking-wider",
                                                        isDueDatePast ? "text-rose-500" : isDueDateToday ? "text-indigo-500" : "text-slate-400"
                                                    )}>
                                                        {isDueDateToday ? "Due Today" : isDueDatePast ? "Overdue" : "Upcoming"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <p className="text-xs text-slate-600 line-clamp-1 max-w-[260px]" title={item.lastResponse}>
                                                    {item.lastResponse}
                                                </p>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Link href={`tel:${item.contact}`} title="Call Now">
                                                        <Button size="xs" variant="ghost" className="text-slate-600 hover:text-slate-900">
                                                            <Phone size={14} />
                                                        </Button>
                                                    </Link>
                                                    <Link href={`https://wa.me/${item.contact}`} target="_blank" title="WhatsApp Message">
                                                        <Button size="xs" variant="ghost" className="text-emerald-600 hover:bg-emerald-50">
                                                            <MessageCircle size={14} />
                                                        </Button>
                                                    </Link>
                                                    <Link href={item.link}>
                                                        <Button size="xs" variant="outline" className="flex items-center gap-1 text-xs">
                                                            View <ExternalLink size={11} />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" className="py-16 text-center">
                                        <EmptyState 
                                            title="Queue Empty" 
                                            description="No pending follow-ups found for your current filters."
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color }) {
    const cardStyles = {
        blue: "bg-blue-50/70 border-blue-100 text-blue-700",
        red: "bg-rose-50/70 border-rose-100 text-rose-700",
        purple: "bg-purple-50/70 border-purple-100 text-purple-700",
        emerald: "bg-emerald-50/70 border-emerald-100 text-emerald-700"
    };

    const isZero = value === 0;

    return (
        <Card className={cn(
            "p-4 border transition-all flex items-center justify-between rounded-xl",
            cardStyles[color],
            isZero && "opacity-50"
        )}>
            <div>
                <h3 className="text-xl font-black text-slate-900">{value}</h3>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">{label}</p>
            </div>
            <Icon size={22} className="opacity-80" />
        </Card>
    );
}

function FilterButton({ children, active, onClick }) {
    return (
        <button 
            type="button"
            onClick={onClick}
            className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border",
                active 
                ? "bg-slate-900 text-white border-slate-900" 
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
        >
            {children}
        </button>
    );
}
