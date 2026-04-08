"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Users, Search, Phone, Calendar, ArrowRight, Plus, CheckCircle2, Clock, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import Link from "next/link";

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
        
        if (diffDays < 0) return { weight: 1, color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', label: `${Math.abs(diffDays)}d Overdue` };
        if (diffDays === 0) return { weight: 1, color: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse', label: 'Today Focus' };
        if (diffDays === 1) return { weight: 2, color: 'bg-amber-50 text-amber-600 border-amber-200', dot: 'bg-amber-400', label: 'Tomorrow' };
        if (diffDays <= 3) return { weight: 2, color: 'bg-amber-50 text-amber-600 border-amber-200', dot: 'bg-amber-400', label: `In ${diffDays} days` };
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
        <div className="space-y-6 max-w-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">Admission Enquiries</h1>
                    <p className="text-slate-500 mt-1 text-sm font-medium">Manage leads and follow-up actions efficiently.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/admin/enquiries/applications">
                        <Button variant="outline" className="flex items-center gap-2 border-premium-blue/20 text-premium-blue hover:bg-premium-blue/5 font-bold">
                            <ArrowRight size={18} className="rotate-[-45deg]" />
                            <span>Online Applications</span>
                        </Button>
                    </Link>
                    <Link href="/admin/enquiries/new">
                        <Button className="flex items-center gap-2 bg-premium-blue hover:bg-premium-blue/90 shadow-md shadow-blue-500/10 font-bold">
                            <Plus size={18} />
                            <span>New Entry</span>
                        </Button>
                    </Link>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm font-bold flex items-center justify-between">
                    <span>{error}</span>
                    <Button variant="ghost" size="sm" onClick={fetchEnquiries} className="text-red-600 hover:bg-red-100 h-8">Retry</Button>
                </div>
            )}

            <Card className="transition-all border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 shrink-0">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or contact..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 transition-all text-sm font-medium shadow-sm"
                        />
                    </div>
                </div>

                <CardContent className="p-0 overflow-y-auto min-h-[300px]">
                    {loading ? (
                        <div className="mt-10"><LoadingSpinner /></div>
                    ) : sortedEnquiries.length > 0 ? (
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead className="bg-white sticky top-0 z-10 shadow-sm border-b border-slate-200">
                                <tr className="text-[10px] uppercase tracking-wider text-slate-500 font-black">
                                    <th className="px-4 py-3 pl-5">Lead & Urgency</th>
                                    <th className="px-4 py-3">Contact</th>
                                    <th className="px-4 py-3">Course Interest</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Notes</th>
                                    <th className="px-4 py-3">Next Action</th>
                                    <th className="px-4 py-3 text-right pr-5">Quick Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                    {sortedEnquiries.map(enq => {
                                        const urgency = getUrgency(enq.followUpDate);
                                        return (
                                        <tr key={enq._id} className={`group hover:bg-slate-50/80 transition-colors ${urgency.weight === 1 ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-4 py-3 pl-5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${urgency.dot} shrink-0`}></div>
                                                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                                                        {enq.studentName?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-[13px] line-clamp-1">{enq.studentName || 'Unknown'}</h3>
                                                        <p className="text-[11px] text-slate-500 font-medium line-clamp-1">{enq.fatherName ? `C/O ${enq.fatherName}` : 'Student'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 min-w-[120px]">
                                                <div className="flex items-center gap-2 text-[13px] text-slate-700 font-bold">
                                                    <Phone size={14} className="text-slate-400" />
                                                    {enq.contactNumber}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="secondary" className="font-bold text-[10px] tracking-wider uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                                    {enq.course?.code || "Pending"}
                                                </Badge>
                                                <p className="text-[10px] text-slate-400 mt-1 font-bold truncate max-w-[150px]">{enq.course?.name}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={getStatusVariant(enq.status)} className="font-black text-[10px] uppercase shadow-sm">{enq.status}</Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-[11px] font-medium text-slate-500 line-clamp-2 max-w-[180px]">
                                                    {enq.notes || <span className="text-slate-300 italic font-normal">No notes...</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1.5 min-w-[110px]">
                                                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-black uppercase tracking-wider w-fit shadow-sm ${urgency.color}`}>
                                                        <Calendar size={12} strokeWidth={2.5} />
                                                        {urgency.label}
                                                    </div>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest pl-1">
                                                        Added {enq.enquiryDate && !isNaN(new Date(enq.enquiryDate)) ? format(new Date(enq.enquiryDate), "MMM d") : 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 pr-5 text-right w-[200px]">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <a 
                                                        href={`tel:${enq.contactNumber}`}
                                                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-transparent hover:border-blue-200 hover:bg-blue-50 text-[10px] font-bold text-blue-600 transition-all bg-white shadow-sm"
                                                    >
                                                        <Phone size={12} /> Call
                                                    </a>
                                                    <button 
                                                        onClick={() => handleDoneAction(enq)}
                                                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-transparent hover:border-emerald-200 hover:bg-emerald-50 text-[10px] font-bold text-emerald-600 transition-all bg-white shadow-sm"
                                                    >
                                                        <CheckCircle2 size={12} /> Done
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRescheduleAction(enq)}
                                                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-transparent hover:border-amber-200 hover:bg-amber-50 text-[10px] font-bold text-amber-600 transition-all bg-white shadow-sm"
                                                    >
                                                        <Clock size={12} /> Resch
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )})}
                            </tbody>
                        </table>
                    ) : (
                        <div className="py-20">
                            <EmptyState
                                icon={Users}
                                title="No enquiries found"
                                description="Record your first admission enquiry."
                                actionLabel="Add New Entry"
                                onAction={() => null}
                                link="/admin/enquiries/new"
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Action Modals */}
            <Modal
                isOpen={activeModal === 'done'}
                onClose={() => setActiveModal(null)}
                title="Log Follow-up Outcome"
                className="max-w-md"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-500 font-medium">Capture a quick note about the call with <span className="text-slate-900 font-bold">{selectedEnquiry?.studentName}</span>.</p>
                    <textarea
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-premium-blue/50 focus:ring-4 focus:ring-premium-blue/5 min-h-[120px] text-sm text-slate-800 transition-all resize-none shadow-inner"
                        placeholder="e.g., Interested, will come for demo on Friday..."
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        autoFocus
                    />
                    <div className="flex items-center gap-2 pb-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Set Next Status:</label>
                        <div className="flex gap-2">
                            {['Pending', 'Confirmed', 'Rejected'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => updateEnquiry(selectedEnquiry._id, { status, notes: actionNote || selectedEnquiry.notes })}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-tight transition-all border ${
                                        selectedEnquiry?.status === status 
                                        ? 'bg-slate-900 text-white border-slate-900' 
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
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
                    <p className="text-sm text-slate-500 font-medium">Pick a new date for <span className="text-slate-900 font-bold">{selectedEnquiry?.studentName}</span>.</p>
                    <input
                        type="date"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/5 text-sm font-bold shadow-inner"
                        value={newFollowUpDate}
                        onChange={(e) => setNewFollowUpDate(e.target.value)}
                    />
                    <Button 
                        fullWidth 
                        onClick={() => updateEnquiry(selectedEnquiry._id, { followUpDate: newFollowUpDate })}
                        disabled={updating}
                        className="h-12 font-black uppercase tracking-widest text-xs"
                    >
                        {updating ? 'Updating...' : 'Update Schedule'}
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
