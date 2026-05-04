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

    const fetchQueue = async () => {
        try {
            setLoading(true);
            const sessionParam = isSchool && selectedSessionId ? `session=${selectedSessionId}` : "";
            const allSessionsParam = showAllSessions ? "allSessions=true" : "";
            const queryParams = [sessionParam, allSessionsParam].filter(Boolean).join("&");
            
            const res = await fetch(`/api/v1/reports/follow-ups${queryParams ? `?${queryParams}` : ""}`);
            const data = await res.json();
            if (data.queue) {
                setQueue(data.queue);
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

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <History className="text-premium-blue" size={32} />
                    Follow-up Queue
                </h1>
                <p className="text-slate-500 font-medium mt-1">
                    Manage your daily calls and potential enquiries in one place.
                </p>
            </div>

            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                        isWarning={stats.overdue > 0}
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

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-200 outline-none focus:ring-4 focus:ring-premium-blue/10 focus:border-premium-blue transition-all font-medium text-sm"
                        placeholder="Search by name or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <FilterButton active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>All</FilterButton>
                    <FilterButton active={typeFilter === "Enquiry"} onClick={() => setTypeFilter("Enquiry")}>Enquiries</FilterButton>
                    <FilterButton active={typeFilter === "Student"} onClick={() => setTypeFilter("Student")}>Students</FilterButton>
                </div>
                
                {isSchool && (
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2">
                        <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Session Filter:</label>
                        <button 
                            onClick={() => setShowAllSessions(!showAllSessions)}
                            className={cn(
                                "text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-all",
                                showAllSessions 
                                ? "bg-amber-100 text-amber-700" 
                                : "bg-blue-100 text-blue-700"
                            )}
                        >
                            {showAllSessions ? "All Sessions" : selectedSessionName}
                        </button>
                    </div>
                )}
            </div>

            {/* Export Controls */}
            <Card className="p-4 border-slate-200">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-bold text-slate-600">Export Date:</label>
                        <input 
                            type="date" 
                            value={exportDate}
                            onChange={(e) => setExportDate(e.target.value)}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-premium-blue/10 focus:border-premium-blue outline-none"
                        />
                        <button
                            onClick={setToday}
                            className="px-4 py-2 text-xs font-bold text-premium-blue hover:bg-premium-blue/10 rounded-xl transition-colors"
                        >
                            Today
                        </button>
                    </div>
                    <Button 
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center gap-2"
                    >
                        <Download size={16} />
                        {isExporting ? "Exporting..." : "Export"}
                    </Button>
                </div>
            </Card>

            {/* Queue List */}
            <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Target</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Context</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Due Date</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Last Comment</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredQueue.length > 0 ? (
                                filteredQueue.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl border ${
                                                    item.type === 'Enquiry' 
                                                    ? 'bg-purple-50 border-purple-100 text-purple-600' 
                                                    : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                                }`}>
                                                    {item.type === 'Enquiry' ? <Users size={18} /> : <UserCheck size={18} />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{item.name}</p>
                                                    <p className="text-xs text-slate-500 font-medium">{item.contact}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <Badge variant="soft" className="text-[10px] uppercase font-bold">
                                                {item.subType}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-bold ${
                                                    isPast(new Date(item.dueDate)) && !isToday(new Date(item.dueDate))
                                                    ? 'text-red-500' 
                                                    : isToday(new Date(item.dueDate))
                                                    ? 'text-premium-blue'
                                                    : 'text-slate-600'
                                                }`}>
                                                    {format(new Date(item.dueDate), "MMM dd, yyyy")}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                    {isToday(new Date(item.dueDate)) ? "Due Today" : isPast(new Date(item.dueDate)) ? "Overdue" : "Upcoming"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-sm text-slate-600 italic line-clamp-1 max-w-[200px]" title={item.lastResponse}>
                                                "{item.lastResponse}"
                                            </p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`tel:${item.contact}`} title="Call Now">
                                                    <Button size="sm" variant="ghost" className="text-premium-blue hover:bg-premium-blue/10">
                                                        <Phone size={16} />
                                                    </Button>
                                                </Link>
                                                <Link href={`https://wa.me/${item.contact}`} target="_blank" title="WhatsApp Message">
                                                    <Button size="sm" variant="ghost" className="text-emerald-600 hover:bg-emerald-50">
                                                        <MessageCircle size={16} />
                                                    </Button>
                                                </Link>
                                                <Link href={item.link}>
                                                    <Button size="sm" variant="outline" className="flex items-center gap-2">
                                                        View <ExternalLink size={12} />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="py-20">
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
            </Card>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, isWarning }) {
    const colors = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        red: "bg-red-50 text-red-600 border-red-100",
        purple: "bg-purple-50 text-purple-600 border-purple-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100"
    };

    return (
        <Card className={`p-6 border ${colors[color]} ${isWarning ? 'animate-pulse' : ''}`}>
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${colors[color]} bg-white shadow-sm border`}>
                    <Icon size={24} />
                </div>
                <div>
                    <h3 className="text-2xl font-black">{value}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
                </div>
            </div>
        </Card>
    );
}

function FilterButton({ children, active, onClick }) {
    return (
        <button 
            onClick={onClick}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                active 
                ? "bg-premium-blue text-white border-premium-blue shadow-lg shadow-premium-blue/20" 
                : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"
            }`}
        >
            {children}
        </button>
    );
}
