"use client";

import { useState, useEffect } from "react";
import {
    BookOpen,
    Plus,
    Search,
    MoreVertical,
    Clock,
    CreditCard,
    Code,
    FileText
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";

export default function CoursesPage() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        description: "",
        duration: "",
        fees: { amount: "", currency: "INR" } // simplified for now
    });

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/courses");
            const data = await res.json();
            setCourses(data.courses || data || []); // Handle array or object return
        } catch (error) {
            console.error("Failed to fetch courses", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCourse = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/v1/courses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    fees: { ...formData.fees, amount: parseFloat(formData.fees.amount) }
                }),
            });

            if (res.ok) {
                setIsAddModalOpen(false);
                setFormData({ name: "", code: "", description: "", duration: "", fees: { amount: "", currency: "INR" } });
                fetchCourses();
            } else {
                const error = await res.json();
                alert(error.error || "Failed to create course");
            }
        } catch (err) {
            console.error(err);
        }
    };

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
                <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-premium-blue hover:bg-premium-blue/90 shadow-md shadow-blue-500/10">
                    <Plus size={18} />
                    <span>Add New Course</span>
                </Button>
            </div>

            <Card className="transition-all border-transparent shadow-sm">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                            {filteredCourses.map(course => (
                                <div key={course._id} className="group relative bg-white border border-slate-100 rounded-2xl p-5 hover:border-premium-blue/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all">
                                    <div className="absolute top-5 right-5">
                                        <button className="text-slate-300 hover:text-premium-blue transition-colors">
                                            <MoreVertical size={18} />
                                        </button>
                                    </div>
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100">
                                            <BookOpen size={22} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-lg">{course.name}</h3>
                                            <Badge variant="primary" className="mt-1 font-mono text-[10px]">{course.code}</Badge>
                                        </div>
                                    </div>

                                    <p className="text-slate-500 text-sm line-clamp-2 mb-6 h-10">
                                        {course.description || "No description provided."}
                                    </p>

                                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-t border-slate-50 pt-4">
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={14} />
                                            <span className="capitalize">{course.duration?.value} {course.duration?.unit}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <CreditCard size={14} />
                                            <span>₹{course.fees?.amount?.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={BookOpen}
                            title="No courses found"
                            description="Create your first course to get started."
                            actionLabel="Create Course"
                            onAction={() => setIsAddModalOpen(true)}
                        />
                    )}
                </CardContent>
            </Card>

            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Create New Course"
            >
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">Course Details</div>
                <form onSubmit={handleAddCourse} className="space-y-5">
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
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-premium-blue/50 focus:ring-4 focus:ring-premium-blue/10 text-sm text-slate-700 transition-all cursor-pointer"
                                    value={formData.duration.unit}
                                    onChange={(e) => setFormData({ ...formData, duration: { ...formData.duration, unit: e.target.value } })}
                                >
                                    <option value="months">Months</option>
                                    <option value="weeks">Weeks</option>
                                    <option value="days">Days</option>
                                </select>
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
                        <Button type="submit" className="flex-1">Create Course</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
