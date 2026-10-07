"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
    Users, Search, Phone, Calendar, ArrowRight, 
    Plus, CheckCircle2, Clock, X, AlertCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function EnquiriesPage() {
    const toast = useToast();
    const [enquiries, setEnquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");

    // Modal state
    const [activeModal, setActiveModal] = useState(null); // 'done' | 'reschedule'
    const [selectedEnquiry, setSelectedEnquiry] = useState(null);
    const [actionNote, setActionNote] = useState("");
    const [newFollowUpDate, setNewFollowUpDate] = useState("");

    useEffect(() => {
        fetchEnquiries();
    }, []);

    const fetchEnquiries = async () => {
        try {
            setError(null);
            const res = await fetch("/api/v1/enquiries");
            if (res.ok) {
                const data = await res.json();
                setEnquiries(data.enquiries || []);
            } else {
                const errData = await res.json();
                setError(errData.error || `Failed to fetch: ${res.statusText}`);
            }
        } catch (error) {
            console.error("Failed to fetch enquiries", error);
            setError(error.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const updateEnquiry = async (id, data) => {
        setUpdating(true);
        try {
            const res = await fetch(`/api/v1/enquiries/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                const result = await res.json();
                setEnquiries(prev => prev.map(enq => 
                    enq._id === id ? { ...enq, ...result.enquiry } : enq
                ));
                toast.success("Enquiry updated successfully");
                setActiveModal(null);
                setSelectedEnquiry(null);
                setActionNote("");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to update");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setUpdating(false);
        }
    };

    const handleDoneAction = (enq) => {
        setSelectedEnquiry(enq);
        setActiveModal('done');
    };

    const handleRescheduleAction = (enq) => {
        setSelectedEnquiry(enq);
        setNewFollowUpDate(enq.followUpDate ? new Date(enq.followUpDate).toISOString().split('T')[0] : "");
        setActiveModal('reschedule');
    };

    const getUrgency = (dateString) => {
        if (!dateString) return { weight: 4, color: 'bg-slate-50 text-slate-500 border-slate-200', dot: 'bg-slate-300', label: 'No Action' };
        
        const date = new Date(dateString);
        if (isNaN(date)) return { weight: 4, color: 'bg-slate-50 text-slate-500 border-slate-200', dot: 'bg-slate-300', label: 'Invalid Date' };
        
        date.setHours(0,0,0,0);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const diffTime = date - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return { weight: 1, color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', label: `${Math.abs(diffDays)}d Overdue` };
        if (diffDays === 0) return { weight: 1, color: 'bg-rose-50 text-rose-600 border-rose-200', dot: 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse', label: 'Today Focus' };
        if (diffDays === 1) return { weight: 2, color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400', label: 'Tomorrow' };
        if (diffDays <= 3) return { weight: 2, color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400', label: `In ${diffDays} days` };
        return { weight: 3, color: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-300', label: format(date, "MMM d") };
    };

    const filteredEnquiries = enquiries.filter(enq =>
        enq.studentName?.toLowerCase().includes(search.toLowerCase()) ||
        enq.contactNumber?.includes(search)
    );

    // Smart Sorting: Urgency First
    const sortedEnquiries = [...filteredEnquiries].sort((a, b) => {
        const urgencyA = getUrgency(a.followUpDate);
        const urgencyB = getUrgency(b.followUpDate);
        if (urgencyA.weight !== urgencyB.weight) {
            return urgencyA.weight - urgencyB.weight;
        }
        const dateA = a.followUpDate ? new Date(a.followUpDate) : new Date(8640000000000000);
        const dateB = b.followUpDate ? new Date(b.followUpDate) : new Date(8640000000000000);
        return dateA - dateB;
    });

    const getStatusVariant = (status) => {
        switch (status) {
            case 'Confirmed': return 'success';
            case 'Rejected': return 'danger';
            default: return 'warning';
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6 max-w-full pb-20"
        >
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            Admission Enquiries
                        </h1>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60">
                            {enquiries.length} {enquiries.length === 1 ? 'Lead' : 'Leads'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Manage prospective student leads, priority dates, and follow-up logs.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <Link href="/admin/enquiries/applications">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs active:scale-95 transition-all cursor-pointer">
                            <ArrowRight size={13} className="rotate-[-45deg] text-purple-600" />
                            <span>Online Applications</span>
                        </button>
                    </Link>
                    <Link href="/admin/enquiries/new">
                        <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-xs active:scale-95 transition-all cursor-pointer">
                            <Plus size={15} />
                            <span>New Entry</span>
                        </button>
                    </Link>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-200/80 text-xs font-semibold flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-rose-600" />
                        <span>{error}</span>
                    </div>
                    <button onClick={fetchEnquiries} className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold transition-colors">
                        Retry
                    </button>
                </div>
            )}

            {/* Main Enquiries Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input
                            type="text"
                            placeholder="Search by student name or contact number..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-xs font-medium"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-0 overflow-x-auto min-h-[300px]">
                    {loading ? (
                        <div className="py-20 flex justify-center"><LoadingSpinner /></div>
                    ) : sortedEnquiries.length > 0 ? (
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead className="bg-slate-50/50 sticky top-0 z-10 border-b border-slate-100">
                                <tr className="text-[10px] uppercase tracking-wider text-slate-400 font-black">
                                    <th className="px-5 py-3 pl-6">Lead & Urgency</th>
                                    <th className="px-5 py-3">Contact</th>
                                    <th className="px-5 py-3">Course Interest</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Referred By</th>
                                    <th className="px-5 py-3">Notes</th>
                                    <th className="px-5 py-3">Next Action</th>
                                    <th className="px-5 py-3 text-right pr-6">Quick Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedEnquiries.map(enq => {
                                    const urgency = getUrgency(enq.followUpDate);
                                    return (
                                    <tr key={enq._id} className={cn("group hover:bg-slate-50/80 transition-colors", urgency.weight === 1 && "bg-rose-50/20")}>
                                        <td className="px-5 py-3.5 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-2 h-2 rounded-full shrink-0", urgency.dot)} />
                                                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                                    {enq.studentName?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 text-xs line-clamp-1">{enq.studentName || 'Unknown'}</h3>
                                                    <p className="text-[11px] text-slate-400 font-medium line-clamp-1 mt-0.5">{enq.fatherName ? `C/O ${enq.fatherName}` : 'Student'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 min-w-[120px]">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                                                <Phone size={13} className="text-slate-400 shrink-0" />
                                                <span>{enq.contactNumber}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <Badge variant="secondary" className="font-bold text-[10px] tracking-wider uppercase bg-slate-100 text-slate-700 border border-slate-200">
                                                {enq.course?.code || "Pending"}
                                            </Badge>
                                            <p className="text-[10px] text-slate-400 mt-1 font-semibold truncate max-w-[140px]">{enq.course?.name}</p>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <Badge variant={getStatusVariant(enq.status)} className="font-bold text-[10px] uppercase shadow-2xs">
                                                {enq.status}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="text-xs font-semibold text-slate-700">
                                                {enq.referredBy || <span className="text-slate-300 italic font-normal">—</span>}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="text-xs font-medium text-slate-500 line-clamp-2 max-w-[180px]">
                                                {enq.notes || <span className="text-slate-300 italic font-normal">No notes...</span>}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex flex-col gap-1 min-w-[110px]">
                                                <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider w-fit shadow-2xs", urgency.color)}>
                                                    <Calendar size={11} strokeWidth={2.5} />
                                                    {urgency.label}
                                                </div>
                                                <span className="text-[9px] text-slate-400 font-medium pl-1">
                                                    Added {enq.enquiryDate && !isNaN(new Date(enq.enquiryDate)) ? format(new Date(enq.enquiryDate), "MMM d") : 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 pr-6 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <a 
                                                    href={`tel:${enq.contactNumber}`}
                                                    className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50 text-[10px] font-bold text-blue-600 transition-all duration-150 active:scale-95 bg-white shadow-2xs"
                                                >
                                                    <Phone size={11} /> <span>Call</span>
                                                </a>
                                                <button 
                                                    onClick={() => handleDoneAction(enq)}
                                                    className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50 text-[10px] font-bold text-emerald-600 transition-all duration-150 active:scale-95 bg-white shadow-2xs cursor-pointer"
                                                >
                                                    <CheckCircle2 size={11} /> <span>Done</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleRescheduleAction(enq)}
                                                    className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200/80 hover:border-amber-300 hover:bg-amber-50 text-[10px] font-bold text-amber-600 transition-all duration-150 active:scale-95 bg-white shadow-2xs cursor-pointer"
                                                >
                                                    <Clock size={11} /> <span>Resch</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    ) : (
                        <div className="py-16 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
                                <Users size={28} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-800">No enquiries found</h3>
                            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 mb-4">
                                {search ? "Try searching with a different term." : "Record your first admission enquiry."}
                            </p>
                            <Link href="/admin/enquiries/new">
                                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer">
                                    <Plus size={13} />
                                    <span>Add New Entry</span>
                                </button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Action Modals */}
            <Modal
                isOpen={activeModal === 'done'}
                onClose={() => setActiveModal(null)}
                title="Log Follow-up Outcome"
                className="max-w-md"
            >
                <div className="space-y-4">
                    <p className="text-xs text-slate-500 font-medium">
                        Capture a quick note about the conversation with <span className="text-slate-900 font-bold">{selectedEnquiry?.studentName}</span>.
                    </p>
                    <textarea
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 min-h-[110px] text-xs text-slate-800 transition-all resize-none"
                        placeholder="e.g., Interested in weekend batch, requested fee breakdown..."
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        autoFocus
                    />
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Update Status:</label>
                        <div className="flex gap-1.5">
                            {['Pending', 'Confirmed', 'Rejected'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => updateEnquiry(selectedEnquiry._id, { status, notes: actionNote || selectedEnquiry.notes })}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-tight transition-all duration-150 active:scale-95 cursor-pointer border",
                                        selectedEnquiry?.status === status 
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs' 
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    )}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={activeModal === 'reschedule'}
                onClose={() => setActiveModal(null)}
                title="Reschedule Follow-up"
                className="max-w-xs"
            >
                <div className="space-y-4">
                    <p className="text-xs text-slate-500 font-medium">
                        Pick a new date for <span className="text-slate-900 font-bold">{selectedEnquiry?.studentName}</span>.
                    </p>
                    <input
                        type="date"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-xs font-bold transition-all"
                        value={newFollowUpDate}
                        onChange={(e) => setNewFollowUpDate(e.target.value)}
                    />
                    <Button 
                        fullWidth 
                        onClick={() => updateEnquiry(selectedEnquiry._id, { followUpDate: newFollowUpDate })}
                        disabled={updating}
                        className="rounded-xl font-bold uppercase tracking-wider text-xs active:scale-[0.98] transition-all"
                    >
                        {updating ? 'Updating...' : 'Update Schedule'}
                    </Button>
                </div>
            </Modal>
        </motion.div>
    );
}
