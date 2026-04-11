"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    ArrowLeft, Users, Calendar, Clock, BookOpen, CheckSquare, Square,
    ChevronDown, ChevronRight, History, AlertCircle, BarChart3,
    User, MessageSquare, CheckCircle2, Circle, FileText, Download
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";

// ─── Progress Ring ────────────────────────────────────────────────────────────
function ProgressRing({ percent, size = 56 }) {
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (percent / 100) * circ;
    return (
        <svg width={size} height={size}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
            <circle
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="#3b82f6" strokeWidth="6" strokeDasharray={circ}
                strokeDashoffset={offset} strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
            <text x="50%" y="50%" textAnchor="middle" dy=".35em" fontSize="11" fill="#1e293b" fontWeight="700">
                {percent}%
            </text>
        </svg>
    );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
    { id: "overview", label: "Overview", icon: Users },
    { id: "progress", label: "Syllabus Progress", icon: BarChart3 },
    { id: "timeline", label: "Teaching Timeline", icon: History },
    { id: "marksheets", label: "Exams & Marksheets", icon: FileText }
];

// ─── Marksheets Tab Component ──────────────────────────────────────────────────
function MarksheetsTab({ batchId }) {
    const [studentsData, setStudentsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedStudent, setExpandedStudent] = useState(null);
    const [selectedExams, setSelectedExams] = useState({}); // { [studentId]: [examId1, examId2] }

    useEffect(() => {
        const fetchMarksheets = async () => {
            try {
                const res = await fetch(`/api/v1/batches/${batchId}/marksheets`);
                if (res.ok) {
                    const data = await res.json();
                    setStudentsData(data.students || []);
                    
                    // Pre-select all exams for convenience
                    const initialSelected = {};
                    (data.students || []).forEach(sd => {
                        initialSelected[sd.student._id] = sd.submissions.map(s => s.examId);
                    });
                    setSelectedExams(initialSelected);
                }
            } catch (error) {
                console.error("Failed to load marksheets", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMarksheets();
    }, [batchId]);

    const toggleExam = (studentId, examId) => {
        setSelectedExams(prev => {
            const current = prev[studentId] || [];
            if (current.includes(examId)) return { ...prev, [studentId]: current.filter(id => id !== examId) };
            return { ...prev, [studentId]: [...current, examId] };
        });
    };

    const generateMarksheet = (studentId) => {
        const exams = selectedExams[studentId] || [];
        if (exams.length === 0) {
            alert("Please select at least one exam to generate a marksheet.");
            return;
        }
        window.open(`/admin/batches/${batchId}/students/${studentId}/marksheet?exams=${exams.join(',')}`, '_blank');
    };

    if (loading) return <LoadingSpinner />;
    if (studentsData.length === 0) return <div className="text-center py-12 text-slate-400">No active students or exam submissions found for this batch.</div>;

    return (
        <div className="space-y-4">
            {studentsData.map(({ student, submissions }) => {
                const isExpanded = expandedStudent === student._id;
                const hasSubmissions = submissions.length > 0;
                
                return (
                    <div key={student._id} className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden transition-all hover:border-slate-300">
                        {/* Student Row */}
                        <div 
                            onClick={() => setExpandedStudent(isExpanded ? null : student._id)}
                            className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                    {student.fullName ? student.fullName[0].toUpperCase() : '?'}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 leading-none mb-1.5">{student.fullName}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Reg: {student.enrollmentNumber}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-xl font-black text-slate-800 leading-none mb-1">{submissions.length}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Exams Taken</p>
                                </div>
                                <div className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                    <ChevronDown size={20} />
                                </div>
                            </div>
                        </div>

                        {/* Expanded Menu */}
                        {isExpanded && (
                            <div className="border-t border-slate-100 p-5 bg-slate-50/50">
                                {!hasSubmissions ? (
                                    <p className="text-xs text-slate-500 font-medium py-3 text-center">This student hasn't completed any exams yet.</p>
                                ) : (
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3 ml-1">Select Exams to Include</h4>
                                            <div className="space-y-2">
                                                {submissions.map(sub => {
                                                    const isChecked = selectedExams[student._id]?.includes(sub.examId);
                                                    return (
                                                        <div 
                                                            key={sub.examId} 
                                                            onClick={() => toggleExam(student._id, sub.examId)}
                                                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                                                                isChecked ? 'bg-white border-premium-blue shadow-sm' : 'bg-white border-slate-200'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <button className={`focus:outline-none ${isChecked ? 'text-premium-blue' : 'text-slate-300'}`}>
                                                                    {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                                                                </button>
                                                                <div>
                                                                    <p className={`text-[13px] font-bold ${isChecked ? 'text-slate-800' : 'text-slate-600'}`}>
                                                                         {sub.title}
                                                                    </p>
                                                                    <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
                                                                        {sub.subjectName}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right flex items-center gap-4">
                                                                <Badge variant="success" className="text-[10px]">{sub.score} / {sub.totalMarks}</Badge>
                                                                <span className="text-[13px] font-black text-slate-800 w-12 text-right">{sub.percentage.toFixed(0)}%</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-2">
                                            <button 
                                                onClick={() => generateMarksheet(student._id)}
                                                disabled={selectedExams[student._id]?.length === 0}
                                                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                                            >
                                                <Download size={16} /> Generate Combined Marksheet
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function BatchDetailPage() {
    const { id: batchId } = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const toast = useToast();

    const [batch, setBatch] = useState(null);
    const [progressList, setProgressList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");
    const [expandedChapters, setExpandedChapters] = useState({});
    const [markingItem, setMarkingItem] = useState(null); // itemId being toggled

    const canMark = session?.user?.role === 'instructor' || session?.user?.role === 'admin' || session?.user?.role === 'super_admin';

    // ── Fetch batch ───────────────────────────────────────────────────────────
    const fetchBatch = useCallback(async () => {
        try {
            const res = await fetch(`/api/v1/batches/${batchId}`);
            const data = await res.json();
            setBatch(data.batch || data);
        } catch { toast.error("Failed to load batch"); }
    }, [batchId]);

    // ── Fetch progress for this batch ─────────────────────────────────────────
    const fetchProgress = useCallback(async () => {
        try {
            const res = await fetch(`/api/v1/syllabus-progress?batchId=${batchId}`);
            const data = await res.json();
            setProgressList(data.progressList || []);
        } catch { /* silently ignore — batch may have no progress yet */ }
    }, [batchId]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([fetchBatch(), fetchProgress()]);
            setLoading(false);
        };
        load();
    }, [fetchBatch, fetchProgress]);

    // ── Ensure progress tracker exists for each subject in course ─────────────
    useEffect(() => {
        if (!batch?.course?.subjects?.length) return;
        const ensureTrackers = async () => {
            for (const subjectId of batch.course.subjects) {
                const sid = typeof subjectId === 'object' ? subjectId._id : subjectId;
                await fetch('/api/v1/syllabus-progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ batchId, subjectId: sid })
                });
            }
            await fetchProgress();
        };
        ensureTrackers();
    }, [batch]);

    // ── Mark / Unmark a syllabus item ─────────────────────────────────────────
    const handleMark = async (progressId, payload) => {
        setMarkingItem(payload.itemId);
        try {
            const res = await fetch(`/api/v1/syllabus-progress/${progressId}/mark`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                await fetchProgress();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to update progress");
            }
        } catch { toast.error("Failed to update progress"); }
        finally { setMarkingItem(null); }
    };

    // ── Build flat timeline from all completions ───────────────────────────────
    const timeline = progressList
        .flatMap(p => (p.completions || [])
            .filter(c => c.isCompleted && c.completedAt)
            .map(c => ({
                ...c,
                subjectName: p.subject?.name,
                subjectCode: p.subject?.code,
                progressId: p._id
            }))
        )
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    // Helper: find item title by traversing syllabus
    const findItemTitle = (syllabus, c) => {
        for (const ch of (syllabus || [])) {
            if (String(ch._id) === String(c.chapterId)) {
                if (c.itemType === 'chapter') return { chapter: ch.title };
                for (const tp of (ch.topics || [])) {
                    if (String(tp._id) === String(c.topicId)) {
                        if (c.itemType === 'topic') return { chapter: ch.title, topic: tp.title };
                        for (const st of (tp.subTopics || [])) {
                            if (String(st._id) === String(c.itemId))
                                return { chapter: ch.title, topic: tp.title, subTopic: st.title };
                        }
                    }
                }
            }
        }
        return {};
    };

    if (loading) return <LoadingSpinner />;
    if (!batch) return <div className="text-slate-400 text-center py-20">Batch not found.</div>;

    const startDate = batch.schedule?.startDate ? new Date(batch.schedule.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
    const endDate = batch.schedule?.endDate ? new Date(batch.schedule.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Ongoing';

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-16">
            {/* Header */}
            <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
                <button onClick={() => router.push('/admin/batches')} className="p-2 mt-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{batch.name}</h1>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <Badge variant="primary" className="text-[10px] font-mono">{batch.course?.code || batch.course?.name}</Badge>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar size={11} /> {startDate} → {endDate}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Users size={11} /> {batch.activeEnrollmentCount || 0} active students
                        </span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === tab.id
                                ? 'border-premium-blue text-premium-blue'
                                : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            <Icon size={15} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ── TAB: Overview ────────────────────────────────────────────────── */}
            {activeTab === "overview" && (
                <div className="space-y-5">
                    <div className="bg-white border border-slate-100 rounded-xl shadow-sm flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        {[
                            { label: "Start Date", value: startDate, icon: Calendar },
                            { label: "End Date", value: endDate, icon: Clock },
                            { label: "Capacity", value: `${batch.activeEnrollmentCount || 0} / ${batch.capacity || '—'}`, icon: Users },
                            { label: "Instructor", value: batch.instructor ? `${batch.instructor.profile?.firstName || ''} ${batch.instructor.profile?.lastName || ''}`.trim() : 'Not assigned', icon: User },
                        ].map(({ label, value, icon: Icon }) => (
                            <div key={label} className="flex-1 px-5 py-3.5 flex items-center gap-3">
                                <Icon size={16} className="text-slate-400 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">{label}</p>
                                    <p className="text-sm font-bold text-slate-800 leading-none">{value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Enrolled Students */}
                    <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-50 flex items-center gap-2">
                            <Users size={14} className="text-slate-400" />
                            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Enrolled Students</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {(batch.enrolledStudents || []).length === 0 && (
                                <p className="text-xs text-slate-400 text-center py-8">No students enrolled yet.</p>
                            )}
                            {(batch.enrolledStudents || []).map(({ student, status, enrolledAt }) => (
                                <div key={student?._id} className="flex items-center gap-3 px-5 py-3">
                                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                        {student?.profile?.firstName?.[0] || '?'}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-slate-800">
                                            {student?.profile?.firstName} {student?.profile?.lastName}
                                        </p>
                                    </div>
                                    <Badge variant={status === 'active' ? 'success' : 'secondary'} className="text-[10px]">
                                        {status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB: Syllabus Progress ───────────────────────────────────────── */}
            {activeTab === "progress" && (
                <div className="space-y-5">
                    {progressList.length === 0 && (
                        <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl">
                            <BookOpen size={32} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-500 font-medium">No subjects assigned to this course yet</p>
                            <p className="text-slate-400 text-sm mt-1">Add subjects to the course and build a syllabus first.</p>
                        </div>
                    )}

                    {progressList.map(pg => {
                        const subject = pg.subject;
                        const syllabus = subject?.syllabus || [];
                        const completedIds = new Set(
                            (pg.completions || []).filter(c => c.isCompleted).map(c => String(c.itemId))
                        );

                        return (
                            <div key={pg._id} className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                                {/* Subject header with progress ring */}
                                <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-50 bg-slate-50/40">
                                    <ProgressRing percent={pg.overallProgress || 0} />
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-800">{subject?.name}</h3>
                                        <p className="text-xs text-slate-400">{subject?.code} · {syllabus.length} chapters</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400">Completed</p>
                                        <p className="text-sm font-bold text-slate-700">{completedIds.size} items</p>
                                    </div>
                                </div>

                                {/* Chapters accordion */}
                                <div className="divide-y divide-slate-50">
                                    {syllabus.length === 0 && (
                                        <p className="text-xs text-slate-400 text-center py-6">
                                            No syllabus defined for this subject yet.
                                        </p>
                                    )}
                                    {syllabus.map((ch, ci) => {
                                        const chKey = `${pg._id}-${ch._id}`;
                                        const isOpen = expandedChapters[chKey] !== false;
                                        const chDone = completedIds.has(String(ch._id));

                                        return (
                                            <div key={ch._id} className="border-b last:border-0 border-slate-100 relative group/chapter">
                                                {(() => {
                                                    const chProgress = (() => {
                                                        let totalLeaves = 0; let doneLeaves = 0;
                                                        if (!ch.topics?.length) return completedIds.has(String(ch._id)) ? 100 : 0;
                                                        ch.topics.forEach(tp => {
                                                            if (!tp.subTopics?.length) { totalLeaves++; if (completedIds.has(String(tp._id))) doneLeaves++; }
                                                            else { tp.subTopics.forEach(st => { totalLeaves++; if (completedIds.has(String(st._id))) doneLeaves++; }); }
                                                        });
                                                        return totalLeaves === 0 ? 0 : Math.round((doneLeaves / totalLeaves) * 100);
                                                    })();
                                                    
                                                    return (
                                                        <div className="pt-2 pb-2">
                                                            {/* Chapter Header */}
                                                            <div className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/80 transition-colors rounded-lg mx-2 mb-2">
                                                                <button onClick={() => setExpandedChapters(p => ({ ...p, [chKey]: !isOpen }))} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors shadow-sm">
                                                                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                                </button>
                                                                
                                                                <div className="flex-1 flex items-center gap-3">
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${chDone ? 'bg-green-100 text-green-600' : 'bg-premium-blue/10 text-premium-blue'}`}>
                                                                        <BookOpen size={18} />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <h4 className={`text-[16px] font-bold tracking-tight ${chDone ? 'text-slate-400 line-through' : 'text-slate-900'}`}>Chapter {ci + 1}: {ch.title}</h4>
                                                                        <div className="flex items-center gap-3 mt-1.5 w-full max-w-md">
                                                                            <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                                                <div className={`h-full transition-all duration-500 ${chProgress === 100 ? 'bg-green-500' : 'bg-premium-blue'}`} style={{ width: `${chProgress}%` }} />
                                                                            </div>
                                                                            <span className="text-[11px] font-black text-slate-400 tracking-wider font-mono">{chProgress}%</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Primary Action Button */}
                                                                <div className="shrink-0 flex items-center gap-2 opacity-0 group-hover/chapter:opacity-100 transition-opacity">
                                                                    {canMark && (
                                                                        <button
                                                                            disabled={markingItem === ch._id}
                                                                            onClick={() => handleMark(String(pg._id), {
                                                                                itemId: ch._id, itemType: 'chapter', chapterId: ch._id, topicId: null, isCompleted: !chDone
                                                                            })}
                                                                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors flex items-center gap-2 ${chDone ? 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100' : 'bg-white border-slate-200 text-slate-700 hover:border-premium-blue hover:text-premium-blue shadow-sm'}`}
                                                                        >
                                                                            {chDone ? <><CheckCircle2 size={14}/> Completed</> : <><Square size={14}/> Mark Chapter Done</>}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Topics Tree */}
                                                            {isOpen && (
                                                                <div className="relative pl-12 pb-4">
                                                                    <div className="absolute left-[39px] top-0 bottom-6 w-[2px] bg-slate-100 rounded-full" />
                                                                    
                                                                    {(ch.topics || []).map((tp, ti) => {
                                                                        const tpDone = completedIds.has(String(tp._id));
                                                                        const tpProgress = (() => {
                                                                            if (!tp.subTopics?.length) return tpDone ? 100 : 0;
                                                                            const doneSubs = tp.subTopics.filter(st => completedIds.has(String(st._id))).length;
                                                                            return Math.round((doneSubs / tp.subTopics.length) * 100);
                                                                        })();
                                                                        
                                                                        return (
                                                                            <div key={tp._id} className="relative mt-3 group/topic">
                                                                                {/* Horizontal Connector */}
                                                                                <div className="absolute left-[-26px] top-6 w-6 h-[2px] bg-slate-100 rounded-full" />
                                                                                
                                                                                <div className="bg-white border border-slate-200 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] mr-5 ml-2 hover:border-slate-300 transition-colors overflow-hidden">
                                                                                    
                                                                                    {/* Topic Header */}
                                                                                    <div className={`flex items-center gap-3 px-5 py-3 ${tpDone ? 'bg-green-50/30' : 'bg-slate-50/50'}`}>
                                                                                        <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${tpDone ? 'bg-green-200 text-green-700' : 'bg-slate-200 text-slate-600 shadow-inner'}`}>
                                                                                            <span className="text-[11px] font-black font-mono">{ci+1}.{ti+1}</span>
                                                                                        </div>
                                                                                        <div className="flex-1">
                                                                                            <h5 className={`text-[14px] font-semibold tracking-tight ${tpDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{tp.title}</h5>
                                                                                            {tp.subTopics?.length > 0 && (
                                                                                                <div className="flex items-center gap-3 mt-1.5 w-full max-w-[200px]">
                                                                                                    <div className="h-1.5 flex-1 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                                                                                        <div className={`h-full transition-all duration-500 ${tpProgress === 100 ? 'bg-green-500' : 'bg-slate-500'}`} style={{ width: `${tpProgress}%` }} />
                                                                                                    </div>
                                                                                                    <span className="text-[10px] font-bold text-slate-400 font-mono">{tpProgress}%</span>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                        
                                                                                        <div className="opacity-0 group-hover/topic:opacity-100 transition-opacity">
                                                                                            {canMark && (
                                                                                                <button
                                                                                                    disabled={markingItem === tp._id}
                                                                                                    onClick={() => handleMark(String(pg._id), {
                                                                                                        itemId: tp._id, itemType: 'topic', chapterId: ch._id, topicId: tp._id, isCompleted: !tpDone
                                                                                                    })}
                                                                                                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 border shadow-sm ${tpDone ? 'bg-white border-slate-200 text-slate-400 hover:text-slate-600' : 'bg-white border-slate-200 text-slate-600 hover:border-premium-blue hover:text-premium-blue transition-colors'}`}
                                                                                                >
                                                                                                    {tpDone ? <>Undo</> : <>Mark Topic Done</>}
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Sub-Topics List */}
                                                                                    {tp.subTopics?.length > 0 && (
                                                                                        <div className="divide-y divide-slate-50 bg-white">
                                                                                            {tp.subTopics.map((st, si) => {
                                                                                                const stDone = completedIds.has(String(st._id));
                                                                                                return (
                                                                                                    <div key={st._id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 transition-colors group/subtopic">
                                                                                                        {canMark ? (
                                                                                                            <button
                                                                                                                disabled={markingItem === st._id}
                                                                                                                onClick={() => handleMark(String(pg._id), { itemId: st._id, itemType: 'subtopic', chapterId: ch._id, topicId: tp._id, isCompleted: !stDone })}
                                                                                                                className="shrink-0 text-slate-300 hover:text-premium-blue transition-colors focus:outline-none"
                                                                                                            >
                                                                                                                {stDone ? <CheckSquare size={16} className="text-green-500" /> : <Square size={16} />}
                                                                                                            </button>
                                                                                                        ) : (
                                                                                                            <span>{stDone ? <CheckCircle2 size={16} className="text-green-500" /> : <Circle size={16} className="text-slate-200" />}</span>
                                                                                                        )}
                                                                                                        <span className={`text-[13px] font-medium flex-1 tracking-tight ${stDone ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                                                                                                            <span className="text-[10px] text-slate-300 mr-2 font-mono">{ci+1}.{ti+1}.{si+1}</span>
                                                                                                            {st.title}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── TAB: Teaching Timeline ───────────────────────────────────────── */}
            {activeTab === "timeline" && (
                <div className="space-y-3">
                    {timeline.length === 0 && (
                        <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl">
                            <History size={32} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-500 font-medium">No activity yet</p>
                            <p className="text-slate-400 text-sm mt-1">Start marking topics complete to build the teaching timeline.</p>
                        </div>
                    )}

                    {timeline.map((entry, idx) => {
                        const pg = progressList.find(p => String(p._id) === String(entry.progressId));
                        const titles = pg ? findItemTitle(pg.subject?.syllabus, entry) : {};
                        const when = entry.completedAt ? new Date(entry.completedAt).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : '';
                        const completedBy = entry.completedBy;
                        const byName = completedBy
                            ? `${completedBy.profile?.firstName || ''} ${completedBy.profile?.lastName || ''}`.trim()
                            : 'Someone';

                        return (
                            <div key={idx} className="flex gap-4">
                                {/* Timeline line */}
                                <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 rounded-full bg-premium-blue/10 text-premium-blue flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={14} />
                                    </div>
                                    {idx < timeline.length - 1 && <div className="w-px flex-1 bg-slate-100 mt-1" />}
                                </div>
                                {/* Content */}
                                <div className="flex-1 pb-4">
                                    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <div>
                                                <Badge variant="primary" className="text-[9px] mb-1.5">{entry.subjectCode}</Badge>
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {titles.subTopic || titles.topic || titles.chapter || '—'}
                                                </p>
                                                {(titles.topic || titles.chapter) && titles.subTopic && (
                                                    <p className="text-xs text-slate-400 mt-0.5">{titles.chapter} → {titles.topic}</p>
                                                )}
                                                {titles.chapter && !titles.subTopic && titles.topic && (
                                                    <p className="text-xs text-slate-400 mt-0.5">{titles.chapter}</p>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-slate-400 shrink-0">{when}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500">
                                                {byName[0] || '?'}
                                            </div>
                                            <span className="text-[11px] text-slate-400">Marked by <span className="font-semibold text-slate-600">{byName}</span></span>
                                        </div>
                                        {entry.notes && (
                                            <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-1.5 italic">
                                                <MessageSquare size={10} className="inline mr-1.5 text-slate-400" />
                                                {entry.notes}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {/* ── TAB: Marksheets  ────────────────────────────────────────────── */}
            {activeTab === "marksheets" && (
                <MarksheetsTab batchId={batchId} />
            )}
        </div>
    );
}
