"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
    Calendar, 
    Clock, 
    CheckCircle, 
    XCircle, 
    Plus, 
    FileText,
    AlertCircle,
    User,
    CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { format } from "date-fns";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import MobileInstructorLeaves from "@/components/instructor/MobileInstructorLeaves";

export default function LeaveRequestsPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const { data: session } = useSession();
    const role = session?.user?.role;
    const isInstructor = role === 'instructor';

    const [requests, setRequests] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Filters (Admin only)
    const [statusFilter, setStatusFilter] = useState("");

    // Modals
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        leaveTypeId: "",
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(), "yyyy-MM-dd"),
        reason: ""
    });

    const [reviewData, setReviewData] = useState({
        status: "",
        adminComment: ""
    });

    useEffect(() => {
        if (session) {
            fetchRequests();
            if (isInstructor) {
                fetchLeaveTypes();
            }
        }
    }, [session, statusFilter]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const url = new URL('/api/v1/hr/leave-requests', window.location.origin);
            if (statusFilter) {
                url.searchParams.append('status', statusFilter);
            }
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch leave requests");
            const data = await res.json();
            setRequests(data.leaveRequests || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load leave requests");
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
            }
        } catch (error) {
            console.error("Failed to fetch leave types", error);
        }
    };

    const handleApplyLeave = async (e) => {
        e.preventDefault();
        if (submitting) return;

        if (!formData.leaveTypeId || !formData.startDate || !formData.endDate || !formData.reason.trim()) {
            toast.warning("Please fill in all required fields");
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
                toast.success("Leave request submitted successfully");
                setIsApplyModalOpen(false);
                setFormData({
                    leaveTypeId: "",
                    startDate: format(new Date(), "yyyy-MM-dd"),
                    endDate: format(new Date(), "yyyy-MM-dd"),
                    reason: ""
                });
                fetchRequests();
            } else {
                const data = await res.json();
                throw new Error(data.error || "Failed to submit leave request");
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelRequest = async (id) => {
        if (!await confirm({
            title: "Cancel Leave Request?",
            message: "Are you sure you want to cancel this leave request? This action cannot be undone.",
            type: "danger"
        })) return;

        try {
            const res = await fetch(`/api/v1/hr/leave-requests/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: 'CANCELLED' })
            });

            if (res.ok) {
                toast.success("Leave request cancelled");
                fetchRequests();
            } else {
                const data = await res.json();
                throw new Error(data.error || "Failed to cancel request");
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (submitting || !selectedRequest) return;

        if (!reviewData.status) {
            toast.warning("Please select an action (Approve or Reject)");
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetch(`/api/v1/hr/leave-requests/${selectedRequest._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reviewData)
            });

            if (res.ok) {
                toast.success(`Leave request ${reviewData.status.toLowerCase()}d successfully`);
                setIsReviewModalOpen(false);
                setSelectedRequest(null);
                setReviewData({ status: "", adminComment: "" });
                fetchRequests();
            } else {
                const data = await res.json();
                throw new Error(data.error || "Failed to submit review");
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const openReviewModal = (request) => {
        setSelectedRequest(request);
        setReviewData({
            status: "",
            adminComment: ""
        });
        setIsReviewModalOpen(true);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PENDING':
                return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
            case 'APPROVED':
                return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Approved</Badge>;
            case 'REJECTED':
                return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Rejected</Badge>;
            case 'CANCELLED':
                return <Badge className="bg-slate-50 text-slate-600 border-slate-200">Cancelled</Badge>;
            default:
                return <Badge className="bg-slate-50 text-slate-500">{status}</Badge>;
        }
    };

    const isInstructorOrStaff = ['instructor', 'staff'].includes(role);

    return (
        <>
            {isInstructorOrStaff && (
                <div className="md:hidden">
                    <MobileInstructorLeaves />
                </div>
            )}

            <div className={cn("space-y-6", isInstructorOrStaff ? "hidden md:block" : "")}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Leave Requests</h1>
                    <p className="text-[12px] text-slate-400 font-medium tracking-tight">
                        {isInstructor ? "Manage and track your leave applications" : "Review and manage staff leave requests"}
                    </p>
                </div>
                {isInstructor && (
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsApplyModalOpen(true)}
                        className="flex items-center gap-2 bg-premium-blue hover:bg-premium-blue/90"
                    >
                        <Plus size={16} />
                        <span>Apply Leave</span>
                    </Button>
                )}
            </div>

            {/* Filter Panel (Admin only) */}
            {!isInstructor && (
                <Card className="p-4 border-transparent shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
                        <div className="flex gap-1.5">
                            {[
                                { label: "All", value: "" },
                                { label: "Pending", value: "PENDING" },
                                { label: "Approved", value: "APPROVED" },
                                { label: "Rejected", value: "REJECTED" },
                                { label: "Cancelled", value: "CANCELLED" }
                            ].map((btn) => (
                                <button
                                    key={btn.value}
                                    onClick={() => setStatusFilter(btn.value)}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                                        statusFilter === btn.value
                                            ? "bg-slate-900 text-white"
                                            : "bg-slate-100 hover:bg-slate-200/70 text-slate-600"
                                    )}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            {/* Main List */}
            <Card className="transition-all border-transparent shadow-sm">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="py-12"><LoadingSpinner /></div>
                    ) : requests.length === 0 ? (
                        <EmptyState
                            icon={CalendarDays}
                            title="No leave requests found"
                            description={isInstructor ? "You haven't submitted any leave requests yet." : "No leave requests match the filters."}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white border-y border-slate-100">
                                        {!isInstructor && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Staff</th>}
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Duration</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Reason</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Remarks</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {requests.map((req) => (
                                        <tr key={req._id} className="group hover:bg-slate-50/50 transition-colors">
                                            {!isInstructor && (
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0">
                                                            {req.user?.profile?.firstName?.slice(0, 1)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900">
                                                                {req.user?.profile?.firstName} {req.user?.profile?.lastName}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-medium">{req.user?.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                                                {req.leaveType?.name || "Custom/General"}
                                                {req.leaveType?.code && <span className="ml-1 text-[10px] font-bold text-slate-400 font-mono">({req.leaveType.code})</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-slate-600">
                                                    {format(new Date(req.startDate), "dd MMM yyyy")}
                                                    <span className="mx-1.5 text-slate-400">→</span>
                                                    {format(new Date(req.endDate), "dd MMM yyyy")}
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-0.5 font-medium flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {Math.ceil((new Date(req.endDate) - new Date(req.startDate)) / (1000 * 60 * 60 * 24)) + 1} day(s)
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate" title={req.reason}>
                                                {req.reason}
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(req.status)}
                                            </td>
                                            <td className="px-6 py-4">
                                                {req.adminComment ? (
                                                    <div>
                                                        <p className="text-xs text-slate-500 font-medium italic">&quot;{req.adminComment}&quot;</p>
                                                        {req.approvedBy && (
                                                            <p className="text-[9px] text-slate-400 mt-0.5">
                                                                Reviewed by {req.approvedBy.profile?.firstName}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 text-xs italic">No comments</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {isInstructor && req.status === 'PENDING' && (
                                                        <Button
                                                            size="xs"
                                                            variant="outline"
                                                            className="text-rose-600 border-rose-200 hover:bg-rose-50"
                                                            onClick={() => handleCancelRequest(req._id)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    )}
                                                    {!isInstructor && req.status === 'PENDING' && (
                                                        <Button
                                                            size="xs"
                                                            variant="outline"
                                                            className="border-slate-200 hover:border-premium-blue hover:text-premium-blue"
                                                            onClick={() => openReviewModal(req)}
                                                        >
                                                            Review
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal: Apply Leave */}
            <Modal
                isOpen={isApplyModalOpen}
                onClose={() => setIsApplyModalOpen(false)}
                title="Apply for Leave"
            >
                <form onSubmit={handleApplyLeave} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Leave Type</label>
                        <Select
                            value={formData.leaveTypeId}
                            onChange={(val) => setFormData(prev => ({ ...prev, leaveTypeId: val }))}
                            options={[
                                { label: "Select Leave Type", value: "" },
                                ...leaveTypes.map(t => ({ label: `${t.name} (${t.code})`, value: t._id }))
                            ]}
                            className="w-full"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Start Date</label>
                            <Input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">End Date</label>
                            <Input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                className="w-full"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reason for Leave</label>
                        <textarea
                            rows={3}
                            value={formData.reason}
                            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                            placeholder="Please explain the reason for your leave request..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:border-premium-blue/30 focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsApplyModalOpen(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            variant="primary" 
                            className="bg-premium-blue hover:bg-premium-blue/90"
                            disabled={submitting}
                        >
                            {submitting ? "Submitting..." : "Submit Request"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Review Leave */}
            <Modal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                title="Review Leave Request"
            >
                {selectedRequest && (
                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Staff Member</p>
                                    <p className="text-sm font-bold text-slate-700">
                                        {selectedRequest.user?.profile?.firstName} {selectedRequest.user?.profile?.lastName}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Leave Type</p>
                                    <p className="text-sm font-bold text-slate-700">{selectedRequest.leaveType?.name}</p>
                                </div>
                            </div>
                            <div className="border-t border-slate-200/50 pt-2 flex justify-between">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Duration</p>
                                    <p className="text-xs font-semibold text-slate-600">
                                        {format(new Date(selectedRequest.startDate), "dd MMM yyyy")} → {format(new Date(selectedRequest.endDate), "dd MMM yyyy")}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Days</p>
                                    <p className="text-xs font-black text-slate-600">
                                        {Math.ceil((new Date(selectedRequest.endDate) - new Date(selectedRequest.startDate)) / (1000 * 60 * 60 * 24)) + 1} day(s)
                                    </p>
                                </div>
                            </div>
                            <div className="border-t border-slate-200/50 pt-2">
                                <p className="text-[10px] uppercase font-bold text-slate-400">Reason</p>
                                <p className="text-xs text-slate-600 leading-normal">{selectedRequest.reason}</p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Action</label>
                            <Select
                                value={reviewData.status}
                                onChange={(val) => setReviewData(prev => ({ ...prev, status: val }))}
                                options={[
                                    { label: "Select Action", value: "" },
                                    { label: "Approve Request", value: "APPROVED" },
                                    { label: "Reject Request", value: "REJECTED" }
                                ]}
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admin Comment</label>
                            <textarea
                                rows={2}
                                value={reviewData.adminComment}
                                onChange={(e) => setReviewData(prev => ({ ...prev, adminComment: e.target.value }))}
                                placeholder="Add any comments or notes (optional)..."
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:border-premium-blue/30 focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsReviewModalOpen(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                variant="primary" 
                                className={cn(
                                    "text-white",
                                    reviewData.status === 'APPROVED' ? "bg-emerald-600 hover:bg-emerald-500" :
                                    reviewData.status === 'REJECTED' ? "bg-rose-600 hover:bg-rose-500" :
                                    "bg-premium-blue hover:bg-premium-blue/90"
                                )}
                                disabled={submitting}
                            >
                                {submitting ? "Submitting..." : "Submit Review"}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
        </>
    );
}
