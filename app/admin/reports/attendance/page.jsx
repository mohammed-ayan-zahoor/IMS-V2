"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { format, subDays, startOfMonth, endOfMonth, parseISO, isValid } from "date-fns";
import { 
    ChevronDown, 
    Search, 
    Download, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown, 
    X, 
    RefreshCw, 
    Check, 
    Calendar as CalendarIcon, 
    User, 
    AlertCircle,
    FileSpreadsheet,
    FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/contexts/ToastContext";
import { useAcademicSession } from "@/contexts/AcademicSessionContext";
import { SPRING } from "@/lib/apple-motion";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

export default function AttendanceReportPage() {
    const toast = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const { selectedSessionId, sessions } = useAcademicSession();

    const instituteCode = session?.user?.institute?.code || "INSTITUTE";
    const isSchool = session?.user?.institute?.type === "SCHOOL" || session?.user?.institute?.code === "QUANTECH";
    const isVocational = session?.user?.institute?.type === "VOCATIONAL";

    // URL Param Initializers
    const initialCourse = searchParams.get("course") || "";
    const initialBatch = searchParams.get("batch") || "";
    const initialFrom = searchParams.get("from") || format(startOfMonth(new Date()), "yyyy-MM-dd");
    const initialTo = searchParams.get("to") || format(endOfMonth(new Date()), "yyyy-MM-dd");

    // Filter States
    const [selectedCourse, setSelectedCourse] = useState(initialCourse);
    const [selectedBatch, setSelectedBatch] = useState(initialBatch);
    const [startDate, setStartDate] = useState(initialFrom);
    const [endDate, setEndDate] = useState(initialTo);
    const [searchStudent, setSearchStudent] = useState("");
    const [exceptionOnly, setExceptionOnly] = useState(false);

    // Metadata & Report Data
    const [courses, setCourses] = useState([]);
    const [courseBundles, setCourseBundles] = useState([]);
    const [batches, setBatches] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Active Popovers
    const [courseOpen, setCourseOpen] = useState(false);
    const [batchOpen, setBatchOpen] = useState(false);
    const [dateOpen, setDateOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null); // Inspector drilldown

    // Sorting State
    const [sortKey, setSortKey] = useState("percentage"); // lowest attendance first by default
    const [sortDir, setSortDir] = useState("asc");

    const searchInputRef = useRef(null);
    const abortControllerRef = useRef(null);

    // Keyboard shortcut: "/" to focus search
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.key === "Escape") {
                setCourseOpen(false);
                setBatchOpen(false);
                setDateOpen(false);
                setExportOpen(false);
                setSelectedStudent(null);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Sync Filter State to URL
    useEffect(() => {
        const params = new URLSearchParams();
        if (selectedCourse) params.set("course", selectedCourse);
        if (selectedBatch) params.set("batch", selectedBatch);
        if (startDate) params.set("from", startDate);
        if (endDate) params.set("to", endDate);

        const newQuery = params.toString();
        const currentQuery = searchParams.toString();
        if (newQuery !== currentQuery) {
            router.replace(`${pathname}${newQuery ? `?${newQuery}` : ""}`, { scroll: false });
        }
    }, [selectedCourse, selectedBatch, startDate, endDate, pathname, router, searchParams]);

    // Fetch Courses on mount
    useEffect(() => {
        let isMounted = true;
        const fetchInitial = async () => {
            try {
                const fetches = [fetch("/api/v1/courses?active=true")];
                if (isVocational) {
                    fetches.push(fetch("/api/v1/course-bundles"));
                }
                const results = await Promise.all(fetches);
                if (results[0].ok) {
                    const data = await results[0].json();
                    if (isMounted && data.courses) setCourses(data.courses);
                }
                if (isVocational && results[1] && results[1].ok) {
                    const bData = await results[1].json();
                    if (isMounted) {
                        setCourseBundles(bData.courseBundles || bData.bundles || (Array.isArray(bData) ? bData : []));
                    }
                }
            } catch (err) {
                console.error("Failed to fetch courses:", err);
            }
        };
        fetchInitial();
        return () => { isMounted = false; };
    }, [isVocational]);

    // Fetch Batches when Course changes
    useEffect(() => {
        if (!selectedCourse) {
            setBatches([]);
            return;
        }
        let isMounted = true;
        const fetchBatches = async () => {
            try {
                const res = await fetch(`/api/v1/batches?courseId=${selectedCourse}&active=true`);
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted && data.batches) setBatches(data.batches);
                }
            } catch (err) {
                console.error("Failed to fetch batches:", err);
            }
        };
        fetchBatches();
        return () => { isMounted = false; };
    }, [selectedCourse]);

    // Automatic Live Query with AbortController
    const fetchReport = useCallback(async () => {
        if (!startDate || !endDate) return;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);
        setError(null);

        try {
            const query = new URLSearchParams({
                startDate,
                endDate,
                ...(selectedCourse && { courseId: selectedCourse }),
                ...(selectedBatch && { batchId: selectedBatch }),
                ...(isSchool && selectedSessionId && { sessionId: selectedSessionId }),
            });

            const res = await fetch(`/api/v1/reports/attendance?${query}`, {
                signal: controller.signal,
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to load report");

            setReportData(data.report || []);
        } catch (err) {
            if (err.name !== "AbortError") {
                setError(err.message || "Couldn't load the report.");
            }
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, selectedCourse, selectedBatch, isSchool, selectedSessionId]);

    // Re-query automatically on any filter change
    useEffect(() => {
        fetchReport();
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [fetchReport]);

    // Statistics & Computations
    const stats = useMemo(() => {
        if (!reportData.length) return { total: 0, avg: 0, lowCount: 0 };
        const total = reportData.length;
        const sumPct = reportData.reduce((acc, curr) => acc + (parseFloat(curr.percentage) || 0), 0);
        const avg = Math.round(sumPct / total);
        const lowCount = reportData.filter((r) => (parseFloat(r.percentage) || 0) < 75).length;
        return { total, avg, lowCount };
    }, [reportData]);

    // Filter & Sort Data Client-side (Instant, zero debounce)
    const processedData = useMemo(() => {
        let result = [...reportData];

        // Search Filter
        if (searchStudent.trim()) {
            const q = searchStudent.trim().toLowerCase();
            result = result.filter(
                (item) =>
                    item.name?.toLowerCase().includes(q) ||
                    item.enrollmentNumber?.toLowerCase().includes(q)
            );
        }

        // Exception filter toggle
        if (exceptionOnly) {
            result = result.filter((item) => (parseFloat(item.percentage) || 0) < 75);
        }

        // Sorting
        result.sort((a, b) => {
            let valA = a[sortKey];
            let valB = b[sortKey];

            if (sortKey === "percentage" || sortKey === "totalDays" || sortKey === "present" || sortKey === "absent" || sortKey === "late" || sortKey === "excused") {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            } else {
                valA = (valA || "").toString().toLowerCase();
                valB = (valB || "").toString().toLowerCase();
            }

            if (valA < valB) return sortDir === "asc" ? -1 : 1;
            if (valA > valB) return sortDir === "asc" ? 1 : -1;
            return 0;
        });

        return result;
    }, [reportData, searchStudent, exceptionOnly, sortKey, sortDir]);

    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    // Date Range Presets
    const applyDatePreset = (preset) => {
        const today = new Date();
        if (preset === "this_month") {
            setStartDate(format(startOfMonth(today), "yyyy-MM-dd"));
            setEndDate(format(endOfMonth(today), "yyyy-MM-dd"));
        } else if (preset === "last_month") {
            const lastMonth = subDays(startOfMonth(today), 1);
            setStartDate(format(startOfMonth(lastMonth), "yyyy-MM-dd"));
            setEndDate(format(endOfMonth(lastMonth), "yyyy-MM-dd"));
        } else if (preset === "last_30_days") {
            setStartDate(format(subDays(today, 30), "yyyy-MM-dd"));
            setEndDate(format(today, "yyyy-MM-dd"));
        } else if (preset === "this_term") {
            // Use current academic session if available, else 90 days
            setStartDate(format(subDays(today, 90), "yyyy-MM-dd"));
            setEndDate(format(today, "yyyy-MM-dd"));
        }
        setDateOpen(false);
    };

    // Excel & CSV Export
    const handleExport = (type = "xlsx") => {
        if (!processedData.length) {
            toast.error("Nothing to export yet");
            return;
        }

        const dataToExport = processedData.map((item) => ({
            "Student Name": item.name,
            "Enrollment No": item.enrollmentNumber || "N/A",
            "Attendance %": `${parseFloat(item.percentage).toFixed(1)}%`,
            "Total Days": item.totalDays,
            "Present": item.present,
            "Absent": item.absent,
            "Late": item.late,
            "Excused": item.excused,
        }));

        const filename = `${instituteCode}_attendance_${startDate}_to_${endDate}.${type}`;
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

        worksheet["!cols"] = [
            { wch: 26 }, // Name
            { wch: 18 }, // Enrollment
            { wch: 14 }, // Attendance %
            { wch: 12 }, // Total
            { wch: 10 }, // Present
            { wch: 10 }, // Absent
            { wch: 10 }, // Late
            { wch: 10 }, // Excused
        ];

        XLSX.writeFile(workbook, filename);
        setExportOpen(false);
        toast.success(`Exported ${processedData.length} records`);
    };

    const selectedCourseLabel = useMemo(() => {
        if (!selectedCourse) return isSchool ? "All classes" : "All courses";
        const found = courses.find((c) => c._id === selectedCourse);
        return found ? found.name : isSchool ? "All classes" : "All courses";
    }, [selectedCourse, courses, isSchool]);

    const selectedBatchLabel = useMemo(() => {
        if (!selectedBatch) return isSchool ? "All sections" : "All batches";
        const found = batches.find((b) => b._id === selectedBatch);
        return found ? found.name : isSchool ? "All sections" : "All batches";
    }, [selectedBatch, batches, isSchool]);

    const formattedDateRange = useMemo(() => {
        try {
            const startParsed = parseISO(startDate);
            const endParsed = parseISO(endDate);
            if (isValid(startParsed) && isValid(endParsed)) {
                return `${format(startParsed, "d MMM yyyy")} – ${format(endParsed, "d MMM yyyy")}`;
            }
        } catch (e) {
            // fallback
        }
        return `${startDate} – ${endDate}`;
    }, [startDate, endDate]);

    return (
        <div className="space-y-4">
            {/* Page Header (No duplicate titles) */}
            <div className="pb-1">
                <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#14161A] leading-[1.1]">
                    Attendance reports
                </h1>
                {/* Dynamic Status Line */}
                <div className="flex items-center gap-2 text-[13px] text-[#5F6673] mt-1.5 flex-wrap">
                    <span>{formattedDateRange}</span>
                    <span>·</span>
                    <span>{selectedCourseLabel}</span>
                    <span>·</span>
                    {loading ? (
                        <span>Loading…</span>
                    ) : (
                        <>
                            <span>{stats.total} students</span>
                            {stats.total > 0 && (
                                <>
                                    <span>·</span>
                                    <span>Average {stats.avg}%</span>
                                    {stats.lowCount > 0 && (
                                        <>
                                            <span>·</span>
                                            <button
                                                onClick={() => setExceptionOnly((prev) => !prev)}
                                                className={cn(
                                                    "inline-flex items-center gap-1 font-medium transition-colors cursor-pointer rounded px-1.5 py-0.5",
                                                    exceptionOnly
                                                        ? "bg-[#D92D20]/10 text-[#D92D20] font-semibold ring-1 ring-[#D92D20]/20"
                                                        : "text-[#D92D20] hover:underline"
                                                )}
                                                title="Toggle view of students below 75%"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#D92D20]" />
                                                <span>{stats.lowCount} below 75%</span>
                                            </button>
                                        </>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Live Filter Bar (One 32px flex row, no bordered card) */}
            <div className="flex items-center justify-between gap-2.5 flex-wrap py-1">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Course / Class Pop-up Button */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setCourseOpen((prev) => !prev);
                                setBatchOpen(false);
                                setDateOpen(false);
                                setExportOpen(false);
                            }}
                            className={cn(
                                "h-8 px-3 rounded-lg text-[13px] font-medium flex items-center gap-2 transition-colors duration-120 outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer",
                                courseOpen ? "bg-[#E6E8EC] text-[#14161A]" : "bg-[#F2F3F5] hover:bg-[#E6E8EC] text-[#14161A]"
                            )}
                        >
                            <span className="text-[#5F6673] font-normal">{isSchool ? "Class:" : "Course:"}</span>
                            <span className="max-w-[140px] truncate">{selectedCourseLabel}</span>
                            <ChevronDown size={13} className="text-[#5F6673] shrink-0" />
                        </button>

                        <AnimatePresence>
                            {courseOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.96 }}
                                    transition={SPRING.ui}
                                    style={{ transformOrigin: "top left" }}
                                    className="absolute top-full left-0 mt-1 z-40 w-60 max-h-64 overflow-y-auto rounded-xl bg-white/95 backdrop-blur-xl border border-black/[0.08] shadow-[0_16px_48px_-12px_rgba(16,24,40,0.22)] p-1 space-y-0.5"
                                >
                                    <button
                                        onClick={() => {
                                            setSelectedCourse("");
                                            setSelectedBatch("");
                                            setCourseOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] text-left transition-colors cursor-pointer",
                                            !selectedCourse ? "bg-[#F2F3F5] font-semibold text-[#14161A]" : "text-[#5F6673] hover:bg-[#F7F8FA] hover:text-[#14161A]"
                                        )}
                                    >
                                        <span>{isSchool ? "All classes" : "All courses"}</span>
                                        {!selectedCourse && <Check size={14} className="text-blue-600" />}
                                    </button>
                                    {courses.map((c) => {
                                        const isSel = selectedCourse === c._id;
                                        return (
                                            <button
                                                key={c._id}
                                                onClick={() => {
                                                    setSelectedCourse(c._id);
                                                    setSelectedBatch("");
                                                    setCourseOpen(false);
                                                }}
                                                className={cn(
                                                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] text-left transition-colors cursor-pointer",
                                                    isSel ? "bg-[#F2F3F5] font-semibold text-[#14161A]" : "text-[#5F6673] hover:bg-[#F7F8FA] hover:text-[#14161A]"
                                                )}
                                            >
                                                <span className="truncate">{c.name}</span>
                                                {isSel && <Check size={14} className="text-blue-600 shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Batch / Section Pop-up Button */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setBatchOpen((prev) => !prev);
                                setCourseOpen(false);
                                setDateOpen(false);
                                setExportOpen(false);
                            }}
                            className={cn(
                                "h-8 px-3 rounded-lg text-[13px] font-medium flex items-center gap-2 transition-colors duration-120 outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer",
                                batchOpen ? "bg-[#E6E8EC] text-[#14161A]" : "bg-[#F2F3F5] hover:bg-[#E6E8EC] text-[#14161A]"
                            )}
                        >
                            <span className="text-[#5F6673] font-normal">{isSchool ? "Section:" : "Batch:"}</span>
                            <span className="max-w-[140px] truncate">{selectedBatchLabel}</span>
                            <ChevronDown size={13} className="text-[#5F6673] shrink-0" />
                        </button>

                        <AnimatePresence>
                            {batchOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.96 }}
                                    transition={SPRING.ui}
                                    style={{ transformOrigin: "top left" }}
                                    className="absolute top-full left-0 mt-1 z-40 w-60 max-h-64 overflow-y-auto rounded-xl bg-white/95 backdrop-blur-xl border border-black/[0.08] shadow-[0_16px_48px_-12px_rgba(16,24,40,0.22)] p-1 space-y-0.5"
                                >
                                    <button
                                        onClick={() => {
                                            setSelectedBatch("");
                                            setBatchOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] text-left transition-colors cursor-pointer",
                                            !selectedBatch ? "bg-[#F2F3F5] font-semibold text-[#14161A]" : "text-[#5F6673] hover:bg-[#F7F8FA] hover:text-[#14161A]"
                                        )}
                                    >
                                        <span>{isSchool ? "All sections" : "All batches"}</span>
                                        {!selectedBatch && <Check size={14} className="text-blue-600" />}
                                    </button>
                                    {!selectedCourse && (
                                        <div className="px-2.5 py-2 text-[12px] text-[#5F6673] italic">
                                            Choose a course to filter specific batches
                                        </div>
                                    )}
                                    {batches.map((b) => {
                                        const isSel = selectedBatch === b._id;
                                        return (
                                            <button
                                                key={b._id}
                                                onClick={() => {
                                                    setSelectedBatch(b._id);
                                                    setBatchOpen(false);
                                                }}
                                                className={cn(
                                                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] text-left transition-colors cursor-pointer",
                                                    isSel ? "bg-[#F2F3F5] font-semibold text-[#14161A]" : "text-[#5F6673] hover:bg-[#F7F8FA] hover:text-[#14161A]"
                                                )}
                                            >
                                                <span className="truncate">{b.name}</span>
                                                {isSel && <Check size={14} className="text-blue-600 shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Unified Date Range Pop-up with Presets */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setDateOpen((prev) => !prev);
                                setCourseOpen(false);
                                setBatchOpen(false);
                                setExportOpen(false);
                            }}
                            className={cn(
                                "h-8 px-3 rounded-lg text-[13px] font-medium flex items-center gap-2 transition-colors duration-120 outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer",
                                dateOpen ? "bg-[#E6E8EC] text-[#14161A]" : "bg-[#F2F3F5] hover:bg-[#E6E8EC] text-[#14161A]"
                            )}
                        >
                            <CalendarIcon size={13} className="text-[#5F6673]" />
                            <span>{formattedDateRange}</span>
                            <ChevronDown size={13} className="text-[#5F6673] shrink-0" />
                        </button>

                        <AnimatePresence>
                            {dateOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.96 }}
                                    transition={SPRING.ui}
                                    style={{ transformOrigin: "top left" }}
                                    className="absolute top-full left-0 mt-1 z-40 w-72 rounded-xl bg-white/95 backdrop-blur-xl border border-black/[0.08] shadow-[0_16px_48px_-12px_rgba(16,24,40,0.22)] p-2 space-y-2"
                                >
                                    <div className="space-y-1 pb-2 border-b border-[#E6E8EC]">
                                        <button
                                            onClick={() => applyDatePreset("this_month")}
                                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] text-[#14161A] hover:bg-[#F2F3F5] transition-colors text-left cursor-pointer"
                                        >
                                            <span>This month</span>
                                        </button>
                                        <button
                                            onClick={() => applyDatePreset("last_month")}
                                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] text-[#14161A] hover:bg-[#F2F3F5] transition-colors text-left cursor-pointer"
                                        >
                                            <span>Last month</span>
                                        </button>
                                        <button
                                            onClick={() => applyDatePreset("last_30_days")}
                                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] text-[#14161A] hover:bg-[#F2F3F5] transition-colors text-left cursor-pointer"
                                        >
                                            <span>Last 30 days</span>
                                        </button>
                                        <button
                                            onClick={() => applyDatePreset("this_term")}
                                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] text-[#14161A] hover:bg-[#F2F3F5] transition-colors text-left cursor-pointer"
                                        >
                                            <span>This term</span>
                                        </button>
                                    </div>

                                    {/* Custom Date Pickers */}
                                    <div className="pt-1 space-y-2">
                                        <div className="text-[11px] font-semibold text-[#5F6673] px-1">
                                            Custom range
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[11px] text-[#5F6673] mb-1">Start</label>
                                                <input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    className="w-full h-8 px-2 bg-[#F2F3F5] rounded-md text-[12px] border-none focus:ring-1 focus:ring-blue-600"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] text-[#5F6673] mb-1">End</label>
                                                <input
                                                    type="date"
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                    className="w-full h-8 px-2 bg-[#F2F3F5] rounded-md text-[12px] border-none focus:ring-1 focus:ring-blue-600"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Instant Student Search */}
                    <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5F6673]" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchStudent}
                            onChange={(e) => setSearchStudent(e.target.value)}
                            placeholder="Search student... (/)"
                            className="h-8 pl-8 pr-3 w-48 lg:w-56 bg-[#F2F3F5] text-[13px] text-[#14161A] placeholder-[#5F6673] rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all"
                        />
                        {searchStudent && (
                            <button
                                onClick={() => setSearchStudent("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5F6673] hover:text-[#14161A]"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Export Pop-up */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setExportOpen((prev) => !prev);
                                setCourseOpen(false);
                                setBatchOpen(false);
                                setDateOpen(false);
                            }}
                            disabled={!processedData.length || loading}
                            className="h-8 px-3 rounded-lg text-[13px] font-medium bg-[#F2F3F5] hover:bg-[#E6E8EC] disabled:opacity-40 text-[#14161A] flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <Download size={13} className="text-[#5F6673]" />
                            <span>Export</span>
                            <ChevronDown size={12} className="text-[#5F6673]" />
                        </button>

                        <AnimatePresence>
                            {exportOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.96 }}
                                    transition={SPRING.ui}
                                    style={{ transformOrigin: "top right" }}
                                    className="absolute top-full right-0 mt-1 z-40 w-44 rounded-xl bg-white/95 backdrop-blur-xl border border-black/[0.08] shadow-[0_16px_48px_-12px_rgba(16,24,40,0.22)] p-1 space-y-0.5"
                                >
                                    <button
                                        onClick={() => handleExport("xlsx")}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] text-[#14161A] hover:bg-[#F2F3F5] transition-colors text-left cursor-pointer"
                                    >
                                        <FileSpreadsheet size={14} className="text-emerald-600" />
                                        <span>Excel (.xlsx)</span>
                                    </button>
                                    <button
                                        onClick={() => handleExport("csv")}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] text-[#14161A] hover:bg-[#F2F3F5] transition-colors text-left cursor-pointer"
                                    >
                                        <FileText size={14} className="text-blue-600" />
                                        <span>CSV (.csv)</span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Results Table (No card wrapper, neutral headers, exceptions first) */}
            <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[#E6E8EC] text-[12px] font-semibold text-[#5F6673]">
                            <th className="py-2.5 pr-4 font-semibold">
                                <button
                                    onClick={() => handleSort("name")}
                                    className="flex items-center gap-1.5 hover:text-[#14161A] cursor-pointer"
                                >
                                    <span>Student</span>
                                    {sortKey === "name" ? (
                                        sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                    ) : (
                                        <ArrowUpDown size={11} className="opacity-40" />
                                    )}
                                </button>
                            </th>
                            <th className="py-2.5 px-4 font-semibold">
                                <button
                                    onClick={() => handleSort("percentage")}
                                    className="flex items-center gap-1.5 hover:text-[#14161A] cursor-pointer"
                                >
                                    <span>Attendance %</span>
                                    {sortKey === "percentage" ? (
                                        sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                    ) : (
                                        <ArrowUpDown size={11} className="opacity-40" />
                                    )}
                                </button>
                            </th>
                            <th className="py-2.5 px-4 font-semibold text-right">
                                <button
                                    onClick={() => handleSort("totalDays")}
                                    className="inline-flex items-center gap-1 hover:text-[#14161A] cursor-pointer ml-auto"
                                >
                                    <span>Total days</span>
                                    {sortKey === "totalDays" ? (
                                        sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                    ) : (
                                        <ArrowUpDown size={11} className="opacity-40" />
                                    )}
                                </button>
                            </th>
                            <th className="py-2.5 px-4 font-semibold text-right">
                                <button
                                    onClick={() => handleSort("present")}
                                    className="inline-flex items-center gap-1 hover:text-[#14161A] cursor-pointer ml-auto"
                                >
                                    <span>Present</span>
                                </button>
                            </th>
                            <th className="py-2.5 px-4 font-semibold text-right">
                                <button
                                    onClick={() => handleSort("absent")}
                                    className="inline-flex items-center gap-1 hover:text-[#14161A] cursor-pointer ml-auto"
                                >
                                    <span>Absent</span>
                                </button>
                            </th>
                            <th className="py-2.5 px-4 font-semibold text-right">
                                <button
                                    onClick={() => handleSort("late")}
                                    className="inline-flex items-center gap-1 hover:text-[#14161A] cursor-pointer ml-auto"
                                >
                                    <span>Late</span>
                                </button>
                            </th>
                            <th className="py-2.5 pl-4 font-semibold text-right">
                                <button
                                    onClick={() => handleSort("excused")}
                                    className="inline-flex items-center gap-1 hover:text-[#14161A] cursor-pointer ml-auto"
                                >
                                    <span>Excused</span>
                                </button>
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-[#E6E8EC]/70">
                        {/* State 1: Loading Skeleton (No shimmer oscillation) */}
                        {loading && (
                            <>
                                {[...Array(5)].map((_, i) => (
                                    <tr key={`skel-${i}`} className="h-[52px]">
                                        <td className="py-3 pr-4">
                                            <div className="w-36 h-4 bg-[#F2F3F5] rounded" />
                                            <div className="w-20 h-3 bg-[#F2F3F5] rounded mt-1.5" />
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="w-16 h-4 bg-[#F2F3F5] rounded" />
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="w-8 h-4 bg-[#F2F3F5] rounded ml-auto" />
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="w-8 h-4 bg-[#F2F3F5] rounded ml-auto" />
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="w-8 h-4 bg-[#F2F3F5] rounded ml-auto" />
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="w-8 h-4 bg-[#F2F3F5] rounded ml-auto" />
                                        </td>
                                        <td className="py-3 pl-4 text-right">
                                            <div className="w-8 h-4 bg-[#F2F3F5] rounded ml-auto" />
                                        </td>
                                    </tr>
                                ))}
                            </>
                        )}

                        {/* State 2: Error State */}
                        {!loading && error && (
                            <tr>
                                <td colSpan={7} className="py-16 text-center">
                                    <div className="max-w-xs mx-auto space-y-2">
                                        <AlertCircle size={24} className="text-[#D92D20] mx-auto opacity-70" />
                                        <p className="text-[14px] font-medium text-[#14161A]">Couldn’t load the report</p>
                                        <p className="text-[12px] text-[#5F6673]">{error}</p>
                                        <button
                                            onClick={fetchReport}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-[#14161A] text-white rounded-lg active:scale-95 transition-transform cursor-pointer"
                                        >
                                            <RefreshCw size={12} />
                                            <span>Retry</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {/* State 3: Filter Match None */}
                        {!loading && !error && reportData.length > 0 && processedData.length === 0 && (
                            <tr>
                                <td colSpan={7} className="py-16 text-center">
                                    <div className="max-w-xs mx-auto space-y-2">
                                        <p className="text-[14px] font-medium text-[#14161A]">No students match these filters</p>
                                        <p className="text-[12px] text-[#5F6673]">Try clearing your search or exception toggle.</p>
                                        <button
                                            onClick={() => {
                                                setSearchStudent("");
                                                setExceptionOnly(false);
                                            }}
                                            className="px-3 py-1.5 text-[12px] font-medium bg-[#F2F3F5] hover:bg-[#E6E8EC] text-[#14161A] rounded-lg transition-colors cursor-pointer"
                                        >
                                            Clear filters
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {/* State 4: No Attendance Recorded For Range */}
                        {!loading && !error && reportData.length === 0 && (
                            <tr>
                                <td colSpan={7} className="py-16 text-center">
                                    <div className="max-w-xs mx-auto space-y-2">
                                        <p className="text-[14px] font-medium text-[#14161A]">
                                            No attendance recorded for {formattedDateRange}
                                        </p>
                                        <div className="flex items-center justify-center gap-2 pt-1">
                                            <button
                                                onClick={() => applyDatePreset("this_term")}
                                                className="px-3 py-1.5 text-[12px] font-medium bg-[#14161A] text-white rounded-lg active:scale-95 transition-transform cursor-pointer"
                                            >
                                                Try this term
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedCourse("");
                                                    setSelectedBatch("");
                                                    applyDatePreset("this_month");
                                                }}
                                                className="px-3 py-1.5 text-[12px] font-medium bg-[#F2F3F5] hover:bg-[#E6E8EC] text-[#14161A] rounded-lg transition-colors cursor-pointer"
                                            >
                                                Clear filters
                                            </button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {/* State 5: Loaded Rows */}
                        {!loading && !error && processedData.map((item) => {
                            const pct = parseFloat(item.percentage) || 0;
                            const isLow = pct < 75;
                            const isWarn = pct >= 75 && pct < 85;

                            return (
                                <tr
                                    key={item._id}
                                    onClick={() => setSelectedStudent(item)}
                                    className="h-[52px] hover:bg-[#F7F8FA] transition-colors duration-120 cursor-pointer group"
                                >
                                    {/* Student Name + Enrollment */}
                                    <td className="py-2.5 pr-4">
                                        <p className="text-[14px] font-medium text-[#14161A] leading-tight group-hover:text-blue-600 transition-colors">
                                            {item.name}
                                        </p>
                                        <p className="text-[12px] text-[#5F6673] font-mono mt-0.5">
                                            {item.enrollmentNumber}
                                        </p>
                                    </td>

                                    {/* Attendance % (Next to name, exceptions get dot mark) */}
                                    <td className="py-2.5 px-4">
                                        <div className="inline-flex items-center gap-1.5">
                                            {isLow && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#D92D20] shrink-0" title="Below 75% attendance threshold" />
                                            )}
                                            {isWarn && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] shrink-0" title="Near threshold (75–85%)" />
                                            )}
                                            <span className={cn(
                                                "text-[13px] font-variant-numeric tabular-nums",
                                                isLow ? "font-semibold text-[#D92D20]" : isWarn ? "font-medium text-[#D97706]" : "font-normal text-[#14161A]"
                                            )}>
                                                {pct.toFixed(1)}%
                                            </span>
                                        </div>
                                    </td>

                                    {/* Total Days */}
                                    <td className="py-2.5 px-4 text-right text-[13px] font-variant-numeric tabular-nums text-[#14161A]">
                                        {item.totalDays}
                                    </td>

                                    {/* Present */}
                                    <td className="py-2.5 px-4 text-right text-[13px] font-variant-numeric tabular-nums text-[#14161A]">
                                        {item.present}
                                    </td>

                                    {/* Absent */}
                                    <td className="py-2.5 px-4 text-right text-[13px] font-variant-numeric tabular-nums text-[#14161A]">
                                        {item.absent}
                                    </td>

                                    {/* Late */}
                                    <td className="py-2.5 px-4 text-right text-[13px] font-variant-numeric tabular-nums text-[#5F6673]">
                                        {item.late}
                                    </td>

                                    {/* Excused */}
                                    <td className="py-2.5 pl-4 text-right text-[13px] font-variant-numeric tabular-nums text-[#5F6673]">
                                        {item.excused}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Drill-down Inspector (Slides in from the right, non-modal) */}
            <AnimatePresence>
                {selectedStudent && (
                    <>
                        <div
                            onClick={() => setSelectedStudent(null)}
                            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px] transition-opacity"
                        />
                        <motion.aside
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={SPRING.move}
                            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-2xl border-l border-[#E6E8EC] p-6 flex flex-col justify-between"
                        >
                            <div className="space-y-6">
                                <div className="flex items-center justify-between pb-4 border-b border-[#E6E8EC]">
                                    <div>
                                        <h3 className="text-[17px] font-semibold text-[#14161A] leading-tight">
                                            {selectedStudent.name}
                                        </h3>
                                        <p className="text-[12px] text-[#5F6673] font-mono mt-0.5">
                                            {selectedStudent.enrollmentNumber}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedStudent(null)}
                                        className="p-1 rounded-lg text-[#5F6673] hover:text-[#14161A] hover:bg-[#F2F3F5] transition-colors cursor-pointer"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Attendance Gauge */}
                                <div className="p-4 rounded-xl bg-[#F2F3F5]/70 space-y-1">
                                    <p className="text-[12px] font-medium text-[#5F6673]">Overall attendance</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-[32px] font-semibold text-[#14161A] tracking-tight">
                                            {parseFloat(selectedStudent.percentage).toFixed(1)}%
                                        </span>
                                        {parseFloat(selectedStudent.percentage) < 75 && (
                                            <span className="text-[12px] font-semibold text-[#D92D20]">
                                                Below 75% threshold
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Detailed Breakdown */}
                                <div className="space-y-2">
                                    <p className="text-[12px] font-semibold text-[#5F6673]">Attendance breakdown</p>
                                    <div className="grid grid-cols-2 gap-2 text-[13px]">
                                        <div className="p-3 rounded-lg border border-[#E6E8EC]">
                                            <p className="text-[11px] text-[#5F6673]">Total sessions</p>
                                            <p className="text-[16px] font-semibold text-[#14161A] mt-0.5 tabular-nums">
                                                {selectedStudent.totalDays}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-lg border border-[#E6E8EC]">
                                            <p className="text-[11px] text-[#5F6673]">Present days</p>
                                            <p className="text-[16px] font-semibold text-emerald-600 mt-0.5 tabular-nums">
                                                {selectedStudent.present}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-lg border border-[#E6E8EC]">
                                            <p className="text-[11px] text-[#5F6673]">Absent days</p>
                                            <p className="text-[16px] font-semibold text-[#D92D20] mt-0.5 tabular-nums">
                                                {selectedStudent.absent}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-lg border border-[#E6E8EC]">
                                            <p className="text-[11px] text-[#5F6673]">Late / Excused</p>
                                            <p className="text-[16px] font-semibold text-[#5F6673] mt-0.5 tabular-nums">
                                                {(selectedStudent.late || 0) + (selectedStudent.excused || 0)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="w-full py-2 rounded-lg bg-[#F2F3F5] hover:bg-[#E6E8EC] text-[13px] font-medium text-[#14161A] transition-colors cursor-pointer"
                            >
                                Close inspector
                            </button>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
