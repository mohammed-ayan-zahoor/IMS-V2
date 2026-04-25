"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Calendar,
    MessageSquare,
    AlertCircle,
    ArrowRight,
    Loader2,
    CalendarClock,
    CheckCircle2,
    Clock,
    Share2,
    Trash2,
    Edit3,
    X,
    Monitor,
    Tv,
    Phone
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { motion, AnimatePresence } from "framer-motion";

// Swiss Minimalist Core Components
const SharpCard = ({ children, className = "" }) => (
    <div className={`bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${className}`}>
        {children}
    </div>
);

const SharpBadge = ({ children, variant = "default" }) => {
    const variants = {
        default: "bg-black text-white",
        success: "bg-emerald-600 text-white",
        warning: "bg-amber-500 text-white",
        danger: "bg-red-600 text-white"
    };
    return (
        <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${variants[variant]}`}>
            {children}
        </span>
    );
};

export default function VisitorDashboard({ params: paramsPromise }) {
    const toast = useToast();
    const [params, setParams] = useState(null);
    const [visitorName, setVisitorName] = useState("");
    const [visitorId, setVisitorId] = useState("");
    const [isRegistered, setIsRegistered] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Comment State
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [commentText, setCommentText] = useState("");
    const [followUpDate, setFollowUpDate] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [editingComment, setEditingComment] = useState(null);

    // TV & Utility State
    const [isTVMode, setIsTVMode] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [filterInstitute, setFilterInstitute] = useState("all");
    const [expandedStudentId, setExpandedStudentId] = useState(null);
    const itemsPerPage = isTVMode ? 6 : 999;

    useEffect(() => {
        paramsPromise.then(setParams).catch((err) => {
            console.error("Failed to resolve params:", err);
            setError("Failed to load dashboard parameters");
        });
    }, [paramsPromise]);

    useEffect(() => {
        try {
            const storedName = localStorage.getItem("eduvanta_visitor_name");
            let storedId = localStorage.getItem("eduvanta_visitor_id");
            
            if (!storedId) {
                storedId = crypto.randomUUID?.() || `v_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
                localStorage.setItem("eduvanta_visitor_id", storedId);
            }
            
            setVisitorId(storedId);
            
            if (storedName) {
                setVisitorName(storedName);
                setIsRegistered(true);
            }
        } catch {
            // localStorage unavailable
        }
    }, []);

    useEffect(() => {
        if (params?.slug) {
            fetchData();
        }
    }, [params]);

    // TV Mode Polling
    useEffect(() => {
        if (!params?.slug) return;
        
        const pollInterval = setInterval(() => {
            fetchData(true); // Silent update
        }, 30000); // 30 seconds
        
        return () => clearInterval(pollInterval);
    }, [params?.slug]);

    // TV Mode Cycling
    useEffect(() => {
        if (!isTVMode || !data?.fees?.length) return;
        
        const totalPages = Math.ceil(data.fees.length / itemsPerPage);
        if (totalPages <= 1) return;

        const cycleInterval = setInterval(() => {
            setCurrentPage(prev => (prev + 1) % totalPages);
        }, 15000); // 15 seconds per page
        
        return () => clearInterval(cycleInterval);
    }, [isTVMode, data?.fees?.length, itemsPerPage]);

    const fetchData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await fetch(`/api/v1/public/shared-dashboard/${params.slug}`);
            if (!res.ok) {
                if (silent) return; // Ignore silent errors for now
                const errData = await res.json();
                throw new Error(errData.error || "Dashboard not found");
            }
            const result = await res.json();
            setData(result);
            setLastUpdated(new Date());
        } catch (err) {
            if (!silent) setError(err.message);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleRegister = (e) => {
        if (!visitorName.trim()) return;
        localStorage.setItem("eduvanta_visitor_name", visitorName);
        setIsRegistered(true);
        toast.success(`Welcome, ${visitorName}`);
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || !selectedStudent) return;

        setSubmitting(true);
        try {
            const method = editingComment ? "PATCH" : "POST";
            const payload = {
                visitorName,
                visitorId,
                studentId: selectedStudent.student._id,
                text: commentText,
                followUpDate
            };
            
            if (editingComment) {
                payload.commentId = editingComment._id;
            }

            const res = await fetch(`/api/v1/public/shared-dashboard/${params.slug}`, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error(`Failed to ${editingComment ? 'update' : 'submit'} comment`);

            toast.success(`Comment ${editingComment ? 'updated' : 'added'} successfully`);
            setCommentText("");
            setFollowUpDate("");
            setEditingComment(null);
            setShowCommentModal(false);
            fetchData();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("Delete this comment permanently?")) return;
        
        try {
            const res = await fetch(`/api/v1/public/shared-dashboard/${params.slug}?commentId=${commentId}&visitorId=${visitorId}`, {
                method: "DELETE"
            });
            
            if (!res.ok) throw new Error("Failed to delete comment");
            
            toast.success("Comment deleted");
            fetchData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const aggregatedStats = useMemo(() => {
        if (!data?.fees) return { totalPending: 0, totalStudents: 0 };
        return data.fees.reduce((acc, fee) => {
            const pending = fee.installments.reduce((sum, inst) =>
                inst.status === 'pending' ? sum + inst.amount : sum, 0);
            if (pending === 0) return acc; // Only count students with pending balance
            return {
                totalPending: acc.totalPending + pending,
                totalStudents: acc.totalStudents + 1
            };
        }, { totalPending: 0, totalStudents: 0 });
    }, [data]);

    const institutesList = useMemo(() => {
        if (!data?.fees) return [];
        const unique = new Map();
        data.fees.forEach(f => {
            if (f.institute && !unique.has(f.institute._id)) {
                unique.set(f.institute._id, f.institute.name);
            }
        });
        return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
    }, [data]);

    const filteredFees = useMemo(() => {
        if (!data?.fees) return [];
        return data.fees.filter(fee => {
            const pending = fee.installments.reduce((sum, inst) =>
                inst.status === 'pending' ? sum + inst.amount : sum, 0);
            if (pending === 0) return false; // Hide cleared students
            if (filterInstitute !== "all" && fee.institute?._id !== filterInstitute) return false;
            return true;
        });
    }, [data, filterInstitute]);

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <Loader2 className="animate-spin text-black" size={48} strokeWidth={3} />
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
            <SharpCard className="p-12 text-center space-y-4 max-w-md">
                <AlertCircle size={48} className="mx-auto text-red-600" />
                <h2 className="text-2xl font-black uppercase">Access Denied</h2>
                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">{error}</p>
                <SharpCard className="p-4 bg-red-50 border-red-600 shadow-none">
                    <p className="text-[10px] font-black text-red-600 uppercase">This dashboard link has been terminated or does not exist.</p>
                </SharpCard>
            </SharpCard>
        </div>
    );

    return (
        <div className={`min-h-screen bg-gray-50 text-black font-sans pb-20 ${isTVMode ? 'h-screen overflow-hidden' : ''}`}>
            {/* Main Dashboard UI */}
            <div className="max-w-full mx-auto p-4 lg:p-10 flex flex-col gap-10">
                <div className="flex-1 space-y-12">
                    <header className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <SharpBadge variant="default">EDUVANTA EXECUTIVE AUDIT</SharpBadge>
                                <div className="h-[2px] w-24 bg-black" />
                                <button 
                                    onClick={() => {
                                        setIsTVMode(!isTVMode);
                                        setCurrentPage(0);
                                    }}
                                    className={`flex items-center gap-2 px-3 py-1 border-2 border-black font-black text-[10px] uppercase transition-colors ${isTVMode ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}
                                >
                                    {isTVMode ? <Tv size={14} /> : <Monitor size={14} />}
                                    {isTVMode ? 'TV Mode: ON' : 'TV Mode: OFF'}
                                </button>
                                {isTVMode && (
                                    <span className="flex items-center gap-2 text-[10px] font-black text-emerald-600 animate-pulse">
                                        <div className="w-2 h-2 rounded-full bg-emerald-600" />
                                        LIVE
                                    </span>
                                )}
                            </div>
                            {isTVMode && (
                                <p className="text-[10px] font-black text-gray-400 uppercase">
                                    Last Update: {lastUpdated.toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                        <h2 className={`font-black uppercase tracking-tighter leading-none transition-all ${isTVMode ? 'text-8xl' : 'text-6xl'}`}>
                            {data.link?.name || "Shared Dashboard"}
                        </h2>
                    </header>

                    <nav className="flex flex-wrap gap-4 border-b-2 border-black pb-6">
                        <button 
                            onClick={() => setFilterInstitute("all")}
                            className={`px-6 py-2 border-2 border-black font-black uppercase text-xs tracking-widest transition-all ${filterInstitute === "all" ? "bg-black text-white shadow-[4px_4px_0_0_#94a3b8]" : "bg-white hover:bg-gray-50"}`}
                        >
                            All Institutes
                        </button>
                        {institutesList.map(inst => (
                            <button 
                                key={inst.id}
                                onClick={() => setFilterInstitute(inst.id)}
                                className={`px-6 py-2 border-2 border-black font-black uppercase text-xs tracking-widest transition-all ${filterInstitute === inst.id ? "bg-black text-white shadow-[4px_4px_0_0_#94a3b8]" : "bg-white hover:bg-gray-50"}`}
                            >
                                {inst.name}
                            </button>
                        ))}
                    </nav>

                    <section className="space-y-8">
                        <div className="flex items-center justify-between border-b-4 border-black pb-4">
                            <h3 className="font-black uppercase text-2xl">Financial Records</h3>
                            <div className="flex gap-8">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Follow-ups</p>
                                    <p className="text-2xl font-black italic">{aggregatedStats.totalStudents}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Outstanding</p>
                                    <p className="text-2xl font-black text-red-600">₹{aggregatedStats.totalPending.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <div className={`grid gap-6 transition-all duration-500 ${isTVMode ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2'}`}>
                            {(filteredFees.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)).map((fee) => {
                                const studentPending = fee.installments.reduce((sum, inst) =>
                                    inst.status === 'pending' ? sum + inst.amount : sum, 0);
                                const lastComment = data.link.comments?.filter(c => c.studentId === fee.student?._id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
                                const isExpanded = expandedStudentId === fee.student?._id;

                                return (
                                    <SharpCard key={fee._id} className="group overflow-hidden">
                                        <div 
                                            onClick={() => setExpandedStudentId(isExpanded ? null : fee.student?._id)}
                                            className="cursor-pointer"
                                        >
                                            <div className="grid grid-cols-12 items-center bg-white">
                                                {/* Student Ident */}
                                                <div className="col-span-12 md:col-span-6 p-6 md:border-r-2 border-black">
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between items-start">
                                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{fee.institute?.name}</p>
                                                            {fee.student?.profile?.phone && (
                                                                <p className="text-[9px] font-black text-emerald-600 block md:hidden">{fee.student.profile.phone}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <h4 className="text-xl font-black uppercase tracking-tight leading-none group-hover:text-emerald-600 transition-colors">
                                                                {fee.student?.profile?.firstName || 'STUDENT'} {fee.student?.profile?.lastName || ''}
                                                            </h4>
                                                            {fee.student?.profile?.phone && (
                                                                <span className="hidden md:inline-flex px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-[9px] font-black text-emerald-700 rounded-sm">
                                                                    {fee.student.profile.phone}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">{fee.batch?.name}</p>
                                                    </div>
                                                </div>

                                                {/* Pending Info */}
                                                <div className="col-span-12 md:col-span-6 p-6">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <p className="text-[8px] font-black text-gray-400 uppercase">Outstanding</p>
                                                            <p className="text-2xl font-black italic">₹{studentPending.toLocaleString()}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <SharpBadge variant={studentPending > 10000 ? "danger" : "warning"}>
                                                                {fee.installments.find(i => i.status === 'pending') ? 'OVERDUE' : 'DUE'}
                                                            </SharpBadge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Preview Last Comment */}
                                            {lastComment && !isExpanded && (
                                                <div className="px-6 pb-6 pt-2 border-t border-gray-100 flex items-center justify-between">
                                                    <p className="text-[9px] font-bold text-gray-400 truncate max-w-[70%] italic">
                                                        "{lastComment.text}" — {lastComment.visitorName}
                                                    </p>
                                                    <div className="flex gap-2">
                                                        {lastComment.visitorId === visitorId && (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteComment(lastComment._id);
                                                                }}
                                                                className="text-gray-300 hover:text-red-600 transition-colors"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                        <ArrowRight size={12} className={`text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Expanded Details */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="border-t-2 border-black bg-gray-50 p-6 space-y-6"
                                                >
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        {/* Student Profile Summary */}
                                                        <div className="col-span-full bg-emerald-50/50 p-4 border border-emerald-100 flex items-center justify-between">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 bg-emerald-600 flex items-center justify-center text-white font-black text-xs">
                                                                    {fee.student?.profile?.firstName?.charAt(0)}{fee.student?.profile?.lastName?.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase text-emerald-800">Student Contact</p>
                                                                    <p className="text-sm font-black uppercase tracking-tight">
                                                                        {fee.student?.profile?.firstName} {fee.student?.profile?.lastName}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {fee.student?.profile?.phone && (
                                                                <a 
                                                                    href={`tel:${fee.student.profile.phone}`}
                                                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-colors"
                                                                >
                                                                    <Phone size={14} /> {fee.student.profile.phone}
                                                                </a>
                                                            )}
                                                        </div>

                                                        {/* Installment History */}
                                                        <div className="space-y-4">
                                                            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] border-b border-black pb-1">Installment History</h5>
                                                            <div className="space-y-2">
                                                                {fee.installments.map((inst, idx) => (
                                                                    <div key={idx} className="flex justify-between items-center bg-white p-2 border border-black text-[10px] font-bold">
                                                                        <span className="uppercase text-gray-400">{new Date(inst.dueDate).toLocaleDateString()}</span>
                                                                        <span>₹{inst.amount.toLocaleString()}</span>
                                                                        <SharpBadge variant={inst.status === 'paid' ? 'success' : 'default'}>
                                                                            {inst.status}
                                                                        </SharpBadge>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Interaction Log */}
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center border-b border-black pb-1">
                                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em]">Interaction Log</h5>
                                                                <button 
                                                                    onClick={() => {
                                                                        setSelectedStudent(fee);
                                                                        setShowCommentModal(true);
                                                                    }}
                                                                    className="text-emerald-600 hover:scale-110 transition-transform"
                                                                >
                                                                    <MessageSquare size={14} />
                                                                </button>
                                                            </div>
                                                            <div className="space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                                                {data.link.comments?.filter(c => c.studentId === fee.student?._id).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(c => (
                                                                    <div key={c._id} className="relative pl-3 border-l-2 border-emerald-600 bg-white p-2 shadow-sm">
                                                                        <div className="flex justify-between items-center mb-1">
                                                                            <span className="text-[8px] font-black uppercase">{c.visitorName}</span>
                                                                            {c.visitorId === visitorId && (
                                                                                <div className="flex gap-1">
                                                                                    <button 
                                                                                        onClick={() => {
                                                                                            setSelectedStudent(fee);
                                                                                            setEditingComment(c);
                                                                                            setCommentText(c.text);
                                                                                            setFollowUpDate(c.followUpDate ? new Date(c.followUpDate).toISOString().split('T')[0] : "");
                                                                                            setShowCommentModal(true);
                                                                                        }}
                                                                                        className="text-gray-300 hover:text-black"
                                                                                    >
                                                                                        <Edit3 size={10} />
                                                                                    </button>
                                                                                    <button onClick={() => handleDeleteComment(c._id)} className="text-gray-300 hover:text-red-600">
                                                                                        <Trash2 size={10} />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-[10px] leading-tight font-medium">"{c.text}"</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            setSelectedStudent(fee);
                                                            setShowCommentModal(true);
                                                        }}
                                                        className="w-full bg-black text-white py-4 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <MessageSquare size={14} /> Log New Interaction
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </SharpCard>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </div>

            {/* Comment Modal */}
            <AnimatePresence>
                {showCommentModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-50/90 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <SharpCard className="w-full max-w-xl p-10 space-y-8">
                                <header className="flex justify-between items-start border-b-2 border-black pb-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase">
                                            {editingComment ? "EDITING LOG" : "Action Logging Protocol"}
                                        </p>
                                        <h3 className="text-3xl font-black uppercase tracking-tight leading-none">
                                            {selectedStudent?.student?.profile?.firstName || 'STUDENT'} {selectedStudent?.student?.profile?.lastName || ''}
                                        </h3>
                                    </div>
                                    <button onClick={() => {
                                        setShowCommentModal(false);
                                        setEditingComment(null);
                                        setCommentText("");
                                        setFollowUpDate("");
                                    }} className="hover:rotate-90 transition-transform">
                                        <X size={24} />
                                    </button>
                                </header>

                                <form onSubmit={handleSubmitComment} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Call/Interaction Summary</label>
                                        <textarea
                                            required
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            rows={4}
                                            className="w-full border-2 border-black p-4 font-bold text-sm focus:outline-none focus:bg-gray-50 resize-none"
                                            placeholder="DESCRIBE THE OUTCOME OF THE INTERACTION..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Next Follow-up Date (Optional)</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-black" size={18} />
                                            <input
                                                type="date"
                                                value={followUpDate}
                                                onChange={(e) => setFollowUpDate(e.target.value)}
                                                className="w-full border-2 border-black p-4 pl-12 font-bold text-sm focus:outline-none focus:bg-gray-50"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full bg-black text-white py-5 font-black uppercase text-xs tracking-[0.2em] hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                    >
                                        {submitting ? "RECORDING..." : editingComment ? "UPDATE LOG" : "COMMIT LOG TO SYSTEM"}
                                    </button>
                                </form>
                            </SharpCard>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Registration Overlay */}
            <AnimatePresence>
                {!isRegistered && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="fixed inset-0 z-50 bg-gray-50 flex items-center justify-center p-6"
                    >
                        <div className="w-full max-w-4xl space-y-12">
                            <div className="space-y-4">
                                <span className="bg-black text-white px-4 py-1 text-xs font-black uppercase tracking-[0.3em]">Access Verification</span>
                                <h1 className="text-8xl md:text-[10rem] font-black uppercase tracking-tighter leading-[0.85] text-black">
                                    IDENTIFY<br />YOURSELF.
                                </h1>
                            </div>

                            <form onSubmit={handleRegister} className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 space-y-2 w-full">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full Official Name</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        required
                                        value={visitorName}
                                        onChange={(e) => setVisitorName(e.target.value)}
                                        className="w-full bg-transparent border-b-8 border-black text-4xl md:text-6xl font-black uppercase focus:outline-none focus:border-emerald-600 transition-colors placeholder:text-gray-200"
                                        placeholder="TYPE NAME HERE"
                                    />
                                </div>
                                <button className="bg-black text-white p-6 md:p-10 hover:bg-emerald-600 transition-colors group">
                                    <ArrowRight size={48} className="group-hover:translate-x-2 transition-transform" />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
