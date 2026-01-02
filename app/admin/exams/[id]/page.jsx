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
        duration: 60,
        passingMarks: 0,
        scheduledAt: "", scheduledAt: "",
        maxAttempts: 1,
        resultPublication: "immediate",
        status: "draft"
    });

    const fetchInitialData = async () => {
        try {
            const [coursesRes, examRes] = await Promise.all([
                fetch("/api/v1/courses"),
                fetch(`/api/v1/exams/${id}`)
            ]);

            if (!coursesRes.ok || !examRes.ok) throw new Error("Failed to fetch initial data");

            const { courses: coursesData } = await coursesRes.json();
            const { exam } = await examRes.json();

            setCourses(coursesData);

            // Fetch batches if course is already selected
            if (exam.course) {
                const batchesRes = await fetch(`/api/v1/batches?courseId=${exam.course._id || exam.course}`);
                if (batchesRes.ok) {
                    const { batches: batchesData } = await batchesRes.json();
                    setFilteredBatches(batchesData);
                }
            }

            // Helpers to format date for input (YYYY-MM-DDTHH:mm)
            const formatDate = (dateStr) => {
                if (!dateStr) return "";
                const d = new Date(dateStr);
                return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            };

            setFormData({
                title: exam.title,
                description: exam.description || "",
                course: exam.course?._id || exam.course || "",
                batches: exam.batches ? exam.batches.map(b => b._id || b) : (exam.batch ? [exam.batch] : []), // Handle legacy batch
                duration: exam.duration,
                passingMarks: exam.passingMarks,
                scheduledAt: formatDate(exam.schedule.startTime),
                endTime: formatDate(exam.schedule.endTime),
                maxAttempts: exam.maxAttempts || 1,
                resultPublication: exam.resultPublication || "immediate",
                status: exam.status
            });

        } catch (error) {
            console.error(error);
            setError("Failed to load exam data");
            toast.error("Failed to load exam details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchInitialData();
    }, [id]);

    const handleSubmit = async () => {
        // ... (implementation needed or kept if elsewhere)
    };


    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
                label="Max Attempts"
                type="number"
                min="1"
                value={formData.maxAttempts}
                onChange={(e) => setFormData({ ...formData, maxAttempts: e.target.value })}
            />
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Result Visibility</label>
                <Select
                    value={formData.resultPublication}
                    onChange={(e) => setFormData({ ...formData, resultPublication: e.target.value })}
                    options={[
                        { label: "Immediate (After Submit)", value: "immediate" },
                        { label: "After Exam Ends", value: "after_exam_end" }
                    ]}
                />
            </div>
        </div>

    {/* Status Toggle */ }
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
                </div >
            </Card >
        </div >
    );
}
