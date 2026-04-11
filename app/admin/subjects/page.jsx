"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import {
    BookOpen,
    Plus,
    Search,
    Edit2,
    Trash2,
    List
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";

export default function SubjectsPage() {
    const toast = useToast();
    const router = useRouter();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Actions State
    const { data: session } = useSession();
    const [editingSubject, setEditingSubject] = useState(null);
    const [deletingSubject, setDeletingSubject] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        description: ""
    });

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/subjects");
            if (res.ok) {
                const data = await res.json();
                setSubjects(data.subjects || []);
            }
        } catch (error) {
            console.error("Failed to fetch subjects", error);
            toast.error("Failed to load subjects");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSubject = async (e) => {
        e.preventDefault();
        try {
            const url = editingSubject ? `/api/v1/subjects/${editingSubject._id}` : "/api/v1/subjects";
            const method = editingSubject ? "PATCH" : "POST";

            const res = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setIsAddModalOpen(false);
                setEditingSubject(null);
                setFormData({ name: "", code: "", description: "" });
                fetchSubjects();
                toast.success(editingSubject ? "Subject updated successfully" : "Subject created successfully");
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to save subject");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to save subject");
        }
    };

    const confirmDelete = async () => {
        if (!deletingSubject) return;
        try {
            const res = await fetch(`/api/v1/subjects/${deletingSubject._id}`, {
                method: "DELETE"
            });

            if (res.ok) {
                setDeletingSubject(null);
                fetchSubjects();
                toast.success("Subject deleted successfully");
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to delete subject");
            }
        } catch (err) {
            toast.error("Failed to delete subject");
        }
    };

    const openEditModal = (subject) => {
        setEditingSubject(subject);
        setFormData({
            name: subject.name,
            code: subject.code,
            description: subject.description || ""
        });
        setIsAddModalOpen(true);
    };

    // Filter Logic
    const filteredSubjects = subjects.filter(subject =>
        subject.name?.toLowerCase().includes(search.toLowerCase()) ||
        subject.code?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Subject Management</h1>
                    <p className="text-slate-400 mt-1 text-sm font-medium">Create and organize academic subjects for courses and exams.</p>
                </div>
                {session?.user?.role !== 'instructor' && (
                    <Button onClick={() => {
                        setEditingSubject(null);
                        setFormData({ name: "", code: "", description: "" });
                        setIsAddModalOpen(true);
                    }} className="flex items-center gap-2 bg-premium-blue hover:bg-premium-blue/90 shadow-md shadow-blue-500/10">
                        <Plus size={18} />
                        <span>Add New Subject</span>
                    </Button>
                )}
            </div>

            <Card className="transition-all border-transparent shadow-sm overflow-visible">
                <CardHeader className="flex-row items-center gap-4 space-y-0">
                    <div className="flex-1 max-w-md relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400/50 transition-colors group-focus-within:text-premium-blue" size={18} />
                        <input
                            type="text"
                            placeholder="Search subjects..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-premium-blue/30 focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <LoadingSpinner />
                    ) : filteredSubjects.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="px-6 py-4">Subject Name</th>
                                        <th className="px-6 py-4">Code</th>
                                        {session?.user?.role !== 'instructor' && <th className="px-6 py-4 text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredSubjects.map(subject => (
                                        <tr key={subject._id} className="group hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                                                        <BookOpen size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-sm">{subject.name}</h3>
                                                        <p className="text-xs text-slate-500 line-clamp-1 max-w-[250px]">{subject.description || "No description"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="primary" className="font-mono text-[10px]">{subject.code}</Badge>
                                            </td>
                                            {session?.user?.role !== 'instructor' && (
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); router.push(`/admin/subjects/${subject._id}/syllabus`); }}
                                                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                            title="Manage Syllabus"
                                                        >
                                                            <List size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openEditModal(subject); }}
                                                            className="p-2 text-slate-400 hover:text-premium-blue hover:bg-blue-50 rounded-lg transition-all"
                                                            title="Edit Subject"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDeletingSubject(subject); }}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Delete Subject"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState
                            icon={BookOpen}
                            title="No subjects found"
                            description="Create your first subject to get started."
                            actionLabel="Create Subject"
                            onAction={() => {
                                setEditingSubject(null);
                                setFormData({ name: "", code: "", description: "" });
                                setIsAddModalOpen(true);
                            }}
                        />
                    )}
                </CardContent>
            </Card>

            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title={editingSubject ? "Edit Subject" : "Create New Subject"}
            >
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">Subject Details</div>
                <form onSubmit={handleSaveSubject} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            id="name"
                            label="Subject Name"
                            placeholder="e.g. Mathematics"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <Input
                            id="code"
                            label="Subject Code"
                            placeholder="e.g. MATH101"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">Description</label>
                        <textarea
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-premium-blue/50 focus:ring-4 focus:ring-premium-blue/10 min-h-[100px] text-sm text-slate-700 placeholder:text-slate-400 transition-all resize-none"
                            placeholder="Brief description of the subject..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="flex-1">{editingSubject ? "Update Subject" : "Create Subject"}</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!deletingSubject}
                onClose={() => setDeletingSubject(null)}
                onConfirm={confirmDelete}
                title="Delete Subject"
                message={`Are you sure you want to delete ${deletingSubject?.name}? This action cannot be undone.`}
            />
        </div>
    );
}
