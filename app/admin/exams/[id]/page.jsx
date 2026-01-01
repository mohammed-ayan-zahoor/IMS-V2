"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Settings } from "lucide-react";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";

export default function EditExamPage({ params }) {
    const router = useRouter();
    const toast = useToast();
    const { id } = use(params);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [courses, setCourses] = useState([]);
    const [filteredBatches, setFilteredBatches] = useState([]); // Filtered by course

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        course: "",
        batches: [], // Array of batch IDs
        duration: 60,
        passingMarks: 0,
        scheduledAt: "",
        status: "draft"
    });

    useEffect(() => {
        fetchInitialData();
    }, [id]);

    useEffect(() => {
        if (formData.course) {
            const courseBatches = batches.filter(b => b.course?._id === formData.course || b.course === formData.course);
            setFilteredBatches(courseBatches);
        } else {
            setFilteredBatches([]);
        }
    }, [formData.course, batches]);

    const fetchInitialData = async () => {
        try {
            const [examRes, cRes, bRes] = await Promise.all([
                fetch(`/api/v1/exams/${id}`),
                fetch("/api/v1/courses"),
                fetch("/api/v1/batches")
            ]);

            const examData = await examRes.json();
            const cData = await cRes.json();
            const bData = await bRes.json();

            setCourses(cData.courses || []);
            setBatches(bData.batches || []);

            const exam = examData?.exam;
            if (!exam) {
                console.error("Exam data not found in response:", examData);
                setError("Exam not found or invalid response");
                setLoading(false);
                return;
            }

            // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
            const date = new Date(exam.scheduledAt);
            // Manually format to local string 'YYYY-MM-DDTHH:mm'
            // Note: date.toISOString() is UTC. To show in local input, we need local parts.
            // Simplest is to let user re-pick if they edit, or format correctly.
            // A trick is to subtract timezone offset.
            const tzOffset = date.getTimezoneOffset() * 60000; // in ms
            const localISOTime = (new Date(date - tzOffset)).toISOString().slice(0, 16); // This is wrong sign? 
            // date.getTime() is UTC. date.getTimezoneOffset() is +ve if behind UTC (e.g. PST is 480).
            // UTC - (+480) = Local? No. Local = UTC - Offset (where offset is like -480 for UTC+8)
            // JS getTimezoneOffset returns positive minutes for zones West of UTC.
            // So Local = UTC - (Offset * 60000).
            const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
            const formattedDate = localDate.toISOString().slice(0, 16);
            // Format for endTime if exists
            let formattedEndTime = "";
            if (exam.endTime) {
                const edate = new Date(exam.endTime);
                const elocalDate = new Date(edate.getTime() - edate.getTimezoneOffset() * 60000);
                formattedEndTime = elocalDate.toISOString().slice(0, 16);
            }

            setFormData({
                title: exam.title,
                description: exam.description || "",
                course: exam.course?._id || exam.course,
                batches: exam.batches.map(b => b._id || b),
                duration: exam.duration,
                passingMarks: exam.passingMarks,
                scheduledAt: exam.scheduledAt ? formattedDate : "", // Use localized format
                endTime: formattedEndTime,
                status: exam.status
            });

        } catch (error) {
            console.error("Failed to fetch data", error);
            setError("Failed to load exam data");
        } finally {
            setLoading(false);
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

        try {
            setLoading(true);

            // Convert local time back to ISO (UTC)
            const payload = {
                ...formData,
                scheduledAt: new Date(formData.scheduledAt).toISOString(),
                endTime: formData.endTime ? new Date(formData.endTime).toISOString() : null
            };

            const res = await fetch(`/api/v1/exams/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Exam details updated successfully!");
                router.back();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to update exam");
            }
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    if (error) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <Card>
                    <div className="p-6 text-center">
                        <p className="text-red-600 font-semibold">{error}</p>
                        <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
                    </div>
                </Card>
            </div>
        );
    }

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
                        <ArrowLeft size={18} />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Edit Exam Details</h1>
                        <p className="text-slate-500">Update exam metadata. To manage questions, go to the management page.</p>
                    </div>
                </div>
                <Button onClick={() => router.push(`/admin/exams/${id}/manage`)} variant="outline" className="font-bold border-slate-300">
                    <Settings size={18} className="mr-2" />
                    Manage Questions
                </Button>
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
                                onChange={(e) => setFormData({ ...formData, course: e.target.value, batches: [] })}
                                placeholder="-- Choose Course --"
                                options={[
                                    { label: "-- Choose Course --", value: "" },
                                    ...courses.map(c => ({ label: c.name, value: c._id }))
                                ]}
                            />
                        </div>
                        <Input
                            label="Duration (minutes)"
                            type="number"
                            value={formData.duration}
                            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        />
                    </div>

                    {formData.course && (
                        <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <label className="text-xs font-bold text-slate-500 uppercase">Assign Batches</label>
                            <div className="grid grid-cols-2 gap-2">
                                {filteredBatches.map(batch => (
                                    <label key={batch._id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-premium-blue transaction-colors">
                                        <input
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

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Schedule Date"
                            type="datetime-local"
                            value={formData.scheduledAt}
                            onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                        />
                        <Input
                            label="End Time (Deadline)"
                            type="datetime-local"
                            value={formData.endTime || ""}
                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                            helperText="Leave blank to enforce strict duration from start time."
                        />
                        <Input
                            label="Passing Marks"
                            type="number"
                            value={formData.passingMarks}
                            onChange={(e) => setFormData({ ...formData, passingMarks: e.target.value })}
                        />
                    </div>

                    {/* Status Toggle */}
                    <div className="pt-4 border-t border-slate-50">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Exam Status</label>
                        <div className="flex gap-4">
                            {['draft', 'published', 'completed'].map(status => (
                                <label key={status} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="status"
                                        className="text-premium-blue focus:ring-premium-blue"
                                        checked={formData.status === status}
                                        onChange={() => setFormData({ ...formData, status })}
                                    />
                                    <span className="text-sm font-bold capitalize text-slate-700">{status}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end">
                        <Button size="lg" onClick={handleSubmit} className="shadow-lg shadow-premium-blue/25">
                            <Save className="mr-2" size={18} />
                            Save Details
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
