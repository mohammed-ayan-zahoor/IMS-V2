"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Search, ExternalLink, Calendar, BookOpen } from "lucide-react";
import { format } from "date-fns";
import MobileBottomSheet from "@/components/mobile/MobileBottomSheet";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";

export default function MobileInstructorMaterials() {
    const toast = useToast();
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const [isUploadSheetOpen, setIsUploadSheetOpen] = useState(false);
    const [formData, setFormData] = useState({ title: "", description: "", fileUrl: "", subject: "" });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/v1/materials');
            if (res.ok) {
                const data = await res.json();
                setMaterials(data.materials || []);
            }
        } catch (e) {
            console.error("Failed to fetch study materials", e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        try {
            setUploading(true);
            const res = await fetch('/api/v1/materials', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success("Study material uploaded!");
                setIsUploadSheetOpen(false);
                setFormData({ title: "", description: "", fileUrl: "", subject: "" });
                fetchMaterials();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to upload material");
            }
        } catch (e) {
            toast.error("Network error");
        } finally {
            setUploading(false);
        }
    };

    const filteredMaterials = materials.filter(m => {
        const title = (m.title || '').toLowerCase();
        const subject = (m.subject || '').toLowerCase();
        return title.includes(search.toLowerCase()) || subject.includes(search.toLowerCase());
    });

    return (
        <div className="space-y-3 pb-8 pt-1">
            {/* Header */}
            <div className="bg-slate-900 text-white rounded-lg p-3 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Teacher Portal
                        </span>
                        <h1 className="text-base font-bold text-white">Study Materials</h1>
                    </div>

                    <button
                        onClick={() => setIsUploadSheetOpen(true)}
                        className="bg-white hover:bg-slate-100 text-slate-900 px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-colors shadow-none"
                    >
                        <Plus size={14} /> Upload Notes
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative pt-1 border-t border-slate-800">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search notes or materials..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-md pl-8 pr-3 py-2 text-xs font-medium text-white outline-none"
                    />
                </div>
            </div>

            {/* Material List Feed */}
            {loading ? (
                <div className="bg-white p-6 rounded-lg text-center border border-slate-200 text-xs font-medium text-slate-500">
                    Loading study materials...
                </div>
            ) : filteredMaterials.length === 0 ? (
                <div className="bg-white p-6 rounded-lg text-center border border-slate-200">
                    <FileText size={24} className="text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-700">No Study Materials Found</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Tap "+ Upload Notes" to share notes with your students.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredMaterials.map(m => (
                        <div key={m._id} className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xs font-bold text-slate-900 leading-snug">{m.title}</h3>
                                    {m.subject && (
                                        <span className="inline-block mt-0.5 text-[10px] font-bold uppercase text-slate-500">
                                            {m.subject}
                                        </span>
                                    )}
                                </div>

                                {m.fileUrl && (
                                    <a
                                        href={m.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="bg-slate-900 text-white px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0"
                                    >
                                        <ExternalLink size={12} /> View File
                                    </a>
                                )}
                            </div>

                            {m.description && (
                                <p className="text-xs text-slate-600 font-normal leading-relaxed">
                                    {m.description}
                                </p>
                            )}

                            <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                <Calendar size={11} /> {m.createdAt ? format(new Date(m.createdAt), 'MMM d, yyyy') : ''}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Material Bottom Sheet */}
            <MobileBottomSheet
                isOpen={isUploadSheetOpen}
                onClose={() => setIsUploadSheetOpen(false)}
                title="Upload Study Material"
                subtitle="Share notes or task files with students"
            >
                <form onSubmit={handleUpload} className="space-y-3 pt-1">
                    <Input
                        label="Material Title *"
                        required
                        placeholder="e.g. Chapter 4 Notes & Solved Problems"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />

                    <Input
                        label="Subject / Class Label"
                        placeholder="e.g. Mathematics - Grade 10"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />

                    <Input
                        label="File URL / Google Drive Link"
                        placeholder="https://..."
                        value={formData.fileUrl}
                        onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                    />

                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Description</label>
                        <textarea
                            rows={3}
                            placeholder="Add brief description or instructions..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full mt-1 p-2.5 border border-slate-200 rounded-md text-xs font-medium text-slate-800 outline-none focus:border-slate-400"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button type="button" variant="ghost" onClick={() => setIsUploadSheetOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={uploading}>
                            {uploading ? "Uploading..." : "Upload Material"}
                        </Button>
                    </div>
                </form>
            </MobileBottomSheet>
        </div>
    );
}
