"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Save, GraduationCap, Award, Sparkles } from "lucide-react";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import SubjectSelect from "@/components/ui/SubjectSelect";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";

export default function CreateExamPage() {
    const router = useRouter();
    const toast = useToast();
    const { data: session } = useSession();
    const isCollege = session?.user?.institute?.type === 'COLLEGE';

    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState([]);
    const [batches, setBatches] = useState([]); // All batches
    const [filteredBatches, setFilteredBatches] = useState([]); // Filtered by course & semester
    const [subjects, setSubjects] = useState([]); // All subjects

    const [formData, setFormData] = useState({
        title: "",
        instructions: "",
        course: "",
        semester: "", // COLLEGE only: Semester 1, 2, ...
        examCategory: "GENERAL", // COLLEGE only: MID_TERM, INTERNAL, SEMESTER_END, PRACTICAL
        subject: null, // nullable subject ID
        batches: [], // Array of batch IDs
        duration: 60,
        passingMarks: 0,
        maxAttempts: 1,
        scheduledAt: "",
        endAt: "",
        status: "draft",
        questions: [], // Intentionally empty
        resultPublication: "after_exam_end",
        requiresManualGrading: false
    });
    useEffect(() => {
        fetchDropdowns();
    }, []);

    useEffect(() => {
        if (formData.course) {
            let courseBatches = batches.filter(b => b.course?._id === formData.course || b.course === formData.course);
            if (isCollege && formData.semester) {
                courseBatches = courseBatches.filter(b => {
                    if (b.semester) return b.semester === Number(formData.semester);
                    const match = b.name.match(/sem(?:ester)?\s*(\d+)/i);
                    return match ? Number(match[1]) === Number(formData.semester) : false;
                });
            }
            setFilteredBatches(courseBatches);
        } else {
            setFilteredBatches([]);
        }
        setFormData(prev => ({ ...prev, subject: null }));
    }, [formData.course, formData.semester, batches, isCollege]);

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
            const [cRes, bRes, sRes] = await Promise.all([
                fetch("/api/v1/courses"),
                fetch("/api/v1/batches"),
                fetch("/api/v1/subjects")
            ]);
            const cData = await cRes.json();
            const bData = await bRes.json();
            const sData = await sRes.json();
            setCourses(cData.courses || []);
            setBatches(bData.batches || []);
            setSubjects(sData.subjects || []);
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
            if (!payload.subject) {
                delete payload.subject;
            }

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
        <div className="w-full space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
                    <ArrowLeft size={18} />
                </Button>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create New Exam</h1>
                    <p className="text-slate-500">Set up the exam details. You can add questions in the next step.</p>
                </div>
            </div>

            <div className="space-y-6 animate-fade-in">
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
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-slate-400 transition-colors text-sm font-medium text-slate-700 min-h-[100px]"
                        placeholder="Instructions for students..."
                        value={formData.instructions}
                        onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    />
                </div>

                    {/* Course and College Specific Meta */}
                    <div className={`grid grid-cols-1 ${isCollege ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Select Course</label>
                            <Select
                                value={formData.course}
                                onChange={(val) => {
                                    setFormData(prev => ({ ...prev, course: val, semester: "", subject: null, batches: [] }));
                                }}
                                placeholder="-- Choose Course --"
                                options={[
                                    { label: "-- Choose Course --", value: "" },
                                    ...courses.map(c => ({ label: c.name, value: c._id }))
                                ]}
                            />
                        </div>

                        {isCollege && (
                            <>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                        <GraduationCap size={14} className="text-blue-600" />
                                        Semester
                                    </label>
                                    {(() => {
                                        const selectedCourse = courses.find(c => String(c._id) === String(formData.course));
                                        const totalSems = selectedCourse?.collegeConfig?.totalSemesters || 8;
                                        const semOptions = [
                                            { label: "-- All Semesters --", value: "" },
                                            ...Array.from({ length: totalSems }, (_, i) => ({
                                                label: `Semester ${i + 1}`,
                                                value: String(i + 1)
                                            }))
                                        ];
                                        return (
                                            <Select
                                                value={formData.semester}
                                                onChange={(val) => setFormData(prev => ({ ...prev, semester: val, subject: null, batches: [] }))}
                                                placeholder="-- Choose Semester --"
                                                disabled={!formData.course}
                                                options={semOptions}
                                            />
                                        );
                                    })()}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                        <Award size={14} className="text-blue-600" />
                                        Assessment Category
                                    </label>
                                    <Select
                                        value={formData.examCategory}
                                        onChange={(val) => setFormData(prev => ({ ...prev, examCategory: val }))}
                                        options={[
                                            { label: "Internal Assessment / IA", value: "INTERNAL" },
                                            { label: "Mid-Term Examination", value: "MID_TERM" },
                                            { label: "Semester End Exam (SEE)", value: "SEMESTER_END" },
                                            { label: "Practical / Lab Exam", value: "PRACTICAL" },
                                            { label: "Class Test / Quiz", value: "CLASS_TEST" },
                                            { label: "General Assessment", value: "GENERAL" }
                                        ]}
                                    />
                                </div>
                            </>
                        )}

                        <SubjectSelect
                            value={formData.subject}
                            onChange={(val) => setFormData(prev => ({ ...prev, subject: val }))}
                            subjects={subjects}
                            courses={courses}
                            selectedCourse={formData.course}
                            semester={isCollege ? formData.semester : null}
                        />

                        <Input
                            label="Duration (minutes) - Auto-calculated"
                            type="number"
                            value={formData.duration}
                            onChange={(e) => handleDurationChange(e.target.value)}
                        />
                    </div>

                    {formData.course && (
                        <div className="space-y-2 p-4 bg-white rounded-xl border border-slate-200">
                            <label className="text-xs font-bold text-slate-500 uppercase">
                                {isCollege ? "Assign Sections" : "Assign Batches"}
                                {isCollege && formData.semester ? ` (Semester ${formData.semester})` : ""}
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                {filteredBatches.map(batch => (
                                    <label key={batch._id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-premium-blue transition-colors">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-premium-blue rounded focus:ring-premium-blue"
                                            checked={formData.batches.includes(batch._id)}
                                            onChange={() => handleBatchSelection(batch._id)}
                                        />
                                        <span className="text-sm font-bold text-slate-700">{batch.name}</span>
                                    </label>
                                ))}
                                {filteredBatches.length === 0 && (
                                    <p className="text-sm text-slate-400 italic col-span-full">
                                        {isCollege && formData.semester 
                                            ? `No sections found for Semester ${formData.semester}.` 
                                            : `No ${isCollege ? 'sections' : 'batches'} found for this course.`}
                                    </p>
                                )}
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
                            <label className="text-xs font-bold text-slate-500 uppercase">Default Result Visibility</label>
                            <Select
                                value={formData.resultPublication}
                                onChange={(val) => setFormData({ ...formData, resultPublication: val })}
                                options={[
                                    { label: "After Exam Ends (Auto-holds if subjective questions added)", value: "after_exam_end" },
                                    { label: "Manual Release (After Grading/Review)", value: "manual" }
                                ]}
                            />
                        </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-4 rounded-xl border border-blue-100 bg-blue-50/50 text-slate-700">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-premium-blue flex items-center justify-center shrink-0 mt-0.5 border border-blue-200">
                            <Sparkles size={16} />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Intelligent Grading Detection</p>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Questions are selected on the next screen. If you include subjective questions (such as short answer or essay), the exam will <strong>automatically activate manual grading mode</strong> and prevent premature score release until instructors complete evaluation.
                            </p>
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end">
                        <Button size="lg" onClick={handleSubmit} className="shadow-lg shadow-premium-blue/25">
                            <Save className="mr-2" size={18} />
                            Create Exam & Add Questions
                        </Button>
                    </div>
            </div>
        </div>
    );
}
