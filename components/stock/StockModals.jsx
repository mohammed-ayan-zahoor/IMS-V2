"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";

export function MovementModal({ isOpen, onClose, items = [], locations = [], vendors = [], users = [], onSuccess }) {
    const toast = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        type: "PURCHASE_IN",
        itemId: "",
        locationId: "",
        quantity: "",
        unitPrice: "",
        vendorId: "",
        referenceNo: "",
        issueTarget: "label", // 'user' | 'label'
        issuedToUser: "",
        issuedToLabel: "",
        adjustmentDirection: "IN",
        reason: "",
        notes: ""
    });

    const consumableItems = items.filter(i => i.trackingType === 'consumable');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.itemId || !form.locationId || !form.quantity) {
            toast.error("Please fill in item, location, and quantity");
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                itemId: form.itemId,
                locationId: form.locationId,
                type: form.type,
                direction: form.type === 'ADJUSTMENT' ? form.adjustmentDirection : (form.type === 'PURCHASE_IN' ? 'IN' : 'OUT'),
                quantity: Number(form.quantity),
                unitPrice: form.unitPrice ? Number(form.unitPrice) : undefined,
                vendorId: form.type === 'PURCHASE_IN' ? (form.vendorId || undefined) : undefined,
                referenceNo: form.referenceNo || undefined,
                issuedToUser: (form.type === 'ISSUE_OUT' && form.issueTarget === 'user') ? (form.issuedToUser || undefined) : undefined,
                issuedToLabel: (form.type === 'ISSUE_OUT' && form.issueTarget === 'label') ? (form.issuedToLabel || undefined) : undefined,
                reason: form.type === 'ADJUSTMENT' ? form.reason : undefined,
                notes: form.notes || undefined
            };

            const res = await fetch("/api/v1/stock/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to record movement");

            toast.success("Stock movement recorded successfully");
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Record Stock Movement">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Movement Type</label>
                    <Select
                        value={form.type}
                        onChange={(val) => setForm(f => ({ ...f, type: val }))}
                        options={[
                            { label: "Purchase In (Receive Goods)", value: "PURCHASE_IN" },
                            { label: "Issue Out (Disburse / Consume)", value: "ISSUE_OUT" },
                            { label: "Inventory Adjustment (Audit Correction)", value: "ADJUSTMENT" }
                        ]}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Select Item</label>
                        <Select
                            value={form.itemId}
                            onChange={(val) => {
                                const itm = items.find(i => String(i._id) === String(val));
                                setForm(f => ({
                                    ...f,
                                    itemId: val,
                                    locationId: f.locationId || itm?.defaultLocation?._id || ""
                                }));
                            }}
                            placeholder="-- Select Consumable Item --"
                            options={[
                                { label: "-- Select Consumable Item --", value: "" },
                                ...consumableItems.map(i => ({ label: `${i.name} (${i.code})`, value: i._id }))
                            ]}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Stock Location</label>
                        <Select
                            value={form.locationId}
                            onChange={(val) => setForm(f => ({ ...f, locationId: val }))}
                            placeholder="-- Select Store / Location --"
                            options={[
                                { label: "-- Select Store / Location --", value: "" },
                                ...locations.map(l => ({ label: l.name, value: l._id }))
                            ]}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Quantity"
                        type="number"
                        min="1"
                        step="any"
                        placeholder="e.g. 50"
                        value={form.quantity}
                        onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))}
                        required
                    />

                    {form.type === 'PURCHASE_IN' && (
                        <Input
                            label="Unit Price (Optional)"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="e.g. 15.00"
                            value={form.unitPrice}
                            onChange={(e) => setForm(f => ({ ...f, unitPrice: e.target.value }))}
                        />
                    )}

                    {form.type === 'ADJUSTMENT' && (
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Adjustment Direction</label>
                            <Select
                                value={form.adjustmentDirection}
                                onChange={(val) => setForm(f => ({ ...f, adjustmentDirection: val }))}
                                options={[
                                    { label: "Add Stock (+ IN)", value: "IN" },
                                    { label: "Deduct Stock (- OUT)", value: "OUT" }
                                ]}
                            />
                        </div>
                    )}
                </div>

                {form.type === 'PURCHASE_IN' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Vendor (Optional)</label>
                            <Select
                                value={form.vendorId}
                                onChange={(val) => setForm(f => ({ ...f, vendorId: val }))}
                                placeholder="-- Select Vendor --"
                                options={[
                                    { label: "-- Direct / Cash Purchase --", value: "" },
                                    ...vendors.map(v => ({ label: v.name, value: v._id }))
                                ]}
                            />
                        </div>
                        <Input
                            label="Bill / Invoice No"
                            placeholder="e.g. INV-9042"
                            value={form.referenceNo}
                            onChange={(e) => setForm(f => ({ ...f, referenceNo: e.target.value }))}
                        />
                    </div>
                )}

                {form.type === 'ISSUE_OUT' && (
                    <div className="space-y-3">
                        <div className="flex gap-4 text-xs font-semibold text-slate-600">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="radio"
                                    name="issueTarget"
                                    checked={form.issueTarget === 'label'}
                                    onChange={() => setForm(f => ({ ...f, issueTarget: 'label' }))}
                                />
                                Issue to Department / Room
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="radio"
                                    name="issueTarget"
                                    checked={form.issueTarget === 'user'}
                                    onChange={() => setForm(f => ({ ...f, issueTarget: 'user' }))}
                                />
                                Issue to Specific Staff / Person
                            </label>
                        </div>

                        {form.issueTarget === 'label' ? (
                            <Input
                                label="Recipient Department / Room"
                                placeholder="e.g. Chemistry Lab, Room 102, Admin Office"
                                value={form.issuedToLabel}
                                onChange={(e) => setForm(f => ({ ...f, issuedToLabel: e.target.value }))}
                                required
                            />
                        ) : (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Select Staff Member</label>
                                <Select
                                    value={form.issuedToUser}
                                    onChange={(val) => setForm(f => ({ ...f, issuedToUser: val }))}
                                    placeholder="-- Select User --"
                                    options={[
                                        { label: "-- Select User --", value: "" },
                                        ...users.map(u => ({ label: `${u.name} (${u.role})`, value: u._id }))
                                    ]}
                                />
                            </div>
                        )}
                    </div>
                )}

                {form.type === 'ADJUSTMENT' && (
                    <Input
                        label="Adjustment Reason"
                        placeholder="e.g. Physical audit recount, damaged goods written off"
                        value={form.reason}
                        onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
                        required
                    />
                )}

                <Input
                    label="Notes / Remarks"
                    placeholder="Optional details..."
                    value={form.notes}
                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                />

                <div className="flex justify-end gap-3 pt-3">
                    <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={submitting}>
                        Confirm Movement
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

