"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Save, GraduationCap, Award, Info, UserCheck } from "lucide-react";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import SubjectSelect from "@/components/ui/SubjectSelect";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";

export default function EditExamPage({ params }) {
    const router = useRouter();
    const toast = useToast();
    const { id } = use(params);
    const { data: session } = useSession();
    const isCollege = session?.user?.institute?.type === 'COLLEGE';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [courses, setCourses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [filteredBatches, setFilteredBatches] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [instructors, setInstructors] = useState([]);
    const [examSubjects, setExamSubjects] = useState([]);
    const [evaluatorAssignments, setEvaluatorAssignments] = useState([]);
    const [hasSubjectiveQs, setHasSubjectiveQs] = useState(false);

    const [formData, setFormData] = useState({
        title: "",
        instructions: "",
        course: "",
        semester: "",
        examCategory: "GENERAL",
        subject: null,
        batches: [],
        duration: 60,
        passingMarks: 0,
        scheduledAt: "",
        endTime: "",
        maxAttempts: 1,
        resultPublication: "after_exam_end",
        requiresManualGrading: false,
        status: "draft"
    });

    const fetchInitialData = async () => {
        try {
            const [coursesRes, examRes, subjectsRes, batchesRes, instructorsRes] = await Promise.all([
                fetch("/api/v1/courses"),
                fetch(`/api/v1/exams/${id}`),
                fetch("/api/v1/subjects"),
                fetch("/api/v1/batches"),
                fetch("/api/v1/users?role=instructor,admin,staff")
            ]);

            if (!coursesRes.ok || !examRes.ok) throw new Error("Failed to fetch initial data");

            const { courses: coursesData } = await coursesRes.json();
            const { exam } = await examRes.json();
            const sData = subjectsRes.ok ? await subjectsRes.json() : { subjects: [] };
            const bData = batchesRes.ok ? await batchesRes.json() : { batches: [] };
            const iData = instructorsRes.ok ? await instructorsRes.json() : { users: [] };

            setCourses(coursesData || []);
            setSubjects(sData.subjects || []);
            setBatches(bData.batches || []);
            setInstructors(iData.users || iData.data || []);

            // Detect if exam has subjective questions
            const subjTypes = ['short_answer', 'essay', 'descriptive'];
            const subjective = (exam.questions || []).some(q => subjTypes.includes(q.type));
            setHasSubjectiveQs(subjective || !!exam.requiresManualGrading);

            // Resolve human-readable subjects for evaluator assignment
            const allSubs = sData.subjects || [];
            const uniqueSubjects = [];
            const seenSubs = new Set();

            if (exam.subject) {
                const sid = String(exam.subject._id || exam.subject);
                const sObj = allSubs.find(s => String(s._id) === sid);
                seenSubs.add(sid);
                uniqueSubjects.push({ _id: sid, name: sObj?.name || exam.subject?.name || "Main Subject" });
            }

            for (const q of exam.questions || []) {
                const sid = q.subject?._id || q.subject;
                if (sid && !seenSubs.has(String(sid))) {
                    seenSubs.add(String(sid));
                    const sObj = allSubs.find(s => String(s._id) === String(sid));
                    uniqueSubjects.push({ _id: String(sid), name: sObj?.name || q.subject?.name || "Subject" });
                }
            }

            if (uniqueSubjects.length === 0 && (exam.course?.name || exam.title)) {
                uniqueSubjects.push({ _id: "default", name: exam.course?.name || exam.title });
            }

            setExamSubjects(uniqueSubjects);
            setEvaluatorAssignments(exam.evaluatorAssignments || []);

            // Helper to format date for input (YYYY-MM-DDTHH:mm)
            const formatDate = (dateStr) => {
                if (!dateStr) return "";
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return "";
                return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            };

            setFormData({
                title: exam.title || "",
                instructions: exam.instructions || "",
                course: exam.course?._id || exam.course || "",
                semester: exam.semester ? String(exam.semester) : "",
                examCategory: exam.examCategory || "GENERAL",
                subject: exam.subject?._id || exam.subject || null,
                batches: exam.batches ? exam.batches.map(b => b._id || b) : [],
                duration: exam.duration || 60,
                passingMarks: exam.passingMarks || 0,
                scheduledAt: formatDate(exam.schedule?.startTime || exam.scheduledAt),
                endTime: formatDate(exam.schedule?.endTime),
                maxAttempts: exam.maxAttempts || 1,
                resultPublication: exam.resultPublication || "after_exam_end",
                requiresManualGrading: exam.requiresManualGrading ?? false,
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

    useEffect(() => {
        if (formData.course) {
            let courseBatches = batches.filter(b => (b.course?._id || b.course) === formData.course);
            if (isCollege && formData.semester) {
                courseBatches = courseBatches.filter(b => {
                    if (b.semester) return b.semester === Number(formData.semester);
                    const match = b.name?.match(/sem(?:ester)?\s*(\d+)/i);
                    return match ? Number(match[1]) === Number(formData.semester) : false;
                });
            }
            setFilteredBatches(courseBatches);
        } else {
            setFilteredBatches([]);
        }
    }, [formData.course, formData.semester, batches, isCollege]);

    const handleBatchSelection = (batchId) => {
        setFormData(prev => {
            const current = [...prev.batches];
            const index = current.indexOf(batchId);
            if (index > -1) {
                current.splice(index, 1);
            } else {
                current.push(batchId);
            }
            return { ...prev, batches: current };
        });
    };

    const handleSubmit = async () => {
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
                instructions: formData.instructions,
                course: formData.course,
                semester: isCollege && formData.semester ? Number(formData.semester) : null,
                examCategory: isCollege ? formData.examCategory : undefined,
                subject: formData.subject,
                batches: formData.batches,
                duration: Number(formData.duration),
                passingMarks: Number(formData.passingMarks),
                schedule: {
                    startTime: start.toISOString(),
                    endTime: end.toISOString()
                },
                maxAttempts: Number(formData.maxAttempts),
                resultPublication: formData.resultPublication,
                requiresManualGrading: hasSubjectiveQs ? true : formData.requiresManualGrading,
                evaluatorAssignments: evaluatorAssignments
                    .filter(a => a.evaluator)
                    .map(a => ({
                        subject: a.subject === "default" ? (formData.subject || undefined) : a.subject,
                        evaluator: a.evaluator
                    })),
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
            router.push(`/admin/exams/${id}/manage`);
        } catch (err) {
            console.error(err);
            toast.error(err.message || "Failed to update exam");
        } finally {
            setSaving(false);
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
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Edit Exam</h1>
                    <p className="text-slate-500">Modify exam details and schedule.</p>
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
                        label="Duration (minutes)"
                        type="number"
                        min="1"
                        value={formData.duration}
                        onChange={(e) => setFormData(prev => ({ ...prev, duration: Number(e.target.value) }))}
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
                        value={formData.scheduledAt}
                        onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                        required
                    />
                    <Input
                        label="End Date & Time (Window Close)"
                        type="datetime-local"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        required
                    />
                    <Input
                        label="Passing Marks"
                        type="number"
                        min="0"
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
                        {hasSubjectiveQs ? (
                            <div>
                                <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 flex items-center justify-between">
                                    <span>Manual Release (After Grading/Review)</span>
                                    <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Locked</span>
                                </div>
                                <p className="text-[11px] text-amber-700 font-medium mt-1">
                                    Locked to Manual Release because this exam contains subjective questions requiring evaluation.
                                </p>
                            </div>
                        ) : (
                            <Select
                                value={formData.resultPublication}
                                onChange={(val) => setFormData({ ...formData, resultPublication: val })}
                                options={[
                                    { label: "After Exam Ends", value: "after_exam_end" },
                                    { label: "Manual Release (After Grading/Review)", value: "manual" }
                                ]}
                            />
                        )}
                    </div>
                </div>

                {hasSubjectiveQs && (
                    <div className="flex items-start gap-3.5 p-4 rounded-xl border border-amber-200 bg-amber-50/60 text-slate-700">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200">
                            <Info size={16} />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Manual Grading Required (Subjective Questions)</p>
                            <p className="text-xs text-amber-800 leading-relaxed">
                                This exam contains subjective or essay questions. Manual grading is automatically active and student scores are held until instructors complete evaluation.
                            </p>
                        </div>
                    </div>
                )}

                {/* Assign Evaluators Section */}
                {(hasSubjectiveQs || examSubjects.length > 0) && (
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                <UserCheck size={14} className="text-blue-600" />
                                Assign Evaluators
                            </label>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Select which instructor evaluates subjective answers for each subject.
                            </p>
                        </div>

                        <div className="space-y-2">
                            {examSubjects.map(sub => {
                                const currentAssignment = evaluatorAssignments.find(
                                    a => String(a.subject?._id || a.subject) === String(sub._id)
                                );
                                const currentEvalId = String(currentAssignment?.evaluator?._id || currentAssignment?.evaluator || "");

                                return (
                                    <div key={sub._id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-white border border-slate-200 rounded-xl">
                                        <div className="sm:w-64 shrink-0">
                                            <span className="text-sm font-bold text-slate-800">{sub.name}</span>
                                        </div>
                                        <div className="flex-1">
                                            <Select
                                                value={currentEvalId}
                                                onChange={val => {
                                                    setEvaluatorAssignments(prev => {
                                                        const filtered = prev.filter(a => String(a.subject?._id || a.subject) !== String(sub._id));
                                                        if (!val) return filtered;
                                                        return [...filtered, { subject: sub._id, evaluator: val }];
                                                    });
                                                }}
                                                placeholder="-- Choose Evaluator Instructor --"
                                                options={[
                                                    { label: "-- Not Assigned (Admins Only) --", value: "" },
                                                    ...instructors.map(u => {
                                                        const name = `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || u.name || u.email;
                                                        const role = u.instituteRole || u.role;
                                                        const formattedRole = role ? (role === 'instructor' ? 'Instructor' : role.charAt(0).toUpperCase() + role.slice(1)) : '';
                                                        return {
                                                            label: formattedRole ? `${name} (${formattedRole})` : name,
                                                            value: u._id
                                                        };
                                                    })
                                                ]}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase block">Exam Status</label>
                    <div className="flex flex-wrap gap-2.5">
                        {['draft', 'published', 'completed', 'archived'].map(status => (
                            <button
                                key={status}
                                type="button"
                                onClick={() => setFormData({ ...formData, status })}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                                    formData.status === status
                                        ? "bg-premium-blue text-white border-premium-blue shadow-sm"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                    {formData.status === 'published' && (
                        <div className="mt-2 flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                            <Info className="text-amber-500 mt-0.5 shrink-0" size={14} />
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
                        className="shadow-lg shadow-premium-blue/25 px-8"
                    >
                        {saving ? "Updating Exam..." : <><Save className="mr-2" size={18} /> Update Exam Details</>}
                    </Button>
                </div>
            </div>
        </div>
    );
}
