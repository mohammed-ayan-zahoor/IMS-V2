"use client";

import { useState, useMemo } from "react";
import { 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Search, 
    Save, 
    CheckCheck,
    Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";

export default function MobileAttendanceCardStack({
    students = [],
    attendanceData = {},
    onStatusChange,
    onSave,
    saving = false,
    batchName = ""
}) {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");

    // Compute live tally counts
    const counts = useMemo(() => {
        let present = 0;
        let absent = 0;
        let late = 0;
        let unmarked = 0;

        students.forEach(s => {
            const status = attendanceData[s._id]?.status;
            if (status === 'present') present++;
            else if (status === 'absent') absent++;
            else if (status === 'late') late++;
            else unmarked++;
        });

        return { present, absent, late, unmarked, total: students.length };
    }, [students, attendanceData]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const name = `${s.profile?.firstName || ''} ${s.profile?.lastName || ''}`.toLowerCase();
            const roll = (s.enrollmentNumber || s.rollNumber || '').toLowerCase();
            const matchesSearch = name.includes(search.toLowerCase()) || roll.includes(search.toLowerCase());

            const status = attendanceData[s._id]?.status || 'unmarked';
            const matchesFilter = filter === 'all' || 
                (filter === 'present' && status === 'present') ||
                (filter === 'absent' && status === 'absent') ||
                (filter === 'late' && status === 'late') ||
                (filter === 'unmarked' && status === 'unmarked');

            return matchesSearch && matchesFilter;
        });
    }, [students, search, filter, attendanceData]);

    const handleMarkAllPresent = () => {
        students.forEach(s => {
            onStatusChange(s._id, 'present');
        });
    };

    return (
        <div className="space-y-3 pb-16">
            {/* Flat Sticky Live Tally Header */}
            <div className="sticky top-14 z-30 bg-slate-900 text-white p-3 rounded-lg border border-slate-800 space-y-2.5">
                <div className="flex justify-between items-center">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {batchName || 'Section Attendance'}
                        </span>
                        <h2 className="text-sm font-bold text-white leading-tight">Student Tally</h2>
                    </div>

                    <button
                        onClick={handleMarkAllPresent}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                        <CheckCheck size={14} /> Mark All Present
                    </button>
                </div>

                {/* Tally Metrics Strip */}
                <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="bg-slate-800 p-1.5 rounded-md border border-slate-700">
                        <p className="text-[9px] uppercase font-bold text-slate-400">Total</p>
                        <p className="text-xs font-bold text-white mt-0.5">{counts.total}</p>
                    </div>
                    <div className="bg-slate-800 p-1.5 rounded-md border border-slate-700">
                        <p className="text-[9px] uppercase font-bold text-emerald-400">Present</p>
                        <p className="text-xs font-bold text-emerald-400 mt-0.5">{counts.present}</p>
                    </div>
                    <div className="bg-slate-800 p-1.5 rounded-md border border-slate-700">
                        <p className="text-[9px] uppercase font-bold text-rose-400">Absent</p>
                        <p className="text-xs font-bold text-rose-400 mt-0.5">{counts.absent}</p>
                    </div>
                    <div className="bg-slate-800 p-1.5 rounded-md border border-slate-700">
                        <p className="text-[9px] uppercase font-bold text-amber-400">Late</p>
                        <p className="text-xs font-bold text-amber-400 mt-0.5">{counts.late}</p>
                    </div>
                </div>
            </div>

            {/* Flat Search & Filter Bar */}
            <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search student..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-md pl-8 pr-3 py-2 text-xs font-medium outline-none focus:border-slate-400"
                    />
                </div>

                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-md px-2.5 py-2 text-xs font-bold text-slate-700 outline-none"
                >
                    <option value="all">All ({students.length})</option>
                    <option value="present">Present ({counts.present})</option>
                    <option value="absent">Absent ({counts.absent})</option>
                    <option value="late">Late ({counts.late})</option>
                    <option value="unmarked">Unmarked ({counts.unmarked})</option>
                </select>
            </div>

            {/* Flat Student Cards List */}
            {filteredStudents.length === 0 ? (
                <div className="bg-white p-6 rounded-lg text-center border border-slate-200">
                    <Users size={24} className="text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-700">No Students Found</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredStudents.map((s, idx) => {
                        const currentStatus = attendanceData[s._id]?.status || 'present';
                        const firstName = s.profile?.firstName || 'Student';
                        const lastName = s.profile?.lastName || '';
                        const roll = s.enrollmentNumber || s.rollNumber || `#${idx + 1}`;

                        return (
                            <div
                                key={s._id}
                                className="bg-white p-3 rounded-lg border border-slate-200 space-y-2.5"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center uppercase">
                                            {firstName[0]}
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-900 leading-tight">
                                                {firstName} {lastName}
                                            </h4>
                                            <p className="text-[10px] text-slate-500 font-mono font-medium">
                                                ID: {roll}
                                            </p>
                                        </div>
                                    </div>

                                    <span className={cn(
                                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded border",
                                        currentStatus === 'present' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                        currentStatus === 'absent' ? "bg-rose-50 text-rose-700 border-rose-200" :
                                        currentStatus === 'late' ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200"
                                    )}>
                                        {currentStatus}
                                    </span>
                                </div>

                                {/* Flat 3-Way Touch Toggle Bar */}
                                <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => onStatusChange(s._id, 'present')}
                                        className={cn(
                                            "h-9 rounded-md text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors",
                                            currentStatus === 'present'
                                                ? "bg-emerald-600 text-white"
                                                : "bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700"
                                        )}
                                    >
                                        <CheckCircle2 size={14} /> Present
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => onStatusChange(s._id, 'absent')}
                                        className={cn(
                                            "h-9 rounded-md text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors",
                                            currentStatus === 'absent'
                                                ? "bg-rose-600 text-white"
                                                : "bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700"
                                        )}
                                    >
                                        <XCircle size={14} /> Absent
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => onStatusChange(s._id, 'late')}
                                        className={cn(
                                            "h-9 rounded-md text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors",
                                            currentStatus === 'late'
                                                ? "bg-amber-600 text-white"
                                                : "bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700"
                                        )}
                                    >
                                        <Clock size={14} /> Late
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Flat Floating Save Attendance Bar */}
            <div className="fixed bottom-14 left-0 right-0 p-3 bg-white border-t border-slate-200 z-30 md:hidden">
                <Button
                    onClick={onSave}
                    disabled={saving || students.length === 0}
                    className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-md flex items-center justify-center gap-2"
                >
                    <Save size={16} />
                    {saving ? "Saving..." : `Save Attendance (${counts.total})`}
                </Button>
            </div>
        </div>
    );
}
