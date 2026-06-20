"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Car, Bus, Truck, AlertTriangle, CheckCircle, MapPin, Users } from "lucide-react";
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

const getVehicleIcon = (type, size = 16) => {
    switch (type?.toLowerCase()) {
        case 'bus': return <Bus size={size} className="text-blue-500" />;
        case 'van': return <Truck size={size} className="text-amber-500" />;
        case 'car': return <Car size={size} className="text-emerald-500" />;
        case 'auto': return <Car size={size} className="text-orange-500" />;
        default: return <Car size={size} className="text-slate-400" />;
    }
};

export default function VehiclesTab() {
    const toast = useToast();
    const [vehicles, setVehicles] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [form, setForm] = useState({ 
        registrationNumber: "", type: "Bus", capacity: "", make: "", model: "", year: "", insuranceExpiry: "", fitnessExpiry: "", route: "", photo: "" 
    });

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
        setForm({ registrationNumber: "", type: "Bus", capacity: "", make: "", model: "", year: "", insuranceExpiry: "", fitnessExpiry: "", route: "", photo: "" });
        setIsModalOpen(true);
    };

    const openEdit = (v) => {
        setEditing(v);
        setForm({
            registrationNumber: v.registrationNumber, type: v.type || "Bus", capacity: v.capacity,
            make: v.make || "", model: v.model || "", year: v.year || "",
            insuranceExpiry: v.insuranceExpiry ? new Date(v.insuranceExpiry).toISOString().slice(0, 10) : "",
            fitnessExpiry: v.fitnessExpiry ? new Date(v.fitnessExpiry).toISOString().slice(0, 10) : "",
            route: v.route?._id || v.route || "", photo: v.photo || ""
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

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('fileType', 'image');
            
            const res = await fetch('/api/v1/upload', {
                method: 'POST',
                body: formData
            });
            
            if (res.ok) {
                const data = await res.json();
                setForm(prev => ({
                    ...prev,
                    photo: data.url
                }));
            } else {
                toast.error("Failed to upload image");
            }
        } catch (error) {
            toast.error("Error uploading image");
        } finally {
            setUploading(false);
        }
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {vehicles.map(v => {
                        const isRowExpired = (v.insuranceExpiry && isExpired(v.insuranceExpiry)) || (v.fitnessExpiry && isExpired(v.fitnessExpiry));
                        return (
                        <Card key={v._id} padding="p-0" className={cn("group hover:shadow-md transition-all overflow-hidden flex flex-row h-full", isRowExpired ? "!bg-red-100 !border !border-red-300" : "border border-transparent")}>
                            {/* Photo Column */}
                            <div className={cn("w-32 sm:w-40 border-r flex items-center justify-center shrink-0", isRowExpired ? "!bg-red-200 !border-red-300" : "bg-slate-50 border-slate-100")}>
                                {v.photo ? (
                                    <img src={v.photo} alt={v.registrationNumber} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-slate-300 gap-2">
                                        <Car size={32} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">No Photo</span>
                                    </div>
                                )}
                            </div>

                            {/* Details Column */}
                            <div className="flex-1 p-5 min-w-0 flex flex-col justify-center">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-base font-mono">{v.registrationNumber}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                                {getVehicleIcon(v.type, 12)}
                                                {v.type}{v.make ? ` · ${v.make}` : ""}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEdit(v)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                                        <button onClick={() => setDeleting(v)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                    </div>
                                </div>

                                <div className={cn("mt-4 grid grid-cols-2 gap-3 pt-4 border-t", isRowExpired ? "border-red-100/50" : "border-slate-50")}>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Capacity</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100">
                                                <Users size={12} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={cn("text-xs font-bold truncate", v.currentOccupancy >= v.capacity ? "text-red-600" : v.currentOccupancy > v.capacity * 0.8 ? "text-amber-600" : "text-emerald-600")}>
                                                    {v.currentOccupancy || 0} / {v.capacity}
                                                </p>
                                                <p className="text-[10px] text-slate-400 truncate">Occupied</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Route</p>
                                        {v.route ? (
                                            <div className="flex items-start gap-1.5 mt-1">
                                                <MapPin size={12} className={isRowExpired ? "text-red-300 mt-0.5 shrink-0" : "text-slate-300 mt-0.5 shrink-0"} />
                                                <p className="text-[11px] font-bold text-slate-700 line-clamp-1">{v.route.name}</p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-300 italic mt-1">Unassigned</p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center gap-4 pt-3 border-t border-slate-50/50">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">INS:</span>
                                        {v.insuranceExpiry ? (
                                            <span className={cn("text-[10px] font-bold flex items-center gap-1", isExpired(v.insuranceExpiry) ? "text-red-600" : isExpiringSoon(v.insuranceExpiry) ? "text-amber-600" : "text-emerald-600")}>
                                                {isExpired(v.insuranceExpiry) || isExpiringSoon(v.insuranceExpiry) ? <AlertTriangle size={10} /> : <CheckCircle size={10} />}
                                                {new Date(v.insuranceExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                            </span>
                                        ) : <span className="text-[10px] text-slate-300">—</span>}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">FIT:</span>
                                        {v.fitnessExpiry ? (
                                            <span className={cn("text-[10px] font-bold flex items-center gap-1", isExpired(v.fitnessExpiry) ? "text-red-600" : isExpiringSoon(v.fitnessExpiry) ? "text-amber-600" : "text-emerald-600")}>
                                                {isExpired(v.fitnessExpiry) || isExpiringSoon(v.fitnessExpiry) ? <AlertTriangle size={10} /> : <CheckCircle size={10} />}
                                                {new Date(v.fitnessExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                            </span>
                                        ) : <span className="text-[10px] text-slate-300">—</span>}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )})}
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
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? "Edit Vehicle" : "Add Vehicle"} className="max-w-3xl">
                <form onSubmit={handleSave} className="flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Column 1: Photo Upload */}
                        <div className="flex flex-col items-center justify-start gap-4 md:w-1/3 shrink-0">
                            <div className="w-40 h-40 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-200 shadow-sm overflow-hidden mt-2">
                                {form.photo ? (
                                    <img src={form.photo} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-slate-300 gap-2">
                                        <Car size={40} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">No Photo</span>
                                    </div>
                                )}
                            </div>
                            <div className="w-full">
                                <label className="block w-full">
                                    <span className="sr-only">Choose vehicle photo</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        disabled={uploading}
                                        className="block w-full text-xs text-slate-500
                                          file:mr-0 file:mb-2 file:py-1.5 file:px-3
                                          file:rounded-lg file:border-0
                                          file:text-[10px] file:font-black
                                          file:bg-premium-blue/10 file:text-premium-blue
                                          hover:file:bg-premium-blue/20
                                          cursor-pointer file:w-full file:cursor-pointer
                                        "
                                    />
                                </label>
                                {uploading && <p className="text-[10px] text-premium-blue mt-1 font-bold animate-pulse text-center">Uploading...</p>}
                            </div>
                        </div>

                        {/* Column 2: Vehicle Details */}
                        <div className="flex-1 space-y-4">
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
                        </div>
                    </div>
                    
                    <div className="pt-4 flex gap-3 border-t border-slate-100">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="flex-1" disabled={uploading}>{editing ? "Update Vehicle" : "Add Vehicle"}</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={confirmDelete} title="Delete Vehicle" message={`Are you sure you want to delete "${deleting?.registrationNumber}"?`} />
        </div>
    );
}
