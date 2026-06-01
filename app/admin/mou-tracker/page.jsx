"use client";

import { useState, useEffect, Fragment } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
    FileText,
    Plus,
    Landmark
} from "lucide-react";
import Button from "@/components/ui/Button";

const STATUSES = [
    { value: "new", label: "New", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { value: "contacted", label: "Contacted", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { value: "converted", label: "Converted", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { value: "rejected", label: "Rejected", color: "bg-rose-50 text-rose-700 border-rose-200" }
];

export default function MouTrackerPage() {
    const { data: session, status: sessionStatus } = useSession();
    const router = useRouter();

    const [submissions, setSubmissions] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const [expandedRow, setExpandedRow] = useState(null);
    const [savingNotes, setSavingNotes] = useState({});
    const [notesText, setNotesText] = useState({});

    // Payment collection modal states
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("upi");
    const [paymentReference, setPaymentReference] = useState("");
    const [paymentNotes, setPaymentNotes] = useState("");
    const [isRecordingPayment, setIsRecordingPayment] = useState(false);
    const [paymentError, setPaymentError] = useState(null);

    // Helpers
    const getMethodLabel = (method) => {
        const labels = {
            cash: 'Cash',
            card: 'Debit/Credit Card',
            upi: 'UPI (GPay/PhonePe)',
            bank_transfer: 'Bank Transfer / NEFT',
            cheque: 'Cheque'
        };
        return labels[method] || method;
    };

    const openPaymentModal = (sub) => {
        setSelectedSubmission(sub);
        
        // Compute default amount: if no payments recorded yet, default to upfront price.
        // Otherwise, default to remaining balance.
        const totalPaid = sub.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        const balance = Math.max(0, sub.totalPrice - totalPaid);
        
        if (totalPaid === 0) {
            setPaymentAmount(String(sub.upfrontPrice));
        } else {
            setPaymentAmount(String(balance));
        }
        
        setPaymentMethod("upi");
        setPaymentReference("");
        setPaymentNotes("");
        setPaymentError(null);
        setIsPaymentModalOpen(true);
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        if (!paymentAmount || isNaN(paymentAmount) || Number(paymentAmount) <= 0) {
            setPaymentError("Please enter a valid positive payment amount.");
            return;
        }

        setIsRecordingPayment(true);
        setPaymentError(null);

        try {
            const res = await fetch(`/api/v1/mou/submissions/${selectedSubmission._id}/payments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: Number(paymentAmount),
                    paymentMethod,
                    referenceId: paymentReference,
                    notes: paymentNotes
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to record payment.");
            }

            // Success
            setIsPaymentModalOpen(false);
            fetchSubmissions(); // Refresh dashboard list & statistics!
            
            // Automatically open dynamic print receipt in new tab
            window.open(`/admin/mou-tracker/receipt/${selectedSubmission._id}`, '_blank');
        } catch (err) {
            console.error("handleRecordPayment error:", err);
            setPaymentError(err.message || "Failed to submit payment transaction.");
        } finally {
            setIsRecordingPayment(false);
        }
    };

    // Client-side authentication role protection redirect
    useEffect(() => {
        if (sessionStatus === "authenticated" && session?.user?.role !== "super_admin") {
            router.push("/admin/dashboard");
        }
    }, [session, sessionStatus, router]);

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
        if (newStatus === "converted") {
            const sub = submissions.find(s => s._id === id);
            if (sub) {
                openPaymentModal(sub);
            }
            return;
        }

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
    if (sessionStatus === "loading" || (sessionStatus === "authenticated" && session?.user?.role !== "super_admin")) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

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
                                        <Fragment key={sub._id}>
                                            <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
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
                                                    <div className="flex items-center gap-2">
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
                                                        {sub.status === "converted" && (
                                                            <button
                                                                onClick={() => window.open(`/admin/mou-tracker/receipt/${sub._id}`, '_blank')}
                                                                title="Generate Commercial Receipt"
                                                                className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 hover:text-indigo-700 rounded-full px-3 py-1 text-xs font-bold transition-all shadow-sm"
                                                            >
                                                                <FileText size={12} /> Receipt
                                                            </button>
                                                        )}
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

                                                        {/* Payment History Management section (Only for Converted status leads) */}
                                                        {sub.status === 'converted' && (
                                                            <div className="mt-6 pt-6 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                <div className="md:col-span-2 bg-white border border-slate-200/60 rounded-2xl p-5">
                                                                    <div className="flex justify-between items-center mb-4">
                                                                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                                                            <Landmark size={14} className="text-indigo-500" /> Transaction Payment Logs ({(sub.payments || []).length})
                                                                        </h4>
                                                                        <button
                                                                            onClick={() => openPaymentModal(sub)}
                                                                            className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                                                                        >
                                                                            <Plus size={14} /> Record Payment
                                                                        </button>
                                                                    </div>
                                                                    
                                                                    {!sub.payments || sub.payments.length === 0 ? (
                                                                        <p className="text-xs text-slate-400 italic py-6 text-center">No payment logs recorded yet. Click "Record Payment" to track collections.</p>
                                                                    ) : (
                                                                        <div className="overflow-x-auto">
                                                                            <table className="w-full text-left text-xs border-collapse">
                                                                                <thead>
                                                                                    <tr className="border-b border-slate-100 text-slate-400 font-bold">
                                                                                        <th className="pb-2">Date</th>
                                                                                        <th className="pb-2">Method</th>
                                                                                        <th className="pb-2">Reference ID</th>
                                                                                        <th className="pb-2 text-right">Amount</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                                                                                    {sub.payments.map((p, index) => (
                                                                                        <tr key={p._id || index}>
                                                                                            <td className="py-2 text-slate-400">{new Date(p.paidDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                                                                            <td className="py-2 font-bold">{getMethodLabel(p.paymentMethod)}</td>
                                                                                            <td className="py-2 font-mono text-[10px] text-slate-500">{p.referenceId || "—"}</td>
                                                                                            <td className="py-2 text-right font-black text-slate-800">₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 flex flex-col justify-between">
                                                                    <div>
                                                                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Billing Ledger Summary</h4>
                                                                        <div className="space-y-3 mt-4">
                                                                            <div className="flex justify-between text-xs font-bold">
                                                                                <span className="text-slate-400">Total MOU Valuation:</span>
                                                                                <span className="font-mono text-slate-700 font-bold">₹{sub.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                                            </div>
                                                                            <div className="flex justify-between text-xs font-bold">
                                                                                <span className="text-slate-400">Cumulative Paid:</span>
                                                                                <span className="font-mono text-emerald-600 font-bold">₹{(sub.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                                            </div>
                                                                            <div className="flex justify-between text-xs font-black pt-2 border-t border-slate-100">
                                                                                <span>Remaining Balance:</span>
                                                                                <span className="font-mono text-indigo-600 font-black">₹{Math.max(0, sub.totalPrice - (sub.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="pt-4 mt-4 border-t border-slate-100">
                                                                        <button
                                                                            onClick={() => window.open(`/admin/mou-tracker/receipt/${sub._id}`, '_blank')}
                                                                            className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                                                                        >
                                                                            <FileText size={14} /> Print Commercial Receipt
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
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
            {/* Collect Payment Modal overlay */}
            {isPaymentModalOpen && selectedSubmission && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 text-white relative">
                            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                                <Landmark size={20} /> Record Commercial Payment
                            </h3>
                            <p className="text-xs text-indigo-100 font-medium uppercase tracking-wider mt-1">{selectedSubmission.schoolName}</p>
                            <button
                                type="button"
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="absolute top-4 right-4 text-indigo-200 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full"
                            >
                                <span className="sr-only">Close</span>
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleRecordPayment} className="p-6 space-y-5">
                            {paymentError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-2xl text-xs font-bold leading-relaxed">
                                    {paymentError}
                                </div>
                            )}

                            {/* Info Summary */}
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                                <div>
                                    <span className="text-slate-400 block mb-0.5">Total Valuation:</span>
                                    <span className="font-bold text-slate-800 text-sm">₹{selectedSubmission.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block mb-0.5">Already Paid:</span>
                                    <span className="font-bold text-emerald-600 text-sm">
                                        ₹{(selectedSubmission.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            {/* Amount input */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Amount Paid (₹)</label>
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    min="0.01"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder="Enter payment amount..."
                                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold text-slate-800"
                                />
                            </div>

                            {/* Payment Method select */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Payment Route / Method</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold text-slate-800 cursor-pointer bg-white"
                                >
                                    <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                                    <option value="bank_transfer">Bank Transfer / NEFT</option>
                                    <option value="cash">Cash Settlement</option>
                                    <option value="card">Debit / Credit Card</option>
                                    <option value="cheque">Cheque Payment</option>
                                </select>
                            </div>

                            {/* Reference Transaction ID */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Transaction Reference ID (Optional)</label>
                                <input
                                    type="text"
                                    value={paymentReference}
                                    onChange={(e) => setPaymentReference(e.target.value)}
                                    placeholder="e.g. UTR Number, Txn reference, cheque number..."
                                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-mono text-slate-800"
                                />
                            </div>

                            {/* Optional Notes */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Payment Comments / Notes (Optional)</label>
                                <textarea
                                    value={paymentNotes}
                                    onChange={(e) => setPaymentNotes(e.target.value)}
                                    placeholder="Comments..."
                                    rows="2"
                                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm text-slate-700 resize-none"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setIsPaymentModalOpen(false)}
                                    className="w-1/2 rounded-xl py-2.5 text-xs font-bold"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isRecordingPayment}
                                    className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-xs font-bold"
                                >
                                    {isRecordingPayment ? "Recording..." : "Record & View Receipt"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}
