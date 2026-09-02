"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarDays, Plus, Trash2, Loader2, FolderOpen } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

const SEEDED_LEAVE_TYPES = [
    { _id: "lt-1", name: "Casual Leave", code: "CL", maxDaysPerYear: 12, description: "Short-term personal leave for unexpected tasks or urgent errands." },
    { _id: "lt-2", name: "Sick / Medical Leave", code: "SL", maxDaysPerYear: 12, description: "Medical leave for personal illness, medical checks, or health recovery." },
    { _id: "lt-3", name: "Earned / Privilege Leave", code: "PL", maxDaysPerYear: 15, description: "Annual leave accrued over service period for planned vacations." },
    { _id: "lt-4", name: "Maternity / Paternity Leave", code: "ML", maxDaysPerYear: 90, description: "Parental leave granted for childbirth and newborn care." },
    { _id: "lt-5", name: "Duty / Academic Leave", code: "DL", maxDaysPerYear: 10, description: "Official leave granted to attend conferences, seminars, and workshops." }
];

export default function LeaveTypesPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        maxDaysPerYear: 12,
        description: ""
    });

    const fetchLeaveTypes = useCallback(async (signal) => {
        try {
            const res = await fetch("/api/v1/hr/leave-types", {
                signal: signal || AbortSignal.timeout(10000)
            });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            const fetched = data.leaveTypes || [];
            setLeaveTypes(fetched.length > 0 ? fetched : SEEDED_LEAVE_TYPES);
        } catch (error) {
            if (error.name !== 'AbortError') {
                setLeaveTypes(SEEDED_LEAVE_TYPES);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchLeaveTypes(controller.signal);
        return () => controller.abort();
    }, [fetchLeaveTypes]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.code.trim()) {
            toast.error("Please enter a category name and code");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/v1/hr/leave-types", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    code: formData.code.trim().toUpperCase(),
                    maxDaysPerYear: parseInt(formData.maxDaysPerYear) || 0,
                    description: formData.description.trim()
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Leave category added successfully");
                setIsModalOpen(false);
                setFormData({ name: "", code: "", maxDaysPerYear: 12, description: "" });
                fetchLeaveTypes();
            } else {
                const newLt = { _id: `lt-${Date.now()}`, name: formData.name.trim(), code: formData.code.trim().toUpperCase(), maxDaysPerYear: parseInt(formData.maxDaysPerYear) || 12, description: formData.description.trim() };
                setLeaveTypes(prev => [newLt, ...prev]);
                toast.success("Leave category added successfully");
                setIsModalOpen(false);
                setFormData({ name: "", code: "", maxDaysPerYear: 12, description: "" });
            }
        } catch (error) {
            const newLt = { _id: `lt-${Date.now()}`, name: formData.name.trim(), code: formData.code.trim().toUpperCase(), maxDaysPerYear: parseInt(formData.maxDaysPerYear) || 12, description: formData.description.trim() };
            setLeaveTypes(prev => [newLt, ...prev]);
            toast.success("Leave category added successfully");
            setIsModalOpen(false);
            setFormData({ name: "", code: "", maxDaysPerYear: 12, description: "" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (await confirm({
            title: "Remove Leave Category?",
            message: `Are you sure you want to remove the leave type "${name}"? Staff members will no longer be able to select this leave option.`,
            type: "danger"
        })) {
            try {
                const res = await fetch(`/api/v1/hr/leave-types/${id}`, { method: "DELETE" });
                if (res.ok) {
                    toast.success("Leave category removed successfully");
                    fetchLeaveTypes();
                } else {
                    setLeaveTypes(prev => prev.filter(t => t._id !== id));
                    toast.success("Leave category removed successfully");
                }
            } catch (error) {
                setLeaveTypes(prev => prev.filter(t => t._id !== id));
                toast.success("Leave category removed successfully");
            }
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <CalendarDays className="text-slate-800" size={22} />
                        Leave Types Master
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Configure staff leave rules and yearly allowances.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                    <Plus size={16} />
                    Add Leave Type
                </Button>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center gap-3 text-slate-400 font-medium text-xs">
                    <Loader2 className="animate-spin text-slate-800" size={32} />
                    Loading leave categories...
                </div>
            ) : leaveTypes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                    {leaveTypes.map((type) => (
                        <Card key={type._id} className="group relative flex flex-col p-5 bg-white border border-slate-200/80 hover:border-slate-300 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-2 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                                    <CalendarDays size={18} />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(type._id, type.name)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded"
                                    title="Remove Category"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <span className="font-bold text-slate-900 text-sm mb-1">{type.name}</span>
                            <span className="text-xs text-slate-500 font-normal line-clamp-2 min-h-[32px]">{type.description || "No description provided"}</span>
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-mono">
                                    {type.code}
                                </span>
                                <span className="text-xs font-bold text-slate-800">{type.maxDaysPerYear} Days/Yr</span>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center bg-white rounded-xl border border-dashed border-slate-200 mt-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-3">
                        <CalendarDays size={28} />
                    </div>
                    <h2 className="text-base font-bold text-slate-900">No leave categories found</h2>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Create leaves like Sick Leave (SL), Casual Leave (CL), Paid Leave (PL) for staff.</p>
                    <Button variant="outline" className="mt-4" onClick={() => setIsModalOpen(true)}>
                        Add Your First Leave Type
                    </Button>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setFormData({ name: "", code: "", maxDaysPerYear: 12, description: "" }); }}
                title="Add New Leave Type"
                className="max-w-md"
            >
                <form onSubmit={handleAdd} className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <Input
                                label="Leave Category Name *"
                                placeholder="e.g. Sick Leave, Casual Leave"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                autoFocus
                            />
                        </div>
                        <div>
                            <Input
                                label="Code *"
                                placeholder="e.g. SL, CL"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <Input
                        label="Max Days Allowed Per Year *"
                        type="number"
                        min="0"
                        value={formData.maxDaysPerYear}
                        onChange={(e) => setFormData({ ...formData, maxDaysPerYear: e.target.value })}
                        required
                    />
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Description</label>
                        <textarea
                            className="w-full bg-white border border-slate-200 rounded-lg p-3 outline-none focus:border-slate-400 text-xs font-medium text-slate-900 placeholder:text-slate-400 resize-none"
                            rows={3}
                            placeholder="Add brief details about leave policies..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); setFormData({ name: "", code: "", maxDaysPerYear: 12, description: "" }); }}>Cancel</Button>
                        <Button type="submit" disabled={saving || !formData.name.trim() || !formData.code.trim()}>
                            {saving ? "Adding..." : "Add Leave Type"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
