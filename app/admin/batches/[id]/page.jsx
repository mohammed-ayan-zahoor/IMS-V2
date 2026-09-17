"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    ArrowLeft, Users, Calendar, Clock, BookOpen, CheckSquare, Square,
    ChevronDown, ChevronRight, History, AlertCircle, BarChart3,
    User, MessageSquare, CheckCircle2, Circle, FileText, Download,
    Trash2, Plus, Save, AlertTriangle, Edit2, Settings, X, Sparkles, Copy
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
    { id: "timetable", label: "Timetable", icon: Clock },
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
                                    <p className="text-xs text-slate-500 font-medium py-3 text-center">This student hasn&apos;t completed any exams yet.</p>
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

// ─── Timetable Tab Component ──────────────────────────────────────────────────
function TimetableTab({ batchId, subjects = [] }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [draggedSubject, setDraggedSubject] = useState(null);
    const [timeSlots, setTimeSlots] = useState([]);
    const [schedule, setSchedule] = useState([]); // Array of { dayOfWeek, assignments: [] }
    const [instructors, setInstructors] = useState([]);
    const [editingOverridesDay, setEditingOverridesDay] = useState(null);
    const toast = useToast();

    // Auto-Generate Periods Wizard state
    const [showAutoGenerateModal, setShowAutoGenerateModal] = useState(false);
    const [genStartTime, setGenStartTime] = useState("08:30");
    const [genDuration, setGenDuration] = useState(45);
    const [genNumPeriods, setGenNumPeriods] = useState(6);
    const [genHasBreak, setGenHasBreak] = useState(true);
    const [genBreakAfter, setGenBreakAfter] = useState(3);
    const [genBreakDuration, setGenBreakDuration] = useState(30);
    const [genBreakName, setGenBreakName] = useState("Recess / Break");

    // Clone from Existing Batch state
    const [showCloneModal, setShowCloneModal] = useState(false);
    const [instituteBatches, setInstituteBatches] = useState([]);
    const [selectedCloneBatchId, setSelectedCloneBatchId] = useState("");
    const [cloneWithAssignments, setCloneWithAssignments] = useState(false);
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [cloning, setCloning] = useState(false);

    const DAYS = [
        { id: 1, name: "Monday" },
        { id: 2, name: "Tuesday" },
        { id: 3, name: "Wednesday" },
        { id: 4, name: "Thursday" },
        { id: 5, name: "Friday" },
        { id: 6, name: "Saturday" },
        { id: 0, name: "Sunday" }
    ];

    const formatTime12Hour = (time24) => {
        if (!time24) return "";
        const [h, m] = time24.split(":");
        const numH = parseInt(h, 10);
        if (isNaN(numH)) return time24;
        const ampm = numH >= 12 ? "PM" : "AM";
        const finalH = numH % 12 || 12;
        return `${finalH}:${m} ${ampm}`;
    };

    const addMinutesToTime = (timeStr, minutesToAdd) => {
        const [h, m] = (timeStr || "08:00").split(":").map(Number);
        const totalMins = (h || 0) * 60 + (m || 0) + Number(minutesToAdd);
        const newH = Math.floor(totalMins / 60) % 24;
        const newM = totalMins % 60;
        return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch instructors
                const instRes = await fetch("/api/v1/users?role=instructor");
                if (instRes.ok) {
                    const instData = await instRes.json();
                    setInstructors(instData.users || []);
                }

                // Fetch existing timetable
                const ttRes = await fetch(`/api/v1/batches/${batchId}/timetable`);
                if (ttRes.ok) {
                    const ttData = await ttRes.json();
                    if (ttData.timetable) {
                        setTimeSlots(ttData.timetable.timeSlots || []);
                        setSchedule(ttData.timetable.schedule || []);
                    }
                }
            } catch (error) {
                console.error("Failed to load timetable data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [batchId]);

    const addTimeSlot = () => {
        const newSlot = {
            _id: Math.random().toString(36).substr(2, 9), // Temporary ID for new slots
            name: `Period ${timeSlots.length + 1}`,
            startTime: "09:00",
            endTime: "09:45",
            isBreak: false
        };
        setTimeSlots([...timeSlots, newSlot]);
    };

    const updateTimeSlot = (id, updates) => {
        setTimeSlots(timeSlots.map(slot => slot._id === id ? { ...slot, ...updates } : slot));
    };

    const removeTimeSlot = (id) => {
        setTimeSlots(timeSlots.filter(slot => slot._id !== id));
        // Also clean up schedule assignments for this slot
        setSchedule(schedule.map(day => ({
            ...day,
            assignments: day.assignments.filter(a => a.timeSlotId !== id)
        })));
    };

    const handleGenerateSchedule = () => {
        const totalPeriods = Math.max(1, Math.min(12, Number(genNumPeriods) || 6));
        const duration = Math.max(10, Math.min(180, Number(genDuration) || 45));
        const breakAfter = Number(genBreakAfter);
        const hasBreak = genHasBreak && breakAfter > 0 && breakAfter < totalPeriods;
        const breakMins = Math.max(5, Math.min(120, Number(genBreakDuration) || 30));

        let currentTime = genStartTime || "08:30";
        const newSlots = [];

        for (let p = 1; p <= totalPeriods; p++) {
            const periodEnd = addMinutesToTime(currentTime, duration);
            newSlots.push({
                _id: Math.random().toString(36).substr(2, 9),
                name: `Period ${p}`,
                startTime: currentTime,
                endTime: periodEnd,
                isBreak: false
            });
            currentTime = periodEnd;

            // Insert break without breaking academic period counting
            if (hasBreak && p === breakAfter) {
                const breakEnd = addMinutesToTime(currentTime, breakMins);
                newSlots.push({
                    _id: Math.random().toString(36).substr(2, 9),
                    name: genBreakName.trim() || "Recess / Break",
                    startTime: currentTime,
                    endTime: breakEnd,
                    isBreak: true
                });
                currentTime = breakEnd;
            }
        }

        setTimeSlots(newSlots);
        setShowAutoGenerateModal(false);
        toast.success(`Generated ${newSlots.length} time slots`);
    };

    const openCloneModal = async () => {
        setShowCloneModal(true);
        setLoadingBatches(true);
        try {
            const res = await fetch("/api/v1/batches");
            if (res.ok) {
                const data = await res.json();
                const otherBatches = (data.batches || []).filter(b => String(b._id) !== String(batchId));
                setInstituteBatches(otherBatches);
                if (otherBatches.length > 0) {
                    setSelectedCloneBatchId(String(otherBatches[0]._id));
                }
            }
        } catch (e) {
            console.error("Failed to load batches", e);
            toast.error("Failed to load batches");
        } finally {
            setLoadingBatches(false);
        }
    };

    const handleCloneTimetable = async () => {
        if (!selectedCloneBatchId) return;
        setCloning(true);
        try {
            const res = await fetch(`/api/v1/batches/${selectedCloneBatchId}/timetable`);
            if (!res.ok) {
                toast.error("Failed to fetch timetable for the selected batch");
                return;
            }
            const data = await res.json();
            const srcTimetable = data.timetable;
            if (!srcTimetable || !srcTimetable.timeSlots || srcTimetable.timeSlots.length === 0) {
                toast.error("The selected batch does not have a timetable yet");
                return;
            }

            // Map old slot IDs to fresh temporary client IDs
            const idMap = new Map();
            const newTimeSlots = srcTimetable.timeSlots.map(slot => {
                const freshId = Math.random().toString(36).substr(2, 9);
                idMap.set(String(slot._id), freshId);
                return {
                    _id: freshId,
                    name: slot.name,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isBreak: !!slot.isBreak
                };
            });

            let newSchedule = [];
            if (cloneWithAssignments && srcTimetable.schedule) {
                newSchedule = srcTimetable.schedule.map(day => ({
                    dayOfWeek: day.dayOfWeek,
                    assignments: (day.assignments || []).map(a => {
                        const mappedSlotId = idMap.get(String(a.timeSlotId?._id || a.timeSlotId));
                        if (!mappedSlotId) return null;
                        return {
                            timeSlotId: mappedSlotId,
                            subject: a.subject?._id || a.subject || null,
                            instructor: a.instructor?._id || a.instructor || null,
                            startTimeOverride: a.startTimeOverride || undefined,
                            endTimeOverride: a.endTimeOverride || undefined
                        };
                    }).filter(Boolean)
                }));
            }

            setTimeSlots(newTimeSlots);
            setSchedule(newSchedule);
            setShowCloneModal(false);
            toast.success(`Cloned timetable structure${cloneWithAssignments ? " and assignments" : ""} successfully`);
        } catch (e) {
            console.error("Clone error:", e);
            toast.error("Error cloning timetable");
        } finally {
            setCloning(false);
        }
    };

    const handleCopyMondayToWeekdays = () => {
        const mondayData = schedule.find(d => d.dayOfWeek === 1);
        if (!mondayData || !mondayData.assignments || mondayData.assignments.length === 0) {
            toast.error("Monday has no assignments to copy");
            return;
        }

        // Filter out breaks - only academic slots
        const academicSlots = timeSlots.filter(s => !s.isBreak);
        const academicSlotIds = new Set(academicSlots.map(s => String(s._id)));
        const mondayAcademicAssignments = mondayData.assignments.filter(a => {
            const slotId = String(a.timeSlotId?._id || a.timeSlotId);
            return academicSlotIds.has(slotId) && (a.subject || a.instructor);
        });

        if (mondayAcademicAssignments.length === 0) {
            toast.error("No active subject/teacher assignments found on Monday to copy");
            return;
        }

        // Check if Tue-Fri already have assignments
        const weekdays = [2, 3, 4, 5];
        const hasExisting = schedule.some(d =>
            weekdays.includes(d.dayOfWeek) && d.assignments?.some(a => a.subject || a.instructor)
        );

        if (hasExisting) {
            const confirmed = window.confirm("This will overwrite existing assignments on Tuesday through Friday. Continue?");
            if (!confirmed) return;
        }

        setSchedule(prev => {
            const newSchedule = [...prev];
            weekdays.forEach(dayId => {
                const dayIdx = newSchedule.findIndex(d => d.dayOfWeek === dayId);
                const replicatedAssignments = mondayAcademicAssignments.map(a => ({
                    timeSlotId: a.timeSlotId?._id || a.timeSlotId,
                    subject: a.subject?._id || a.subject || null,
                    instructor: a.instructor?._id || a.instructor || null
                }));

                if (dayIdx === -1) {
                    newSchedule.push({
                        dayOfWeek: dayId,
                        assignments: replicatedAssignments
                    });
                } else {
                    const existingAssignments = [...newSchedule[dayIdx].assignments];
                    mondayAcademicAssignments.forEach(monAssign => {
                        const slotId = monAssign.timeSlotId?._id || monAssign.timeSlotId;
                        const existIdx = existingAssignments.findIndex(a =>
                            String(a.timeSlotId?._id || a.timeSlotId) === String(slotId)
                        );
                        if (existIdx === -1) {
                            existingAssignments.push({
                                timeSlotId: slotId,
                                subject: monAssign.subject?._id || monAssign.subject || null,
                                instructor: monAssign.instructor?._id || monAssign.instructor || null
                            });
                        } else {
                            existingAssignments[existIdx] = {
                                ...existingAssignments[existIdx],
                                subject: monAssign.subject?._id || monAssign.subject || null,
                                instructor: monAssign.instructor?._id || monAssign.instructor || null
                            };
                        }
                    });
                    newSchedule[dayIdx] = { ...newSchedule[dayIdx], assignments: existingAssignments };
                }
            });
            return newSchedule;
        });

        toast.success("Copied Monday's schedule to Tuesday–Friday");
    };

    const updateAssignment = (dayId, slotId, field, value) => {
        setSchedule(prev => {
            const dayIdx = prev.findIndex(d => d.dayOfWeek === dayId);
            const newSchedule = [...prev];

            if (dayIdx === -1) {
                newSchedule.push({
                    dayOfWeek: dayId,
                    assignments: [{ timeSlotId: slotId, [field]: value }]
                });
            } else {
                const assignments = [...newSchedule[dayIdx].assignments];
                const assignIdx = assignments.findIndex(a => a.timeSlotId === slotId);

                if (assignIdx === -1) {
                    assignments.push({ timeSlotId: slotId, [field]: value });
                } else {
                    assignments[assignIdx] = { ...assignments[assignIdx], [field]: value };
                }
                newSchedule[dayIdx] = { ...newSchedule[dayIdx], assignments };
            }
            return newSchedule;
        });
    };

    const updateAssignmentOverride = (dayOfWeek, timeSlotId, field, value) => {
        setSchedule(prev => {
            const dayIdx = prev.findIndex(d => d.dayOfWeek === dayOfWeek);
            const newSchedule = [...prev];

            if (dayIdx === -1) {
                if (value) {
                    newSchedule.push({
                        dayOfWeek,
                        assignments: [{ timeSlotId, [field]: value }]
                    });
                }
            } else {
                const assignments = [...newSchedule[dayIdx].assignments];
                const assignIdx = assignments.findIndex(a => String(a.timeSlotId) === String(timeSlotId) || String(a.timeSlotId?._id) === String(timeSlotId));

                if (assignIdx === -1) {
                    if (value) {
                        assignments.push({ timeSlotId, [field]: value });
                    }
                } else {
                    assignments[assignIdx] = { ...assignments[assignIdx], [field]: value };
                }
                newSchedule[dayIdx] = { ...newSchedule[dayIdx], assignments };
            }
            return newSchedule;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/v1/batches/${batchId}/timetable`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ timeSlots, schedule })
            });

            if (res.ok) {
                toast.success("Timetable saved successfully");
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to save timetable");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-10 pb-20">
            <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column: Editor */}
            <div className="flex-1 min-w-0 space-y-8">
                {/* Step 1: Time Slots Definition */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">1. Define Periods & Breaks</h3>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">Setup the daily structure</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setShowAutoGenerateModal(true)}
                                className="flex items-center gap-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                                title="Auto-generate sequential periods and breaks"
                            >
                                <Sparkles size={13} className="text-blue-600" /> Auto-Generate
                            </button>
                            <button 
                                onClick={openCloneModal}
                                className="flex items-center gap-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                                title="Clone timetable structure from another batch"
                            >
                                <Copy size={13} className="text-emerald-600" /> Clone from Batch
                            </button>
                            <button 
                                onClick={addTimeSlot}
                                className="flex items-center gap-2 bg-premium-blue text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-all shadow-sm"
                            >
                                <Plus size={14} /> Add Slot
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-6">
                        {timeSlots.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl">
                                <Clock size={32} className="mx-auto text-slate-200 mb-2" />
                                <p className="text-xs text-slate-400 font-medium mb-3">No time slots defined yet.</p>
                                <div className="flex justify-center gap-2">
                                    <button 
                                        onClick={() => setShowAutoGenerateModal(true)}
                                        className="inline-flex items-center gap-1.5 bg-blue-50 text-premium-blue px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                    >
                                        <Sparkles size={13} /> Auto-Generate Schedule
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {timeSlots.map((slot) => (
                                    <div key={slot._id} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 hover:border-slate-200 transition-all group">
                                        <div className="flex items-center justify-between mb-3">
                                            <input 
                                                value={slot.name}
                                                onChange={(e) => updateTimeSlot(slot._id, { name: e.target.value })}
                                                className="bg-transparent font-bold text-slate-800 focus:outline-none w-full mr-2"
                                                placeholder="Slot Name"
                                            />
                                            <button 
                                                onClick={() => removeTimeSlot(slot._id)}
                                                className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Start</p>
                                                <input 
                                                    type="time" 
                                                    value={slot.startTime}
                                                    onChange={(e) => updateTimeSlot(slot._id, { startTime: e.target.value })}
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">End</p>
                                                <input 
                                                    type="time" 
                                                    value={slot.endTime}
                                                    onChange={(e) => updateTimeSlot(slot._id, { endTime: e.target.value })}
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2">
                                            <button 
                                                onClick={() => updateTimeSlot(slot._id, { isBreak: !slot.isBreak })}
                                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all ${
                                                    slot.isBreak ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                                                }`}
                                            >
                                                {slot.isBreak ? 'Break' : 'Academic'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Step 2: Subject Assignments Grid */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">2. Weekly Assignments</h3>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">Drag subjects from palette or select below</p>
                        </div>
                        {timeSlots.length > 0 && (
                            <button 
                                onClick={handleCopyMondayToWeekdays}
                                className="flex items-center gap-1.5 bg-blue-50 text-premium-blue hover:bg-blue-100 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                                title="Copy Monday's assignments to Tuesday through Friday"
                            >
                                <Sparkles size={13} /> Copy Mon → Tue–Fri
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 sticky left-0 bg-white z-10 min-w-[120px]">Time Slot</th>
                                    {DAYS.map(day => (
                                        <th key={day.id} className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 min-w-[140px]">
                                            <div className="flex items-center justify-between gap-1">
                                                <span>{day.name}</span>
                                                <div className="flex items-center gap-0.5">
                                                    {day.id === 1 && (
                                                        <button 
                                                            onClick={handleCopyMondayToWeekdays}
                                                            className="p-1 hover:bg-blue-50 rounded text-blue-500 hover:text-blue-700 transition-colors"
                                                            title="Copy Monday to Tue–Fri"
                                                        >
                                                            <Copy size={12} />
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => setEditingOverridesDay(day.id)}
                                                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                                                        title="Edit specific timings for this day"
                                                    >
                                                        <Settings size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {timeSlots.map(slot => (
                                    <tr key={slot._id} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-6 py-4 border-r border-slate-50 sticky left-0 bg-white z-10">
                                            <div className="font-bold text-slate-800 text-xs">{slot.name}</div>
                                            <div className="text-[9px] text-slate-400 font-mono mt-1">{formatTime12Hour(slot.startTime)} - {formatTime12Hour(slot.endTime)}</div>
                                        </td>
                                        {DAYS.map(day => {
                                            if (slot.isBreak) return (
                                                <td key={day.id} className="px-6 py-4 bg-orange-50/20">
                                                    <div className="text-[10px] font-black text-orange-200 uppercase tracking-widest text-center italic">Break</div>
                                                </td>
                                            );

                                            const dayData = schedule.find(d => d.dayOfWeek === day.id);
                                            const assignment = dayData?.assignments.find(a => a.timeSlotId === slot._id) || {};
                                            const assignedSub = subjects.find(s => String(s._id) === String(assignment.subject?._id || assignment.subject));

                                            return (
                                                <td 
                                                    key={day.id} 
                                                    className={`px-4 py-4 space-y-3 transition-all ${draggedSubject ? 'bg-blue-50/30 ring-1 ring-blue-100/50 rounded-lg' : ''}`}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        if (draggedSubject) updateAssignment(day.id, slot._id, 'subject', draggedSubject._id);
                                                    }}
                                                >
                                                    <div className="relative group/cell">
                                                        <select 
                                                            value={assignment.subject?._id || assignment.subject || ""}
                                                            onChange={(e) => updateAssignment(day.id, slot._id, 'subject', e.target.value)}
                                                            className={`w-full bg-white border rounded-lg px-2 py-1.5 text-[11px] font-bold outline-none transition-all ${assignedSub ? 'border-premium-blue text-slate-800 shadow-sm' : 'border-slate-100 text-slate-400'}`}
                                                        >
                                                            <option value="">No Subject</option>
                                                            {subjects.map(sub => (
                                                                <option key={sub._id} value={sub._id}>{sub.name}</option>
                                                            ))}
                                                        </select>
                                                        {assignedSub && (
                                                            <p className="text-[8px] font-black text-premium-blue mt-1 uppercase tracking-widest pl-1">{assignedSub.code}</p>
                                                        )}
                                                    </div>
                                                    
                                                    <select 
                                                        value={assignment.instructor?._id || assignment.instructor || ""}
                                                        onChange={(e) => updateAssignment(day.id, slot._id, 'instructor', e.target.value)}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-[10px] font-medium text-slate-500 outline-none"
                                                    >
                                                        <option value="">Teacher</option>
                                                        {instructors.map(inst => (
                                                            <option key={inst._id} value={inst._id}>{inst.profile?.firstName} {inst.profile?.lastName}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {timeSlots.length > 0 && (
                        <div className="p-6 bg-slate-50/30 border-t border-slate-50 flex justify-end">
                            <button 
                                disabled={saving}
                                onClick={handleSave}
                                className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
                            >
                                {saving ? <LoadingSpinner size="sm" /> : <Save size={16} />}
                                Save Timetable
                            </button>
                        </div>
                    )}
                </div>

                {/* Auto-Generate Periods Modal */}
                {showAutoGenerateModal && typeof document !== 'undefined' && createPortal(
                    <div className="fixed inset-0 bg-slate-900/60 z-[9999] flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 transform scale-100 transition-all">
                            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                        <Sparkles size={14} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900">Auto-Generate Schedule</h3>
                                </div>
                                <button onClick={() => setShowAutoGenerateModal(false)} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                                    Quickly create a standard sequential period and recess structure. This will replace your current time slots.
                                </p>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Start Time</label>
                                        <input 
                                            type="time" 
                                            value={genStartTime}
                                            onChange={(e) => setGenStartTime(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:bg-white focus:border-premium-blue"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Period Duration (min)</label>
                                        <input 
                                            type="number" 
                                            min="15" 
                                            max="120"
                                            value={genDuration}
                                            onChange={(e) => setGenDuration(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:bg-white focus:border-premium-blue"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Total Academic Periods</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="12"
                                        value={genNumPeriods}
                                        onChange={(e) => setGenNumPeriods(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:bg-white focus:border-premium-blue"
                                    />
                                </div>

                                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={genHasBreak}
                                                onChange={(e) => setGenHasBreak(e.target.checked)}
                                                className="rounded text-premium-blue focus:ring-premium-blue"
                                            />
                                            Include Recess / Break
                                        </label>
                                    </div>

                                    {genHasBreak && (
                                        <div className="space-y-3 pt-2 border-t border-slate-200/60">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">After Period</label>
                                                    <input 
                                                        type="number" 
                                                        min="1" 
                                                        max={Math.max(1, genNumPeriods - 1)}
                                                        value={genBreakAfter}
                                                        onChange={(e) => setGenBreakAfter(e.target.value)}
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Break Duration (min)</label>
                                                    <input 
                                                        type="number" 
                                                        min="5" 
                                                        max="90"
                                                        value={genBreakDuration}
                                                        onChange={(e) => setGenBreakDuration(e.target.value)}
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Break Label</label>
                                                <input 
                                                    type="text" 
                                                    value={genBreakName}
                                                    onChange={(e) => setGenBreakName(e.target.value)}
                                                    placeholder="Recess / Break"
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-3.5 px-5 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-2">
                                <button 
                                    onClick={() => setShowAutoGenerateModal(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleGenerateSchedule}
                                    className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 shadow-sm transition-colors flex items-center gap-1.5"
                                >
                                    <Sparkles size={13} /> Generate
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Clone from Existing Batch Modal */}
                {showCloneModal && typeof document !== 'undefined' && createPortal(
                    <div className="fixed inset-0 bg-slate-900/60 z-[9999] flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 transform scale-100 transition-all">
                            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                        <Copy size={14} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900">Clone from Existing Batch</h3>
                                </div>
                                <button onClick={() => setShowCloneModal(false)} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                                    Import the period timings and break layout from another batch in your institute.
                                </p>

                                {loadingBatches ? (
                                    <div className="py-8 flex justify-center">
                                        <LoadingSpinner size="sm" />
                                    </div>
                                ) : instituteBatches.length === 0 ? (
                                    <div className="py-6 text-center text-xs text-slate-400 font-medium">
                                        No other batches found in this institute.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Source Batch</label>
                                            <select 
                                                value={selectedCloneBatchId}
                                                onChange={(e) => setSelectedCloneBatchId(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:bg-white focus:border-premium-blue"
                                            >
                                                {instituteBatches.map(b => (
                                                    <option key={b._id} value={b._id}>
                                                        {b.name} ({b.course?.name || "Batch"})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                                            <label className="text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={cloneWithAssignments}
                                                    onChange={(e) => setCloneWithAssignments(e.target.checked)}
                                                    className="rounded text-premium-blue focus:ring-premium-blue"
                                                />
                                                Also copy weekly subject & teacher assignments
                                            </label>
                                            <p className="text-[10px] text-slate-400 mt-1 pl-5">
                                                Leave unchecked to only copy the period & break time structure.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-3.5 px-5 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-2">
                                <button 
                                    onClick={() => setShowCloneModal(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    disabled={cloning || instituteBatches.length === 0}
                                    onClick={handleCloneTimetable}
                                    className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {cloning ? <LoadingSpinner size="sm" /> : <Copy size={13} />} Clone Structure
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Editing Overrides Modal */}
                {editingOverridesDay !== null && typeof document !== 'undefined' && createPortal(
                    <div className="fixed inset-0 bg-slate-900/60 z-[9999] flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 transform scale-100 transition-all">
                            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                                <h3 className="text-sm font-bold text-slate-900">
                                    Edit Timings for {DAYS.find(d => d.id === editingOverridesDay)?.name}
                                </h3>
                                <button onClick={() => setEditingOverridesDay(null)} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="p-5 space-y-2.5 max-h-[60vh] overflow-y-auto">
                                <p className="text-[11px] text-slate-500 mb-3 font-medium leading-relaxed">
                                    Override default start and end times for specific periods. Leave blank to use default.
                                </p>
                                {timeSlots.map(slot => {
                                    if (slot.isBreak) return null;
                                    const dayData = schedule.find(d => d.dayOfWeek === editingOverridesDay);
                                    const assignment = dayData?.assignments.find(a => String(a.timeSlotId) === String(slot._id) || String(a.timeSlotId?._id) === String(slot._id)) || {};
                                    const hasOverride = assignment.startTimeOverride || assignment.endTimeOverride;
                                    
                                    return (
                                        <div key={slot._id} className={`flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 px-3 rounded-xl border transition-colors ${hasOverride ? 'bg-blue-50/30 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                                            <div className="w-24 shrink-0">
                                                <p className="text-[11px] font-bold text-slate-800">{slot.name}</p>
                                                <p className="text-[9px] text-slate-400 font-medium">Default: {formatTime12Hour(slot.startTime)} - {formatTime12Hour(slot.endTime)}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-1">
                                                {!hasOverride ? (
                                                    <button 
                                                        onClick={() => {
                                                            updateAssignmentOverride(editingOverridesDay, slot._id, 'startTimeOverride', slot.startTime);
                                                            updateAssignmentOverride(editingOverridesDay, slot._id, 'endTimeOverride', slot.endTime);
                                                        }}
                                                        className="w-full flex justify-center items-center gap-1.5 bg-white text-slate-400 border border-slate-200 border-dashed rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                                    >
                                                        <Plus size={10} /> Add Override
                                                    </button>
                                                ) : (
                                                    <>
                                                        <input 
                                                            type="time" 
                                                            value={assignment.startTimeOverride || ""}
                                                            onChange={(e) => updateAssignmentOverride(editingOverridesDay, slot._id, 'startTimeOverride', e.target.value)}
                                                            className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-[11px] font-medium outline-none focus:border-premium-blue text-blue-900 transition-colors"
                                                        />
                                                        <span className="text-slate-400 text-xs">-</span>
                                                        <input 
                                                            type="time" 
                                                            value={assignment.endTimeOverride || ""}
                                                            onChange={(e) => updateAssignmentOverride(editingOverridesDay, slot._id, 'endTimeOverride', e.target.value)}
                                                            className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-[11px] font-medium outline-none focus:border-premium-blue text-blue-900 transition-colors"
                                                        />
                                                        <button 
                                                            onClick={() => {
                                                                updateAssignmentOverride(editingOverridesDay, slot._id, 'startTimeOverride', null);
                                                                updateAssignmentOverride(editingOverridesDay, slot._id, 'endTimeOverride', null);
                                                            }}
                                                            className="p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-md transition-colors shrink-0"
                                                            title="Remove Override"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="p-3 px-5 border-t border-slate-100 bg-slate-50/80 flex justify-end">
                                <button 
                                    onClick={() => setEditingOverridesDay(null)}
                                    className="bg-slate-900 text-white px-6 py-2 rounded-lg text-[11px] font-bold hover:bg-slate-800 shadow-sm transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>

            {/* Right Column: Subject Palette Sidebar */}
            <div className="w-full lg:w-72 shrink-0">
                <div className="sticky top-6 space-y-6">
                    <div className="bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                <BookOpen size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">Subject Palette</h4>
                                <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Drag & Drop</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {subjects.length === 0 && <p className="text-[10px] text-slate-500 font-bold italic">No subjects in course syllabus.</p>}
                            {subjects.map(sub => (
                                <div 
                                    key={sub._id}
                                    draggable
                                    onDragStart={() => setDraggedSubject(sub)}
                                    onDragEnd={() => setDraggedSubject(null)}
                                    className="p-3 bg-white/5 border border-white/10 rounded-2xl cursor-grab hover:bg-white/10 active:cursor-grabbing transition-all group"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <Badge className="text-[8px] bg-blue-500/20 text-blue-400 border-none px-1.5">{sub.code}</Badge>
                                        <Edit2 size={10} className="text-white/20 group-hover:text-white/40" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-200 truncate">{sub.name}</p>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-8 pt-6 border-t border-white/10">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                                <AlertTriangle size={10} className="inline mr-1 text-orange-400 mb-0.5" />
                                Drag a subject from here and drop it into any slot in the grid to quickly assign it!
                            </p>
                        </div>
                    </div>
                    
                    {/* Live Preview Toggle Button (Mobile/Compact) */}
                    <button 
                        onClick={() => setShowPreview(!showPreview)}
                        className="w-full bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                                <Clock size={16} />
                            </div>
                            <span className="text-xs font-bold text-slate-800">Toggle Student Preview</span>
                        </div>
                        <ChevronRight size={16} className={`text-slate-300 transition-transform ${showPreview ? 'rotate-90' : ''}`} />
                    </button>
                </div>
            </div>
            </div>

            {/* Step 3: Live Preview */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">3. Student&apos;s View (Live Preview)</h3>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">See exactly what students will see</p>
                    </div>
                    <button 
                        onClick={() => setShowPreview(!showPreview)}
                        className="text-xs font-bold text-premium-blue hover:underline"
                    >
                        {showPreview ? "Hide Preview" : "Show Preview"}
                    </button>
                </div>

                {showPreview && (
                    <div className="p-6 bg-[#FAFAFA] overflow-x-auto rounded-b-2xl">
                        <style dangerouslySetInnerHTML={{__html: `
                            .timetable-gap-bg {
                                background-image: repeating-linear-gradient(
                                    -45deg,
                                    transparent,
                                    transparent 4px,
                                    rgba(0,0,0,0.03) 4px,
                                    rgba(0,0,0,0.03) 8px
                                );
                            }
                        `}} />
                        <div className="min-w-[900px]">
                            <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                                <thead>
                                    <tr>
                                        <th className="w-16 border-r border-slate-200/50"></th>
                                        {DAYS.map(day => (
                                            <th key={day.id} className="pb-3 pt-2 px-2 text-left align-bottom border-b border-slate-200/50">
                                                <div className="text-[12px] font-bold uppercase tracking-wider text-slate-800 ml-1">
                                                    {day.name}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {timeSlots.map(slot => {
                                        if (slot.isBreak) {
                                            return (
                                                <tr key={slot._id}>
                                                    <td className="pr-4 py-2 align-top text-right w-16 border-r border-slate-200/50 relative">
                                                        <div className="text-[10px] text-slate-400 font-medium -mt-2 bg-[#FAFAFA]">{formatTime12Hour(slot.startTime)}</div>
                                                    </td>
                                                    <td colSpan={DAYS.length} className="p-0 align-top border-b border-slate-200/50">
                                                        <div className="timetable-gap-bg h-14 flex items-center justify-center relative border-l border-slate-200/50">
                                                            <div className="absolute inset-0 bg-gradient-to-b from-black/[0.02] to-transparent pointer-events-none"></div>
                                                            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">{slot.name}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return (
                                            <tr key={slot._id}>
                                                <td className="pr-4 py-2 align-top text-right w-16 border-r border-slate-200/50 relative">
                                                    <div className="text-[10px] text-slate-400 font-medium -mt-2 bg-[#FAFAFA]">{formatTime12Hour(slot.startTime)}</div>
                                                </td>
                                                {DAYS.map(day => {
                                                    const daySchedule = schedule.find(d => d.dayOfWeek === day.id);
                                                    const assign = daySchedule?.assignments.find(a => String(a.timeSlotId) === String(slot._id) || String(a.timeSlotId?._id) === String(slot._id));
                                                    
                                                    const subjectId = assign?.subject?._id || assign?.subject;
                                                    const instructorId = assign?.instructor?._id || assign?.instructor;
                                                    
                                                    const subject = subjects.find(s => String(s._id) === String(subjectId));
                                                    const instructor = instructors.find(i => String(i._id) === String(instructorId));

                                                    if (!assign || (!subject && !instructor)) {
                                                        return (
                                                            <td key={day.id} className="p-0 align-top h-[110px] border-l border-b border-slate-200/50">
                                                                <div className="timetable-gap-bg w-full h-full flex justify-center items-center relative">
                                                                    <div className="absolute inset-0 bg-gradient-to-b from-black/[0.01] to-transparent pointer-events-none"></div>
                                                                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] opacity-0 hover:opacity-100 transition-opacity select-none z-10">GAP</span>
                                                                </div>
                                                            </td>
                                                        );
                                                    }

                                                    // Assign pseudo-random badge colors based on subject ID length or char code to keep them consistent but varied
                                                    const badgeColors = ["bg-purple-500", "bg-orange-400", "bg-green-500", "bg-blue-500", "bg-rose-500"];
                                                    const colorClass = badgeColors[(subject?._id?.charCodeAt(0) || 0) % badgeColors.length];

                                                    return (
                                                        <td key={day.id} className="p-1 align-top h-[110px] border-l border-b border-slate-200/50">
                                                            <div className="bg-white rounded-[2px] p-3.5 shadow-[0_6px_20px_rgba(0,0,0,0.06)] h-full flex flex-col hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] transition-all duration-200 relative overflow-hidden">
                                                                <div className="flex-1">
                                                                    <div className="flex justify-between items-start gap-1">
                                                                        <h5 className="text-[13px] font-bold text-[#0ea5e9] leading-tight mb-1 tracking-tight">
                                                                            {subject?.name || "Unknown"}
                                                                        </h5>
                                                                        {(assign.startTimeOverride || assign.endTimeOverride) && (
                                                                            <span className="shrink-0 text-[8px] font-black text-rose-500 bg-rose-50 px-1 py-0.5 rounded uppercase tracking-wider border border-rose-100">
                                                                                {formatTime12Hour(assign.startTimeOverride || slot.startTime)} - {formatTime12Hour(assign.endTimeOverride || slot.endTime)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[11.5px] text-slate-400 font-medium truncate">
                                                                        {instructor ? `${instructor.profile.firstName} ${instructor.profile.lastName}` : "No Instructor"}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-auto pt-2">
                                                                    {subject?.code && (
                                                                        <span className={`text-[8.5px] ${colorClass} text-white px-1.5 py-0.5 rounded-[3px] font-black uppercase tracking-wider`}>
                                                                            {subject.code}
                                                                        </span>
                                                                    )}
                                                                    <span className="text-[8.5px] border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded-[3px] font-black uppercase tracking-wider">
                                                                        {slot.name.replace(/Period\s/i, 'P')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
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
    const [markingDates, setMarkingDates] = useState({});

    const getMarkingDate = (id) => markingDates[id] || new Date().toISOString().split('T')[0];
    const handleMarkingDateChange = (id, date) => setMarkingDates(p => ({ ...p, [id]: date }));

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
    const batchSemester = batch?.semester || (batch?.name?.match(/Sem(?:ester)?\s*(\d+)/i) ? parseInt(batch.name.match(/Sem(?:ester)?\s*(\d+)/i)[1], 10) : null);

    useEffect(() => {
        if (!batch?.course?.subjects?.length) return;
        const relevantSubjects = batch.course.subjects.filter(s => {
            if (!s || s.deletedAt) return false;
            if (batchSemester) {
                return s.semester === batchSemester;
            }
            return true;
        });

        const ensureTrackers = async () => {
            for (const subject of relevantSubjects) {
                const sid = typeof subject === 'object' ? subject._id : subject;
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
        <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
            {/* Header */}
            <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
                <button onClick={() => router.push('/admin/batches')} className="p-2 mt-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{batch.name}</h1>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <Badge variant="primary" className="text-[10px] font-mono">{batch.course?.code || batch.course?.name}</Badge>
                        {batchSemester && (
                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-slate-50 border-slate-200 text-slate-700">
                                Sem {batchSemester}
                            </Badge>
                        )}
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
                                                                        <>
                                                                            {!chDone && (
                                                                                <input 
                                                                                    type="date"
                                                                                    max={new Date().toISOString().split('T')[0]}
                                                                                    value={getMarkingDate(ch._id)}
                                                                                    onChange={(e) => handleMarkingDateChange(ch._id, e.target.value)}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    className="text-[10px] px-1.5 py-1 rounded border border-slate-200 outline-none focus:border-premium-blue text-slate-600 bg-white"
                                                                                />
                                                                            )}
                                                                            <button
                                                                                disabled={markingItem === ch._id}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleMark(String(pg._id), {
                                                                                        itemId: ch._id, itemType: 'chapter', chapterId: ch._id, topicId: null, isCompleted: !chDone, completedAt: !chDone ? getMarkingDate(ch._id) : null
                                                                                    });
                                                                                }}
                                                                                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors flex items-center gap-2 ${chDone ? 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100' : 'bg-white border-slate-200 text-slate-700 hover:border-premium-blue hover:text-premium-blue shadow-sm'}`}
                                                                            >
                                                                                {chDone ? <><CheckCircle2 size={14}/> Completed</> : <><Square size={14}/> Mark Chapter Done</>}
                                                                            </button>
                                                                        </>
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
                                                                                                <div className="flex items-center gap-2">
                                                                                                    {!tpDone && (
                                                                                                        <input 
                                                                                                            type="date"
                                                                                                            max={new Date().toISOString().split('T')[0]}
                                                                                                            value={getMarkingDate(tp._id)}
                                                                                                            onChange={(e) => handleMarkingDateChange(tp._id, e.target.value)}
                                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                                            className="text-[10px] px-1.5 py-1 rounded border border-slate-200 outline-none focus:border-premium-blue text-slate-600 bg-white"
                                                                                                        />
                                                                                                    )}
                                                                                                    <button
                                                                                                        disabled={markingItem === tp._id}
                                                                                                        onClick={() => handleMark(String(pg._id), {
                                                                                                            itemId: tp._id, itemType: 'topic', chapterId: ch._id, topicId: tp._id, isCompleted: !tpDone, completedAt: !tpDone ? getMarkingDate(tp._id) : null
                                                                                                        })}
                                                                                                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 border shadow-sm ${tpDone ? 'bg-white border-slate-200 text-slate-400 hover:text-slate-600' : 'bg-white border-slate-200 text-slate-600 hover:border-premium-blue hover:text-premium-blue transition-colors'}`}
                                                                                                    >
                                                                                                        {tpDone ? <>Undo</> : <>Mark Topic Done</>}
                                                                                                    </button>
                                                                                                </div>
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
                                                                                                            <div className="flex items-center gap-2 shrink-0">
                                                                                                                {!stDone && (
                                                                                                                    <input 
                                                                                                                        type="date"
                                                                                                                        max={new Date().toISOString().split('T')[0]}
                                                                                                                        value={getMarkingDate(st._id)}
                                                                                                                        onChange={(e) => handleMarkingDateChange(st._id, e.target.value)}
                                                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                                                        className="text-[10px] px-1 py-0.5 rounded border border-slate-200 outline-none focus:border-premium-blue text-slate-600 bg-white w-24 opacity-0 group-hover/subtopic:opacity-100 transition-opacity"
                                                                                                                    />
                                                                                                                )}
                                                                                                                <button
                                                                                                                    disabled={markingItem === st._id}
                                                                                                                    onClick={() => handleMark(String(pg._id), { itemId: st._id, itemType: 'subtopic', chapterId: ch._id, topicId: tp._id, isCompleted: !stDone, completedAt: !stDone ? getMarkingDate(st._id) : null })}
                                                                                                                    className="shrink-0 text-slate-300 hover:text-premium-blue transition-colors focus:outline-none"
                                                                                                                >
                                                                                                                    {stDone ? <CheckSquare size={16} className="text-green-500" /> : <Square size={16} />}
                                                                                                                </button>
                                                                                                            </div>
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
                                            <span className="text-sm font-semibold text-slate-600 shrink-0 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 shadow-sm">{when}</span>
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

            {/* ── TAB: Timetable ─────────────────────────────────────────────── */}
            {activeTab === "timetable" && (
                <TimetableTab batchId={batchId} subjects={batch?.course?.subjects || []} />
            )}
        </div>
    );
}
