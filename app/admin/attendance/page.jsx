"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import Select from "@/components/ui/Select";
// Verified: Usage of Select component is compatible with onChange(value) signature.
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { format, parseISO } from "date-fns";
import {
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    Search,
    Save,
    Users,
    ScanLine
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { useAcademicSession } from "@/contexts/AcademicSessionContext";
import MobileAttendanceCardStack from "@/components/instructor/MobileAttendanceCardStack";
import MobileInstructorAttendance from "@/components/instructor/MobileInstructorAttendance";

export default function AttendanceMarkingPage() {
    const router = useRouter();
    const toast = useToast();
    const { data: session } = useSession();
    const { selectedSessionId } = useAcademicSession();
    const isSchool = session?.user?.institute?.type === 'SCHOOL' || session?.user?.institute?.code === 'QUANTECH';
    // Selection State
    const [batches, setBatches] = useState([]);
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [selectedBatch, setSelectedBatch] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Data State
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Slot & Mode State
    const [attMode, setAttMode] = useState("checkin_only");
    const [periodMode, setPeriodMode] = useState("daily");
    const [selectedSlot, setSelectedSlot] = useState("checkin");
    const [timetableSlots, setTimetableSlots] = useState([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState("");
    const [fullAttendanceRecords, setFullAttendanceRecords] = useState({}); // { [sId]: { [`${slot}_${periodId||'all'}`]: {} } }

    // Attendance State: { studentId: { status: 'present', remarks: '' } }
    const [attendanceData, setAttendanceData] = useState({});

    // Filter
    const [search, setSearch] = useState("");

    // Initial Load - Get Batches & Institute Settings
    useEffect(() => {
        fetchBatches();
        fetchCourses();
        fetchInstituteSettings();
    }, []);

    const fetchInstituteSettings = async () => {
        try {
            const res = await fetch("/api/v1/institute");
            if (res.ok) {
                const data = await res.json();
                if (data.institute?.settings?.attendance) {
                    const att = data.institute.settings.attendance;
                    if (att.mode) setAttMode(att.mode);
                    if (att.periodMode) setPeriodMode(att.periodMode);
                }
            }
        } catch (e) {
            console.error("Failed to fetch institute settings", e);
        }
    };

    // Fetch timetable when batch changes in per_period mode
    useEffect(() => {
        if (periodMode === "per_period" && selectedBatch) {
            fetch(`/api/v1/attendance/timetable?batchId=${selectedBatch}`)
                .then(res => res.json())
                .then(data => {
                    const slots = data.slots || [];
                    setTimetableSlots(slots);
                    const curr = slots.find(s => s.isCurrent) || slots[0];
                    if (curr) setSelectedPeriodId(curr._id);
                    else setSelectedPeriodId("");
                })
                .catch(err => console.warn("Failed to fetch timetable slots:", err));
        } else {
            setTimetableSlots([]);
            setSelectedPeriodId("");
        }
    }, [periodMode, selectedBatch]);

    // When Batch, Date, or selectedSlot changes - update displayed attendance
    useEffect(() => {
        if (selectedBatch && selectedDate) {
            fetchBatchData();
        } else {
            setStudents([]);
            setAttendanceData({});
            setFullAttendanceRecords({});
        }
    }, [selectedBatch, selectedDate]);

    useEffect(() => {
        if (students.length > 0) {
            const updatedState = {};
            const recordKey = `${selectedSlot}_${selectedPeriodId || 'all'}`;
            students.forEach(enrollment => {
                const sId = enrollment.student._id || enrollment.student;
                const slotRecord = fullAttendanceRecords[sId]?.[recordKey];
                if (slotRecord) {
                    updatedState[sId] = { status: slotRecord.status, remarks: slotRecord.remarks || "" };
                } else {
                    updatedState[sId] = { status: "present", remarks: "" };
                }
            });
            setAttendanceData(updatedState);
        }
    }, [selectedSlot, selectedPeriodId, fullAttendanceRecords]);

    const fetchBatches = async () => {
        try {
            const res = await fetch("/api/v1/batches");
            const data = await res.json();
            setBatches(data.batches || []);
        } catch (error) {
            console.error("Failed to fetch batches", error);
        }
    };
    const fetchCourses = async () => {
        try {
            const res = await fetch("/api/v1/courses");
            const data = await res.json();
            const courseList = Array.isArray(data) ? data : (data.courses || []);
            setCourses(courseList);
        } catch (error) {
            console.error("Failed to fetch courses", error);
        }
    };

    const fetchBatchData = async () => {
        try {
            setLoading(true);

            // 1. Get Batch Details (Students)
            const batchRes = await fetch(`/api/v1/batches/${selectedBatch}`);
            const batchData = await batchRes.json();

            // 2. Get Existing Attendance
            const attRes = await fetch(`/api/v1/attendance/batch?batchId=${selectedBatch}&date=${selectedDate}`);
            const attData = await attRes.json();

            // 3. Merge Data
            const enrolled = batchData.enrolledStudents || [];

            // Create map of existing records per slot + periodId
            const existingMap = {};
            if (attData.records) {
                attData.records.forEach(r => {
                    if (!r.student) return;
                    const sId = typeof r.student === 'object' ? r.student._id : r.student;
                    if (!existingMap[sId]) existingMap[sId] = {};
                    const slot = r.slot || 'checkin';
                    const pKey = `${slot}_${r.periodId || 'all'}`;
                    existingMap[sId][pKey] = { 
                        status: r.status, 
                        remarks: r.remarks || "",
                        markedAt: r.markedAt,
                        method: r.method || "manual",
                        periodId: r.periodId,
                        periodName: r.periodName
                    };
                });
            }

            // Initialize local state for current slot + period
            const currentRecordKey = `${selectedSlot}_${selectedPeriodId || 'all'}`;
            const initialState = {};
            enrolled.forEach(enrollment => {
                const sId = enrollment.student._id || enrollment.student;
                const slotRecord = existingMap[sId]?.[currentRecordKey];
                if (slotRecord) {
                    initialState[sId] = { status: slotRecord.status, remarks: slotRecord.remarks || "" };
                } else {
                    initialState[sId] = { status: 'present', remarks: '' };
                }
            });

            setStudents(enrolled);
            setFullAttendanceRecords(existingMap);
            setAttendanceData(initialState);

        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (studentId, status) => {
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], status }
        }));
    };

    const handleRemarksChange = (studentId, remarks) => {
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], remarks }
        }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const activePeriod = timetableSlots.find(s => s._id === selectedPeriodId);

            const records = Object.keys(attendanceData).map(studentId => ({
                studentId,
                status: attendanceData[studentId].status,
                slot: selectedSlot,
                periodId: activePeriod ? activePeriod._id : null,
                periodName: activePeriod ? activePeriod.name : "",
                remarks: attendanceData[studentId].remarks
            }));

            const res = await fetch("/api/v1/attendance/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    batchId: selectedBatch,
                    date: selectedDate,
                    records
                })
            });

            if (res.ok) {
                const periodLabel = activePeriod ? ` - ${activePeriod.name}` : "";
                toast.success(`Attendance (${selectedSlot === 'checkout' ? 'Check-Out' : 'Check-In'}${periodLabel}) saved successfully!`);
                fetchBatchData();
            } else {
                throw new Error("Failed to save");
            }
        } catch (error) {
            toast.error("Error saving attendance");
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const markAll = (status) => {
        if (students.length === 0) {
            toast.error("No students to mark");
            return;
        }
        const newData = { ...attendanceData };
        students.forEach(enrollment => {
            const sId = enrollment.student?._id || enrollment.student;
            if (sId) {
                newData[sId] = { ...newData[sId], status };
            }
        });
        setAttendanceData(newData);
        toast.success(`All marked as ${status}`);
    };

    // Filter Logic
    const filteredStudents = students.filter(e => {
        const name = e.student?.profile ? `${e.student.profile.firstName} ${e.student.profile.lastName}` : "Unknown";
        return name.toLowerCase().includes(search.toLowerCase());
    });

    const isInstructorOrStaff = ['instructor', 'staff'].includes(session?.user?.role);

    return (
        <>
            {isInstructorOrStaff && (
                <div className="md:hidden">
                    <MobileInstructorAttendance />
                </div>
            )}

            <div className={cn("space-y-6", isInstructorOrStaff ? "hidden md:block" : "")}>
            {/* Page Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Mark Attendance</h1>
                    <p className="text-[12px] text-slate-400 font-medium tracking-tight">Daily attendance tracking for {isSchool ? "sections" : "batches"}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => {
                            const batchId = selectedBatch || "all";
                            const batchName = selectedBatch
                                ? (batches.find(b => b._id === selectedBatch)?.name || "Batch")
                                : "Global Scanner";
                            router.push(`/admin/attendance/scan?batchId=${batchId}&date=${selectedDate}&name=${encodeURIComponent(batchName)}`);
                        }}
                        className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white gap-2 shadow-md"
                    >
                        <ScanLine className="w-4 h-4" />
                        Live Face & QR Scanner
                    </Button>
                </div>
            </div>

            {/* Selection Area */}
            <div className="bg-white rounded-lg border border-slate-100 p-5 overflow-visible">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Select {isSchool ? "Class" : "Course"}</label>
                        <Select
                            value={selectedCourse}
                            onChange={(val) => {
                                setSelectedCourse(val);
                                setSelectedBatch(""); // Reset batch when course changes
                            }}
                            placeholder={`-- Choose ${isSchool ? "Class" : "Course"} --`}
                            options={[
                                { label: `All ${isSchool ? "Classes" : "Courses"}`, value: "" },
                                ...courses.map(c => ({ label: c.name, value: c._id }))
                            ]}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Select {isSchool ? "Section" : "Batch"}</label>
                        <Select
                            value={selectedBatch}
                            onChange={(val) => setSelectedBatch(val)}
                            placeholder={!selectedCourse && isSchool ? `Select a ${isSchool ? "Class" : "Course"} first` : `-- Choose ${isSchool ? "Section" : "Batch"} --`}
                            options={[
                                ...batches
                                    .filter(b => {
                                        // 1. Session Isolation (for Schools only)
                                        const batchSessionStr = String(b.session?._id || b.session || '');
                                        const currentSessionStr = String(selectedSessionId || '');
                                        const matchesSession = !isSchool || !selectedSessionId || !batchSessionStr || batchSessionStr === currentSessionStr;
                                        
                                        // 2. Course/Class Cascading
                                        const batchCourseId = String(b.course?._id || b.course || '');
                                        const matchesCourse = !selectedCourse || batchCourseId === String(selectedCourse);
                                        
                                        return matchesSession && matchesCourse;
                                    })
                                    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                                    .map(b => ({ label: b.name, value: b._id }))
                            ]}
                            disabled={!selectedCourse && isSchool}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Date</label>
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-slate-50"
                        />
                    </div>
                </div>

                {attMode === 'checkin_checkout' && (
                    <div className="flex flex-wrap items-center gap-3 pt-4 mt-4 border-t border-slate-100">
                        <span className="text-xs font-bold text-slate-500">Marking Slot:</span>
                        <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setSelectedSlot('checkin')}
                                className={cn(
                                    "px-3 py-1 rounded text-xs font-bold transition-all",
                                    selectedSlot === 'checkin'
                                        ? "bg-emerald-600 text-white shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                )}
                            >
                                ☀️ Check-In (Morning)
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedSlot('checkout')}
                                className={cn(
                                    "px-3 py-1 rounded text-xs font-bold transition-all",
                                    selectedSlot === 'checkout'
                                        ? "bg-indigo-600 text-white shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                )}
                            >
                                🌙 Check-Out (Evening)
                            </button>
                        </div>
                    </div>
                )}

                {periodMode === 'per_period' && (
                    <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-slate-100">
                        <span className="text-xs font-bold text-slate-500 mr-1">Period Slot:</span>
                        <button
                            type="button"
                            onClick={() => setSelectedPeriodId('')}
                            className={cn(
                                "px-3 py-1 rounded text-xs font-bold transition-all border",
                                !selectedPeriodId ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            )}
                        >
                            All / Whole Day
                        </button>
                        {timetableSlots.map(s => (
                            <button
                                key={s._id}
                                type="button"
                                onClick={() => setSelectedPeriodId(s._id)}
                                className={cn(
                                    "px-3 py-1 rounded text-xs font-bold transition-all border",
                                    selectedPeriodId === s._id ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                )}
                            >
                                {s.name} ({s.startTime}-{s.endTime})
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Main Content */}
            {selectedBatch ? (
                loading ? (
                    <LoadingSpinner />
                ) : filteredStudents.length > 0 ? (
                    <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
                        {/* Mobile Native Card Stack View (< md) */}
                        <div className="block md:hidden">
                            <MobileAttendanceCardStack
                                students={students.map(e => e.student || e)}
                                attendanceData={attendanceData}
                                onStatusChange={handleStatusChange}
                                onSave={handleSave}
                                saving={saving}
                                batchName={batches.find(b => b._id === selectedBatch)?.name || ""}
                            />
                        </div>

                        {/* Desktop Table View (>= md) */}
                        <div className="hidden md:block">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-[#F9FAFB] border-b border-slate-100">
                            <div className="relative group max-w-sm w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-premium-blue transition-colors" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search student..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-md pl-9 pr-4 py-2 outline-none focus:border-slate-400 transition-colors text-xs font-medium"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => markAll('present')} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                                    <CheckCircle2 size={15} className="mr-1.5" /> Mark All Present
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => markAll('absent')} className="text-red-600 border-red-200 hover:bg-red-50">
                                    <XCircle size={15} className="mr-1.5" /> Mark All Absent
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => markAll('holiday')} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                    <Calendar size={15} className="mr-1.5" /> Mark All Holiday
                                </Button>
                                <Button onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs">
                                    {saving ? "Saving..." : <><Save size={15} className="mr-1.5" /> Save Attendance</>}
                                </Button>
                            </div>
                        </div>

                        <div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-y border-slate-100">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Name</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredStudents.map((enrollment) => {
                                            const student = enrollment.student;
                                            const sId = student._id || student;
                                            const current = attendanceData[sId] || { status: 'present', remarks: '' };

                                            return (
                                                <tr key={sId} className="group hover:bg-slate-50/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                                                                {student.profile?.firstName?.[0] || "S"}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-700">
                                                                    {student.profile?.firstName} {student.profile?.lastName}
                                                                </p>
                                                                <p className="text-[10px] font-mono text-slate-400">
                                                                    {student.enrollmentNumber || "PENDING"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex justify-center gap-1">
                                                            {[
                                                                { id: 'present', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' },
                                                                { id: 'absent', icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50 border-rose-200' },
                                                                { id: 'late', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' },
                                                                { id: 'excused', icon: AlertCircle, color: 'text-blue-400', bg: 'bg-blue-50 border-blue-200' },
                                                                { id: 'holiday', icon: Calendar, color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-200' }
                                                            ].map((opt) => (
                                                                <button
                                                                    key={opt.id}
                                                                    onClick={() => handleStatusChange(sId, opt.id)}
                                                                    className={`p-2 rounded-lg border transition-all ${current.status === opt.id
                                                                        ? `${opt.bg} ${opt.color} shadow-sm ring-2 ring-offset-1 ${opt.id === 'present' ? 'ring-emerald-100' :
                                                                            opt.id === 'absent' ? 'ring-rose-100' :
                                                                                opt.id === 'late' ? 'ring-amber-100' :
                                                                                    opt.id === 'holiday' ? 'ring-indigo-100' :
                                                                                        'ring-blue-100'
                                                                        }`
                                                                        : 'border-transparent text-slate-300 hover:bg-slate-100 hover:text-slate-400'
                                                                        }`}
                                                                    title={opt.id.charAt(0).toUpperCase() + opt.id.slice(1)}
                                                                >
                                                                    <opt.icon size={20} className={current.status === opt.id ? "fill-current opacity-20" : ""} />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Input
                                                            value={current.remarks}
                                                            onChange={(e) => handleRemarksChange(sId, e.target.value)}
                                                            placeholder="Add note..."
                                                            className="h-9 text-xs"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        </div>
                    </div>
                ) : (
                    <EmptyState
                        icon={Users}
                        title="No students found"
                        description={`This ${isSchool ? "section" : "batch"} has no active students enrolled.`}
                    />
                )
            ) : (
                <EmptyState
                    icon={Calendar}
                    title={`Select a ${isSchool ? "Section" : "Batch"}`}
                    description={`Please select a ${isSchool ? "section" : "batch"} and date to start marking attendance.`}
                />
            )}

        </div>
        </>
    );
}
