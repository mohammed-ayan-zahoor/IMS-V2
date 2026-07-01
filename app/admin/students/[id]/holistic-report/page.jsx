"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
    ArrowLeft, Printer, TrendingUp, Activity, Users, BookOpen,
    Award, MessageSquare, ToggleLeft, ToggleRight, ChevronDown,
    ChevronUp, Star, AlertCircle, Loader2, BarChart2
} from "lucide-react";

// ── Palette ─────────────────────────────────────────────────────────────────
const SUBJECT_COLORS = [
    "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6",
    "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];
const CO_COLORS = [
    "#06b6d4", "#a855f7", "#fb923c", "#22d3ee", "#4ade80",
    "#f43f5e", "#facc15", "#38bdf8", "#c084fc", "#86efac",
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtPct = (v) => (v == null ? "N/A" : `${Number(v).toFixed(1)}%`);
const examTypeLabel = {
    unit_test: "Unit Test", monthly: "Monthly", quarterly: "Quarterly",
    half_yearly: "Half-Yearly", annual: "Annual", pre_board: "Pre-Board", custom: "Custom",
};
const resultBadge = {
    pass: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Pass" },
    fail: { bg: "bg-red-100", text: "text-red-700", label: "Fail" },
    compartment: { bg: "bg-amber-100", text: "text-amber-700", label: "Compartment" },
    promoted: { bg: "bg-blue-100", text: "text-blue-700", label: "Promoted" },
};

// Custom Tooltip for line chart
const AcademicTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-gray-900 text-white rounded-xl px-4 py-3 shadow-2xl border border-white/10 text-sm">
            <p className="font-bold text-white mb-2">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
                    <span className="text-gray-300">{p.name}:</span>
                    <span className="font-semibold text-white">{fmtPct(p.value)}</span>
                </div>
            ))}
        </div>
    );
};

const CoScholasticTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-gray-900 text-white rounded-xl px-4 py-3 shadow-2xl border border-white/10 text-sm">
            <p className="font-bold text-white mb-2">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
                    <span className="text-gray-300">{p.name}:</span>
                    <span className="font-semibold text-white">{p.value} / 5</span>
                </div>
            ))}
        </div>
    );
};

const AttTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
        <div className="bg-gray-900 text-white rounded-xl px-4 py-3 shadow-2xl border border-white/10 text-sm">
            <p className="font-bold mb-1">{label}</p>
            <p className="text-emerald-400">Present: {d?.present ?? 0} days</p>
            <p className="text-red-400">Absent: {d?.absent ?? 0} days</p>
            <p className="text-gray-300">Total: {d?.total ?? 0} days</p>
            <p className="text-blue-300 font-semibold">{fmtPct(d?.percentage)}</p>
        </div>
    );
};

// Section card wrapper
const Section = ({ icon: Icon, title, badge, children, className = "" }) => (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Icon size={16} className="text-indigo-600" />
            </div>
            <h2 className="font-bold text-gray-800 text-[15px]">{title}</h2>
            {badge && (
                <span className="ml-auto text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {badge}
                </span>
            )}
        </div>
        <div className="p-6">{children}</div>
    </div>
);

