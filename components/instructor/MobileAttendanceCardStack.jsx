"use client";

import { useState, useMemo } from "react";
import { 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Search, 
    Save, 
    User, 
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
    const [filter, setFilter] = useState("all"); // 'all', 'present', 'absent', 'late', 'unmarked'

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
        <div className="space-y-4 pb-20">
            {/* Sticky Live Tally Header */}
            <div className="sticky top-14 z-30 bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">
                            {batchName || 'Section Attendance'}
                        </span>
                        <h2 className="text-base font-black text-white">Student Tally</h2>
                    </div>

                    <button
                        onClick={handleMarkAllPresent}
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                        <CheckCheck size={14} /> Mark All Present
                    </button>
                </div>

                {/* Tally Metrics Pills */}
                <div className="grid grid-cols-4 gap-2 text-center pt-1">
                    <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                        <p className="text-[9px] uppercase font-extrabold text-slate-400">Total</p>
                        <p className="text-sm font-black text-white">{counts.total}</p>
                    </div>
                    <div className="bg-emerald-950/60 p-2 rounded-xl border border-emerald-800/50">
                        <p className="text-[9px] uppercase font-extrabold text-emerald-400">Present</p>
                        <p className="text-sm font-black text-emerald-300">{counts.present}</p>
                    </div>
                    <div className="bg-rose-950/60 p-2 rounded-xl border border-rose-800/50">
                        <p className="text-[9px] uppercase font-extrabold text-rose-400">Absent</p>
                        <p className="text-sm font-black text-rose-300">{counts.absent}</p>
                    </div>
                    <div className="bg-amber-950/60 p-2 rounded-xl border border-amber-800/50">
                        <p className="text-[9px] uppercase font-extrabold text-amber-400">Late</p>
                        <p className="text-sm font-black text-amber-300">{counts.late}</p>
                    </div>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search student..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold outline-none focus:border-indigo-500 shadow-sm"
                    />
                </div>

                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none shadow-sm"
                >
                    <option value="all">All ({students.length})</option>
                    <option value="present">Present ({counts.present})</option>
                    <option value="absent">Absent ({counts.absent})</option>
                    <option value="late">Late ({counts.late})</option>
                    <option value="unmarked">Unmarked ({counts.unmarked})</option>
                </select>
            </div>

            {/* Student Cards Stack */}
            {filteredStudents.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl text-center border border-slate-200 shadow-sm">
                    <Users size={32} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No Students Found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting search or filter criteria.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredStudents.map((s, idx) => {
                        const currentStatus = attendanceData[s._id]?.status || 'present';
                        const firstName = s.profile?.firstName || 'Student';
                        const lastName = s.profile?.lastName || '';
                        const roll = s.enrollmentNumber || s.rollNumber || `#${idx + 1}`;

                        return (
                            <div
                                key={s._id}
                                className={cn(
                                    "bg-white p-4 rounded-2xl border transition-all shadow-sm space-y-3",
                                    currentStatus === 'present' ? "border-emerald-200 ring-1 ring-emerald-100" :
                                    currentStatus === 'absent' ? "border-rose-200 ring-1 ring-rose-100" :
                                    currentStatus === 'late' ? "border-amber-200 ring-1 ring-amber-100" : "border-slate-200"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full font-black text-xs flex items-center justify-center uppercase shadow-sm",
                                            currentStatus === 'present' ? "bg-emerald-100 text-emerald-700" :
                                            currentStatus === 'absent' ? "bg-rose-100 text-rose-700" :
                                            currentStatus === 'late' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                                        )}>
                                            {firstName[0]}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                                                {firstName} {lastName}
                                            </h4>
                                            <p className="text-[11px] text-slate-400 font-mono font-medium">
                                                ID: {roll}
                                            </p>
                                        </div>
                                    </div>

                                    <span className={cn(
                                        "text-[10px] font-black uppercase px-2.5 py-1 rounded-full border",
                                        currentStatus === 'present' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                        currentStatus === 'absent' ? "bg-rose-50 text-rose-700 border-rose-200" :
                                        currentStatus === 'late' ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-500 border-slate-200"
                                    )}>
                                        {currentStatus}
                                    </span>
                                </div>

                                {/* 3-Way Large Touch Toggle Bar (48px Min Target) */}
                                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => onStatusChange(s._id, 'present')}
                                        className={cn(
                                            "h-11 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95",
                                            currentStatus === 'present'
                                                ? "bg-emerald-600 text-white shadow-emerald-500/30"
                                                : "bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700"
                                        )}
                                    >
                                        <CheckCircle2 size={16} /> Present
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => onStatusChange(s._id, 'absent')}
                                        className={cn(
                                            "h-11 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95",
                                            currentStatus === 'absent'
                                                ? "bg-rose-600 text-white shadow-rose-500/30"
                                                : "bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700"
                                        )}
                                    >
                                        <XCircle size={16} /> Absent
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => onStatusChange(s._id, 'late')}
                                        className={cn(
                                            "h-11 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95",
                                            currentStatus === 'late'
                                                ? "bg-amber-600 text-white shadow-amber-500/30"
                                                : "bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700"
                                        )}
                                    >
                                        <Clock size={16} /> Late
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Floating Save Attendance Bottom Bar */}
            <div className="fixed bottom-16 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 shadow-2xl md:hidden">
                <Button
                    onClick={onSave}
                    disabled={saving || students.length === 0}
                    className="w-full h-12 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 active:scale-98"
                >
                    <Save size={18} />
                    {saving ? "Saving Attendance..." : `Save Attendance (${counts.total})`}
                </Button>
            </div>
        </div>
    );
}
