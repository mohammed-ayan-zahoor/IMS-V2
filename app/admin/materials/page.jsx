"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Search, Filter, Plus, FileText, Video, Link as LinkIcon, Download, Trash2, Edit, X, Users, UploadCloud, CheckCircle } from "lucide-react";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";

import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { cn } from "@/lib/utils";
import MobileInstructorMaterials from "@/components/instructor/MobileInstructorMaterials";

export default function MaterialsPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const { data: session } = useSession();
    const isSchool = session?.user?.institute?.type === 'SCHOOL' || session?.user?.institute?.code === 'QUANTECH';

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

    const isInstructorOrStaff = ['instructor', 'staff'].includes(session?.user?.role);

    const getResourceIcon = (fileType, category) => {
        if (fileType === 'pdf') return <FileText size={18} className="text-rose-500" />;
        if (fileType === 'video') return <Video size={18} className="text-blue-500" />;
        if (category === 'assignment') return <CheckCircle size={18} className="text-amber-500" />;
        return <LinkIcon size={18} className="text-emerald-500" />;
    };

    return (
        <>
            {isInstructorOrStaff && (
                <div className="md:hidden">
                    <MobileInstructorMaterials />
                </div>
            )}

            <div className={cn("space-y-6 max-w-7xl mx-auto", isInstructorOrStaff ? "hidden md:block" : "")}>
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            Materials
                        </h1>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Manage {isSchool ? "class" : "course"} resources and downloads.</p>
                    </div>
                    <Button onClick={() => { setEditingId(null); setFormData(initialFormState()); setIsModalOpen(true); }}>
                        <Plus size={16} className="mr-2" /> Add Material
                    </Button>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 space-y-3">
                    <div className="flex items-center gap-1.5 overflow-x-auto">
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
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
                                    selectedType === chip.value
                                        ? "bg-slate-900 text-white"
                                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                                )}
                            >
                                {chip.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                        <div className="w-full md:w-56">
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
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input
                                type="text"
                                placeholder="Search by title or description..."
                                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 outline-none focus:border-slate-400 text-xs font-medium transition-colors"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchMaterials()}
                            />
                        </div>
                    </div>
                </div>

                {/* Materials Grid */}
                {loading ? <LoadingSpinner /> : materials.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {materials.map(mat => {
                            const isPlaceholderDesc = !mat.description || mat.description.trim() === "No specific instructions provided.";
                            return (
                                <Card 
                                    key={mat._id} 
                                    onClick={() => handleDownloadTracking(mat)}
                                    className="p-5 bg-white border border-slate-200/80 rounded-xl flex flex-col justify-between hover:border-slate-300 transition-colors duration-200 cursor-pointer"
                                >
                                    <div>
                                        {/* Header Row: Icon + Badges */}
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="p-2 rounded-lg bg-slate-100 flex items-center justify-center">
                                                {getResourceIcon(mat.file?.type, mat.category)}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={mat.visibleToStudents ? "success" : "neutral"}>
                                                    {mat.visibleToStudents ? "Published" : "Hidden"}
                                                </Badge>
                                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{mat.category}</span>
                                            </div>
                                        </div>

                                        <h3 className="font-bold text-slate-900 text-sm mb-1.5 line-clamp-1">{mat.title}</h3>
                                        <p className={cn(
                                            "text-xs line-clamp-2 min-h-[32px] mb-4 leading-relaxed",
                                            isPlaceholderDesc ? "text-slate-400 italic font-normal" : "text-slate-500 font-normal"
                                        )}>
                                            {isPlaceholderDesc ? "No specific instructions provided." : mat.description}
                                        </p>
                                    </div>

                                    <div className="mt-auto space-y-3">
                                        <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100">
                                            <span className="font-semibold text-slate-600">{mat.file?.type?.toUpperCase() || 'FILE'}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                            <span>{mat.createdAt ? format(new Date(mat.createdAt), "MMM d, yyyy") : 'Recent'}</span>
                                            <span className="ml-auto text-slate-500">{mat.downloadCount || 0} Downloads</span>
                                        </div>

                                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                            <div className="flex items-center gap-1">
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(mat); }}
                                                    className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded"
                                                    title="Edit Material"
                                                >
                                                    <Edit size={15} />
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(mat._id); }}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded"
                                                    title="Delete Material"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                {mat.category === 'assignment' && mat.allowSubmissions && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e) => { e.stopPropagation(); window.location.href = `/admin/materials/${mat._id}/submissions`; }}
                                                    >
                                                        <Users size={14} className="mr-1" /> Submissions
                                                    </Button>
                                                )}
                                                {mat.file?.url && (
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleDownloadTracking(mat); }}
                                                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold flex items-center gap-1 hover:bg-slate-800 transition-colors"
                                                        title="Download Resource"
                                                    >
                                                        <Download size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyState
                        icon={FileText}
                        title="No materials found"
                        description={search || selectedType !== 'all' || selectedCourse ? "Try adjusting your search or filters." : "Upload your first resource or assignment."}
                        actionLabel="Add Material"
                        onAction={() => { setEditingId(null); setFormData(initialFormState()); setIsModalOpen(true); }}
                    />
                )}

                {/* Edit / Add Modal */}
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={editingId ? "Edit Material" : "Add New Material"}
                    className="max-w-lg"
                >
                    <form onSubmit={handleSave} className="space-y-4">
                        <Input
                            label="Material Title *"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Introduction to Product Design"
                            required
                        />
                        
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Description</label>
                            <textarea
                                className="w-full bg-white border border-slate-200 rounded-lg p-3 outline-none focus:border-slate-400 text-xs font-medium text-slate-900 placeholder:text-slate-400 resize-none min-h-[80px]"
                                placeholder="Add instructions, context, or notes for the students..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Category</label>
                                <Select
                                    value={formData.category}
                                    onChange={(val) => setFormData({ ...formData, category: val })}
                                    options={[
                                        { label: "Assignment", value: "assignment" },
                                        { label: "Lecture Note", value: "lecture" },
                                        { label: "Reference", value: "reference" }
                                    ]}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Format Type</label>
                                <Select
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
                        </div>

                        {formData.category === 'assignment' && (
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
                        )}

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Attachment File *</label>
                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 bg-slate-50 text-center relative group">
                                {formData.fileUrl ? (
                                    <div className="flex flex-col items-center gap-1.5">
                                        <CheckCircle size={20} className="text-emerald-600" />
                                        <p className="text-xs font-semibold text-slate-800 break-all px-2">{formData.isUpload ? "File Uploaded Successfully" : formData.fileUrl}</p>
                                        <button 
                                            type="button" 
                                            onClick={() => setFormData({ ...formData, fileUrl: "", fileId: "", isUpload: false })}
                                            className="text-[10px] font-bold text-rose-500 hover:underline mt-1"
                                        >
                                            Remove Attachment
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <UploadCloud size={24} className="text-slate-400 mx-auto mb-1" />
                                        <p className="text-xs font-semibold text-slate-700">Click to upload or drag & drop</p>
                                        <p className="text-[10px] text-slate-400 mb-2">PDF, DOCX, JPG, PNG (Max 10MB)</p>
                                        
                                        <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;
                                                setFormData(prev => ({ ...prev, isUpload: true }));
                                                const data = new FormData();
                                                data.append("file", file);
                                                data.append("fileType", file.type.startsWith('image/') ? 'image' : 'document');
                                                try {
                                                    const res = await fetch("/api/v1/upload", { method: "POST", body: data });
                                                    if (res.ok) {
                                                        const json = await res.json();
                                                        setFormData(prev => ({ ...prev, fileUrl: json.url, fileId: json.public_id, isUpload: true }));
                                                        toast.success("File uploaded successfully!");
                                                    }
                                                } catch (err) { console.error(err); toast.error("Upload failed"); }
                                            }}
                                        />
                                        
                                        <div className="flex items-center gap-2 my-2">
                                            <div className="h-px bg-slate-200 flex-1"></div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">OR PASTE LINK</span>
                                            <div className="h-px bg-slate-200 flex-1"></div>
                                        </div>

                                        <div className="relative z-10">
                                            <Input
                                                placeholder="https://..."
                                                value={formData.fileUrl}
                                                onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value, isUpload: false })}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <div>
                                <span className="text-xs font-bold text-slate-800 block">Publish Material</span>
                                <span className="text-[10px] text-slate-500 font-medium">Visible to students immediately</span>
                            </div>
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                                checked={formData.visibleToStudents}
                                onChange={(e) => setFormData({ ...formData, visibleToStudents: e.target.checked })}
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={saving} className="min-w-[140px]">
                                {saving ? "Saving..." : "Save Material"}
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </>
    );
}