// Empty state
const Empty = ({ message }) => (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <AlertCircle size={32} className="mb-3 opacity-30" />
        <p className="text-sm">{message}</p>
    </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HolisticReportPage() {
    const { id } = useParams();
    const router = useRouter();
    const printRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [includeOnline, setIncludeOnline] = useState(false);
    const [expandedGrades, setExpandedGrades] = useState({});
    const [activeSubjects, setActiveSubjects] = useState(null); // null = all

    const fetchReport = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `/api/v1/students/${id}/holistic-report?includeOnline=${includeOnline}`
            );
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to load");
            setData(json);
            setActiveSubjects(null);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [id, includeOnline]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handlePrint = () => window.print();

    const toggleGrade = (grade) =>
        setExpandedGrades((prev) => ({ ...prev, [grade]: !prev[grade] }));

    // Build chart data — one row per gradeLabel
    const buildAcademicChartData = () => {
        if (!data?.academicSeries?.length || !data?.timeline?.length) return [];
        return data.timeline.map((grade) => {
            const row = { grade };
            for (const s of data.academicSeries) {
                const pt = s.data.find((d) => d.gradeLabel === grade);
                if (pt) row[s.subject] = pt.percentage;
            }
            return row;
        });
    };

    const buildCoSChartData = () => {
        if (!data?.coScholasticSeries?.length || !data?.timeline?.length) return [];
        return data.timeline.map((grade) => {
            const row = { grade };
            for (const s of data.coScholasticSeries) {
                const pt = s.data.find((d) => d.gradeLabel === grade);
                if (pt) row[s.param] = pt.ratingValue;
            }
            return row;
        });
    };

    // Radar data for latest grade
    const buildRadarData = () => {
        if (!data?.coScholasticSeries?.length || !data?.timeline?.length) return [];
        const latestGrade = data.timeline[data.timeline.length - 1];
        return data.coScholasticSeries.map((s) => {
            const pt = s.data.find((d) => d.gradeLabel === latestGrade);
            return { subject: s.param, value: pt?.ratingValue ?? 0, fullMark: 5 };
        });
    };

    const academicChartData = data ? buildAcademicChartData() : [];
    const coSChartData = data ? buildCoSChartData() : [];
    const radarData = data ? buildRadarData() : [];

    const visibleSubjects = activeSubjects
        ? data?.academicSeries?.filter((s) => activeSubjects.includes(s.subject))
        : data?.academicSeries;

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 size={36} className="animate-spin text-indigo-500 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm font-medium">Building holistic report…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white rounded-2xl p-8 shadow text-center max-w-sm">
                    <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
                    <h2 className="font-bold text-gray-800 mb-1">Could not load report</h2>
                    <p className="text-gray-500 text-sm mb-4">{error}</p>
                    <button
                        onClick={() => router.back()}
                        className="text-sm text-indigo-600 font-semibold hover:underline"
                    >
                        ← Go Back
                    </button>
                </div>
            </div>
        );
    }

    const { student, timeline, academicSeries, coScholasticSeries, attendanceSeries, examBreakdown, remarksTimeline, onlineBreakdown } = data;
    const latestGrade = timeline?.[timeline.length - 1] ?? "—";
    const firstGrade = timeline?.[0] ?? "—";

    return (
        <div className="min-h-screen bg-gray-50" ref={printRef}>
            {/* ── Top Bar ─────────────────────────────────────────────────── */}
            <div className="print:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shadow-sm">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors font-medium"
                >
                    <ArrowLeft size={15} /> Back
                </button>
                <div className="h-4 w-px bg-gray-200" />
                <span className="text-sm font-semibold text-gray-700">
                    Holistic Student Report
                </span>
                <div className="ml-auto flex items-center gap-3">
                    {/* Online Exam Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <span className="text-xs font-semibold text-gray-500">Include Online Exams</span>
                        <button
                            onClick={() => setIncludeOnline((v) => !v)}
                            className="transition-colors"
                        >
                            {includeOnline
                                ? <ToggleRight size={26} className="text-indigo-500" />
                                : <ToggleLeft size={26} className="text-gray-300" />}
                        </button>
                    </label>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                    >
                        <Printer size={14} /> Print Report
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
                {/* ── Student Hero Card ─────────────────────────────────── */}
                <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl text-white shadow-xl overflow-hidden">
                    <div className="px-8 py-6 flex items-center gap-6">
                        {/* Avatar */}
                        <div className="shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-white/20 flex items-center justify-center text-3xl font-black text-white">
                            {student.photo
                                ? <img src={student.photo} alt="" className="w-full h-full object-cover" />
                                : <span>{student.name?.charAt(0) || "S"}</span>}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl font-black tracking-tight truncate">{student.name}</h1>
                            <p className="text-indigo-200 text-sm font-medium mt-0.5">
                                Enrollment: {student.enrollmentNumber || "—"}
                            </p>
                            <div className="flex flex-wrap gap-3 mt-3">
                                {student.admissionDate && (
                                    <span className="bg-white/10 text-white text-xs font-semibold px-3 py-1 rounded-full">
                                        Admitted: {new Date(student.admissionDate).toLocaleDateString("en-IN", { year: "numeric", month: "short" })}
                                    </span>
                                )}
                                {student.admissionStd && (
                                    <span className="bg-white/10 text-white text-xs font-semibold px-3 py-1 rounded-full">
                                        Joined in: {student.admissionStd}
                                    </span>
                                )}
                                <span className="bg-white/10 text-white text-xs font-semibold px-3 py-1 rounded-full">
                                    Journey: {firstGrade} → {latestGrade}
                                </span>
                                <span className="bg-white/10 text-white text-xs font-semibold px-3 py-1 rounded-full">
                                    {timeline?.length ?? 0} Academic {timeline?.length === 1 ? "Year" : "Years"}
                                </span>
                            </div>
                        </div>
                        {/* Status pills */}
                        <div className="shrink-0 flex flex-col gap-2 text-right">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${student.status === "ACTIVE" ? "bg-emerald-500" : student.status === "COMPLETED" ? "bg-blue-500" : "bg-amber-500"}`}>
                                {student.status}
                            </span>
                            {student.conduct && (
                                <span className="text-xs text-indigo-200">Conduct: <strong className="text-white">{student.conduct}</strong></span>
                            )}
                            {student.progress && (
                                <span className="text-xs text-indigo-200">Progress: <strong className="text-white">{student.progress}</strong></span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Academic Journey ──────────────────────────────────── */}
                <Section icon={TrendingUp} title="Academic Journey" badge={`${academicSeries?.length ?? 0} subjects`}>
                    {academicSeries?.length > 0 ? (
                        <>
                            {/* Subject filter pills */}
                            <div className="flex flex-wrap gap-2 mb-5">
                                <button
                                    onClick={() => setActiveSubjects(null)}
                                    className={`text-xs px-3 py-1 rounded-full font-semibold border transition-colors ${activeSubjects === null ? "bg-indigo-600 text-white border-indigo-600" : "text-gray-500 border-gray-200 hover:border-indigo-300"}`}
                                >
                                    All Subjects
                                </button>
                                {academicSeries.map((s, i) => (
                                    <button
                                        key={s.subject}
                                        onClick={() => setActiveSubjects(activeSubjects?.includes(s.subject) && activeSubjects.length === 1 ? null : [s.subject])}
                                        className={`text-xs px-3 py-1 rounded-full font-semibold border transition-colors`}
                                        style={{
                                            background: activeSubjects?.includes(s.subject) ? SUBJECT_COLORS[i % SUBJECT_COLORS.length] : "transparent",
                                            color: activeSubjects?.includes(s.subject) ? "#fff" : "#6b7280",
                                            borderColor: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
                                        }}
                                    >
                                        {s.subject}
                                    </button>
                                ))}
                            </div>
                            <ResponsiveContainer width="100%" height={320}>
                                <LineChart data={academicChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="grade" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                                    <Tooltip content={<AcademicTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                                    {(visibleSubjects ?? academicSeries).map((s, i) => (
                                        <Line
                                            key={s.subject}
                                            type="monotone"
                                            dataKey={s.subject}
                                            stroke={SUBJECT_COLORS[i % SUBJECT_COLORS.length]}
                                            strokeWidth={2.5}
                                            dot={{ r: 5, strokeWidth: 2, fill: "#fff" }}
                                            activeDot={{ r: 7 }}
                                            connectNulls
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </>
                    ) : (
                        <Empty message="No offline exam results found across sessions." />
                    )}
                </Section>

                {/* ── Co-Scholastic / Activities ───────────────────────── */}
                <Section icon={Activity} title="Co-Scholastic & Activities" badge={`${coScholasticSeries?.length ?? 0} parameters`}>
                    {coScholasticSeries?.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Trend Lines */}
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Rating Trend (5 = Best)</p>
                                <ResponsiveContainer width="100%" height={260}>
                                    <LineChart data={coSChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="grade" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                                        <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                                        <Tooltip content={<CoScholasticTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                                        {coScholasticSeries.map((s, i) => (
                                            <Line
                                                key={s.param}
                                                type="monotone"
                                                dataKey={s.param}
                                                stroke={CO_COLORS[i % CO_COLORS.length]}
                                                strokeWidth={2.5}
                                                dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                                                activeDot={{ r: 6 }}
                                                connectNulls
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            {/* Radar — Latest year snapshot */}
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                                    Latest Snapshot ({latestGrade})
                                </p>
                                {radarData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={260}>
                                        <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                                            <PolarGrid stroke="#e2e8f0" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#64748b" }} />
                                            <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                                            <Radar name="Rating" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} dot />
                                            <Tooltip formatter={(v) => [`${v} / 5`, "Rating"]} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <Empty message="No data for latest grade." />
                                )}
                            </div>
                        </div>
                    ) : (
                        <Empty message="No co-scholastic ratings found. Add them via the offline exam co-scholastic parameters." />
                    )}
                </Section>

                {/* ── Attendance Trend ──────────────────────────────────── */}
                <Section icon={Users} title="Attendance Trend">
                    {attendanceSeries?.filter(a => a.percentage != null)?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={attendanceSeries} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="gradeLabel" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                                <Tooltip content={<AttTooltip />} />
                                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                                <Bar dataKey="percentage" name="Attendance %" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={60} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <Empty message="No attendance data found for this student." />
                    )}
                </Section>

                {/* ── Exam Breakdown ────────────────────────────────────── */}
                <Section icon={BookOpen} title="Exam-wise Breakdown">
                    {Object.keys(examBreakdown || {}).length > 0 ? (
                        <div className="space-y-3">
                            {timeline?.map((grade) => {
                                const exams = examBreakdown[grade];
                                if (!exams?.length) return null;
                                const isOpen = expandedGrades[grade] !== false; // default open
                                return (
                                    <div key={grade} className="border border-gray-100 rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => toggleGrade(grade)}
                                            className="w-full flex items-center gap-3 px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                                        >
                                            <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center shrink-0">
                                                {grade?.charAt(0) || "G"}
                                            </span>
                                            <span className="font-bold text-gray-800 text-sm">{grade}</span>
                                            <span className="ml-auto text-xs text-gray-400">{exams.length} exam{exams.length !== 1 ? "s" : ""}</span>
                                            {isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                                        </button>
                                        {isOpen && (
                                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {exams.map((exam, i) => {
                                                    const badge = resultBadge[exam.result] || resultBadge.pass;
                                                    return (
                                                        <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                                <div>
                                                                    <p className="font-bold text-gray-800 text-sm leading-tight">{exam.examTitle}</p>
                                                                    <p className="text-xs text-gray-400 mt-0.5">{examTypeLabel[exam.examType] || exam.examType}</p>
                                                                </div>
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badge.bg} ${badge.text}`}>
                                                                    {badge.label}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-end justify-between mt-3">
                                                                <div>
                                                                    <p className="text-2xl font-black text-gray-900">{fmtPct(exam.percentage)}</p>
                                                                    {exam.totalObtained != null && (
                                                                        <p className="text-xs text-gray-400">{exam.totalObtained} / {exam.totalMax} marks</p>
                                                                    )}
                                                                </div>
                                                                <div className="text-right">
                                                                    {exam.grade && (
                                                                        <span className="inline-block bg-indigo-50 text-indigo-700 font-black text-sm px-2 py-0.5 rounded-lg">
                                                                            {exam.grade}
                                                                        </span>
                                                                    )}
                                                                    {exam.rank && (
                                                                        <p className="text-xs text-gray-400 mt-1">Rank #{exam.rank}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <Empty message="No exam breakdown available." />
                    )}
                </Section>

                {/* ── Online Exams (optional) ───────────────────────────── */}
                {includeOnline && (
                    <Section icon={BarChart2} title="Online Exam Results" badge="Optional">
                        {onlineBreakdown?.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                            <th className="pb-2 pr-4">Grade</th>
                                            <th className="pb-2 pr-4">Exam</th>
                                            <th className="pb-2 pr-4">Subject</th>
                                            <th className="pb-2 pr-4">Score</th>
                                            <th className="pb-2">Percentage</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {onlineBreakdown.map((row, i) => (
                                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                                                <td className="py-2.5 pr-4 font-semibold text-gray-700">{row.gradeLabel}</td>
                                                <td className="py-2.5 pr-4 text-gray-600">{row.examTitle}</td>
                                                <td className="py-2.5 pr-4 text-gray-500">{row.subject}</td>
                                                <td className="py-2.5 pr-4 text-gray-600">{row.score} / {row.totalMarks}</td>
                                                <td className="py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${row.percentage}%` }} />
                                                        </div>
                                                        <span className="font-semibold text-gray-700">{fmtPct(row.percentage)}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <Empty message="No online exam submissions found." />
                        )}
                    </Section>
                )}

                {/* ── Teacher Remarks Timeline ──────────────────────────── */}
                <Section icon={MessageSquare} title="Teacher Remarks Timeline">
                    {remarksTimeline?.length > 0 ? (
                        <div className="relative pl-6">
                            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-purple-200 to-pink-200" />
                            <div className="space-y-5">
                                {remarksTimeline.map((r, i) => (
                                    <div key={i} className="relative">
                                        <div className="absolute -left-[18px] w-3 h-3 rounded-full bg-indigo-500 border-2 border-white top-1" />
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{r.gradeLabel}</span>
                                                <span className="text-xs text-gray-400">·</span>
                                                <span className="text-xs font-semibold text-gray-500">{r.examTitle}</span>
                                                {r.date && (
                                                    <>
                                                        <span className="text-xs text-gray-300">·</span>
                                                        <span className="text-xs text-gray-400">{new Date(r.date).toLocaleDateString("en-IN")}</span>
                                                    </>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-700 leading-relaxed">{r.remarks}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <Empty message="No teacher remarks recorded yet." />
                    )}
                </Section>

                {/* Print footer */}
                <div className="print:block hidden text-center text-xs text-gray-400 py-4 border-t border-gray-200 mt-8">
                    <p>Generated on {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })} • Holistic Student Report • Confidential</p>
                </div>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    body { background: white !important; }
                    .print\\:hidden { display: none !important; }
                    .print\\:block { display: block !important; }
                    .bg-gradient-to-r { background: #4f46e5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
}
