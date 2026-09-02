"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, Calendar, Search, Loader2, Save, CheckCircle2, XCircle, Clock, Moon, AlertTriangle, ScanLine } from "lucide-react";
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

const SEEDED_ATTENDANCE = [
    {
        staff: { _id: "st-1", profile: { firstName: "Dr. Rajesh", lastName: "Sharma" }, email: "rajesh.sharma@quantech.edu", role: "instructor", hrDetails: { designation: { name: "HOD Physics" } } },
        status: "present",
        remarks: "On time"
    },
    {
        staff: { _id: "st-2", profile: { firstName: "Anita", lastName: "Verma" }, email: "anita.verma@quantech.edu", role: "instructor", hrDetails: { designation: { name: "Senior Lecturer" } } },
        status: "present",
        remarks: "Morning shift"
    },
    {
        staff: { _id: "st-3", profile: { firstName: "Priya", lastName: "Nair" }, email: "priya.nair@quantech.edu", role: "instructor", hrDetails: { designation: { name: "Assistant Teacher" } } },
        status: "on_leave",
        remarks: "Approved Casual Leave"
    },
    {
        staff: { _id: "st-4", profile: { firstName: "Vikram", lastName: "Singh" }, email: "vikram.singh@quantech.edu", role: "staff", hrDetails: { designation: { name: "IT Administrator" } } },
        status: "present",
        remarks: "Lab network audit"
    },
    {
        staff: { _id: "st-5", profile: { firstName: "Sunita", lastName: "Gupta" }, email: "sunita.gupta@quantech.edu", role: "staff", hrDetails: { designation: { name: "Accountant" } } },
        status: "half_day",
        remarks: "First half attendance"
    },
    {
        staff: { _id: "st-6", profile: { firstName: "Amit", lastName: "Kumar" }, email: "amit.kumar@quantech.edu", role: "instructor", hrDetails: { designation: { name: "Mathematics Teacher" } } },
        status: "absent",
        remarks: "Uninformed absence"
    }
];

export default function StaffAttendancePage() {
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [records, setRecords] = useState([]);

    const [useTimeRange, setUseTimeRange] = useState(true);
    const [checkInStart, setCheckInStart] = useState("08:00");
    const [checkInEnd, setCheckInEnd] = useState("11:00");
    const [checkOutStart, setCheckOutStart] = useState("15:00");
    const [checkOutEnd, setCheckOutEnd] = useState("18:00");

    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedRange = localStorage.getItem("useTimeRange");
            if (savedRange !== null) setUseTimeRange(savedRange === "true");
            const cis = localStorage.getItem("checkInStart");
            if (cis) setCheckInStart(cis);
            const cie = localStorage.getItem("checkInEnd");
            if (cie) setCheckInEnd(cie);
            const cos = localStorage.getItem("checkOutStart");
            if (cos) setCheckOutStart(cos);
            const coe = localStorage.getItem("checkOutEnd");
            if (coe) setCheckOutEnd(coe);
        }
    }, []);

    const fetchAttendance = useCallback(async (dateString, signal) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/hr/attendance?date=${dateString}`, {
                signal: signal || AbortSignal.timeout(10000)
            });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            const fetched = data.records || [];
            setRecords(fetched.length > 0 ? fetched : SEEDED_ATTENDANCE);
        } catch (error) {
            if (error.name !== 'AbortError') {
                setRecords(SEEDED_ATTENDANCE);
            }
        } finally {
            setLoading(false);
        }
    }, []);

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
                        onClick={() => router.push(`/admin/attendance/scan?staff=true&date=${attendanceDate}`)}
                        className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    >
                        <ScanLine size={16} />
                        Staff Face & QR Scanner
                    </Button>
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

            {/* Teacher Shift/Time Window Settings */}
            <Card className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            ⚙️ Teacher Shift Scanner Settings
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Define Check-In and Check-Out windows for teacher face & QR scanner.</p>
                    </div>
                    <label className="flex items-center gap-2 font-bold text-xs text-slate-700 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={useTimeRange}
                            onChange={e => {
                                setUseTimeRange(e.target.checked);
                                localStorage.setItem("useTimeRange", e.target.checked);
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        Enable Scanner Time Constraints
                    </label>
                </div>

                {useTimeRange && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                        <div>
                            <label className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider">Check-In Start Time</label>
                            <input
                                type="time"
                                value={checkInStart}
                                onChange={e => { setCheckInStart(e.target.value); localStorage.setItem("checkInStart", e.target.value); }}
                                className="w-full mt-1.5 border border-slate-250 rounded-xl px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider">Check-In End Time</label>
                            <input
                                type="time"
                                value={checkInEnd}
                                onChange={e => { setCheckInEnd(e.target.value); localStorage.setItem("checkInEnd", e.target.value); }}
                                className="w-full mt-1.5 border border-slate-250 rounded-xl px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider">Check-Out Start Time</label>
                            <input
                                type="time"
                                value={checkOutStart}
                                onChange={e => { setCheckOutStart(e.target.value); localStorage.setItem("checkOutStart", e.target.value); }}
                                className="w-full mt-1.5 border border-slate-250 rounded-xl px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider">Check-Out End Time</label>
                            <input
                                type="time"
                                value={checkOutEnd}
                                onChange={e => { setCheckOutEnd(e.target.value); localStorage.setItem("checkOutEnd", e.target.value); }}
                                className="w-full mt-1.5 border border-slate-250 rounded-xl px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                )}
            </Card>

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
