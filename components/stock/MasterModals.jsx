"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";

export function CategoryModal({ isOpen, onClose, onSuccess }) {
    const toast = useToast();
    const [name, setName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        try {
            setSubmitting(true);
            const res = await fetch("/api/v1/stock/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create category");
            toast.success("Category created successfully");
            setName("");
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New Stock Category">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Category Name"
                    placeholder="e.g. Stationery, Laboratory Glassware, Uniforms, Mess"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <div className="flex justify-end gap-3 pt-3">
                    <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button type="submit" loading={submitting}>Save Category</Button>
                </div>
            </form>
        </Modal>
    );
}

export function LocationModal({ isOpen, onClose, users = [], onSuccess }) {
    const toast = useToast();
    const [form, setForm] = useState({ name: "", code: "", inCharge: "" });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        try {
            setSubmitting(true);
            const res = await fetch("/api/v1/stock/locations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name.trim(),
                    code: form.code?.trim() ? form.code.trim().toUpperCase() : undefined,
                    inCharge: form.inCharge || undefined
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create location");
            toast.success("Location created successfully");
            setForm({ name: "", code: "", inCharge: "" });
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New Stock Point / Location">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Location / Store Name"
                    placeholder="e.g. Main Store, Chemistry Lab Store, Library, Canteen"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Store Code (Optional)"
                        placeholder="e.g. MS-01, LAB-CHEM"
                        value={form.code}
                        onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    />
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Store In-Charge</label>
                        <Select
                            value={form.inCharge}
                            onChange={(val) => setForm(f => ({ ...f, inCharge: val }))}
                            placeholder="-- Assign Staff Member --"
                            options={[
                                { label: "-- None --", value: "" },
                                ...users.map(u => ({ label: `${u.name} (${u.role})`, value: u._id }))
                            ]}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-3">
                    <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button type="submit" loading={submitting}>Save Location</Button>
                </div>
            </form>
        </Modal>
    );
}

export function VendorModal({ isOpen, onClose, onSuccess }) {
    const toast = useToast();
    const [form, setForm] = useState({ name: "", contactPerson: "", phone: "", email: "", gstin: "", address: "" });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        try {
            setSubmitting(true);
            const res = await fetch("/api/v1/stock/vendors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create vendor");
            toast.success("Vendor created successfully");
            setForm({ name: "", contactPerson: "", phone: "", email: "", gstin: "", address: "" });
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New Supplier / Vendor">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Vendor / Business Name"
                    placeholder="e.g. Apex Scientific Supplies Pvt Ltd"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Contact Person"
                        placeholder="e.g. Ramesh Sharma"
                        value={form.contactPerson}
                        onChange={(e) => setForm(f => ({ ...f, contactPerson: e.target.value }))}
                    />
                    <Input
                        label="Phone Number"
                        placeholder="e.g. +91 98765 43210"
                        value={form.phone}
                        onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="sales@apexscientific.com"
                        value={form.email}
                        onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    />
                    <Input
                        label="GSTIN"
                        placeholder="22AAAAA0000A1Z5"
                        value={form.gstin}
                        onChange={(e) => setForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                    />
                </div>
                <Input
                    label="Address"
                    placeholder="City, State, Pincode"
                    value={form.address}
                    onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                />
                <div className="flex justify-end gap-3 pt-3">
                    <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button type="submit" loading={submitting}>Save Vendor</Button>
                </div>
            </form>
        </Modal>
    );
}

export function ItemModal({ isOpen, onClose, categories = [], locations = [], vendors = [], onSuccess }) {
    const toast = useToast();
    const [form, setForm] = useState({
        name: "",
        code: "",
        category: "",
        trackingType: "consumable",
        unit: "pcs",
        reorderLevel: "10",
        defaultLocation: "",
        defaultVendor: ""
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.code.trim() || !form.category) {
            toast.error("Please provide item name, SKU code, and category");
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetch("/api/v1/stock/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name.trim(),
                    code: form.code.trim().toUpperCase(),
                    category: form.category,
                    trackingType: form.trackingType,
                    unit: form.unit.trim() || 'pcs',
                    reorderLevel: form.trackingType === 'consumable' ? (Number(form.reorderLevel) || 0) : 0,
                    defaultLocation: form.defaultLocation || undefined,
                    defaultVendor: form.defaultVendor || undefined
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create item");
            toast.success("Item master created successfully");
            setForm({
                name: "",
                code: "",
                category: "",
                trackingType: "consumable",
                unit: "pcs",
                reorderLevel: "10",
                defaultLocation: "",
                defaultVendor: ""
            });
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New Item Master">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Item Name"
                        placeholder="e.g. Whiteboard Marker, Dell Desktop, Safety Goggles"
                        value={form.name}
                        onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                        required
                    />
                    <Input
                        label="Item Code / SKU"
                        placeholder="e.g. WBM-BLU, PC-DELL-3020"
                        value={form.code}
                        onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                        <Select
                            value={form.category}
                            onChange={(val) => setForm(f => ({ ...f, category: val }))}
                            placeholder="-- Select Category --"
                            options={[
                                { label: "-- Select Category --", value: "" },
                                ...categories.map(c => ({ label: c.name, value: c._id }))
                            ]}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Tracking Type (Immutable)</label>
                        <Select
                            value={form.trackingType}
                            onChange={(val) => setForm(f => ({ ...f, trackingType: val }))}
                            options={[
                                { label: "Consumable (Quantity In / Out)", value: "consumable" },
                                { label: "Fixed Asset (Serialized Unit & Checkout)", value: "asset" }
                            ]}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Unit of Measurement"
                        placeholder="pcs, box, kg, litre, set"
                        value={form.unit}
                        onChange={(e) => setForm(f => ({ ...f, unit: e.target.value }))}
                    />

                    {form.trackingType === 'consumable' ? (
                        <Input
                            label="Reorder Alert Level"
                            type="number"
                            min="0"
                            placeholder="Threshold for low stock warning"
                            value={form.reorderLevel}
                            onChange={(e) => setForm(f => ({ ...f, reorderLevel: e.target.value }))}
                        />
                    ) : (
                        <div className="text-xs text-slate-400 flex items-center pt-6">
                            * Reorder level does not apply to fixed assets.
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Default Location (Optional)</label>
                        <Select
                            value={form.defaultLocation}
                            onChange={(val) => setForm(f => ({ ...f, defaultLocation: val }))}
                            placeholder="-- Select Location --"
                            options={[
                                { label: "-- Select Location --", value: "" },
                                ...locations.map(l => ({ label: l.name, value: l._id }))
                            ]}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Default Vendor (Optional)</label>
                        <Select
                            value={form.defaultVendor}
                            onChange={(val) => setForm(f => ({ ...f, defaultVendor: val }))}
                            placeholder="-- Select Vendor --"
                            options={[
                                { label: "-- Select Vendor --", value: "" },
                                ...vendors.map(v => ({ label: v.name, value: v._id }))
                            ]}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                    <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button type="submit" loading={submitting}>Create Item</Button>
                </div>
            </form>
        </Modal>
    );
}
