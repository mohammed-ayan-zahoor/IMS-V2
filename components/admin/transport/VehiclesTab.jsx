"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Car, AlertTriangle, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";

const VEHICLE_TYPES = [
    { label: "Bus", value: "Bus" }, { label: "Van", value: "Van" },
    { label: "Auto", value: "Auto" }, { label: "Car", value: "Car" }, { label: "Other", value: "Other" }
];

export default function VehiclesTab() {
    const toast = useToast();
    const [vehicles, setVehicles] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [form, setForm] = useState({ registrationNumber: "", type: "Bus", capacity: "", make: "", model: "", year: "", insuranceExpiry: "", fitnessExpiry: "", route: "" });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [vRes, rRes] = await Promise.all([
                fetch("/api/v1/transport/vehicles"),
                fetch("/api/v1/transport/routes")
            ]);
            const vData = await vRes.json();
            const rData = await rRes.json();
            setVehicles(vData.vehicles || []);
            setRoutes(rData.routes || []);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ registrationNumber: "", type: "Bus", capacity: "", make: "", model: "", year: "", insuranceExpiry: "", fitnessExpiry: "", route: "" });
        setIsModalOpen(true);
    };

    const openEdit = (v) => {
        setEditing(v);
        setForm({
            registrationNumber: v.registrationNumber, type: v.type || "Bus", capacity: v.capacity,
            make: v.make || "", model: v.model || "", year: v.year || "",
            insuranceExpiry: v.insuranceExpiry ? new Date(v.insuranceExpiry).toISOString().slice(0, 10) : "",
            fitnessExpiry: v.fitnessExpiry ? new Date(v.fitnessExpiry).toISOString().slice(0, 10) : "",
            route: v.route?._id || v.route || ""
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const url = editing ? `/api/v1/transport/vehicles/${editing._id}` : "/api/v1/transport/vehicles";
            const method = editing ? "PATCH" : "POST";
            const body = { ...form, capacity: parseInt(form.capacity), year: form.year ? parseInt(form.year) : undefined, route: form.route || null };
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (res.ok) { toast.success(editing ? "Vehicle updated" : "Vehicle added"); setIsModalOpen(false); fetchData(); }
            else { const err = await res.json(); toast.error(err.error || "Failed to save"); }
        } catch (e) { toast.error("Failed to save vehicle"); }
    };

    const confirmDelete = async () => {
        if (!deleting) return;
        try {
            const res = await fetch(`/api/v1/transport/vehicles/${deleting._id}`, { method: "DELETE" });
            if (res.ok) { toast.success("Vehicle deleted"); fetchData(); }
            else { const err = await res.json(); toast.error(err.error || "Failed to delete"); }
        } catch (e) { toast.error("Failed to delete"); }
        finally { setDeleting(null); }
    };

    const isExpiringSoon = (date) => { if (!date) return false; const d = new Date(date); const now = new Date(); const diff = (d - now) / (1000 * 60 * 60 * 24); return diff < 30; };
    const isExpired = (date) => { if (!date) return false; return new Date(date) < new Date(); };

    if (loading) return <div className="p-12 flex justify-center"><LoadingSpinner /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Vehicles</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Manage your fleet and track compliance</p>
                </div>
                <Button onClick={openCreate} className="flex items-center gap-2"><Plus size={18} /> Add Vehicle</Button>
            </div>

            {vehicles.length > 0 ? (
                <div className="premium-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Registration</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Route</th>
                                <th className="text-center px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Capacity</th>
                                <th className="text-center px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Insurance</th>
                                <th className="text-center px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Fitness</th>
                                <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vehicles.map(v => (
                                <tr key={v._id} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors">
                                    <td className="px-4 py-3 font-bold text-slate-800 font-mono">{v.registrationNumber}</td>
                                    <td className="px-4 py-3 text-slate-600">{v.type}{v.make ? ` · ${v.make}` : ""}</td>
                                    <td className="px-4 py-3 text-slate-600">{v.route?.name || <span className="text-slate-300 italic">Unassigned</span>}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={cn("text-xs font-bold px-2 py-1 rounded-full", v.currentOccupancy >= v.capacity ? "bg-red-50 text-red-600" : v.currentOccupancy > v.capacity * 0.8 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600")}>
                                            {v.currentOccupancy}/{v.capacity}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {v.insuranceExpiry ? (
                                            <div className={cn("flex items-center justify-center gap-1.5 text-[11px] font-bold", isExpired(v.insuranceExpiry) ? "text-red-600" : isExpiringSoon(v.insuranceExpiry) ? "text-amber-600" : "text-emerald-600")}>
                                                {isExpired(v.insuranceExpiry) || isExpiringSoon(v.insuranceExpiry) ? (
                                                    <AlertTriangle size={12} className="shrink-0" />
                                                ) : (
                                                    <CheckCircle size={12} className="shrink-0" />
                                                )}
                                                {new Date(v.insuranceExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                            </div>
                                        ) : <span className="text-slate-300 text-xs">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {v.fitnessExpiry ? (
                                            <div className={cn("flex items-center justify-center gap-1.5 text-[11px] font-bold", isExpired(v.fitnessExpiry) ? "text-red-600" : isExpiringSoon(v.fitnessExpiry) ? "text-amber-600" : "text-emerald-600")}>
                                                {isExpired(v.fitnessExpiry) || isExpiringSoon(v.fitnessExpiry) ? (
                                                    <AlertTriangle size={12} className="shrink-0" />
                                                ) : (
                                                    <CheckCircle size={12} className="shrink-0" />
                                                )}
                                                {new Date(v.fitnessExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                            </div>
                                        ) : <span className="text-slate-300 text-xs">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => openEdit(v)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                                            <button onClick={() => setDeleting(v)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <Card className="py-16 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4"><Car size={32} /></div>
                    <h3 className="text-lg font-bold text-slate-900">No vehicles yet</h3>
                    <p className="text-sm text-slate-500 max-w-xs mt-1">Register your first vehicle to start building your fleet.</p>
                    <Button onClick={openCreate} variant="outline" size="sm" className="mt-4">Add First Vehicle</Button>
                </Card>
            )}

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? "Edit Vehicle" : "Add Vehicle"} className="max-w-xl">
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Registration Number" placeholder="e.g. KA-01-AB-1234" value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} required />
                        <Select label="Vehicle Type" value={form.type} onChange={(val) => setForm({ ...form, type: val })} options={VEHICLE_TYPES} searchable={false} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Input label="Capacity (seats)" type="number" placeholder="e.g. 40" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required />
                        <Input label="Make" placeholder="e.g. Tata" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
                        <Input label="Model" placeholder="e.g. Starbus" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Input label="Year" type="number" placeholder="e.g. 2022" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
                        <Input label="Insurance Expiry" type="date" value={form.insuranceExpiry} onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })} />
                        <Input label="Fitness Expiry" type="date" value={form.fitnessExpiry} onChange={(e) => setForm({ ...form, fitnessExpiry: e.target.value })} />
                    </div>
                    <Select label="Assigned Route" value={form.route} onChange={(val) => setForm({ ...form, route: val })} options={[{ label: "No Route", value: "" }, ...routes.map(r => ({ label: r.name, value: r._id }))]} />
                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="flex-1">{editing ? "Update Vehicle" : "Add Vehicle"}</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={confirmDelete} title="Delete Vehicle" message={`Are you sure you want to delete "${deleting?.registrationNumber}"?`} />
        </div>
    );
}