export function TransferModal({ isOpen, onClose, items = [], locations = [], onSuccess }) {
    const toast = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        itemId: "",
        fromLocationId: "",
        toLocationId: "",
        quantity: "",
        referenceNumber: "",
        notes: ""
    });

    const consumableItems = items.filter(i => i.trackingType === 'consumable');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.itemId || !form.fromLocationId || !form.toLocationId || !form.quantity) {
            toast.error("Please fill in item, source, destination, and quantity");
            return;
        }

        if (form.fromLocationId === form.toLocationId) {
            toast.error("Source and destination locations cannot be identical");
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetch("/api/v1/stock/transfers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    itemId: form.itemId,
                    fromLocationId: form.fromLocationId,
                    toLocationId: form.toLocationId,
                    quantity: Number(form.quantity),
                    referenceNumber: form.referenceNumber || undefined,
                    notes: form.notes || undefined
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to record transfer");

            toast.success("Stock transferred successfully");
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Inter-Store Stock Transfer">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Select Consumable Item</label>
                    <Select
                        value={form.itemId}
                        onChange={(val) => setForm(f => ({ ...f, itemId: val }))}
                        placeholder="-- Select Item --"
                        options={[
                            { label: "-- Select Item --", value: "" },
                            ...consumableItems.map(i => ({ label: `${i.name} (${i.code})`, value: i._id }))
                        ]}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">From Location</label>
                        <Select
                            value={form.fromLocationId}
                            onChange={(val) => setForm(f => ({ ...f, fromLocationId: val }))}
                            placeholder="-- Source Store --"
                            options={[
                                { label: "-- Source Store --", value: "" },
                                ...locations.map(l => ({ label: l.name, value: l._id }))
                            ]}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">To Location</label>
                        <Select
                            value={form.toLocationId}
                            onChange={(val) => setForm(f => ({ ...f, toLocationId: val }))}
                            placeholder="-- Destination Store --"
                            options={[
                                { label: "-- Destination Store --", value: "" },
                                ...locations.map(l => ({ label: l.name, value: l._id }))
                            ]}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Transfer Quantity"
                        type="number"
                        min="1"
                        placeholder="e.g. 20"
                        value={form.quantity}
                        onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))}
                        required
                    />
                    <Input
                        label="Transfer Slip / Ref No"
                        placeholder="e.g. TR-2026-04"
                        value={form.referenceNumber}
                        onChange={(e) => setForm(f => ({ ...f, referenceNumber: e.target.value }))}
                    />
                </div>

                <Input
                    label="Notes"
                    placeholder="Optional remarks..."
                    value={form.notes}
                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                />

                <div className="flex justify-end gap-3 pt-3">
                    <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={submitting}>
                        Transfer Stock
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

