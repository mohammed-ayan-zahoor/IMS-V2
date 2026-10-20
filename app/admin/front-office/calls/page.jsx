"use client";

import { useState, useEffect, useCallback } from "react";
import { 
    Plus, 
    Trash2, 
    Edit2, 
    Phone, 
    PhoneIncoming,
    PhoneForwarded,
    Loader2
} from "lucide-react";
import { format, isValid } from "date-fns";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
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

export default function PhoneCallLogPage() {
    const toast = useToast();
    const confirm = useConfirm();

    const [calls, setCalls] = useState([]);
    const [stats, setStats] = useState({
        inboundCount: 0,
        outboundCount: 0,
        followUpCount: 0,
        totalToday: 0,
        totalAllTime: 0
    });
    const [loading, setLoading] = useState(true);
    
    // Filter State
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState(""); // "", "inbound", "outbound"
    const [dateFilter, setDateFilter] = useState("today"); // "today", "yesterday", "week", "month", "all"
    const [followUpFilter, setFollowUpFilter] = useState(""); // "", "true"

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingCall, setEditingCall] = useState(null);
    const [formData, setFormData] = useState(initialFormState());

    function initialFormState() {
        return {
            type: "inbound",
            callerName: "",
            callerPhone: "",
            receiverName: "",
            purpose: "",
            date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
            duration: 0,
            followUpRequired: false,
            followUpDate: "",
            notes: ""
        };
    }

    const fetchCalls = useCallback(async (signal) => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            if (typeFilter) queryParams.append("type", typeFilter);
            if (dateFilter) queryParams.append("dateRange", dateFilter);
            if (followUpFilter) queryParams.append("followUpRequired", followUpFilter);
            if (search.trim()) queryParams.append("search", search.trim());

            const res = await fetch(`/api/v1/front-office/calls?${queryParams.toString()}`, {
                signal: signal || AbortSignal.timeout(10000)
            });
            if (res.ok) {
                const data = await res.json();
                if (signal?.aborted) return;
                setCalls(data.calls || []);
                if (data.stats) {
                    setStats(data.stats);
                }
            } else {
                toast.error("Failed to load calls");
            }
        } catch (error) {
            if (error.name === "AbortError") return;
            console.error("Error fetching calls:", error);
            toast.error("Failed to load calls");
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, [typeFilter, dateFilter, followUpFilter, search, toast]);

    useEffect(() => {
        const controller = new AbortController();
        fetchCalls(controller.signal);
        return () => controller.abort();
    }, [fetchCalls]);

    const handleClearFilters = () => {
        setSearch("");
        setTypeFilter("");
        setDateFilter("today");
        setFollowUpFilter("");
    };

    const hasActiveFilters = Boolean(
        search.trim() !== "" || 
        typeFilter !== "" || 
        dateFilter !== "today" ||
        followUpFilter !== ""
    );

    const handleOpenAddModal = () => {
        setEditingCall(null);
        setFormData(initialFormState());
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (call) => {
        setEditingCall(call);
        setFormData({
            type: call.type,
            callerName: call.callerName,
            callerPhone: call.callerPhone,
            receiverName: call.receiverName || "",
            purpose: call.purpose || "",
            date: call.date ? format(new Date(call.date), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
            duration: call.duration || 0,
            followUpRequired: Boolean(call.followUpRequired),
            followUpDate: call.followUpDate ? format(new Date(call.followUpDate), "yyyy-MM-dd") : "",
            notes: call.notes || ""
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.type || !formData.callerName || !formData.callerPhone) {
            toast.error("Type, Caller Name, and Phone are required");
            return;
        }

        try {
            setSubmitting(true);
            const url = editingCall 
                ? `/api/v1/front-office/calls/${editingCall._id}` 
                : "/api/v1/front-office/calls";
            const method = editingCall ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(editingCall ? "Call record updated successfully" : "Call logged successfully");
                setIsModalOpen(false);
                fetchCalls();
            } else {
                const data = await res.json();
                toast.error(data.error || "Something went wrong");
            }
        } catch (error) {
            console.error("Error submitting call:", error);
            toast.error("Failed to save call record");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (await confirm({
            title: "Delete Call Record?",
            message: `Are you sure you want to delete the call record for "${name || "this caller"}"? This action cannot be undone.`,
            type: "danger"
        })) {
            try {
                const res = await fetch(`/api/v1/front-office/calls/${id}`, {
                    method: "DELETE"
                });

                if (res.ok) {
                    toast.success("Call record deleted");
                    fetchCalls();
                } else {
                    toast.error("Failed to delete record");
                }
            } catch (error) {
                console.error("Error deleting call:", error);
                toast.error("Failed to delete record");
            }
        }
    };

    return (
        <div className="w-full space-y-6">
            {/* Header: Title and Single Primary Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">Phone Call Log</h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Track inbound and outbound phone calls, conversation notes, and follow-ups.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 active:scale-[0.98] transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
                >
                    <Plus size={15} />
                    <span>Log Call</span>
                </button>
            </div>

            {/* Single Unified Card: Toolbar + Content */}
            <div className="w-full bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                {/* 1-Row Filter Toolbar */}
                <ListToolbar
                    search={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search caller, phone, purpose…"
                    hasActiveFilters={hasActiveFilters}
                    onClearFilters={handleClearFilters}
                    filters={[
                        {
                            label: "Type",
                            value: typeFilter,
                            onChange: setTypeFilter,
                            isNonDefault: typeFilter !== "",
                            options: [
                                { label: "All", value: "" },
                                { label: "Incoming", value: "inbound" },
                                { label: "Outgoing", value: "outbound" }
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
                        },
                        {
                            label: "Follow-up",
                            value: followUpFilter,
                            onChange: setFollowUpFilter,
                            isNonDefault: followUpFilter !== "",
                            options: [
                                { label: "All", value: "" },
                                { label: "Required", value: "true" }
                            ]
                        }
                    ]}
                    summaryChips={[
                        {
                            label: "Incoming today:",
                            count: stats.inboundCount,
                            active: typeFilter === "inbound",
                            dotColor: "bg-emerald-500",
                            activeClassName: "bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300 shadow-2xs",
                            onClick: () => setTypeFilter(prev => prev === "inbound" ? "" : "inbound"),
                            title: "Filter by incoming calls today"
                        },
                        {
                            label: "Outgoing today:",
                            count: stats.outboundCount,
                            active: typeFilter === "outbound",
                            dotColor: "bg-blue-500",
                            activeClassName: "bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-300 shadow-2xs",
                            onClick: () => setTypeFilter(prev => prev === "outbound" ? "" : "outbound"),
                            title: "Filter by outgoing calls today"
                        },
                        {
                            label: "Follow-up needed:",
                            count: stats.followUpCount,
                            active: followUpFilter === "true",
                            dotColor: "bg-amber-500",
                            activeClassName: "bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-300 shadow-2xs",
                            onClick: () => setFollowUpFilter(prev => prev === "true" ? "" : "true"),
                            title: "Filter by calls needing follow-up"
                        }
                    ]}
                />

                {/* Content Area: Loader, Smart Empty State, or Table */}
                <div>
                    {loading ? (
                        <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400 text-sm font-medium">
                            <Loader2 className="animate-spin text-blue-600" size={32} />
                            <span>Loading calls…</span>
                        </div>
                    ) : calls.length === 0 ? (
                        /* Smart Empty State */
                        hasActiveFilters ? (
                            <EmptyState
                                title="No matching calls"
                                description="Try a different name, phone number, type or date."
                                actionLabel="Clear filters"
                                actionVariant="outline"
                                onAction={handleClearFilters}
                            />
                        ) : stats.totalAllTime > 0 ? (
                            <EmptyState
                                title="No calls logged today"
                                description="Calls you log will appear here."
                                actionLabel="Log call"
                                actionVariant="outline"
                                onAction={handleOpenAddModal}
                                secondaryActionLabel="View last 7 days"
                                onSecondaryAction={() => setDateFilter("week")}
                            />
                        ) : (
                            <EmptyState
                                title="Your call log is empty"
                                description="Log inbound and outbound phone calls, conversation notes, and required follow-ups."
                                actionLabel="Log call"
                                actionVariant="outline"
                                onAction={handleOpenAddModal}
                            />
                        )
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-600 border-collapse">
                                <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold">Type</th>
                                        <th className="px-5 py-3 font-semibold">Caller Name</th>
                                        <th className="px-5 py-3 font-semibold">Phone</th>
                                        <th className="px-5 py-3 font-semibold">Purpose</th>
                                        <th className="px-5 py-3 font-semibold">Handled By</th>
                                        <th className="px-5 py-3 font-semibold">Date & Time</th>
                                        <th className="px-5 py-3 font-semibold">Duration</th>
                                        <th className="px-5 py-3 font-semibold">Follow-up</th>
                                        <th className="px-5 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {calls.map((call) => (
                                        <tr key={call._id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-5 py-3">
                                                {call.type === "inbound" ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                        <PhoneIncoming size={11} className="text-emerald-600" />
                                                        Incoming
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                                                        <PhoneForwarded size={11} className="text-blue-600" />
                                                        Outgoing
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 font-semibold text-slate-900">
                                                {call.callerName}
                                            </td>
                                            <td className="px-5 py-3">
                                                {call.callerPhone ? (
                                                    <div className="inline-flex items-center gap-1.5 text-slate-700">
                                                        <Phone size={12} className="text-slate-400 shrink-0" />
                                                        <span className="tabular-nums">{call.callerPhone}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 max-w-[200px] truncate text-slate-700 font-medium" title={call.purpose}>
                                                {call.purpose || <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="px-5 py-3 text-slate-700">
                                                {call.receiverName || <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="px-5 py-3 tabular-nums text-slate-600">
                                                {formatSafeDate(call.date)}
                                            </td>
                                            <td className="px-5 py-3 tabular-nums text-slate-600">
                                                {call.duration ? `${call.duration} mins` : "-"}
                                            </td>
                                            <td className="px-5 py-3">
                                                {call.followUpRequired ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="inline-flex items-center w-fit px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                                            Required
                                                        </span>
                                                        {call.followUpDate && (
                                                            <span className="text-[10px] text-slate-400 tabular-nums">
                                                                {formatSafeDate(call.followUpDate, "dd MMM yyyy")}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditModal(call)}
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                                        title="Edit details"
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(call._id, call.callerName)}
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
                title={editingCall ? "Edit Call Details" : "Log Phone Call"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Call Type *</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: "inbound" })}
                                    className={cn(
                                        "h-9 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                                        formData.type === "inbound"
                                            ? "border-emerald-500 bg-emerald-50/70 text-emerald-800 ring-1 ring-emerald-500/30"
                                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <PhoneIncoming size={13} />
                                    <span>Incoming</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: "outbound" })}
                                    className={cn(
                                        "h-9 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                                        formData.type === "outbound"
                                            ? "border-blue-500 bg-blue-50/70 text-blue-800 ring-1 ring-blue-500/30"
                                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <PhoneForwarded size={13} />
                                    <span>Outgoing</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Call Date & Time</label>
                            <Input
                                type="datetime-local"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Caller / Contact Name *</label>
                            <Input
                                placeholder="e.g. John Doe"
                                value={formData.callerName}
                                onChange={(e) => setFormData({ ...formData, callerName: e.target.value })}
                                required
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                            <Input
                                placeholder="e.g. 9876543210"
                                value={formData.callerPhone}
                                onChange={(e) => setFormData({ ...formData, callerPhone: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Receiver / Handled By</label>
                            <Input
                                placeholder="e.g. Front Desk, Counselor"
                                value={formData.receiverName}
                                onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Minutes)</label>
                            <Input
                                type="number"
                                min="0"
                                placeholder="e.g. 5"
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose of Call</label>
                        <Input
                            placeholder="e.g. Admission inquiry, Fee confirmation"
                            value={formData.purpose}
                            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                        />
                    </div>

                    <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.followUpRequired}
                                onChange={(e) => setFormData({ ...formData, followUpRequired: e.target.checked })}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>Follow-up action required</span>
                        </label>

                        {formData.followUpRequired && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Follow-up Date</label>
                                <Input
                                    type="date"
                                    value={formData.followUpDate}
                                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Conversation Notes</label>
                        <textarea
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                            placeholder="Briefly note points discussed…"
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? "Saving…" : "Save Call"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
