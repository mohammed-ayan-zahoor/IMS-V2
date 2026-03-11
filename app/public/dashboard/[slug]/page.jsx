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
    Tv
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

    // TV Mode State
    const [isTVMode, setIsTVMode] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const itemsPerPage = isTVMode ? 6 : 999; 

    useEffect(() => {
        paramsPromise.then(setParams).catch((err) => {
            console.error("Failed to resolve params:", err);
            setError("Failed to load dashboard parameters");
        });
    }, [paramsPromise]);

    useEffect(() => {
        try {
            const storedName = localStorage.getItem("ims_visitor_name");
            let storedId = localStorage.getItem("ims_visitor_id");
            
            if (!storedId) {
                storedId = crypto.randomUUID?.() || `v_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
                localStorage.setItem("ims_visitor_id", storedId);
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
        localStorage.setItem("ims_visitor_name", visitorName);
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
            return {
                totalPending: acc.totalPending + pending,
                totalStudents: acc.totalStudents + 1
            };
        }, { totalPending: 0, totalStudents: 0 });
    }, [data]);

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

            {/* Main Dashboard UI */}
            <div className="max-w-[1800px] mx-auto p-8 lg:p-16 flex flex-col lg:flex-row gap-16">
                {/* Left Side: 90% Content */}
                <div className="flex-1 space-y-20">
                    <header className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <SharpBadge variant="default">IMS EXECUTIVE AUDIT</SharpBadge>
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
                        <h2 className={`font-black uppercase tracking-tighter leading-none transition-all ${isTVMode ? 'text-8xl' : 'text-7xl'}`}>
                            {data.link?.name || "Shared Dashboard"}
                        </h2>
                    </header>

                    <section className="space-y-12">
                        <div className="flex items-center justify-between border-b-4 border-black pb-4">
                            <h3 className="font-black uppercase text-2xl">Financial Records</h3>
                            <div className="flex gap-8">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase">Students Count</p>
                                    <p className="text-2xl font-black">{aggregatedStats.totalStudents}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Pending</p>
                                    <p className="text-2xl font-black text-red-600">₹{aggregatedStats.totalPending.toLocaleString()}</p>
                                </div>
                                {isTVMode && (
                                     <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase">Page</p>
                                        <p className="text-2xl font-black">{currentPage + 1} / {Math.max(1, Math.ceil((data.fees?.length || 0) / itemsPerPage))}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={`grid gap-8 transition-all duration-500 ${isTVMode ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                            {((data.fees ?? []).slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)).map((fee) => {
                                const studentPending = fee.installments.reduce((sum, inst) =>
                                    inst.status === 'pending' ? sum + inst.amount : sum, 0);
                                const lastComment = data.link.comments?.filter(c => c.studentId === fee.student?._id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

                                return (
                                    <SharpCard key={fee._id} className="group relative">
                                        <div className="grid grid-cols-1 md:grid-cols-12 items-center">
                                            {/* Student Ident */}
                                            <div className="md:col-span-4 p-8 border-b-2 md:border-b-0 md:border-r-2 border-black">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{fee.institute?.name}</p>
                                                    <h4 className="text-2xl font-black uppercase tracking-tight leading-tight">
                                                        {fee.student?.profile?.firstName || 'STUDENT'} {fee.student?.profile?.lastName || ''}
                                                    </h4>
                                                    <div className="flex items-center gap-2">
                                                        <SharpBadge>{fee.student?.enrollmentNumber || 'NO-ID'}</SharpBadge>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">{fee.batch?.name}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Fee Data */}
                                            <div className="md:col-span-4 p-8 border-b-2 md:border-b-0 md:border-r-2 border-black bg-gray-50/50 group-hover:bg-white transition-colors">
                                                <div className="flex justify-between items-end">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase">Outstanding Balance</p>
                                                        <p className="text-3xl font-black">₹{studentPending.toLocaleString()}</p>
                                                    </div>
                                                    <div className="text-right space-y-1">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase">Next Installment</p>
                                                        {fee.installments.find(i => i.status === 'pending') ? (
                                                            <div className="flex items-center gap-1 font-bold text-xs uppercase">
                                                                <Clock size={12} className="text-amber-500" />
                                                                {new Date(fee.installments.find(i => i.status === 'pending').dueDate).toLocaleDateString()}
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1 font-bold text-xs uppercase text-emerald-600">
                                                                <CheckCircle2 size={12} /> Clear
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action / Last Comment */}
                                            <div className="md:col-span-4 p-8 flex flex-col justify-between h-full bg-white">
                                                {lastComment ? (
                                                    <div className="space-y-2 mb-4">
                                                        <div className="flex justify-between items-center text-[9px] font-black uppercase">
                                                            <p className={lastComment.visitorId === visitorId ? "text-emerald-600" : "text-gray-400"}>
                                                                {lastComment.visitorId === visitorId ? "YOU" : lastComment.visitorName}
                                                            </p>
                                                            <div className="flex items-center gap-3">
                                                                {lastComment.visitorId === visitorId && (
                                                                    <div className="flex gap-2">
                                                                        <button 
                                                                            onClick={() => {
                                                                                setSelectedStudent(fee);
                                                                                setEditingComment(lastComment);
                                                                                setCommentText(lastComment.text);
                                                                                setFollowUpDate(lastComment.followUpDate ? new Date(lastComment.followUpDate).toISOString().split('T')[0] : "");
                                                                                setShowCommentModal(true);
                                                                            }}
                                                                            className="text-gray-400 hover:text-black transition-colors"
                                                                        >
                                                                            <Edit3 size={10} />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleDeleteComment(lastComment._id)}
                                                                            className="text-gray-400 hover:text-red-600 transition-colors"
                                                                        >
                                                                            <Trash2 size={10} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                {lastComment.followUpDate && (
                                                                    <div className="flex items-center gap-1 text-red-600">
                                                                        <CalendarClock size={10} /> {new Date(lastComment.followUpDate).toLocaleDateString()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-xs font-bold italic line-clamp-1">"{lastComment.text}"</p>
                                                    </div>
                                                ) : (
                                                    <div className="mb-4">
                                                        <p className="text-[9px] font-black text-gray-300 uppercase italic">No follow-up logged yet</p>
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => {
                                                        setSelectedStudent(fee);
                                                        setShowCommentModal(true);
                                                    }}
                                                    className="w-full bg-black text-white py-3 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <MessageSquare size={14} /> Log Action
                                                </button>
                                            </div>
                                        </div>
                                    </SharpCard>
                                );
                            })}
                        </div>
                    </section>
                </div>

                {/* Right Side: 10% Radical Negative Space / Summary */}
                <aside className="hidden lg:block w-32 shrink-0 border-l-2 border-black p-8 sticky top-16 h-fit space-y-12">
                    <p className="text-[8px] font-black [writing-mode:vertical-rl] transform rotate-180 uppercase tracking-[0.5em] text-gray-300 h-64">
                        SYSTEMS_AUDIT_VERIFIED // 2026 // IMS-CORP
                    </p>

                    <div className="space-y-4">
                        <div className="w-full aspect-square bg-black flex items-center justify-center">
                            <Share2 className="text-white" size={24} />
                        </div>
                        <div className="w-full h-1 bg-black" />
                        <div className="w-full h-8 bg-black animate-pulse" />
                    </div>
                </aside>
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
        </div>
    );
}
