"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, MapPin, Clock, Route, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";

export default function RoutesTab() {
    const toast = useToast();
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [form, setForm] = useState({ name: "", description: "", distance: "", stops: [] });
    const [newStop, setNewStop] = useState({ name: "", pickupTime: "", dropTime: "" });

    useEffect(() => { fetchRoutes(); }, []);

    const fetchRoutes = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/transport/routes");
            const data = await res.json();
            setRoutes(data.routes || []);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ name: "", description: "", distance: "", stops: [] });
        setNewStop({ name: "", pickupTime: "", dropTime: "" });
        setIsModalOpen(true);
    };

    const openEdit = (route) => {
        setEditing(route);
        setForm({ name: route.name, description: route.description || "", distance: route.distance || "", stops: route.stops || [] });
        setNewStop({ name: "", pickupTime: "", dropTime: "" });
        setIsModalOpen(true);
    };

    const addStop = () => {
        if (!newStop.name.trim()) return toast.error("Stop name is required");
        setForm(prev => ({ ...prev, stops: [...prev.stops, { ...newStop, order: prev.stops.length }] }));
        setNewStop({ name: "", pickupTime: "", dropTime: "" });
    };

    const removeStop = (idx) => {
        setForm(prev => ({ ...prev, stops: prev.stops.filter((_, i) => i !== idx) }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        let finalStops = [...form.stops];
        
        // AUTO-CAPTURE PENDING STOP: If user filled name but didn't click +
        if (newStop.name.trim()) {
            finalStops.push({ ...newStop, order: finalStops.length });
        }

        if (finalStops.length === 0) {
            return toast.error("Please add at least one stop to the route");
        }

        try {
            const url = editing ? `/api/v1/transport/routes/${editing._id}` : "/api/v1/transport/routes";
            const method = editing ? "PATCH" : "POST";
            const body = { 
                ...form, 
                stops: finalStops,
                distance: form.distance ? parseFloat(form.distance) : undefined 
            };
            
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (res.ok) {
                toast.success(editing ? "Route updated" : "Route created");
                setIsModalOpen(false);
                fetchRoutes();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to save");
            }
        } catch (e) { toast.error("Failed to save route"); }
    };

    const confirmDelete = async () => {
        if (!deleting) return;
        try {
            const res = await fetch(`/api/v1/transport/routes/${deleting._id}`, { method: "DELETE" });
            if (res.ok) { toast.success("Route deleted"); fetchRoutes(); }
            else { const err = await res.json(); toast.error(err.error || "Failed to delete"); }
        } catch (e) { toast.error("Failed to delete"); }
        finally { setDeleting(null); }
    };

    if (loading) return <div className="p-12 flex justify-center"><LoadingSpinner /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Transport Routes</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Define routes with pickup & drop stops</p>
                </div>
                <Button onClick={openCreate} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white border-none"><Plus size={18} /> Add Route</Button>
            </div>

            {routes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {routes.map(route => (
                        <Card key={route._id} className="group hover:shadow-md transition-all border-slate-100">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-premium-blue/5 text-premium-blue flex items-center justify-center border border-premium-blue/10">
                                        <Route size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-[14px]">{route.name}</h4>
                                        {route.distance && <p className="text-[11px] text-slate-400">{route.distance} km</p>}
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(route)} className="p-1.5 text-slate-400 hover:text-premium-blue hover:bg-premium-blue/5 rounded-lg"><Edit2 size={14} /></button>
                                    <button onClick={() => setDeleting(route)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                </div>
                            </div>
                            {route.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{route.description}</p>}
                            {route.stops?.length > 0 && (
                                <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-2">Stops ({route.stops.length})</p>
                                    {route.stops.sort((a, b) => a.order - b.order).map((stop, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs">
                                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                                            <span className="font-medium text-slate-700 flex-1 truncate">{stop.name}</span>
                                            {stop.pickupTime && <span className="text-[10px] text-emerald-600 font-mono bg-emerald-50 px-1.5 py-0.5 rounded">{stop.pickupTime}</span>}
                                            {stop.dropTime && <span className="text-[10px] text-blue-600 font-mono bg-blue-50 px-1.5 py-0.5 rounded">{stop.dropTime}</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {(!route.stops || route.stops.length === 0) && (
                                <p className="text-xs text-slate-300 italic mt-2">No stops defined yet</p>
                            )}
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="py-16 flex flex-col items-center text-center border-dashed border-slate-200 bg-slate-50/50">
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-300 mb-4 border border-slate-100"><Route size={32} /></div>
                    <h3 className="text-lg font-bold text-slate-900">No routes yet</h3>
                    <p className="text-sm text-slate-500 max-w-xs mt-1">Start by creating your first transport route with pickup and drop points.</p>
                    <Button onClick={openCreate} variant="outline" size="sm" className="mt-4">Add First Route</Button>
                </Card>
            )}

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? "Edit Route" : "Create Route"} className="max-w-xl">
                <form onSubmit={handleSave} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Route Name" placeholder="e.g. Route 1 - North City" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        <Input label="Distance (km)" type="number" placeholder="e.g. 15" value={form.distance} onChange={(e) => setForm({ ...form, distance: e.target.value })} />
                    </div>
                    <Input label="Description" placeholder="Brief description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

                    {/* Stops Section */}
                    <div className="space-y-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Stops ({form.stops.length})</p>
                            {newStop.name && <Badge className="bg-amber-100 text-amber-700 border-none animate-pulse">Pending Stop</Badge>}
                        </div>

                        <div className="space-y-2">
                            {form.stops.map((stop, i) => (
                                <div key={i} className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-100 shadow-sm animate-fade-in">
                                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold shrink-0">{i + 1}</span>
                                    <span className="text-sm font-bold text-slate-700 flex-1 truncate">{stop.name}</span>
                                    <div className="flex gap-2">
                                        {stop.pickupTime && (
                                            <Badge variant="code" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-100 font-mono flex items-center gap-1">
                                                <ArrowUp size={10} /> {stop.pickupTime}
                                            </Badge>
                                        )}
                                        {stop.dropTime && (
                                            <Badge variant="code" className="text-[10px] bg-blue-50 text-blue-700 border-blue-100 font-mono flex items-center gap-1">
                                                <ArrowDown size={10} /> {stop.dropTime}
                                            </Badge>
                                        )}
                                    </div>
                                    <button type="button" onClick={() => removeStop(i)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3 pt-3 border-t border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Add New Stop</p>
                            <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
                                <Input label="Stop Name" placeholder="e.g. Main Road" value={newStop.name} onChange={(e) => setNewStop({ ...newStop, name: e.target.value })} />
                                <Input label="Pickup" type="time" value={newStop.pickupTime} onChange={(e) => setNewStop({ ...newStop, pickupTime: e.target.value })} />
                                <Input label="Drop" type="time" value={newStop.dropTime} onChange={(e) => setNewStop({ ...newStop, dropTime: e.target.value })} />
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addStop} className="w-full flex items-center justify-center gap-2 border-dashed border-slate-300 hover:bg-slate-100 text-slate-600">
                                <Plus size={16} /> Add Stop to List
                            </Button>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white border-none">{editing ? "Update Route" : "Create Route"}</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={confirmDelete} title="Delete Route" message={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone.`} />
        </div>
    );
}
