"use client";
// Verified: app/admin/question-bank/create/page.jsx uses plain value in inline handlers. No change needed.

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Code } from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import Editor from 'react-simple-code-editor';
import 'prismjs/themes/prism-tomorrow.css';
import Prism from 'prismjs';

// CRITICAL: Prism components look for a global Prism object
if (typeof window !== 'undefined') {
    window.Prism = window.Prism || Prism;
}

// Now import languages
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-bash';

export default function CreateQuestionPage() {
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [bulkMode, setBulkMode] = useState(false);
    const [showSnippet, setShowSnippet] = useState(false);
    const questionRef = useRef(null);

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
        correctOption: 0,
        snippet: { code: "", language: "javascript" }
    });

    useEffect(() => {
        fetchDropdowns();
    }, []);

    useEffect(() => {
        if (formData.course) {
            const courseBatches = batches.filter(b =>
                String(b.course?._id || b.course) === String(formData.course)
            );
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
                ...(formData.type === "mcq" && {
                    correctAnswer: String(formData.correctOption)
                }),
                snippet: showSnippet ? formData.snippet : undefined
            };
            const res = await fetch("/api/v1/questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to create question");

            toast.success("Question created successfully");
            if (bulkMode) {
                setFormData(prev => ({
                    ...prev,
                    text: "",
                    options: ["", "", "", ""],
                    correctOption: 0,
                    snippet: { code: "", language: "javascript" }
                }));
                setShowSnippet(false);
                setLoading(false);
                // Focus back on the question text area
                setTimeout(() => {
                    questionRef.current?.focus();
                }, 100);
            } else {
                setTimeout(() => {
                    router.push("/admin/question-bank");
                }, 1000);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error creating question");
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
                <Card className="overflow-visible">
                    <CardContent className="p-6 space-y-6">
                        {/* Meta Data */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <Select
                                    label="Course *"
                                    name="course"
                                    value={formData.course}
                                    onChange={(val) => {
                                        setFormData(prev => ({ ...prev, course: val, batch: "" }));
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
                                    onChange={(val) => setFormData(prev => ({ ...prev, batch: val }))}
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
                                    onChange={(val) => setFormData(prev => ({ ...prev, difficulty: val }))}
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
                                    onChange={(val) => setFormData(prev => ({ ...prev, type: val }))}
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
                                ref={questionRef}
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
                        {/* Code Snippet Section */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                    <Code size={18} className="text-premium-blue" />
                                    Code Snippet (Optional)
                                </label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowSnippet(!showSnippet)}
                                    className="text-premium-blue font-bold text-xs"
                                >
                                    {showSnippet ? "Remove Snippet" : "Add Snippet"}
                                </Button>
                            </div>

                            {showSnippet && (
                                <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="md:w-1/2">
                                        <Select
                                            label="Language"
                                            value={formData.snippet.language}
                                            onChange={(val) => setFormData(prev => ({
                                                ...prev,
                                                snippet: { ...prev.snippet, language: val }
                                            }))}
                                            options={[
                                                { label: "JavaScript", value: "javascript" },
                                                { label: "Python", value: "python" },
                                                { label: "HTML", value: "html" },
                                                { label: "CSS", value: "css" },
                                                { label: "C++", value: "cpp" },
                                                { label: "Java", value: "java" },
                                                { label: "SQL", value: "sql" }
                                            ]}
                                        />
                                    </div>
                                    <div>
                                        <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900 min-h-[200px]">
                                            <Editor
                                                value={formData.snippet.code}
                                                onValueChange={code => setFormData(prev => ({
                                                    ...prev,
                                                    snippet: { ...prev.snippet, code }
                                                }))}
                                                highlight={code => {
                                                    if (!code) return "";
                                                    try {
                                                        const lang = formData.snippet.language === 'html' ? 'markup' : (formData.snippet.language || 'javascript');
                                                        const prismLang = Prism.languages[lang] || Prism.languages.javascript;
                                                        return Prism.highlight(code, prismLang, lang);
                                                    } catch (e) {
                                                        return code;
                                                    }
                                                }}
                                                padding={16}
                                                style={{
                                                    fontFamily: '"Fira code", "Fira Mono", monospace',
                                                    fontSize: 14,
                                                    minHeight: '200px',
                                                    outline: 'none'
                                                }}
                                                className="prism-editor"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-3 cursor-pointer select-none group bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 hover:border-premium-blue/30 transition-all">
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={bulkMode}
                                onChange={(e) => setBulkMode(e.target.checked)}
                            />
                            <div className={`w-10 h-5 rounded-full transition-colors ${bulkMode ? 'bg-premium-blue' : 'bg-slate-300'}`}></div>
                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${bulkMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                        <span className="text-sm font-bold text-slate-600 group-hover:text-premium-blue transition-colors">
                            Bulk Add Mode (Keep Filters)
                        </span>
                    </label>
                    <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                        <Button type="submit" disabled={loading} className="bg-premium-blue hover:bg-premium-blue/90 text-white min-w-[120px]">
                            {loading ? "Saving..." : <><Save size={18} className="mr-2" /> Save Question</>}
                        </Button>
                    </div>
                </div>
            </form>
        </div >
    );
}
