"use client";

import { useState, useMemo } from "react";
import { Plus, Search, RotateCcw, CheckCircle2, User, MapPin } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";

export default function AssetRegisterTab({
    assets = [],
    locations = [],
    items = [],
    onOpenAssetModal,
    onOpenCheckoutModal,
    onRefresh
}) {
    const toast = useToast();
    const [search, setSearch] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [selectedLocation, setSelectedLocation] = useState("");
    const [returningId, setReturningId] = useState(null);

    const assetItems = useMemo(() => items.filter(i => i.trackingType === 'asset'), [items]);

    const filtered = useMemo(() => {
        return assets.filter(a => {
            if (selectedStatus && a.status !== selectedStatus) return false;
            if (selectedLocation && String(a.location?._id) !== String(selectedLocation)) return false;
            if (search) {
                const q = search.toLowerCase();
                const tagMatch = a.assetTag?.toLowerCase().includes(q);
                const snMatch = a.serialNumber?.toLowerCase().includes(q);
                const nameMatch = a.item?.name?.toLowerCase().includes(q);
                const holderMatch = a.checkout?.holderLabel?.toLowerCase().includes(q) ||
                    a.checkout?.holderUser?.name?.toLowerCase().includes(q);
                if (!tagMatch && !snMatch && !nameMatch && !holderMatch) return false;
            }
            return true;
        });
    }, [assets, selectedStatus, selectedLocation, search]);

    const counts = useMemo(() => {
        return {
            total: assets.length,
            available: assets.filter(a => a.status === 'available').length,
            checkedOut: assets.filter(a => ['checked_out', 'assigned'].includes(a.status)).length,
            maintenance: assets.filter(a => ['in_repair', 'lost', 'disposed'].includes(a.status)).length
        };
    }, [assets]);

    const handleReturn = async (assetId) => {
        if (!confirm("Confirm asset return to inventory?")) return;
        try {
            setReturningId(assetId);
            const res = await fetch(`/api/v1/stock/assets/${assetId}/checkout`, {
                method: "DELETE"
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to return asset");
            toast.success("Asset returned to store");
            onRefresh();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setReturningId(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Top Metric Bar - Flat & typography-focused without icon containers */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 border-b border-slate-200/80 pb-6">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Tracked Assets</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{counts.total}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Serialized equipment units</div>
                </div>
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Available in Store</div>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">{counts.available}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Ready for issue</div>
                </div>
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Checked Out / Assigned</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">{counts.checkedOut}</div>
                    <div className="text-xs text-slate-400 mt-0.5">In active custody</div>
                </div>
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Repair / Disposed</div>
                    <div className="text-2xl font-bold text-slate-600 mt-1">{counts.maintenance}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Non-operational</div>
                </div>
            </div>

            {/* Filter and Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    <div className="w-full md:w-64">
                        <Input
                            placeholder="Search tag, serial, holder..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="w-44">
                        <Select
                            value={selectedStatus}
                            onChange={(val) => setSelectedStatus(val)}
                            options={[
                                { label: "All Statuses", value: "" },
                                { label: "Available", value: "available" },
                                { label: "Checked Out", value: "checked_out" },
                                { label: "Assigned", value: "assigned" },
                                { label: "In Repair", value: "in_repair" },
                                { label: "Lost / Disposed", value: "disposed" }
                            ]}
                        />
                    </div>
                    <div className="w-48">
                        <Select
                            value={selectedLocation}
                            onChange={(val) => setSelectedLocation(val)}
                            placeholder="All Locations"
                            options={[
                                { label: "All Locations", value: "" },
                                ...locations.map(l => ({ label: l.name, value: l._id }))
                            ]}
                        />
                    </div>
                </div>

                <Button onClick={onOpenAssetModal} className="text-xs font-medium">
                    <Plus size={15} className="mr-1.5" />
                    Register Asset
                </Button>
            </div>

            {/* Flat Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-3 px-2">Asset Tag / S/N</th>
                            <th className="py-3 px-2">Item Description</th>
                            <th className="py-3 px-2">Base Location</th>
                            <th className="py-3 px-2">Current Holder / Location</th>
                            <th className="py-3 px-2 text-center">Status</th>
                            <th className="py-3 px-2 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="py-12 text-center text-slate-400">
                                    No assets found matching the criteria.
                                </td>
                            </tr>
                        ) : (
                            filtered.map(asset => {
                                const isAvailable = asset.status === 'available';
                                const isCheckedOut = ['checked_out', 'assigned'].includes(asset.status);
                                const holderText = asset.checkout?.holderUser?.name
                                    ? `${asset.checkout.holderUser.name} (${asset.checkout.holderUser.role})`
                                    : (asset.checkout?.holderLabel || '—');

                                return (
                                    <tr key={asset._id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-3 px-2 font-mono">
                                            <div className="font-bold text-slate-900">{asset.assetTag}</div>
                                            {asset.serialNumber && (
                                                <div className="text-[11px] text-slate-400">SN: {asset.serialNumber}</div>
                                            )}
                                        </td>
                                        <td className="py-3 px-2">
                                            <div className="font-semibold text-slate-800">{asset.item?.name}</div>
                                            <div className="text-xs text-slate-400">{asset.item?.code}</div>
                                        </td>
                                        <td className="py-3 px-2 text-slate-600">{asset.location?.name}</td>
                                        <td className="py-3 px-2">
                                            <div className="text-xs font-medium text-slate-700">{holderText}</div>
                                            {asset.checkout?.dueDate && (
                                                <div className="text-[11px] text-amber-600 font-medium">
                                                    Due: {new Date(asset.checkout.dueDate).toLocaleDateString("en-IN")}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                            {isAvailable && (
                                                <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                                    Available
                                                </span>
                                            )}
                                            {asset.status === 'checked_out' && (
                                                <span className="inline-flex items-center text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                                                    Checked Out
                                                </span>
                                            )}
                                            {asset.status === 'assigned' && (
                                                <span className="inline-flex items-center text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                                                    Assigned
                                                </span>
                                            )}
                                            {asset.status === 'in_repair' && (
                                                <span className="inline-flex items-center text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                                    In Repair
                                                </span>
                                            )}
                                            {['lost', 'disposed'].includes(asset.status) && (
                                                <span className="inline-flex items-center text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                                    {asset.status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-2 text-right">
                                            {isAvailable && (
                                                <button
                                                    onClick={() => onOpenCheckoutModal(asset)}
                                                    className="text-xs font-medium text-blue-600 hover:text-blue-900 px-2.5 py-1 hover:bg-blue-50 rounded"
                                                >
                                                    Check Out
                                                </button>
                                            )}
                                            {isCheckedOut && (
                                                <button
                                                    onClick={() => handleReturn(asset._id)}
                                                    disabled={returningId === asset._id}
                                                    className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1 hover:bg-slate-100 rounded inline-flex items-center gap-1"
                                                >
                                                    <RotateCcw size={12} />
                                                    {returningId === asset._id ? "Returning..." : "Check In"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
