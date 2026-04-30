"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
    Plus, 
    Search, 
    Trash2, 
    Edit2, 
    BookOpen, 
    CreditCard,
    ChevronLeft,
    AlertCircle
} from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import MultiSelect from "@/components/ui/MultiSelect";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

export default function FeePresetsPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const { data: session } = useSession();
    const isSchool = session?.user?.institute?.type === 'SCHOOL' || session?.user?.institute?.code === 'QUANTECH';
    
    const [courses, setCourses] = useState([]);
    const [presets, setPresets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPreset, setEditingPreset] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [courseSubjects, setCourseSubjects] = useState([]);

    const [formData, setFormData] = useState({
        name: "",
        amount: "",
        courseId: "",
        description: "",
        subjects: [],
        category: "general",
        complexity: "standard"
    });

    useEffect(() => {
        fetchCourses();
        fetchPresets();
    }, []);

    useEffect(() => {
        if (formData.courseId) {
            const course = courses.find(c => c._id === formData.courseId);
            if (course) {
                const subjects = course.subjects || [];
                // If subjects are already populated as objects
                if (subjects.length > 0 && typeof subjects[0] === 'object') {
                    setCourseSubjects(subjects);
                } else if (subjects.length > 0) {
                    // Subjects are IDs, need to fetch
                    fetchSubjectsForCourse(formData.courseId);
                } else {
                    // No subjects linked to this course
                    setCourseSubjects([]);
                }
            }
        } else {
            setCourseSubjects([]);
        }
    }, [formData.courseId, courses]);

    const fetchSubjectsForCourse = async (courseId) => {
        try {
            const res = await fetch(`/api/v1/courses/${courseId}`);
            if (res.ok) {
                const data = await res.json();
                setCourseSubjects(data.subjects || []);
            }
        } catch (error) {
            console.error("Failed to fetch subjects", error);
        }
    };

    const fetchCourses = async () => {
        try {
            const res = await fetch("/api/v1/courses");
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data.courses || []);
                setCourses(list);
            }
        } catch (error) {
            console.error("Failed to fetch courses", error);
        }
    };

    const fetchPresets = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/fee-presets");
            if (res.ok) {
                const data = await res.json();
                setPresets(data.presets || []);
            }
        } catch (error) {
            console.error("Failed to fetch presets", error);
            toast.error("Failed to load presets");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const url = editingPreset ? `/api/v1/fee-presets/${editingPreset._id}` : "/api/v1/fee-presets";
            const method = editingPreset ? "PATCH" : "POST";
            
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(editingPreset ? "Preset updated" : "Preset created");
                setIsModalOpen(false);
                fetchPresets();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to save preset");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (preset) => {
        if (await confirm({
            title: "Delete Preset?",
            message: `Are you sure you want to delete "${preset.name}"? This will not affect students already enrolled with this fee.`,
            type: "danger"
        })) {
            try {
                const res = await fetch(`/api/v1/fee-presets/${preset._id}`, { method: "DELETE" });
                if (res.ok) {
                    toast.success("Preset deleted");
                    fetchPresets();
                }
            } catch (error) {
                toast.error("Failed to delete preset");
            }
        }
    };

    const openCreateModal = () => {
        setEditingPreset(null);
        setFormData({
            name: "",
            amount: "",
            courseId: selectedCourse || "",
            description: "",
            subjects: [],
            category: "general",
            complexity: "standard"
        });
        setIsModalOpen(true);
    };

    const openEditModal = (preset) => {
        setEditingPreset(preset);
        setFormData({
            name: preset.name,
            amount: preset.amount,
            courseId: preset.course?._id || preset.course,
            description: preset.description || "",
            subjects: preset.subjects?.map(s => typeof s === 'object' ? s._id : s) || [],
            category: preset.category || "general",
            complexity: preset.complexity || "standard"
        });
        setIsModalOpen(true);
    };

    const filteredPresets = presets.filter(p => 
        !selectedCourse || (p.course?._id === selectedCourse || p.course === selectedCourse)
    );

    const getCategoryColor = (cat) => {
        switch (cat) {
            case 'science': return 'bg-blue-100 text-blue-700';
            case 'commerce': return 'bg-emerald-100 text-emerald-700';
            case 'arts': return 'bg-purple-100 text-purple-700';
            case 'vocational': return 'bg-orange-100 text-orange-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/fees" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <ChevronLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Fee Presets</h1>
                        <p className="text-[12px] text-slate-400 font-medium tracking-tight">Manage subject-specific fee structures</p>
                    </div>
                </div>
                <Button onClick={openCreateModal} className="flex items-center gap-2">
                    <Plus size={18} />
                    <span>Create Preset</span>
                </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="w-full md:w-64">
                    <Select
                        value={selectedCourse}
                        onChange={setSelectedCourse}
                        options={[
                            { label: `All ${isSchool ? "Classes" : "Courses"}`, value: "" },
                            ...courses.map(c => ({ label: c.name, value: c._id }))
                        ]}
                        placeholder={`Filter by ${isSchool ? "Class" : "Course"}`}
                    />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                    {filteredPresets.length} Presets Available
                </p>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center"><LoadingSpinner /></div>
            ) : filteredPresets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPresets.map(preset => (
                        <Card key={preset._id} className="group hover:shadow-xl transition-all duration-300 border-none bg-white relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-premium-blue opacity-20 group-hover:opacity-100 transition-all" />
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-blue-50 text-premium-blue rounded-xl">
                                            <CreditCard size={20} />
                                        </div>
                                        <Badge variant="secondary" className={`text-[10px] uppercase tracking-wider font-bold ${getCategoryColor(preset.category)}`}>
                                            {preset.category}
                                        </Badge>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => openEditModal(preset)} className="p-1.5 text-slate-400 hover:text-premium-blue hover:bg-blue-50 rounded-lg">
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(preset)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                
                                <h3 className="text-[17px] font-bold text-slate-900 mb-1">{preset.name}</h3>
                                <p className="text-[12px] text-slate-500 font-medium mb-3 flex items-center gap-1.5">
                                    <BookOpen size={12} />
                                    {preset.course?.name || `Multiple ${isSchool ? "Classes" : "Courses"}`}
                                </p>

                                {preset.subjects && preset.subjects.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {preset.subjects.map(sub => (
                                            <span key={sub._id} className="text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded border border-slate-100 font-medium">
                                                {sub.code || sub.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">Fixed Fee</div>
                                    <div className="text-[20px] font-black text-slate-900">₹{preset.amount.toLocaleString()}</div>
                                </div>
                                
                                {preset.description && (
                                    <p className="mt-4 text-[12px] text-slate-400 italic line-clamp-1">{preset.description}</p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={CreditCard}
                    title="No Presets Found"
                    description={selectedCourse ? `No presets created for this ${isSchool ? "class" : "course"} yet.` : "Start by creating your first fee preset structure."}
                />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingPreset ? "Edit Preset" : "Create Fee Preset"}
            >
                <form onSubmit={handleSave} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Target {isSchool ? "Class" : "Course"}</label>
                            <Select
                                value={formData.courseId}
                                onChange={(val) => setFormData({ ...formData, courseId: val })}
                                options={courses.map(c => ({ label: c.name, value: c._id }))}
                                placeholder={`Select ${isSchool ? "Class" : "Course"}`}
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Category</label>
                            <Select
                                value={formData.category}
                                onChange={(val) => setFormData({ ...formData, category: val })}
                                options={[
                                    { label: "General", value: "general" },
                                    { label: "Science", value: "science" },
                                    { label: "Commerce", value: "commerce" },
                                    { label: "Arts", value: "arts" },
                                    { label: "Vocational", value: "vocational" }
                                ]}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Preset Name"
                            placeholder="e.g. Science (PCM) + IT"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <Input
                            label="Fee Amount (₹)"
                            type="number"
                            placeholder="e.g. 25000"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Subjects (Multi-Select)</label>
                        <MultiSelect
                            placeholder="Select subjects for this combination..."
                            options={courseSubjects.map(s => ({ label: `${s.name} (${s.code})`, value: s._id }))}
                            value={formData.subjects}
                            onChange={(val) => setFormData({ ...formData, subjects: val })}
                            disabled={!formData.courseId}
                        />
                        {!formData.courseId && <p className="text-[10px] text-amber-500 italic">Please select a {isSchool ? "class" : "course"} first.</p>}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Description (Optional)</label>
                        <textarea
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-premium-blue/40 focus:ring-4 focus:ring-premium-blue/5 text-sm min-h-[80px] resize-none"
                            placeholder="Details about this subject combination..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="flex-1" loading={isSaving}>
                            {editingPreset ? "Update Preset" : "Create Preset"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
