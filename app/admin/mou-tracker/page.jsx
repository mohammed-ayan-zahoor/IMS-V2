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
    Landmark,
    Trash2,
    RefreshCw,
    Tag
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

    // Manual MOU Entry Modal states (for technical issues / offline process)
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [isSavingManual, setIsSavingManual] = useState(false);
    const [manualError, setManualError] = useState(null);
    const [manualForm, setManualForm] = useState({
        schoolName: "",
        city: "",
        principalName: "",
        designation: "Principal",
        contactEmail: "",
        contactPhone: "",
        studentCount: "",
        yr1: "",
        yr2: "",
        yr3: "",
        instituteType: "school",
        mouDuration: "1",
        planType: "standard",
        customRate: "",
        coupon: "",
        udiseCode: "",
        address: "",
        action: "manual_entry",
        status: "new",
        notes: ""
    });


    const handleCreateManualEntry = async (e) => {
        e.preventDefault();
        const isCollege = manualForm.instituteType !== "school";

        if (!manualForm.schoolName || !manualForm.city || !manualForm.principalName || !manualForm.contactEmail) {
            setManualError("Please fill out all required fields (Name, City, Principal, Email).");
            return;
        }

        let count, totalPrice, upfrontPrice, rate, yearWiseCounts;
        const duration = parseInt(manualForm.mouDuration) || 1;

        if (isCollege) {
            const yr1 = parseInt(manualForm.yr1) || 0;
            const yr2 = parseInt(manualForm.yr2) || 0;
            const yr3 = manualForm.instituteType === "college_degree" ? (parseInt(manualForm.yr3) || 0) : 0;
            if (yr1 + yr2 + yr3 === 0) {
                setManualError("Please enter at least one year-wise student count.");
                return;
            }
            count = yr1 + yr2 + yr3;
            yearWiseCounts = { yr1, yr2, yr3 };
            const isSDC = ['SDC', 'SDC20', 'SDC-SPECIAL'].includes((manualForm.coupon || '').trim().toUpperCase());
            const yr2Rate = isSDC ? 20 : 30;
            const yr3Rate = isSDC ? 20 : 30;
            const yearlyTotal = (yr1 * 59) + (yr2 * yr2Rate) + (yr3 * yr3Rate);
            totalPrice = yearlyTotal * duration;
            rate = Math.round(totalPrice / count);
        } else {
            count = parseInt(manualForm.studentCount) || 0;
            if (count <= 0) {
                setManualError("Please enter a valid student count (> 0).");
                return;
            }
            rate = 59;
            if (manualForm.planType === "plus") rate = 69;
            else if (manualForm.planType === "custom") {
                rate = parseFloat(manualForm.customRate);
                if (!rate || rate <= 0) {
                    setManualError("Please enter a valid positive custom per-student rate.");
                    return;
                }
            }
            totalPrice = count * rate * duration;
        }

        let upfrontPercent = count <= 500 ? 1 : count <= 1000 ? 0.75 : 0.5;
        upfrontPrice = totalPrice * upfrontPercent;
        const refId = `QP/MOU/MANUAL-${Math.floor(1000 + Math.random() * 9000)}`;

        setIsSavingManual(true);
        setManualError(null);

        try {
            const res = await fetch("/api/v1/mou/submissions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    refId,
                    schoolName: manualForm.schoolName.trim(),
                    city: manualForm.city.trim(),
                    principalName: manualForm.principalName.trim(),
                    designation: manualForm.designation.trim() || "Principal",
                    contactEmail: manualForm.contactEmail.trim(),
                    contactPhone: manualForm.contactPhone.trim(),
                    studentCount: count,
                    mouDuration: duration,
                    perStudentRate: rate,
                    planType: isCollege ? "custom" : manualForm.planType,
                    instituteType: manualForm.instituteType,
                    ...(yearWiseCounts && { yearWiseCounts }),
                    udiseCode: manualForm.udiseCode.trim(),
                    address: manualForm.address.trim(),
                    totalPrice,
                    upfrontPrice,
                    action: manualForm.action || "manual_entry",
                    status: manualForm.status || "new",
                    notes: manualForm.notes.trim() ? manualForm.notes.trim() : "Manually entered due to technical problem / offline MOU processing."
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create manual MOU entry.");

            setIsManualModalOpen(false);
            setManualForm({
                schoolName: "", city: "", principalName: "", designation: "Principal",
                contactEmail: "", contactPhone: "", studentCount: "",
                yr1: "", yr2: "", yr3: "", instituteType: "school",
                mouDuration: "1", planType: "standard", customRate: "",
                udiseCode: "", address: "", action: "manual_entry", status: "new", notes: ""
            });
            fetchSubmissions();
        } catch (err) {
            console.error("handleCreateManualEntry error:", err);
            setManualError(err.message || "Failed to create manual entry.");
        } finally {
            setIsSavingManual(false);
        }
    };


    const handleDeletePayment = async (submissionId, paymentId, paymentAmount) => {
        if (!confirm(`Are you sure you want to revoke/delete this payment entry of ₹${paymentAmount.toLocaleString('en-IN')}? This will update the total paid amount.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/v1/mou/submissions/${submissionId}/payments?paymentId=${paymentId}`, {
                method: "DELETE"
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to delete payment.");
            }

            fetchSubmissions(false);
        } catch (error) {
            console.error("Failed to delete payment:", error);
            alert(error.message || "Failed to delete payment.");
        }
    };

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

    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchSubmissions = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const query = new URLSearchParams({
                search,
                status: statusFilter,
                page: String(page),
                limit: "10"
            });
            const res = await fetch(`/api/v1/mou/submissions?${query}`, { cache: "no-store" });
            const data = await res.json();
            if (data.submissions) {
                setSubmissions(data.submissions);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error("Failed to fetch MOU submissions", error);
        } finally {
            if (showLoading) setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSubmissions(true);

        // Auto-poll every 10 seconds for real-time live sync
        const interval = setInterval(() => {
            fetchSubmissions(false);
        }, 10000);

        return () => clearInterval(interval);
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

    const handleDeleteSubmission = async (id) => {
        if (!confirm("Are you sure you want to permanently delete this MOU submission? This action cannot be undone.")) {
            return;
        }
        
        try {
            const res = await fetch(`/api/v1/mou/submissions/${id}`, {
                method: "DELETE"
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to delete submission.");
            }
            
            setSubmissions(prev => prev.filter(sub => sub._id !== id));
            alert("MOU submission deleted successfully.");
            fetchSubmissions();
        } catch (error) {
            console.error("Failed to delete MOU submission:", error);
            alert(error.message || "Failed to delete submission.");
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
                        <Button 
                            variant="secondary"
                            onClick={() => { setIsRefreshing(true); fetchSubmissions(false); }}
                            disabled={isRefreshing}
                            className="rounded-2xl flex items-center gap-2"
                        >
                            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-indigo-600" : "text-slate-500"} /> Refresh
                        </Button>
                        <Button 
                            onClick={() => { setManualError(null); setIsManualModalOpen(true); }}
                            className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 px-4 py-3 text-xs shadow-sm shadow-indigo-500/20"
                        >
                            <Plus size={16} /> Add Manual MOU
                        </Button>
                        <Button 
                            onClick={() => router.push('/super-admin/coupons')}
                            className="rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-2 px-4 py-3 text-xs shadow-sm shadow-amber-500/20"
                        >
                            <Tag size={16} /> MOU Coupons
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
                                                        Upfront: ₹{sub.upfrontPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                        <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5">
                                                            ₹{sub.perStudentRate || 59}/student ({sub.planType === 'plus' ? 'Plus Plan' : sub.planType === 'custom' ? 'Custom' : 'Standard'})
                                                        </span>
                                                        {sub.mouDuration && (
                                                            <span className="text-[10px] text-slate-500 font-bold">
                                                                📅 {sub.mouDuration} Yr
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {sub.action === 'print' ? (
                                                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-3 py-1 text-xs font-bold">
                                                            <Printer size={12} /> Printed
                                                        </span>
                                                    ) : sub.action === 'download_pdf' ? (
                                                        <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-600 border border-teal-100 rounded-full px-3 py-1 text-xs font-bold">
                                                            <Download size={12} /> PDF Saved
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-full px-3 py-1 text-xs font-bold">
                                                            <FileSignature size={12} /> Manual Entry
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
                                                        <button
                                                            onClick={() => handleDeleteSubmission(sub._id)}
                                                            title="Delete MOU Submission"
                                                            className="inline-flex items-center justify-center p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
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
                                                                    {sub.mouDuration && (
                                                                        <p className="flex items-center gap-1.5">
                                                                            <span className="font-bold text-slate-500">Agreement Duration:</span>
                                                                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-2 py-0.5 text-xs font-black">{sub.mouDuration} {sub.mouDuration === 1 ? 'Year' : 'Years'}</span>
                                                                        </p>
                                                                    )}
                                                                    {sub.instituteType && sub.instituteType !== 'school' && (
                                                                        <p className="flex items-center gap-1.5">
                                                                            <span className="font-bold text-slate-500">Institute Type:</span>
                                                                            <span className="bg-violet-50 text-violet-700 border border-violet-100 rounded-full px-2 py-0.5 text-xs font-black">
                                                                                {sub.instituteType === 'college_degree' ? 'Degree College (3yr)' : 'PU / Diploma College (2yr)'}
                                                                            </span>
                                                                        </p>
                                                                    )}
                                                                    {/* College year-wise breakdown */}
                                                                    {sub.yearWiseCounts && (sub.yearWiseCounts.yr1 > 0 || sub.yearWiseCounts.yr2 > 0 || sub.yearWiseCounts.yr3 > 0) && (() => {
                                                                        const isSDCSub = sub.coupon && ['SDC', 'SDC20', 'SDC-SPECIAL'].includes(sub.coupon.toUpperCase());
                                                                        const yr2Rate = isSDCSub ? 20 : 30;
                                                                        const yr3Rate = isSDCSub ? 20 : 30;
                                                                        return (
                                                                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5 text-xs">
                                                                            <div className="flex justify-between items-center mb-2">
                                                                                <p className="font-black text-slate-500 uppercase tracking-wider text-[10px]">ID Card Year-wise Breakdown</p>
                                                                                {sub.coupon && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-1.5 py-0.5 rounded">Coupon: {sub.coupon}</span>}
                                                                            </div>
                                                                            <div className="flex justify-between">
                                                                                <span className="text-emerald-600 font-bold">1st Year (₹59/student)</span>
                                                                                <span className="font-mono font-bold">{(sub.yearWiseCounts.yr1 || 0).toLocaleString('en-IN')} × ₹59 = ₹{((sub.yearWiseCounts.yr1 || 0) * 59).toLocaleString('en-IN')}</span>
                                                                            </div>
                                                                            <div className="flex justify-between">
                                                                                <span className="text-indigo-600 font-bold">2nd Year (₹{yr2Rate}/student)</span>
                                                                                <span className="font-mono font-bold">{(sub.yearWiseCounts.yr2 || 0).toLocaleString('en-IN')} × ₹{yr2Rate} = ₹{((sub.yearWiseCounts.yr2 || 0) * yr2Rate).toLocaleString('en-IN')}</span>
                                                                            </div>
                                                                            {sub.instituteType === 'college_degree' && (
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-indigo-600 font-bold">3rd Year (₹{yr3Rate}/student)</span>
                                                                                    <span className="font-mono font-bold">{(sub.yearWiseCounts.yr3 || 0).toLocaleString('en-IN')} × ₹{yr3Rate} = ₹{((sub.yearWiseCounts.yr3 || 0) * yr3Rate).toLocaleString('en-IN')}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        );
                                                                    })()}
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
                                                                                        <th className="pb-2 text-center">Action</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                                                                                    {sub.payments.map((p, index) => (
                                                                                        <tr key={p._id || index}>
                                                                                            <td className="py-2 text-slate-400">{new Date(p.paidDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                                                                            <td className="py-2 font-bold">{getMethodLabel(p.paymentMethod)}</td>
                                                                                            <td className="py-2 font-mono text-[10px] text-slate-500">{p.referenceId || "—"}</td>
                                                                                            <td className="py-2 text-right font-black text-slate-800">₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                                                            <td className="py-2 text-center">
                                                                                                <button
                                                                                                    onClick={() => handleDeletePayment(sub._id, p._id, p.amount)}
                                                                                                    title="Revoke / Delete Payment"
                                                                                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
                                                                                                >
                                                                                                    <Trash2 size={13} />
                                                                                                </button>
                                                                                            </td>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
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

            {/* MANUAL MOU ENTRY MODAL (For technical issues / missing online logs) */}
            {isManualModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-fade-in">
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Add Manual MOU Record</h3>
                                <p className="text-xs text-slate-400 mt-1">Record a submission manually if the client experienced a technical issue or offline process.</p>
                            </div>
                            <button
                                onClick={() => setIsManualModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        {manualError && (
                            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-bold border border-rose-100 flex items-center gap-2">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{manualError}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreateManualEntry} className="space-y-4">
                            {/* Institute Type Toggle */}
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                                <label className="text-xs font-black uppercase text-slate-400 tracking-wider block mb-3">Institution Type</label>
                                <div className="flex flex-wrap gap-4">
                                    {[
                                        { value: "school", label: "School / Jr. College" },
                                        { value: "college_degree", label: "Degree College (3 Yrs)" },
                                        { value: "college_pu", label: "PU / Diploma (2 Yrs)" }
                                    ].map(opt => (
                                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm font-bold text-indigo-800">
                                            <input
                                                type="radio"
                                                name="manualInstType"
                                                value={opt.value}
                                                checked={manualForm.instituteType === opt.value}
                                                onChange={() => setManualForm({ ...manualForm, instituteType: opt.value })}
                                                className="accent-indigo-600 w-4 h-4"
                                            />
                                            {opt.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-wider">School / Institute Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={manualForm.schoolName}
                                        onChange={(e) => setManualForm({ ...manualForm, schoolName: e.target.value })}
                                        placeholder="e.g. SCDS College, Hubli"
                                        className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm text-slate-800 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-wider">City *</label>
                                    <input
                                        type="text"
                                        required
                                        value={manualForm.city}
                                        onChange={(e) => setManualForm({ ...manualForm, city: e.target.value })}
                                        placeholder="e.g. Pune / Mumbai"
                                        className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm text-slate-800 font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Principal / Signatory Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={manualForm.principalName}
                                        onChange={(e) => setManualForm({ ...manualForm, principalName: e.target.value })}
                                        placeholder="e.g. Dr. Rajesh Sharma"
                                        className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm text-slate-800 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Designation</label>
                                    <input
                                        type="text"
                                        value={manualForm.designation}
                                        onChange={(e) => setManualForm({ ...manualForm, designation: e.target.value })}
                                        placeholder="e.g. Principal / Director"
                                        className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm text-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Contact Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={manualForm.contactEmail}
                                        onChange={(e) => setManualForm({ ...manualForm, contactEmail: e.target.value })}
                                        placeholder="e.g. principal@college.edu"
                                        className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Contact Phone</label>
                                    <input
                                        type="tel"
                                        value={manualForm.contactPhone}
                                        onChange={(e) => setManualForm({ ...manualForm, contactPhone: e.target.value })}
                                        placeholder="e.g. 9876543210"
                                        className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm text-slate-800 font-mono"
                                    />
                                </div>
                            </div>

                            {/* Student count — school mode */}
                            {manualForm.instituteType === "school" ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Student Strength *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            value={manualForm.studentCount}
                                            onChange={(e) => setManualForm({ ...manualForm, studentCount: e.target.value })}
                                            placeholder="e.g. 500"
                                            className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm text-slate-800 font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Agreement Duration</label>
                                        <select
                                            value={manualForm.mouDuration}
                                            onChange={(e) => setManualForm({ ...manualForm, mouDuration: e.target.value })}
                                            className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold text-slate-800 bg-white"
                                        >
                                            <option value="1">1 Year</option>
                                            <option value="2">2 Years</option>
                                            <option value="3">3 Years</option>
                                            <option value="4">4 Years</option>
                                            <option value="5">5 Years</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Initial Status</label>
                                        <select
                                            value={manualForm.status}
                                            onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                                            className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold text-slate-800 bg-white"
                                        >
                                            <option value="new">New Lead</option>
                                            <option value="contacted">Contacted</option>
                                            <option value="converted">Converted (Agreed)</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                /* College mode: year-wise counts */
                                <div className="space-y-3">
                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                                        <p className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">Year-wise Student Strength (ID Cards)</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-emerald-600 block mb-1">1st Year — ₹59/student (new cards)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={manualForm.yr1}
                                                    onChange={(e) => setManualForm({ ...manualForm, yr1: e.target.value })}
                                                    placeholder="e.g. 120"
                                                    className="w-full p-3 border-2 border-emerald-300 rounded-xl outline-none focus:border-emerald-500 text-sm text-emerald-800 font-bold bg-emerald-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-indigo-600 block mb-1">
                                                    2nd Year — ₹{['SDC', 'SDC20', 'SDC-SPECIAL'].includes((manualForm.coupon || '').trim().toUpperCase()) ? '20' : '30'}/student (existing cards)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={manualForm.yr2}
                                                    onChange={(e) => setManualForm({ ...manualForm, yr2: e.target.value })}
                                                    placeholder="e.g. 115"
                                                    className="w-full p-3 border-2 border-indigo-300 rounded-xl outline-none focus:border-indigo-500 text-sm text-indigo-800 font-bold bg-indigo-50"
                                                />
                                            </div>
                                            {manualForm.instituteType === "college_degree" && (
                                                <div>
                                                    <label className="text-xs font-bold text-indigo-600 block mb-1">
                                                        3rd Year — ₹{['SDC', 'SDC20', 'SDC-SPECIAL'].includes((manualForm.coupon || '').trim().toUpperCase()) ? '20' : '30'}/student (existing cards)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={manualForm.yr3}
                                                        onChange={(e) => setManualForm({ ...manualForm, yr3: e.target.value })}
                                                        placeholder="e.g. 112"
                                                        className="w-full p-3 border-2 border-indigo-300 rounded-xl outline-none focus:border-indigo-500 text-sm text-indigo-800 font-bold bg-indigo-50"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Coupon Code Input */}
                                        <div className="mt-3 p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                                            <div className="flex-1 min-w-[200px]">
                                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Promo / Coupon Code (Optional)</label>
                                                <input
                                                    type="text"
                                                    value={manualForm.coupon}
                                                    onChange={(e) => setManualForm({ ...manualForm, coupon: e.target.value })}
                                                    placeholder="e.g. SDC"
                                                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold uppercase text-indigo-900 outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            {['SDC', 'SDC20', 'SDC-SPECIAL'].includes((manualForm.coupon || '').trim().toUpperCase()) && (
                                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
                                                    🎉 Coupon SDC Active: 2nd &amp; 3rd Yr @ ₹20
                                                </span>
                                            )}
                                        </div>

                                        {/* Live calc preview */}
                                        {(() => {
                                            const yr1 = parseInt(manualForm.yr1) || 0;
                                            const yr2 = parseInt(manualForm.yr2) || 0;
                                            const yr3 = manualForm.instituteType === "college_degree" ? (parseInt(manualForm.yr3) || 0) : 0;
                                            const total = yr1 + yr2 + yr3;
                                            if (total === 0) return null;
                                            const dur = parseInt(manualForm.mouDuration) || 1;
                                            const isSDC = ['SDC', 'SDC20', 'SDC-SPECIAL'].includes((manualForm.coupon || '').trim().toUpperCase());
                                            const yr2R = isSDC ? 20 : 30;
                                            const yr3R = isSDC ? 20 : 30;
                                            const yearly = (yr1 * 59) + (yr2 * yr2R) + (yr3 * yr3R);
                                            const grand = yearly * dur;
                                            return (
                                                <div className="mt-3 p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 font-medium">
                                                    {yr1}×₹59 + {yr2}×₹{yr2R}{manualForm.instituteType === "college_degree" ? ` + ${yr3}×₹${yr3R}` : ""} = <strong>₹{yearly.toLocaleString('en-IN')}/yr</strong> × {dur} yr = <strong className="text-indigo-700">₹{grand.toLocaleString('en-IN')} total</strong>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Agreement Duration</label>
                                            <select
                                                value={manualForm.mouDuration}
                                                onChange={(e) => setManualForm({ ...manualForm, mouDuration: e.target.value })}
                                                className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold text-slate-800 bg-white"
                                            >
                                                <option value="1">1 Year</option>
                                                <option value="2">2 Years</option>
                                                <option value="3">3 Years</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Initial Status</label>
                                            <select
                                                value={manualForm.status}
                                                onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                                                className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold text-slate-800 bg-white"
                                            >
                                                <option value="new">New Lead</option>
                                                <option value="contacted">Contacted</option>
                                                <option value="converted">Converted (Agreed)</option>
                                                <option value="rejected">Rejected</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Pricing plan — school only */}
                            {manualForm.instituteType === "school" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Pricing Plan / Rate *</label>
                                        <select
                                            value={manualForm.planType}
                                            onChange={(e) => setManualForm({ ...manualForm, planType: e.target.value })}
                                            className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold text-slate-800 bg-white"
                                        >
                                            <option value="standard">Standard Plan (Students Only) — ₹59 / Student / Yr</option>
                                            <option value="plus">Plus Plan (Student + Teacher Access) — ₹69 / Student / Yr</option>
                                            <option value="custom">Custom Admin Rate (Specify below)</option>
                                        </select>
                                    </div>
                                    {manualForm.planType === "custom" && (
                                        <div>
                                            <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Custom Rate (₹ / Student) *</label>
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                value={manualForm.customRate}
                                                onChange={(e) => setManualForm({ ...manualForm, customRate: e.target.value })}
                                                placeholder="e.g. 75"
                                                className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm text-slate-800 font-bold"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-wider">UDISE Code (Optional)</label>
                                    <input
                                        type="text"
                                        value={manualForm.udiseCode}
                                        onChange={(e) => setManualForm({ ...manualForm, udiseCode: e.target.value })}
                                        placeholder="e.g. 27240100101"
                                        className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm text-slate-800 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Action Type</label>
                                    <select
                                        value={manualForm.action}
                                        onChange={(e) => setManualForm({ ...manualForm, action: e.target.value })}
                                        className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold text-slate-800 bg-white"
                                    >
                                        <option value="manual_entry">Manual Record (Technical Glitch / Offline)</option>
                                        <option value="print">Printed MOU</option>
                                        <option value="download_pdf">PDF Downloaded</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 tracking-wider">School Address (Optional)</label>
                                <input
                                    type="text"
                                    value={manualForm.address}
                                    onChange={(e) => setManualForm({ ...manualForm, address: e.target.value })}
                                    placeholder="Full street address..."
                                    className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm text-slate-800"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Notes & Reason for Manual Entry</label>
                                <textarea
                                    value={manualForm.notes}
                                    onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                                    placeholder="Explain why this entry was added manually (e.g. Browser crash during PDF generation, offline agreement signed)..."
                                    rows="2"
                                    className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm text-slate-700 resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-3">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setIsManualModalOpen(false)}
                                    className="w-1/2 rounded-xl py-3 text-xs font-bold"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSavingManual}
                                    className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-xs font-bold"
                                >
                                    {isSavingManual ? "Saving..." : "Create Manual MOU"}
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