export function AssetModal({ isOpen, onClose, items = [], locations = [], vendors = [], onSuccess }) {
    const toast = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [isBulk, setIsBulk] = useState(false);
    const [form, setForm] = useState({
        itemId: "",
        locationId: "",
        assetTag: "",
        serialNumber: "",
        purchaseDate: "",
        purchaseCost: "",
        vendorId: "",
        warrantyExpiry: "",
        notes: "",
        // Bulk options
        bulkPrefix: "",
        startNumber: "1",
        count: "5"
    });

    const assetItems = items.filter(i => i.trackingType === 'asset');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.itemId || !form.locationId) {
            toast.error("Please select an item and location");
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                itemId: form.itemId,
                locationId: form.locationId,
                purchaseDate: form.purchaseDate || undefined,
                purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : undefined,
                vendorId: form.vendorId || undefined,
                warrantyExpiry: form.warrantyExpiry || undefined,
                notes: form.notes || undefined,
                isBulk
            };

            if (isBulk) {
                payload.bulkPrefix = form.bulkPrefix;
                payload.startNumber = Number(form.startNumber);
                payload.count = Number(form.count);
            } else {
                if (!form.assetTag.trim()) {
                    toast.error("Asset Tag is required");
                    setSubmitting(false);
                    return;
                }
                payload.assetTag = form.assetTag.trim();
                payload.serialNumber = form.serialNumber || undefined;
            }

            const res = await fetch("/api/v1/stock/assets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to register asset");

            toast.success(isBulk ? `${data.count} assets created successfully` : "Asset registered successfully");
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Register Equipment / Asset">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-4 border-b border-slate-100 pb-3 text-xs font-semibold text-slate-600">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="radio"
                            name="assetMode"
                            checked={!isBulk}
                            onChange={() => setIsBulk(false)}
                        />
                        Single Unit Registration
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="radio"
                            name="assetMode"
                            checked={isBulk}
                            onChange={() => setIsBulk(true)}
                        />
                        Batch / Bulk Registration (e.g. 10 Laptops/Desks)
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Select Asset Item</label>
                        <Select
                            value={form.itemId}
                            onChange={(val) => {
                                const itm = items.find(i => String(i._id) === String(val));
                                setForm(f => ({
                                    ...f,
                                    itemId: val,
                                    bulkPrefix: itm ? `${itm.code}-` : "",
                                    locationId: f.locationId || itm?.defaultLocation?._id || ""
                                }));
                            }}
                            placeholder="-- Select Asset Master --"
                            options={[
                                { label: "-- Select Asset Master --", value: "" },
                                ...assetItems.map(i => ({ label: `${i.name} (${i.code})`, value: i._id }))
                            ]}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Assigned Location</label>
                        <Select
                            value={form.locationId}
                            onChange={(val) => setForm(f => ({ ...f, locationId: val }))}
                            placeholder="-- Select Location --"
                            options={[
                                { label: "-- Select Location --", value: "" },
                                ...locations.map(l => ({ label: l.name, value: l._id }))
                            ]}
                        />
                    </div>
                </div>

                {!isBulk ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Asset Tag / Barcode"
                            placeholder="e.g. AST-2026-001"
                            value={form.assetTag}
                            onChange={(e) => setForm(f => ({ ...f, assetTag: e.target.value.toUpperCase() }))}
                            required
                        />
                        <Input
                            label="Serial Number (Optional)"
                            placeholder="e.g. SN-89218274"
                            value={form.serialNumber}
                            onChange={(e) => setForm(f => ({ ...f, serialNumber: e.target.value }))}
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-3">
                        <Input
                            label="Tag Prefix"
                            placeholder="e.g. LAP-2026-"
                            value={form.bulkPrefix}
                            onChange={(e) => setForm(f => ({ ...f, bulkPrefix: e.target.value.toUpperCase() }))}
                            required
                        />
                        <Input
                            label="Start Number"
                            type="number"
                            min="1"
                            value={form.startNumber}
                            onChange={(e) => setForm(f => ({ ...f, startNumber: e.target.value }))}
                            required
                        />
                        <Input
                            label="Number of Units"
                            type="number"
                            min="1"
                            max="100"
                            value={form.count}
                            onChange={(e) => setForm(f => ({ ...f, count: e.target.value }))}
                            required
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                        label="Purchase Date"
                        type="date"
                        value={form.purchaseDate}
                        onChange={(e) => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                    />
                    <Input
                        label="Purchase Cost (₹)"
                        type="number"
                        min="0"
                        placeholder="e.g. 45000"
                        value={form.purchaseCost}
                        onChange={(e) => setForm(f => ({ ...f, purchaseCost: e.target.value }))}
                    />
                    <Input
                        label="Warranty Expiry"
                        type="date"
                        value={form.warrantyExpiry}
                        onChange={(e) => setForm(f => ({ ...f, warrantyExpiry: e.target.value }))}
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Vendor</label>
                    <Select
                        value={form.vendorId}
                        onChange={(val) => setForm(f => ({ ...f, vendorId: val }))}
                        placeholder="-- Select Vendor --"
                        options={[
                            { label: "-- None / Unknown --", value: "" },
                            ...vendors.map(v => ({ label: v.name, value: v._id }))
                        ]}
                    />
                </div>

                <Input
                    label="Notes"
                    placeholder="Specifications, condition, remarks..."
                    value={form.notes}
                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                />

                <div className="flex justify-end gap-3 pt-3">
                    <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={submitting}>
                        Register Asset
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

export function CheckoutModal({ isOpen, onClose, asset, users = [], onSuccess }) {
    const toast = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [mode, setMode] = useState("person"); // 'person' | 'room'
    const [form, setForm] = useState({
        holderUser: "",
        holderLabel: "",
        dueDate: "",
        notes: ""
    });

    if (!asset) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const payload = {
                assignmentType: mode === 'person' ? 'checked_out' : 'assigned',
                holderUser: mode === 'person' ? form.holderUser : undefined,
                holderLabel: mode === 'room' ? form.holderLabel : undefined,
                dueDate: form.dueDate || undefined,
                notes: form.notes || undefined
            };

            const res = await fetch(`/api/v1/stock/assets/${asset._id}/checkout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to check out asset");

            toast.success("Asset successfully checked out / assigned");
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Check Out Asset: ${asset.assetTag}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{asset.item?.name}</span> • Currently at <span className="font-semibold text-slate-700">{asset.location?.name}</span>
                </div>

                <div className="flex gap-4 border-b border-slate-100 pb-3 text-xs font-semibold text-slate-600">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="radio"
                            name="checkoutMode"
                            checked={mode === 'person'}
                            onChange={() => setMode('person')}
                        />
                        Check Out to Person (Staff / Instructor)
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="radio"
                            name="checkoutMode"
                            checked={mode === 'room'}
                            onChange={() => setMode('room')}
                        />
                        Assign to Room / Department
                    </label>
                </div>

                {mode === 'person' ? (
                    <>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Select Holder (Staff Member)</label>
                            <Select
                                value={form.holderUser}
                                onChange={(val) => setForm(f => ({ ...f, holderUser: val }))}
                                placeholder="-- Select Staff --"
                                options={[
                                    { label: "-- Select Staff --", value: "" },
                                    ...users.map(u => ({ label: `${u.name} (${u.role})`, value: u._id }))
                                ]}
                            />
                        </div>
                        <Input
                            label="Expected Due Date (Optional)"
                            type="date"
                            value={form.dueDate}
                            onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))}
                        />
                    </>
                ) : (
                    <Input
                        label="Department / Lab / Room"
                        placeholder="e.g. Physics Lab, Room 204, Seminar Hall"
                        value={form.holderLabel}
                        onChange={(e) => setForm(f => ({ ...f, holderLabel: e.target.value }))}
                        required
                    />
                )}

                <Input
                    label="Remarks"
                    placeholder="Reason for checkout / condition..."
                    value={form.notes}
                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                />

                <div className="flex justify-end gap-3 pt-3">
                    <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={submitting}>
                        Confirm Checkout
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
