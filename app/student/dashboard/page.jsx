"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
    CalendarCheck,
    PenTool,
    FileText,
    Layers,
    Clock,
    ArrowUpRight,
    Calendar,
    Settings,
    AlertCircle
} from "lucide-react";
import Skeleton from "@/components/shared/Skeleton";

export default function StudentDashboard() {
    const { data: session } = useSession();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDashboardData = async () => {
        try {
            const res = await fetch("/api/v1/student/dashboard");
            if (res.ok) {
                const json = await res.json();
                setData(json);
                setError(null);
            } else {
                setError("Failed to load student dashboard");
            }
        } catch (err) {
            console.error("Dashboard fetch error:", err);
            setError("Network connection issue. Please refresh.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-28 w-full rounded-2xl" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-72 w-full rounded-2xl" />
                    <Skeleton className="h-72 w-full rounded-2xl" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-16 text-center">
                <AlertCircle size={32} className="mx-auto text-rose-500 mb-2" />
                <h3 className="text-base font-semibold text-[#14161A]">{error}</h3>
                <button
                    onClick={fetchDashboardData}
                    className="mt-4 px-4 py-1.5 text-xs font-medium text-white bg-[#14161A] rounded-lg hover:bg-black transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    const profile = data?.studentProfile || {
        name: session?.user?.name || "Student",
        enrollmentNumber: "",
        avatar: session?.user?.image || null,
        email: session?.user?.email || "",
        courseName: "",
        batchName: ""
    };

    const attendance = data?.attendance ?? 0;
    const examsTaken = data?.examsTaken ?? 0;
    const materialsCount = data?.materialsCount ?? 0;
    const enrolledCourses = data?.enrolledCourses || [];
    const upcomingExams = data?.upcomingExams || [];
    const recentMaterials = data?.recentMaterials || [];
    const syllabusProgress = data?.syllabusProgress || [];

    const formatDateTime = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " +
               d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="space-y-6 pb-12 select-text font-[-apple-system,BlinkMacSystemFont,'Inter',system-ui,sans-serif]">
            {/* ── 1. Student Hero Profile Banner ─────────────────────────── */}
            <div className="rounded-2xl border border-[#E6E8EC] bg-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full border border-[#E6E8EC] bg-[#F2F3F5] overflow-hidden shrink-0 flex items-center justify-center text-lg font-bold text-[#14161A]">
                        {profile.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                        ) : (
                            <span>{profile.name?.substring(0, 2)?.toUpperCase() || "ST"}</span>
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-bold text-[#14161A] tracking-tight">
                                {profile.name}
                            </h1>
                            {profile.enrollmentNumber && (
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-[#F2F3F5] text-[#5F6673]">
                                    {profile.enrollmentNumber}
                                </span>
                            )}
                        </div>
                        <p className="text-[13px] text-[#5F6673] mt-0.5">
                            {profile.courseName || "Academic Curriculum"}
                            {profile.batchName ? ` · ${profile.batchName}` : ""}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                    <Link
                        href="/student/timetable"
                        className="h-8 px-3 rounded-lg border border-[#E6E8EC] bg-white hover:bg-[#F2F3F5] text-[12px] font-medium text-[#14161A] transition-colors flex items-center gap-1.5"
                    >
                        <Clock size={13} className="text-[#5F6673]" />
                        <span>Timetable</span>
                    </Link>
                    <Link
                        href="/student/settings"
                        className="h-8 px-3 rounded-lg border border-[#E6E8EC] bg-white hover:bg-[#F2F3F5] text-[12px] font-medium text-[#14161A] transition-colors flex items-center gap-1.5"
                    >
                        <Settings size={13} className="text-[#5F6673]" />
                        <span>Settings</span>
                    </Link>
                </div>
            </div>

            {/* ── 2. Metric KPI Cards (Real Data) ─────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <Link
                    href="/student/attendance"
                    className="p-4 rounded-xl border border-[#E6E8EC] bg-white hover:border-[#14161A]/30 transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-[#5F6673]">Attendance</span>
                        <CalendarCheck size={15} className="text-[#5F6673] group-hover:text-[#14161A] transition-colors" />
                    </div>
                    <div className="text-2xl font-bold text-[#14161A] mt-2 tabular-nums">
                        {attendance}%
                    </div>
                    <p className="text-[11px] text-[#5F6673] mt-0.5">Active term sessions</p>
                </Link>

                <Link
                    href="/student/exams"
                    className="p-4 rounded-xl border border-[#E6E8EC] bg-white hover:border-[#14161A]/30 transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-[#5F6673]">Exams Taken</span>
                        <PenTool size={15} className="text-[#5F6673] group-hover:text-[#14161A] transition-colors" />
                    </div>
                    <div className="text-2xl font-bold text-[#14161A] mt-2 tabular-nums">
                        {examsTaken}
                    </div>
                    <p className="text-[11px] text-[#5F6673] mt-0.5">Completed assessments</p>
                </Link>

                <Link
                    href="/student/materials"
                    className="p-4 rounded-xl border border-[#E6E8EC] bg-white hover:border-[#14161A]/30 transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-[#5F6673]">Study Materials</span>
                        <FileText size={15} className="text-[#5F6673] group-hover:text-[#14161A] transition-colors" />
                    </div>
                    <div className="text-2xl font-bold text-[#14161A] mt-2 tabular-nums">
                        {materialsCount}
                    </div>
                    <p className="text-[11px] text-[#5F6673] mt-0.5">Notes & documents</p>
                </Link>

                <Link
                    href="/student/batches"
                    className="p-4 rounded-xl border border-[#E6E8EC] bg-white hover:border-[#14161A]/30 transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-[#5F6673]">Enrolled Batches</span>
                        <Layers size={15} className="text-[#5F6673] group-hover:text-[#14161A] transition-colors" />
                    </div>
                    <div className="text-2xl font-bold text-[#14161A] mt-2 tabular-nums">
                        {enrolledCourses.length}
                    </div>
                    <p className="text-[11px] text-[#5F6673] mt-0.5">Active enrollments</p>
                </Link>
            </div>

            {/* ── 3. Two-Column Real Work Area (Upcoming Exams & Recent Materials) ──────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                
                {/* Upcoming Exams Card */}
                <div className="rounded-2xl border border-[#E6E8EC] bg-white p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E6E8EC]/80 pb-3">
                        <div>
                            <h2 className="text-[14px] font-semibold text-[#14161A]">Upcoming Exams</h2>
                            <p className="text-[11px] text-[#5F6673]">Published scheduled tests</p>
                        </div>
                        <Link
                            href="/student/exams"
                            className="text-[12px] font-medium text-[#5F6673] hover:text-[#14161A] flex items-center gap-1 transition-colors"
                        >
                            <span>View all</span>
                            <ArrowUpRight size={13} />
                        </Link>
                    </div>

                    {upcomingExams.length > 0 ? (
                        <div className="divide-y divide-[#E6E8EC]/60">
                            {upcomingExams.map((exam) => (
                                <div key={exam._id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="text-[13px] font-medium text-[#14161A] truncate">{exam.title}</h3>
                                        <div className="flex items-center gap-2 text-[11px] text-[#5F6673] mt-0.5">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={11} />
                                                {formatDateTime(exam.scheduledAt)}
                                            </span>
                                            {exam.duration && (
                                                <>
                                                    <span>·</span>
                                                    <span>{exam.duration} mins</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <Link
                                        href="/student/exams"
                                        className="h-7 px-2.5 rounded-md border border-[#E6E8EC] bg-white hover:bg-[#F2F3F5] text-[11px] font-medium text-[#14161A] transition-colors shrink-0 flex items-center"
                                    >
                                        Details
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-[12px] text-[#5F6673]">
                            No upcoming exams scheduled.
                        </div>
                    )}
                </div>

                {/* Recent Study Materials Card */}
                <div className="rounded-2xl border border-[#E6E8EC] bg-white p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E6E8EC]/80 pb-3">
                        <div>
                            <h2 className="text-[14px] font-semibold text-[#14161A]">Study Materials</h2>
                            <p className="text-[11px] text-[#5F6673]">Recent course uploads</p>
                        </div>
                        <Link
                            href="/student/materials"
                            className="text-[12px] font-medium text-[#5F6673] hover:text-[#14161A] flex items-center gap-1 transition-colors"
                        >
                            <span>View all</span>
                            <ArrowUpRight size={13} />
                        </Link>
                    </div>

                    {recentMaterials.length > 0 ? (
                        <div className="divide-y divide-[#E6E8EC]/60">
                            {recentMaterials.map((mat) => (
                                <div key={mat._id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="text-[13px] font-medium text-[#14161A] truncate">{mat.title}</h3>
                                        <div className="flex items-center gap-2 text-[11px] text-[#5F6673] mt-0.5">
                                            {mat.course?.name && (
                                                <span className="font-medium text-[#14161A]">
                                                    {mat.course.name}
                                                </span>
                                            )}
                                            {mat.createdAt && (
                                                <>
                                                    <span>·</span>
                                                    <span>{new Date(mat.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <Link
                                        href="/student/materials"
                                        className="h-7 px-2.5 rounded-md border border-[#E6E8EC] bg-white hover:bg-[#F2F3F5] text-[11px] font-medium text-[#14161A] transition-colors shrink-0 flex items-center"
                                    >
                                        Open
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-[12px] text-[#5F6673]">
                            No study materials uploaded yet.
                        </div>
                    )}
                </div>
            </div>

            {/* ── 4. Syllabus & Course Progression (Real Data) ─────────────────────────── */}
            <div className="rounded-2xl border border-[#E6E8EC] bg-white p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#E6E8EC]/80 pb-3">
                    <div>
                        <h2 className="text-[14px] font-semibold text-[#14161A]">Curriculum & Syllabus Progress</h2>
                        <p className="text-[11px] text-[#5F6673]">Track syllabus completion across enrolled subjects</p>
                    </div>
                    <Link
                        href="/student/syllabus"
                        className="text-[12px] font-medium text-[#5F6673] hover:text-[#14161A] flex items-center gap-1 transition-colors"
                    >
                        <span>Full syllabus</span>
                        <ArrowUpRight size={13} />
                    </Link>
                </div>

                {syllabusProgress.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {syllabusProgress.map((item, idx) => (
                            <div key={idx} className="p-3.5 rounded-xl bg-[#F2F3F5]/60 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="font-medium text-[13px] text-[#14161A] truncate">
                                        {item.subject || "Subject"}
                                    </div>
                                    {item.code && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-[#5F6673] shrink-0">
                                            {item.code}
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px] text-[#5F6673]">
                                        <span>Progress</span>
                                        <span className="font-semibold text-[#14161A] tabular-nums">{item.progress}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-[#E6E8EC] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#14161A] rounded-full transition-all duration-300"
                                            style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : enrolledCourses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {enrolledCourses.map((c) => (
                            <div key={c.id} className="p-3.5 rounded-xl bg-[#F2F3F5]/60 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="font-medium text-[13px] text-[#14161A] truncate">
                                        {c.title}
                                    </div>
                                    {c.code && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-[#5F6673] shrink-0">
                                            {c.code}
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px] text-[#5F6673]">
                                        <span>Status</span>
                                        <span className="font-medium text-[#14161A]">{c.status}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-[#E6E8EC] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#14161A] rounded-full transition-all duration-300"
                                            style={{ width: `${Math.min(100, Math.max(0, c.progress))}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center text-[12px] text-[#5F6673]">
                        No syllabus or batch progress recorded yet.
                    </div>
                )}
            </div>
        </div>
    );
}
