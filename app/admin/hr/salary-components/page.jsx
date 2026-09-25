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
                setComponents([]);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchComponents(controller.signal);
        return () => controller.abort();
    }, [fetchComponents]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error("Please enter a component name");
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
                toast.error(data.error || "Failed to add salary component");
            }
        } catch (error) {
            toast.error("Network error while adding salary component");
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
                const data = await res.json();
                if (res.ok) {
                    toast.success("Component removed successfully");
                    fetchComponents();
                } else {
                    toast.error(data.error || "Failed to remove component");
                }
            } catch (error) {
                toast.error("Network error while removing component");
            }
        }
    };

    const handleToggleActive = async (id, currentStatus) => {
        try {
            const res = await fetch(`/api/v1/hr/salary-components/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !currentStatus })
            });
            if (res.ok) {
                toast.success(`Component ${!currentStatus ? 'activated' : 'deactivated'}`);
                fetchComponents();
            } else {
                toast.error("Failed to update component status");
            }
        } catch (e) {
            toast.error("Network error while toggling component");
        }
    };

    const filteredComponents = components.filter(c => c.type === activeTab);

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Coins className="text-slate-800" size={22} />
                        Earnings & Deductions Master
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Configure statutory and custom salary components, toggles, and calculation rules.</p>
                </div>
                <Button onClick={() => { setFormData({ name: "", type: activeTab, description: "", calculationType: "flat", percentageBasis: "basic", defaultValue: 0 }); setIsModalOpen(true); }} className="flex items-center gap-2">
                    <Plus size={16} />
                    Add Component
                </Button>
            </div>

            {/* TAB SELECTOR */}
            <div className="border-b border-slate-200 mb-6 flex gap-2">
                <button
                    type="button"
                    onClick={() => setActiveTab("earning")}
                    className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
                        activeTab === "earning"
                            ? "border-slate-900 text-slate-900"
                            : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                >
                    <TrendingUp size={15} className="text-emerald-600" />
                    Earnings ({components.filter(c => c.type === 'earning').length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("deduction")}
                    className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
                        activeTab === "deduction"
                            ? "border-slate-900 text-slate-900"
                            : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                >
                    <TrendingDown size={15} className="text-rose-600" />
                    Deductions & Taxes ({components.filter(c => c.type === 'deduction').length})
                </button>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center gap-3 text-slate-400 font-medium text-xs">
                    <Loader2 className="animate-spin text-slate-800" size={32} />
                    Loading components...
                </div>
            ) : filteredComponents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredComponents.map((comp) => (
                        <Card key={comp._id} className={cn(
                            "group relative flex flex-col p-5 bg-white border transition-all rounded-xl",
                            comp.isActive !== false ? "border-slate-200/90 shadow-xs" : "border-slate-200 bg-slate-50/60 opacity-60"
                        )}>
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2 rounded-lg flex items-center justify-center ${
                                    comp.type === 'earning'
                                        ? 'bg-emerald-50 text-emerald-600'
                                        : 'bg-rose-50 text-rose-600'
                                }`}>
                                    {comp.type === 'earning' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="relative inline-flex items-center cursor-pointer" title={comp.isActive !== false ? "Active across institute" : "Inactive / Skipped"}>
                                        <input
                                            type="checkbox"
                                            checked={comp.isActive !== false}
                                            onChange={() => handleToggleActive(comp._id, comp.isActive !== false)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(comp._id, comp.name, comp.type)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded"
                                        title="Remove Component"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>

                            <span className="font-bold text-slate-900 text-sm mb-1">{comp.name}</span>
                            <span className="text-xs text-slate-500 font-normal line-clamp-2 min-h-[32px]">{comp.description || "Configured salary rule"}</span>
                            
                            <div className="mt-3 py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-700">
                                <span>Rule:</span>
                                <span className="font-bold text-slate-900">
                                    {comp.calculationType === 'percentage'
                                        ? `${comp.defaultValue || 0}% of ${comp.percentageBasis || 'basic'}`
                                        : comp.defaultValue > 0 ? `₹${comp.defaultValue} Flat` : 'Variable / Custom'}
                                </span>
                            </div>

                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${comp.type === 'earning' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {comp.type}
                                </span>
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded",
                                    comp.isActive !== false ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"
                                )}>
                                    {comp.isActive !== false ? "Active" : "Disabled"}
                                </span>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center bg-white rounded-xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-3">
                        <FolderOpen size={28} />
                    </div>
                    <h2 className="text-base font-bold text-slate-900">No {activeTab}s configured</h2>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        {activeTab === 'earning'
                            ? "Configure earning heads like HRA, Dearness Allowance (DA), Medical Allowance."
                            : "Configure deduction heads like Provident Fund (PF), Professional Tax (PT), Income Tax."
                        }
                    </p>
                    <Button variant="outline" className="mt-4" onClick={() => setIsModalOpen(true)}>
                        Add Your First Component
                    </Button>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); }}
                title="Add New Salary Component"
                className="max-w-md"
            >
                <form onSubmit={handleAdd} className="space-y-4">
                    <Input
                        label="Component Name *"
                        placeholder="e.g. HRA, Provident Fund, Professional Tax"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        autoFocus
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <Select
                            label="Component Type"
                            options={typeOptions}
                            value={formData.type}
                            onChange={(val) => setFormData({ ...formData, type: val })}
                            required
                        />
                        <Select
                            label="Calculation Type"
                            options={[
                                { value: "flat", label: "Fixed / Flat (₹)" },
                                { value: "percentage", label: "Percentage (%)" }
                            ]}
                            value={formData.calculationType || "flat"}
                            onChange={(val) => setFormData({ ...formData, calculationType: val })}
                        />
                    </div>

                    {formData.calculationType === 'percentage' && (
                        <div className="grid grid-cols-2 gap-3">
                            <Select
                                label="Percentage Applied On"
                                options={[
                                    { value: "basic", label: "Basic Salary" },
                                    { value: "gross", label: "Gross Salary" }
                                ]}
                                value={formData.percentageBasis || "basic"}
                                onChange={(val) => setFormData({ ...formData, percentageBasis: val })}
                            />
                            <Input
                                label="Default Percentage (%)"
                                type="number"
                                step="0.01"
                                placeholder="e.g. 12 or 0.75"
                                value={formData.defaultValue || ""}
                                onChange={(e) => setFormData({ ...formData, defaultValue: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    )}

                    {formData.calculationType === 'flat' && (
                        <Input
                            label="Default Flat Amount (₹)"
                            type="number"
                            placeholder="e.g. 200 (or 0 for custom per staff)"
                            value={formData.defaultValue || ""}
                            onChange={(e) => setFormData({ ...formData, defaultValue: parseFloat(e.target.value) || 0 })}
                        />
                    )}

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Description</label>
                        <textarea
                            className="w-full bg-white border border-slate-200 rounded-lg p-3 outline-none focus:border-slate-400 text-xs font-medium text-slate-900 placeholder:text-slate-400 resize-none"
                            rows={2}
                            placeholder="Add brief details about the component..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); }}>Cancel</Button>
                        <Button type="submit" disabled={saving || !formData.name.trim()}>
                            {saving ? "Adding..." : "Add Component"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
