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
    List,
    Library,
    ArrowRight,
    Download,
    Upload,
    FileJson,
    Check,
    AlertCircle
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
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importData, setImportData] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [overwriteOnImport, setOverwriteOnImport] = useState(false);

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
            const res = await fetch("/api/v1/master-subjects");
            if (res.ok) {
                const data = await res.json();
                setSubjects(data.subjects || []);
            }
        } catch (error) {
            console.error("Failed to fetch library", error);
            toast.error("Failed to load subject library");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSubject = async (e) => {
        e.preventDefault();
        try {
            const url = editingSubject ? `/api/v1/master-subjects/${editingSubject._id}` : "/api/v1/master-subjects";
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
                toast.success(editingSubject ? "Library subject updated" : "Subject added to library");
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to save to library");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to save subject");
        }
    };

    const confirmDelete = async () => {
        if (!deletingSubject) return;
        try {
            const res = await fetch(`/api/v1/master-subjects/${deletingSubject._id}`, {
                method: "DELETE"
            });

            if (res.ok) {
                setDeletingSubject(null);
                fetchSubjects();
                toast.success("Subject deleted successfully");
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to delete from library");
            }
        } catch (err) {
            toast.error("Failed to delete from library");
        }
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(subjects.map(s => ({
            name: s.name,
            code: s.code,
            description: s.description || ""
        })), null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = 'subject_library.json';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        toast.success("Library exported as JSON");
    };

    const handleImport = async () => {
        try {
            setIsImporting(true);
            let parsed;
            try {
                parsed = JSON.parse(importData);
            } catch (e) {
                toast.error("Invalid JSON format");
                return;
            }

            if (!Array.isArray(parsed)) {
                toast.error("Import data must be an array of subjects");
                return;
            }

            const res = await fetch("/api/v1/master-subjects/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    subjects: parsed,
                    overwrite: overwriteOnImport
                }),
            });

            if (res.ok) {
                const result = await res.json();
                toast.success(`Import complete: ${result.stats.created} created, ${result.stats.updated} updated, ${result.stats.skipped} skipped`);
                setIsImportModalOpen(false);
                setImportData("");
                fetchSubjects();
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to import");
            }
        } catch (err) {
            toast.error("Import failed");
        } finally {
            setIsImporting(false);
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
            {/* Page Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div /> {/* Spacer for Title in Global Header */}
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline"
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2"
                    >
                        <Upload size={18} />
                        <span className="hidden md:inline">Import / Merge</span>
                    </Button>
                    <Button 
                        variant="outline"
                        onClick={handleExport}
                        className="flex items-center gap-2"
                    >
                        <Download size={18} />
                        <span className="hidden md:inline">Export JSON</span>
                    </Button>
                    <Button 
                        onClick={() => {
                            setEditingSubject(null);
                            setFormData({ name: "", code: "", description: "" });
                            setIsAddModalOpen(true);
                        }} 
                        size="md" 
                        className="flex items-center gap-2 px-6 shadow-sm shadow-blue-500/10"
                    >
                        <Plus size={18} strokeWidth={2.5} />
                        <span>Add Library Subject</span>
                    </Button>
                </div>
            </div>

            <Card className="overflow-hidden border-none shadow-premium">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12 flex justify-center"><LoadingSpinner /></div>
                    ) : filteredSubjects.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-white">
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Subject Name</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Library Code</th>
                                        {session?.user?.role !== 'instructor' && <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredSubjects.map(subject => (
                                        <tr key={subject._id} className="group hover:bg-[#F9FAFB] transition-all duration-200">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-50/80 text-blue-600 flex items-center justify-center border border-blue-100/50 shrink-0">
                                                        <Library size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-[14px] leading-tight">{subject.name}</h3>
                                                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">Master Library Subject</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="code">{subject.code}</Badge>
                                            </td>
                                            {session?.user?.role !== 'instructor' && (
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openEditModal(subject); }}
                                                            className="p-2 text-slate-400 hover:text-premium-blue hover:bg-blue-50 rounded-lg transition-all"
                                                            title="Edit Library Subject"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDeletingSubject(subject); }}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Delete from Library"
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
                        <div className="py-20 flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
                                <BookOpen size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 tracking-tight">No subjects yet</h3>
                            <p className="text-sm text-slate-500 font-medium max-w-[240px] mt-1">
                                Create your first academic subject to start building curriculum.
                            </p>
                            {session?.user?.role !== 'instructor' && (
                                <Button 
                                    onClick={() => {
                                        setEditingSubject(null);
                                        setFormData({ name: "", code: "", description: "" });
                                        setIsAddModalOpen(true);
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="mt-6"
                                >
                                    Add Subject to Library
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title={editingSubject ? "Edit Library Subject" : "Add Subject to Library"}
            >
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">Library Details</div>
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
                        <Button type="submit" className="flex-1">{editingSubject ? "Update Library Subject" : "Add to Library"}</Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Import Subject Library"
            >
                <div className="space-y-6 pt-2">
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                        <AlertCircle className="text-amber-600 shrink-0" size={20} />
                        <p className="text-[12px] text-amber-800 font-medium leading-relaxed">
                            Paste your subject library JSON here. The system will merge subjects based on their <strong>Code</strong>.
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">JSON Data</label>
                        <textarea
                            className="w-full h-48 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-premium-blue/40 focus:ring-4 focus:ring-premium-blue/5 text-[13px] font-mono transition-all resize-none"
                            placeholder='[ { "name": "English", "code": "ENG", "description": "" }, ... ]'
                            value={importData}
                            onChange={(e) => setImportData(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3 px-1">
                        <input
                            type="checkbox"
                            id="overwrite"
                            className="w-4 h-4 rounded border-slate-300 text-premium-blue focus:ring-premium-blue/20"
                            checked={overwriteOnImport}
                            onChange={(e) => setOverwriteOnImport(e.target.checked)}
                        />
                        <label htmlFor="overwrite" className="text-sm font-bold text-slate-700 cursor-pointer">
                            Update existing subjects if code matches
                        </label>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setIsImportModalOpen(false)}>Cancel</Button>
                        <Button 
                            className="flex-1" 
                            onClick={handleImport}
                            loading={isImporting}
                            disabled={!importData.trim()}
                        >
                            Import & Merge
                        </Button>
                    </div>
                </div>
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
