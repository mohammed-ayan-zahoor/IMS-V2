"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, CreditCard, Route, Calendar, Tag, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import Badge from "@/components/ui/Badge";

const BILLING_CYCLES = [
    { label: "Monthly", value: "monthly" },
    { label: "Quarterly", value: "quarterly" },
    { label: "Annual", value: "annual" }
];

export default function FeePresetsTab() {
    const toast = useToast();
    const [presets, setPresets] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [form, setForm] = useState({
        name: "",
        route: "",
        billingCycle: "monthly",
        amount: "",
        description: "",
        maxCycles: ""
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [pRes, rRes] = await Promise.all([
                fetch("/api/v1/transport/fee-presets"),
                fetch("/api/v1/transport/routes")
            ]);
            const pData = await pRes.json();
            const rData = await rRes.json();
            setPresets(pData.presets || []);
            setRoutes(rData.routes || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({
            name: "",
            route: "",
            billingCycle: "monthly",
            amount: "",
            description: "",
            maxCycles: ""
        });
        setIsModalOpen(true);
    };

    const openEdit = (preset) => {
        setEditing(preset);
        setForm({
            name: preset.name,
            route: preset.route?._id || preset.route || "",
            billingCycle: preset.billingCycle,
            amount: preset.amount,
            description: preset.description || "",
            maxCycles: preset.maxCycles || ""
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const url = editing ? `/api/v1/transport/fee-presets/${editing._id}` : "/api/v1/transport/fee-presets";
            const method = editing ? "PATCH" : "POST";
            const body = { 
                ...form, 
                amount: parseFloat(form.amount), 
                maxCycles: form.maxCycles ? parseInt(form.maxCycles) : null,
                route: form.route || null 
            };
            
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                toast.success(editing ? "Preset updated" : "Preset created");
                setIsModalOpen(false);
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to save");
            }
        } catch (e) {
            toast.error("Failed to save preset");
        }
    };

    const confirmDelete = async () => {
        if (!deleting) return;
        try {
            const res = await fetch(`/api/v1/transport/fee-presets/${deleting._id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                toast.success("Preset deleted");
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to delete");
            }
        } catch (e) {
            toast.error("Failed to delete");
        } finally {
            setDeleting(null);
        }
    };

    if (loading) return <div className="p-12 flex justify-center"><LoadingSpinner /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Fee Presets</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Define standard billing rates for different routes</p>
                </div>
                <Button onClick={openCreate} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white border-none"><Plus size={18} /> Add Preset</Button>
            </div>

            {presets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {presets.map(preset => (
                        <Card key={preset._id} className="group hover:shadow-md transition-all border-slate-100">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-premium-blue/5 text-premium-blue flex items-center justify-center border border-premium-blue/10">
                                        <CreditCard size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-[14px]">{preset.name}</h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Badge variant="soft" className="text-[10px] uppercase font-bold">{preset.billingCycle}</Badge>
                                            {preset.maxCycles && (
                                                <Badge className="bg-amber-50 text-amber-600 border-amber-100 text-[10px] font-bold">
                                                    {preset.maxCycles} {preset.billingCycle === 'monthly' ? 'Months' : 'Cycles'}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(preset)} className="p-1.5 text-slate-400 hover:text-premium-blue hover:bg-premium-blue/5 rounded-lg"><Edit2 size={14} /></button>
                                    <button onClick={() => setDeleting(preset)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Tag size={14} />
                                        <span className="text-xs font-bold uppercase tracking-wider text-[10px]">Fee Amount</span>
                                    </div>
                                    <p className="text-sm font-black text-slate-900">₹{preset.amount.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Calendar size={14} />
                                        <span className="text-xs font-bold uppercase tracking-wider text-[10px]">Duration</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-700">
                                        {preset.maxCycles ? `${preset.maxCycles} ${preset.billingCycle === 'monthly' ? 'Months' : 'Cycles'}` : "Full Session"}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Route size={14} />
                                        <span className="text-xs font-bold uppercase tracking-wider text-[10px]">Linked Route</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-700 truncate max-w-[120px]">
                                        {preset.route?.name || "All Routes"}
                                    </p>
                                </div>
                            </div>

                            {preset.description && (
                                <p className="text-[11px] text-slate-400 font-medium mt-4 line-clamp-2 italic px-1">
                                    "{preset.description}"
                                </p>
                            )}
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="py-16 flex flex-col items-center text-center border-dashed border-slate-200 bg-slate-50/50">
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-300 mb-4 border border-slate-100"><CreditCard size={32} /></div>
                    <h3 className="text-lg font-bold text-slate-900">No presets yet</h3>
                    <p className="text-sm text-slate-500 max-w-xs mt-1">Create standard billing plans to simplify transport fee collection.</p>
                    <Button onClick={openCreate} variant="outline" size="sm" className="mt-4">Add First Preset</Button>
                </Card>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? "Edit Preset" : "Create Preset"} className="max-w-xl">
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-4">
                        <Input label="Preset Name" placeholder="e.g. Route 1 - 10 Months Plan" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Amount per Cycle (₹)" type="number" placeholder="e.g. 1500" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                            <Select label="Billing Cycle" value={form.billingCycle} onChange={(val) => setForm({ ...form, billingCycle: val })} options={BILLING_CYCLES} searchable={false} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input 
                                label="Billing Duration (Optional)" 
                                type="number" 
                                placeholder={form.billingCycle === 'monthly' ? "e.g. 10 (months)" : "Number of cycles"} 
                                value={form.maxCycles} 
                                onChange={(e) => setForm({ ...form, maxCycles: e.target.value })}
                                helperText="Leave empty for full academic session"
                            />
                            <Select 
                                label="Link to Route (Optional)" 
                                value={form.route} 
                                onChange={(val) => setForm({ ...form, route: val })} 
                                options={[
                                    { label: "All Routes (Generic)", value: "" }, 
                                    ...routes.map(r => ({ label: r.name, value: r._id }))
                                ]} 
                            />
                        </div>

                        <Input label="Description" placeholder="Optional notes about this billing plan..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>

                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
                        <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                        <div className="text-[11px] text-amber-700 leading-relaxed">
                            <p className="font-bold uppercase tracking-wider mb-1">Billing Tip:</p>
                            If you set the duration to 10 months, students will only be charged for the first 10 months of the academic session. This is useful for institutes that don't charge during summer vacations.
                        </div>
                    </div>
                    
                    <div className="pt-2 flex gap-3">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white border-none">{editing ? "Update Preset" : "Create Preset"}</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog 
                isOpen={!!deleting} 
                onClose={() => setDeleting(null)} 
                onConfirm={confirmDelete} 
                title="Delete Preset" 
                message={`Are you sure you want to delete "${deleting?.name}"?`} 
            />
        </div>
    );
}
