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
        passingMarks: 0,
        scheduledAt: "",
        maxAttempts: 1,
        resultPublication: "immediate",
        status: "draft"
    });

    useEffect(() => {
        fetchInitialData();
        // ... (lines 36-100 skipped)
        scheduledAt: exam.scheduledAt ? formattedDate : "", // Use localized format
            endTime: formattedEndTime,
                maxAttempts: exam.maxAttempts || 1,
                    resultPublication: exam.resultPublication || "immediate",
                        status: exam.status
    });

} catch (error) {
// ... (lines 105-256 skipped)
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
                    </div >

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
