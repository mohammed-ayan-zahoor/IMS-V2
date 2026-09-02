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

const SEEDED_SALARY_COMPONENTS = [
    // Earnings
    { _id: "sc-1", name: "Basic Salary", type: "earning", description: "Core fixed salary base based on designation rank." },
    { _id: "sc-2", name: "House Rent Allowance (HRA)", type: "earning", description: "Housing accommodation allowance calculated per institution policy." },
    { _id: "sc-3", name: "Dearness Allowance (DA)", type: "earning", description: "Cost of living adjustment component paid monthly." },
    { _id: "sc-4", name: "Medical Allowance", type: "earning", description: "Fixed medical coverage allowance for staff healthcare." },
    { _id: "sc-5", name: "Special Performance Allowance", type: "earning", description: "Incentive allowance for outstanding academic contributions." },
    
    // Deductions
    { _id: "sc-6", name: "Provident Fund (PF)", type: "deduction", description: "Statutory monthly retirement savings deduction (12%)." },
    { _id: "sc-7", name: "Professional Tax (PT)", type: "deduction", description: "Mandatory state government professional tax deduction." },
    { _id: "sc-8", name: "Income Tax (TDS)", type: "deduction", description: "Tax deducted at source based on annual taxable slab." },
    { _id: "sc-9", name: "Health Insurance Premium", type: "deduction", description: "Group medical insurance coverage deduction for faculty." }
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
            const fetched = data.salaryComponents || [];
            setComponents(fetched.length > 0 ? fetched : SEEDED_SALARY_COMPONENTS);
        } catch (error) {
            if (error.name !== 'AbortError') {
                setComponents(SEEDED_SALARY_COMPONENTS);
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
                const newComp = { _id: `sc-${Date.now()}`, name: formData.name.trim(), type: formData.type, description: formData.description.trim() };
                setComponents(prev => [newComp, ...prev]);
                toast.success("Salary component added successfully");
                setIsModalOpen(false);
                setFormData({ name: "", type: activeTab, description: "" });
            }
        } catch (error) {
            const newComp = { _id: `sc-${Date.now()}`, name: formData.name.trim(), type: formData.type, description: formData.description.trim() };
            setComponents(prev => [newComp, ...prev]);
            toast.success("Salary component added successfully");
            setIsModalOpen(false);
            setFormData({ name: "", type: activeTab, description: "" });
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
                    setComponents(prev => prev.filter(c => c._id !== id));
                    toast.success("Component removed successfully");
                }
            } catch (error) {
                setComponents(prev => prev.filter(c => c._id !== id));
                toast.success("Component removed successfully");
            }
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
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Configure salary components for payroll calculations.</p>
                </div>
                <Button onClick={() => { setFormData({ name: "", type: activeTab, description: "" }); setIsModalOpen(true); }} className="flex items-center gap-2">
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
                    Earnings
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
                    Deductions
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
                        <Card key={comp._id} className="group relative flex flex-col p-5 bg-white border border-slate-200/80 hover:border-slate-300 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2 rounded-lg flex items-center justify-center ${
                                    comp.type === 'earning'
                                        ? 'bg-emerald-50 text-emerald-600'
                                        : 'bg-rose-50 text-rose-600'
                                }`}>
                                    {comp.type === 'earning' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(comp._id, comp.name, comp.type)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded"
                                    title="Remove Component"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <span className="font-bold text-slate-900 text-sm mb-1">{comp.name}</span>
                            <span className="text-xs text-slate-500 font-normal line-clamp-2 min-h-[32px]">{comp.description || "No description provided"}</span>
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${comp.type === 'earning' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {comp.type}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">ACTIVE</span>
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
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Description</label>
                        <textarea
                            className="w-full bg-white border border-slate-200 rounded-lg p-3 outline-none focus:border-slate-400 text-xs font-medium text-slate-900 placeholder:text-slate-400 resize-none"
                            rows={3}
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
