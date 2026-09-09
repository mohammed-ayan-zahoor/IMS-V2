"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Code } from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";
import Editor from 'react-simple-code-editor';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

export default function EditQuestionPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [showSnippet, setShowSnippet] = useState(false);
    const questionRef = useRef(null);

    // Data state
    const [courses, setCourses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [filteredBatches, setFilteredBatches] = useState([]);
    const [filteredSubjects, setFilteredSubjects] = useState([]);
    const [chapterOptions, setChapterOptions] = useState([]);
    const [topicOptions, setTopicOptions] = useState([]);

    const [formData, setFormData] = useState({
        text: "",
        course: "",
        batch: "",
        subject: "",
        type: "mcq",
        difficulty: "medium",
        marks: 1,
        status: "draft",
        syllabus: "",
        chapter: "",
        topic: "",
        bloomsLevel: "",
        estimatedTimeSeconds: "",
        modelAnswer: "",
        rubric: "",
        options: ["", "", "", ""],
        correctOption: 0,
        correctMulti: [],
        correctAnswer: "",
        trueFalseAnswer: "true",
        matchPairs: [{ left: "", right: "" }, { left: "", right: "" }],
        snippet: { code: "", language: "javascript" }
    });

    useEffect(() => {
        fetchDropdowns();
        if (id) fetchQuestion();
    }, [id]);

    useEffect(() => {
        if (formData.course) {
            const courseBatches = batches.filter(b =>
                String(b.course?._id || b.course) === String(formData.course)
            );
            setFilteredBatches(courseBatches);

            const selectedCourse = courses.find(c => String(c._id) === String(formData.course));
            setFilteredSubjects(selectedCourse?.subjects || []);
        } else {
            setFilteredBatches([]);
            setFilteredSubjects([]);
        }
    }, [formData.course, batches, courses]);

    // Load chapters from syllabus/distinct
    useEffect(() => {
        if (!formData.course) { setChapterOptions([]); return; }
        const query = new URLSearchParams({ field: 'chapter', course: formData.course });
        if (formData.subject) query.set('subject', formData.subject);
        fetch(`/api/v1/questions/distinct?${query}`)
            .then(r => r.json())
            .then(d => setChapterOptions(d.values || []))
            .catch(() => setChapterOptions([]));
    }, [formData.course, formData.subject]);

    // Load topics cascading from selected subject & chapter
    useEffect(() => {
        if (!formData.subject) { setTopicOptions([]); return; }
        const params = new URLSearchParams({ field: 'topic', subject: formData.subject });
        if (formData.chapter) params.set('chapter', formData.chapter);
        fetch(`/api/v1/questions/distinct?${params}`)
            .then(r => r.json())
            .then(d => setTopicOptions(d.values || []))
            .catch(() => setTopicOptions([]));
    }, [formData.subject, formData.chapter]);

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
            toast.error("Failed to load courses and batches");
        }
    };

    const fetchQuestion = async () => {
        try {
            const res = await fetch(`/api/v1/questions/${id}`);
            if (!res.ok) throw new Error("Failed to fetch question");
            const data = await res.json();
            const q = data.question;

            let correctMulti = [];
            let matchPairs = [{ left: "", right: "" }, { left: "", right: "" }];

            if (q.type === 'multi_correct_mcq' && q.correctAnswer) {
                try {
                    correctMulti = Array.isArray(q.correctAnswer) ? q.correctAnswer : JSON.parse(q.correctAnswer);
                } catch { correctMulti = []; }
            }

            if (q.type === 'match_the_following' && q.correctAnswer) {
                try {
                    matchPairs = Array.isArray(q.correctAnswer) ? q.correctAnswer : JSON.parse(q.correctAnswer);
                } catch {
                    matchPairs = [{ left: "", right: "" }, { left: "", right: "" }];
                }
            }

            setFormData({
                text: q.text || "",
                course: q.course || "",
                batch: q.batch || "",
                subject: q.subject || "",
                type: q.type || "mcq",
                difficulty: q.difficulty || "medium",
                marks: q.marks || 1,
                status: q.status || "draft",
                syllabus: q.syllabus || "",
                chapter: q.chapter || "",
                topic: q.topic || "",
                bloomsLevel: q.bloomsLevel || "",
                estimatedTimeSeconds: q.estimatedTimeSeconds ? String(q.estimatedTimeSeconds) : "",
                modelAnswer: q.modelAnswer || "",
                rubric: q.rubric || "",
                options: q.options && q.options.length > 0 ? q.options : ["", "", "", ""],
                correctOption: q.type === 'mcq' && q.correctAnswer != null ?
                    Math.max(0, Math.min(Number(q.correctAnswer) || 0, (q.options?.length || 4) - 1)) : 0,
                correctMulti,
                correctAnswer: q.correctAnswer || "",
                trueFalseAnswer: q.type === 'true_false' && q.correctAnswer ? String(q.correctAnswer).toLowerCase() : "true",
                matchPairs: matchPairs.length > 0 ? matchPairs : [{ left: "", right: "" }, { left: "", right: "" }],
                snippet: q.snippet || { code: "", language: "javascript" }
            });

            if (q.snippet?.code) setShowSnippet(true);
        } catch (error) {
            console.error("Failed to fetch question", error);
            toast.error("Failed to load question details");
        } finally {
            setFetching(false);
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
        setFormData(prev => {
            let newCorrectOption = prev.correctOption;
            if (prev.correctOption === index) {
                newCorrectOption = 0;
            } else if (prev.correctOption > index) {
                newCorrectOption = prev.correctOption - 1;
            }
            return {
                ...prev,
                options: newOptions,
                correctOption: newCorrectOption,
                correctMulti: prev.correctMulti.filter(i => i !== index).map(i => i > index ? i - 1 : i)
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (formData.type === "mcq" || formData.type === "multi_correct_mcq") {
                const hasEmpty = formData.options.some(opt => !opt.trim());
                if (hasEmpty) {
                    toast.error("All option fields must be filled");
                    setLoading(false);
                    return;
                }
            }

            const payload = {
                text: formData.text,
                course: formData.course || null,
                batch: formData.batch || null,
                subject: formData.subject || null,
                type: formData.type,
                difficulty: formData.difficulty,
                marks: Number(formData.marks),
                status: formData.status,
                syllabus: formData.syllabus || undefined,
                chapter: formData.chapter || undefined,
                topic: formData.topic || undefined,
                bloomsLevel: formData.bloomsLevel || undefined,
                estimatedTimeSeconds: formData.estimatedTimeSeconds ? Number(formData.estimatedTimeSeconds) : undefined,
                modelAnswer: formData.modelAnswer || undefined,
                rubric: formData.rubric || undefined,
                snippet: showSnippet ? formData.snippet : undefined
            };

            if (formData.type === 'mcq') {
                payload.options = formData.options;
                payload.correctAnswer = String(formData.correctOption);
            } else if (formData.type === 'multi_correct_mcq') {
                payload.options = formData.options;
                payload.correctAnswer = JSON.stringify(formData.correctMulti);
            } else if (formData.type === 'true_false') {
                payload.correctAnswer = formData.trueFalseAnswer;
            } else if (formData.type === 'match_the_following') {
                payload.correctAnswer = JSON.stringify(formData.matchPairs);
            } else {
                payload.correctAnswer = formData.correctAnswer;
            }

            const res = await fetch(`/api/v1/questions/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to update question");
            }

            toast.success("Question updated successfully");
            setTimeout(() => router.push("/admin/question-bank"), 1000);
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Error updating question");
            setLoading(false);
        }
    };

    const courseOptions = courses.map(c => ({ label: c.name, value: c._id }));
    const batchOptions = filteredBatches.map(b => ({ label: b.name, value: b._id }));
    const subjectOptions = filteredSubjects.map(s => ({ label: s.name, value: s._id }));
    const difficultyOptions = [
        { label: "Easy", value: "easy" },
        { label: "Medium", value: "medium" },
        { label: "Hard", value: "hard" }
    ];
    const typeOptions = [
        { label: "Multiple Choice (MCQ)", value: "mcq" },
        { label: "Multi-Correct MCQ", value: "multi_correct_mcq" },
        { label: "True / False", value: "true_false" },
        { label: "Fill in the Blank", value: "fill_in_blank" },
        { label: "Short Answer", value: "short_answer" },
        { label: "Essay / Descriptive", value: "essay" },
        { label: "Numerical", value: "numerical" },
        { label: "Match the Following", value: "match_the_following" }
    ];
    const bloomsOptions = [
        { label: "None", value: "" },
        { label: "Remember", value: "remember" },
        { label: "Understand", value: "understand" },
        { label: "Apply", value: "apply" },
        { label: "Analyse", value: "analyse" },
        { label: "Evaluate", value: "evaluate" },
        { label: "Create", value: "create" }
    ];

    const isSubjective = ['short_answer', 'essay'].includes(formData.type);
    const hasOptions = ['mcq', 'multi_correct_mcq'].includes(formData.type);

    if (fetching) return <LoadingSpinner fullPage />;

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-12">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft size={20} />
                </Button>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Edit Question</h1>
                    <p className="text-slate-500">Update question metadata, content, and answers.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="overflow-visible rounded-[8px] shadow-premium">
                    <CardContent className="p-6 space-y-6">
                        {/* Course / Batch / Subject / Difficulty */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Select
                                label="Course *"
                                value={formData.course}
                                onChange={(val) => setFormData(prev => ({ ...prev, course: val, batch: "", subject: "" }))}
                                options={courseOptions}
                                placeholder="Select Course"
                            />
                            <Select
                                label="Batch *"
                                value={formData.batch}
                                onChange={(val) => setFormData(prev => ({ ...prev, batch: val }))}
                                options={batchOptions}
                                placeholder="Select Batch"
                                disabled={!formData.course}
                            />
                            <Select
                                label="Subject"
                                value={formData.subject}
                                onChange={(val) => setFormData(prev => ({ ...prev, subject: val }))}
                                options={subjectOptions}
                                placeholder="Select Subject"
                                disabled={!formData.course || subjectOptions.length === 0}
                            />
                            <Select
                                label="Difficulty"
                                value={formData.difficulty}
                                onChange={(val) => setFormData(prev => ({ ...prev, difficulty: val }))}
                                options={difficultyOptions}
                            />
                        </div>

                        {/* Type & Marks */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select
                                label="Question Type"
                                value={formData.type}
                                onChange={(val) => setFormData(prev => ({ ...prev, type: val }))}
                                options={typeOptions}
                            />
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Default Marks</label>
                                <Input type="number" name="marks" value={formData.marks} onChange={handleChange} min="0" required />
                            </div>
                        </div>

                        {/* Content Hierarchy */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                {chapterOptions.length > 0 ? (
                                    <Select
                                        label="Chapter / Module *"
                                        value={formData.chapter}
                                        onChange={val => setFormData(prev => ({ ...prev, chapter: val, topic: "" }))}
                                        options={[{ label: "Select Chapter / Module", value: "" }, ...chapterOptions.map(c => ({ label: c, value: c }))]}
                                        placeholder="Select Chapter / Module"
                                    />
                                ) : (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Chapter / Module</label>
                                        <input
                                            value={formData.chapter}
                                            onChange={e => setFormData(prev => ({ ...prev, chapter: e.target.value }))}
                                            className="w-full h-10 px-3 rounded-[8px] border border-slate-200 focus:ring-2 focus:ring-premium-blue/20 outline-none text-sm text-slate-700"
                                            placeholder="Select a subject to load chapters"
                                        />
                                    </div>
                                )}
                            </div>
                            <div>
                                {topicOptions.length > 0 ? (
                                    <Select
                                        label="Topic"
                                        value={formData.topic}
                                        onChange={val => setFormData(prev => ({ ...prev, topic: val }))}
                                        options={[{ label: "Select Topic", value: "" }, ...topicOptions.map(t => ({ label: t, value: t }))]}
                                        placeholder="Select Topic"
                                    />
                                ) : (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Topic</label>
                                        <Input name="topic" value={formData.topic} onChange={handleChange} placeholder={formData.chapter ? "e.g. Topic Name" : "Select chapter first"} />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Curriculum / Board</label>
                                <Input name="syllabus" value={formData.syllabus} onChange={handleChange} placeholder="e.g. Autonomous 2026, KTU, CBSE" />
                            </div>
                        </div>

                        {/* Extra metadata */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Select label="Bloom's Level" value={formData.bloomsLevel} onChange={v => setFormData(prev => ({ ...prev, bloomsLevel: v }))} options={bloomsOptions} />
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Est. Time (seconds)</label>
                                <Input type="number" name="estimatedTimeSeconds" value={formData.estimatedTimeSeconds} onChange={handleChange} placeholder="e.g. 120" min="0" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
                                <div className="flex gap-2 mt-1">
                                    {[{ v: 'draft', l: 'Draft' }, { v: 'approved', l: 'Approved' }].map(({ v, l }) => (
                                        <button key={v} type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, status: v }))}
                                            className={`flex-1 py-2 text-sm font-bold rounded-[8px] border transition-colors ${formData.status === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                            {l}
                                        </button>
                                    ))}
                                </div>
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
                                className="w-full min-h-[150px] p-4 rounded-[8px] border border-slate-200 focus:ring-2 focus:ring-premium-blue/20 outline-none resize-y font-medium text-slate-700"
                                placeholder="Enter your question here..."
                                required
                            />
                        </div>

                        {/* MCQ & Multi-Correct Options */}
                        {hasOptions && (
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <label className="block text-sm font-bold text-slate-700">Answer Options</label>
                                <div className="space-y-3">
                                    {formData.options.map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            {formData.type === 'multi_correct_mcq' ? (
                                                <input type="checkbox"
                                                    checked={formData.correctMulti.includes(idx)}
                                                    onChange={() => setFormData(prev => ({
                                                        ...prev,
                                                        correctMulti: prev.correctMulti.includes(idx)
                                                            ? prev.correctMulti.filter(i => i !== idx)
                                                            : [...prev.correctMulti, idx]
                                                    }))}
                                                    className="w-5 h-5 rounded text-premium-blue focus:ring-premium-blue"
                                                />
                                            ) : (
                                                <input type="radio" name="correctOption"
                                                    checked={Number(formData.correctOption) === idx}
                                                    onChange={() => setFormData({ ...formData, correctOption: idx })}
                                                    className="w-5 h-5 text-premium-blue focus:ring-premium-blue"
                                                />
                                            )}
                                            <Input value={opt} onChange={e => handleOptionChange(idx, e.target.value)} placeholder={`Option ${idx + 1}`} required className="flex-1" />
                                            {formData.options.length > 2 && (
                                                <button type="button" onClick={() => removeOption(idx)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <Button type="button" variant="outline" onClick={addOption} className="mt-2">
                                    <Plus size={16} className="mr-2" /> Add Option
                                </Button>
                            </div>
                        )}

                        {/* True/False */}
                        {formData.type === "true_false" && (
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <label className="block text-sm font-bold text-slate-700">Correct Answer</label>
                                <div className="flex gap-4">
                                    {["true", "false"].map(val => (
                                        <label key={val} className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-[8px] border-2 cursor-pointer transition-all font-bold text-sm ${formData.trueFalseAnswer === val ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 hover:border-slate-300 text-slate-600"}`}>
                                            <input type="radio" name="trueFalseAnswer" value={val} checked={formData.trueFalseAnswer === val} onChange={() => setFormData(prev => ({ ...prev, trueFalseAnswer: val }))} className="sr-only" />
                                            {val === "true" ? "True" : "False"}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Numerical */}
                        {formData.type === "numerical" && (
                            <div className="pt-4 border-t border-slate-100">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Correct Answer (number)</label>
                                <Input type="number" step="any" value={formData.correctAnswer} onChange={e => setFormData(prev => ({ ...prev, correctAnswer: e.target.value }))} placeholder="e.g. 42 or 3.14" required />
                            </div>
                        )}

                        {/* Fill in Blank */}
                        {formData.type === "fill_in_blank" && (
                            <div className="pt-4 border-t border-slate-100">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Expected Answer <span className="font-normal text-slate-400 text-xs">— use * as wildcard</span></label>
                                <Input value={formData.correctAnswer} onChange={e => setFormData(prev => ({ ...prev, correctAnswer: e.target.value }))} placeholder="e.g. *photosynthesis*" required />
                            </div>
                        )}

                        {/* Match the Following */}
                        {formData.type === "match_the_following" && (
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-bold text-slate-700">Match Pairs</label>
                                    <button type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, matchPairs: [...prev.matchPairs, { left: "", right: "" }] }))}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                        <Plus size={14} /> Add Pair
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-400 uppercase px-1">
                                    <span>Column A</span><span>Column B</span>
                                </div>
                                {formData.matchPairs.map((pair, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <Input value={pair.left} onChange={e => { const p = [...formData.matchPairs]; p[i] = { ...p[i], left: e.target.value }; setFormData(prev => ({ ...prev, matchPairs: p })); }} placeholder={`A${i + 1}`} className="flex-1" />
                                        <span className="text-slate-300 font-bold">→</span>
                                        <Input value={pair.right} onChange={e => { const p = [...formData.matchPairs]; p[i] = { ...p[i], right: e.target.value }; setFormData(prev => ({ ...prev, matchPairs: p })); }} placeholder={`B${i + 1}`} className="flex-1" />
                                        {formData.matchPairs.length > 2 && (
                                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, matchPairs: prev.matchPairs.filter((_, j) => j !== i) }))} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Short Answer / Essay model answer + rubric */}
                        {isSubjective && (
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Model Answer <span className="font-normal text-slate-400 text-xs">— shown to evaluator during grading</span></label>
                                    <textarea
                                        value={formData.modelAnswer}
                                        onChange={e => setFormData(prev => ({ ...prev, modelAnswer: e.target.value }))}
                                        className="w-full min-h-[100px] p-4 rounded-[8px] border border-slate-200 focus:ring-2 focus:ring-premium-blue/20 outline-none resize-y text-sm text-slate-700"
                                        placeholder="What a full-marks answer looks like..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Rubric / Marking Criteria <span className="font-normal text-slate-400 text-xs">— step-marking guide</span></label>
                                    <textarea
                                        value={formData.rubric}
                                        onChange={e => setFormData(prev => ({ ...prev, rubric: e.target.value }))}
                                        className="w-full min-h-[80px] p-4 rounded-[8px] border border-slate-200 focus:ring-2 focus:ring-premium-blue/20 outline-none resize-y text-sm text-slate-700"
                                        placeholder="e.g. 2 marks – correctly states law; 2 marks – example; 1 mark – clarity"
                                    />
                                </div>
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
                                        <div className="rounded-[8px] border border-slate-200 overflow-hidden bg-slate-900 min-h-[200px]">
                                            <Editor
                                                value={formData.snippet.code}
                                                onValueChange={code => setFormData(prev => ({
                                                    ...prev,
                                                    snippet: { ...prev.snippet, code }
                                                }))}
                                                highlight={code => {
                                                    if (!code) return "";
                                                    try {
                                                        const lang = formData.snippet.language || 'javascript';
                                                        return hljs.highlight(code, { language: lang }).value;
                                                    } catch {
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

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={loading} className="min-w-[120px] font-bold">
                        {loading ? "Saving..." : <><Save size={18} className="mr-2" /> Save Changes</>}
                    </Button>
                </div>
            </form>
        </div>
    );
}
