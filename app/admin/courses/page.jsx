"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    BookOpen,
    Plus,
    Search,
    MoreVertical,
    Clock,
    CreditCard,
    Edit2,
    Trash2
} from "lucide-react";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MultiSelect from "@/components/ui/MultiSelect";
import { useToast } from "@/contexts/ToastContext";

export default function CoursesPage() {
    const toast = useToast();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Actions State
    const { data: session } = useSession();
    const [editingCourse, setEditingCourse] = useState(null);
    const [deletingCourse, setDeletingCourse] = useState(null);
    const [activeMenu, setActiveMenu] = useState(null);
    const [institutes, setInstitutes] = useState([]);
    const [selectedInstitute, setSelectedInstitute] = useState("");

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        description: "",
        duration: { value: "", unit: "months" },
        fees: { amount: "", currency: "INR" },
        subjects: []
    });
    const [allSubjects, setAllSubjects] = useState([]);

    useEffect(() => {
        fetchCourses();
        fetchSubjects();
        if (session?.user?.role === 'super_admin') {
            fetchInstitutes();
        }
    }, [session, selectedInstitute]);

    const fetchInstitutes = async () => {
        try {
            const res = await fetch("/api/v1/institutes");
            const data = await res.json();
            setInstitutes(data.institutes || []);
        } catch (error) {
            console.error("Failed to fetch institutes", error);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenu(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchSubjects = async () => {
        try {
            const url = selectedInstitute
                ? `/api/v1/subjects?instituteId=${selectedInstitute}`
                : "/api/v1/subjects";
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setAllSubjects(data.subjects || []);
            }
        } catch (error) {
            console.error("Failed to fetch subjects", error);
        }
    };

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const url = selectedInstitute
                ? `/api/v1/courses?instituteId=${selectedInstitute}`
                : "/api/v1/courses";
            const res = await fetch(url);
            const data = await res.json();
            const list = Array.isArray(data) ? data : (Array.isArray(data?.courses) ? data.courses : []);
            setCourses(list);
        } catch (error) {
            console.error("Failed to fetch courses", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCourse = async (e) => {
        e.preventDefault();
        try {
            const url = editingCourse ? `/api/v1/courses/${editingCourse._id}` : "/api/v1/courses";
            const method = editingCourse ? "PATCH" : "POST";

            const res = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    fees: { ...formData.fees, amount: parseFloat(formData.fees.amount) || 0 }
                }),
            });

            if (res.ok) {
                setIsAddModalOpen(false);
                setEditingCourse(null);
                setFormData({ name: "", code: "", description: "", duration: { value: "", unit: "months" }, fees: { amount: "", currency: "INR" }, subjects: [] });
                fetchCourses();
                toast.success(editingCourse ? "Course updated successfully" : "Course created successfully");
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to save course");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to save course");
        }
    };

    const confirmDelete = async () => {
        if (!deletingCourse) return;
        try {
            const res = await fetch(`/api/v1/courses/${deletingCourse._id}`, {
                method: "DELETE"
            });

            if (res.ok) {
                setDeletingCourse(null);
                fetchCourses();
                toast.success("Course deleted successfully");
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to delete course");
            }
        } catch (err) {
            toast.error("Failed to delete course");
        }
    };

    const openEditModal = (course) => {
        setEditingCourse(course);
        setFormData({
            name: course.name,
            code: course.code,
            description: course.description || "",
            duration: {
                value: course.duration?.value || "",
                unit: course.duration?.unit || "months"
            },
            fees: {
                amount: course.fees?.amount || "",
                currency: course.fees?.currency || "INR"
            },
            subjects: course.subjects || []
        });
        setIsAddModalOpen(true);
        setActiveMenu(null);
    };

    // Filter Logic
    const filteredCourses = courses.filter(course =>
        course.name?.toLowerCase().includes(search.toLowerCase()) ||
        course.code?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Page Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div /> {/* Spacer for Title in Global Header */}
                {session?.user?.role !== 'instructor' && (
                    <Button 
                        onClick={() => {
                            setEditingCourse(null);
                            setFormData({ name: "", code: "", description: "", duration: { value: "", unit: "months" }, fees: { amount: "", currency: "INR" }, subjects: [] });
                            setIsAddModalOpen(true);
                        }} 
                        size="md" 
                        className="flex items-center gap-2 px-6 shadow-sm shadow-blue-500/10"
                    >
                        <Plus size={18} strokeWidth={2.5} />
                        <span>Add New Course</span>
                    </Button>
                )}
            </div>

            <Card className="overflow-hidden border-none shadow-premium">
                <CardHeader className="flex-col md:flex-row items-stretch md:items-center gap-4 space-y-0 bg-[#F9FAFB]/50 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-3 w-full">
                        {institutes.length > 0 && (
                            <div className="min-w-[200px]">
                                <Select
                                    value={selectedInstitute}
                                    onChange={(val) => setSelectedInstitute(val)}
                                    placeholder="All Institutes"
                                    buttonClassName="bg-white border-slate-200"
                                    options={[
                                        { label: "All Institutes", value: "" },
                                        ...institutes.map(i => ({ label: i.name, value: i._id }))
                                    ]}
                                />
                            </div>
                        )}
                        <div className="flex-1" />
                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-mono text-[10px]">
                            {filteredCourses.length} Courses Total
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12 flex justify-center"><LoadingSpinner /></div>
                    ) : filteredCourses.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-white">
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Course Detail</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Code</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Duration</th>
                                        {session?.user?.role !== 'instructor' && <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Total Fees</th>}
                                        {session?.user?.role !== 'instructor' && <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredCourses.map(course => (
                                        <tr key={course._id} className="group hover:bg-[#F9FAFB] transition-all duration-200">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-premium-purple/10 text-premium-purple flex items-center justify-center border border-premium-purple/10 shrink-0">
                                                        <BookOpen size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-[14px] leading-tight">{course.name}</h3>
                                                        <p className="text-[12px] text-slate-500 font-medium mt-0.5 line-clamp-1 max-w-[250px]">{course.description || "No description provided"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="code">{course.code}</Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[13px] font-bold text-slate-600">
                                                    {course.duration?.value} {course.duration?.unit}
                                                </span>
                                            </td>
                                            {session?.user?.role !== 'instructor' && (
                                                <td className="px-6 py-4">
                                                    <span className="text-[13px] font-black text-slate-900">
                                                        ₹{course.fees?.amount?.toLocaleString()}
                                                    </span>
                                                </td>
                                            )}
                                            {session?.user?.role !== 'instructor' && (
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openEditModal(course); }}
                                                            className="p-2 text-slate-400 hover:text-premium-blue hover:bg-blue-50 rounded-lg transition-all"
                                                            title="Edit Course"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDeletingCourse(course); }}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Delete Course"
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
                            <h3 className="text-lg font-bold text-slate-900 tracking-tight">No courses found</h3>
                            <p className="text-sm text-slate-500 font-medium max-w-[240px] mt-1">
                                {search ? "Try adjusting your search terms to find the course." : "Start by adding your first academic course."}
                            </p>
                            {!search && session?.user?.role !== 'instructor' && (
                                <Button 
                                    onClick={() => setIsAddModalOpen(true)}
                                    variant="outline"
                                    size="sm"
                                    className="mt-6"
                                >
                                    Add New Course
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title={editingCourse ? "Edit Course" : "Create New Course"}
            >
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">Course Details</div>
                <form onSubmit={handleSaveCourse} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            id="name"
                            label="Course Name"
                            placeholder="e.g. Master of Science"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <Input
                            id="code"
                            label="Course Code"
                            placeholder="e.g. MSC-CS"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            required
                        />
                    </div>
                    
                    <MultiSelect
                        label="Subjects (Optional)"
                        placeholder="Select subjects..."
                        options={allSubjects.map(sub => ({ label: sub.name, value: sub._id }))}
                        value={formData.subjects}
                        onChange={(val) => setFormData({ ...formData, subjects: val })}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid grid-cols-2 gap-2">
                            <Input
                                id="durationValue"
                                label="Duration"
                                type="number"
                                placeholder="e.g. 3"
                                value={formData.duration.value || ""}
                                onChange={(e) => setFormData({ ...formData, duration: { ...formData.duration, value: e.target.value } })}
                                required
                            />
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">Unit</label>
                                <Select
                                    value={formData.duration.unit}
                                    onChange={(val) => setFormData({ ...formData, duration: { ...formData.duration, unit: val } })}
                                    options={[
                                        { label: "Months", value: "months" },
                                        { label: "Weeks", value: "weeks" },
                                        { label: "Days", value: "days" }
                                    ]}
                                />
                            </div>
                        </div>
                        <Input
                            id="fees"
                            label="Total Fees (₹)"
                            type="number"
                            placeholder="e.g. 50000"
                            value={formData.fees.amount}
                            onChange={(e) => setFormData({ ...formData, fees: { ...formData.fees, amount: e.target.value } })}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">Description</label>
                        <textarea
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-premium-blue/50 focus:ring-4 focus:ring-premium-blue/10 min-h-[100px] text-sm text-slate-700 placeholder:text-slate-400 transition-all resize-none"
                            placeholder="Brief description of the course..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="flex-1">{editingCourse ? "Update Course" : "Create Course"}</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!deletingCourse}
                onClose={() => setDeletingCourse(null)}
                onConfirm={confirmDelete}
                title="Delete Course"
                message={`Are you sure you want to delete ${deletingCourse?.name}? This action cannot be undone.`}
            />
        </div>
    );
}
