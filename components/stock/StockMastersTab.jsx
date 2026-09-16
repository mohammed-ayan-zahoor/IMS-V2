"use client";

import { useState } from "react";
import { Plus, Trash2, Tag, MapPin, Truck, Package } from "lucide-react";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";

export default function StockMastersTab({
    items = [],
    categories = [],
    locations = [],
    vendors = [],
    onOpenItemModal,
    onOpenCategoryModal,
    onOpenLocationModal,
    onOpenVendorModal,
    onRefresh
}) {
    const toast = useToast();
    const [subTab, setSubTab] = useState("items"); // 'items' | 'categories' | 'locations' | 'vendors'
    const [deletingId, setDeletingId] = useState(null);

    const handleDeactivate = async (type, id) => {
        if (!confirm(`Are you sure you want to deactivate this ${type}?`)) return;
        try {
            setDeletingId(id);
            const endpoint = `/api/v1/stock/${type === 'item' ? 'items' : (type === 'category' ? 'categories' : (type === 'location' ? 'locations' : 'vendors'))}/${id}`;
            const res = await fetch(endpoint, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to deactivate");
            toast.success("Deactivated successfully");
            onRefresh();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Sub-tab Navigation - Flat pill style */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
                <div className="flex items-center gap-2">
                    {[
                        { id: "items", label: "Items Master", count: items.length },
                        { id: "categories", label: "Categories", count: categories.length },
                        { id: "locations", label: "Locations / Stores", count: locations.length },
                        { id: "vendors", label: "Suppliers / Vendors", count: vendors.length }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSubTab(tab.id)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                subTab === tab.id
                                    ? "bg-slate-900 text-white"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            }`}
                        >
                            {tab.label} <span className="opacity-60 text-[11px] ml-1">({tab.count})</span>
                        </button>
                    ))}
                </div>

                <div>
                    {subTab === 'items' && (
                        <Button onClick={onOpenItemModal} className="text-xs font-medium">
                            <Plus size={15} className="mr-1.5" />
                            New Item
                        </Button>
                    )}
                    {subTab === 'categories' && (
                        <Button onClick={onOpenCategoryModal} className="text-xs font-medium">
                            <Plus size={15} className="mr-1.5" />
                            New Category
                        </Button>
                    )}
                    {subTab === 'locations' && (
                        <Button onClick={onOpenLocationModal} className="text-xs font-medium">
                            <Plus size={15} className="mr-1.5" />
                            New Location
                        </Button>
                    )}
                    {subTab === 'vendors' && (
                        <Button onClick={onOpenVendorModal} className="text-xs font-medium">
                            <Plus size={15} className="mr-1.5" />
                            New Vendor
                        </Button>
                    )}
                </div>
            </div>

            {/* Sub-tab: Items */}
            {subTab === 'items' && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <th className="py-3 px-2">Item Name / Code</th>
                                <th className="py-3 px-2">Category</th>
                                <th className="py-3 px-2">Tracking Type</th>
                                <th className="py-3 px-2">Unit</th>
                                <th className="py-3 px-2">Default Store</th>
                                <th className="py-3 px-2">Preferred Vendor</th>
                                <th className="py-3 px-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.length === 0 ? (
                                <tr><td colSpan="7" className="py-8 text-center text-slate-400">No items created yet.</td></tr>
                            ) : (
                                items.map(itm => (
                                    <tr key={itm._id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-3 px-2">
                                            <div className="font-semibold text-slate-800">{itm.name}</div>
                                            <div className="text-xs text-slate-400 font-mono">{itm.code}</div>
                                        </td>
                                        <td className="py-3 px-2 text-slate-600">{itm.category?.name || '—'}</td>
                                        <td className="py-3 px-2">
                                            <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                                itm.trackingType === 'asset'
                                                    ? 'bg-purple-50 text-purple-700'
                                                    : 'bg-blue-50 text-blue-700'
                                            }`}>
                                                {itm.trackingType === 'asset' ? 'Fixed Asset' : 'Consumable'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-slate-500 font-mono text-xs">{itm.unit || 'pcs'}</td>
                                        <td className="py-3 px-2 text-slate-600 text-xs">{itm.defaultLocation?.name || '—'}</td>
                                        <td className="py-3 px-2 text-slate-600 text-xs">{itm.defaultVendor?.name || '—'}</td>
                                        <td className="py-3 px-2 text-right">
                                            <button
                                                onClick={() => handleDeactivate('item', itm._id)}
                                                disabled={deletingId === itm._id}
                                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                                                title="Deactivate"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Sub-tab: Categories */}
            {subTab === 'categories' && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <th className="py-3 px-2">Category Name</th>
                                <th className="py-3 px-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {categories.length === 0 ? (
                                <tr><td colSpan="2" className="py-8 text-center text-slate-400">No categories created yet.</td></tr>
                            ) : (
                                categories.map(cat => (
                                    <tr key={cat._id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-3 px-2 font-semibold text-slate-800">{cat.name}</td>
                                        <td className="py-3 px-2 text-right">
                                            <button
                                                onClick={() => handleDeactivate('category', cat._id)}
                                                disabled={deletingId === cat._id}
                                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                                                title="Deactivate"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Sub-tab: Locations */}
            {subTab === 'locations' && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <th className="py-3 px-2">Store / Point Name</th>
                                <th className="py-3 px-2">Code</th>
                                <th className="py-3 px-2">In-Charge</th>
                                <th className="py-3 px-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {locations.length === 0 ? (
                                <tr><td colSpan="4" className="py-8 text-center text-slate-400">No stock locations created yet.</td></tr>
                            ) : (
                                locations.map(loc => (
                                    <tr key={loc._id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-3 px-2 font-semibold text-slate-800">{loc.name}</td>
                                        <td className="py-3 px-2 text-slate-500 font-mono text-xs">{loc.code || '—'}</td>
                                        <td className="py-3 px-2 text-slate-600 text-xs">{loc.inCharge?.name || '—'}</td>
                                        <td className="py-3 px-2 text-right">
                                            <button
                                                onClick={() => handleDeactivate('location', loc._id)}
                                                disabled={deletingId === loc._id}
                                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                                                title="Deactivate"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Sub-tab: Vendors */}
            {subTab === 'vendors' && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <th className="py-3 px-2">Vendor Name</th>
                                <th className="py-3 px-2">Contact Person</th>
                                <th className="py-3 px-2">Phone / Email</th>
                                <th className="py-3 px-2">GSTIN</th>
                                <th className="py-3 px-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {vendors.length === 0 ? (
                                <tr><td colSpan="5" className="py-8 text-center text-slate-400">No vendors registered yet.</td></tr>
                            ) : (
                                vendors.map(ven => (
                                    <tr key={ven._id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-3 px-2 font-semibold text-slate-800">{ven.name}</td>
                                        <td className="py-3 px-2 text-slate-600 text-xs">{ven.contactPerson || '—'}</td>
                                        <td className="py-3 px-2 text-slate-600 text-xs">
                                            <div>{ven.phone || '—'}</div>
                                            <div className="text-slate-400">{ven.email || ''}</div>
                                        </td>
                                        <td className="py-3 px-2 text-slate-500 font-mono text-xs">{ven.gstin || '—'}</td>
                                        <td className="py-3 px-2 text-right">
                                            <button
                                                onClick={() => handleDeactivate('vendor', ven._id)}
                                                disabled={deletingId === ven._id}
                                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                                                title="Deactivate"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
