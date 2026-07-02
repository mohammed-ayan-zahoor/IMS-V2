"use client";

import { useState, useEffect, useCallback } from "react";
import { UserCheck, Calendar, Search, Loader2, Save, CheckCircle2, XCircle, Clock, Moon, AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";

const statusOptions = [
    { value: "present", label: "Present" },
    { value: "absent", label: "Absent" },
    { value: "half_day", label: "Half Day" },
    { value: "on_leave", label: "On Leave" },
    { value: "holiday", label: "Holiday" }
];

export default function StaffAttendancePage() {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [records, setRecords] = useState([]);

    const fetchAttendance = useCallback(async (dateString, signal) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/hr/attendance?date=${dateString}`, {
                signal: signal || AbortSignal.timeout(10000)
            });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            setRecords(data.records || []);
        } catch (error) {
            if (error.name !== 'AbortError') {
                toast.error("Failed to load staff list or attendance records");
            }
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        const controller = new AbortController();
        fetchAttendance(attendanceDate, controller.signal);
        return () => controller.abort();
    }, [attendanceDate, fetchAttendance]);

    const handleStatusChange = (staffId, status) => {
        setRecords(prev => prev.map(rec => {
            if (rec.staff._id === staffId) {
                return { ...rec, status };
            }
            return rec;
        }));
    };

    const handleRemarksChange = (staffId, remarks) => {
        setRecords(prev => prev.map(rec => {
            if (rec.staff._id === staffId) {
                return { ...rec, remarks };
            }
            return rec;
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = records.map(rec => ({
                staffId: rec.staff._id,
                status: rec.status,
                remarks: rec.remarks || ""
            }));

            const res = await fetch("/api/v1/hr/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: attendanceDate,
                    records: payload
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("Attendance marked successfully");
                fetchAttendance(attendanceDate);
            } else {
                toast.error(data.error || "Failed to save attendance");
            }
        } catch (error) {
            toast.error("Error saving attendance");
        } finally {
            setSaving(false);
        }
    };

    const markAllStatus = (status) => {
        setRecords(prev => prev.map(rec => ({ ...rec, status })));
        toast.info(`Marked all staff as ${status.replace('_', ' ')}`);
    };

    // Filters
    const filteredRecords = records.filter(rec => {
        const name = `${rec.staff.profile?.firstName || ''} ${rec.staff.profile?.lastName || ''}`.toLowerCase();
        return name.includes(searchQuery.toLowerCase());
    });

    // Counts
    const counts = records.reduce((acc, rec) => {
        acc[rec.status] = (acc[rec.status] || 0) + 1;
        return acc;
    }, { present: 0, absent: 0, half_day: 0, on_leave: 0, holiday: 0 });

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <UserCheck className="text-premium-blue" size={28} />
                        Staff Attendance Sheet
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Mark and update daily teacher and staff attendance.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            type="date"
                            value={attendanceDate}
                            onChange={(e) => setAttendanceDate(e.target.value)}
                            className="pl-10 w-44 focus:bg-white transition-all"
                        />
                    </div>
                    <Button
                        disabled={saving || loading || records.length === 0}
                        onClick={handleSave}
                        className="bg-premium-blue hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Save Attendance
                    </Button>
                </div>
            </div>

            {/* Attendance Dashboard Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="p-4 bg-white border-l-4 border-l-premium-blue flex flex-col shadow-sm">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Present</span>
                    <span className="text-2xl font-black text-slate-900 mt-1">{counts.present}</span>
                </Card>
                <Card className="p-4 bg-white border-l-4 border-l-red-500 flex flex-col shadow-sm">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Absent</span>
                    <span className="text-2xl font-black text-slate-900 mt-1">{counts.absent}</span>
                </Card>
                <Card className="p-4 bg-white border-l-4 border-l-amber-500 flex flex-col shadow-sm">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Half Day</span>
                    <span className="text-2xl font-black text-slate-900 mt-1">{counts.half_day}</span>
                </Card>
                <Card className="p-4 bg-white border-l-4 border-l-purple-500 flex flex-col shadow-sm">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">On Leave</span>
                    <span className="text-2xl font-black text-slate-900 mt-1">{counts.on_leave}</span>
                </Card>
                <Card className="p-4 bg-white border-l-4 border-l-slate-400 flex flex-col shadow-sm col-span-2 md:col-span-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Holidays</span>
                    <span className="text-2xl font-black text-slate-900 mt-1">{counts.holiday}</span>
                </Card>
            </div>

            {/* Master Controls card */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-80">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Search staff by name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-full"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                        <span className="text-xs font-bold text-slate-500 mr-2">Mark All As:</span>
                        <Button variant="outline" size="sm" onClick={() => markAllStatus('present')} className="text-xs font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50">Present</Button>
                        <Button variant="outline" size="sm" onClick={() => markAllStatus('absent')} className="text-xs font-bold border-rose-200 text-rose-700 hover:bg-rose-50">Absent</Button>
                        <Button variant="outline" size="sm" onClick={() => markAllStatus('holiday')} className="text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50">Holiday</Button>
                    </div>
                </div>
            </Card>

            {loading ? (
                <div className="py-20 flex flex-col items-center gap-4 text-slate-400 font-medium italic">
                    <Loader2 className="animate-spin text-premium-blue" size={40} />
                    Loading staff list...
                </div>
            ) : filteredRecords.length > 0 ? (
                <Card className="overflow-hidden border border-slate-200 shadow-sm bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Staff Member</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Designation</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Role</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Attendance Status</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Remarks / Note</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredRecords.map((rec) => {
                                    const designationName = rec.staff.hrDetails?.designation?.name || "N/A";
                                    return (
                                        <tr key={rec.staff._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800">
                                                        {rec.staff.profile?.firstName || ''} {rec.staff.profile?.lastName || ''}
                                                    </span>
                                                    <span className="text-xs text-slate-400">{rec.staff.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                                                {designationName}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 capitalize">
                                                    {rec.staff.role === 'instructor' ? 'Teacher' : rec.staff.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {statusOptions.map((opt) => {
                                                        const isSelected = rec.status === opt.value;
                                                        let btnClass = "border-slate-200 hover:bg-slate-50 text-slate-600";
                                                        if (isSelected) {
                                                            if (opt.value === 'present') btnClass = "bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/10";
                                                            else if (opt.value === 'absent') btnClass = "bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/10";
                                                            else if (opt.value === 'half_day') btnClass = "bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-500/10";
                                                            else if (opt.value === 'on_leave') btnClass = "bg-purple-50 border-purple-500 text-purple-700 ring-2 ring-purple-500/10";
                                                            else btnClass = "bg-slate-100 border-slate-400 text-slate-800";
                                                        }
                                                        return (
                                                            <button
                                                                key={opt.value}
                                                                onClick={() => handleStatusChange(rec.staff._id, opt.value)}
                                                                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${btnClass}`}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="text"
                                                    value={rec.remarks || ""}
                                                    onChange={(e) => handleRemarksChange(rec.staff._id, e.target.value)}
                                                    placeholder="Add note..."
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:bg-white focus:border-premium-blue focus:ring-1 focus:ring-premium-blue/10 transition-all text-slate-700"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400 mb-4">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No staff members found</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">Please add users with "Teacher" or "Staff" roles to mark their attendance.</p>
                </div>
            )}
        </div>
    );
}
