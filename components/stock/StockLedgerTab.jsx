"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Download, Printer, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import * as XLSX from "xlsx";

function getTodayIST() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function shiftDate(dateStr, days) {
    const d = new Date(`${dateStr}T12:00:00.000+05:30`);
    d.setDate(d.getDate() + days);
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

function formatTime(isoStr) {
    if (!isoStr) return "—";
    try {
        return new Intl.DateTimeFormat("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata"
        }).format(new Date(isoStr));
    } catch {
        return "—";
    }
}

export default function StockLedgerTab({ locations = [], items = [] }) {
    const toast = useToast();
    const [date, setDate] = useState(getTodayIST());
    const [selectedLocation, setSelectedLocation] = useState("");
    const [selectedItem, setSelectedItem] = useState("");
    const [ledger, setLedger] = useState(null);
    const [loading, setLoading] = useState(true);

    const consumableItems = items.filter(i => i.trackingType === 'consumable');

    const fetchLedger = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (date) params.set("date", date);
            if (selectedLocation) params.set("locationId", selectedLocation);
            if (selectedItem) params.set("itemId", selectedItem);

            const res = await fetch(`/api/v1/stock/ledger?${params.toString()}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load stock ledger");
            setLedger(data.ledger);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, [date, selectedLocation, selectedItem, toast]);

    useEffect(() => {
        fetchLedger();
    }, [fetchLedger]);

    const handleExportExcel = () => {
        if (!ledger) return;

        const summaryRows = [
            ["STOCK DAY BOOK & MOVEMENT LEDGER"],
            ["Date:", ledger.date],
            ["Location Filter:", selectedLocation ? locations.find(l => String(l._id) === String(selectedLocation))?.name : "All Locations (Consolidated)"],
            ["Item Filter:", selectedItem ? items.find(i => String(i._id) === String(selectedItem))?.name : "All Consumable Items"],
            [],
            ["OPENING STOCK", ledger.openingStock],
            ["DAY INFLOW (+)", ledger.dayInflow],
            ["DAY OUTFLOW (-)", ledger.dayOutflow],
            ["CLOSING STOCK", ledger.closingStock],
            [],
            ["TIME", "TYPE", "ITEM", "SKU", "LOCATION", "PARTY / VENDOR / RECIPIENT", "REF NO", "IN", "OUT", "RUNNING BALANCE", "PERFORMED BY"]
        ];

        const dataRows = (ledger.entries || []).map(e => [
            formatTime(e.timestamp),
            e.type,
            e.item?.name || '—',
            e.item?.code || '—',
            e.location || '—',
            e.party || '—',
            e.referenceNo || '—',
            e.direction === 'IN' ? e.quantity : '',
            e.direction === 'OUT' ? e.quantity : '',
            e.runningBalance,
            e.performedBy || '—'
        ]);

        const ws = XLSX.utils.aoa_to_sheet([...summaryRows, ...dataRows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Stock Day Book");
        XLSX.writeFile(wb, `Stock_Day_Book_${ledger.date}.xlsx`);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Date & Filter Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
                        <button
                            onClick={() => setDate(d => shiftDate(d, -1))}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
                            title="Previous Day"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => setDate(getTodayIST())}
                            className="px-2.5 py-1 text-xs font-semibold hover:bg-slate-100 rounded text-slate-700"
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setDate(d => shiftDate(d, 1))}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
                            title="Next Day"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 bg-white"
                    />

                    <div className="w-48">
                        <Select
                            value={selectedLocation}
                            onChange={(val) => setSelectedLocation(val)}
                            placeholder="All Stores / Locations"
                            options={[
                                { label: "All Stores (Consolidated)", value: "" },
                                ...locations.map(l => ({ label: l.name, value: l._id }))
                            ]}
                        />
                    </div>

                    <div className="w-52">
                        <Select
                            value={selectedItem}
                            onChange={(val) => setSelectedItem(val)}
                            placeholder="All Consumable Items"
                            options={[
                                { label: "All Consumable Items", value: "" },
                                ...consumableItems.map(i => ({ label: `${i.name} (${i.code})`, value: i._id }))
                            ]}
                        />
                    </div>

                    <button
                        onClick={fetchLedger}
                        disabled={loading}
                        className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200"
                        title="Refresh"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handlePrint} className="text-xs font-medium">
                        <Printer size={15} className="mr-1.5" />
                        Print Day Book
                    </Button>
                    <Button variant="outline" onClick={handleExportExcel} className="text-xs font-medium">
                        <Download size={15} className="mr-1.5" />
                        Export Excel
                    </Button>
                </div>
            </div>

            {/* Daily Summary Bar - Flat typography */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-slate-200/80 pb-6">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Opening Stock</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                        {loading ? "..." : (ledger?.openingStock || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">At start of day</div>
                </div>
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Day Inflow (+)</div>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">
                        {loading ? "..." : `+${(ledger?.dayInflow || 0).toLocaleString()}`}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">Purchases & receipts</div>
                </div>
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Day Outflow (-)</div>
                    <div className="text-2xl font-bold text-rose-600 mt-1">
                        {loading ? "..." : `-${(ledger?.dayOutflow || 0).toLocaleString()}`}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">Issues & consumption</div>
                </div>
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Closing Stock</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                        {loading ? "..." : (ledger?.closingStock || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">At end of day</div>
                </div>
            </div>

            {/* Flat Ledger Entries Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-3 px-2">Time</th>
                            <th className="py-3 px-2">Type</th>
                            <th className="py-3 px-2">Item Details</th>
                            <th className="py-3 px-2">Store / Location</th>
                            <th className="py-3 px-2">Counterparty / Recipient</th>
                            <th className="py-3 px-2 text-right">In (+)</th>
                            <th className="py-3 px-2 text-right">Out (-)</th>
                            <th className="py-3 px-2 text-right">Balance</th>
                            <th className="py-3 px-2 text-right">Staff</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan="9" className="py-12 text-center text-slate-400">
                                    Loading stock movements...
                                </td>
                            </tr>
                        ) : !ledger?.entries || ledger.entries.length === 0 ? (
                            <tr>
                                <td colSpan="9" className="py-12 text-center text-slate-400">
                                    No stock movements recorded on this date.
                                </td>
                            </tr>
                        ) : (
                            ledger.entries.map((entry, idx) => (
                                <tr key={entry.id || idx} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="py-3 px-2 text-xs text-slate-500 font-mono">
                                        {formatTime(entry.timestamp)}
                                    </td>
                                    <td className="py-3 px-2 text-xs font-semibold">
                                        {entry.type === 'PURCHASE_IN' && <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">PURCHASE</span>}
                                        {entry.type === 'ISSUE_OUT' && <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded">ISSUE</span>}
                                        {entry.type === 'ADJUSTMENT' && <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">ADJUSTMENT</span>}
                                        {entry.type.startsWith('TRANSFER') && <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded">TRANSFER</span>}
                                    </td>
                                    <td className="py-3 px-2">
                                        <div className="font-semibold text-slate-800">{entry.item?.name}</div>
                                        <div className="text-xs text-slate-400 font-mono">{entry.item?.code}</div>
                                    </td>
                                    <td className="py-3 px-2 text-xs text-slate-600">
                                        {entry.location}
                                    </td>
                                    <td className="py-3 px-2">
                                        <div className="text-xs font-medium text-slate-700">{entry.party}</div>
                                        {entry.referenceNo && entry.referenceNo !== '—' && (
                                            <div className="text-[11px] text-slate-400 font-mono">Ref: {entry.referenceNo}</div>
                                        )}
                                    </td>
                                    <td className="py-3 px-2 text-right font-mono font-bold text-emerald-600">
                                        {entry.direction === 'IN' ? `+${entry.quantity}` : '—'}
                                    </td>
                                    <td className="py-3 px-2 text-right font-mono font-bold text-rose-600">
                                        {entry.direction === 'OUT' ? `-${entry.quantity}` : '—'}
                                    </td>
                                    <td className="py-3 px-2 text-right font-mono font-bold text-slate-900">
                                        {entry.runningBalance}
                                    </td>
                                    <td className="py-3 px-2 text-right text-xs text-slate-500">
                                        {entry.performedBy}
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
