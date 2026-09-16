"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
    Calendar, 
    Clock, 
    MapPin, 
    Users, 
    ChevronRight, 
    ChevronLeft, 
    BookOpen, 
    AlertCircle,
    Layers
} from "lucide-react";

export default function StudentBatchesPage() {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBatches = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/v1/student/batches");
            if (!res.ok) throw new Error("Failed to load batches");
            const data = await res.json();
            setBatches(data.batches || []);
        } catch (err) {
            console.error("Fetch batches error:", err);
            setError("Unable to load batches. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBatches();
    }, [fetchBatches]);

    const getStatus = (batch) => {
        const now = new Date();
        const start = batch.schedule?.startDate ? new Date(batch.schedule.startDate) : null;
        const end = batch.schedule?.endDate ? new Date(batch.schedule.endDate) : null;

        const isStartValid = start && !isNaN(start.getTime());
        const isEndValid = end && !isNaN(end.getTime());

        if (isStartValid && start > now) {
            return { 
                label: "Upcoming", 
                className: "bg-amber-50 text-amber-700 border-amber-100/60",
                dotColor: "bg-amber-500"
            };
        }
        if (isEndValid && end < now) {
            return { 
                label: "Completed", 
                className: "bg-slate-100 text-slate-600 border-slate-200/60",
                dotColor: "bg-slate-400"
            };
        }
        return { 
            label: "Active", 
            className: "bg-emerald-50 text-emerald-700 border-emerald-100/60",
            dotColor: "bg-emerald-500"
        };
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 safe-pb p-2 sm:p-4 animate-pulse">
                <div className="h-12 bg-white rounded-[16px] border border-[#E9E8F0]" />
                <div className="h-24 bg-white rounded-[16px] border border-[#E9E8F0]" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-white rounded-[16px] border border-[#E9E8F0]" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-5xl mx-auto p-4 safe-pb">
                <div className="py-16 text-center bg-white rounded-[16px] border border-[#E9E8F0] space-y-4">
                    <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-[#F4586A] mx-auto border border-rose-100">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-[#1E1B2E]">Unable to Load Batches</h3>
                        <p className="text-xs text-[#8D8A9B] mt-1">{error}</p>
                    </div>
                    <button
                        onClick={fetchBatches}
                        className="px-5 py-2 bg-[#2C2A46] text-white rounded-full text-xs font-semibold hover:bg-[#1E1B2E] transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 safe-pb p-2 sm:p-4">
            {/* Top Navigation Pill Bar */}
            <div className="flex items-center justify-between gap-4 bg-white p-3 sm:p-4 rounded-[16px] border border-[#E9E8F0]">
                <Link 
                    href="/student/dashboard"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E9E8F0] text-xs font-semibold text-[#1E1B2E] hover:bg-[#F8F7FA] transition-colors"
                >
                    <ChevronLeft size={14} />
                    Dashboard
                </Link>

                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#EDE8FB] text-[#6E5AE0] text-xs font-semibold">
                        {batches.length} {batches.length === 1 ? "Enrolled Batch" : "Enrolled Batches"}
                    </span>
                </div>
            </div>

            {/* Header Strip */}
            <div className="bg-white rounded-[16px] border border-[#E9E8F0] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-[14px] bg-[#EDE8FB] text-[#6E5AE0] flex items-center justify-center shrink-0 border border-[#6E5AE0]/15">
                        <Layers size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-[#1E1B2E]">My Batches</h1>
                        <p className="text-xs text-[#8D8A9B] mt-0.5">
                            Track your academic enrollments, class schedules, and subject syllabus progress.
                        </p>
                    </div>
                </div>
            </div>

            {/* Batches Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {batches.map(batch => {
                    const status = getStatus(batch);
                    const subjects = batch.course?.subjects || [];

                    return (
                        <div 
                            key={batch._id} 
                            className="bg-white rounded-[16px] border border-[#E9E8F0] p-5 space-y-4 hover:border-[#6E5AE0]/40 transition-all flex flex-col justify-between"
                        >
                            <div className="space-y-4">
                                {/* Batch Name and Status */}
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <h3 className="text-base font-bold text-[#1E1B2E]">{batch.name}</h3>
                                        <p className="text-xs font-semibold text-[#6E5AE0] mt-0.5">
                                            {batch.course?.name || "Diploma Course"}
                                        </p>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold shrink-0 ${status.className}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                                        {status.label}
                                    </span>
                                </div>

                                <div className="h-px bg-[#E9E8F0]" />

                                {/* Schedule & Location Details */}
                                <div className="space-y-2.5 text-xs text-[#8D8A9B]">
                                    <div className="flex items-start gap-2.5">
                                        <MapPin size={15} className="text-[#8D8A9B] shrink-0 mt-0.5" />
                                        <span className="text-[#1E1B2E]">{batch.schedule?.description || "On-Campus Classroom"}</span>
                                    </div>

                                    <div className="flex items-center gap-2.5">
                                        <Calendar size={15} className="text-[#8D8A9B] shrink-0" />
                                        <span>
                                            {batch.schedule?.startDate ? new Date(batch.schedule.startDate).toLocaleDateString() : 'Active Session'}
                                            {batch.schedule?.endDate ? ` – ${new Date(batch.schedule.endDate).toLocaleDateString()}` : ''}
                                        </span>
                                    </div>

                                    <div className="flex items-start gap-2.5">
                                        <Clock size={15} className="text-[#8D8A9B] shrink-0 mt-0.5" />
                                        <div>
                                            {Array.isArray(batch.schedule?.daysOfWeek) && batch.schedule.daysOfWeek.length > 0 ? (
                                                <span className="font-semibold text-[#1E1B2E]">
                                                    {batch.schedule.daysOfWeek
                                                        .filter(d => Number.isInteger(d) && d >= 0 && d <= 6)
                                                        .map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d])
                                                        .join(', ')}
                                                </span>
                                            ) : (
                                                <span>Mon – Sat</span>
                                            )}
                                            {batch.schedule?.timeSlot?.start && (
                                                <div className="text-[11px] text-[#8D8A9B] mt-0.5">
                                                    {batch.schedule.timeSlot.start} – {batch.schedule.timeSlot.end}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {subjects.length > 0 && (
                                        <div className="flex items-center gap-2.5 pt-1">
                                            <BookOpen size={15} className="text-[#8D8A9B] shrink-0" />
                                            <span>{subjects.length} Active Subjects</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* View Syllabus Button */}
                            <div className="pt-3 border-t border-[#E9E8F0] flex justify-end">
                                <Link
                                    href={`/student/batches/${batch._id}`}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EDE8FB] text-[#6E5AE0] text-xs font-semibold hover:bg-[#e0d8fa] transition-colors"
                                >
                                    View Syllabus Progress
                                    <ChevronRight size={14} />
                                </Link>
                            </div>
                        </div>
                    );
                })}

                {batches.length === 0 && (
                    <div className="col-span-full py-16 text-center bg-white rounded-[16px] border border-[#E9E8F0] space-y-3">
                        <Users size={36} className="mx-auto text-[#8D8A9B]" />
                        <h3 className="text-sm font-bold text-[#1E1B2E]">No Active Enrolled Batches</h3>
                        <p className="text-xs text-[#8D8A9B]">You are not currently enrolled in any active class batches.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
