"use client";

import { useState, useEffect } from "react";
import { 
    Plus, 
    Search, 
    Trash2, 
    Edit2, 
    Mail, 
    Clock, 
    X, 
    Save, 
    Filter, 
    CheckCircle,
    UserCheck,
    Calendar,
    Send,
    Inbox,
    FileText,
    ArrowUpRight,
    ArrowDownLeft
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
import { cn } from "@/lib/utils";

export default function PostalsPage() {
    const toast = useToast();

    // Internal Tabs: dispatch, receive
    const [activeTab, setActiveTab] = useState("receive");
    const [postals, setPostals] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filter State
    const [search, setSearch] = useState("");
    const [postalTypeFilter, setPostalTypeFilter] = useState("");

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

    const fetchPostals = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            queryParams.append("type", activeTab);
            if (postalTypeFilter) queryParams.append("postalType", postalTypeFilter);
            if (search) queryParams.append("search", search);

            const res = await fetch(`/api/v1/front-office/postals?${queryParams.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setPostals(data.postals || []);
            } else {
                toast.error("Failed to load postal logs");
            }
        } catch (error) {
            console.error("Error fetching postals:", error);
            toast.error("Failed to load postal logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPostals();
    }, [activeTab, postalTypeFilter, search]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setFormData(initialFormState(tab));
    };

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

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this postal entry?")) return;
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
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Postals Log</h1>
                    <p className="text-sm text-slate-500">Track all incoming (received) and outgoing (dispatched) postals, courier tracking, and recipients.</p>
                </div>
                <Button onClick={handleOpenAddModal} className="flex items-center gap-2">
                    <Plus size={16} />
                    <span>Log {activeTab === "receive" ? "Received Postal" : "Dispatched Postal"}</span>
                </Button>
            </div>

            {/* Custom Tab Bar */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => handleTabChange("receive")}
                    className={cn(
                        "flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-all focus:outline-none",
                        activeTab === "receive" 
                            ? "border-blue-600 text-blue-600 font-bold" 
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    )}
                >
                    <ArrowDownLeft size={16} className={activeTab === "receive" ? "text-blue-600" : "text-slate-400"} />
                    <span>Received Postals</span>
                </button>
                <button
                    onClick={() => handleTabChange("dispatch")}
                    className={cn(
                        "flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-all focus:outline-none",
                        activeTab === "dispatch" 
                            ? "border-blue-600 text-blue-600 font-bold" 
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    )}
                >
                    <ArrowUpRight size={16} className={activeTab === "dispatch" ? "text-blue-600" : "text-slate-400"} />
                    <span>Dispatched Postals</span>
                </button>
            </div>

            <Card className="overflow-hidden border-none shadow-premium">
                <CardHeader className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-50/50 border-b border-slate-100 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative min-w-[240px]">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search reference, name, to/from..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 bg-white"
                            />
                        </div>

                        <Select
                            value={postalTypeFilter}
                            onChange={setPostalTypeFilter}
                            placeholder="All Postal Types"
                            options={[
                                { label: "Courier", value: "courier" },
                                { label: "Letter", value: "letter" },
                                { label: "Parcel", value: "parcel" },
                                { label: "Speed Post", value: "speed_post" },
                                { label: "Registered Post", value: "registered" }
                            ]}
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12"><LoadingSpinner /></div>
                    ) : postals.length === 0 ? (
                        <EmptyState
                            icon={Mail}
                            title={activeTab === "receive" ? "No Received Postals" : "No Dispatched Postals"}
                            description={`Log your first ${activeTab} postal entry.`}
                            actionLabel={`Log ${activeTab === "receive" ? "Received" : "Dispatched"}`}
                            onAction={handleOpenAddModal}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600 border-collapse">
                                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Reference No</th>
                                        <th className="px-6 py-4">Postal Type</th>
                                        {activeTab === "receive" ? (
                                            <>
                                                <th className="px-6 py-4">Sender (From)</th>
                                                <th className="px-6 py-4">Receiver (To Internal)</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="px-6 py-4">Sender (From Internal)</th>
                                                <th className="px-6 py-4">Receiver (To)</th>
                                            </>
                                        )}
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Remarks</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {postals.map((postal) => (
                                        <tr key={postal._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-semibold text-slate-900">{postal.referenceNo || "-"}</td>
                                            <td className="px-6 py-4">
                                                <Badge variant="secondary" className="capitalize">
                                                    {postal.postalType?.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            {activeTab === "receive" ? (
                                                <>
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-slate-900">{postal.senderName}</div>
                                                        <div className="text-xs text-slate-400 max-w-[160px] truncate">{postal.senderAddress}</div>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-blue-600">{postal.toFrom || "-"}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-6 py-4 font-medium text-blue-600">{postal.toFrom || "-"}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-slate-900">{postal.receiverName}</div>
                                                        <div className="text-xs text-slate-400 max-w-[160px] truncate">{postal.receiverAddress}</div>
                                                    </td>
                                                </>
                                            )}
                                            <td className="px-6 py-4 text-xs">
                                                {postal.date ? format(new Date(postal.date), "dd MMM yyyy") : "-"}
                                            </td>
                                            <td className="px-6 py-4 max-w-[180px] truncate">{postal.remarks || "-"}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="xs"
                                                        variant="outline"
                                                        onClick={() => handleOpenEditModal(postal)}
                                                    >
                                                        <Edit2 size={12} />
                                                    </Button>
                                                    <Button
                                                        size="xs"
                                                        variant="outline"
                                                        className="text-red-600 border-red-100 hover:bg-red-50"
                                                        onClick={() => handleDelete(postal._id)}
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
                title={editingPostal 
                    ? `Edit ${formData.type === "receive" ? "Received" : "Dispatched"} Postal Entry` 
                    : `Log New ${activeTab === "receive" ? "Received" : "Dispatched"} Postal`
                }
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Reference / Tracking No</label>
                            <Input
                                placeholder="Tracking ID, Ref Number"
                                value={formData.referenceNo}
                                onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Postal Mode *</label>
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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Date</label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                                {formData.type === "receive" ? "To (Staff/Student Name)" : "From (Staff/Department)"}
                            </label>
                            <Input
                                placeholder="E.g. Admin Dept, John Smith"
                                value={formData.toFrom}
                                onChange={(e) => setFormData({ ...formData, toFrom: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 space-y-4">
                        <h4 className="text-sm font-semibold text-slate-700">Sender Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Sender Name</label>
                                <Input
                                    placeholder="Full name of sender"
                                    value={formData.senderName}
                                    onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Sender Address</label>
                                <Input
                                    placeholder="Sender Address details"
                                    value={formData.senderAddress}
                                    onChange={(e) => setFormData({ ...formData, senderAddress: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 space-y-4">
                        <h4 className="text-sm font-semibold text-slate-700">Receiver Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Receiver Name</label>
                                <Input
                                    placeholder="Full name of receiver"
                                    value={formData.receiverName}
                                    onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Receiver Address</label>
                                <Input
                                    placeholder="Receiver Address details"
                                    value={formData.receiverAddress}
                                    onChange={(e) => setFormData({ ...formData, receiverAddress: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Remarks / Notes</label>
                        <textarea
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Add extra courier detail, signature status, etc."
                            rows={3}
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? "Saving..." : "Save Postal Record"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
