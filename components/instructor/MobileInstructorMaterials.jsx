"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { FileText, Plus, Search, ExternalLink, Calendar, BookOpen } from "lucide-react";
import { format } from "date-fns";
import MobileBottomSheet from "@/components/mobile/MobileBottomSheet";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";

export default function MobileInstructorMaterials() {
    const toast = useToast();
    const { data: session } = useSession();
    const isSchool = session?.user?.institute?.type === 'SCHOOL' || session?.user?.institute?.code === 'QUANTECH';
    const isVocational = session?.user?.institute?.type === 'VOCATIONAL';

    const [materials, setMaterials] = useState([]);
    const [courses, setCourses] = useState([]);
    const [courseBundles, setCourseBundles] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const [isUploadSheetOpen, setIsUploadSheetOpen] = useState(false);
    const [formData, setFormData] = useState({ 
        title: "", 
        description: "", 
        fileUrl: "", 
        courses: [], 
        batches: [],
        category: "lecture",
        fileType: "other"
    });
    const [uploading, setUploading] = useState(false);

    const fetchInitialData = useCallback(async () => {
        try {
            const fetches = [
                fetch("/api/v1/courses"),
                fetch("/api/v1/batches")
            ];
            if (isVocational) {
                fetches.push(fetch("/api/v1/course-bundles"));
            }
            const results = await Promise.all(fetches);
            const cData = await results[0].json();
            const bData = await results[1].json();
            setCourses(cData.courses || []);
            setBatches(bData.batches || []);
            if (isVocational && results[2] && results[2].ok) {
                const bundleData = await results[2].json();
                setCourseBundles(bundleData.courseBundles || bundleData.bundles || (Array.isArray(bundleData) ? bundleData : []));
            }
        } catch (e) {
            console.error("Failed to fetch courses/batches", e);
        }
    }, [isVocational]);

    const fetchMaterials = useCallback(async () => {
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
    }, []);

    useEffect(() => {
        fetchMaterials();
        fetchInitialData();
    }, [fetchMaterials, fetchInitialData]);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!formData.title?.trim()) {
            toast.error("Title is required");
            return;
        }
        if (!formData.courses || formData.courses.length === 0) {
            toast.error(`Please select a ${isSchool ? "class" : "course"}`);
            return;
        }
        if (!formData.fileUrl?.trim()) {
            toast.error("File URL is required");
            return;
        }

        try {
            setUploading(true);
            const selectedBundleIds = formData.courses.filter(id => courseBundles.some(b => b._id === id));
            const selectedCourseIds = formData.courses.filter(id => !selectedBundleIds.includes(id));

            const payload = {
                title: formData.title.trim(),
                description: formData.description?.trim(),
                courses: selectedCourseIds,
                course: selectedCourseIds[0] || null,
                courseBundles: selectedBundleIds,
                courseBundle: selectedBundleIds[0] || null,
                batches: formData.batches,
                category: formData.category || "lecture",
                visibleToStudents: true,
                file: {
                    url: formData.fileUrl.trim(),
                    type: formData.fileType || "other",
                    originalName: formData.title.trim()
                }
            };

            const res = await fetch('/api/v1/materials', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Study material uploaded!");
                setIsUploadSheetOpen(false);
                setFormData({ 
                    title: "", 
                    description: "", 
                    fileUrl: "", 
                    courses: [], 
                    batches: [],
                    category: "lecture",
                    fileType: "other"
                });
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
        const courseNames = ((m.courses || []).map(c => typeof c === 'object' ? c.name : '')).join(' ').toLowerCase();
        return title.includes(search.toLowerCase()) || courseNames.includes(search.toLowerCase());
    });

    const filteredBatches = batches.filter(b => {
        if (formData.courses.length === 0) return false;
        const bCourseId = typeof b.course === 'object' ? b.course?._id : b.course;
        const bBundleId = typeof b.courseBundle === 'object' ? b.courseBundle?._id : b.courseBundle;
        return formData.courses.some(cid => String(bCourseId) === String(cid) || String(bBundleId) === String(cid));
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
                    <p className="text-[11px] text-slate-500 mt-0.5">Tap &quot;+ Upload Notes&quot; to share notes with your students.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredMaterials.map(m => (
                        <div key={m._id} className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xs font-bold text-slate-900 leading-snug">{m.title}</h3>
                                    {((m.courses && m.courses.length > 0) || m.course || (m.courseBundles && m.courseBundles.length > 0) || m.courseBundle) && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {(m.courseBundles && m.courseBundles.length > 0 ? m.courseBundles : [m.courseBundle]).filter(Boolean).map(b => (
                                                <span key={typeof b === 'object' ? b._id : b} className="text-[9px] font-bold uppercase bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                                                    🎁 {typeof b === 'object' ? (b.title || b.name) : 'Package'}
                                                </span>
                                            ))}
                                            {(m.courses && m.courses.length > 0 ? m.courses : [m.course]).filter(Boolean).map(c => (
                                                <span key={typeof c === 'object' ? c._id : c} className="text-[9px] font-bold uppercase bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                                    {typeof c === 'object' ? c.name : (isSchool ? 'Class' : 'Course')}
                                                </span>
                                            ))}
                                            {m.batches && m.batches.length > 0 && m.batches.map(b => (
                                                <span key={typeof b === 'object' ? b._id : b} className="text-[9px] font-semibold uppercase bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                                                    {typeof b === 'object' ? b.name : (isSchool ? 'Section' : 'Batch')}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    {m.category === 'assignment' && m.allowSubmissions && (
                                        <a
                                            href={`/admin/materials/${m._id}/submissions`}
                                            className="bg-blue-600 text-white px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0"
                                        >
                                            Submissions
                                        </a>
                                    )}
                                    {m.file?.url && (
                                        <a
                                            href={m.file.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="bg-slate-900 text-white px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0"
                                        >
                                            <ExternalLink size={12} /> View
                                        </a>
                                    )}
                                </div>
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

                    <Select
                        label={`${isSchool ? "Class" : "Course"} *`}
                        placeholder={`Select ${isSchool ? "class" : "course"}...`}
                        value={formData.courses[0] || ""}
                        onChange={(val) => {
                            const selectedCourseId = val;
                            const validBatches = batches.filter(b => {
                                const bCourseId = typeof b.course === 'object' ? b.course?._id : b.course;
                                const bBundleId = typeof b.courseBundle === 'object' ? b.courseBundle?._id : b.courseBundle;
                                return String(bCourseId) === String(selectedCourseId) || String(bBundleId) === String(selectedCourseId);
                            }).map(b => (typeof b._id === 'object' ? b._id.toString() : b._id));

                            setFormData(prev => ({
                                ...prev,
                                courses: selectedCourseId ? [selectedCourseId] : [],
                                batches: prev.batches.filter(id => validBatches.includes(typeof id === 'object' ? id.toString() : id))
                            }));
                        }}
                        options={[
                            ...(isVocational && courseBundles.filter(b => b.isActive !== false).length > 0 ? [
                                { label: "── 🎁 PACKAGES ──", value: "hdr_bundles", disabled: true },
                                ...courseBundles.filter(b => b.isActive !== false).map(b => ({ label: `🎁 ${b.title}` + (b.code ? ` (${b.code})` : ""), value: b._id })),
                                { label: "── COURSES ──", value: "hdr_courses", disabled: true },
                            ] : []),
                            ...courses.map(c => ({
                                label: c.name + (c.code ? ` (${c.code})` : ""),
                                value: c._id
                            }))
                        ]}
                    />

                    <Select
                        label={isSchool ? "Section (Optional)" : "Batch (Optional)"}
                        placeholder={formData.courses.length === 0 ? `Select ${isSchool ? "class" : "course"} first` : `All ${isSchool ? "Sections" : "Batches"}`}
                        value={formData.batches[0] || ""}
                        onChange={(val) => setFormData(prev => ({ ...prev, batches: val ? [val] : [] }))}
                        disabled={formData.courses.length === 0}
                        options={[
                            { label: `All ${isSchool ? "Sections" : "Batches"}`, value: "" },
                            ...filteredBatches.map(b => ({
                                label: b.name,
                                value: b._id
                            }))
                        ]}
                    />

                    <Input
                        label="File URL / Google Drive Link *"
                        required
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
