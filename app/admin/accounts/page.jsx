"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Trash2, UserPlus, ShieldCheck, Loader2, Building2 } from "lucide-react";
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
        accountType: "Person",
        phone: "",
        accountNumber: "",
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
                toast.success(formData.accountType === "Bank" ? "Bank account added successfully" : "Person added successfully");
                setIsModalOpen(false);
                setFormData({ name: "", accountType: "Person", phone: "", accountNumber: "", designation: "" });
                fetchCollectors();
            } else {
                toast.error(data.error || "Failed to add");
            }
        } catch (error) {
            toast.error("Error adding");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name) => {
        const message = `Are you sure you want to remove ${name}? They will no longer appear in the fee collection and expense payment dropdowns.`;
        if (await confirm({
            title: "Remove Account?",
            message,
            type: "danger"
        })) {
            try {
                const res = await fetch(`/api/v1/collectors/${id}`, { method: "DELETE" });
                if (res.ok) {
                    toast.success("Account removed");
                    fetchCollectors();
                } else {
                    toast.error("Failed to remove");
                }
            } catch (error) {
                toast.error("Error deleting");
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
                    <p className="text-sm text-slate-500 font-medium">Manage people and bank accounts for fee collection and expense payments.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="shadow-lg shadow-premium-blue/20">
                    <Plus size={18} className="mr-2" />
                    Add New Account
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 flex flex-col items-center gap-4 text-slate-400 font-medium italic">
                        <Loader2 className="animate-spin text-premium-blue" size={40} />
                        Loading accounts...
                    </div>
                ) : collectors.length > 0 ? (
                    collectors.map((person) => (
                        <Card key={person._id} className="group hover:border-premium-blue/30 transition-all duration-300">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                                        person.accountType === 'Bank' 
                                            ? 'bg-green-50 text-green-600 border-green-100 group-hover:bg-green-100 group-hover:border-green-200' 
                                            : 'bg-slate-50 text-slate-400 border-slate-100 group-hover:bg-premium-blue/5 group-hover:text-premium-blue group-hover:border-premium-blue/20'
                                    }`}>
                                        {person.accountType === 'Bank' ? <Building2 size={24} /> : <Users size={24} />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 leading-tight">{person.name}</h3>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-0.5">
                                            {person.accountType === 'Bank' ? 'Bank Account' : (person.designation || 'Person')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(person._id, person.name)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Remove Account"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2 text-xs text-slate-500 font-medium">
                                {person.accountType === 'Bank' ? (
                                    <>
                                        <span className="opacity-60 italic">A/C No:</span>
                                        <span className="font-mono">{person.accountNumber || "Not provided"}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="opacity-60 italic">Contact:</span>
                                        <span>{person.phone || "Not provided"}</span>
                                    </>
                                )}
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-4">
                            <Users size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">No accounts found</h2>
                        <p className="text-slate-500 mt-2 max-w-sm mx-auto">Add people and bank accounts here for fee collection and expense payments.</p>
                        <Button variant="outline" className="mt-6" onClick={() => setIsModalOpen(true)}>
                            Add Your First Account
                        </Button>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Add New Account"
            >
                <form onSubmit={handleAdd} className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex gap-4 p-1 bg-slate-50 rounded-lg border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, accountType: "Person", phone: "", accountNumber: "" })}
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-all ${
                                    formData.accountType === "Person" 
                                        ? "bg-white shadow-sm text-premium-blue" 
                                        : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                <Users size={16} className="inline mr-2" />
                                Person
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, accountType: "Bank", phone: "", accountNumber: "" })}
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-all ${
                                    formData.accountType === "Bank" 
                                        ? "bg-white shadow-sm text-green-600" 
                                        : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                <Building2 size={16} className="inline mr-2" />
                                Bank
                            </button>
                        </div>

                        <Input
                            label={formData.accountType === "Bank" ? "Bank Name" : "Full Name"}
                            placeholder={formData.accountType === "Bank" ? "e.g. State Bank of India" : "Enter person's name"}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />

                        {formData.accountType === "Person" ? (
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
                        ) : (
                            <Input
                                label="Account Number"
                                placeholder="Enter bank account number"
                                value={formData.accountNumber}
                                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                            />
                        )}
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? "Adding..." : formData.accountType === "Bank" ? "Add Bank Account" : "Add Person"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}