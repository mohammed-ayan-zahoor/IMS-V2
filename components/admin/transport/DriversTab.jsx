"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, UserCheck, Phone, MapPin, CreditCard } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import Avatar from "@/components/shared/Avatar";

export default function DriversTab() {
    const toast = useToast();
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [form, setForm] = useState({
        name: "",
        phone: "",
        altPhone: "",
        licenseNumber: "",
        licenseExpiry: "",
        address: "",
        assignedVehicle: "",
        photo: ""
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [dRes, vRes] = await Promise.all([
                fetch("/api/v1/transport/drivers"),
                fetch("/api/v1/transport/vehicles")
            ]);
            const dData = await dRes.json();
            const vData = await vRes.json();
            setDrivers(dData.drivers || []);
            setVehicles(vData.vehicles || []);
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
            phone: "",
            altPhone: "",
            licenseNumber: "",
            licenseExpiry: "",
            address: "",
            assignedVehicle: "",
            photo: ""
        });
        setIsModalOpen(true);
    };

    const openEdit = (driver) => {
        setEditing(driver);
        setForm({
            name: driver.name,
            phone: driver.phone,
            altPhone: driver.altPhone || "",
            licenseNumber: driver.licenseNumber || "",
            licenseExpiry: driver.licenseExpiry ? new Date(driver.licenseExpiry).toISOString().slice(0, 10) : "",
            address: driver.address || "",
            assignedVehicle: driver.assignedVehicle?._id || driver.assignedVehicle || "",
            photo: driver.photo || ""
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const url = editing ? `/api/v1/transport/drivers/${editing._id}` : "/api/v1/transport/drivers";
            const method = editing ? "PATCH" : "POST";
            const body = { ...form, assignedVehicle: form.assignedVehicle || null };
            
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                toast.success(editing ? "Driver updated" : "Driver added");
                setIsModalOpen(false);
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to save");
            }
        } catch (e) {
            toast.error("Failed to save driver");
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            
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
            const res = await fetch(`/api/v1/transport/drivers/${deleting._id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                toast.success("Driver removed");
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
                    <h3 className="text-lg font-bold text-slate-900">Drivers</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Manage drivers and vehicle assignments</p>
                </div>
                <Button onClick={openCreate} className="flex items-center gap-2"><Plus size={18} /> Add Driver</Button>
            </div>

            {drivers.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {drivers.map(driver => (
                        <Card key={driver._id} className="group hover:shadow-md transition-all">
                            <div className="flex items-start gap-4">
                                <Avatar name={driver.name} src={driver.photo} size="lg" className="rounded-2xl" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-base">{driver.name}</h4>
                                            <div className="flex items-center gap-3 mt-1">
                                                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                                    <Phone size={12} className="text-slate-400" />
                                                    {driver.phone}
                                                </div>
                                                {driver.licenseNumber && (
                                                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                                        <CreditCard size={12} className="text-slate-400" />
                                                        {driver.licenseNumber}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(driver)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                                            <button onClick={() => setDeleting(driver)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Assigned Vehicle</p>
                                            {driver.assignedVehicle ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                                                        <UserCheck size={12} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-700 truncate">{driver.assignedVehicle.registrationNumber}</p>
                                                        <p className="text-[10px] text-slate-400 truncate">{driver.assignedVehicle.type}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-300 italic">Not Assigned</p>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">License Expiry</p>
                                            {driver.licenseExpiry ? (
                                                <p className={`text-xs font-bold ${new Date(driver.licenseExpiry) < new Date() ? 'text-red-500' : 'text-slate-700'}`}>
                                                    {new Date(driver.licenseExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-slate-300 italic">Not Added</p>
                                            )}
                                        </div>
                                    </div>
                                    {driver.address && (
                                        <div className="mt-3 flex items-start gap-1.5">
                                            <MapPin size={12} className="text-slate-300 mt-0.5 shrink-0" />
                                            <p className="text-[11px] text-slate-400 line-clamp-1">{driver.address}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="py-16 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4"><UserCheck size={32} /></div>
                    <h3 className="text-lg font-bold text-slate-900">No drivers yet</h3>
                    <p className="text-sm text-slate-500 max-w-xs mt-1">Register your drivers and assign them to vehicles.</p>
                    <Button onClick={openCreate} variant="outline" size="sm" className="mt-4">Add First Driver</Button>
                </Card>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? "Edit Driver" : "Add Driver"} className="max-w-3xl">
                <form onSubmit={handleSave} className="flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Column 1: Photo Upload */}
                        <div className="flex flex-col items-center justify-start gap-4 md:w-1/3 shrink-0">
                            <div className="w-40 h-40 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-200 shadow-sm overflow-hidden mt-2">
                                {form.photo ? (
                                    <img src={form.photo} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-slate-300 gap-2">
                                        <UserCheck size={40} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">No Photo</span>
                                    </div>
                                )}
                            </div>
                            <div className="w-full">
                                <label className="block w-full">
                                    <span className="sr-only">Choose profile photo</span>
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

                        {/* Column 2: Driver Details */}
                        <div className="flex-1 space-y-4">
                            <Input label="Driver Name" placeholder="e.g. John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Phone Number" placeholder="e.g. 9876543210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                                <Input label="Alt Phone Number" placeholder="e.g. 9876543210" value={form.altPhone} onChange={(e) => setForm({ ...form, altPhone: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="License Number" placeholder="e.g. DL-123456789" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} />
                                <Input label="License Expiry" type="date" value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} />
                            </div>
                            <Input label="Address" placeholder="Driver's residential address..." value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                            <Select 
                                label="Assign Vehicle" 
                                value={form.assignedVehicle} 
                                onChange={(val) => setForm({ ...form, assignedVehicle: val })} 
                                options={[
                                    { label: "No Assignment", value: "" }, 
                                    ...vehicles.map(v => ({ label: `${v.registrationNumber} (${v.type})`, value: v._id }))
                                ]} 
                            />
                        </div>
                    </div>
                    
                    <div className="pt-4 flex gap-3 border-t border-slate-100">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="flex-1" disabled={uploading}>{editing ? "Update Driver" : "Add Driver"}</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog 
                isOpen={!!deleting} 
                onClose={() => setDeleting(null)} 
                onConfirm={confirmDelete} 
                title="Remove Driver" 
                message={`Are you sure you want to remove "${deleting?.name}"?`} 
            />
        </div>
    );
}
