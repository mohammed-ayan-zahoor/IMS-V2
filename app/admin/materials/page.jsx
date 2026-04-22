"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Search, Filter, Plus, FileText, Video, Link as LinkIcon, Download, Trash2, Edit, X } from "lucide-react";
import Select from "@/components/ui/Select";
// Verified: Usage of Select component is compatible with onChange(value) signature.
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
            courses: [], // Changed from single course to array
            batches: [],
            category: "lecture",
            fileUrl: "",
            fileId: "",
            fileType: "other",
            visibleToStudents: true
        };
    }

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchMaterials();
    }, [selectedCourse]);

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

        // Validation
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
                courses: formData.courses, // Array of courses
                course: formData.courses[0], // Keep first course for backwards compatibility
                batches: formData.batches,
                category: formData.category,
                visibleToStudents: formData.visibleToStudents,
                file: {
                    url: formData.fileUrl,
                    fileId: formData.fileId,
                    type: formData.fileType,
                    originalName: formData.title // Fallback
                }
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
            visibleToStudents: mat.visibleToStudents
        });
        setIsModalOpen(true);
    };

    const handleDownloadTracking = async (mat) => {
        // Optimistic State Update for Instant Feedback
        setMaterials(prev => prev.map(m => 
            m._id === mat._id ? { ...m, downloadCount: (m.downloadCount || 0) + 1 } : m
        ));

        try {
            const res = await fetch(`/api/v1/materials/${mat._id}/download`, { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                if (data.url) window.open(data.url, '_blank');
                // Sync with server count if needed
                setMaterials(prev => prev.map(m => 
                    m._id === mat._id ? { ...m, downloadCount: data.downloadCount } : m
                ));
            } else {
                // If it fails, we should still try open the original URL for user convenience
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
                    <p className="text-slate-500">Manage course resources and downloads.</p>
                </div>
                <Button onClick={() => { setEditingId(null); setFormData(initialFormState()); setIsModalOpen(true); }} className="shadow-lg shadow-premium-blue/20">
                    <Plus size={18} className="mr-2" /> Add Material
                </Button>
            </div>

            {/* Filter Chips & Search Bar */}
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
                            onClick={() => {
                                if (chip.value === 'all') setSelectedType('all');
                                else if (['pdf', 'video'].includes(chip.value)) setSelectedType(chip.value);
                                else { /* Handle category filter if needed, or stick to type for now */ }
                                setSelectedType(chip.value);
                            }}
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
                            placeholder="All Courses"
                            options={[
                                { label: "All Courses", value: "" },
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

            {/* Sub-header Stats */}
            {!loading && materials.length > 0 && (
                <div className="flex justify-between items-center px-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Showing {materials.length} Materials</p>
                </div>
            )}

            {/* Grid */}
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
                                {/* Metadata Line */}
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
                                            title="Edit"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDelete(mat._id); }}
                                            className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all flex items-center justify-center shadow-sm"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        {mat.file?.url && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDownloadTracking(mat); }}
                                                className="w-9 h-9 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center justify-center shadow-md shadow-slate-900/10"
                                                title="Download/Open"
                                            >
                                                <Download size={16} />
                                            </button>
                                        )}
                                        <div className="flex flex-col text-right">
                                            <span className="text-[10px] font-black text-slate-900 truncate max-w-[80px]">{mat.course?.name || "All Courses"}</span>
                                            <span className="text-[9px] font-bold text-slate-400">{mat.batches?.length ? `${mat.batches.length} Batches` : "Global"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {!loading && materials.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400 italic">
                            No materials found. Add one to get started.
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/60 backdrop-blur-md p-4 py-10 overflow-y-auto animate-in fade-in"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') setIsModalOpen(false);
                    }}
                >
                    <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col my-auto border border-white/20">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 id="modal-title" className="text-lg font-bold text-slate-900">{editingId ? "Edit Material" : "Add New Material"}</h2>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-700"
                                aria-label="Close modal"
                                autoFocus
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto space-y-5">
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
                                <div className="space-y-1">
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
                                </div>
                                <div className="space-y-1">
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
                            </div>

                            <div className="space-y-4 border border-slate-100 p-5 rounded-2xl bg-slate-50/50">
                                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">Resource Source</label>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${!formData.isUpload ? 'bg-white border-slate-200 shadow-sm text-slate-700' : 'text-slate-400 border-transparent hover:bg-slate-100'
                                            }`}
                                        onClick={() => setFormData({ ...formData, isUpload: false })}
                                    >
                                        <LinkIcon size={14} className="inline mr-1" /> External Link / Embed
                                    </button>
                                    <button
                                        type="button"
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${formData.isUpload ? 'bg-white border-slate-200 shadow-sm text-slate-700' : 'text-slate-400 border-transparent hover:bg-slate-100'
                                            }`}
                                        onClick={() => setFormData({ ...formData, isUpload: true })}
                                    >
                                        <Download size={14} className="inline mr-1" /> Upload File
                                    </button>
                                </div>

                                {formData.isUpload ? (
                                    <div className="space-y-2">
                                        <input
                                            type="file"
                                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-premium-blue/10 file:text-premium-blue hover:file:bg-premium-blue/20"
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;

                                                const computedType = file.type.includes('pdf') ? 'pdf' :
                                                    file.type.includes('image') ? 'image' :
                                                        file.type.includes('video') ? 'video' : formData.fileType;

                                                const data = new FormData();
                                                data.append("file", file);
                                                // API requires a context check: image vs document
                                                const uploadContext = file.type.startsWith('image/') ? 'image' : 'document';
                                                data.append("fileType", uploadContext);

                                                try {
                                                    const res = await fetch("/api/v1/upload", { method: "POST", body: data });
                                                    if (res.ok) {
                                                        const json = await res.json();
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            fileUrl: json.url,
                                                            fileId: json.public_id,
                                                            fileType: computedType
                                                        }));
                                                        toast.success("File uploaded successfully");
                                                    } else {
                                                        toast.error("Upload failed");
                                                    }
                                                } catch (err) {
                                                    console.error(err);
                                                    toast.error("Upload error");
                                                }
                                            }}
                                        />
                                        {formData.fileUrl && <p className="text-xs text-green-600 font-medium truncate">File uploaded: {formData.fileUrl}</p>}
                                    </div>
                                ) : (
                                    <Input
                                        label={formData.fileType === 'video' ? "YouTube / Video URL" : "Resource URL"}
                                        placeholder={formData.fileType === 'video' ? "https://youtube.com/watch?v=..." : "https://docs.google.com/..."}
                                        value={formData.fileUrl}
                                        onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                                        required={!formData.isUpload}
                                    />
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">Courses (Select at least one)</label>
                                <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto border border-slate-100 rounded-xl p-3 bg-white/50">
                                    {courses.map(course => (
                                        <label key={course._id} className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer hover:text-premium-blue transition-colors group">
                                            <input
                                                type="checkbox"
                                                checked={formData.courses.includes(course._id)}
                                                onChange={() => {
                                                    const newCourses = formData.courses.includes(course._id)
                                                        ? formData.courses.filter(c => c !== course._id)
                                                        : [...formData.courses, course._id];
                                                    setFormData({ ...formData, courses: newCourses, batches: [] });
                                                }}
                                                className="w-4 h-4 rounded text-premium-blue border-slate-300 focus:ring-premium-blue/20"
                                            />
                                            <span className="font-medium">{course.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {formData.courses.length > 0 && (
                                <div className="space-y-2.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">Assign Batches (Optional)</label>
                                    <div className="grid grid-cols-2 gap-3 max-h-[120px] overflow-y-auto border border-slate-100 rounded-xl p-3 bg-white/50">
                                        {filteredBatches.length > 0 ? (
                                            filteredBatches.map(batch => (
                                                <label key={batch._id} className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer hover:text-premium-blue transition-colors group">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.batches.includes(batch._id)}
                                                        onChange={() => {
                                                            const newBatches = formData.batches.includes(batch._id)
                                                                ? formData.batches.filter(b => b !== batch._id)
                                                                : [...formData.batches, batch._id];
                                                            setFormData({ ...formData, batches: newBatches });
                                                        }}
                                                        className="w-4 h-4 rounded text-premium-blue border-slate-300 focus:ring-premium-blue/20"
                                                    />
                                                    <span className="font-medium">{batch.name}</span>
                                                </label>
                                            ))
                                        ) : (
                                            <p className="text-xs text-slate-400 col-span-2 italic">No batches found for selected courses</p>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium italic ml-1 select-none">Leave empty to show to all students in these courses.</p>
                                </div>
                            )}

                            <label className="flex items-center gap-3 pt-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={formData.visibleToStudents}
                                    onChange={(e) => setFormData({ ...formData, visibleToStudents: e.target.checked })}
                                    className="w-5 h-5 rounded text-premium-blue border-slate-300 focus:ring-premium-blue/20"
                                />
                                <span className="text-sm font-bold text-slate-700 group-hover:text-premium-blue transition-colors">Visible to Students</span>
                            </label>

                        </div>
                        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="text-slate-500 font-bold">Cancel</Button>
                            <Button type="submit" disabled={saving} className="px-8 shadow-md">
                                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Material"}
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
