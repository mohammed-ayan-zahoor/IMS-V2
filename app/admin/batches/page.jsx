"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

import {
    Calendar,
    Plus,
    Search,
    MoreVertical,
    Users,
    BookOpen,
    Clock,
    Filter,
    Edit2,
    Trash2,
    MessageSquare,
    ExternalLink
} from "lucide-react";
import Select from "@/components/ui/Select";
// Verified: Usage of Select component is compatible with onChange(value) signature.
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { format } from "date-fns";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

export default function BatchesPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const router = useRouter();
    const [batches, setBatches] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const { data: session } = useSession();
    const [search, setSearch] = useState("");
    const [institutes, setInstitutes] = useState([]);
    const [selectedInstitute, setSelectedInstitute] = useState("");

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingBatch, setEditingBatch] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        course: "", // Course ID
        schedule: "",
        startDate: "",
        capacity: ""
    });

    useEffect(() => {
        fetchInitialData();
        if (session?.user?.role === 'super_admin') {
            fetchInstitutes();
        }
    }, [session, selectedInstitute]);

    const fetchInstitutes = async () => {
        try {
            const res = await fetch("/api/v1/institutes");
            if (!res.ok) {
                throw new Error(`Failed to fetch institutes: ${res.status}`);
            }
            const data = await res.json();
            setInstitutes(data.institutes || []);
        } catch (error) {
            console.error("Failed to fetch institutes", error);
        }
    };
    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const instQuery = selectedInstitute ? `?instituteId=${selectedInstitute}` : "";
            const [bRes, cRes] = await Promise.all([
                fetch(`/api/v1/batches${instQuery}`),
                fetch(`/api/v1/courses${instQuery}`)
            ]);
            const [bData, cData] = await Promise.all([bRes.json(), cRes.json()]);
            // Ensure strictly array
            const batchList = Array.isArray(bData) ? bData : (Array.isArray(bData?.batches) ? bData.batches : []);
            setBatches(batchList);
            const courseList = Array.isArray(cData) ? cData : (Array.isArray(cData?.courses) ? cData.courses : []);
            setCourses(courseList);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };



    const handleDeleteBatch = async (id) => {
        if (!await confirm({ title: "Delete Batch?", message: "Are you sure you want to delete this batch?", type: "danger" })) return;
        try {
            const res = await fetch(`/api/v1/batches/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Batch deleted successfully");
                fetchInitialData();
            } else {
                toast.error("Failed to delete batch");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error deleting batch");
        }
    };

    const handleEditBatch = (batch) => {
        setEditingBatch(batch);
        setFormData({
            name: batch.name,
            course: batch.course?._id,
            capacity: batch.capacity,
            schedule: batch.schedule?.description || "",
            startDate: batch.schedule?.startDate ? new Date(batch.schedule.startDate).toISOString().split('T')[0] : ""
        });
        setIsAddModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const url = editingBatch ? `/api/v1/batches/${editingBatch._id}` : "/api/v1/batches";
        const method = editingBatch ? "PATCH" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    course: formData.course,
                    capacity: parseInt(formData.capacity, 10) || 0,
                    schedule: {
                        startDate: formData.startDate,
                        description: formData.schedule
                    }
                }),
            });

            if (res.ok) {
                setIsAddModalOpen(false);
                setEditingBatch(null);
                setFormData({ name: "", course: "", schedule: "", startDate: "", capacity: "" });
                fetchInitialData();
                toast.success(editingBatch ? "Batch updated successfully" : "Batch created successfully");
            } else {
                const error = await res.json();
                toast.error(error.error || "Operation failed");
            }
        } catch (err) {
            console.error(err);
            toast.error("Operation failed");
        }
    };

    const filteredBatches = batches.filter(batch =>
        batch.name?.toLowerCase().includes(search.toLowerCase()) ||
        batch.course?.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div />
                {session?.user?.role !== 'instructor' && (
                    <Button 
                        onClick={() => {
                            setEditingBatch(null);
                            setFormData({ name: "", course: "", schedule: "", startDate: "", capacity: 30 });
                            setIsAddModalOpen(true);
                        }} 
                        size="md" 
                        className="flex items-center gap-2 px-6 shadow-sm shadow-blue-500/10"
                    >
                        <Plus size={18} strokeWidth={2.5} />
                        <span>Create Batch</span>
                    </Button>
                )}
            </div>

            <Card className="overflow-hidden border-none shadow-premium">
                <CardHeader className="flex-col md:flex-row items-stretch md:items-center gap-4 space-y-0 bg-[#F9FAFB]/50 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-3 w-full">
                        {institutes.length > 0 && (
                            <div className="min-w-[200px]">
                                <Select
                                    value={selectedInstitute}
                                    onChange={(val) => setSelectedInstitute(val)}
                                    placeholder="All Institutes"
                                    buttonClassName="bg-white border-slate-200"
                                    options={[
                                        { label: "All Institutes", value: "" },
                                        ...institutes.map(i => ({ label: i.name, value: i._id }))
                                    ]}
                                />
                            </div>
                        )}
                        <div className="flex-1" />
                        <Badge variant="hot" className="bg-orange-50 text-orange-600 font-mono text-[10px]">
                            {filteredBatches.length} Active Batches
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12 flex justify-center"><LoadingSpinner /></div>
                    ) : filteredBatches.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-white">
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Batch Name</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Course Detail</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Schedule</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Occupancy</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredBatches.map((batch) => (
                                        <tr key={batch._id} className="group hover:bg-[#F9FAFB] transition-all duration-200">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-50/80 text-blue-600 flex items-center justify-center border border-blue-100/50 shrink-0">
                                                        <Calendar size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-[14px] leading-tight">{batch.name}</h3>
                                                        <p className="text-[12px] text-slate-400 font-medium mt-0.5">
                                                            Starts {batch.schedule?.startDate ? format(new Date(batch.schedule.startDate), "MMM d, yyyy") : "TBD"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="code">{batch.course?.code || "N/A"}</Badge>
                                                <p className="text-[11px] text-slate-500 font-bold mt-1.5 truncate max-w-[150px]">{batch.course?.name}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2 text-slate-700 text-[12px] font-bold">
                                                        <Clock size={14} className="text-slate-400" />
                                                        <span>{batch.schedule?.timing || "No time set"}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {batch.schedule?.days?.map(day => (
                                                            <span key={day} className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                                                {day.substring(0, 3)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
                                                        <div 
                                                            className={cn(
                                                                "h-full transition-all duration-500",
                                                                ((batch.activeEnrollmentCount || 0) / batch.capacity) > 0.8 ? "bg-rose-500" : "bg-emerald-500"
                                                            )}
                                                            style={{ width: `${Math.min(100, ((batch.activeEnrollmentCount || 0) / batch.capacity) * 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[11px] font-black text-slate-900">{batch.activeEnrollmentCount || 0}/{batch.capacity}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                                                    <button
                                                        onClick={() => router.push(`/admin/batches/${batch._id}`)}
                                                        className="p-2 text-slate-400 hover:text-premium-blue hover:bg-blue-50 rounded-lg transition-all"
                                                        title="View Details"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const res = await fetch("/api/v1/chat/conversations", {
                                                                    method: "POST",
                                                                    headers: { "Content-Type": "application/json" },
                                                                    body: JSON.stringify({ isBatch: true, batchId: batch._id, name: batch.name })
                                                                });
                                                                if (res.ok) {
                                                                    window.location.href = "/admin/chat";
                                                                } else {
                                                                    toast.error("Failed to start batch chat");
                                                                }
                                                            } catch (err) {
                                                                toast.error("Failed to start batch chat");
                                                            }
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                        title="Broadcast to Batch"
                                                    >
                                                        <MessageSquare size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => router.push(`/admin/attendance?batchId=${batch._id}`)}
                                                        className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                                        title="Mark Attendance"
                                                    >
                                                        <Calendar size={16} />
                                                    </button>
                                                    {session?.user?.role !== 'instructor' && (
                                                        <>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); openEditModal(batch); }}
                                                                className="p-2 text-slate-400 hover:text-premium-blue hover:bg-blue-50 rounded-lg transition-all"
                                                                title="Edit Batch"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setDeletingBatch(batch); }}
                                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                title="Delete Batch"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState
                            icon={Calendar}
                            title="No batches found"
                            description="Schedule your first batch to start enrollments."
                            actionLabel="Create Batch"
                            onAction={() => setIsAddModalOpen(true)}
                        />
                    )}
                </CardContent>
            </Card>

            <Modal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingBatch(null);
                    setFormData({ name: "", course: "", schedule: "", startDate: "", capacity: "" });
                }}
                title={editingBatch ? "Edit Batch" : "Schedule New Batch"}
            >
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">Batch Configuration</div>
                <form onSubmit={handleFormSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">Select Course</label>
                        <Select
                            value={formData.course}
                            onChange={(val) => setFormData(prev => ({ ...prev, course: val }))}
                            placeholder="-- Select a Course --"
                            options={[
                                ...courses.map(course => ({ label: `${course.name} (${course.code})`, value: course._id }))
                            ]}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            id="name"
                            label="Batch Name"
                            placeholder="e.g. Morning Batch A"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <Input
                            id="capacity"
                            label="Capacity"
                            type="number"
                            placeholder="e.g. 30"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            id="startDate"
                            label="Start Date"
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            required
                        />
                        <Input
                            id="schedule"
                            label="Schedule"
                            placeholder="e.g. Mon-Fri, 10 AM"
                            value={formData.schedule}
                            onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                            required
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => {
                            setIsAddModalOpen(false);
                            setEditingBatch(null);
                            setFormData({ name: "", course: "", schedule: "", startDate: "", capacity: "" });
                        }}>Cancel</Button>
                        <Button type="submit" className="flex-1">{editingBatch ? "Update Batch" : "Create Batch"}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
