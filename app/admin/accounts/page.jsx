"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Trash2, UserPlus, ShieldCheck, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

export default function AccountsMasterPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const [collectors, setCollectors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        designation: ""
    });

    useEffect(() => {
        const controller = new AbortController();
        fetchCollectors(controller.signal);
        return () => controller.abort();
    }, []);

    const fetchCollectors = async (signal) => {
        try {
            const res = await fetch("/api/v1/collectors", {
                signal: signal || AbortSignal.timeout(10000)
            });
            if (!res.ok) {
                throw new Error(`HTTP error ${res.status}`);
            }
            const data = await res.json();
            if (signal?.aborted) return;
            setCollectors(data.collectors || []);
        } catch (error) {
            if (error.name === 'AbortError') return;
            toast.error("Failed to load collectors");
        } finally {
            if (signal?.aborted) return;
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch("/api/v1/collectors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Collector added successfully");
                setIsModalOpen(false);
                setFormData({ name: "", phone: "", designation: "" });
                fetchCollectors();
            } else {
                toast.error(data.error || "Failed to add collector");
            }
        } catch (error) {
            toast.error("Error adding collector");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (await confirm({
            title: "Remove Collector?",
            message: `Are you sure you want to remove ${name}? They will no longer appear in the fee collection dropdown.`,
            type: "danger"
        })) {
            try {
                const res = await fetch(`/api/v1/collectors/${id}`, { method: "DELETE" });
                if (res.ok) {
                    toast.success("Collector removed");
                    fetchCollectors();
                } else {
                    toast.error("Failed to remove collector");
                }
            } catch (error) {
                toast.error("Error deleting collector");
            }
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <ShieldCheck className="text-premium-blue" size={28} />
                        Accounts Master
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">Manage people authorized to collect fee payments.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="shadow-lg shadow-premium-blue/20">
                    <UserPlus size={18} className="mr-2" />
                    Add New Person
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 flex flex-col items-center gap-4 text-slate-400 font-medium italic">
                        <Loader2 className="animate-spin text-premium-blue" size={40} />
                        Loading authorized people...
                    </div>
                ) : collectors.length > 0 ? (
                    collectors.map((person) => (
                        <Card key={person._id} className="group hover:border-premium-blue/30 transition-all duration-300">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-premium-blue/5 group-hover:text-premium-blue group-hover:border-premium-blue/20 transition-all">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 leading-tight">{person.name}</h3>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-0.5">{person.designation || "Collector"}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(person._id, person.name)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Remove Person"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2 text-xs text-slate-500 font-medium">
                                <span className="opacity-60 italic">Contact:</span>
                                <span>{person.phone || "Not provided"}</span>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-4">
                            <Users size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">No collectors found</h2>
                        <p className="text-slate-500 mt-2 max-w-sm mx-auto">Add people here who are authorized to collect fees from students.</p>
                        <Button variant="outline" className="mt-6" onClick={() => setIsModalOpen(true)}>
                            Add Your First Collector
                        </Button>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Add New Collector"
            >
                <form onSubmit={handleAdd} className="space-y-6">
                    <div className="space-y-4">
                        <Input
                            label="Full Name"
                            placeholder="Enter person's name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Contact Number"
                                placeholder="Phone number"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                            <Input
                                label="Designation"
                                placeholder="e.g. Accountant, Partner"
                                value={formData.designation}
                                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? "Adding..." : "Add Person"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
