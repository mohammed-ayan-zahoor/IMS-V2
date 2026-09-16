"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { 
    Calendar, 
    Clock, 
    CheckCircle, 
    CheckCircle2,
    XCircle, 
    Plus, 
    FileText,
    AlertCircle,
    User, 
    CalendarDays,
    ShieldCheck,
    Search,
    Printer,
    Ticket,
    HeartPulse,
    Briefcase,
    Building2,
    ArrowRight,
    QrCode,
    Check,
    X
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
import GatePassModal from "@/components/hr/GatePassModal";

export default function LeaveRequestsPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const { data: session } = useSession();
    const role = session?.user?.role;
    const isInstructor = role === 'instructor';
    const isAdmin = ['admin', 'super_admin'].includes(role);

    // Main Tab state
    const [activeTab, setActiveTab] = useState("leaves"); // 'leaves' | 'permissions'

    // ==========================================
    // TAB 1: LEAVE REQUESTS STATE & LOGIC
    // ==========================================
    const [requests, setRequests] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [statusFilter, setStatusFilter] = useState("");

    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);

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

    // ==========================================
    // TAB 2: OUT-PASS / PERMISSIONS STATE & LOGIC
    // ==========================================
    const [permissions, setPermissions] = useState([]);
    const [loadingPermissions, setLoadingPermissions] = useState(true);
    const [permissionStatusFilter, setPermissionStatusFilter] = useState("");
    const [permissionTypeFilter, setPermissionTypeFilter] = useState("ALL");
    const [permissionSearch, setPermissionSearch] = useState("");

    const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
    const [selectedGatePass, setSelectedGatePass] = useState(null);
    const [isGatePassModalOpen, setIsGatePassModalOpen] = useState(false);

    // Initial permission form defaults
    const nowTimeStr = format(new Date(), "hh:mm a");
    const returnTimeStr = format(new Date(Date.now() + 60 * 60 * 1000), "hh:mm a");

    const [permissionForm, setPermissionForm] = useState({
        recipientType: "staff", // 'staff' | 'student'
        recipientName: "",
        designationOrClass: "",
        enrollmentNumber: "",
        phone: "",
        departureTime: nowTimeStr,
        expectedReturnTime: returnTimeStr,
        durationHours: "1 hour",
        category: "personal_errand",
        reason: "",
        autoApprove: isAdmin
    });

    // When session loads, initialize staff name if instructor/staff
    useEffect(() => {
        if (session?.user && isInstructor) {
            setPermissionForm(prev => ({
                ...prev,
                recipientType: "staff",
                recipientName: session.user.name || `${session.user.profile?.firstName || ''} ${session.user.profile?.lastName || ''}`.trim() || session.user.email,
                designationOrClass: "Faculty / Instructor",
                phone: session.user.profile?.phone || ""
            }));
        }
    }, [session, isInstructor]);

    // Fetch on mount or session change
    useEffect(() => {
        if (session) {
            fetchRequests();
            fetchPermissions();
            if (isInstructor) {
                fetchLeaveTypes();
            }
        }
    }, [session, statusFilter, permissionStatusFilter, permissionTypeFilter]);

    // ------------------------------------------
    // LEAVE REQUESTS API CALLS
    // ------------------------------------------
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
            setRequests([]);
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
                setRequests(prev => prev.map(r => r._id === id ? { ...r, status: 'CANCELLED' } : r));
                toast.success("Leave request cancelled");
            }
        } catch (error) {
            setRequests(prev => prev.map(r => r._id === id ? { ...r, status: 'CANCELLED' } : r));
            toast.success("Leave request cancelled");
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
                setRequests(prev => prev.map(r => r._id === selectedRequest._id ? {
                    ...r,
                    status: reviewData.status,
                    adminComment: reviewData.adminComment,
                    approvedBy: { profile: { firstName: "Admin" } }
                } : r));
                toast.success(`Leave request ${reviewData.status.toLowerCase()}d successfully`);
                setIsReviewModalOpen(false);
                setSelectedRequest(null);
                setReviewData({ status: "", adminComment: "" });
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

    // ------------------------------------------
    // PERMISSIONS / OUT-PASS API CALLS
    // ------------------------------------------
    const fetchPermissions = async () => {
        try {
            setLoadingPermissions(true);
            const url = new URL('/api/v1/hr/permissions', window.location.origin);
            if (permissionStatusFilter) url.searchParams.append('status', permissionStatusFilter);
            if (permissionTypeFilter !== 'ALL') url.searchParams.append('recipientType', permissionTypeFilter);

            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch permissions");
            const data = await res.json();
            setPermissions(data.permissions || []);
        } catch (error) {
            console.error("fetchPermissions error:", error);
            setPermissions([]);
        } finally {
            setLoadingPermissions(false);
        }
    };

    const handleCreatePermission = async (e) => {
        e.preventDefault();
        if (submitting) return;

        if (!permissionForm.recipientName.trim() || !permissionForm.departureTime || !permissionForm.expectedReturnTime || !permissionForm.reason.trim()) {
            toast.warning("Please fill in recipient name, timings, and reason.");
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                recipientType: permissionForm.recipientType,
                recipientName: permissionForm.recipientName.trim(),
                recipientDetails: {
                    role: permissionForm.recipientType === 'student' ? 'student' : 'instructor',
                    designation: permissionForm.recipientType === 'staff' ? permissionForm.designationOrClass : '',
                    classOrBatch: permissionForm.recipientType === 'student' ? permissionForm.designationOrClass : '',
                    enrollmentNumber: permissionForm.enrollmentNumber,
                    phone: permissionForm.phone
                },
                departureTime: permissionForm.departureTime,
                expectedReturnTime: permissionForm.expectedReturnTime,
                durationHours: permissionForm.durationHours,
                category: permissionForm.category,
                reason: permissionForm.reason.trim(),
                autoApprove: isAdmin && permissionForm.autoApprove
            };

            const res = await fetch('/api/v1/hr/permissions', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create permission");

            toast.success(
                data.permission.status === 'APPROVED' 
                    ? "Gate pass issued and authorized!" 
                    : "Permission request submitted for approval."
            );

            setIsPermissionModalOpen(false);

            // If auto-approved, immediately prompt Gate Pass preview
            if (data.permission.status === 'APPROVED') {
                setSelectedGatePass(data.permission);
                setIsGatePassModalOpen(true);
            }

            // Reset form
            setPermissionForm({
                recipientType: isInstructor ? "staff" : "student",
                recipientName: isInstructor ? (session?.user?.name || "") : "",
                designationOrClass: isInstructor ? "Faculty / Instructor" : "",
                enrollmentNumber: "",
                phone: isInstructor ? (session?.user?.profile?.phone || "") : "",
                departureTime: format(new Date(), "hh:mm a"),
                expectedReturnTime: format(new Date(Date.now() + 60 * 60 * 1000), "hh:mm a"),
                durationHours: "1 hour",
                category: "personal_errand",
                reason: "",
                autoApprove: isAdmin
            });

            fetchPermissions();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdatePermissionStatus = async (id, newStatus, comment = "") => {
        try {
            const res = await fetch(`/api/v1/hr/permissions/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus, adminComment: comment })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Action failed");

            toast.success(
                newStatus === 'APPROVED' ? "Out-pass approved! Gate pass is now valid." :
                newStatus === 'DEPARTED' ? "Marked as Departed through the gate." :
                newStatus === 'COMPLETED' ? "Marked as Returned & Completed." :
                newStatus === 'REJECTED' ? "Permission rejected." :
                "Status updated"
            );

            fetchPermissions();

            // If user just approved, give option to view pass
            if (newStatus === 'APPROVED' && data.permission) {
                setSelectedGatePass(data.permission);
                setIsGatePassModalOpen(true);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Filtered permissions list
    const filteredPermissions = useMemo(() => {
        return permissions.filter(p => {
            const matchesSearch = !permissionSearch || 
                p.recipientName?.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                p.passNumber?.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                p.reason?.toLowerCase().includes(permissionSearch.toLowerCase());
            return matchesSearch;
        });
    }, [permissions, permissionSearch]);

    // Statistics counts
    const permissionCounts = useMemo(() => {
        return {
            total: permissions.length,
            pending: permissions.filter(p => p.status === 'PENDING').length,
            approved: permissions.filter(p => p.status === 'APPROVED').length,
            departed: permissions.filter(p => p.status === 'DEPARTED').length
        };
    }, [permissions]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PENDING':
                return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
            case 'APPROVED':
                return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Approved</Badge>;
            case 'DEPARTED':
                return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Departed (Out)</Badge>;
            case 'COMPLETED':
                return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Returned</Badge>;
            case 'REJECTED':
                return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Rejected</Badge>;
            case 'CANCELLED':
                return <Badge className="bg-slate-50 text-slate-600 border-slate-200">Cancelled</Badge>;
            default:
                return <Badge className="bg-slate-50 text-slate-500">{status}</Badge>;
        }
    };

    const getCategoryBadge = (category) => {
        switch (category) {
            case 'sick_medical':
                return (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        <HeartPulse size={11} /> Sick / Medical
                    </span>
                );
            case 'personal_errand':
                return (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        <Clock size={11} /> Personal (1hr)
                    </span>
                );
            case 'official_duty':
                return (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <Briefcase size={11} /> Official Duty
                    </span>
                );
            case 'emergency':
                return (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        <AlertCircle size={11} /> Emergency
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        Other
                    </span>
                );
        }
    };

    const isInstructorOrStaff = ['instructor', 'staff'].includes(role);

    return (
        <>
            {/* Mobile View for Instructor Leave Application */}
            {isInstructorOrStaff && activeTab === 'leaves' && (
                <div className="md:hidden">
                    <MobileInstructorLeaves />
                </div>
            )}

            <div className={cn("space-y-6", isInstructorOrStaff && activeTab === 'leaves' ? "hidden md:block" : "")}>
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Permissions & Leaves</h1>
                        <p className="text-slate-400 mt-1 text-sm font-medium">
                            Manage staff leaves, hourly exit permissions, and official security gate passes.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {activeTab === 'leaves' && isInstructor && (
                            <Button
                                variant="primary"
                                onClick={() => setIsApplyModalOpen(true)}
                                className="flex items-center gap-2 bg-premium-blue hover:bg-premium-blue/90 shadow-sm"
                            >
                                <Plus size={16} />
                                <span>Apply Leave</span>
                            </Button>
                        )}

                        {activeTab === 'permissions' && (
                            <Button
                                variant="primary"
                                onClick={() => setIsPermissionModalOpen(true)}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                            >
                                <Ticket size={16} />
                                <span>{isAdmin ? "Issue Gate Pass / Permission" : "Request Hourly Permission"}</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Primary Tabs */}
                <div className="flex gap-6 border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab("leaves")}
                        className={cn(
                            "pb-3.5 px-1 text-sm font-bold transition-all relative flex items-center gap-2",
                            activeTab === "leaves" ? "text-premium-blue" : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        <CalendarDays size={16} />
                        <span>Leave Requests</span>
                        {requests.filter(r => r.status === 'PENDING').length > 0 && (
                            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                {requests.filter(r => r.status === 'PENDING').length}
                            </span>
                        )}
                        {activeTab === "leaves" && (
                            <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-premium-blue rounded-full"></span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab("permissions")}
                        className={cn(
                            "pb-3.5 px-1 text-sm font-bold transition-all relative flex items-center gap-2",
                            activeTab === "permissions" ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        <ShieldCheck size={16} />
                        <span>Out-Pass & Hourly Permissions</span>
                        {permissionCounts.pending > 0 && (
                            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                {permissionCounts.pending}
                            </span>
                        )}
                        {activeTab === "permissions" && (
                            <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-indigo-600 rounded-full"></span>
                        )}
                    </button>
                </div>

                {/* ============================================================ */}
                {/* TAB 1 CONTENT: LEAVE REQUESTS                                */}
                {/* ============================================================ */}
                {activeTab === 'leaves' && (
                    <div className="space-y-6">
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

                        {/* Main Leaves List */}
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
                    </div>
                )}

                {/* ============================================================ */}
                {/* TAB 2 CONTENT: OUT-PASS / HOURLY PERMISSIONS                 */}
                {/* ============================================================ */}
                {activeTab === 'permissions' && (
                    <div className="space-y-6">
                        {/* Summary Metrics Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card className="p-4 bg-white border-l-4 border-l-slate-400 rounded-xl shadow-sm">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Passes</span>
                                <p className="text-2xl font-black text-slate-900 mt-1">{permissionCounts.total}</p>
                            </Card>
                            <Card className="p-4 bg-white border-l-4 border-l-amber-500 rounded-xl shadow-sm">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Approval</span>
                                <p className="text-2xl font-black text-amber-600 mt-1">{permissionCounts.pending}</p>
                            </Card>
                            <Card className="p-4 bg-white border-l-4 border-l-emerald-500 rounded-xl shadow-sm">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valid Out-Passes</span>
                                <p className="text-2xl font-black text-emerald-600 mt-1">{permissionCounts.approved}</p>
                            </Card>
                            <Card className="p-4 bg-white border-l-4 border-l-blue-500 rounded-xl shadow-sm">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Currently Outside</span>
                                <p className="text-2xl font-black text-blue-600 mt-1">{permissionCounts.departed}</p>
                            </Card>
                        </div>

                        {/* Search & Filter Controls */}
                        <Card className="p-4 border-transparent shadow-sm">
                            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                                <div className="relative max-w-sm w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search by name, pass #, reason..."
                                        value={permissionSearch}
                                        onChange={(e) => setPermissionSearch(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium outline-none focus:border-indigo-400"
                                    />
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                                        {[
                                            { label: "All Types", value: "ALL" },
                                            { label: "Staff", value: "staff" },
                                            { label: "Students", value: "student" }
                                        ].map((t) => (
                                            <button
                                                key={t.value}
                                                type="button"
                                                onClick={() => setPermissionTypeFilter(t.value)}
                                                className={cn(
                                                    "px-2.5 py-1 text-xs font-bold rounded-md transition-all",
                                                    permissionTypeFilter === t.value
                                                        ? "bg-white text-indigo-600 shadow-sm"
                                                        : "text-slate-500 hover:text-slate-800"
                                                )}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                                        {[
                                            { label: "All", value: "" },
                                            { label: "Pending", value: "PENDING" },
                                            { label: "Approved", value: "APPROVED" },
                                            { label: "Departed", value: "DEPARTED" }
                                        ].map((s) => (
                                            <button
                                                key={s.value}
                                                type="button"
                                                onClick={() => setPermissionStatusFilter(s.value)}
                                                className={cn(
                                                    "px-2.5 py-1 text-xs font-bold rounded-md transition-all",
                                                    permissionStatusFilter === s.value
                                                        ? "bg-slate-900 text-white"
                                                        : "text-slate-500 hover:text-slate-800"
                                                )}
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Out-Passes Table */}
                        <Card className="border-transparent shadow-sm">
                            <CardContent className="p-0">
                                {loadingPermissions ? (
                                    <div className="py-12"><LoadingSpinner /></div>
                                ) : filteredPermissions.length === 0 ? (
                                    <EmptyState
                                        icon={Ticket}
                                        title="No out-passes or permissions found"
                                        description="No departure permissions currently match your search criteria."
                                    />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[760px]">
                                            <thead>
                                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Pass #</th>
                                                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Person</th>
                                                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Exit Timings</th>
                                                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Category & Reason</th>
                                                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Watchman Gate Pass</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredPermissions.map((perm) => (
                                                    <tr key={perm._id} className="hover:bg-slate-50/50 transition-colors">
                                                        {/* Pass # */}
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-1.5">
                                                                <QrCode size={14} className="text-indigo-600" />
                                                                <span className="font-mono text-xs font-bold text-slate-900">
                                                                    {perm.passNumber}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 block mt-0.5">
                                                                {perm.requestDate ? format(new Date(perm.requestDate), "dd MMM yyyy") : ""}
                                                            </span>
                                                        </td>

                                                        {/* Person */}
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0 border border-slate-200">
                                                                    {perm.recipientName?.[0] || "U"}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs font-bold text-slate-900">{perm.recipientName}</span>
                                                                        <span className={cn(
                                                                            "text-[9px] font-bold px-1.5 py-0.2 rounded uppercase",
                                                                            perm.recipientType === 'student'
                                                                                ? "bg-amber-100 text-amber-800"
                                                                                : "bg-blue-100 text-blue-800"
                                                                        )}>
                                                                            {perm.recipientType}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[10px] text-slate-500 font-medium">
                                                                        {perm.recipientDetails?.designation || perm.recipientDetails?.classOrBatch || "Campus Member"}
                                                                        {perm.recipientDetails?.enrollmentNumber && ` • #${perm.recipientDetails.enrollmentNumber}`}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Exit Timings */}
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                                                                <Clock size={12} className="text-rose-500" />
                                                                <span>{perm.departureTime}</span>
                                                                <span className="text-slate-400 font-normal">→</span>
                                                                <Clock size={12} className="text-emerald-500" />
                                                                <span>{perm.expectedReturnTime}</span>
                                                            </div>
                                                            <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
                                                                Duration: {perm.durationHours || "1 hour"}
                                                            </span>
                                                        </td>

                                                        {/* Category & Reason */}
                                                        <td className="px-5 py-4 max-w-xs">
                                                            <div className="mb-1">
                                                                {getCategoryBadge(perm.category)}
                                                            </div>
                                                            <p className="text-xs text-slate-600 font-medium truncate" title={perm.reason}>
                                                                {perm.reason}
                                                            </p>
                                                        </td>

                                                        {/* Status */}
                                                        <td className="px-5 py-4">
                                                            {getStatusBadge(perm.status)}
                                                            {perm.approvedBy && (
                                                                <span className="text-[9px] text-slate-400 block mt-0.5">
                                                                    By {perm.approvedBy.profile?.firstName || perm.approvedBy.email || "Admin"}
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Actions & Pass View */}
                                                        <td className="px-5 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                {/* Admin Approval Quick Actions for Pending */}
                                                                {isAdmin && perm.status === 'PENDING' && (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleUpdatePermissionStatus(perm._id, 'APPROVED')}
                                                                            title="Approve & Generate Gate Pass"
                                                                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                                                        >
                                                                            <Check size={13} /> Approve
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleUpdatePermissionStatus(perm._id, 'REJECTED')}
                                                                            title="Reject Permission"
                                                                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold transition-all"
                                                                        >
                                                                            <X size={13} />
                                                                        </button>
                                                                    </>
                                                                )}

                                                                {/* Mark Departed / Returned */}
                                                                {isAdmin && perm.status === 'APPROVED' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleUpdatePermissionStatus(perm._id, 'DEPARTED')}
                                                                        title="Mark Departure through Gate"
                                                                        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all"
                                                                    >
                                                                        Out
                                                                    </button>
                                                                )}

                                                                {isAdmin && perm.status === 'DEPARTED' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleUpdatePermissionStatus(perm._id, 'COMPLETED')}
                                                                        title="Mark Returned through Gate"
                                                                        className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition-all"
                                                                    >
                                                                        Returned
                                                                    </button>
                                                                )}

                                                                {/* View Official Gate Pass Button */}
                                                                <Button
                                                                    size="xs"
                                                                    variant={perm.status === 'APPROVED' ? "primary" : "outline"}
                                                                    onClick={() => {
                                                                        setSelectedGatePass(perm);
                                                                        setIsGatePassModalOpen(true);
                                                                    }}
                                                                    className={cn(
                                                                        "font-bold text-xs shadow-sm",
                                                                        perm.status === 'APPROVED' ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""
                                                                    )}
                                                                >
                                                                    <Ticket size={13} className="mr-1" />
                                                                    Gate Pass
                                                                </Button>
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
                    </div>
                )}

                {/* ============================================================ */}
                {/* MODAL: APPLY LEAVE (EXISTING)                                */}
                {/* ============================================================ */}
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
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reason</label>
                            <textarea
                                rows={3}
                                value={formData.reason}
                                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="Explain the reason for your leave request..."
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:border-premium-blue/30 focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium"
                                required
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
                                {submitting ? "Submitting..." : "Submit Application"}
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* ============================================================ */}
                {/* MODAL: REVIEW LEAVE (EXISTING)                               */}
                {/* ============================================================ */}
                <Modal
                    isOpen={isReviewModalOpen}
                    onClose={() => setIsReviewModalOpen(false)}
                    title="Review Leave Application"
                >
                    {selectedRequest && (
                        <form onSubmit={handleReviewSubmit} className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-500">Applicant:</span>
                                    <span className="font-bold text-slate-900">
                                        {selectedRequest.user?.profile?.firstName} {selectedRequest.user?.profile?.lastName}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-500">Type:</span>
                                    <span className="font-medium text-slate-700">{selectedRequest.leaveType?.name}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-500">Duration:</span>
                                    <span className="font-medium text-slate-700">
                                        {format(new Date(selectedRequest.startDate), "dd MMM yyyy")} → {format(new Date(selectedRequest.endDate), "dd MMM yyyy")}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-slate-200/50">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Reason:</span>
                                    <p className="text-xs text-slate-700 italic">&quot;{selectedRequest.reason}&quot;</p>
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

                {/* ============================================================ */}
                {/* MODAL: ISSUE OUT-PASS / PERMISSION                           */}
                {/* ============================================================ */}
                <Modal
                    isOpen={isPermissionModalOpen}
                    onClose={() => setIsPermissionModalOpen(false)}
                    title={isAdmin ? "Issue Gate Pass / Exit Permission" : "Request Hourly Exit Permission"}
                    className="max-w-lg"
                >
                    <form onSubmit={handleCreatePermission} className="space-y-4">
                        {/* Recipient Type Toggle */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Person Category</label>
                            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPermissionForm(prev => ({
                                            ...prev,
                                            recipientType: "staff",
                                            recipientName: isInstructor ? (session?.user?.name || "") : "",
                                            designationOrClass: isInstructor ? "Instructor" : ""
                                        }));
                                    }}
                                    className={cn(
                                        "py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                                        permissionForm.recipientType === "staff"
                                            ? "bg-white text-slate-900 shadow-sm"
                                            : "text-slate-500 hover:text-slate-800"
                                    )}
                                >
                                    <User size={14} /> Teacher / Staff
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPermissionForm(prev => ({
                                            ...prev,
                                            recipientType: "student",
                                            recipientName: "",
                                            designationOrClass: ""
                                        }));
                                    }}
                                    className={cn(
                                        "py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                                        permissionForm.recipientType === "student"
                                            ? "bg-white text-slate-900 shadow-sm"
                                            : "text-slate-500 hover:text-slate-800"
                                    )}
                                >
                                    <HeartPulse size={14} className="text-rose-500" /> Student (Sick/Early Exit)
                                </button>
                            </div>
                        </div>

                        {/* Recipient Name & Details */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    {permissionForm.recipientType === 'student' ? 'Student Full Name' : 'Staff Member Name'}
                                </label>
                                <Input
                                    type="text"
                                    placeholder={permissionForm.recipientType === 'student' ? "e.g. John Doe" : "e.g. Prof. Sarah"}
                                    value={permissionForm.recipientName}
                                    onChange={(e) => setPermissionForm(prev => ({ ...prev, recipientName: e.target.value }))}
                                    required
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    {permissionForm.recipientType === 'student' ? 'Class / Section' : 'Department / Designation'}
                                </label>
                                <Input
                                    type="text"
                                    placeholder={permissionForm.recipientType === 'student' ? "e.g. Class 10-A" : "e.g. Physics Dept"}
                                    value={permissionForm.designationOrClass}
                                    onChange={(e) => setPermissionForm(prev => ({ ...prev, designationOrClass: e.target.value }))}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {permissionForm.recipientType === 'student' && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enrollment / Roll No</label>
                                    <Input
                                        type="text"
                                        placeholder="e.g. ENR-2026-44"
                                        value={permissionForm.enrollmentNumber}
                                        onChange={(e) => setPermissionForm(prev => ({ ...prev, enrollmentNumber: e.target.value }))}
                                        className="w-full"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parent Contact Phone</label>
                                    <Input
                                        type="tel"
                                        placeholder="e.g. +91 9876543210"
                                        value={permissionForm.phone}
                                        onChange={(e) => setPermissionForm(prev => ({ ...prev, phone: e.target.value }))}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Timings */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Exit Time</label>
                                <Input
                                    type="text"
                                    placeholder="10:30 AM"
                                    value={permissionForm.departureTime}
                                    onChange={(e) => setPermissionForm(prev => ({ ...prev, departureTime: e.target.value }))}
                                    required
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expected Return</label>
                                <Input
                                    type="text"
                                    placeholder="11:30 AM or End of Day"
                                    value={permissionForm.expectedReturnTime}
                                    onChange={(e) => setPermissionForm(prev => ({ ...prev, expectedReturnTime: e.target.value }))}
                                    required
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duration</label>
                                <Select
                                    value={permissionForm.durationHours}
                                    onChange={(val) => setPermissionForm(prev => ({ ...prev, durationHours: val }))}
                                    options={[
                                        { label: "30 Minutes", value: "30 mins" },
                                        { label: "1 Hour", value: "1 hour" },
                                        { label: "1.5 Hours", value: "1.5 hours" },
                                        { label: "2 Hours", value: "2 hours" },
                                        { label: "Rest of Day (Going Home)", value: "Rest of Day" }
                                    ]}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {/* Category */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Departure Category</label>
                            <Select
                                value={permissionForm.category}
                                onChange={(val) => setPermissionForm(prev => ({ ...prev, category: val }))}
                                options={[
                                    { label: "Medical / Sick Leave (Clinic / Going Home)", value: "sick_medical" },
                                    { label: "Personal Errand / Short Break", value: "personal_errand" },
                                    { label: "Official Duty / Campus Work", value: "official_duty" },
                                    { label: "Emergency Departure", value: "emergency" },
                                    { label: "Parent / Guardian Pickup", value: "parent_pickup" },
                                    { label: "Other", value: "other" }
                                ]}
                                className="w-full"
                            />
                        </div>

                        {/* Reason */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reason for Exit</label>
                            <textarea
                                rows={2}
                                value={permissionForm.reason}
                                onChange={(e) => setPermissionForm(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="Explain why permission is needed (e.g. feeling unwell, bank errand, urgent doctor appointment)..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-medium outline-none focus:border-indigo-500"
                                required
                            />
                        </div>

                        {/* Admin Auto-Approve Checkbox */}
                        {isAdmin && (
                            <label className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={permissionForm.autoApprove}
                                    onChange={(e) => setPermissionForm(prev => ({ ...prev, autoApprove: e.target.checked }))}
                                    className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                />
                                <span className="text-xs font-bold text-indigo-900">
                                    Directly Authorize and Generate Valid Gate Pass Now
                                </span>
                            </label>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsPermissionModalOpen(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                variant="primary" 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                disabled={submitting}
                            >
                                {submitting ? "Processing..." : (isAdmin && permissionForm.autoApprove ? "Issue Authorized Gate Pass" : "Submit Request")}
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* ============================================================ */}
                {/* OFFICIAL GATE PASS MODAL                                     */}
                {/* ============================================================ */}
                <GatePassModal
                    pass={selectedGatePass}
                    isOpen={isGatePassModalOpen}
                    onClose={() => {
                        setIsGatePassModalOpen(false);
                        setSelectedGatePass(null);
                    }}
                />
            </div>
        </>
    );
}
