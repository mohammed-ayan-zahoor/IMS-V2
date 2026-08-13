"use client";

import { useState, useEffect } from "react";
import { Plus, Calendar, Clock, CheckCircle, XCircle, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import MobileBottomSheet from "@/components/mobile/MobileBottomSheet";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";

export default function MobileInstructorLeaves() {
    const toast = useToast();
    const [requests, setRequests] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [filterStatus, setFilterStatus] = useState("ALL");

    const [isApplySheetOpen, setIsApplySheetOpen] = useState(false);
    const [formData, setFormData] = useState({
        leaveTypeId: "",
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(), "yyyy-MM-dd"),
        reason: ""
    });

    useEffect(() => {
        fetchRequests();
        fetchLeaveTypes();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/v1/hr/leave-requests');
            if (res.ok) {
                const data = await res.json();
                setRequests(data.leaveRequests || []);
            }
        } catch (e) {
            console.error("Failed to fetch leave requests", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaveTypes = async () => {
        try {
            const res = await fetch('/api/v1/hr/leave-types');
            if (res.ok) {
                const data = await res.json();
                setLeaveTypes(data.leaveTypes || []);
                if (data.leaveTypes?.length > 0 && !formData.leaveTypeId) {
                    setFormData(prev => ({ ...prev, leaveTypeId: data.leaveTypes[0]._id }));
                }
            }
        } catch (e) {
            console.error("Failed to fetch leave types", e);
        }
    };

    const handleApply = async (e) => {
        e.preventDefault();
        if (!formData.leaveTypeId) {
            toast.error("Please select a leave type");
            return;
        }
        try {
            setSubmitting(true);
            const res = await fetch('/api/v1/hr/leave-requests', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success("Leave application submitted!");
                setIsApplySheetOpen(false);
                setFormData({
                    leaveTypeId: leaveTypes[0]?._id || "",
                    startDate: format(new Date(), "yyyy-MM-dd"),
                    endDate: format(new Date(), "yyyy-MM-dd"),
                    reason: ""
                });
                fetchRequests();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to submit application");
            }
        } catch (e) {
            toast.error("Network error");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredRequests = requests.filter(r => {
        if (filterStatus === "ALL") return true;
        return r.status === filterStatus;
    });

    return (
        <div className="space-y-3 pb-8 pt-1">
            {/* Header */}
            <div className="bg-slate-900 text-white rounded-lg p-3 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Teacher Portal
                        </span>
                        <h1 className="text-base font-bold text-white">My Leave Requests</h1>
                    </div>

                    <button
                        onClick={() => setIsApplySheetOpen(true)}
                        className="bg-white hover:bg-slate-100 text-slate-900 px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-colors shadow-none"
                    >
                        <Plus size={14} /> Apply Leave
                    </button>
                </div>

                {/* Filter Pills */}
                <div className="flex gap-1.5 pt-1 border-t border-slate-800 overflow-x-auto">
                    {["ALL", "PENDING", "APPROVED", "REJECTED"].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={cn(
                                "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-colors shrink-0 border",
                                filterStatus === status 
                                    ? "bg-white text-slate-900 border-white" 
                                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                            )}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Leave Request List Feed */}
            {loading ? (
                <div className="bg-white p-6 rounded-lg text-center border border-slate-200 text-xs font-medium text-slate-500">
                    Loading leave applications...
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="bg-white p-6 rounded-lg text-center border border-slate-200">
                    <CalendarDays size={24} className="text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-700">No Leave Applications</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Tap "+ Apply Leave" to submit a new application.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredRequests.map(req => {
                        const status = req.status;
                        return (
                            <div key={req._id} className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-900 leading-snug">
                                            {req.leaveType?.name || "Leave"}
                                        </h3>
                                        <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                                            <Calendar size={12} />
                                            {format(new Date(req.startDate), 'MMM d')} - {format(new Date(req.endDate), 'MMM d, yyyy')} ({req.daysCount} Day{req.daysCount > 1 ? 's' : ''})
                                        </p>
                                    </div>

                                    <span className={cn(
                                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded border",
                                        status === 'APPROVED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                        status === 'REJECTED' ? "bg-rose-50 text-rose-700 border-rose-200" :
                                        "bg-amber-50 text-amber-700 border-amber-200"
                                    )}>
                                        {status}
                                    </span>
                                </div>

                                {req.reason && (
                                    <p className="text-xs text-slate-600 font-normal pt-1 border-t border-slate-100">
                                        "{req.reason}"
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Leave Application Bottom Sheet */}
            <MobileBottomSheet
                isOpen={isApplySheetOpen}
                onClose={() => setIsApplySheetOpen(false)}
                title="Apply For Leave"
                subtitle="Submit leave application to administration"
            >
                <form onSubmit={handleApply} className="space-y-3 pt-1">
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Leave Type *</label>
                        <select
                            required
                            value={formData.leaveTypeId}
                            onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                            className="w-full mt-1 p-2.5 border border-slate-200 rounded-md text-xs font-bold text-slate-800 bg-white"
                        >
                            <option value="">Select Leave Type...</option>
                            {leaveTypes.map(lt => (
                                <option key={lt._id} value={lt._id}>{lt.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Start Date *</label>
                            <input
                                type="date"
                                required
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full mt-1 p-2.5 border border-slate-200 rounded-md text-xs font-bold text-slate-800 bg-white"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">End Date *</label>
                            <input
                                type="date"
                                required
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="w-full mt-1 p-2.5 border border-slate-200 rounded-md text-xs font-bold text-slate-800 bg-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Reason *</label>
                        <textarea
                            required
                            rows={3}
                            placeholder="Reason for leave..."
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            className="w-full mt-1 p-2.5 border border-slate-200 rounded-md text-xs font-medium text-slate-800 outline-none focus:border-slate-400"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button type="button" variant="ghost" onClick={() => setIsApplySheetOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? "Submitting..." : "Submit Application"}
                        </Button>
                    </div>
                </form>
            </MobileBottomSheet>
        </div>
    );
}
