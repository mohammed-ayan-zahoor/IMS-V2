"use client";

import { useState, useEffect } from "react";
import {
    Calendar,
    Plus,
    Search,
    MoreVertical,
    Users,
    BookOpen,
    Clock,
    Filter,
    Edit,
    Trash2
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { format } from "date-fns";

export default function BatchesPage() {
    const [batches, setBatches] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

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
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [bRes, cRes] = await Promise.all([
                fetch("/api/v1/batches"),
                fetch("/api/v1/courses")
            ]);
            const [bData, cData] = await Promise.all([bRes.json(), cRes.json()]);
            setBatches(bData.batches || bData || []);
            setCourses(cData.courses || cData || []);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };



    const handleDeleteBatch = async (id) => {
        if (!confirm("Are you sure you want to delete this batch?")) return;
        try {
            const res = await fetch(`/api/v1/batches/${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchInitialData();
            } else {
                alert("Failed to delete batch");
            }
        } catch (error) {
            console.error(error);
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
                    capacity: parseInt(formData.capacity),
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
            } else {
                const error = await res.json();
                alert(error.error || "Operation failed");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const filteredBatches = batches.filter(batch =>
        batch.name?.toLowerCase().includes(search.toLowerCase()) ||
        batch.course?.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Batch Scheduling</h1>
                    <p className="text-slate-400 mt-1 text-sm font-medium">Coordinate class schedules, track capacity and manage intakes.</p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-premium-blue hover:bg-premium-blue/90 shadow-md shadow-blue-500/10">
                    <Plus size={18} />
                    <span>Create Batch</span>
                </Button>
            </div>

            <Card className="transition-all border-transparent shadow-sm">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                    <div className="flex-1 max-w-md relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400/50 transition-colors group-focus-within:text-premium-blue" size={18} />
                        <input
                            type="text"
                            placeholder="Search batches by name or course..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-premium-blue/30 focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <LoadingSpinner />
                    ) : filteredBatches.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white border-y border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Batch Name</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Course</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Schedule</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Occupancy</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredBatches.map((batch) => (
                                        <tr key={batch._id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-premium-blue/10 flex items-center justify-center text-premium-blue font-bold border border-premium-blue/20">
                                                        <Calendar size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{batch.name}</p>
                                                        <p className="text-[11px] font-medium text-slate-400">
                                                            Starts {batch.schedule?.startDate ? format(new Date(batch.schedule.startDate), "MMM d, yyyy") : "TBD"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="primary" className="font-mono text-[10px] uppercase">
                                                    {batch.course?.code || "N/A"}
                                                </Badge>
                                                <p className="text-[10px] text-slate-400 font-bold mt-1 truncate max-w-[150px]">{batch.course?.name}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-600 text-xs font-bold">
                                                    <Clock size={14} className="text-slate-400" />
                                                    <span>{batch.schedule?.description || "N/A"}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-premium-blue/80 rounded-full"
                                                            style={{ width: `${Math.min(((batch.activeEnrollmentCount || 0) / batch.capacity) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-500">
                                                        {batch.activeEnrollmentCount || 0}/{batch.capacity}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEditBatch(batch)}
                                                        className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-premium-blue transition-colors"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteBatch(batch._id)}
                                                        className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
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
                        <select
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-premium-blue/50 focus:ring-4 focus:ring-premium-blue/10 text-sm text-slate-700 transition-all cursor-pointer"
                            value={formData.course}
                            onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                            required
                        >
                            <option value="">-- Select a Course --</option>
                            {courses.map(course => (
                                <option key={course._id} value={course._id}>{course.name} ({course.code})</option>
                            ))}
                        </select>
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
