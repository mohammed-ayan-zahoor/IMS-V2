"use client";

import { useState, useEffect, useCallback } from "react";
import { Briefcase, Plus, Trash2, Loader2, FolderOpen } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

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
            setDesignations(data.designations || []);
        } catch (error) {
            if (error.name !== 'AbortError') {
                toast.error("Failed to load designations");
            }
        } finally {
            setLoading(false);
        }
    }, [toast]);

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
                toast.error(data.error || "Failed to add designation");
            }
        } catch (error) {
            toast.error("Error adding designation");
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
                    const data = await res.json();
                    toast.error(data.error || "Failed to remove designation");
                }
            } catch (error) {
                toast.error("Error deleting designation");
            }
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Briefcase className="text-premium-blue" size={28} />
                        Designations Master
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Manage staff ranks and organizational designations.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-premium-blue hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-blue-500/20">
                    <Plus size={18} />
                    Add Designation
                </Button>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center gap-4 text-slate-400 font-medium italic">
                    <Loader2 className="animate-spin text-premium-blue" size={40} />
                    Loading designations...
                </div>
            ) : designations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                    {designations.map((des) => (
                        <Card key={des._id} className="group relative flex flex-col p-5 bg-white hover:-translate-y-1 hover:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.12)] hover:border-premium-blue/30 transition-all duration-300">
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-premium-blue group-hover:text-white transition-colors">
                                    <Briefcase size={18} />
                                </div>
                                <button
                                    onClick={() => handleDelete(des._id, des.name)}
                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Remove Designation"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <span className="font-bold text-slate-800 text-base">{des.name}</span>
                            <span className="text-xs text-slate-400 font-medium mt-1 min-h-[32px] line-clamp-2">{des.description || "No description provided"}</span>
                            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active</span>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200 mt-4">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-4">
                        <FolderOpen size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">No designations found</h2>
                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">Create ranks like Principal, Teacher, Admin Assistant to categorize your staff.</p>
                    <Button variant="outline" className="mt-6" onClick={() => setIsModalOpen(true)}>
                        Add Your First Designation
                    </Button>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setFormData({ name: "", description: "" }); }}
                title="Add New Designation"
            >
                <form onSubmit={handleAdd} className="space-y-4">
                    <Input
                        label="Designation Name"
                        placeholder="e.g. Senior Teacher, HOD, Accountant"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        autoFocus
                    />
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1">Description</label>
                        <textarea
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 outline-none transition-all duration-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 focus:bg-white placeholder:text-slate-400 text-sm resize-none"
                            rows={3}
                            placeholder="Add brief details about the role/responsibilities..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                        <Button type="button" variant="ghost" onClick={() => { setIsModalOpen(false); setFormData({ name: "", description: "" }); }}>Cancel</Button>
                        <Button type="submit" disabled={saving || !formData.name.trim()}>
                            {saving ? "Adding..." : "Add Designation"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
