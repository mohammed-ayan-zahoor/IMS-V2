"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    Building2,
    Plus,
    Edit,
    ShieldAlert,
    Trash2,
    Search,
    MoreVertical,
    CheckCircle2,
    XCircle,
    Package,
    Users
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

const item = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 }
};

export default function InstitutesPage() {
    const router = useRouter();
    const toast = useToast();
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Action State
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedInstitute, setSelectedInstitute] = useState(null);
    const [isSuspendOpen, setIsSuspendOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    useEffect(() => {
        fetchInstitutes();
    }, []);

    const fetchInstitutes = async () => {
        try {
            const controller = new AbortController();
            const res = await fetch("/api/v1/institutes", { signal: controller.signal });
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setInstitutes(data.institutes || []);
        } catch (error) {
            console.error("Failed to fetch institutes:", error);
            toast.error("Failed to load institutes");
        } finally {
            setLoading(false);
        }
    };

    const handleSuspend = async () => {
        if (!selectedInstitute) return;
        setActionLoading(true);
        try {
            const newStatus = selectedInstitute.status === 'suspended' ? 'active' : 'suspended';
            const res = await fetch(`/api/v1/institutes/${selectedInstitute._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) throw new Error("Failed to update status");

            setInstitutes(prev => prev.map(inst =>
                inst._id === selectedInstitute._id ? { ...inst, status: newStatus } : inst
            ));
            toast.success(`Institute ${newStatus === 'active' ? 'Activated' : 'Suspended'}`);
            setIsSuspendOpen(false);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setActionLoading(false);
            setSelectedInstitute(null);
        }
    };

    const handleDelete = async () => {
        if (!selectedInstitute) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/v1/institutes/${selectedInstitute._id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete institute");
            setInstitutes(prev => prev.filter(inst => inst._id !== selectedInstitute._id));
            toast.success("Institute Deleted Successfully");
            setIsDeleteOpen(false);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setActionLoading(false);
            setSelectedInstitute(null);
        }
    };

    const filteredInstitutes = institutes.filter(inst =>
        inst.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Institutes</h1>
                    <p className="text-slate-500 font-medium">Manage and audit institutional partners.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group min-w-[300px]">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
                        <input
                            type="text"
                            placeholder="Find an institute..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all shadow-sm"
                        />
                    </div>
                    <Link href="/super-admin/institutes/create">
                        <Button className="h-[46px] rounded-2xl font-black flex items-center gap-2 px-6 shadow-lg shadow-blue-600/20">
                            <Plus size={20} strokeWidth={3} />
                            Register
                        </Button>
                    </Link>
                </div>
            </header>

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="bg-white rounded-[32px] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-50 bg-slate-50/50">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Organization Name</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Auth Code</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Security Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Service Plan</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Population</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <AnimatePresence>
                                {filteredInstitutes.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center opacity-40">
                                                <Building2 size={48} className="mb-4" />
                                                <p className="font-bold text-slate-900">No matching organizations found</p>
                                                <p className="text-sm font-medium">Verify your search criteria or register a new institute.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredInstitutes.map((inst) => (
                                        <motion.tr
                                            key={inst._id}
                                            variants={item}
                                            layout
                                            className="hover:bg-slate-50/50 transition-colors group"
                                        >
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                        <Building2 size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-slate-900 leading-none mb-1">{inst.name || 'N/A'}</div>
                                                        <div className="text-[11px] font-bold text-slate-400 truncate max-w-[200px]">{inst.contactEmail || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <code className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-600 tracking-tighter border border-slate-200">
                                                    {inst.code || '----'}
                                                </code>
                                            </td>
                                            <td className="px-8 py-5">
                                                <StatusBadge status={inst.status} />
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <Package size={14} className="text-slate-400" />
                                                    <span className="text-sm font-black text-slate-700 uppercase tracking-tight">
                                                        {inst.subscription?.plan || 'Standard'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2 text-slate-500 font-bold">
                                                    <Users size={16} strokeWidth={2.5} />
                                                    <span className="text-sm">{inst.usage?.studentCount || 0}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ActionButton
                                                        icon={Edit}
                                                        onClick={() => router.push(`/super-admin/institutes/${inst._id}/edit`)}
                                                        label="Edit"
                                                    />
                                                    <ActionButton
                                                        icon={inst.status === 'suspended' ? CheckCircle2 : ShieldAlert}
                                                        onClick={() => { setSelectedInstitute(inst); setIsSuspendOpen(true); }}
                                                        label={inst.status === 'suspended' ? 'Activate' : 'Suspend'}
                                                        variant={inst.status === 'suspended' ? 'success' : 'warning'}
                                                    />
                                                    <ActionButton
                                                        icon={Trash2}
                                                        onClick={() => { setSelectedInstitute(inst); setIsDeleteOpen(true); }}
                                                        label="Delete"
                                                        variant="danger"
                                                    />
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Confirmation Dialogs Redesign */}
            <ConfirmDialog
                isOpen={isSuspendOpen}
                title={selectedInstitute?.status === 'suspended' ? "Restore Access" : "Restrict Access"}
                message={selectedInstitute?.status === 'suspended'
                    ? "Are you sure you want to reactivate this organization? All institutional services will be restored immediately."
                    : "Suspension will immediately terminate all access for this institute's staff and students. Continue?"}
                onConfirm={handleSuspend}
                onCancel={() => setIsSuspendOpen(false)}
                type={selectedInstitute?.status === 'suspended' ? "info" : "danger"}
                confirmLabel={selectedInstitute?.status === 'suspended' ? "Reactivate" : "Deactivate Now"}
            />

            <ConfirmDialog
                isOpen={isDeleteOpen}
                title="Permanent Removal"
                message="This will initiate a soft-delete protocol. The institute will be removed from directory but encrypted records will persist for legal compliance."
                onConfirm={handleDelete}
                onCancel={() => setIsDeleteOpen(false)}
                type="danger"
                confirmLabel="Confirm Deletion"
            />
        </div>
    );
}

function StatusBadge({ status }) {
    const active = status === 'active';
    return (
        <div className={cn(
            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
            active
                ? "bg-emerald-50 text-emerald-600 border-emerald-100/50"
                : "bg-red-50 text-red-600 border-red-100/50"
        )}>
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", active ? "bg-emerald-500" : "bg-red-500")} />
            {status}
        </div>
    );
}

function ActionButton({ icon: Icon, onClick, variant = 'default', label }) {
    const variants = {
        default: "text-slate-400 hover:text-blue-600 hover:bg-blue-50",
        success: "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50",
        warning: "text-slate-400 hover:text-amber-600 hover:bg-amber-50",
        danger: "text-slate-400 hover:text-red-600 hover:bg-red-50",
    };
    return (
        <button
            onClick={onClick}
            title={label}
            className={cn("p-2 rounded-xl transition-all active:scale-95", variants[variant])}
        >
            <Icon size={18} />
        </button>
    );
}

function cn(...inputs) {
    return inputs.filter(Boolean).join(" ");
}
