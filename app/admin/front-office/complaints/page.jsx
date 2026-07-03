"use client";

import { useState, useEffect } from "react";
import { 
    Plus, 
    Search, 
    Trash2, 
    Edit2, 
    MessageSquare, 
    Clock, 
    X, 
    Save, 
    Filter, 
    CheckCircle,
    UserCheck,
    Calendar,
    AlertCircle,
    CheckCircle2,
    HelpCircle,
    User
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

export default function ComplaintsPage() {
    const toast = useToast();

    const [complaints, setComplaints] = useState([]);
    const [students, setStudents] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filter State
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");

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

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            if (statusFilter) queryParams.append("status", statusFilter);
            if (categoryFilter) queryParams.append("category", categoryFilter);
            if (search) queryParams.append("search", search);

            const res = await fetch(`/api/v1/front-office/complaints?${queryParams.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setComplaints(data.complaints || []);
            } else {
                toast.error("Failed to load complaints");
            }
        } catch (error) {
            console.error("Error fetching complaints:", error);
            toast.error("Failed to load complaints");
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            // Fetch students
            const studentRes = await fetch("/api/v1/users?role=student");
            if (studentRes.ok) {
                const studentData = await studentRes.json();
                setStudents(studentData.users || []);
            }

            // Fetch admin/instructors for assignment list
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
        fetchComplaints();
    }, [statusFilter, categoryFilter, search]);

    useEffect(() => {
        fetchUsers();
    }, []);

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

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this complaint?")) return;
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
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "open":
                return <Badge variant="warning" className="capitalize">Open</Badge>;
            case "in_progress":
                return <Badge variant="info" className="capitalize">In Progress</Badge>;
            case "resolved":
                return <Badge variant="success" className="capitalize">Resolved</Badge>;
            case "closed":
                return <Badge variant="secondary" className="capitalize">Closed</Badge>;
            default:
                return <Badge variant="secondary" className="capitalize">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Complaints & Grievances</h1>
                    <p className="text-sm text-slate-500">Log, assign, track, and resolve complaints raised by students, parents, or staff.</p>
                </div>
                <Button onClick={handleOpenAddModal} className="flex items-center gap-2">
                    <Plus size={16} />
                    <span>Log Complaint</span>
                </Button>
            </div>

            <Card className="overflow-hidden border-none shadow-premium">
                <CardHeader className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-50/50 border-b border-slate-100 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative min-w-[240px]">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search complaint #, name, details..."
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
                                { label: "Open", value: "open" },
                                { label: "In Progress", value: "in_progress" },
                                { label: "Resolved", value: "resolved" },
                                { label: "Closed", value: "closed" }
                            ]}
                        />

                        <Select
                            value={categoryFilter}
                            onChange={setCategoryFilter}
                            placeholder="All Categories"
                            options={[
                                { label: "Academic", value: "academic" },
                                { label: "Facility", value: "facility" },
                                { label: "Staff", value: "staff" },
                                { label: "Fee / Finance", value: "fee" },
                                { label: "Transport", value: "transport" },
                                { label: "Other", value: "other" }
                            ]}
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12"><LoadingSpinner /></div>
                    ) : complaints.length === 0 ? (
                        <EmptyState
                            icon={MessageSquare}
                            title="No Complaints Found"
                            description="Start by logging a new complaint or query."
                            actionLabel="Log Complaint"
                            onAction={handleOpenAddModal}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600 border-collapse">
                                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Complaint No</th>
                                        <th className="px-6 py-4">Complainant</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4">Related Student</th>
                                        <th className="px-6 py-4">Description</th>
                                        <th className="px-6 py-4">Assigned To</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {complaints.map((complaint) => (
                                        <tr key={complaint._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-900">{complaint.complaintNo}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{complaint.complainantName}</div>
                                                <div className="text-xs text-slate-400 capitalize">{complaint.complainantType}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="secondary" className="capitalize">{complaint.category}</Badge>
                                            </td>
                                            <td className="px-6 py-4">{complaint.relatedStudent?.fullName || "-"}</td>
                                            <td className="px-6 py-4 max-w-[200px] truncate">{complaint.description}</td>
                                            <td className="px-6 py-4">{complaint.assignedTo?.fullName || "Unassigned"}</td>
                                            <td className="px-6 py-4">{getStatusBadge(complaint.status)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="xs"
                                                        variant="outline"
                                                        onClick={() => handleOpenEditModal(complaint)}
                                                    >
                                                        <Edit2 size={12} />
                                                    </Button>
                                                    <Button
                                                        size="xs"
                                                        variant="outline"
                                                        className="text-red-600 border-red-100 hover:bg-red-50"
                                                        onClick={() => handleDelete(complaint._id)}
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
                title={editingComplaint ? `Edit Complaint ${formData.complaintNo || ""}` : "Log New Complaint / Grievance"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Complainant Name *</label>
                            <Input
                                placeholder="Full name"
                                value={formData.complainantName}
                                onChange={(e) => setFormData({ ...formData, complainantName: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Complainant Phone</label>
                            <Input
                                placeholder="Phone number"
                                value={formData.complainantPhone}
                                onChange={(e) => setFormData({ ...formData, complainantPhone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Complainant Type</label>
                            <Select
                                value={formData.complainantType}
                                onChange={(val) => setFormData({ ...formData, complainantType: val })}
                                options={[
                                    { label: "Parent", value: "parent" },
                                    { label: "Student", value: "student" },
                                    { label: "Staff", value: "staff" },
                                    { label: "Visitor", value: "visitor" },
                                    { label: "Other", value: "other" }
                                ]}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Category</label>
                            <Select
                                value={formData.category}
                                onChange={(val) => setFormData({ ...formData, category: val })}
                                options={[
                                    { label: "Academic", value: "academic" },
                                    { label: "Facility", value: "facility" },
                                    { label: "Staff", value: "staff" },
                                    { label: "Fee / Finance", value: "fee" },
                                    { label: "Transport", value: "transport" },
                                    { label: "Other", value: "other" }
                                ]}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Related Student (Optional)</label>
                            <Select
                                value={formData.relatedStudent}
                                onChange={(val) => setFormData({ ...formData, relatedStudent: val })}
                                placeholder="Select Student"
                                options={students.map(s => ({ label: s.fullName, value: s._id }))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Assigned To Staff (Optional)</label>
                            <Select
                                value={formData.assignedTo}
                                onChange={(val) => setFormData({ ...formData, assignedTo: val })}
                                placeholder="Select Staff member"
                                options={staff.map(st => ({ label: st.fullName, value: st._id }))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Complaint Description *</label>
                        <textarea
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Describe the complaint in detail..."
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                        />
                    </div>

                    {editingComplaint && (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                            <h4 className="text-sm font-semibold text-slate-700">Resolution & Status Update</h4>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Status</label>
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

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Resolution Details</label>
                                <textarea
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="Add resolution action details..."
                                    rows={2}
                                    value={formData.resolution}
                                    onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? "Saving..." : "Save Complaint"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
