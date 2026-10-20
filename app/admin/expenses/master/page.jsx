"use client";

import { useState, useEffect, useCallback } from "react";
import { Tag, Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

const EXPENSE_SUGGESTIONS = ["Office Supplies", "Utilities", "Maintenance", "Travel", "Food", "Events", "Repairs", "Software"];
const PREVIEW_CHIPS = ["Office Supplies", "Utilities", "Maintenance"];

export default function ExpenseMasterPage() {
    const router = useRouter();
    const toast = useToast();
    const confirm = useConfirm();
    const [expenseHeads, setExpenseHeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [addingHead, setAddingHead] = useState(null);
    const [newHeadName, setNewHeadName] = useState("");

    const fetchExpenseHeads = useCallback(async (signal) => {
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
            if (error.name === "AbortError") return;
            toast.error("Failed to load expense categories");
        } finally {
            if (signal?.aborted) return;
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        const controller = new AbortController();
        fetchExpenseHeads(controller.signal);
        return () => controller.abort();
    }, [fetchExpenseHeads]);

    const remainingSuggestions = EXPENSE_SUGGESTIONS.filter(
        (s) => !expenseHeads.some((h) => h.name?.toLowerCase().trim() === s.toLowerCase().trim())
    );

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
            console.error("Error adding category:", error);
            toast.error("Error adding category");
        } finally {
            setSaving(false);
        }
    };

    const handleQuickAdd = async (categoryName) => {
        if (addingHead) return;
        setAddingHead(categoryName);
        try {
            const res = await fetch("/api/v1/expense-heads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: categoryName })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`Category "${categoryName}" added`);
                fetchExpenseHeads();
            } else {
                toast.error(data.error || "Failed to add category");
            }
        } catch (error) {
            console.error("Error creating category:", error);
            toast.error("Error creating category");
        } finally {
            setAddingHead(null);
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
                console.error("Error deleting category:", error);
                toast.error("Error deleting category");
            }
        }
    };

    return (
        <div className="w-full space-y-5">
            {/* Header with Canonical Breadcrumbs & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95 transition-all duration-150 cursor-pointer"
                        title="Back"
                        aria-label="Back"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                            <span>Expenses</span>
                            <span>›</span>
                            <span className="text-slate-700 font-semibold">Expense Master</span>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                            Expense Categories
                        </h1>
                    </div>
                </div>

                {expenseHeads.length > 0 && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:scale-[0.97] transition-all duration-120 cursor-pointer self-end sm:self-auto"
                    >
                        <Plus size={14} />
                        <span>Add Category</span>
                    </button>
                )}
            </div>

            {/* Persistent Quick-Add Row (Stays visible so user can keep adding suggestions) */}
            {expenseHeads.length > 0 && remainingSuggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Quick add:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {remainingSuggestions.map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => handleQuickAdd(s)}
                                disabled={addingHead === s}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-blue-500 hover:text-blue-700 active:scale-[0.97] transition-all cursor-pointer shadow-2xs group disabled:opacity-50"
                            >
                                {addingHead === s ? (
                                    <Loader2 size={11} className="animate-spin text-blue-600" />
                                ) : (
                                    <Plus size={11} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                                )}
                                <span>{s}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="py-20 flex flex-col items-center gap-4 text-slate-400 font-medium italic">
                    <Loader2 className="animate-spin text-blue-600" size={36} />
                    <span>Loading categories...</span>
                </div>
            ) : expenseHeads.length > 0 ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3.5">
                    {expenseHeads.map((head) => (
                        <Card key={head._id} className="group relative flex flex-col p-4 bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-xs rounded-xl transition-all cursor-pointer">
                            <div className="flex items-center justify-between mb-2.5">
                                <Tag size={18} className="text-blue-600 shrink-0" />
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(head._id, head.name); }}
                                    className="w-6 h-6 inline-flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                    title="Remove Category"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                            <span className="font-bold text-slate-800 text-[14px] leading-tight truncate">{head.name}</span>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1.5">Active</span>
                        </Card>
                    ))}

                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="group flex flex-col items-center justify-center p-4 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer min-h-[110px] active:scale-[0.98]"
                    >
                        <Plus size={20} className="text-slate-400 group-hover:text-blue-600 transition-colors mb-1" />
                        <span className="font-semibold text-slate-600 text-xs group-hover:text-blue-600 transition-colors">Add Category</span>
                    </button>
                </div>
            ) : (
                <EmptyState
                    title="Set up your expense categories"
                    description="Categories help you track where money goes, like office supplies, utilities and maintenance. Add one to start recording daily expenses."
                    actionLabel="Add category"
                    onAction={() => setIsModalOpen(true)}
                    previewChips={PREVIEW_CHIPS}
                    suggestions={remainingSuggestions}
                    onSuggestionClick={handleQuickAdd}
                />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setNewHeadName(""); }}
                title="Add New Category"
            >
                <form onSubmit={handleAdd} className="space-y-4">
                    <Input
                        label="Category Name"
                        placeholder="e.g. Office Supplies, Utilities, Maintenance, Food"
                        value={newHeadName}
                        onChange={(e) => setNewHeadName(e.target.value)}
                        required
                        autoFocus
                    />

                    {remainingSuggestions.length > 0 && (
                        <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                                Suggestions
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {remainingSuggestions.map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setNewHeadName(s)}
                                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 hover:bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-blue-500 hover:text-blue-700 transition-all cursor-pointer"
                                    >
                                        <Plus size={11} className="text-slate-400" />
                                        <span>{s}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
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