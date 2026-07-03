"use client";

import { useState, useEffect } from "react";
import { 
    Plus, 
    Search, 
    Trash2, 
    Edit2, 
    ClipboardList, 
    Clock, 
    X, 
    Save, 
    Filter, 
    LogOut,
    CheckCircle,
    UserCheck,
    Phone,
    Info,
    Calendar
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

export default function VisitorBookPage() {
    const toast = useToast();

    const [visitors, setVisitors] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filter State
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState(""); // inside, left
    const [dateFilter, setDateFilter] = useState("today"); // today, week, all

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

    const fetchVisitors = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            if (statusFilter) queryParams.append("status", statusFilter);
            if (dateFilter) queryParams.append("dateRange", dateFilter);
            if (search) queryParams.append("search", search);

            const res = await fetch(`/api/v1/front-office/visitors?${queryParams.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setVisitors(data.visitors || []);
            } else {
                toast.error("Failed to load visitors");
            }
        } catch (error) {
            console.error("Error fetching visitors:", error);
            toast.error("Failed to load visitors");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVisitors();
    }, [statusFilter, dateFilter, search]);

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
                toast.success(editingVisitor ? "Visitor updated successfully" : "Visitor added successfully");
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

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this visitor record?")) return;
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
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Visitor Book</h1>
                    <p className="text-sm text-slate-500">Track and manage institute visitors, check-ins, and checkout timings.</p>
                </div>
                <Button onClick={handleOpenAddModal} className="flex items-center gap-2">
                    <Plus size={16} />
                    <span>Log New Visitor</span>
                </Button>
            </div>

            <Card className="overflow-hidden border-none shadow-premium">
                <CardHeader className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-50/50 border-b border-slate-100 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative min-w-[240px]">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search visitor, phone, purpose..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 bg-white"
                            />
                        </div>

                        <Select
                            value={statusFilter}
                            onChange={setStatusFilter}
                            placeholder="All Statuses"
                            options={[
                                { label: "Inside", value: "inside" },
                                { label: "Left / Checked Out", value: "left" }
                            ]}
                        />

                        <Select
                            value={dateFilter}
                            onChange={setDateFilter}
                            options={[
                                { label: "Today's Visitors", value: "today" },
                                { label: "Last 7 Days", value: "week" },
                                { label: "All Records", value: "all" }
                            ]}
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12"><LoadingSpinner /></div>
                    ) : visitors.length === 0 ? (
                        <EmptyState
                            icon={ClipboardList}
                            title="No Visitors Found"
                            description="Start by logging a new visitor."
                            actionLabel="Log New Visitor"
                            onAction={handleOpenAddModal}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600 border-collapse">
                                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Visitor Name</th>
                                        <th className="px-6 py-4">Phone</th>
                                        <th className="px-6 py-4">Purpose</th>
                                        <th className="px-6 py-4">To Meet</th>
                                        <th className="px-6 py-4">Check In</th>
                                        <th className="px-6 py-4">Check Out</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {visitors.map((visitor) => (
                                        <tr key={visitor._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900">{visitor.visitorName}</td>
                                            <td className="px-6 py-4">
                                                {visitor.phone ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone size={14} className="text-slate-400" />
                                                        <span>{visitor.phone}</span>
                                                    </div>
                                                ) : "-"}
                                            </td>
                                            <td className="px-6 py-4 max-w-[200px] truncate">{visitor.purpose}</td>
                                            <td className="px-6 py-4">{visitor.personToMeet || "-"}</td>
                                            <td className="px-6 py-4 text-xs">
                                                {visitor.checkIn ? format(new Date(visitor.checkIn), "dd MMM, hh:mm a") : "-"}
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                {visitor.checkOut ? format(new Date(visitor.checkOut), "dd MMM, hh:mm a") : "-"}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge variant={visitor.status === "inside" ? "success" : "secondary"}>
                                                    {visitor.status === "inside" ? "Inside" : "Checked Out"}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {visitor.status === "inside" && (
                                                        <Button
                                                            size="xs"
                                                            variant="success"
                                                            onClick={() => handleCheckOut(visitor._id)}
                                                            className="flex items-center gap-1"
                                                        >
                                                            <LogOut size={12} />
                                                            <span>Checkout</span>
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="xs"
                                                        variant="outline"
                                                        onClick={() => handleOpenEditModal(visitor)}
                                                    >
                                                        <Edit2 size={12} />
                                                    </Button>
                                                    <Button
                                                        size="xs"
                                                        variant="outline"
                                                        className="text-red-600 border-red-100 hover:bg-red-50"
                                                        onClick={() => handleDelete(visitor._id)}
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
                title={editingVisitor ? "Edit Visitor Details" : "Log Visitor Entry"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Visitor Name *</label>
                        <Input
                            placeholder="John Doe"
                            value={formData.visitorName}
                            onChange={(e) => setFormData({ ...formData, visitorName: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Phone Number</label>
                            <Input
                                placeholder="9876543210"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Check In Time</label>
                            <Input
                                type="datetime-local"
                                value={formData.checkIn}
                                onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Purpose of Visit *</label>
                            <Input
                                placeholder="Admission inquiry, Meeting, etc."
                                value={formData.purpose}
                                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Person to Meet</label>
                            <Input
                                placeholder="Principal, Teacher Name"
                                value={formData.personToMeet}
                                onChange={(e) => setFormData({ ...formData, personToMeet: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">ID Proof Type</label>
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
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">ID Card Number</label>
                            <Input
                                placeholder="Enter ID number"
                                value={formData.idNumber}
                                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Remarks</label>
                        <textarea
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Add any notes here..."
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
                            {submitting ? "Saving..." : "Save Entry"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
