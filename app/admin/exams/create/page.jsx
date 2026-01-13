"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Select from "@/components/ui/Select";
// Verified: Usage of Select component is compatible with onChange(value) signature.
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";

export default function CreateExamPage() {
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState([]);
    const [batches, setBatches] = useState([]); // All batches
    const [filteredBatches, setFilteredBatches] = useState([]); // Filtered by course

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        course: "",
        batches: [], // Array of batch IDs
        duration: 60,
        passingMarks: 0,
        maxAttempts: 1,
        scheduledAt: "",
        endAt: "",
        status: "draft",
        questions: [], // Intentionally empty
        resultPublication: "immediate"
    });
    useEffect(() => {
        fetchDropdowns();
    }, []);

    useEffect(() => {
        if (formData.course) {
            const courseBatches = batches.filter(b => b.course?._id === formData.course || b.course === formData.course);
            setFilteredBatches(courseBatches);
        } else {
            setFilteredBatches([]);
        }
    }, [formData.course, batches]);

    // Helper: Convert UTC string to Local DateTime string for input[type="datetime-local"]
    const toLocalISOString = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "";

        // Get local date components
        const pad = (n) => n.toString().padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());

        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const handleTimeChange = (val, field) => {
        if (!val) {
            setFormData(prev => ({ ...prev, [field]: "" }));
            return;
        }
        const localDate = new Date(val);
        if (isNaN(localDate.getTime())) return;

        setFormData(prev => ({
            ...prev,
            [field]: localDate.toISOString()
        }));
    };

    const handleDurationChange = (val) => {
        // Duration is now independent of End Time
        setFormData(prev => ({ ...prev, duration: Number(val) }));
    };

    const fetchDropdowns = async () => {
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
            console.error("Failed to fetch dropdowns", error);
        }
    };

    const handleBatchSelection = (batchId) => {
        setFormData(prev => {
            const newBatches = prev.batches.includes(batchId)
                ? prev.batches.filter(id => id !== batchId)
                : [...prev.batches, batchId];
            return { ...prev, batches: newBatches };
        });
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.course) {
            toast.warning("Please fill in basic exam details.");
            return;
        }

        if (!formData.scheduledAt || !formData.endAt) {
            toast.warning("Please specify both Start and End times.");
            return;
        }

        try {
            setLoading(true);

            const startTime = new Date(formData.scheduledAt);
            const endTime = new Date(formData.endAt);
            const minEndTime = new Date(startTime.getTime() + (Number(formData.duration) * 60000));

            // Logic Check: Window must accommodate duration
            if (endTime < minEndTime) {
                toast.warning(`End time must be at least ${formData.duration} mins after start time to allow full duration.`);
                setLoading(false);
                return;
            }

            const payload = {
                ...formData,
                scheduledAt: startTime.toISOString(),
                schedule: {
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString()
                }
            };

            const res = await fetch("/api/v1/exams", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                toast.success("Exam created! Now add some questions.");
                // Redirect to Manage Page to add questions
                router.push(`/admin/exams/${data.exam._id}/manage`);
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to create exam");
            }
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
                    <ArrowLeft size={18} />
                </Button>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create New Exam</h1>
                    <p className="text-slate-500">Set up the exam details. You can add questions in the next step.</p>
                </div>
            </div>

            <Card className="animate-fade-in">
                <div className="p-6 space-y-6">
                    <Input
                        label="Exam Title"
                        placeholder="e.g. Mid-Term Mathematics"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                    />
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Description / Instructions</label>
                        <textarea
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium text-slate-700 min-h-[100px]"
                            placeholder="Instructions for students..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Select Course</label>
                            <Select
                                value={formData.course}
                                onChange={(val) => setFormData({ ...formData, course: val, batches: [] })}
                                placeholder="-- Choose Course --"
                                options={[
                                    { label: "-- Choose Course --", value: "" },
                                    ...courses.map(c => ({ label: c.name, value: c._id }))
                                ]}
                            />
                        </div>
                        <Input
                            label="Duration (minutes) - Auto-calculated"
                            type="number"
                            value={formData.duration}
                            onChange={(e) => handleDurationChange(e.target.value)}
                        />
                    </div>

                    {formData.course && (
                        <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <label className="text-xs font-bold text-slate-500 uppercase">Assign Batches</label>
                            <div className="grid grid-cols-2 gap-2">
                                {filteredBatches.map(batch => (
                                    <label key={batch._id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-premium-blue transition-colors">                                        <input
                                        type="checkbox"
                                        className="w-4 h-4 text-premium-blue rounded focus:ring-premium-blue"
                                        checked={formData.batches.includes(batch._id)}
                                        onChange={() => handleBatchSelection(batch._id)}
                                    />
                                        <span className="text-sm font-bold text-slate-700">{batch.name}</span>
                                    </label>
                                ))}
                                {filteredBatches.length === 0 && <p className="text-sm text-slate-400 italic">No batches found for this course.</p>}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            label="Start Date & Time (Window Open)"
                            type="datetime-local"
                            value={toLocalISOString(formData.scheduledAt)}
                            onChange={(e) => handleTimeChange(e.target.value, "scheduledAt")}
                        />
                        <Input
                            label="End Date & Time (Window Close)"
                            type="datetime-local"
                            value={toLocalISOString(formData.endAt)}
                            onChange={(e) => handleTimeChange(e.target.value, "endAt")}
                        />
                        <Input
                            label="Passing Marks"
                            type="number"
                            value={formData.passingMarks}
                            onChange={(e) => setFormData({ ...formData, passingMarks: Number(e.target.value) })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Max Attempts"
                            type="number"
                            min="1"
                            value={formData.maxAttempts}
                            onChange={(e) => setFormData({ ...formData, maxAttempts: Number(e.target.value) })}
                        />
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

                    <div className="pt-6 flex justify-end">
                        <Button size="lg" onClick={handleSubmit} className="shadow-lg shadow-premium-blue/25">
                            <Save className="mr-2" size={18} />
                            Create Exam & Add Questions
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
