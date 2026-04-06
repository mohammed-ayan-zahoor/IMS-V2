"use client";

import { useState, useEffect } from "react";
import { Tag, Plus, Trash2, TagIcon, Loader2, FolderOpen } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

export default function ExpenseMasterPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const [expenseHeads, setExpenseHeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newHeadName, setNewHeadName] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        fetchExpenseHeads(controller.signal);
        return () => controller.abort();
    }, []);

    const fetchExpenseHeads = async (signal) => {
        try {
            const res = await fetch("/api/v1/expense-heads", {
                signal: signal || AbortSignal.timeout(10000)
            });
            if (!res.ok) {
                throw new Error(`HTTP error ${res.status}`);
            }
            const data = await res.json();
            if (signal?.aborted) return;
            setExpenseHeads(data.expenseHeads || []);
        } catch (error) {
            if (error.name === 'AbortError') return;
            toast.error("Failed to load expense categories");
        } finally {
            if (signal?.aborted) return;
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newHeadName.trim()) {
            toast.error("Please enter a category name");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/v1/expense-heads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newHeadName.trim() })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Category added successfully");
                setIsModalOpen(false);
                setNewHeadName("");
                fetchExpenseHeads();
            } else {
                toast.error(data.error || "Failed to add category");
            }
        } catch (error) {
            toast.error("Error adding category");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (await confirm({
            title: "Remove Category?",
            message: `Are you sure you want to remove "${name}"? This category will no longer appear in expense entries.`,
            type: "danger"
        })) {
            try {
                const res = await fetch(`/api/v1/expense-heads/${id}`, { method: "DELETE" });
                if (res.ok) {
                    toast.success("Category removed");
                    fetchExpenseHeads();
                } else {
                    toast.error("Failed to remove category");
                }
            } catch (error) {
                toast.error("Error deleting category");
            }
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <TagIcon className="text-premium-blue" size={28} />
                        Expense Master
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Manage expense categories for daily transactions.</p>
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center gap-4 text-slate-400 font-medium italic">
                    <Loader2 className="animate-spin text-premium-blue" size={40} />
                    Loading categories...
                </div>
            ) : expenseHeads.length > 0 ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 mt-8">
                    {expenseHeads.map((head) => (
                        <Card key={head._id} className="group relative flex flex-col p-4 bg-white hover:-translate-y-1 hover:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.12)] hover:border-premium-blue/30 transition-all duration-300 cursor-pointer">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-premium-blue group-hover:text-white transition-colors">
                                    <Tag size={18} />
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(head._id, head.name); }}
                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Remove Category"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <span className="font-bold text-slate-800 text-base">{head.name}</span>
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">Active</span>
                        </Card>
                    ))}

                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="group flex flex-col items-center justify-center p-4 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-2xl hover:border-premium-blue hover:bg-blue-50/30 hover:shadow-sm hover:-translate-y-1 transition-all duration-300 min-h-[140px]"
                    >
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-premium-blue group-hover:text-white transition-colors mb-3">
                            <Plus size={20} />
                        </div>
                        <span className="font-bold text-slate-600 text-sm group-hover:text-premium-blue transition-colors">Add Category</span>
                    </button>
                </div>
            ) : (
                <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-4">
                        <FolderOpen size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">No categories found</h2>
                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">Create expense categories like Food, Travel, Utility to organize your daily expenses.</p>
                    <Button variant="outline" className="mt-6" onClick={() => setIsModalOpen(true)}>
                        Add Your First Category
                    </Button>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setNewHeadName(""); }}
                title="Add New Category"
            >
                <form onSubmit={handleAdd} className="space-y-6">
                    <Input
                        label="Category Name"
                        placeholder="e.g. Food, Travel, Utility, Office Supplies"
                        value={newHeadName}
                        onChange={(e) => setNewHeadName(e.target.value)}
                        required
                        autoFocus
                    />
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                        <Button type="button" variant="ghost" onClick={() => { setIsModalOpen(false); setNewHeadName(""); }}>Cancel</Button>
                        <Button type="submit" disabled={saving || !newHeadName.trim()}>
                            {saving ? "Adding..." : "Add Category"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}