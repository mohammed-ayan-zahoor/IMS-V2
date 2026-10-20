"use client";

import { useState, useEffect, useCallback } from "react";
import { 
    Plus, 
    Trash2, 
    Edit2, 
    Phone, 
    Loader2
} from "lucide-react";
import { format, isValid } from "date-fns";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/shared/EmptyState";
import ListToolbar from "@/components/shared/ListToolbar";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

function formatSafeDate(dateString, pattern = "dd MMM yyyy") {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return isValid(d) ? format(d, pattern) : "-";
}

export default function ComplaintsPage() {
    const toast = useToast();
    const confirm = useConfirm();

    const [complaints, setComplaints] = useState([]);
    const [students, setStudents] = useState([]);
    const [staff, setStaff] = useState([]);
    const [stats, setStats] = useState({
        openCount: 0,
        inProgressCount: 0,
        resolvedCount: 0,
        totalToday: 0,
        totalAllTime: 0
    });
    const [loading, setLoading] = useState(true);
    
    // Filter State
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [dateFilter, setDateFilter] = useState("all"); // "all", "today", "yesterday", "week", "month"

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingComplaint, setEditingComplaint] = useState(null);
    const [formData, setFormData] = useState(initialFormState());

    function initialFormState() {
        return {
            complainantName: "",
            complainantPhone: "",
            complainantType: "parent",
            relatedStudent: "",
            category: "general",
            description: "",
            assignedTo: "",
            status: "open",
            resolution: ""
        };
    }

    const fetchComplaints = useCallback(async (signal) => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            if (statusFilter) queryParams.append("status", statusFilter);
            if (categoryFilter) queryParams.append("category", categoryFilter);
            if (dateFilter && dateFilter !== "all") queryParams.append("dateRange", dateFilter);
            if (search.trim()) queryParams.append("search", search.trim());

            const res = await fetch(`/api/v1/front-office/complaints?${queryParams.toString()}`, {
                signal: signal || AbortSignal.timeout(10000)
            });
            if (res.ok) {
                const data = await res.json();
                if (signal?.aborted) return;
                setComplaints(data.complaints || []);
                if (data.stats) {
                    setStats(data.stats);
                }
            } else {
                toast.error("Failed to load complaints");
            }
        } catch (error) {
            if (error.name === "AbortError") return;
            console.error("Error fetching complaints:", error);
            toast.error("Failed to load complaints");
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, [statusFilter, categoryFilter, dateFilter, search, toast]);

    const fetchUsers = async () => {
        try {
            const studentRes = await fetch("/api/v1/users?role=student");
            if (studentRes.ok) {
                const studentData = await studentRes.json();
                setStudents(studentData.users || []);
            }

            const staffRes = await fetch("/api/v1/users");
            if (staffRes.ok) {
                const staffData = await staffRes.json();
                const filteredStaff = (staffData.users || []).filter(u => ['admin', 'super_admin', 'instructor'].includes(u.role));
                setStaff(filteredStaff);
            }
        } catch (e) {
            console.error("Error loading users helper lists", e);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchComplaints(controller.signal);
        return () => controller.abort();
    }, [fetchComplaints]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleClearFilters = () => {
        setSearch("");
        setStatusFilter("");
        setCategoryFilter("");
        setDateFilter("all");
    };

    const hasActiveFilters = Boolean(
        search.trim() !== "" || 
        statusFilter !== "" || 
        categoryFilter !== "" ||
        dateFilter !== "all"
    );

    const handleOpenAddModal = () => {
        setEditingComplaint(null);
        setFormData(initialFormState());
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (complaint) => {
        setEditingComplaint(complaint);
        setFormData({
            complainantName: complaint.complainantName,
            complainantPhone: complaint.complainantPhone || "",
            complainantType: complaint.complainantType || "other",
            relatedStudent: complaint.relatedStudent?._id || complaint.relatedStudent || "",
            category: complaint.category || "other",
            description: complaint.description,
            assignedTo: complaint.assignedTo?._id || complaint.assignedTo || "",
            status: complaint.status || "open",
            resolution: complaint.resolution || ""
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.complainantName || !formData.description) {
            toast.error("Complainant Name and Description are required");
            return;
        }

        try {
            setSubmitting(true);
            const url = editingComplaint 
                ? `/api/v1/front-office/complaints/${editingComplaint._id}` 
                : "/api/v1/front-office/complaints";
            const method = editingComplaint ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(editingComplaint ? "Complaint updated successfully" : "Complaint logged successfully");
                setIsModalOpen(false);
                fetchComplaints();
            } else {
                const data = await res.json();
                toast.error(data.error || "Something went wrong");
            }
        } catch (error) {
            console.error("Error submitting complaint:", error);
            toast.error("Failed to save complaint");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id, num) => {
        if (await confirm({
            title: "Delete Complaint?",
            message: `Are you sure you want to delete complaint ${num ? `"${num}"` : ""}? This action cannot be undone.`,
            type: "danger"
        })) {
            try {
                const res = await fetch(`/api/v1/front-office/complaints/${id}`, {
                    method: "DELETE"
                });

                if (res.ok) {
                    toast.success("Complaint deleted successfully");
                    fetchComplaints();
                } else {
                    toast.error("Failed to delete complaint");
                }
            } catch (error) {
                console.error("Error deleting complaint:", error);
                toast.error("Failed to delete complaint");
            }
        }
    };

    return (
        <div className="w-full space-y-6">
            {/* Header: Title and Single Primary Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">Complaints & Grievances</h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Log, assign, track, and resolve complaints raised by students, parents, or staff.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 active:scale-[0.98] transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
                >
                    <Plus size={15} />
                    <span>Log Complaint</span>
                </button>
            </div>

            {/* Single Unified Card: Toolbar + Content */}
            <div className="w-full bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                {/* 1-Row Filter Toolbar */}
                <ListToolbar
                    search={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search complaint #, name, details…"
                    hasActiveFilters={hasActiveFilters}
                    onClearFilters={handleClearFilters}
                    filters={[
                        {
                            label: "Status",
                            value: statusFilter,
                            onChange: setStatusFilter,
                            isNonDefault: statusFilter !== "",
                            options: [
                                { label: "All", value: "" },
                                { label: "Open", value: "open" },
                                { label: "In Progress", value: "in_progress" },
                                { label: "Resolved", value: "resolved" },
                                { label: "Closed", value: "closed" }
                            ]
                        },
                        {
                            label: "Category",
                            value: categoryFilter,
                            onChange: setCategoryFilter,
                            isNonDefault: categoryFilter !== "",
                            options: [
                                { label: "All", value: "" },
                                { label: "General", value: "general" },
                                { label: "Academic", value: "academic" },
                                { label: "Fee / Finance", value: "fee" },
                                { label: "Discipline", value: "discipline" },
                                { label: "Transport", value: "transport" },
                                { label: "Hostel / Food", value: "hostel" },
                                { label: "Other", value: "other" }
                            ]
                        },
                        {
                            label: "Date",
                            value: dateFilter,
                            onChange: setDateFilter,
                            isNonDefault: dateFilter !== "all",
                            options: [
                                { label: "All records", value: "all" },
                                { label: "Today", value: "today" },
                                { label: "Yesterday", value: "yesterday" },
                                { label: "Last 7 days", value: "week" },
                                { label: "This month", value: "month" }
                            ]
                        }
                    ]}
                    summaryChips={[
                        {
                            label: "Open:",
                            count: stats.openCount,
                            active: statusFilter === "open",
                            dotColor: "bg-amber-500",
                            activeClassName: "bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-300 shadow-2xs",
                            onClick: () => setStatusFilter(prev => prev === "open" ? "" : "open"),
                            title: "Filter by open complaints"
                        },
                        {
                            label: "In Progress:",
                            count: stats.inProgressCount,
                            active: statusFilter === "in_progress",
                            dotColor: "bg-blue-500",
                            activeClassName: "bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-300 shadow-2xs",
                            onClick: () => setStatusFilter(prev => prev === "in_progress" ? "" : "in_progress"),
                            title: "Filter by complaints in progress"
                        },
                        {
                            label: "Resolved:",
                            count: stats.resolvedCount,
                            active: statusFilter === "resolved",
                            dotColor: "bg-emerald-500",
                            activeClassName: "bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300 shadow-2xs",
                            onClick: () => setStatusFilter(prev => prev === "resolved" ? "" : "resolved"),
                            title: "Filter by resolved complaints"
                        }
                    ]}
                />

                {/* Content Area: Loader, Smart Empty State, or Table */}
                <div>
                    {loading ? (
                        <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400 text-sm font-medium">
                            <Loader2 className="animate-spin text-blue-600" size={32} />
                            <span>Loading complaints…</span>
                        </div>
                    ) : complaints.length === 0 ? (
                        /* Smart Empty State */
                        hasActiveFilters ? (
                            <EmptyState
                                title="No matching complaints"
                                description="Try a different complaint number, name, category, or status."
                                actionLabel="Clear filters"
                                actionVariant="outline"
                                onAction={handleClearFilters}
                            />
                        ) : stats.totalAllTime > 0 ? (
                            <EmptyState
                                title="No complaints in this period"
                                description="Complaints you log will appear here."
                                actionLabel="Log complaint"
                                actionVariant="outline"
                                onAction={handleOpenAddModal}
                                secondaryActionLabel="View all records"
                                onSecondaryAction={() => setDateFilter("all")}
                            />
                        ) : (
                            <EmptyState
                                title="No complaints recorded"
                                description="Track, assign, and resolve feedback and grievances from students, parents, or staff."
                                actionLabel="Log complaint"
                                actionVariant="outline"
                                onAction={handleOpenAddModal}
                            />
                        )
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-600 border-collapse">
                                <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold">Complaint #</th>
                                        <th className="px-5 py-3 font-semibold">Complainant</th>
                                        <th className="px-5 py-3 font-semibold">Category</th>
                                        <th className="px-5 py-3 font-semibold">Assigned To</th>
                                        <th className="px-5 py-3 font-semibold">Date</th>
                                        <th className="px-5 py-3 font-semibold text-center">Status</th>
                                        <th className="px-5 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {complaints.map((c) => (
                                        <tr key={c._id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-5 py-3 font-semibold text-slate-900 tabular-nums">
                                                {c.complaintNo}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="font-semibold text-slate-900">{c.complainantName}</div>
                                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                                                    <span className="capitalize">{c.complainantType || "other"}</span>
                                                    {c.complainantPhone && (
                                                        <>
                                                            <span>•</span>
                                                            <div className="inline-flex items-center gap-1 text-slate-600">
                                                                <Phone size={10} className="text-slate-400" />
                                                                <span className="tabular-nums">{c.complainantPhone}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/80">
                                                    {c.category}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-slate-700">
                                                {c.assignedTo?.fullName || c.assignedTo?.profile?.firstName || <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="px-5 py-3 tabular-nums text-slate-600">
                                                {formatSafeDate(c.createdAt)}
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                {c.status === "open" && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                        Open
                                                    </span>
                                                )}
                                                {c.status === "in_progress" && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                        In Progress
                                                    </span>
                                                )}
                                                {c.status === "resolved" && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        Resolved
                                                    </span>
                                                )}
                                                {c.status === "closed" && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200/80">
                                                        Closed
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditModal(c)}
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                                        title="Edit details"
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(c._id, c.complaintNo)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                                        title="Delete record"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for Log Entry / Edit */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingComplaint ? `Edit Complaint (${editingComplaint.complaintNo})` : "Log Complaint or Grievance"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Complainant Name *</label>
                            <Input
                                placeholder="e.g. Robert Smith"
                                value={formData.complainantName}
                                onChange={(e) => setFormData({ ...formData, complainantName: e.target.value })}
                                required
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                            <Input
                                placeholder="e.g. 9876543210"
                                value={formData.complainantPhone}
                                onChange={(e) => setFormData({ ...formData, complainantPhone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Complainant Type</label>
                            <Select
                                value={formData.complainantType}
                                onChange={(val) => setFormData({ ...formData, complainantType: val })}
                                options={[
                                    { label: "Parent", value: "parent" },
                                    { label: "Student", value: "student" },
                                    { label: "Staff", value: "staff" },
                                    { label: "Visitor / Other", value: "other" }
                                ]}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                            <Select
                                value={formData.category}
                                onChange={(val) => setFormData({ ...formData, category: val })}
                                options={[
                                    { label: "General", value: "general" },
                                    { label: "Academic", value: "academic" },
                                    { label: "Fee / Finance", value: "fee" },
                                    { label: "Discipline", value: "discipline" },
                                    { label: "Transport", value: "transport" },
                                    { label: "Hostel / Food", value: "hostel" },
                                    { label: "Other", value: "other" }
                                ]}
                            />
                        </div>
                    </div>

                    {formData.complainantType === "parent" && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Related Student (Optional)</label>
                            <Select
                                value={formData.relatedStudent}
                                onChange={(val) => setFormData({ ...formData, relatedStudent: val })}
                                placeholder="Select Student"
                                options={[
                                    { label: "None / Not Applicable", value: "" },
                                    ...students.map(s => ({
                                        label: `${s.fullName || s.profile?.firstName + ' ' + s.profile?.lastName} (${s.email || s.phone})`,
                                        value: s._id
                                    }))
                                ]}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Assign To Staff</label>
                            <Select
                                value={formData.assignedTo}
                                onChange={(val) => setFormData({ ...formData, assignedTo: val })}
                                placeholder="Select Staff Member"
                                options={[
                                    { label: "Unassigned", value: "" },
                                    ...staff.map(s => ({
                                        label: `${s.fullName || s.profile?.firstName + ' ' + s.profile?.lastName} (${s.role})`,
                                        value: s._id
                                    }))
                                ]}
                            />
                        </div>

                        {editingComplaint && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                                <Select
                                    value={formData.status}
                                    onChange={(val) => setFormData({ ...formData, status: val })}
                                    options={[
                                        { label: "Open", value: "open" },
                                        { label: "In Progress", value: "in_progress" },
                                        { label: "Resolved", value: "resolved" },
                                        { label: "Closed", value: "closed" }
                                    ]}
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Details *</label>
                        <textarea
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                            placeholder="Detail the complaint or grievance clearly…"
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                        />
                    </div>

                    {editingComplaint && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Resolution Details</label>
                            <textarea
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                                placeholder="Actions taken or resolution outcome…"
                                rows={2}
                                value={formData.resolution}
                                onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? "Saving…" : "Save Record"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
