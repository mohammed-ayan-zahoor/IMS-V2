"use client";

import { useState, useEffect, useCallback } from "react";
import { Coins, Plus, Trash2, Loader2, FolderOpen, TrendingUp, TrendingDown } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

const typeOptions = [
    { value: "earning", label: "Earning" },
    { value: "deduction", label: "Deduction" }
];

export default function SalaryComponentsPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const [components, setComponents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("earning"); // 'earning' or 'deduction'
    const [formData, setFormData] = useState({
        name: "",
        type: "earning",
        description: ""
    });

    const fetchComponents = useCallback(async (signal) => {
        try {
            const res = await fetch("/api/v1/hr/salary-components", {
                signal: signal || AbortSignal.timeout(10000)
            });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            setComponents(data.salaryComponents || []);
        } catch (error) {
            if (error.name !== 'AbortError') {
                toast.error("Failed to load components");
            }
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        const controller = new AbortController();
        fetchComponents(controller.signal);
        return () => controller.abort();
    }, [fetchComponents]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error("Please enter component name");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/v1/hr/salary-components", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    type: formData.type,
                    description: formData.description.trim()
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Salary component added successfully");
                setIsModalOpen(false);
                setFormData({ name: "", type: activeTab, description: "" });
                fetchComponents();
            } else {
                toast.error(data.error || "Failed to add component");
            }
        } catch (error) {
            toast.error("Error adding component");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name, type) => {
        if (await confirm({
            title: "Remove Salary Component?",
            message: `Are you sure you want to remove the ${type} component "${name}"? It will no longer be available for salary configurations.`,
            type: "danger"
        })) {
            try {
                const res = await fetch(`/api/v1/hr/salary-components/${id}`, { method: "DELETE" });
                if (res.ok) {
                    toast.success("Component removed successfully");
                    fetchComponents();
                } else {
                    const data = await res.json();
                    toast.error(data.error || "Failed to remove component");
                }
            } catch (error) {
                toast.error("Error deleting component");
            }
        }
    };

    const filteredComponents = components.filter(c => c.type === activeTab);

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Coins className="text-premium-blue" size={28} />
                        Earnings & Deductions Master
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Configure salary components for payroll calculations.</p>
                </div>
                <Button onClick={() => { setFormData({ name: "", type: activeTab, description: "" }); setIsModalOpen(true); }} className="flex items-center gap-2 bg-premium-blue hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-blue-500/20">
                    <Plus size={18} />
                    Add Component
                </Button>
            </div>

            {/* TAB SELECTOR */}
            <div className="border-b border-slate-200 mb-6 flex gap-2">
                <button
                    onClick={() => setActiveTab("earning")}
                    className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all ${
                        activeTab === "earning"
                            ? "border-premium-blue text-premium-blue"
                            : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                >
                    <TrendingUp size={16} />
                    Earnings
                </button>
                <button
                    onClick={() => setActiveTab("deduction")}
                    className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all ${
                        activeTab === "deduction"
                            ? "border-premium-blue text-premium-blue"
                            : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                >
                    <TrendingDown size={16} />
                    Deductions
                </button>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center gap-4 text-slate-400 font-medium italic">
                    <Loader2 className="animate-spin text-premium-blue" size={40} />
                    Loading components...
                </div>
            ) : filteredComponents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredComponents.map((comp) => (
                        <Card key={comp._id} className="group relative flex flex-col p-5 bg-white hover:-translate-y-1 hover:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.12)] hover:border-premium-blue/30 transition-all duration-300">
                            <div className="flex items-start justify-between mb-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                    comp.type === 'earning'
                                        ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'
                                        : 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white'
                                }`}>
                                    {comp.type === 'earning' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                </div>
                                <button
                                    onClick={() => handleDelete(comp._id, comp.name, comp.type)}
                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Remove Component"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <span className="font-bold text-slate-800 text-base">{comp.name}</span>
                            <span className="text-xs text-slate-400 font-medium mt-1 min-h-[32px] line-clamp-2">{comp.description || "No description provided"}</span>
                            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${comp.type === 'earning' ? 'text-emerald-600' : 'text-rose-600'}`}>{comp.type}</span>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-4">
                        <FolderOpen size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">No {activeTab}s configured</h2>
                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                        {activeTab === 'earning'
                            ? "Configure earning heads like HRA, Dearness Allowance (DA), Medical Allowance."
                            : "Configure deduction heads like Provident Fund (PF), Professional Tax (PT), Income Tax."
                        }
                    </p>
                    <Button variant="outline" className="mt-6" onClick={() => setIsModalOpen(true)}>
                        Add Your First Component
                    </Button>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); }}
                title="Add New Salary Component"
            >
                <form onSubmit={handleAdd} className="space-y-4">
                    <Input
                        label="Component Name"
                        placeholder="e.g. HRA, Provident Fund, Tax Deduction"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        autoFocus
                    />
                    <Select
                        label="Component Type"
                        options={typeOptions}
                        value={formData.type}
                        onChange={(val) => setFormData({ ...formData, type: val })}
                        required
                    />
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1">Description</label>
                        <textarea
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 outline-none transition-all duration-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 focus:bg-white placeholder:text-slate-400 text-sm resize-none"
                            rows={3}
                            placeholder="Add brief details about the component..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                        <Button type="button" variant="ghost" onClick={() => { setIsModalOpen(false); }}>Cancel</Button>
                        <Button type="submit" disabled={saving || !formData.name.trim()}>
                            {saving ? "Adding..." : "Add Component"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
