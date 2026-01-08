"use client";

import { useState, useEffect } from "react";
import {
    History,
    Search,
    Filter,
    Download,
    User,
    Calendar,
    CreditCard,
    ArrowLeft,
    Loader2,
    FileText
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { format } from "date-fns";
import { useToast } from "@/contexts/ToastContext";

export default function CollectionsPage() {
    const toast = useToast();
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterPerson, setFilterPerson] = useState("all");

    useEffect(() => {
        fetchCollections();
    }, []);

    const fetchCollections = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/reports/collections");

            if (!res.ok) {
                throw new Error(`Failed to load collections: ${res.statusText}`);
            }

            const data = await res.json();
            setCollections(data.collections || []);
        } catch (error) {
            console.error("Fetch collections error:", error);
            toast.error(error.message || "Failed to load collection history");
        } finally {
            setLoading(false);
        }
    };

    const uniqueCollectors = ["all", ...new Set(collections.map(c => c.collectedBy))];

    const filteredData = collections.filter(c => {
        const matchesSearch =
            c.student?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
            c.student?.enrollmentNumber?.toLowerCase().includes(search.toLowerCase());
        const matchesPerson = filterPerson === "all" || c.collectedBy === filterPerson;
        return matchesSearch && matchesPerson;
    });

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <History className="text-premium-blue" size={28} />
                        Collection History
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">View who collected what and when.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchCollections}>
                        Refresh Data
                    </Button>
                </div>
            </div>

            <Card className="p-4 bg-slate-50 border-slate-100 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search student or enrollment no..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-premium-blue outline-none text-sm transition-all bg-white"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Filter size={16} className="text-slate-400" />
                    <select
                        value={filterPerson}
                        onChange={(e) => setFilterPerson(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-slate-200 focus:border-premium-blue outline-none text-sm bg-white"
                    >
                        {uniqueCollectors.map(p => (
                            <option key={p} value={p}>{p === "all" ? "All Collectors" : p}</option>
                        ))}
                    </select>
                </div>
            </Card>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-4 text-slate-400 font-medium italic">
                        <Loader2 className="animate-spin text-premium-blue" size={40} />
                        Generating ledger...
                    </div>
                ) : filteredData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Student & Batch</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Collected By</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Method</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredData.map((item) => (
                                    <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-slate-900">{format(new Date(item.paidDate), "dd MMM yyyy")}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">{format(new Date(item.paidDate), "hh:mm a")}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-slate-900">{item.student?.fullName}</p>
                                            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-tight">{item.batch?.name}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-premium-blue/10 flex items-center justify-center text-premium-blue">
                                                    <User size={12} />
                                                </div>
                                                <span className="text-sm font-bold text-slate-700">{item.collectedBy}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-lg font-black text-emerald-600">₹{item.amount.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="secondary" className="uppercase text-[9px] font-black tracking-widest">
                                                {item.method}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                onClick={() => window.open(`/admin/receipts/${item.feeId}`, '_blank')}
                                            >
                                                <FileText size={14} className="mr-1" /> Receipt
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-20 text-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <History size={32} />
                        </div>
                        <p className="font-medium italic">No collection history found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
