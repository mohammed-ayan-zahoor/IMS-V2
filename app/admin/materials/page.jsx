"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { Search, Filter, Plus, FileText, Video, Link as LinkIcon, Download, Trash2, Edit, X, Users } from "lucide-react";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

export default function MaterialsPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const { data: session } = useSession();
    const isSchool = session?.user?.institute?.type === 'SCHOOL' || session?.user?.institute?.code === 'QUANTECH';

    const [mounted, setMounted] = useState(false);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState([]);
    const [batches, setBatches] = useState([]);

    // Filters
    const [selectedCourse, setSelectedCourse] = useState("");
    const [selectedType, setSelectedType] = useState("all");
    const [search, setSearch] = useState("");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(initialFormState());
    const [saving, setSaving] = useState(false);

    function initialFormState() {
        return {
            title: "",
            description: "",
            courses: [],
            batches: [],
            category: "lecture",
            fileUrl: "",
            fileId: "",
            fileType: "other",
            visibleToStudents: true,
            allowSubmissions: false,
            dueDate: "",
            totalMarks: "",
            isUpload: false
        };
    }

    useEffect(() => {
        setMounted(true);
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchMaterials();
    }, [selectedCourse, selectedType]);

    const fetchInitialData = async () => {
        try {
            const [cRes, bRes] = await Promise.all([
                fetch("/api/v1/courses"),
                fetch("/api/v1/batches")
            ]);
            const cData = await cRes.json();
            const bData = await bRes.json();
            setCourses(cData.courses || []);
            setBatches(bData.batches || []);
        } catch (error) {
            console.error("Init data failed", error);
        }
    };

    const fetchMaterials = async () => {
        setLoading(true);
        try {
            let url = "/api/v1/materials?";
            if (selectedCourse) url += `courseId=${selectedCourse}&`;
            if (selectedType !== 'all') url += `type=${selectedType}&`;
            if (search) url += `search=${search}`;

            const res = await fetch(url);
            const data = await res.json();
            setMaterials(data.materials || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!formData.title?.trim()) {
            toast.error("Title is required");
            return;
        }
        if (formData.courses.length === 0) {
            toast.error("Select at least one course");
            return;
        }
        if (!formData.fileUrl?.trim()) {
            toast.error("File URL or upload is required");
            return;
        }

        setSaving(true);

        try {
            const payload = {
                title: formData.title.trim(),
                description: formData.description?.trim(),
                courses: formData.courses,
                course: formData.courses[0],
                batches: formData.batches,
                category: formData.category,
                visibleToStudents: formData.visibleToStudents,
                file: {
                    url: formData.fileUrl,
                    fileId: formData.fileId,
                    type: formData.fileType,
                    originalName: formData.title
                },
                allowSubmissions: formData.category === 'assignment' ? formData.allowSubmissions : false,
                dueDate: formData.category === 'assignment' ? formData.dueDate : null,
                totalMarks: formData.category === 'assignment' ? formData.totalMarks : null
            };

            const url = editingId ? `/api/v1/materials/${editingId}` : "/api/v1/materials";
            const method = editingId ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success(editingId ? "Material updated successfully" : "Material created successfully");
                setIsModalOpen(false);
                setEditingId(null);
                setFormData(initialFormState());
                fetchMaterials();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to save material");
            }
        } catch (error) {
            console.error(error);
            toast.error("Network error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        const isConfirmed = await confirm({
            title: "Delete Material?",
            message: "This action cannot be undone. The material will be permanently removed.",
            type: "danger"
        });

        if (!isConfirmed) return;

        try {
            const res = await fetch(`/api/v1/materials/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json();
                toast.error(err.error || "Failed to delete");
                return;
            }
            toast.success("Material deleted successfully");
            fetchMaterials();
        } catch (error) {
            console.error(error);
            toast.error("Network error during delete");
        }
    };

    const handleEdit = (mat) => {
        setEditingId(mat._id);
        setFormData({
            title: mat.title,
            description: mat.description || "",
            courses: mat.courses?.length > 0 ? mat.courses.map(c => (typeof c === 'object' ? c._id : c)) : (mat.course ? [typeof mat.course === 'object' ? mat.course._id : mat.course] : []),
            batches: mat.batches.map(b => b._id || b),
            category: mat.category,
            fileUrl: mat.file?.url || "",
            fileId: mat.file?.fileId || "",
            fileType: mat.file?.type || "other",
            visibleToStudents: mat.visibleToStudents,
            allowSubmissions: mat.allowSubmissions || false,
            dueDate: mat.dueDate ? format(new Date(mat.dueDate), "yyyy-MM-dd") : "",
            totalMarks: mat.totalMarks || "",
            isUpload: !!mat.file?.fileId
        });
        setIsModalOpen(true);
    };

    const handleDownloadTracking = async (mat) => {
        setMaterials(prev => prev.map(m => 
            m._id === mat._id ? { ...m, downloadCount: (m.downloadCount || 0) + 1 } : m
        ));

        try {
            const res = await fetch(`/api/v1/materials/${mat._id}/download`, { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                if (data.url) window.open(data.url, '_blank');
                setMaterials(prev => prev.map(m => 
                    m._id === mat._id ? { ...m, downloadCount: data.downloadCount } : m
                ));
            } else {
                if (mat.file?.url) window.open(mat.file.url, '_blank');
            }
        } catch (error) {
            console.error("Tracking Error:", error);
            if (mat.file?.url) window.open(mat.file.url, '_blank');
        }
    };

    const filteredBatches = batches.filter(b => {
        if (formData.courses.length === 0) return false;
        const batchCourseId = typeof b.course === 'object' ? b.course._id : b.course;
        return formData.courses.some(courseId => {
            const courseIdStr = typeof courseId === 'object' ? courseId._id : courseId;
            return String(batchCourseId) === String(courseIdStr);
        });
    });

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Materials Library</h1>
                    <p className="text-slate-500">Manage {isSchool ? "class" : "course"} resources and downloads.</p>
                </div>
                <Button onClick={() => { setEditingId(null); setFormData(initialFormState()); setIsModalOpen(true); }} className="shadow-lg shadow-premium-blue/20">
                    <Plus size={18} className="mr-2" /> Add Material
                </Button>
            </div>

            <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    {[
                        { label: "All Resources", value: "all" },
                        { label: "PDF Documents", value: "pdf" },
                        { label: "Videos", value: "video" },
                        { label: "Assignments", value: "assignment" },
                        { label: "Reference", value: "reference" }
                    ].map(chip => (
                        <button
                            key={chip.value}
                            onClick={() => setSelectedType(chip.value)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                selectedType === chip.value 
                                ? 'bg-premium-blue text-white border-premium-blue shadow-md shadow-blue-500/20' 
                                : 'bg-white text-slate-500 border-slate-200 hover:border-premium-blue/30'
                            }`}
                        >
                            {chip.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm relative z-20">
                    <div className="w-48 hidden md:block">
                        <Select
                            value={selectedCourse}
                            onChange={(val) => setSelectedCourse(val)}
                            placeholder={`All ${isSchool ? "Classes" : "Courses"}`}
                            options={[
                                { label: `All ${isSchool ? "Classes" : "Courses"}`, value: "" },
                                ...courses.map(c => ({ label: c.name, value: c._id }))
                            ]}
                        />
                    </div>
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by title or description..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border-none rounded-xl focus:ring-4 focus:ring-premium-blue/5 outline-none font-medium text-sm transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchMaterials()}
                        />
                    </div>
                </div>
            </div>

            {loading ? <LoadingSpinner /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {materials.map(mat => (
                        <div 
                            key={mat._id} 
                            onClick={() => handleDownloadTracking(mat)}
                            className="group relative bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1.5 hover:border-premium-blue/40 transition-all duration-300 cursor-pointer flex flex-col"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 shadow-sm ${
                                    mat.file?.type === 'pdf' ? 'bg-red-50 text-red-600' :
                                    mat.file?.type === 'video' ? 'bg-purple-50 text-purple-600' :
                                    'bg-blue-50 text-blue-600'
                                }`}>
                                    {mat.file?.type === 'pdf' ? <FileText size={24} /> :
                                     mat.file?.type === 'video' ? <Video size={24} /> :
                                     <LinkIcon size={24} />}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <Badge variant={mat.visibleToStudents ? "success" : "neutral"} className="font-black text-[10px] uppercase tracking-tighter">
                                        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${mat.visibleToStudents ? 'bg-white' : 'bg-slate-400'}`}></div>
                                        {mat.visibleToStudents ? "Published" : "Hidden"}
                                    </Badge>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{mat.category}</span>
                                </div>
                            </div>

                            <div className="mb-4">
                                <h3 className="font-black text-slate-900 text-lg tracking-tight mb-1 line-clamp-1 group-hover:text-premium-blue transition-colors">{mat.title}</h3>
                                <p className="text-xs font-medium text-slate-500 line-clamp-2 min-h-[32px]">{mat.description || "No specific instructions provided."}</p>
                            </div>

                            <div className="mt-auto space-y-4">
                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-2 rounded-lg">
                                    <span className="flex items-center gap-1"><FileText size={12} /> {mat.file?.type?.toUpperCase() || 'FILE'}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                    <span>{mat.createdAt ? format(new Date(mat.createdAt), "MMM d, yyyy") : 'Recent'}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300 ml-auto"></span>
                                    <span className="text-slate-500">{mat.downloadCount || 0} Downloads</span>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleEdit(mat); }}
                                            className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-premium-blue hover:border-premium-blue hover:bg-premium-blue/5 transition-all flex items-center justify-center shadow-sm"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDelete(mat._id); }}
                                            className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all flex items-center justify-center shadow-sm"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        {mat.category === 'assignment' && mat.allowSubmissions && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-100 font-bold px-3 py-1.5 h-auto text-[10px]"
                                                onClick={(e) => { e.stopPropagation(); window.location.href = `/admin/materials/${mat._id}/submissions`; }}
                                            >
                                                <Users size={12} className="mr-1.5" /> Submissions
                                            </Button>
                                        )}
                                        {mat.file?.url && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDownloadTracking(mat); }}
                                                className="w-9 h-9 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center justify-center shadow-md shadow-slate-900/10"
                                            >
                                                <Download size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && mounted && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-start md:items-center justify-center bg-black/60 backdrop-blur-md p-4 py-10 animate-in fade-in"
                    onClick={() => setIsModalOpen(false)}
                >
                    <form 
                        onSubmit={handleSave} 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] border border-white/20 animate-in zoom-in-95 duration-300"
                    >
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <h2 className="text-lg font-bold text-slate-900">{editingId ? "Edit Material" : "Add New Material"}</h2>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-white rounded-full transition-colors text-slate-400"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 flex-1 min-h-0 overflow-y-auto space-y-5 custom-scrollbar">
                            <Input
                                label="Title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter material title..."
                                required
                            />
                            
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">Description</label>
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-premium-blue/10 text-sm min-h-[70px] transition-all font-medium placeholder:text-slate-400"
                                    placeholder="Optional instructions for students..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <Select
                                    label="Type"
                                    value={formData.fileType}
                                    onChange={(val) => setFormData({ ...formData, fileType: val })}
                                    options={[
                                        { label: "PDF Document", value: "pdf" },
                                        { label: "Video URL", value: "video" },
                                        { label: "Image", value: "image" },
                                        { label: "Word Doc", value: "doc" },
                                        { label: "Other Link", value: "other" }
                                    ]}
                                />
                                <Select
                                    label="Category"
                                    value={formData.category}
                                    onChange={(val) => setFormData({ ...formData, category: val })}
                                    options={[
                                        { label: "Lecture Note", value: "lecture" },
                                        { label: "Assignment", value: "assignment" },
                                        { label: "Reference", value: "reference" }
                                    ]}
                                />
                            </div>

                            {formData.category === 'assignment' && (
                                <div className="p-4 rounded-2xl bg-premium-blue/5 border border-premium-blue/10 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Due Date"
                                            type="date"
                                            value={formData.dueDate}
                                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        />
                                        <Input
                                            label="Total Marks"
                                            type="number"
                                            value={formData.totalMarks}
                                            onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })}
                                            placeholder="e.g. 100"
                                        />
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.allowSubmissions}
                                            onChange={(e) => setFormData({ ...formData, allowSubmissions: e.target.checked })}
                                            className="w-5 h-5 rounded text-premium-blue border-slate-300"
                                        />
                                        <span className="text-sm font-bold text-slate-700">Enable Student Submissions</span>
                                    </label>
                                </div>
                            )}

                            <div className="space-y-4 border border-slate-100 p-5 rounded-2xl bg-slate-50/50">
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${!formData.isUpload ? 'bg-white border-slate-200' : 'text-slate-400 border-transparent'}`}
                                        onClick={() => setFormData({ ...formData, isUpload: false })}
                                    >
                                        <LinkIcon size={14} className="inline mr-1" /> Link
                                    </button>
                                    <button
                                        type="button"
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${formData.isUpload ? 'bg-white border-slate-200' : 'text-slate-400 border-transparent'}`}
                                        onClick={() => setFormData({ ...formData, isUpload: true })}
                                    >
                                        <Download size={14} className="inline mr-1" /> Upload
                                    </button>
                                </div>

                                {formData.isUpload ? (
                                    <input
                                        type="file"
                                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-premium-blue/10 file:text-premium-blue"
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            const data = new FormData();
                                            data.append("file", file);
                                            data.append("fileType", file.type.startsWith('image/') ? 'image' : 'document');
                                            try {
                                                const res = await fetch("/api/v1/upload", { method: "POST", body: data });
                                                if (res.ok) {
                                                    const json = await res.json();
                                                    setFormData(prev => ({ ...prev, fileUrl: json.url, fileId: json.public_id }));
                                                    toast.success("Uploaded!");
                                                }
                                            } catch (err) { console.error(err); }
                                        }}
                                    />
                                ) : (
                                    <Input
                                        label="Resource URL"
                                        placeholder="https://..."
                                        value={formData.fileUrl}
                                        onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                                    />
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase text-slate-500 ml-1">{isSchool ? "Classes" : "Courses"}</label>
                                <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto border border-slate-100 rounded-xl p-3 bg-white/50">
                                    {courses.map(course => (
                                        <label key={course._id} className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.courses.includes(course._id)}
                                                onChange={() => {
                                                    const newCourses = formData.courses.includes(course._id)
                                                        ? formData.courses.filter(c => c !== course._id)
                                                        : [...formData.courses, course._id];
                                                    setFormData({ ...formData, courses: newCourses, batches: [] });
                                                }}
                                                className="w-4 h-4 rounded text-premium-blue border-slate-300"
                                            />
                                            <span>{course.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {formData.courses.length > 0 && (
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase text-slate-500 ml-1">{isSchool ? "Sections" : "Batches"}</label>
                                    <div className="grid grid-cols-2 gap-3 max-h-[120px] overflow-y-auto border border-slate-100 rounded-xl p-3 bg-white/50">
                                        {filteredBatches.map(batch => (
                                            <label key={batch._id} className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.batches.includes(batch._id)}
                                                    onChange={() => {
                                                        const newBatches = formData.batches.includes(batch._id)
                                                            ? formData.batches.filter(b => b !== batch._id)
                                                            : [...formData.batches, batch._id];
                                                        setFormData({ ...formData, batches: newBatches });
                                                    }}
                                                    className="w-4 h-4 rounded text-premium-blue border-slate-300"
                                                />
                                                <span>{batch.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <label className="flex items-center gap-3 pt-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.visibleToStudents}
                                    onChange={(e) => setFormData({ ...formData, visibleToStudents: e.target.checked })}
                                    className="w-5 h-5 rounded text-premium-blue border-slate-300"
                                />
                                <span className="text-sm font-bold text-slate-700">Visible to Students</span>
                            </label>

                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
                            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={saving} className="px-8 shadow-md rounded-xl">
                                {saving ? "Saving..." : "Save Material"}
                            </Button>
                        </div>
                    </form>
                </div>,
                document.body
            )}
        </div>
    );
}
