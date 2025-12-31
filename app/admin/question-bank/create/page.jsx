"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

export default function CreateQuestionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Data state
    const [courses, setCourses] = useState([]);
    const [batches, setBatches] = useState([]); // All batches
    const [filteredBatches, setFilteredBatches] = useState([]); // Filtered by course

    const [formData, setFormData] = useState({
        text: "",
        course: "",
        batch: "",
        type: "mcq", // mcq, descriptive
        difficulty: "medium",
        marks: 1,
        options: ["", "", "", ""],
        correctOption: 0
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...formData.options];
        newOptions[index] = value;
        setFormData(prev => ({ ...prev, options: newOptions }));
    };

    const addOption = () => {
        setFormData(prev => ({ ...prev, options: [...prev.options, ""] }));
    };

    const removeOption = (index) => {
        if (formData.options.length <= 2) return;
        const newOptions = formData.options.filter((_, i) => i !== index);
        setFormData(prev => ({
            ...prev,
            options: newOptions,
            correctOption: prev.correctOption >= index && prev.correctOption > 0 ? prev.correctOption - 1 : prev.correctOption
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                marks: Number(formData.marks),
            };

            const res = await fetch("/api/v1/questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to create question");

            router.push("/admin/question-bank");
        } catch (error) {
            console.error(error);
            alert("Error creating question");
        } finally {
            setLoading(false);
        }
    };

    // Prepare Options
    const courseOptions = courses.map(c => ({ label: c.name, value: c._id }));
    const batchOptions = filteredBatches.map(b => ({ label: b.name, value: b._id }));
    const difficultyOptions = [
        { label: "Easy", value: "easy" },
        { label: "Medium", value: "medium" },
        { label: "Hard", value: "hard" }
    ];
    const typeOptions = [
        { label: "Multiple Choice (MCQ)", value: "mcq" },
        { label: "Descriptive / Text", value: "descriptive" }
    ];

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft size={20} />
                </Button>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Add New Question</h1>
                    <p className="text-slate-500">Create a question for the question bank.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardContent className="p-6 space-y-6">
                        {/* Meta Data */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <Select
                                    label="Course *"
                                    name="course"
                                    value={formData.course}
                                    onChange={(e) => {
                                        setFormData(prev => ({ ...prev, course: e.target.value, batch: "" }));
                                    }}
                                    options={courseOptions}
                                    placeholder="Select Course"
                                />
                            </div>
                            <div>
                                <Select
                                    label="Batch *"
                                    name="batch"
                                    value={formData.batch}
                                    onChange={handleChange}
                                    options={batchOptions}
                                    placeholder="Select Batch"
                                    disabled={!formData.course}
                                />
                            </div>
                            <div>
                                <Select
                                    label="Difficulty"
                                    name="difficulty"
                                    value={formData.difficulty}
                                    onChange={handleChange}
                                    options={difficultyOptions}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Select
                                    label="Question Type"
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    options={typeOptions}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Default Marks</label>
                                <Input
                                    type="number"
                                    name="marks"
                                    value={formData.marks}
                                    onChange={handleChange}
                                    min="0"
                                    required
                                />
                            </div>
                        </div>

                        {/* Question Text */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Question Text *</label>
                            <textarea
                                name="text"
                                value={formData.text}
                                onChange={handleChange}
                                className="w-full min-h-[150px] p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-premium-blue/20 outline-none resize-y font-medium text-slate-700"
                                placeholder="Enter your question here..."
                                required
                            />
                        </div>

                        {/* Options Section (MCQ Only) */}
                        {formData.type === "mcq" && (
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Answer Options</label>
                                <div className="space-y-3">
                                    {formData.options.map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="correctOption"
                                                checked={Number(formData.correctOption) === idx}
                                                onChange={() => setFormData({ ...formData, correctOption: idx })}
                                                className="w-5 h-5 text-premium-blue focus:ring-premium-blue"
                                            />
                                            <Input
                                                value={opt}
                                                onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                placeholder={`Option ${idx + 1}`}
                                                required
                                                className="flex-1"
                                            />
                                            {formData.options.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeOption(idx)}
                                                    className="p-2 text-slate-400 hover:text-red-500"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addOption}
                                    className="mt-2"
                                >
                                    <Plus size={16} className="mr-2" />
                                    Add Option
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={loading} className="bg-premium-blue hover:bg-premium-blue/90 text-white min-w-[120px]">
                        {loading ? "Saving..." : <><Save size={18} className="mr-2" /> Save Question</>}
                    </Button>
                </div>
            </form>
        </div>
    );
}
