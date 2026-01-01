"use client";

import { useState, useEffect } from "react";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
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
    Users
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function AttendanceMarkingPage() {
    const toast = useToast();
    // Selection State
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Data State
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Attendance State: { studentId: { status: 'present', remarks: '' } }
    const [attendanceData, setAttendanceData] = useState({});

    // Filter
    const [search, setSearch] = useState("");

    // Initial Load - Get Batches
    useEffect(() => {
        fetchBatches();
    }, []);

    // When Batch or Date selected - fetch students & existing attendance
    useEffect(() => {
        if (selectedBatch && selectedDate) {
            fetchBatchData();
        } else {
            setStudents([]);
            setAttendanceData({});
        }
    }, [selectedBatch, selectedDate]);

    const fetchBatches = async () => {
        try {
            const res = await fetch("/api/v1/batches");
            const data = await res.json();
            setBatches(data.batches || []);
        } catch (error) {
            console.error("Failed to fetch batches", error);
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

            // Create map of existing records
            const existingMap = {};
            if (attData.records) {
                attData.records.forEach(r => {
                    // Handle populate vs ID
                    const sId = typeof r.student === 'object' ? r.student._id : r.student;
                    existingMap[sId] = { status: r.status, remarks: r.remarks };
                });
            }

            // Initialize local state
            const initialState = {};
            enrolled.forEach(enrollment => {
                const sId = enrollment.student._id || enrollment.student;
                if (existingMap[sId]) {
                    initialState[sId] = existingMap[sId];
                } else {
                    // Default to undefined (user must select) or could default to Present
                    // Let's default to 'present' for ease? Or keep neutral 'pending'?
                    // Usually 'Present' default saves clicks.
                    initialState[sId] = { status: 'present', remarks: '' };
                }
            });

            setStudents(enrolled);
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

    const markAll = (status) => {
        const next = { ...attendanceData };
        Object.keys(next).forEach(key => {
            next[key].status = status;
        });
        setAttendanceData(next);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const records = Object.keys(attendanceData).map(studentId => ({
                studentId,
                status: attendanceData[studentId].status,
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
                toast.success("Attendance saved successfully!");
                // Optionally refetch to confirm
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

    // Filter Logic
    const filteredStudents = students.filter(e => {
        const name = e.student?.profile ? `${e.student.profile.firstName} ${e.student.profile.lastName}` : "Unknown";
        return name.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mark Attendance</h1>
                    <p className="text-slate-400 mt-1 text-sm font-medium">Daily attendance tracking for batches.</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Controls could go here */}
                </div>
            </div>

            {/* Selection Area */}
            <Card className="border-transparent shadow-sm bg-white">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Select Batch</label>
                            <Select
                                value={selectedBatch}
                                onChange={(e) => setSelectedBatch(e.target.value)}
                                placeholder="-- Choose Batch --"
                                options={[
                                    ...batches.map(b => ({ label: b.name, value: b._id }))
                                ]}
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
                        <div className="space-y-2 flex items-end">
                            {/* Stats or other info could go here */}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Main Content */}
            {selectedBatch ? (
                loading ? (
                    <LoadingSpinner />
                ) : filteredStudents.length > 0 ? (
                    <Card className="border-transparent shadow-sm">
                        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-4">
                            <div className="relative group max-w-sm w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-premium-blue transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search student..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2 outline-none focus:border-premium-blue/30 focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => markAll('present')} className="text-emerald-600 border-emerald-100 hover:bg-emerald-50">
                                    <CheckCircle2 size={16} className="mr-2" /> Mark All Present
                                </Button>
                                <Button onClick={handleSave} disabled={saving} className="bg-premium-blue hover:bg-premium-blue/90 shadow-lg shadow-blue-500/20">
                                    {saving ? "Saving..." : <><Save size={18} className="mr-2" /> Save Attendance</>}
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="p-0">
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
                                                                { id: 'excused', icon: AlertCircle, color: 'text-blue-400', bg: 'bg-blue-50 border-blue-200' }
                                                            ].map((opt) => (
                                                                <button
                                                                    key={opt.id}
                                                                    onClick={() => handleStatusChange(sId, opt.id)}
<button
    key={opt.id}
    onClick={() => handleStatusChange(sId, opt.id)}
    className={`p-2 rounded-lg border transition-all ${
        current.status === opt.id
            ? `${opt.bg} ${opt.color} shadow-sm ring-2 ring-offset-1 ${
                opt.id === 'present' ? 'ring-emerald-100' :
                opt.id === 'absent' ? 'ring-rose-100' :
                opt.id === 'late' ? 'ring-amber-100' :
                'ring-blue-100'
            }`
            : 'border-transparent text-slate-300 hover:bg-slate-100 hover:text-slate-400'
    }`}
    title={opt.id.charAt(0).toUpperCase() + opt.id.slice(1)}
>                                                                        }`}
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
                        </CardContent>
                    </Card>
                ) : (
                    <EmptyState
                        icon={Users}
                        title="No students found"
                        description="This batch has no active students enrolled."
                    />
                )
            ) : (
                <EmptyState
                    icon={Calendar}
                    title="Select a Batch"
                    description="Please select a batch and date to start marking attendance."
                />
            )}
        </div>
    );
}
