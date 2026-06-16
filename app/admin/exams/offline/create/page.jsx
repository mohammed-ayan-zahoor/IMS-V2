"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";

export default function CreateOfflineExamPage() {
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    
    // Dropdown Data
    const [courses, setCourses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [gradingScales, setGradingScales] = useState([]);
    const [subjects, setSubjects] = useState([]);
    
    const [filteredBatches, setFilteredBatches] = useState([]);
    const [filteredSubjects, setFilteredSubjects] = useState([]);

    const [formData, setFormData] = useState({
        title: "",
        examType: "quarterly",
        course: "",
        session: "",
        batches: [],
        gradingScale: "",
        weightagePercent: 100,
        isRankEnabled: true,
        status: "draft",
        entryDeadline: "",
        subjects: [],
        coScholastic: []
    });

    useEffect(() => {
        fetchDropdowns();
    }, []);

    useEffect(() => {
        if (formData.course) {
            const courseBatches = batches.filter(b => 
                (b.course?._id === formData.course || b.course === formData.course) &&
                (!formData.session || !b.session || b.session?._id === formData.session || b.session === formData.session)
            );
            setFilteredBatches(courseBatches);

            const courseObj = courses.find(c => c._id === formData.course);
            if (courseObj && courseObj.subjects) {
                const allowedSubIds = courseObj.subjects.map(s => s._id || s);
                setFilteredSubjects(subjects.filter(s => allowedSubIds.includes(s._id)));
            } else {
                setFilteredSubjects(subjects);
            }
        } else {
            setFilteredBatches([]);
            setFilteredSubjects([]);
        }
    }, [formData.course, formData.session, batches, courses, subjects]);

    const fetchDropdowns = async () => {
        try {
            const [cRes, bRes, sRes, sessRes, scaleRes] = await Promise.all([
                fetch("/api/v1/courses"),
                fetch("/api/v1/batches"),
                fetch("/api/v1/subjects"),
                fetch("/api/v1/sessions"),
                fetch("/api/v1/grading-scales")
            ]);
            const cData = await cRes.json();
            const bData = await bRes.json();
            const sData = await sRes.json();
            const sessData = await sessRes.json();
            const scaleData = await scaleRes.json();
            
            setCourses(cData.courses || []);
            setBatches(bData.batches || []);
            setSubjects(sData.subjects || []);
            
            const activeSession = sessData.sessions?.find(s => s.isActive === true);
            setSessions(sessData.sessions || []);
            setGradingScales(scaleData.gradingScales || []);

            if (activeSession) {
                setFormData(prev => ({ ...prev, session: activeSession._id }));
            }
        } catch (error) {
            toast.error("Failed to fetch dependencies");
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

    const addSubject = () => {
        setFormData(prev => ({
            ...prev,
            subjects: [...prev.subjects, { subject: "", maxMarks: 100, passingMarks: 33, examDate: "" }]
        }));
    };

    const removeSubject = (index) => {
        setFormData(prev => ({
            ...prev,
            subjects: prev.subjects.filter((_, i) => i !== index)
        }));
    };

    const updateSubject = (index, field, value) => {
        setFormData(prev => {
            const newSubs = [...prev.subjects];
            newSubs[index][field] = value;
            return { ...prev, subjects: newSubs };
        });
    };

    const addCoScholastic = () => {
        setFormData(prev => ({
            ...prev,
            coScholastic: [...prev.coScholastic, { paramName: "", ratingScale: "A-E" }]
        }));
    };

    const removeCoScholastic = (index) => {
        setFormData(prev => ({
            ...prev,
            coScholastic: prev.coScholastic.filter((_, i) => i !== index)
        }));
    };

    const updateCoScholastic = (index, field, value) => {
        setFormData(prev => {
            const newCos = [...prev.coScholastic];
            newCos[index][field] = value;
            return { ...prev, coScholastic: newCos };
        });
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.course || !formData.session) {
            return toast.warning("Title, Course, and Session are required.");
        }
        if (formData.subjects.length === 0) {
            return toast.warning("Please add at least one subject to the exam.");
        }
        if (formData.subjects.some(s => !s.subject)) {
            return toast.warning("Please select a subject for all rows.");
        }

        try {
            setLoading(true);
            const payload = { ...formData };
            if (!payload.gradingScale) delete payload.gradingScale;
            if (!payload.entryDeadline) delete payload.entryDeadline;

            const res = await fetch("/api/v1/offline-exams", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Offline Exam Created!");
                router.push("/admin/exams");
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to create exam");
            }
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
                    <ArrowLeft size={18} />
                </Button>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create Offline Exam</h1>
                    <p className="text-slate-500">Define the exam structure, max marks, and grading scale.</p>
                </div>
            </div>

            <Card className="p-6 space-y-8">
                {/* Section 1: Basic Info */}
                <div>
                    <h2 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">1. Basic Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Exam Title"
                            placeholder="e.g. Half-Yearly Examination 2026"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Exam Type</label>
                            <Select
                                value={formData.examType}
                                onChange={(val) => setFormData({ ...formData, examType: val })}
                                options={[
                                    { label: "Unit Test", value: "unit_test" },
                                    { label: "Monthly", value: "monthly" },
                                    { label: "Quarterly", value: "quarterly" },
                                    { label: "Half Yearly", value: "half_yearly" },
                                    { label: "Annual", value: "annual" },
                                    { label: "Pre-Board", value: "pre_board" },
                                    { label: "Custom", value: "custom" },
                                ]}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Session</label>
                            <Select
                                value={formData.session}
                                onChange={(val) => setFormData({ ...formData, session: val, batches: [] })}
                                options={sessions.map(s => ({ label: s.sessionName, value: s._id }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Course / Class</label>
                            <Select
                                value={formData.course}
                                onChange={(val) => setFormData({ ...formData, course: val, batches: [] })}
                                options={[{ label: "-- Select Class --", value: "" }, ...courses.map(c => ({ label: c.name, value: c._id }))]}
                            />
                        </div>
                    </div>
                </div>

                {/* Target Batches */}
                {formData.course && (
                    <div>
                        <h2 className="text-sm font-bold text-slate-700 mb-2">Target Batches / Sections</h2>
                        <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            {filteredBatches.length > 0 ? filteredBatches.map(batch => (
                                <label key={batch._id} className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-premium-blue transition-colors">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-premium-blue rounded"
                                        checked={formData.batches.includes(batch._id)}
                                        onChange={() => handleBatchSelection(batch._id)}
                                    />
                                    <span className="text-sm font-bold text-slate-700">{batch.name}</span>
                                </label>
                            )) : <p className="text-sm text-slate-400 italic">No batches found for this class.</p>}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">If none selected, it applies to all sections in the class.</p>
                    </div>
                )}

                {/* Section 2: Grading Rules */}
                <div>
                    <h2 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">2. Grading & Final Report Config</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Grading Scale</label>
                            <Select
                                value={formData.gradingScale}
                                onChange={(val) => setFormData({ ...formData, gradingScale: val })}
                                options={[
                                    { label: "-- Numeric Only (No Grade) --", value: "" },
                                    ...gradingScales.map(s => ({ label: s.name, value: s._id }))
                                ]}
                            />
                        </div>
                        <Input
                            label="Report Weightage (%)"
                            type="number"
                            min="0"
                            max="100"
                            value={formData.weightagePercent}
                            onChange={(e) => setFormData({ ...formData, weightagePercent: Number(e.target.value) })}
                        />
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Generate Ranks</label>
                            <Select
                                value={formData.isRankEnabled ? "yes" : "no"}
                                onChange={(val) => setFormData({ ...formData, isRankEnabled: val === "yes" })}
                                options={[
                                    { label: "Yes (1st, 2nd, etc.)", value: "yes" },
                                    { label: "No (Hide ranks)", value: "no" }
                                ]}
                            />
                        </div>
                    </div>
                </div>

                {/* Section 3: Scholastic Subjects */}
                <div>
                    <div className="flex justify-between items-end mb-4 pb-2 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-900">3. Scholastic Subjects (Marks)</h2>
                        <Button variant="outline" size="sm" onClick={addSubject}>
                            <Plus size={14} className="mr-1" /> Add Subject
                        </Button>
                    </div>
                    
                    <div className="space-y-3">
                        {formData.subjects.map((sub, i) => (
                            <div key={i} className="grid grid-cols-12 gap-3 items-end p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="col-span-4 space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Subject</label>
                                    <Select
                                        value={sub.subject}
                                        onChange={(val) => updateSubject(i, 'subject', val)}
                                        options={[
                                            { label: "-- Select --", value: "" },
                                            ...filteredSubjects.map(s => ({ label: s.name, value: s._id }))
                                        ]}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Input label="Max Marks" type="number" value={sub.maxMarks} onChange={(e) => updateSubject(i, 'maxMarks', Number(e.target.value))} />
                                </div>
                                <div className="col-span-2">
                                    <Input label="Pass Marks" type="number" value={sub.passingMarks} onChange={(e) => updateSubject(i, 'passingMarks', Number(e.target.value))} />
                                </div>
                                <div className="col-span-3">
                                    <Input label="Exam Date (Opt)" type="date" value={sub.examDate} onChange={(e) => updateSubject(i, 'examDate', e.target.value)} />
                                </div>
                                <div className="col-span-1 pb-1">
                                    <button onClick={() => removeSubject(i)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {formData.subjects.length === 0 && (
                            <p className="text-sm text-slate-500 italic text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                No subjects added. Click "Add Subject" to configure the exam structure.
                            </p>
                        )}
                    </div>
                </div>

                {/* Section 4: Co-Scholastic */}
                <div>
                    <div className="flex justify-between items-end mb-4 pb-2 border-b border-slate-100">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">4. Co-Scholastic Areas (Optional)</h2>
                            <p className="text-xs text-slate-500">e.g., Discipline, Art Education, Sports.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={addCoScholastic}>
                            <Plus size={14} className="mr-1" /> Add Parameter
                        </Button>
                    </div>
                    
                    <div className="space-y-3">
                        {formData.coScholastic.map((co, i) => (
                            <div key={i} className="grid grid-cols-12 gap-3 items-end p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                                <div className="col-span-7">
                                    <Input 
                                        label="Parameter Name" 
                                        placeholder="e.g. Work Education" 
                                        value={co.paramName} 
                                        onChange={(e) => updateCoScholastic(i, 'paramName', e.target.value)} 
                                    />
                                </div>
                                <div className="col-span-4 space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Rating Scale</label>
                                    <Select
                                        value={co.ratingScale}
                                        onChange={(val) => updateCoScholastic(i, 'ratingScale', val)}
                                        options={[
                                            { label: "A - E Grades", value: "A-E" },
                                            { label: "1 - 5 Scale", value: "1-5" }
                                        ]}
                                    />
                                </div>
                                <div className="col-span-1 pb-1">
                                    <button onClick={() => removeCoScholastic(i)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <Button size="lg" onClick={handleSubmit} disabled={loading} className="shadow-lg shadow-premium-blue/25">
                        <Save size={18} className="mr-2" />
                        {loading ? "Saving..." : "Create Offline Exam"}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
