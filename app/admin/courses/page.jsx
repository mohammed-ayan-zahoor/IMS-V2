"use client";

import { useState, useEffect } from "react";
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
import ConfirmDialog from "@/components/ui/ConfirmDialog"; // Import ConfirmDialog
import { useToast } from "@/contexts/ToastContext";

export default function CoursesPage() {
    const toast = useToast();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Actions State
    const [editingCourse, setEditingCourse] = useState(null);
    const [deletingCourse, setDeletingCourse] = useState(null);
    const [activeMenu, setActiveMenu] = useState(null); // To toggle menu

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        description: "",
        duration: { value: "", unit: "months" },
        fees: { amount: "", currency: "INR" }
    });

    useEffect(() => {
        fetchCourses();
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenu(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/courses");
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
                    fees: { ...formData.fees, amount: parseFloat(formData.fees.amount) }
                }),
            });

            if (res.ok) {
                setIsAddModalOpen(false);
                setEditingCourse(null);
                setFormData({ name: "", code: "", description: "", duration: { value: "", unit: "months" }, fees: { amount: "", currency: "INR" } });
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
            }
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
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Course Management</h1>
                    <p className="text-slate-400 mt-1 text-sm font-medium">Design curriculum, set fees and manage academic programs.</p>
                </div>
                <Button onClick={() => {
                    setEditingCourse(null);
                    setFormData({ name: "", code: "", description: "", duration: { value: "", unit: "months" }, fees: { amount: "", currency: "INR" } });
                    setIsAddModalOpen(true);
                }} className="flex items-center gap-2 bg-premium-blue hover:bg-premium-blue/90 shadow-md shadow-blue-500/10">
                    <Plus size={18} />
                    <span>Add New Course</span>
                </Button>
            </div>

            <Card className="transition-all border-transparent shadow-sm overflow-visible">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                    <div className="flex-1 max-w-md relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400/50 transition-colors group-focus-within:text-premium-blue" size={18} />
                        <input
                            type="text"
                            placeholder="Search courses by name or code..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-premium-blue/30 focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <LoadingSpinner />
                    ) : filteredCourses.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="px-6 py-4">Course Name</th>
                                        <th className="px-6 py-4">Code</th>
                                        <th className="px-6 py-4">Duration</th>
                                        <th className="px-6 py-4">Total Fees</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredCourses.map(course => (
                                        <tr key={course._id} className="group hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100 shrink-0">
                                                        <BookOpen size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-sm">{course.name}</h3>
                                                        <p className="text-xs text-slate-500 line-clamp-1 max-w-[200px]">{course.description || "No description"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="primary" className="font-mono text-[10px]">{course.code}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={14} className="text-slate-400" />
                                                    <span className="capitalize">
                                                        {course?.duration?.value && course?.duration?.unit
                                                            ? `${course.duration.value} ${course.duration.unit}`
                                                            : "N/A"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-slate-400 font-normal">₹</span>
                                                    {course.fees?.amount?.toLocaleString() || "0"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState
                            icon={BookOpen}
                            title="No courses found"
                            description="Create your first course to get started."
                            actionLabel="Create Course"
                            onAction={() => {
                                setEditingCourse(null);
                                setFormData({ name: "", code: "", description: "", duration: { value: "", unit: "months" }, fees: { amount: "", currency: "INR" } });
                                setIsAddModalOpen(true);
                            }}
                        />
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
