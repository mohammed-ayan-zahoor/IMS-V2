"use client";

import { useState, useEffect, useCallback } from "react";
import { 
    Plus, 
    Trash2, 
    Edit2, 
    ArrowDownLeft,
    ArrowUpRight,
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

function formatSafeDate(dateString, pattern = "dd MMM yyyy") {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return isValid(d) ? format(d, pattern) : "-";
}

export default function PostalsPage() {
    const toast = useToast();
    const confirm = useConfirm();

    // Internal Tabs: receive, dispatch
    const [activeTab, setActiveTab] = useState("receive");
    const [postals, setPostals] = useState([]);
    const [stats, setStats] = useState({
        receivedCount: 0,
        dispatchedCount: 0,
        totalToday: 0,
        totalAllTime: 0
    });
    const [loading, setLoading] = useState(true);
    
    // Filter State
    const [search, setSearch] = useState("");
    const [postalTypeFilter, setPostalTypeFilter] = useState("");
    const [dateFilter, setDateFilter] = useState("today"); // "today", "yesterday", "week", "month", "all"

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingPostal, setEditingPostal] = useState(null);
    const [formData, setFormData] = useState(initialFormState(activeTab));

    function initialFormState(type) {
        return {
            type: type || "receive",
            referenceNo: "",
            senderName: "",
            senderAddress: "",
            receiverName: "",
            receiverAddress: "",
            date: format(new Date(), "yyyy-MM-dd"),
            postalType: "courier",
            toFrom: "",
            remarks: "",
            attachmentUrl: ""
        };
    }

    const fetchPostals = useCallback(async (signal) => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            queryParams.append("type", activeTab);
            if (dateFilter) queryParams.append("dateRange", dateFilter);
            if (postalTypeFilter) queryParams.append("postalType", postalTypeFilter);
            if (search.trim()) queryParams.append("search", search.trim());

            const res = await fetch(`/api/v1/front-office/postals?${queryParams.toString()}`, {
                signal: signal || AbortSignal.timeout(10000)
            });
            if (res.ok) {
                const data = await res.json();
                if (signal?.aborted) return;
                setPostals(data.postals || []);
                if (data.stats) {
                    setStats(data.stats);
                }
            } else {
                toast.error("Failed to load postal logs");
            }
        } catch (error) {
            if (error.name === "AbortError") return;
            console.error("Error fetching postals:", error);
            toast.error("Failed to load postal logs");
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, [activeTab, dateFilter, postalTypeFilter, search, toast]);

    useEffect(() => {
        const controller = new AbortController();
        fetchPostals(controller.signal);
        return () => controller.abort();
    }, [fetchPostals]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setFormData(initialFormState(tab));
    };

    const handleClearFilters = () => {
        setSearch("");
        setPostalTypeFilter("");
        setDateFilter("today");
    };

    const hasActiveFilters = Boolean(
        search.trim() !== "" || 
        postalTypeFilter !== "" || 
        dateFilter !== "today"
    );

    const handleOpenAddModal = () => {
        setEditingPostal(null);
        setFormData(initialFormState(activeTab));
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (postal) => {
        setEditingPostal(postal);
        setFormData({
            type: postal.type,
            referenceNo: postal.referenceNo || "",
            senderName: postal.senderName || "",
            senderAddress: postal.senderAddress || "",
            receiverName: postal.receiverName || "",
            receiverAddress: postal.receiverAddress || "",
            date: postal.date ? format(new Date(postal.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
            postalType: postal.postalType || "courier",
            toFrom: postal.toFrom || "",
            remarks: postal.remarks || "",
            attachmentUrl: postal.attachmentUrl || ""
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const url = editingPostal 
                ? `/api/v1/front-office/postals/${editingPostal._id}` 
                : "/api/v1/front-office/postals";
            const method = editingPostal ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(editingPostal ? "Postal record updated successfully" : "Postal logged successfully");
                setIsModalOpen(false);
                fetchPostals();
            } else {
                const data = await res.json();
                toast.error(data.error || "Something went wrong");
            }
        } catch (error) {
            console.error("Error submitting postal:", error);
            toast.error("Failed to save postal record");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id, ref) => {
        if (await confirm({
            title: "Delete Postal Record?",
            message: `Are you sure you want to delete postal record ${ref ? `"${ref}"` : ""}? This action cannot be undone.`,
            type: "danger"
        })) {
            try {
                const res = await fetch(`/api/v1/front-office/postals/${id}`, {
                    method: "DELETE"
                });

                if (res.ok) {
                    toast.success("Postal record deleted");
                    fetchPostals();
                } else {
                    toast.error("Failed to delete record");
                }
            } catch (error) {
                console.error("Error deleting postal:", error);
                toast.error("Failed to delete record");
            }
        }
    };

    return (
        <div className="w-full space-y-6">
            {/* Header: Title and Single Primary Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">Postals Log</h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Track all incoming (received) and outgoing (dispatched) postals, courier tracking, and recipients.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 active:scale-[0.98] transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
                >
                    <Plus size={15} />
                    <span>Log {activeTab === "receive" ? "Received Postal" : "Dispatched Postal"}</span>
                </button>
            </div>

            {/* Single Unified Card: Tabs + Toolbar + Content */}
            <div className="w-full bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                {/* Clean Tab Selector */}
                <div className="flex items-center gap-1 p-2 bg-slate-50/60 border-b border-slate-200/80">
                    <button
                        type="button"
                        onClick={() => handleTabChange("receive")}
                        className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                            activeTab === "receive"
                                ? "bg-white text-slate-900 shadow-2xs border border-slate-200/90"
                                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                        )}
                    >
                        <ArrowDownLeft size={13} className={activeTab === "receive" ? "text-emerald-600" : "text-slate-400"} />
                        <span>Received Postals</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange("dispatch")}
                        className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                            activeTab === "dispatch"
                                ? "bg-white text-slate-900 shadow-2xs border border-slate-200/90"
                                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                        )}
                    >
                        <ArrowUpRight size={13} className={activeTab === "dispatch" ? "text-blue-600" : "text-slate-400"} />
                        <span>Dispatched Postals</span>
                    </button>
                </div>

                {/* 1-Row Filter Toolbar */}
                <ListToolbar
                    search={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search reference, name, to/from…"
                    hasActiveFilters={hasActiveFilters}
                    onClearFilters={handleClearFilters}
                    filters={[
                        {
                            label: "Type",
                            value: postalTypeFilter,
                            onChange: setPostalTypeFilter,
                            isNonDefault: postalTypeFilter !== "",
                            options: [
                                { label: "All", value: "" },
                                { label: "Courier", value: "courier" },
                                { label: "Letter", value: "letter" },
                                { label: "Parcel", value: "parcel" },
                                { label: "Speed Post", value: "speed_post" },
                                { label: "Registered Post", value: "registered" }
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
                            label: "Received:",
                            count: stats.receivedCount,
                            active: activeTab === "receive",
                            dotColor: "bg-emerald-500",
                            activeClassName: "bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300 shadow-2xs",
                            onClick: () => handleTabChange("receive"),
                            title: "View received postals"
                        },
                        {
                            label: "Dispatched:",
                            count: stats.dispatchedCount,
                            active: activeTab === "dispatch",
                            dotColor: "bg-blue-500",
                            activeClassName: "bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-300 shadow-2xs",
                            onClick: () => handleTabChange("dispatch"),
                            title: "View dispatched postals"
                        },
                        {
                            label: "Total today:",
                            count: stats.totalToday,
                            active: dateFilter === "today",
                            dotColor: "bg-slate-400",
                            activeClassName: "bg-slate-100 text-slate-800 border-slate-300 ring-1 ring-slate-300 shadow-2xs",
                            onClick: () => setDateFilter("today"),
                            title: "View postals logged today"
                        }
                    ]}
                />

                {/* Content Area: Loader, Smart Empty State, or Table */}
                <div>
                    {loading ? (
                        <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400 text-sm font-medium">
                            <Loader2 className="animate-spin text-blue-600" size={32} />
                            <span>Loading postals…</span>
                        </div>
                    ) : postals.length === 0 ? (
                        /* Smart Empty State */
                        hasActiveFilters ? (
                            <EmptyState
                                title="No matching postals"
                                description="Try a different reference number, sender, recipient or date."
                                actionLabel="Clear filters"
                                actionVariant="outline"
                                onAction={handleClearFilters}
                            />
                        ) : stats.totalAllTime > 0 ? (
                            <EmptyState
                                title={`No ${activeTab === "receive" ? "received" : "dispatched"} postals today`}
                                description="Postals you log will appear here."
                                actionLabel={`Log ${activeTab === "receive" ? "received" : "dispatched"} postal`}
                                actionVariant="outline"
                                onAction={handleOpenAddModal}
                                secondaryActionLabel="View last 7 days"
                                onSecondaryAction={() => setDateFilter("week")}
                            />
                        ) : (
                            <EmptyState
                                title="Your postals log is empty"
                                description="Track incoming packages, letters, speed posts, and outbound courier dispatches."
                                actionLabel={`Log ${activeTab === "receive" ? "received" : "dispatched"} postal`}
                                actionVariant="outline"
                                onAction={handleOpenAddModal}
                            />
                        )
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-600 border-collapse">
                                <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold">Reference No</th>
                                        <th className="px-5 py-3 font-semibold">Postal Type</th>
                                        {activeTab === "receive" ? (
                                            <>
                                                <th className="px-5 py-3 font-semibold">Sender (From)</th>
                                                <th className="px-5 py-3 font-semibold">To (Internal Person)</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="px-5 py-3 font-semibold">From (Internal Person)</th>
                                                <th className="px-5 py-3 font-semibold">Receiver (To)</th>
                                            </>
                                        )}
                                        <th className="px-5 py-3 font-semibold">Date</th>
                                        <th className="px-5 py-3 font-semibold">Remarks</th>
                                        <th className="px-5 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {postals.map((postal) => (
                                        <tr key={postal._id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-5 py-3 font-semibold text-slate-900 tabular-nums">
                                                {postal.referenceNo || "-"}
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/80">
                                                    {postal.postalType?.replace("_", " ")}
                                                </span>
                                            </td>
                                            {activeTab === "receive" ? (
                                                <>
                                                    <td className="px-5 py-3">
                                                        <div className="font-semibold text-slate-900">{postal.senderName}</div>
                                                        {postal.senderAddress && (
                                                            <div className="text-[11px] text-slate-400 max-w-[180px] truncate">{postal.senderAddress}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3 font-medium text-blue-700">
                                                        {postal.toFrom || "-"}
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-5 py-3 font-medium text-blue-700">
                                                        {postal.toFrom || "-"}
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <div className="font-semibold text-slate-900">{postal.receiverName}</div>
                                                        {postal.receiverAddress && (
                                                            <div className="text-[11px] text-slate-400 max-w-[180px] truncate">{postal.receiverAddress}</div>
                                                        )}
                                                    </td>
                                                </>
                                            )}
                                            <td className="px-5 py-3 tabular-nums text-slate-600">
                                                {formatSafeDate(postal.date)}
                                            </td>
                                            <td className="px-5 py-3 max-w-[180px] truncate text-slate-600">
                                                {postal.remarks || "-"}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditModal(postal)}
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                                        title="Edit details"
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(postal._id, postal.referenceNo)}
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
                title={editingPostal 
                    ? `Edit ${formData.type === "receive" ? "Received" : "Dispatched"} Postal Entry` 
                    : `Log New ${activeTab === "receive" ? "Received" : "Dispatched"} Postal`
                }
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / Tracking No</label>
                            <Input
                                placeholder="e.g. TRK98127391"
                                value={formData.referenceNo}
                                onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Postal Type *</label>
                            <Select
                                value={formData.postalType}
                                onChange={(val) => setFormData({ ...formData, postalType: val })}
                                options={[
                                    { label: "Courier", value: "courier" },
                                    { label: "Letter", value: "letter" },
                                    { label: "Parcel", value: "parcel" },
                                    { label: "Speed Post", value: "speed_post" },
                                    { label: "Registered Post", value: "registered" }
                                ]}
                            />
                        </div>
                    </div>

                    {formData.type === "receive" ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Sender Name (From) *</label>
                                    <Input
                                        placeholder="e.g. Oxford Press"
                                        value={formData.senderName}
                                        onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Receiver (To Internal Person)</label>
                                    <Input
                                        placeholder="e.g. Principal / Librarian"
                                        value={formData.toFrom}
                                        onChange={(e) => setFormData({ ...formData, toFrom: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Sender Address / Location</label>
                                <Input
                                    placeholder="e.g. New Delhi, India"
                                    value={formData.senderAddress}
                                    onChange={(e) => setFormData({ ...formData, senderAddress: e.target.value })}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Receiver Name (To) *</label>
                                    <Input
                                        placeholder="e.g. State Board Office"
                                        value={formData.receiverName}
                                        onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Sender (From Internal Person)</label>
                                    <Input
                                        placeholder="e.g. Accounts Department"
                                        value={formData.toFrom}
                                        onChange={(e) => setFormData({ ...formData, toFrom: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Receiver Address</label>
                                <Input
                                    placeholder="e.g. Bangalore, Karnataka"
                                    value={formData.receiverAddress}
                                    onChange={(e) => setFormData({ ...formData, receiverAddress: e.target.value })}
                                />
                            </div>
                        </>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Attachment / Slip URL</label>
                            <Input
                                placeholder="https://..."
                                value={formData.attachmentUrl}
                                onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                        <textarea
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                            placeholder="Add notes about contents or handling…"
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
                            {submitting ? "Saving…" : "Save Record"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
