"use client";

import { useState, useEffect } from "react";
import { 
    Plus, 
    Search, 
    Trash2, 
    Edit2, 
    Phone, 
    Clock, 
    X, 
    Save, 
    Filter, 
    PhoneCall,
    CheckCircle,
    UserCheck,
    Calendar,
    PhoneForwarded,
    PhoneIncoming
} from "lucide-react";
import { format } from "date-fns";

import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/contexts/ToastContext";

export default function PhoneCallLogPage() {
    const toast = useToast();

    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filter State
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState(""); // inbound, outbound
    const [followUpFilter, setFollowUpFilter] = useState(""); // true, ""

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

    const fetchCalls = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            if (typeFilter) queryParams.append("type", typeFilter);
            if (followUpFilter) queryParams.append("followUpRequired", followUpFilter);
            if (search) queryParams.append("search", search);

            const res = await fetch(`/api/v1/front-office/calls?${queryParams.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setCalls(data.calls || []);
            } else {
                toast.error("Failed to load calls");
            }
        } catch (error) {
            console.error("Error fetching calls:", error);
            toast.error("Failed to load calls");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCalls();
    }, [typeFilter, followUpFilter, search]);

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
            followUpRequired: !!call.followUpRequired,
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
            toast.error("Failed to save call");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this call log?")) return;
        try {
            const res = await fetch(`/api/v1/front-office/calls/${id}`, {
                method: "DELETE"
            });

            if (res.ok) {
                toast.success("Call log deleted");
                fetchCalls();
            } else {
                toast.error("Failed to delete log");
            }
        } catch (error) {
            console.error("Error deleting call:", error);
            toast.error("Failed to delete log");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Phone Call Log</h1>
                    <p className="text-sm text-slate-500">Log and track incoming and outgoing calls, query purposes, and follow-ups.</p>
                </div>
                <Button onClick={handleOpenAddModal} className="flex items-center gap-2">
                    <Plus size={16} />
                    <span>Log Call</span>
                </Button>
            </div>

            <Card className="overflow-hidden border-none shadow-premium">
                <CardHeader className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-50/50 border-b border-slate-100 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative min-w-[240px]">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search caller, phone, purpose..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 bg-white"
                            />
                        </div>

                        <Select
                            value={typeFilter}
                            onChange={setTypeFilter}
                            placeholder="All Call Types"
                            options={[
                                { label: "Incoming / Inbound", value: "inbound" },
                                { label: "Outgoing / Outbound", value: "outbound" }
                            ]}
                        />

                        <Select
                            value={followUpFilter}
                            onChange={setFollowUpFilter}
                            placeholder="All Follow-ups"
                            options={[
                                { label: "Follow-up Required", value: "true" }
                            ]}
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12"><LoadingSpinner /></div>
                    ) : calls.length === 0 ? (
                        <EmptyState
                            icon={PhoneCall}
                            title="No Calls Found"
                            description="Start by logging a new call."
                            actionLabel="Log Call"
                            onAction={handleOpenAddModal}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600 border-collapse">
                                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Caller/Name</th>
                                        <th className="px-6 py-4">Phone</th>
                                        <th className="px-6 py-4">Purpose</th>
                                        <th className="px-6 py-4">Receiver/Handled By</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Duration</th>
                                        <th className="px-6 py-4">Follow-up</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {calls.map((call) => (
                                        <tr key={call._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <Badge variant={call.type === "inbound" ? "success" : "info"} className="flex items-center gap-1 w-fit">
                                                    {call.type === "inbound" ? (
                                                        <PhoneIncoming size={12} />
                                                    ) : (
                                                        <PhoneForwarded size={12} />
                                                    )}
                                                    <span className="capitalize">{call.type}</span>
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900">{call.callerName}</td>
                                            <td className="px-6 py-4">{call.callerPhone}</td>
                                            <td className="px-6 py-4 max-w-[180px] truncate">{call.purpose || "-"}</td>
                                            <td className="px-6 py-4">{call.receiverName || "-"}</td>
                                            <td className="px-6 py-4 text-xs">
                                                {call.date ? format(new Date(call.date), "dd MMM, hh:mm a") : "-"}
                                            </td>
                                            <td className="px-6 py-4 text-xs">{call.duration ? `${call.duration} mins` : "-"}</td>
                                            <td className="px-6 py-4">
                                                {call.followUpRequired ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <Badge variant="warning">Required</Badge>
                                                        {call.followUpDate && (
                                                            <span className="text-[10px] text-slate-400">
                                                                {format(new Date(call.followUpDate), "dd MMM yyyy")}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="xs"
                                                        variant="outline"
                                                        onClick={() => handleOpenEditModal(call)}
                                                    >
                                                        <Edit2 size={12} />
                                                    </Button>
                                                    <Button
                                                        size="xs"
                                                        variant="outline"
                                                        className="text-red-600 border-red-100 hover:bg-red-50"
                                                        onClick={() => handleDelete(call._id)}
                                                    >
                                                        <Trash2 size={12} />
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

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCall ? "Edit Call Log Details" : "Log New Phone Call"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Call Type *</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                                <input
                                    type="radio"
                                    name="type"
                                    checked={formData.type === "inbound"}
                                    onChange={() => setFormData({ ...formData, type: "inbound" })}
                                    className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                />
                                <span>Incoming / Inbound</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                                <input
                                    type="radio"
                                    name="type"
                                    checked={formData.type === "outbound"}
                                    onChange={() => setFormData({ ...formData, type: "outbound" })}
                                    className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                />
                                <span>Outgoing / Outbound</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Caller Name *</label>
                            <Input
                                placeholder="Complainant, Parent, etc."
                                value={formData.callerName}
                                onChange={(e) => setFormData({ ...formData, callerName: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Phone Number *</label>
                            <Input
                                placeholder="9876543210"
                                value={formData.callerPhone}
                                onChange={(e) => setFormData({ ...formData, callerPhone: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Receiver / Handled By</label>
                            <Input
                                placeholder="Staff member name"
                                value={formData.receiverName}
                                onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Call Duration (Minutes)</label>
                            <Input
                                type="number"
                                min="0"
                                placeholder="3"
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value, 10) })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Call Date & Time</label>
                            <Input
                                type="datetime-local"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Purpose of Call</label>
                            <Input
                                placeholder="Fee inquiry, Admission queries"
                                value={formData.purpose}
                                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.followUpRequired}
                                onChange={(e) => setFormData({ ...formData, followUpRequired: e.target.checked })}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Follow Up Required?</span>
                        </label>

                        {formData.followUpRequired && (
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Follow Up Date</label>
                                <Input
                                    type="date"
                                    value={formData.followUpDate}
                                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Notes / Summary</label>
                        <textarea
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Add call notes, actions required, or details here..."
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? "Saving..." : "Save Call Log"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
