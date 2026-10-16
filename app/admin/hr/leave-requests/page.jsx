"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { 
    Clock, 
    Plus, 
    User, 
    CalendarDays,
    ShieldCheck,
    Search,
    Ticket,
    HeartPulse,
    Briefcase,
    AlertCircle,
    Check,
    X,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { format } from "date-fns";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import MobileInstructorLeaves from "@/components/instructor/MobileInstructorLeaves";
import GatePassModal from "@/components/hr/GatePassModal";
import { motion, AnimatePresence } from "framer-motion";

// ── Apple-Design Critically Damped Springs ────────────────────────────────────
const SPRING_FAST = { type: "spring", bounce: 0, duration: 0.22 };

const getInitials = (name) => {
    if (!name) return "—";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function LeaveRequestsPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const { data: session } = useSession();
    const role = session?.user?.role;
    const isInstructor = role === "instructor";
    const isAdmin = ["admin", "super_admin"].includes(role);

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
    const [leaveSearch, setLeaveSearch] = useState("");

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

    const searchInputRef = useRef(null);

    // Initial permission form defaults
    const nowTimeStr = format(new Date(), "hh:mm a");
    const returnTimeStr = format(new Date(Date.now() + 60 * 60 * 1000), "hh:mm a");

    const [permissionForm, setPermissionForm] = useState({
        recipientType: "staff",
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
                recipientName: session.user.name || `${session.user.profile?.firstName || ""} ${session.user.profile?.lastName || ""}`.trim() || session.user.email,
                designationOrClass: "Faculty / Instructor",
                phone: session.user.profile?.phone || ""
            }));
        }
    }, [session, isInstructor]);

    // ------------------------------------------
    // API CALLS (useCallback)
    // ------------------------------------------
    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            const url = new URL("/api/v1/hr/leave-requests", window.location.origin);
            if (statusFilter) {
                url.searchParams.append("status", statusFilter);
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
    }, [statusFilter]);

    const fetchLeaveTypes = useCallback(async () => {
        try {
            const res = await fetch("/api/v1/hr/leave-types");
            if (res.ok) {
                const data = await res.json();
                setLeaveTypes(data.leaveTypes || []);
            }
        } catch (error) {
            console.error("Failed to fetch leave types", error);
        }
    }, []);

    const fetchPermissions = useCallback(async () => {
        try {
            setLoadingPermissions(true);
            const url = new URL("/api/v1/hr/permissions", window.location.origin);
            if (permissionStatusFilter) url.searchParams.append("status", permissionStatusFilter);
            if (permissionTypeFilter !== "ALL") url.searchParams.append("recipientType", permissionTypeFilter);

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
    }, [permissionStatusFilter, permissionTypeFilter]);

    // Fetch on mount or filter change
    useEffect(() => {
        if (session) {
            fetchRequests();
            fetchPermissions();
            if (isInstructor) {
                fetchLeaveTypes();
            }
        }
    }, [session, isInstructor, fetchRequests, fetchPermissions, fetchLeaveTypes]);

    const handleApplyLeave = async (e) => {
        e.preventDefault();
        if (submitting) return;

        if (!formData.leaveTypeId || !formData.startDate || !formData.endDate || !formData.reason.trim()) {
            toast.warning("Please fill in all required fields");
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetch("/api/v1/hr/leave-requests", {
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
                body: JSON.stringify({ status: "CANCELLED" })
            });

            if (res.ok) {
                toast.success("Leave request cancelled");
                fetchRequests();
            } else {
                setRequests(prev => prev.map(r => r._id === id ? { ...r, status: "CANCELLED" } : r));
                toast.success("Leave request cancelled");
            }
        } catch (error) {
            setRequests(prev => prev.map(r => r._id === id ? { ...r, status: "CANCELLED" } : r));
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
                    role: permissionForm.recipientType === "student" ? "student" : "instructor",
                    designation: permissionForm.recipientType === "staff" ? permissionForm.designationOrClass : "",
                    classOrBatch: permissionForm.recipientType === "student" ? permissionForm.designationOrClass : "",
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

            const res = await fetch("/api/v1/hr/permissions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create permission");

            toast.success(
                data.permission.status === "APPROVED" 
                    ? "Gate pass issued and authorized!" 
                    : "Permission request submitted for approval."
            );

            setIsPermissionModalOpen(false);

            if (data.permission.status === "APPROVED") {
                setSelectedGatePass(data.permission);
                setIsGatePassModalOpen(true);
            }

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
                newStatus === "APPROVED" ? "Out-pass approved! Gate pass is now valid." :
                newStatus === "DEPARTED" ? "Marked as Departed through gate." :
                newStatus === "COMPLETED" ? "Marked as Returned & Completed." :
                newStatus === "REJECTED" ? "Permission rejected." :
                "Status updated"
            );

            fetchPermissions();

            if (newStatus === "APPROVED" && data.permission) {
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
            const query = permissionSearch.toLowerCase();
            const matchesSearch = !permissionSearch || 
                p.recipientName?.toLowerCase().includes(query) ||
                p.passNumber?.toLowerCase().includes(query) ||
                p.reason?.toLowerCase().includes(query);
            return matchesSearch;
        });
    }, [permissions, permissionSearch]);

    // Statistics counts
    const permissionCounts = useMemo(() => {
        return {
            total: permissions.length,
            pending: permissions.filter(p => p.status === "PENDING").length,
            approved: permissions.filter(p => p.status === "APPROVED").length,
            departed: permissions.filter(p => p.status === "DEPARTED").length,
            staff: permissions.filter(p => p.recipientType === "staff").length,
            student: permissions.filter(p => p.recipientType === "student").length
        };
    }, [permissions]);

    const leaveCounts = useMemo(() => {
        let pending = 0, approved = 0, rejected = 0, cancelled = 0;
        requests.forEach(r => {
            if (r.status === "PENDING") pending++;
            else if (r.status === "APPROVED") approved++;
            else if (r.status === "REJECTED") rejected++;
            else if (r.status === "CANCELLED") cancelled++;
        });
        return { all: requests.length, pending, approved, rejected, cancelled };
    }, [requests]);

    const filteredRequests = useMemo(() => {
        return requests.filter(r => {
            if (!leaveSearch) return true;
            const q = leaveSearch.toLowerCase();
            const staffName = `${r.user?.profile?.firstName || ""} ${r.user?.profile?.lastName || ""}`.toLowerCase();
            const reason = (r.reason || "").toLowerCase();
            const type = (r.leaveType?.name || "").toLowerCase();
            return staffName.includes(q) || reason.includes(q) || type.includes(q);
        });
    }, [requests, leaveSearch]);

    const isInstructorOrStaff = ["instructor", "staff"].includes(role);

    return (
        <>
            {/* Mobile View for Instructor Leave Application */}
            {isInstructorOrStaff && activeTab === "leaves" && (
                <div className="md:hidden">
                    <MobileInstructorLeaves />
                </div>
            )}

            <div className={cn("text-[#14161A] select-none min-h-[calc(100vh-64px)] pb-24 font-[-apple-system,BlinkMacSystemFont,'Inter',system-ui,sans-serif]", isInstructorOrStaff && activeTab === "leaves" ? "hidden md:block" : "")}>
                {/* ── Page Header (H1, Live Subtitle, Primary Action) ──────────────────── */}
                <div className="pt-2 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-semibold text-[#14161A] tracking-[-0.015em] leading-tight m-0">
                            Permissions & leaves
                        </h1>
                        <p className="text-[13px] text-[#5F6673] mt-1 font-normal tabular-nums">
                            {activeTab === "leaves" ? (
                                loading ? (
                                    <span className="inline-flex items-center gap-1.5 text-indigo-600">
                                        <Loader2 size={12} className="animate-spin" /> Loading leave requests…
                                    </span>
                                ) : (
                                    <span>
                                        {requests.length} {requests.length === 1 ? "request" : "requests"} ({leaveCounts.pending} pending, {leaveCounts.approved} approved)
                                    </span>
                                )
                            ) : (
                                loadingPermissions ? (
                                    <span className="inline-flex items-center gap-1.5 text-indigo-600">
                                        <Loader2 size={12} className="animate-spin" /> Loading gate passes…
                                    </span>
                                ) : (
                                    <span>
                                        {permissions.length} {permissions.length === 1 ? "pass" : "passes"} ({permissionCounts.pending} pending, {permissionCounts.approved} valid, {permissionCounts.departed} outside)
                                    </span>
                                )
                            )}
                        </p>
                    </div>

                    {/* Right Primary Action */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                        {activeTab === "leaves" && isInstructor && (
                            <button
                                type="button"
                                onClick={() => setIsApplyModalOpen(true)}
                                className="h-8 px-3.5 rounded-lg bg-[#14161A] text-white hover:bg-black active:scale-[0.98] transition-all text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-none"
                            >
                                <Plus size={14} />
                                <span>Apply leave</span>
                            </button>
                        )}

                        {activeTab === "permissions" && (
                            <button
                                type="button"
                                onClick={() => setIsPermissionModalOpen(true)}
                                className="h-8 px-3.5 rounded-lg bg-[#14161A] text-white hover:bg-black active:scale-[0.98] transition-all text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-none"
                            >
                                <Ticket size={14} />
                                <span>{isAdmin ? "Issue gate pass" : "Request permission"}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Primary Mode Switcher (Leaves vs Out-Pass) ──────────────────────── */}
                <div className="pb-3 border-b border-[#E6E8EC]/80 flex items-center gap-2">
                    <div className="inline-flex items-center p-0.5 bg-[#F2F3F5] rounded-[10px]">
                        <button
                            type="button"
                            onClick={() => setActiveTab("leaves")}
                            className={cn(
                                "relative px-3.5 py-1.5 text-[13px] font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-2",
                                activeTab === "leaves" ? "text-[#14161A] font-semibold" : "text-[#5F6673] hover:text-[#14161A]"
                            )}
                        >
                            {activeTab === "leaves" && (
                                <motion.div
                                    layoutId="primary-leave-tab"
                                    transition={SPRING_FAST}
                                    className="absolute inset-0 bg-white rounded-lg shadow-[0_0_0_0.5px_rgba(20,22,26,0.08)] -z-10"
                                />
                            )}
                            <CalendarDays size={14} className={activeTab === "leaves" ? "text-[#14161A]" : "text-[#5F6673]"} />
                            <span>Leave requests</span>
                            {leaveCounts.pending > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                                    {leaveCounts.pending}
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("permissions")}
                            className={cn(
                                "relative px-3.5 py-1.5 text-[13px] font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-2",
                                activeTab === "permissions" ? "text-[#14161A] font-semibold" : "text-[#5F6673] hover:text-[#14161A]"
                            )}
                        >
                            {activeTab === "permissions" && (
                                <motion.div
                                    layoutId="primary-leave-tab"
                                    transition={SPRING_FAST}
                                    className="absolute inset-0 bg-white rounded-lg shadow-[0_0_0_0.5px_rgba(20,22,26,0.08)] -z-10"
                                />
                            )}
                            <ShieldCheck size={14} className={activeTab === "permissions" ? "text-[#14161A]" : "text-[#5F6673]"} />
                            <span>Out-pass & permissions</span>
                            {permissionCounts.pending > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                                    {permissionCounts.pending}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* ============================================================ */}
                {/* TAB 1: LEAVE REQUESTS                                        */}
                {/* ============================================================ */}
                {activeTab === "leaves" && (
                    <div className="pt-3">
                        {/* Toolbar: Segmented Filter & Search */}
                        <div className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E8EC]/80 mb-3">
                            <div 
                                role="radiogroup" 
                                aria-label="Filter leaves by status" 
                                className="inline-flex items-center p-0.5 bg-[#F2F3F5] rounded-[10px] overflow-x-auto max-w-full scrollbar-none"
                            >
                                {[
                                    { key: "", label: "All", count: leaveCounts.all },
                                    { key: "PENDING", label: "Pending", count: leaveCounts.pending },
                                    { key: "APPROVED", label: "Approved", count: leaveCounts.approved },
                                    { key: "REJECTED", label: "Rejected", count: leaveCounts.rejected },
                                    { key: "CANCELLED", label: "Cancelled", count: leaveCounts.cancelled }
                                ].map(seg => {
                                    const isSelected = statusFilter === seg.key;
                                    return (
                                        <button
                                            key={seg.key}
                                            type="button"
                                            role="radio"
                                            aria-checked={isSelected}
                                            onClick={() => setStatusFilter(seg.key)}
                                            className={cn(
                                                "relative px-3 py-1 text-[13px] font-medium rounded-lg transition-colors cursor-pointer shrink-0 z-10 flex items-center gap-1.5",
                                                isSelected ? "text-[#14161A] font-semibold" : "text-[#5F6673] hover:text-[#14161A]"
                                            )}
                                        >
                                            {isSelected && (
                                                <motion.div
                                                    layoutId="leave-filter-thumb"
                                                    transition={SPRING_FAST}
                                                    className="absolute inset-0 bg-white rounded-lg shadow-[0_0_0_0.5px_rgba(20,22,26,0.08)] -z-10"
                                                />
                                            )}
                                            <span>{seg.label}</span>
                                            <span className={cn(
                                                "text-[11px] tabular-nums font-normal",
                                                isSelected ? "text-[#14161A]" : "text-[#5F6673]"
                                            )}>
                                                {seg.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Search */}
                            <div className="relative w-full sm:w-64">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5F6673]" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={leaveSearch}
                                    onChange={(e) => setLeaveSearch(e.target.value)}
                                    placeholder="Search staff, type, reason… (/)"
                                    className="w-full h-8 pl-8 pr-3 text-[13px] bg-[#F2F3F5] hover:bg-[#EBECEF] focus:bg-white text-[#14161A] placeholder:text-[#5F6673] rounded-lg border border-transparent focus:border-[#E6E8EC] focus:outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* List: 56px rhythm */}
                        {loading ? (
                            <div className="py-24 flex flex-col items-center justify-center gap-2 text-[#5F6673] text-[13px]">
                                <Loader2 className="animate-spin text-indigo-600" size={24} />
                                <span>Loading leave applications…</span>
                            </div>
                        ) : filteredRequests.length > 0 ? (
                            <div className="divide-y divide-[#E6E8EC]/80 border-t border-b border-[#E6E8EC]/80">
                                {filteredRequests.map((req) => {
                                    const applicantName = `${req.user?.profile?.firstName || ""} ${req.user?.profile?.lastName || ""}`.trim() || req.user?.email || "Unknown";
                                    const initials = getInitials(applicantName);
                                    const daysCount = Math.ceil((new Date(req.endDate) - new Date(req.startDate)) / (1000 * 60 * 60 * 24)) + 1;
                                    const isPending = req.status === "PENDING";
                                    const isApproved = req.status === "APPROVED";
                                    const isRejected = req.status === "REJECTED";

                                    return (
                                        <div
                                            key={req._id}
                                            className="group relative min-h-[56px] py-2.5 px-3 flex items-center justify-between gap-4 hover:bg-[#F2F3F5]/60 transition-colors"
                                        >
                                            {/* Zone 1: Identity & Leave Type */}
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="w-8 h-8 rounded-full bg-[#F2F3F5] text-[#5F6673] text-[12px] font-medium flex items-center justify-center shrink-0 border border-[#E6E8EC]/60">
                                                    {initials}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[13px] font-medium text-[#14161A] truncate leading-tight">
                                                        {applicantName}
                                                    </div>
                                                    <div className="text-[12px] text-[#5F6673] truncate leading-tight mt-0.5">
                                                        <span className="font-medium text-[#14161A]">{req.leaveType?.name || "General leave"}</span>
                                                        <span className="mx-1 text-[#E6E8EC]">·</span>
                                                        <span className="tabular-nums">
                                                            {format(new Date(req.startDate), "d MMM")} → {format(new Date(req.endDate), "d MMM yyyy")} ({daysCount}d)
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Zone 2: Reason & Remarks */}
                                            <div className="hidden md:block flex-1 max-w-xs text-[12px] text-[#5F6673]">
                                                <p className="truncate" title={req.reason}>
                                                    {req.reason || "—"}
                                                </p>
                                                {req.adminComment && (
                                                    <p className="text-[11px] text-[#5F6673]/80 italic truncate mt-0.5" title={req.adminComment}>
                                                        Note: &ldquo;{req.adminComment}&rdquo;
                                                    </p>
                                                )}
                                            </div>

                                            {/* Zone 3: Status Mark */}
                                            <div className="w-28 shrink-0">
                                                {isPending && (
                                                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-700">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                        <span>Pending</span>
                                                    </span>
                                                )}
                                                {isApproved && (
                                                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#0E8A7D]">
                                                        <Check size={12} strokeWidth={2.5} />
                                                        <span>Approved</span>
                                                    </span>
                                                )}
                                                {isRejected && (
                                                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#D92D20]">
                                                        <X size={12} strokeWidth={2.5} />
                                                        <span>Rejected</span>
                                                    </span>
                                                )}
                                                {req.status === "CANCELLED" && (
                                                    <span className="text-[12px] font-medium text-[#5F6673]">
                                                        Cancelled
                                                    </span>
                                                )}
                                            </div>

                                            {/* Zone 4: Actions */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                {!isInstructor && isPending && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openReviewModal(req)}
                                                        className="h-7 px-2.5 text-[12px] font-medium text-[#14161A] hover:bg-[#EBECEF] rounded-md transition-colors cursor-pointer"
                                                    >
                                                        Review…
                                                    </button>
                                                )}

                                                {isInstructor && isPending && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCancelRequest(req._id)}
                                                        className="h-7 px-2.5 text-[12px] font-medium text-[#D92D20] hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* Quiet Apple-Style Empty State */
                            <div className="py-20 flex flex-col items-center justify-center text-center">
                                <div className="w-10 h-10 rounded-full bg-[#F2F3F5] flex items-center justify-center text-[#5F6673] mb-3">
                                    <CalendarDays size={20} />
                                </div>
                                <div className="text-[15px] font-medium text-[#14161A]">
                                    No leave requests found
                                </div>
                                <p className="text-[13px] text-[#5F6673] mt-1 max-w-sm">
                                    {isInstructor ? "You haven't submitted any leave requests yet." : "No leave requests match the selected filters."}
                                </p>
                                {isInstructor && (
                                    <button
                                        type="button"
                                        onClick={() => setIsApplyModalOpen(true)}
                                        className="mt-4 h-8 px-3 rounded-lg border border-[#E6E8EC] bg-transparent hover:bg-[#F2F3F5] active:scale-[0.98] transition-all text-[13px] font-medium text-[#14161A] flex items-center gap-1.5 cursor-pointer shadow-none"
                                    >
                                        <Plus size={14} />
                                        <span>Apply leave</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ============================================================ */}
                {/* TAB 2: OUT-PASS & HOURLY PERMISSIONS                         */}
                {/* ============================================================ */}
                {activeTab === "permissions" && (
                    <div className="pt-3">
                        {/* Toolbar: Segmented Filter, Person Type Filter & Search */}
                        <div className="py-2 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#E6E8EC]/80 mb-3">
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Status Filter Segment */}
                                <div 
                                    role="radiogroup" 
                                    aria-label="Filter out-passes by status" 
                                    className="inline-flex items-center p-0.5 bg-[#F2F3F5] rounded-[10px] overflow-x-auto max-w-full scrollbar-none"
                                >
                                    {[
                                        { key: "", label: "All", count: permissionCounts.total },
                                        { key: "PENDING", label: "Pending", count: permissionCounts.pending },
                                        { key: "APPROVED", label: "Approved", count: permissionCounts.approved },
                                        { key: "DEPARTED", label: "Departed", count: permissionCounts.departed }
                                    ].map(seg => {
                                        const isSelected = permissionStatusFilter === seg.key;
                                        return (
                                            <button
                                                key={seg.key}
                                                type="button"
                                                role="radio"
                                                aria-checked={isSelected}
                                                onClick={() => setPermissionStatusFilter(seg.key)}
                                                className={cn(
                                                    "relative px-3 py-1 text-[13px] font-medium rounded-lg transition-colors cursor-pointer shrink-0 z-10 flex items-center gap-1.5",
                                                    isSelected ? "text-[#14161A] font-semibold" : "text-[#5F6673] hover:text-[#14161A]"
                                                )}
                                            >
                                                {isSelected && (
                                                    <motion.div
                                                        layoutId="permission-status-thumb"
                                                        transition={SPRING_FAST}
                                                        className="absolute inset-0 bg-white rounded-lg shadow-[0_0_0_0.5px_rgba(20,22,26,0.08)] -z-10"
                                                    />
                                                )}
                                                <span>{seg.label}</span>
                                                <span className={cn(
                                                    "text-[11px] tabular-nums font-normal",
                                                    isSelected ? "text-[#14161A]" : "text-[#5F6673]"
                                                )}>
                                                    {seg.count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Person Type Filter Segment */}
                                <div className="inline-flex items-center p-0.5 bg-[#F2F3F5] rounded-[10px]">
                                    {[
                                        { key: "ALL", label: "All types" },
                                        { key: "staff", label: "Staff" },
                                        { key: "student", label: "Students" }
                                    ].map(t => {
                                        const isSelected = permissionTypeFilter === t.key;
                                        return (
                                            <button
                                                key={t.key}
                                                type="button"
                                                onClick={() => setPermissionTypeFilter(t.key)}
                                                className={cn(
                                                    "px-2.5 py-1 text-[12px] font-medium rounded-md transition-colors cursor-pointer",
                                                    isSelected ? "bg-white text-[#14161A] font-semibold shadow-[0_0_0_0.5px_rgba(20,22,26,0.08)]" : "text-[#5F6673] hover:text-[#14161A]"
                                                )}
                                            >
                                                {t.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Search */}
                            <div className="relative w-full lg:w-64">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5F6673]" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={permissionSearch}
                                    onChange={(e) => setPermissionSearch(e.target.value)}
                                    placeholder="Search name, pass #, reason… (/)"
                                    className="w-full h-8 pl-8 pr-3 text-[13px] bg-[#F2F3F5] hover:bg-[#EBECEF] focus:bg-white text-[#14161A] placeholder:text-[#5F6673] rounded-lg border border-transparent focus:border-[#E6E8EC] focus:outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* List: 56px rhythm */}
                        {loadingPermissions ? (
                            <div className="py-24 flex flex-col items-center justify-center gap-2 text-[#5F6673] text-[13px]">
                                <Loader2 className="animate-spin text-indigo-600" size={24} />
                                <span>Loading permissions ledger…</span>
                            </div>
                        ) : filteredPermissions.length > 0 ? (
                            <div className="divide-y divide-[#E6E8EC]/80 border-t border-b border-[#E6E8EC]/80">
                                {filteredPermissions.map((perm) => {
                                    const recipient = perm.recipientName || "Unknown";
                                    const initials = getInitials(recipient);
                                    const isPending = perm.status === "PENDING";
                                    const isApproved = perm.status === "APPROVED";
                                    const isDeparted = perm.status === "DEPARTED";
                                    const isCompleted = perm.status === "COMPLETED";
                                    const isRejected = perm.status === "REJECTED";

                                    return (
                                        <div
                                            key={perm._id}
                                            className="group relative min-h-[56px] py-2.5 px-3 flex items-center justify-between gap-4 hover:bg-[#F2F3F5]/60 transition-colors"
                                        >
                                            {/* Zone 1: Identity & Pass Number */}
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="w-8 h-8 rounded-full bg-[#F2F3F5] text-[#5F6673] text-[12px] font-medium flex items-center justify-center shrink-0 border border-[#E6E8EC]/60">
                                                    {initials}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[13px] font-medium text-[#14161A] truncate leading-tight">
                                                        <span>{recipient}</span>
                                                        <span className="ml-1.5 text-[11px] font-normal text-[#5F6673]">
                                                            ({perm.recipientType === "student" ? "Student" : "Staff"})
                                                        </span>
                                                    </div>
                                                    <div className="text-[12px] text-[#5F6673] truncate leading-tight mt-0.5">
                                                        <span className="font-mono text-[11px]">#{perm.passNumber}</span>
                                                        <span className="mx-1 text-[#E6E8EC]">·</span>
                                                        <span>{perm.recipientDetails?.designation || perm.recipientDetails?.classOrBatch || "Campus"}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Zone 2: Timings & Reason */}
                                            <div className="hidden sm:block flex-1 max-w-xs text-[12px] text-[#5F6673]">
                                                <div className="flex items-center gap-1 font-medium text-[#14161A] tabular-nums">
                                                    <Clock size={11} className="text-[#5F6673]" />
                                                    <span>{perm.departureTime} → {perm.expectedReturnTime}</span>
                                                    <span className="text-[11px] text-[#5F6673] font-normal">({perm.durationHours || "1h"})</span>
                                                </div>
                                                <p className="text-[11px] text-[#5F6673] truncate mt-0.5" title={perm.reason}>
                                                    {perm.reason}
                                                </p>
                                            </div>

                                            {/* Zone 3: Status Mark */}
                                            <div className="w-28 shrink-0">
                                                {isPending && (
                                                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-700">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                        <span>Pending</span>
                                                    </span>
                                                )}
                                                {isApproved && (
                                                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#0E8A7D]">
                                                        <Check size={12} strokeWidth={2.5} />
                                                        <span>Approved</span>
                                                    </span>
                                                )}
                                                {isDeparted && (
                                                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-blue-700">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                        <span>Outside</span>
                                                    </span>
                                                )}
                                                {isCompleted && (
                                                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-purple-700">
                                                        <Check size={12} strokeWidth={2.5} />
                                                        <span>Returned</span>
                                                    </span>
                                                )}
                                                {isRejected && (
                                                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#D92D20]">
                                                        <X size={12} strokeWidth={2.5} />
                                                        <span>Rejected</span>
                                                    </span>
                                                )}
                                            </div>

                                            {/* Zone 4: Actions */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                {isAdmin && isPending && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdatePermissionStatus(perm._id, "APPROVED")}
                                                            className="h-7 px-2.5 text-[12px] font-medium text-[#0E8A7D] hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdatePermissionStatus(perm._id, "REJECTED")}
                                                            className="h-7 px-2 text-[12px] font-medium text-[#D92D20] hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}

                                                {isAdmin && isApproved && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdatePermissionStatus(perm._id, "DEPARTED")}
                                                        className="h-7 px-2.5 text-[12px] font-medium text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                                                    >
                                                        Mark out
                                                    </button>
                                                )}

                                                {isAdmin && isDeparted && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdatePermissionStatus(perm._id, "COMPLETED")}
                                                        className="h-7 px-2.5 text-[12px] font-medium text-purple-700 hover:bg-purple-50 rounded-md transition-colors cursor-pointer"
                                                    >
                                                        Mark returned
                                                    </button>
                                                )}

                                                {/* Official Gate Pass Preview */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedGatePass(perm);
                                                        setIsGatePassModalOpen(true);
                                                    }}
                                                    className="h-7 px-2.5 text-[12px] font-medium text-[#14161A] hover:bg-[#EBECEF] rounded-md transition-colors cursor-pointer flex items-center gap-1"
                                                >
                                                    <Ticket size={12} className="text-[#5F6673]" />
                                                    <span>Pass</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* Quiet Apple-Style Empty State */
                            <div className="py-20 flex flex-col items-center justify-center text-center">
                                <div className="w-10 h-10 rounded-full bg-[#F2F3F5] flex items-center justify-center text-[#5F6673] mb-3">
                                    <Ticket size={20} />
                                </div>
                                <div className="text-[15px] font-medium text-[#14161A]">
                                    No out-passes or permissions found
                                </div>
                                <p className="text-[13px] text-[#5F6673] mt-1 max-w-sm">
                                    No hourly departure permissions currently match your search criteria.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setIsPermissionModalOpen(true)}
                                    className="mt-4 h-8 px-3 rounded-lg border border-[#E6E8EC] bg-transparent hover:bg-[#F2F3F5] active:scale-[0.98] transition-all text-[13px] font-medium text-[#14161A] flex items-center gap-1.5 cursor-pointer shadow-none"
                                >
                                    <Plus size={14} />
                                    <span>{isAdmin ? "Issue gate pass" : "Request permission"}</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ============================================================ */}
                {/* MODAL: APPLY LEAVE                                           */}
                {/* ============================================================ */}
                <Modal
                    isOpen={isApplyModalOpen}
                    onClose={() => setIsApplyModalOpen(false)}
                    title="Apply for Leave"
                >
                    <form onSubmit={handleApplyLeave} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[#5F6673]">Leave Type</label>
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

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[11px] font-medium text-[#5F6673]">Start Date</label>
                                <Input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-medium text-[#5F6673]">End Date</label>
                                <Input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[#5F6673]">Reason</label>
                            <textarea
                                rows={3}
                                value={formData.reason}
                                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="Explain the reason for your leave request..."
                                className="w-full bg-white border border-[#E6E8EC] rounded-lg p-2.5 text-[13px] outline-none focus:border-[#14161A] transition-all resize-none"
                                required
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-[#E6E8EC]">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => setIsApplyModalOpen(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                className="bg-[#14161A] hover:bg-black text-white font-semibold"
                                disabled={submitting}
                            >
                                {submitting ? "Submitting…" : "Submit Application"}
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* ============================================================ */}
                {/* MODAL: REVIEW LEAVE                                          */}
                {/* ============================================================ */}
                <Modal
                    isOpen={isReviewModalOpen}
                    onClose={() => setIsReviewModalOpen(false)}
                    title="Review Leave Application"
                >
                    {selectedRequest && (
                        <form onSubmit={handleReviewSubmit} className="space-y-4">
                            <div className="bg-[#F2F3F5]/60 p-3.5 rounded-lg border border-[#E6E8EC] space-y-2 text-[12px]">
                                <div className="flex justify-between items-center">
                                    <span className="text-[#5F6673]">Applicant</span>
                                    <span className="font-semibold text-[#14161A]">
                                        {selectedRequest.user?.profile?.firstName} {selectedRequest.user?.profile?.lastName}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[#5F6673]">Type</span>
                                    <span className="font-medium text-[#14161A]">{selectedRequest.leaveType?.name}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[#5F6673]">Duration</span>
                                    <span className="font-medium text-[#14161A] tabular-nums">
                                        {format(new Date(selectedRequest.startDate), "dd MMM yyyy")} → {format(new Date(selectedRequest.endDate), "dd MMM yyyy")}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-[#E6E8EC]">
                                    <span className="text-[11px] text-[#5F6673] block mb-0.5">Reason:</span>
                                    <p className="text-[#14161A] italic">&ldquo;{selectedRequest.reason}&rdquo;</p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-medium text-[#5F6673]">Decision</label>
                                <Select
                                    value={reviewData.status}
                                    onChange={(val) => setReviewData(prev => ({ ...prev, status: val }))}
                                    options={[
                                        { label: "Select Decision", value: "" },
                                        { label: "Approve Request", value: "APPROVED" },
                                        { label: "Reject Request", value: "REJECTED" }
                                    ]}
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-medium text-[#5F6673]">Admin Comment (Optional)</label>
                                <textarea
                                    rows={2}
                                    value={reviewData.adminComment}
                                    onChange={(e) => setReviewData(prev => ({ ...prev, adminComment: e.target.value }))}
                                    placeholder="Add any internal notes or remarks..."
                                    className="w-full bg-white border border-[#E6E8EC] rounded-lg p-2.5 text-[13px] outline-none focus:border-[#14161A] transition-all resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-[#E6E8EC]">
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    onClick={() => setIsReviewModalOpen(false)}
                                    disabled={submitting}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    className="bg-[#14161A] hover:bg-black text-white font-semibold"
                                    disabled={submitting}
                                >
                                    {submitting ? "Submitting…" : "Confirm Review"}
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
                        {/* Person Category Toggle */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[#5F6673] block">Person Category</label>
                            <div className="grid grid-cols-2 gap-1.5 bg-[#F2F3F5] p-1 rounded-lg">
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
                                        "py-1.5 text-[12px] font-medium rounded-md transition-all flex items-center justify-center gap-1.5",
                                        permissionForm.recipientType === "staff"
                                            ? "bg-white text-[#14161A] font-semibold shadow-[0_0_0_0.5px_rgba(20,22,26,0.08)]"
                                            : "text-[#5F6673] hover:text-[#14161A]"
                                    )}
                                >
                                    <User size={13} /> Staff / Teacher
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
                                        "py-1.5 text-[12px] font-medium rounded-md transition-all flex items-center justify-center gap-1.5",
                                        permissionForm.recipientType === "student"
                                            ? "bg-white text-[#14161A] font-semibold shadow-[0_0_0_0.5px_rgba(20,22,26,0.08)]"
                                            : "text-[#5F6673] hover:text-[#14161A]"
                                    )}
                                >
                                    <HeartPulse size={13} className="text-rose-500" /> Student
                                </button>
                            </div>
                        </div>

                        {/* Recipient Details */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[11px] font-medium text-[#5F6673]">
                                    {permissionForm.recipientType === "student" ? "Student Full Name" : "Staff Member Name"}
                                </label>
                                <Input
                                    type="text"
                                    placeholder={permissionForm.recipientType === "student" ? "e.g. John Doe" : "e.g. Prof. Sarah"}
                                    value={permissionForm.recipientName}
                                    onChange={(e) => setPermissionForm(prev => ({ ...prev, recipientName: e.target.value }))}
                                    required
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-medium text-[#5F6673]">
                                    {permissionForm.recipientType === "student" ? "Class / Section" : "Department / Role"}
                                </label>
                                <Input
                                    type="text"
                                    placeholder={permissionForm.recipientType === "student" ? "e.g. Class 10-A" : "e.g. Mathematics"}
                                    value={permissionForm.designationOrClass}
                                    onChange={(e) => setPermissionForm(prev => ({ ...prev, designationOrClass: e.target.value }))}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {permissionForm.recipientType === "student" && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-[#5F6673]">Enrollment / Roll No</label>
                                    <Input
                                        type="text"
                                        placeholder="e.g. ENR-2026-44"
                                        value={permissionForm.enrollmentNumber}
                                        onChange={(e) => setPermissionForm(prev => ({ ...prev, enrollmentNumber: e.target.value }))}
                                        className="w-full"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-[#5F6673]">Parent Contact Phone</label>
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
                                <label className="text-[11px] font-medium text-[#5F6673]">Exit Time</label>
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
                                <label className="text-[11px] font-medium text-[#5F6673]">Expected Return</label>
                                <Input
                                    type="text"
                                    placeholder="11:30 AM"
                                    value={permissionForm.expectedReturnTime}
                                    onChange={(e) => setPermissionForm(prev => ({ ...prev, expectedReturnTime: e.target.value }))}
                                    required
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-medium text-[#5F6673]">Duration</label>
                                <Select
                                    value={permissionForm.durationHours}
                                    onChange={(val) => setPermissionForm(prev => ({ ...prev, durationHours: val }))}
                                    options={[
                                        { label: "30 Minutes", value: "30 mins" },
                                        { label: "1 Hour", value: "1 hour" },
                                        { label: "1.5 Hours", value: "1.5 hours" },
                                        { label: "2 Hours", value: "2 hours" },
                                        { label: "Rest of Day", value: "Rest of Day" }
                                    ]}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {/* Category */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[#5F6673]">Departure Category</label>
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
                            <label className="text-[11px] font-medium text-[#5F6673]">Reason for Exit</label>
                            <textarea
                                rows={2}
                                value={permissionForm.reason}
                                onChange={(e) => setPermissionForm(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="Explain why permission is needed..."
                                className="w-full bg-white border border-[#E6E8EC] rounded-lg p-2.5 text-[13px] outline-none focus:border-[#14161A] transition-all resize-none"
                                required
                            />
                        </div>

                        {/* Admin Direct Authorize Checkbox */}
                        {isAdmin && (
                            <label className="flex items-center gap-2 p-2.5 bg-[#F2F3F5]/70 border border-[#E6E8EC] rounded-lg cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={permissionForm.autoApprove}
                                    onChange={(e) => setPermissionForm(prev => ({ ...prev, autoApprove: e.target.checked }))}
                                    className="rounded border-[#E6E8EC] text-[#14161A] focus:ring-0 h-4 w-4"
                                />
                                <span className="text-[12px] font-medium text-[#14161A]">
                                    Directly authorize and generate valid gate pass now
                                </span>
                            </label>
                        )}

                        <div className="flex justify-end gap-2 pt-3 border-t border-[#E6E8EC]">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => setIsPermissionModalOpen(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                className="bg-[#14161A] hover:bg-black text-white font-semibold"
                                disabled={submitting}
                            >
                                {submitting ? "Processing…" : (isAdmin && permissionForm.autoApprove ? "Issue Authorized Gate Pass" : "Submit Request")}
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
