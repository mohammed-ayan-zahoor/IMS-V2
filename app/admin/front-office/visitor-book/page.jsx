"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
    Plus, 
    Search, 
    Trash2, 
    Edit2, 
    X, 
    LogOut,
    Phone,
    ChevronDown,
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
import { cn } from "@/lib/utils";

function formatSafeDate(dateString, pattern = "dd MMM, hh:mm a") {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return isValid(d) ? format(d, pattern) : "-";
}

export default function VisitorBookPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const searchInputRef = useRef(null);

    const [visitors, setVisitors] = useState([]);
    const [stats, setStats] = useState({
        insideCount: 0,
        checkedOutCount: 0,
        totalToday: 0,
        totalAllTime: 0
    });
    const [loading, setLoading] = useState(true);
    
    // Filter State
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState(""); // "" (All), "inside", "left"
    const [dateFilter, setDateFilter] = useState("today"); // "today", "yesterday", "week", "month", "all"

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingVisitor, setEditingVisitor] = useState(null);
    const [formData, setFormData] = useState(initialFormState());

    function initialFormState() {
        return {
            visitorName: "",
            phone: "",
            purpose: "",
            personToMeet: "",
            idProof: "",
            idNumber: "",
            remarks: "",
            checkIn: format(new Date(), "yyyy-MM-dd'T'HH:mm")
        };
    }

    const fetchVisitors = useCallback(async (signal) => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            if (statusFilter) queryParams.append("status", statusFilter);
            if (dateFilter) queryParams.append("dateRange", dateFilter);
            if (search.trim()) queryParams.append("search", search.trim());

            const res = await fetch(`/api/v1/front-office/visitors?${queryParams.toString()}`, {
                signal: signal || AbortSignal.timeout(10000)
            });
            if (res.ok) {
                const data = await res.json();
                if (signal?.aborted) return;
                setVisitors(data.visitors || []);
                if (data.stats) {
                    setStats(data.stats);
                }
            } else {
                toast.error("Failed to load visitors");
            }
        } catch (error) {
            if (error.name === "AbortError") return;
            console.error("Error fetching visitors:", error);
            toast.error("Failed to load visitors");
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, [statusFilter, dateFilter, search, toast]);

    useEffect(() => {
        const controller = new AbortController();
        fetchVisitors(controller.signal);
        return () => controller.abort();
    }, [fetchVisitors]);

    // Keyboard shortcut: "/" to focus search
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleClearFilters = () => {
        setSearch("");
        setStatusFilter("");
        setDateFilter("today");
    };

    const hasActiveFilters = Boolean(
        search.trim() !== "" || 
        statusFilter !== "" || 
        dateFilter !== "today"
    );

    const handleOpenAddModal = () => {
        setEditingVisitor(null);
        setFormData(initialFormState());
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (visitor) => {
        setEditingVisitor(visitor);
        setFormData({
            visitorName: visitor.visitorName,
            phone: visitor.phone || "",
            purpose: visitor.purpose,
            personToMeet: visitor.personToMeet || "",
            idProof: visitor.idProof || "",
            idNumber: visitor.idNumber || "",
            remarks: visitor.remarks || "",
            checkIn: visitor.checkIn ? format(new Date(visitor.checkIn), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm")
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.visitorName || !formData.purpose) {
            toast.error("Name and Purpose are required");
            return;
        }

        try {
            setSubmitting(true);
            const url = editingVisitor 
                ? `/api/v1/front-office/visitors/${editingVisitor._id}` 
                : "/api/v1/front-office/visitors";
            const method = editingVisitor ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(editingVisitor ? "Visitor updated successfully" : "Visitor logged successfully");
                setIsModalOpen(false);
                fetchVisitors();
            } else {
                const data = await res.json();
                toast.error(data.error || "Something went wrong");
            }
        } catch (error) {
            console.error("Error submitting visitor:", error);
            toast.error("Failed to save visitor");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCheckOut = async (id) => {
        try {
            const res = await fetch(`/api/v1/front-office/visitors/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "left",
                    checkOut: new Date()
                })
            });

            if (res.ok) {
                toast.success("Visitor checked out successfully");
                fetchVisitors();
            } else {
                toast.error("Failed to check out visitor");
            }
        } catch (error) {
            console.error("Error checking out:", error);
            toast.error("Failed to check out visitor");
        }
    };

    const handleDelete = async (id, name) => {
        if (await confirm({
            title: "Delete Visitor Record?",
            message: `Are you sure you want to delete the record for "${name || "this visitor"}"? This action cannot be undone.`,
            type: "danger"
        })) {
            try {
                const res = await fetch(`/api/v1/front-office/visitors/${id}`, {
                    method: "DELETE"
                });

                if (res.ok) {
                    toast.success("Visitor record deleted");
                    fetchVisitors();
                } else {
                    toast.error("Failed to delete record");
                }
            } catch (error) {
                console.error("Error deleting visitor:", error);
                toast.error("Failed to delete record");
            }
        }
    };

    return (
        <div className="w-full space-y-6">
            {/* Header: Title and Single Primary Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">Visitor Book</h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Track and manage institute visitors, check-ins, and checkout timings.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 active:scale-[0.98] transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
                >
                    <Plus size={15} />
                    <span>Log New Visitor</span>
                </button>
            </div>

            {/* Single Unified Card: Toolbar + Content */}
            <div className="w-full bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                {/* 1-Row Filter Toolbar */}
                <ListToolbar
                    search={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search visitor, phone, purpose…"
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
                                { label: "Inside", value: "inside" },
                                { label: "Checked out", value: "left" }
                            ]
                        },
                        {
                            label: "Date",
                            value: dateFilter,
                            onChange: setDateFilter,
                            isNonDefault: dateFilter !== "today",
                            options: [
                                { label: "Today", value: "today" },
                                { label: "Yesterday", value: "yesterday" },
                                { label: "Last 7 days", value: "week" },
                                { label: "This month", value: "month" },
                                { label: "All records", value: "all" }
                            ]
                        }
                    ]}
                    summaryChips={[
                        {
                            label: "Inside now:",
                            count: stats.insideCount,
                            active: statusFilter === "inside",
                            dotColor: "bg-emerald-500",
                            activeClassName: "bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300 shadow-2xs",
                            onClick: () => setStatusFilter(prev => prev === "inside" ? "" : "inside"),
                            title: "Filter by visitors inside now"
                        },
                        {
                            label: "Checked out:",
                            count: stats.checkedOutCount,
                            active: statusFilter === "left",
                            dotColor: "bg-slate-400",
                            activeClassName: "bg-slate-200/80 text-slate-900 border-slate-400 ring-1 ring-slate-400 shadow-2xs",
                            onClick: () => setStatusFilter(prev => prev === "left" ? "" : "left"),
                            title: "Filter by checked out visitors"
                        },
                        {
                            label: "Total today:",
                            count: stats.totalToday,
                            active: dateFilter === "today" && statusFilter === "",
                            dotColor: "bg-blue-500",
                            activeClassName: "bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-300 shadow-2xs",
                            onClick: () => {
                                setDateFilter("today");
                                setStatusFilter("");
                            },
                            title: "View all visitors for today"
                        }
                    ]}
                />

                {/* Content Area: Loader, Smart Empty State, or Table */}
                <div>
                    {loading ? (
                        <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400 text-sm font-medium">
                            <Loader2 className="animate-spin text-blue-600" size={32} />
                            <span>Loading visitors…</span>
                        </div>
                    ) : visitors.length === 0 ? (
                        /* Smart Empty State */
                        hasActiveFilters ? (
                            <EmptyState
                                title="No matching visitors"
                                description="Try a different name, phone number or status."
                                actionLabel="Clear filters"
                                actionVariant="outline"
                                onAction={handleClearFilters}
                            />
                        ) : stats.totalAllTime > 0 ? (
                            <EmptyState
                                title="No visitors today"
                                description="Visitors you log will appear here."
                                actionLabel="Log visitor"
                                actionVariant="outline"
                                onAction={handleOpenAddModal}
                                secondaryActionLabel="View last 7 days"
                                onSecondaryAction={() => setDateFilter("week")}
                            />
                        ) : (
                            <EmptyState
                                title="Your visitor book is empty"
                                description="Log each person who visits the institute, along with who they came to see and when they leave."
                                actionLabel="Log visitor"
                                actionVariant="outline"
                                onAction={handleOpenAddModal}
                            />
                        )
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-600 border-collapse">
                                <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold">Visitor Name</th>
                                        <th className="px-5 py-3 font-semibold">Phone</th>
                                        <th className="px-5 py-3 font-semibold">Purpose</th>
                                        <th className="px-5 py-3 font-semibold">To Meet</th>
                                        <th className="px-5 py-3 font-semibold">Check In</th>
                                        <th className="px-5 py-3 font-semibold">Check Out</th>
                                        <th className="px-5 py-3 font-semibold text-center">Status</th>
                                        <th className="px-5 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {visitors.map((visitor) => (
                                        <tr key={visitor._id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-5 py-3 font-semibold text-slate-900">
                                                {visitor.visitorName}
                                            </td>
                                            <td className="px-5 py-3">
                                                {visitor.phone ? (
                                                    <div className="inline-flex items-center gap-1.5 text-slate-700">
                                                        <Phone size={12} className="text-slate-400 shrink-0" />
                                                        <span className="tabular-nums">{visitor.phone}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 max-w-[220px] truncate text-slate-700 font-medium" title={visitor.purpose}>
                                                {visitor.purpose}
                                            </td>
                                            <td className="px-5 py-3 text-slate-700">
                                                {visitor.personToMeet || <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="px-5 py-3 tabular-nums text-slate-600">
                                                {formatSafeDate(visitor.checkIn)}
                                            </td>
                                            <td className="px-5 py-3 tabular-nums text-slate-600">
                                                {formatSafeDate(visitor.checkOut)}
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                {visitor.status === "inside" ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        Inside
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200/80">
                                                        Checked Out
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {visitor.status === "inside" && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCheckOut(visitor._id)}
                                                            className="h-7 px-2.5 inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold active:scale-95 transition-all cursor-pointer shadow-2xs"
                                                            title="Check out visitor"
                                                        >
                                                            <LogOut size={12} />
                                                            <span>Checkout</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditModal(visitor)}
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                                        title="Edit details"
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(visitor._id, visitor.visitorName)}
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
                title={editingVisitor ? "Edit Visitor Details" : "Log Visitor Entry"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Visitor Name *</label>
                        <Input
                            placeholder="e.g. John Doe"
                            value={formData.visitorName}
                            onChange={(e) => setFormData({ ...formData, visitorName: e.target.value })}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                            <Input
                                placeholder="9876543210"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Check In Time</label>
                            <Input
                                type="datetime-local"
                                value={formData.checkIn}
                                onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose of Visit *</label>
                            <Input
                                placeholder="e.g. Admission inquiry, Meeting"
                                value={formData.purpose}
                                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Person to Meet</label>
                            <Input
                                placeholder="e.g. Principal, Teacher Name"
                                value={formData.personToMeet}
                                onChange={(e) => setFormData({ ...formData, personToMeet: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">ID Proof Type</label>
                            <Select
                                value={formData.idProof}
                                onChange={(val) => setFormData({ ...formData, idProof: val })}
                                placeholder="Select Proof"
                                options={[
                                    { label: "Aadhar Card", value: "Aadhar" },
                                    { label: "PAN Card", value: "PAN" },
                                    { label: "Driver License", value: "DL" },
                                    { label: "Passport", value: "Passport" }
                                ]}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">ID Card Number</label>
                            <Input
                                placeholder="Enter ID number"
                                value={formData.idNumber}
                                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                        <textarea
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                            placeholder="Add any notes here…"
                            rows={3}
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? "Saving…" : "Save Entry"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
