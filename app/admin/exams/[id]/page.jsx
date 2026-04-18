"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Info } from "lucide-react";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import SubjectSelect from "@/components/ui/SubjectSelect";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";

export default function EditExamPage({ params }) {
    const router = useRouter();
    const toast = useToast();
    const { id } = use(params);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [courses, setCourses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        course: "",
        subject: null,
        batches: [],
        duration: 60,
        passingMarks: 0,
        scheduledAt: "",
        endTime: "",
        maxAttempts: 1,
        resultPublication: "immediate",
        status: "draft"
    });

    const fetchInitialData = async () => {
        try {
            const [coursesRes, examRes, subjectsRes] = await Promise.all([
                fetch("/api/v1/courses"),
                fetch(`/api/v1/exams/${id}`),
                fetch("/api/v1/subjects")
            ]);

            if (!coursesRes.ok || !examRes.ok) throw new Error("Failed to fetch initial data");

            const { courses: coursesData } = await coursesRes.json();
            const { exam } = await examRes.json();
            const sData = subjectsRes.ok ? await subjectsRes.json() : { subjects: [] };

            setCourses(coursesData || []);
            setSubjects(sData.subjects || []);

            // Helper to format date for input (YYYY-MM-DDTHH:mm)
            const formatDate = (dateStr) => {
                if (!dateStr) return "";
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return "";
                return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            };

            setFormData({
                title: exam.title || "",
                description: exam.description || "",
                course: exam.course?._id || exam.course || "",
                subject: exam.subject?._id || exam.subject || null,
                batches: exam.batches ? exam.batches.map(b => b._id || b) : [],
                duration: exam.duration || 60,
                passingMarks: exam.passingMarks || 0,
                scheduledAt: formatDate(exam.schedule?.startTime),
                endTime: formatDate(exam.schedule?.endTime),
                maxAttempts: exam.maxAttempts || 1,
                resultPublication: exam.resultPublication || "immediate",
                status: exam.status || "draft"
            });

        } catch (error) {
            console.error(error);
            toast.error("Failed to load exam details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchInitialData();
    }, [id]);

    const handleSubmit = async () => {
        // Validation
        if (!formData.title?.trim()) {
            toast.warning("Exam title is required");
            return;
        }
        if (!formData.course) {
            toast.warning("Please select a course for this exam");
            return;
        }
        if (!formData.scheduledAt || !formData.endTime) {
            toast.warning("Start and End times are required");
            return;
        }

        const start = new Date(formData.scheduledAt);
        const end = new Date(formData.endTime);
        if (end <= start) {
            toast.warning("End time must be after start time");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                title: formData.title.trim(),
                description: formData.description,
                course: formData.course,
                subject: formData.subject,
                duration: Number(formData.duration),
                passingMarks: Number(formData.passingMarks),
                schedule: {
                    startTime: start.toISOString(),
                    endTime: end.toISOString()
                },
                maxAttempts: Number(formData.maxAttempts),
                resultPublication: formData.resultPublication,
                status: formData.status
            };

            const res = await fetch(`/api/v1/exams/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to update exam");
            }

            toast.success("Exam details updated successfully");
            router.refresh(); 
        } catch (err) {
            console.error(err);
            toast.error(err.message || "Failed to update exam");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-12">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
                    <ArrowLeft size={20} />
                </Button>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Edit Exam</h1>
                    <p className="text-slate-500">Modify exam details and schedule.</p>
                </div>
            </div>

            <Card className="overflow-visible border-none shadow-premium">
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        <Input
                            label="Exam Title"
                            placeholder="Enter exam title..."
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Select Course</label>
                                <Select
                                    value={formData.course}
                                    onChange={(val) => setFormData({ ...formData, course: val, subject: null })}
                                    placeholder="-- Choose Course --"
                                    options={[
                                        { label: "-- Choose Course --", value: "" },
                                        ...courses.map(c => ({ label: c.name, value: c._id }))
                                    ]}
                                    required
                                />
                            </div>
                            <SubjectSelect
                                value={formData.subject}
                                onChange={(val) => setFormData({ ...formData, subject: val })}
                                subjects={subjects}
                                courses={courses}
                                selectedCourse={formData.course}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <Input
                                label="Schedule Date (Window Opens)"
                                type="datetime-local"
                                value={formData.scheduledAt}
                                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                                required
                            />
                            <Input
                                label="End Time (Window Closes)"
                                type="datetime-local"
                                value={formData.endTime}
                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                helperText="Window must be at least as long as examination duration."
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                label="Duration (Minutes)"
                                type="number"
                                min="1"
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                required
                            />
                            <Input
                                label="Passing Marks"
                                type="number"
                                min="0"
                                value={formData.passingMarks}
                                onChange={(e) => setFormData({ ...formData, passingMarks: e.target.value })}
                                required
                            />
                            <Input
                                label="Max Attempts"
                                type="number"
                                min="1"
                                value={formData.maxAttempts}
                                onChange={(e) => setFormData({ ...formData, maxAttempts: Number(e.target.value) })}
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Result Visibility</label>
                            <Select
                                value={formData.resultPublication}
                                onChange={(val) => setFormData({ ...formData, resultPublication: val })}
                                options={[
                                    { label: "Immediate (After Submit)", value: "immediate" },
                                    { label: "After Exam Ends", value: "after_exam_end" }
                                ]}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Exam Status</label>
                        <div className="flex flex-wrap gap-3">
                            {['draft', 'published', 'completed', 'archived'].map(status => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status })}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all border ${
                                        formData.status === status
                                            ? "bg-premium-blue text-white border-premium-blue shadow-md"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                    }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                        {formData.status === 'published' && (
                            <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                <Info className="text-amber-500 mt-0.5" size={14} />
                                <p className="text-[11px] text-amber-700 font-medium">
                                    Publishing an exam makes it visible to students at the scheduled start time. Ensure you have added questions before publishing.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="pt-6 flex justify-end">
                        <Button
                            size="lg"
                            onClick={handleSubmit}
                            disabled={saving}
                            className="w-full md:w-auto shadow-lg shadow-premium-blue/25 px-8"
                        >
                            {saving ? "Updating Exam..." : <><Save className="mr-2" size={18} /> Update Exam Details</>}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
