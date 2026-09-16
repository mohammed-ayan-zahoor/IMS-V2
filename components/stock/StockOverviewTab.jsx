"use client";

import { useState, useMemo } from "react";
import { Search, Plus, ArrowUpRight, ArrowDownRight, ArrowRightLeft, AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

export default function StockOverviewTab({
    consumableItems = [],
    categories = [],
    locations = [],
    onOpenMovement,
    onOpenTransfer
}) {
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [lowStockOnly, setLowStockOnly] = useState(false);

    const filtered = useMemo(() => {
        return consumableItems.filter(item => {
            if (lowStockOnly && !item.isLowStock) return false;
            if (selectedCategory && item.category !== selectedCategory) return false;
            if (search) {
                const q = search.toLowerCase();
                const matchName = item.name.toLowerCase().includes(q);
                const matchCode = item.code.toLowerCase().includes(q);
                if (!matchName && !matchCode) return false;
            }
            return true;
        });
    }, [consumableItems, selectedCategory, lowStockOnly, search]);

    const totalStockQty = useMemo(() => {
        return consumableItems.reduce((acc, i) => acc + (i.currentStock || 0), 0);
    }, [consumableItems]);

    const lowStockCount = useMemo(() => {
        return consumableItems.filter(i => i.isLowStock).length;
    }, [consumableItems]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Top Metric Bar - Flat & typography-focused without icon containers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-200/80 pb-6">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Consumable SKUs</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{consumableItems.length}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Active tracked items</div>
                </div>
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Units in Stock</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{totalStockQty.toLocaleString()}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Across all stores</div>
                </div>
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Low Stock Alerts</div>
                    <div className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                        {lowStockCount}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">Items at or below reorder level</div>
                </div>
            </div>

            {/* Filter and Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    <div className="w-full md:w-64">
                        <Input
                            placeholder="Search by item name or SKU..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="w-48">
                        <Select
                            value={selectedCategory}
                            onChange={(val) => setSelectedCategory(val)}
                            placeholder="All Categories"
                            options={[
                                { label: "All Categories", value: "" },
                                ...categories.map(c => ({ label: c.name, value: c.name }))
                            ]}
                        />
                    </div>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={lowStockOnly}
                            onChange={(e) => setLowStockOnly(e.target.checked)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        Low stock only
                    </label>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenMovement('ISSUE_OUT')}
                        className="text-xs font-medium"
                    >
                        <ArrowDownRight size={15} className="mr-1.5 text-rose-500" />
                        Issue Out
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => onOpenTransfer()}
                        className="text-xs font-medium"
                    >
                        <ArrowRightLeft size={15} className="mr-1.5 text-blue-500" />
                        Transfer
                    </Button>
                    <Button
                        onClick={() => onOpenMovement('PURCHASE_IN')}
                        className="text-xs font-medium"
                    >
                        <Plus size={15} className="mr-1.5" />
                        Receive Stock
                    </Button>
                </div>
            </div>

            {/* Flat Table - No heavy container wrap */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-3 px-2">Item Name / Code</th>
                            <th className="py-3 px-2">Category</th>
                            <th className="py-3 px-2">Default Store</th>
                            <th className="py-3 px-2 text-right">Reorder Level</th>
                            <th className="py-3 px-2 text-right">Current Stock</th>
                            <th className="py-3 px-2 text-center">Status</th>
                            <th className="py-3 px-2 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="py-12 text-center text-slate-400">
                                    No consumable items found matching the selected filters.
                                </td>
                            </tr>
                        ) : (
                            filtered.map(item => (
                                <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="py-3 px-2">
                                        <div className="font-semibold text-slate-800">{item.name}</div>
                                        <div className="text-xs text-slate-400 font-mono">{item.code}</div>
                                    </td>
                                    <td className="py-3 px-2 text-slate-600">{item.category}</td>
                                    <td className="py-3 px-2 text-slate-600">{item.defaultLocation}</td>
                                    <td className="py-3 px-2 text-right text-slate-500 font-mono">
                                        {item.reorderLevel > 0 ? `${item.reorderLevel} ${item.unit}` : '—'}
                                    </td>
                                    <td className="py-3 px-2 text-right font-bold text-slate-900 font-mono">
                                        {item.currentStock} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                                    </td>
                                    <td className="py-3 px-2 text-center">
                                        {item.isLowStock ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                                <AlertTriangle size={12} />
                                                Low Stock
                                            </span>
                                        ) : item.currentStock === 0 ? (
                                            <span className="inline-flex items-center text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                                                Out of Stock
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                                Adequate
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-2 text-right">
                                        <div className="inline-flex items-center gap-1.5">
                                            <button
                                                onClick={() => onOpenMovement('PURCHASE_IN', item._id)}
                                                className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1 hover:bg-slate-100 rounded"
                                                title="Receive Stock"
                                            >
                                                + In
                                            </button>
                                            <button
                                                onClick={() => onOpenMovement('ISSUE_OUT', item._id)}
                                                className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1 hover:bg-slate-100 rounded"
                                                title="Issue Stock"
                                            >
                                                - Out
                                            </button>
                                            <button
                                                onClick={() => onOpenTransfer(item._id)}
                                                className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1 hover:bg-slate-100 rounded"
                                                title="Transfer Stock"
                                            >
                                                Transfer
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
