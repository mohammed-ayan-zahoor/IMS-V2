"use client";

import { useState, useEffect } from "react";
import { 
    FileSignature, 
    Search, 
    Filter, 
    Printer, 
    Download, 
    TrendingUp, 
    School, 
    Calendar, 
    Mail, 
    Phone, 
    MapPin,
    Eye,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    User,
    ChevronDown,
    ChevronUp,
    FileText
} from "lucide-react";
import Button from "@/components/ui/Button";

const STATUSES = [
    { value: "new", label: "New", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { value: "contacted", label: "Contacted", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { value: "converted", label: "Converted", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { value: "rejected", label: "Rejected", color: "bg-rose-50 text-rose-700 border-rose-200" }
];

export default function MouTrackerPage() {
    const [submissions, setSubmissions] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const [expandedRow, setExpandedRow] = useState(null);
    const [savingNotes, setSavingNotes] = useState({});
    const [notesText, setNotesText] = useState({});

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                search,
                status: statusFilter,
                page: String(page),
                limit: "10"
            });
            const res = await fetch(`/api/v1/mou/submissions?${query}`);
            const data = await res.json();
            if (data.submissions) {
                setSubmissions(data.submissions);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error("Failed to fetch MOU submissions", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubmissions();
    }, [search, statusFilter, page]);

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            const res = await fetch(`/api/v1/mou/submissions/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                setSubmissions(prev => 
                    prev.map(sub => sub._id === id ? { ...sub, status: newStatus } : sub)
                );
            }
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    const handleSaveNotes = async (id) => {
        setSavingNotes(prev => ({ ...prev, [id]: true }));
        try {
            const res = await fetch(`/api/v1/mou/submissions/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes: notesText[id] || "" })
            });
            if (res.ok) {
                setSubmissions(prev => 
                    prev.map(sub => sub._id === id ? { ...sub, notes: notesText[id] } : sub)
                );
                alert("Notes updated successfully!");
            }
        } catch (error) {
            console.error("Failed to save notes", error);
        } finally {
            setSavingNotes(prev => ({ ...prev, [id]: false }));
        }
    };

    const toggleRow = (id, currentNotes) => {
        if (expandedRow === id) {
            setExpandedRow(null);
        } else {
            setExpandedRow(id);
            setNotesText(prev => ({ ...prev, [id]: currentNotes || "" }));
        }
    };

    // Derived counts for visual summary cards
    const totalPrints = submissions.filter(s => s.action === 'print').length;
    const totalPDFs = submissions.filter(s => s.action === 'download_pdf').length;
    const totalStudents = submissions.reduce((sum, s) => sum + (s.studentCount || 0), 0);
    const totalOpportunity = submissions.reduce((sum, s) => sum + (s.totalPrice || 0), 0);

    return (
        <div className="space-y-8 p-1">
            {/* Top Branding Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-8 shadow-xl shadow-indigo-950/20">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-500/20 text-indigo-400 p-2.5 rounded-2xl border border-indigo-500/30">
                            <FileSignature size={24} className="animate-pulse" />
                        </div>
                        <span className="bg-indigo-500/35 border border-indigo-500/40 text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full">
                            Staging Live Monitoring
                        </span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight mt-4">MOU Print & Download Tracker</h1>
                    <p className="text-slate-300 text-sm mt-2 max-w-xl">
                        Monitor, review, and track real-time MOU completions and sales opportunities across all prospect institutes.
                    </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shrink-0 text-right backdrop-blur-md">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Submissions</p>
                    <p className="text-4xl font-black text-indigo-400 mt-1">{pagination.total}</p>
                    <p className="text-[10px] text-slate-400 mt-1">across current pipeline</p>
                </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                    <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl">
                        <Printer size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Print Actions</p>
                        <p className="text-2xl font-black text-slate-800 mt-1">{totalPrints}</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                    <div className="bg-teal-50 text-teal-600 p-4 rounded-2xl">
                        <Download size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">PDF Downloads</p>
                        <p className="text-2xl font-black text-slate-800 mt-1">{totalPDFs}</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                    <div className="bg-amber-50 text-amber-600 p-4 rounded-2xl">
                        <School size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Student Leads</p>
                        <p className="text-2xl font-black text-slate-800 mt-1">{totalStudents.toLocaleString('en-IN')}</p>
                    </div>
                </div>
                <div className="bg-white border border-indigo-100 rounded-3xl p-6 shadow-md shadow-indigo-500/5 hover:shadow-lg transition-all flex items-center gap-4">
                    <div className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl">
                        <TrendingUp size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Est. Opportunity</p>
                        <p className="text-2xl font-black text-indigo-600 mt-1">₹{totalOpportunity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                </div>
            </div>

            {/* Filter and Table Controls */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 max-w-md relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by school, principal, email, or ref ID..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 shrink-0">
                            <Filter size={16} className="text-slate-500" />
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                                className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer"
                            >
                                <option value="">All Statuses</option>
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="converted">Converted</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                        <Button 
                            variant="secondary" 
                            onClick={() => { setSearch(""); setStatusFilter(""); setPage(1); }}
                            className="rounded-2xl"
                        >
                            Reset
                        </Button>
                    </div>
                </div>

                {/* Submissions Table */}
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ref & School</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Signatory</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Students</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated Price</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Action Taken</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center text-slate-400 font-medium">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                            <span>Retrieving secure pipeline submissions...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : submissions.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center text-slate-400 font-medium">
                                        No MOU submissions recorded matching current filters.
                                    </td>
                                </tr>
                            ) : (
                                submissions.map((sub) => {
                                    const isExpanded = expandedRow === sub._id;
                                    const statusObj = STATUSES.find(s => s.value === sub.status) || STATUSES[0];
                                    
                                    return (
                                        <>
                                            <tr key={sub._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4">
                                                    <p className="text-xs font-black text-indigo-500 uppercase tracking-wider">{sub.refId}</p>
                                                    <p className="text-sm font-bold text-slate-800 mt-1">{sub.schoolName}</p>
                                                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                                        <MapPin size={12} /> {sub.city}
                                                    </p>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                                        <User size={14} className="text-slate-400" /> {sub.principalName}
                                                    </p>
                                                    {sub.designation && (
                                                        <p className="text-xs text-slate-400 ml-5">{sub.designation}</p>
                                                    )}
                                                    <p className="text-xs text-slate-400 ml-5 mt-1 flex items-center gap-1">
                                                        <Mail size={12} /> {sub.contactEmail}
                                                    </p>
                                                </td>
                                                <td className="p-4 font-bold text-slate-800 text-sm">
                                                    {sub.studentCount.toLocaleString('en-IN')}
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-sm font-black text-slate-800">
                                                        ₹{sub.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                    <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                                                        70% Upfront: ₹{sub.upfrontPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {sub.action === 'print' ? (
                                                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-3 py-1 text-xs font-bold">
                                                            <Printer size={12} /> Printed
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-600 border border-teal-100 rounded-full px-3 py-1 text-xs font-bold">
                                                            <Download size={12} /> PDF Saved
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="relative">
                                                        <select
                                                            value={sub.status}
                                                            onChange={(e) => handleUpdateStatus(sub._id, e.target.value)}
                                                            className={`border rounded-full px-3 py-1 text-xs font-bold outline-none cursor-pointer transition-colors ${statusObj.color}`}
                                                        >
                                                            {STATUSES.map(opt => (
                                                                <option key={opt.value} value={opt.value}>
                                                                    {opt.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button
                                                        onClick={() => toggleRow(sub._id, sub.notes)}
                                                        className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                                                    >
                                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Expandable Section */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50/70 border-b border-slate-100">
                                                    <td colSpan="7" className="p-6">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                            {/* Additional School Details */}
                                                            <div className="bg-white border border-slate-200/60 rounded-2xl p-5 space-y-4">
                                                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Extended Information</h4>
                                                                <div className="space-y-2 text-sm text-slate-700">
                                                                    {sub.udiseCode && (
                                                                        <p><span className="font-bold text-slate-500">UDISE Code:</span> {sub.udiseCode}</p>
                                                                    )}
                                                                    {sub.contactPhone && (
                                                                        <p className="flex items-center gap-1.5">
                                                                            <Phone size={14} className="text-slate-400" /> {sub.contactPhone}
                                                                        </p>
                                                                    )}
                                                                    {sub.address && (
                                                                        <p className="text-xs leading-relaxed">
                                                                            <span className="font-bold text-slate-500">Full Address:</span><br />
                                                                            {sub.address}
                                                                        </p>
                                                                    )}
                                                                    <div className="pt-2 border-t border-slate-100 text-xs text-slate-400 space-y-1">
                                                                        <p>Logged IP: {sub.metadata?.ip}</p>
                                                                        <p className="truncate">Browser: {sub.metadata?.userAgent}</p>
                                                                        <p>Created: {new Date(sub.createdAt).toLocaleString('en-IN')}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Signature Canvas View */}
                                                            <div className="bg-white border border-slate-200/60 rounded-2xl p-5 flex flex-col justify-between">
                                                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Client Digital Signature</h4>
                                                                {sub.signatureDataUrl ? (
                                                                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-2 h-32 flex items-center justify-center overflow-hidden mt-3">
                                                                        <img 
                                                                            src={sub.signatureDataUrl} 
                                                                            alt="School Signatory Signature" 
                                                                            className="max-h-full max-w-full object-contain"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-sm text-slate-400 italic text-center py-10 mt-3">
                                                                        No digital signature was drawn during print action.
                                                                    </p>
                                                                )}
                                                            </div>

                                                            {/* Sales & Follow-up Notes */}
                                                            <div className="bg-white border border-slate-200/60 rounded-2xl p-5 flex flex-col justify-between">
                                                                <div>
                                                                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Sales Lead Comments & Notes</h4>
                                                                    <textarea
                                                                        value={notesText[sub._id] || ""}
                                                                        onChange={(e) => setNotesText(prev => ({ ...prev, [sub._id]: e.target.value }))}
                                                                        placeholder="Write internal comments, status notes or follow-up timelines..."
                                                                        rows="3"
                                                                        className="w-full mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700 resize-none"
                                                                    />
                                                                </div>
                                                                <div className="flex justify-end pt-3">
                                                                    <Button
                                                                        onClick={() => handleSaveNotes(sub._id)}
                                                                        disabled={savingNotes[sub._id]}
                                                                        className="rounded-xl px-4 py-2 text-xs"
                                                                    >
                                                                        {savingNotes[sub._id] ? "Saving..." : "Save Notes"}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                        <p className="text-xs text-slate-400">
                            Showing page {pagination.page} of {pagination.pages} ({pagination.total} entries)
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                disabled={page === 1}
                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                className="rounded-xl px-4 py-2 text-xs font-bold"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="secondary"
                                disabled={page === pagination.pages}
                                onClick={() => setPage(prev => Math.min(pagination.pages, prev + 1))}
                                className="rounded-xl px-4 py-2 text-xs font-bold"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
