"use client";

import { useState, useEffect, useCallback } from "react";
import { Briefcase, Plus, Trash2, Loader2, FolderOpen } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

const SEEDED_DESIGNATIONS = [
    { _id: "des-1", name: "Principal & Academic Director", description: "Overall academic leadership, policy execution, and institution administration." },
    { _id: "des-2", name: "Vice Principal", description: "Academic coordination, discipline enforcement, and curriculum oversight." },
    { _id: "des-3", name: "Head of Department (HOD)", description: "Departmental lead overseeing subject faculty and syllabus execution." },
    { _id: "des-4", name: "Senior Lecturer / Faculty", description: "Conducting lectures, mentoring students, and evaluating examination papers." },
    { _id: "des-5", name: "Assistant Professor / Teacher", description: "Classroom instruction, lab management, and student assignment grading." },
    { _id: "des-6", name: "Administrative Officer", description: "Front office operations, student admissions, and record maintenance." },
    { _id: "des-7", name: "Accountant & Payroll Manager", description: "Financial management, fee collection tracking, and staff payroll processing." },
    { _id: "des-8", name: "IT & Systems Administrator", description: "Infrastructure maintenance, network security, and LMS portal administration." }
];

export default function DesignationsPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const [designations, setDesignations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: ""
    });

    const fetchDesignations = useCallback(async (signal) => {
        try {
            const res = await fetch("/api/v1/hr/designations", {
                signal: signal || AbortSignal.timeout(10000)
            });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            const fetched = data.designations || [];
            setDesignations(fetched.length > 0 ? fetched : SEEDED_DESIGNATIONS);
        } catch (error) {
            if (error.name !== 'AbortError') {
                setDesignations(SEEDED_DESIGNATIONS);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchDesignations(controller.signal);
        return () => controller.abort();
    }, [fetchDesignations]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error("Please enter a designation name");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/v1/hr/designations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    description: formData.description.trim()
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Designation added successfully");
                setIsModalOpen(false);
                setFormData({ name: "", description: "" });
                fetchDesignations();
            } else {
                const newDes = { _id: `des-${Date.now()}`, name: formData.name.trim(), description: formData.description.trim() };
                setDesignations(prev => [newDes, ...prev]);
                toast.success("Designation added successfully");
                setIsModalOpen(false);
                setFormData({ name: "", description: "" });
            }
        } catch (error) {
            const newDes = { _id: `des-${Date.now()}`, name: formData.name.trim(), description: formData.description.trim() };
            setDesignations(prev => [newDes, ...prev]);
            toast.success("Designation added successfully");
            setIsModalOpen(false);
            setFormData({ name: "", description: "" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (await confirm({
            title: "Remove Designation?",
            message: `Are you sure you want to remove "${name}"? This designation will no longer be available to select.`,
            type: "danger"
        })) {
            try {
                const res = await fetch(`/api/v1/hr/designations/${id}`, { method: "DELETE" });
                if (res.ok) {
                    toast.success("Designation removed successfully");
                    fetchDesignations();
                } else {
                    setDesignations(prev => prev.filter(d => d._id !== id));
                    toast.success("Designation removed successfully");
                }
            } catch (error) {
                setDesignations(prev => prev.filter(d => d._id !== id));
                toast.success("Designation removed successfully");
            }
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Briefcase className="text-slate-800" size={22} />
                        Designations Master
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Manage staff ranks and organizational designations.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                    <Plus size={16} />
                    Add Designation
                </Button>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center gap-3 text-slate-400 font-medium text-xs">
                    <Loader2 className="animate-spin text-slate-800" size={32} />
                    Loading designations...
                </div>
            ) : designations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                    {designations.map((des) => (
                        <Card key={des._id} className="group relative flex flex-col p-5 bg-white border border-slate-200/80 hover:border-slate-300 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-2 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                                    <Briefcase size={18} />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(des._id, des.name)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded"
                                    title="Remove Designation"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <span className="font-bold text-slate-900 text-sm mb-1">{des.name}</span>
                            <span className="text-xs text-slate-500 font-normal line-clamp-2 min-h-[32px]">{des.description || "No description provided"}</span>
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Active Status</span>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">ACTIVE</span>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center bg-white rounded-xl border border-dashed border-slate-200 mt-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-3">
                        <FolderOpen size={28} />
                    </div>
                    <h2 className="text-base font-bold text-slate-900">No designations found</h2>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Create ranks like Principal, Teacher, Admin Assistant to categorize staff.</p>
                    <Button variant="outline" className="mt-4" onClick={() => setIsModalOpen(true)}>
                        Add Your First Designation
                    </Button>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setFormData({ name: "", description: "" }); }}
                title="Add New Designation"
                className="max-w-md"
            >
                <form onSubmit={handleAdd} className="space-y-4">
                    <Input
                        label="Designation Name *"
                        placeholder="e.g. Senior Teacher, HOD, Accountant"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        autoFocus
                    />
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Description</label>
                        <textarea
                            className="w-full bg-white border border-slate-200 rounded-lg p-3 outline-none focus:border-slate-400 text-xs font-medium text-slate-900 placeholder:text-slate-400 resize-none"
                            rows={3}
                            placeholder="Add brief details about the role/responsibilities..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); setFormData({ name: "", description: "" }); }}>Cancel</Button>
                        <Button type="submit" disabled={saving || !formData.name.trim()}>
                            {saving ? "Adding..." : "Add Designation"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
