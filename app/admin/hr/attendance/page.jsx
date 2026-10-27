"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
    Calendar as CalendarIcon, 
    Search, 
    Loader2, 
    Check, 
    ScanLine, 
    FileSpreadsheet, 
    MoreHorizontal, 
    ChevronLeft, 
    ChevronRight, 
    ChevronDown, 
    Camera, 
    Sliders, 
    RotateCcw, 
    X,
    QrCode,
    Sparkles,
    FileText
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";
import EnrollFaceModal from "@/components/users/EnrollFaceModal";
import ImportBiometricModal from "@/components/hr/ImportBiometricModal";
import { format, addDays, subDays, parseISO, isValid } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

// ── Design Tokens & Physical Springs ───────────────────────────────────────────
// Apple-design critically damped springs (bounce 0)
const SPRING_FAST = { type: "spring", bounce: 0, duration: 0.22 };
const SPRING_SHEET = { type: "spring", bounce: 0, duration: 0.32 };
const SPRING_ACCORDION = { type: "spring", bounce: 0, duration: 0.28 };

const STATUS_CONFIG = {
    present: { label: "Present", key: "1", color: "text-[#5F6673]" },
    absent: { label: "Absent", key: "2", dot: "bg-[#D92D20]" },
    half_day: { label: "Half day", key: "3", halfDot: true },
    on_leave: { label: "On leave", key: "4", dot: "bg-[#0E8A7D]" },
    holiday: { label: "Holiday", key: "5", hollowDot: true }
};

export default function StaffAttendancePage() {
    const router = useRouter();
    const toast = useToast();

    // ── State: Data & Records ──────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState("idle"); // 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'
    const [lastSavedTime, setLastSavedTime] = useState(null);
    const [attendanceDate, setAttendanceDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
    const [records, setRecords] = useState([]);
    const [originalRecords, setOriginalRecords] = useState([]);
    const [departments, setDepartments] = useState([]);

    // ── State: Filters & View ──────────────────────────────────────────────────
    const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday'
    const [searchQuery, setSearchQuery] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("all");

    // ── State: Modals & Sheets ─────────────────────────────────────────────────
    const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
    const [selectedFaceUser, setSelectedFaceUser] = useState(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isScanSheetOpen, setIsScanSheetOpen] = useState(false);
    const [scanSheetTab, setScanSheetTab] = useState("face"); // 'face' | 'qr'
    const [isWindowsPopoverOpen, setIsWindowsPopoverOpen] = useState(false);
    const [activeRowMenuId, setActiveRowMenuId] = useState(null);
    const [activeStatusMenuId, setActiveStatusMenuId] = useState(null);
    const [activeMoreMenuOpen, setActiveMoreMenuOpen] = useState(false);
    const [activeDeptMenuOpen, setActiveDeptMenuOpen] = useState(false);
    const [activeMarkAllOpen, setActiveMarkAllOpen] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [noteDraft, setNoteDraft] = useState("");

    // ── State: Time Windows (Scanner Settings) ──────────────────────────────────
    const [useTimeRange, setUseTimeRange] = useState(false);
    const [checkInStart, setCheckInStart] = useState("08:00");
    const [checkInEnd, setCheckInEnd] = useState("09:30");
    const [checkOutStart, setCheckOutStart] = useState("16:00");
    const [checkOutEnd, setCheckOutEnd] = useState("18:00");

    // ── State: Undo History ────────────────────────────────────────────────────
    const [undoStack, setUndoStack] = useState([]);
    const [undoToast, setUndoToast] = useState(null); // { message, previousRecords }

    // ── Refs ───────────────────────────────────────────────────────────────────
    const searchInputRef = useRef(null);
    const focusedRowIndexRef = useRef(0);
    const listContainerRef = useRef(null);
    const isScrolledRef = useRef(false);
    const [isScrolled, setIsScrolled] = useState(false);

    // Load departments
    useEffect(() => {
        fetch("/api/v1/departments")
            .then(res => res.json())
            .then(data => setDepartments(data.departments || []))
            .catch(err => console.error("Failed to load departments:", err));
    }, []);

    // Load saved timings from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const utr = localStorage.getItem("useTimeRange");
            if (utr !== null) setUseTimeRange(utr === "true");
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

    // Fetch attendance records
    const fetchAttendance = useCallback(async (dateString, signal) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/hr/attendance?date=${dateString}`, {
                signal: signal || AbortSignal.timeout(10000)
            });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            const fetched = data.records || [];
            setRecords(fetched);
            setOriginalRecords(JSON.parse(JSON.stringify(fetched)));
            setSaveStatus("idle");
            setUndoStack([]);
            setUndoToast(null);
        } catch (error) {
            if (error.name !== "AbortError") {
                setRecords([]);
                setOriginalRecords([]);
                toast.error("Failed to load staff attendance");
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

    // Check unsaved changes
    const unsavedCount = useMemo(() => {
        if (!records.length || !originalRecords.length) return 0;
        let count = 0;
        records.forEach(rec => {
            const orig = originalRecords.find(o => o.staff?._id === rec.staff?._id);
            if (!orig) return;
            if (orig.status !== rec.status || (orig.remarks || "") !== (rec.remarks || "")) {
                count++;
            }
        });
        return count;
    }, [records, originalRecords]);

    useEffect(() => {
        if (saveStatus !== "saving") {
            if (unsavedCount > 0) setSaveStatus("unsaved");
            else if (lastSavedTime) setSaveStatus("saved");
            else setSaveStatus("idle");
        }
    }, [unsavedCount, lastSavedTime, saveStatus]);

    // Guard beforeunload
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (unsavedCount > 0) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [unsavedCount]);

    // Track scroll for sticky edge hairline & blur
    useEffect(() => {
        const handleScroll = () => {
            const scrolled = window.scrollY > 12;
            if (scrolled !== isScrolledRef.current) {
                isScrolledRef.current = scrolled;
                setIsScrolled(scrolled);
            }
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // ── Status Mutations with Undo Stack ───────────────────────────────────────
    const pushUndo = useCallback((prevRecords, description) => {
        setUndoStack(prev => [...prev.slice(-15), { records: prevRecords, description }]);
    }, []);

    const handleStatusChange = useCallback((staffId, newStatus) => {
        setRecords(prev => {
            pushUndo(prev, `status change`);
            return prev.map(rec => {
                if (rec.staff?._id === staffId) {
                    let defaultRemark = rec.remarks;
                    if (!rec.remarks || ["On time", "Uninformed absence", "Approved leave", "Half day shift", "Official holiday"].includes(rec.remarks)) {
                        if (newStatus === "present") defaultRemark = "On time";
                        else if (newStatus === "absent") defaultRemark = "Uninformed absence";
                        else if (newStatus === "on_leave") defaultRemark = "Approved leave";
                        else if (newStatus === "half_day") defaultRemark = "Half day shift";
                        else if (newStatus === "holiday") defaultRemark = "Official holiday";
                    }
                    return { ...rec, status: newStatus, remarks: defaultRemark };
                }
                return rec;
            });
        });
        setActiveStatusMenuId(null);
    }, [pushUndo]);

    const handleNoteSave = useCallback((staffId, noteText) => {
        setRecords(prev => {
            pushUndo(prev, "note update");
            return prev.map(rec => rec.staff?._id === staffId ? { ...rec, remarks: noteText.trim() } : rec);
        });
        setEditingNoteId(null);
        setNoteDraft("");
    }, [pushUndo]);

    const handleUndo = useCallback(() => {
        if (!undoStack.length) return;
        const last = undoStack[undoStack.length - 1];
        setRecords(last.records);
        setUndoStack(prev => prev.slice(0, -1));
        setUndoToast(null);
        toast.info("Reverted last change");
    }, [undoStack, toast]);

    // ── Bulk Actions ───────────────────────────────────────────────────────────
    const handleMarkAll = useCallback((status) => {
        setRecords(prev => {
            pushUndo(prev, `Mark all ${status}`);
            return prev.map(rec => {
                const name = `${rec.staff?.profile?.firstName || ""} ${rec.staff?.profile?.lastName || ""}`.toLowerCase();
                const matchesSearch = name.includes(searchQuery.toLowerCase());
                const deptId = rec.staff?.department?._id || rec.staff?.department;
                const matchesDept = departmentFilter === "all" || (deptId && deptId.toString() === departmentFilter);
                if (matchesSearch && matchesDept) {
                    return { ...rec, status };
                }
                return rec;
            });
        });
        setActiveMarkAllOpen(false);
        const label = STATUS_CONFIG[status]?.label.toLowerCase() || status;
        setUndoToast({ message: `Marked staff as ${label}` });
    }, [searchQuery, departmentFilter, pushUndo]);

    const handleMarkUnpunchedAbsent = useCallback(() => {
        let affected = 0;
        setRecords(prev => {
            pushUndo(prev, "Mark unpunched absent");
            return prev.map(rec => {
                const name = `${rec.staff?.profile?.firstName || ""} ${rec.staff?.profile?.lastName || ""}`.toLowerCase();
                const matchesSearch = name.includes(searchQuery.toLowerCase());
                const deptId = rec.staff?.department?._id || rec.staff?.department;
                const matchesDept = departmentFilter === "all" || (deptId && deptId.toString() === departmentFilter);
                if (matchesSearch && matchesDept && !rec.checkInTime && (!rec.attendanceId || rec.status === "present")) {
                    affected++;
                    return { ...rec, status: "absent", remarks: "Unpunched absence" };
                }
                return rec;
            });
        });
        setActiveMarkAllOpen(false);
        setUndoToast({ message: `Marked ${affected} unpunched as absent` });
    }, [searchQuery, departmentFilter, pushUndo]);

    // ── Save Changes ───────────────────────────────────────────────────────────
    const handleSave = useCallback(async () => {
        if (saving || loading || unsavedCount === 0) return;
        setSaving(true);
        setSaveStatus("saving");
        try {
            const payload = records
                .filter(rec => rec.staff?._id)
                .map(rec => ({
                    staffId: rec.staff._id,
                    status: rec.status,
                    remarks: rec.remarks || "",
                    checkInTime: rec.checkInTime || "",
                    checkOutTime: rec.checkOutTime || "",
                    lateMinutes: rec.lateMinutes || 0,
                    earlyDepartureMinutes: rec.earlyDepartureMinutes || 0,
                    overtimeMinutes: rec.overtimeMinutes || 0,
                    midDayOutMinutes: rec.midDayOutMinutes || 0
                }));

            const res = await fetch("/api/v1/hr/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: attendanceDate,
                    records: payload
                })
            });

            if (!res.ok) throw new Error("Save request failed");
            setOriginalRecords(JSON.parse(JSON.stringify(records)));
            setLastSavedTime(format(new Date(), "hh:mm a"));
            setSaveStatus("saved");
            setUndoStack([]);
            setUndoToast(null);
            toast.success("Attendance saved successfully");
        } catch (error) {
            setSaveStatus("error");
            toast.error("Failed to save changes. Please retry.");
        } finally {
            setSaving(false);
        }
    }, [saving, loading, unsavedCount, records, attendanceDate, toast]);

    // ── Keyboard Shortcuts (⌘S, ⌘Z, ⌘K, /, 1-5, ↑/↓, Esc) ─────────────────────
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Close any open popovers on Escape
            if (e.key === "Escape") {
                setActiveRowMenuId(null);
                setActiveStatusMenuId(null);
                setActiveMoreMenuOpen(false);
                setActiveDeptMenuOpen(false);
                setActiveMarkAllOpen(false);
                setIsScanSheetOpen(false);
                setIsWindowsPopoverOpen(false);
                setEditingNoteId(null);
                return;
            }

            // ⌘S: Save
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                handleSave();
                return;
            }

            // ⌘Z: Undo
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
                return;
            }

            // /: Focus search if not already typing in an input
            if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
                e.preventDefault();
                searchInputRef.current?.focus();
                return;
            }

            // Row navigation & 1-5 quick status keys
            if (!["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
                const rows = listContainerRef.current?.querySelectorAll("[data-staff-row]");
                if (!rows || !rows.length) return;

                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    focusedRowIndexRef.current = Math.min(focusedRowIndexRef.current + 1, rows.length - 1);
                    rows[focusedRowIndexRef.current]?.focus();
                } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    focusedRowIndexRef.current = Math.max(focusedRowIndexRef.current - 1, 0);
                    rows[focusedRowIndexRef.current]?.focus();
                } else if (["1", "2", "3", "4", "5"].includes(e.key)) {
                    const focused = document.activeElement?.closest("[data-staff-row]");
                    if (focused) {
                        e.preventDefault();
                        const staffId = focused.getAttribute("data-staff-id");
                        const statusMap = { "1": "present", "2": "absent", "3": "half_day", "4": "on_leave", "5": "holiday" };
                        if (staffId && statusMap[e.key]) {
                            handleStatusChange(staffId, statusMap[e.key]);
                        }
                    }
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleSave, handleUndo, handleStatusChange]);

    // ── Filtered Records & Live Statistics ──────────────────────────────────────
    const filteredRecords = useMemo(() => {
        return records.filter(rec => {
            if (!rec.staff) return false;
            const name = `${rec.staff.profile?.firstName || ""} ${rec.staff.profile?.lastName || ""}`.toLowerCase();
            const matchesSearch = name.includes(searchQuery.toLowerCase());
            const deptId = rec.staff.department?._id || rec.staff.department;
            const matchesDept = departmentFilter === "all" || (deptId && deptId.toString() === departmentFilter);
            const matchesStatus = statusFilter === "all" || rec.status === statusFilter;
            return matchesSearch && matchesDept && matchesStatus;
        });
    }, [records, searchQuery, departmentFilter, statusFilter]);

    // Overall status counts across all staff (or active department)
    const counts = useMemo(() => {
        const acc = { all: records.length, present: 0, absent: 0, half_day: 0, on_leave: 0, holiday: 0 };
        records.forEach(rec => {
            if (rec?.status && acc[rec.status] !== undefined) {
                acc[rec.status]++;
            }
        });
        return acc;
    }, [records]);

    const notEnrolledFaceCount = useMemo(() => {
        return records.filter(r => !r.staff?.faceEnrolledAt).length;
    }, [records]);

    const unpunchedCount = useMemo(() => {
        return records.filter(r => !r.checkInTime && (!r.attendanceId || r.status === "present")).length;
    }, [records]);

    // Date Stepper controls
    const parsedDate = useMemo(() => {
        try {
            const d = parseISO(attendanceDate);
            return isValid(d) ? d : new Date();
        } catch {
            return new Date();
        }
    }, [attendanceDate]);

    const handlePrevDay = () => setAttendanceDate(format(subDays(parsedDate, 1), "yyyy-MM-dd"));
    const handleNextDay = () => setAttendanceDate(format(addDays(parsedDate, 1), "yyyy-MM-dd"));

    return (
        <div className="text-[#14161A] select-none min-h-[calc(100vh-64px)] pb-24 font-[-apple-system,BlinkMacSystemFont,'Inter',system-ui,sans-serif]">
            {/* ── Page Header (H1, Status line, Day stepper, Actions) ─────────────── */}
            <div className="pt-2 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-[22px] font-semibold text-[#14161A] tracking-[-0.015em] leading-tight m-0">
                        Staff attendance
                    </h1>
                    <p className="text-[13px] text-[#5F6673] mt-1 font-normal tabular-nums">
                        {saveStatus === "unsaved" && (
                            <span>{unsavedCount} unsaved {unsavedCount === 1 ? "change" : "changes"} · {records.length} staff</span>
                        )}
                        {saveStatus === "saving" && (
                            <span className="flex items-center gap-1.5 text-indigo-600">
                                <Loader2 size={12} className="animate-spin" /> Saving changes…
                            </span>
                        )}
                        {saveStatus === "saved" && (
                            <span>Saved {lastSavedTime || "just now"} · {records.length} staff</span>
                        )}
                        {saveStatus === "idle" && (
                            <span>Not saved yet · {records.length} staff</span>
                        )}
                        {saveStatus === "error" && (
                            <span>
                                Couldn’t save. <button onClick={handleSave} className="text-[#2563EB] hover:underline cursor-pointer font-medium ml-1">Retry</button>
                            </span>
                        )}
                    </p>
                </div>

                {/* Right cluster: Stepper, Secondary Scan, ⋯ More, Primary Save */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* Day Stepper */}
                    <div className="inline-flex items-center h-8 bg-[#F2F3F5] rounded-lg p-0.5 text-[13px] font-medium text-[#14161A]">
                        <button
                            type="button"
                            onClick={handlePrevDay}
                            aria-label="Previous day"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-[#5F6673] hover:text-[#14161A] hover:bg-white active:scale-95 transition-all cursor-pointer"
                        >
                            <ChevronLeft size={15} />
                        </button>
                        <label className="px-2.5 cursor-pointer tabular-nums flex items-center gap-1.5" title="Click to choose a date">
                            <span>{format(parsedDate, "EEE d MMM")}</span>
                            <input 
                                type="date"
                                value={attendanceDate}
                                onChange={(e) => e.target.value && setAttendanceDate(e.target.value)}
                                className="sr-only"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={handleNextDay}
                            aria-label="Next day"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-[#5F6673] hover:text-[#14161A] hover:bg-white active:scale-95 transition-all cursor-pointer"
                        >
                            <ChevronRight size={15} />
                        </button>
                    </div>

                    {/* Secondary: Scan attendance */}
                    <button
                        type="button"
                        onClick={() => setIsScanSheetOpen(true)}
                        className="h-8 px-3 rounded-lg border border-[#E6E8EC] bg-transparent hover:bg-[#F2F3F5] active:scale-[0.98] transition-all text-[13px] font-medium text-[#14161A] flex items-center gap-1.5 cursor-pointer shadow-none"
                    >
                        <ScanLine size={15} className="text-[#5F6673]" />
                        <span>Scan attendance</span>
                    </button>

                    {/* ⋯ More Overflow Menu */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setActiveMoreMenuOpen(prev => !prev)}
                            aria-label="More actions"
                            className="w-8 h-8 rounded-lg hover:bg-[#F2F3F5] active:scale-95 transition-all flex items-center justify-center text-[#5F6673] hover:text-[#14161A] cursor-pointer"
                        >
                            <MoreHorizontal size={16} />
                        </button>

                        <AnimatePresence>
                            {activeMoreMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                                    transition={SPRING_FAST}
                                    style={{ transformOrigin: "top right" }}
                                    className="absolute right-0 top-9 w-64 bg-white rounded-xl shadow-[0_0_0_0.5px_rgba(20,22,26,0.08),0_8px_24px_-6px_rgba(20,22,26,0.14)] p-1.5 z-40"
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveMoreMenuOpen(false);
                                            setIsImportModalOpen(true);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-normal text-[#14161A] hover:bg-[#F2F3F5] rounded-lg transition-colors cursor-pointer text-left"
                                    >
                                        <FileSpreadsheet size={15} className="text-[#5F6673]" />
                                        <span>Import from biometric device (Excel)…</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveMoreMenuOpen(false);
                                            setIsWindowsPopoverOpen(true);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-normal text-[#14161A] hover:bg-[#F2F3F5] rounded-lg transition-colors cursor-pointer text-left"
                                    >
                                        <Sliders size={15} className="text-[#5F6673]" />
                                        <span>Scan windows…</span>
                                    </button>

                                    {notEnrolledFaceCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveMoreMenuOpen(false);
                                                setIsScanSheetOpen(true);
                                            }}
                                            className="w-full flex items-center justify-between px-3 py-2 text-[13px] font-normal text-[#14161A] hover:bg-[#F2F3F5] rounded-lg transition-colors cursor-pointer text-left"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <Camera size={15} className="text-[#5F6673]" />
                                                <span>Enroll faces…</span>
                                            </div>
                                            <span className="text-[11px] text-[#5F6673] font-normal">
                                                {notEnrolledFaceCount} not enrolled
                                            </span>
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Single Primary Action: Save changes (Fixed Width 128px) */}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || loading || unsavedCount === 0}
                        aria-label="Save attendance changes"
                        className={cn(
                            "h-8 min-w-[128px] px-3.5 rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-none",
                            unsavedCount > 0 
                                ? "bg-[#14161A] text-white hover:bg-black active:scale-[0.98]" 
                                : "bg-transparent border border-[#E6E8EC] text-[#5F6673] opacity-60 cursor-default"
                        )}
                    >
                        {saving ? (
                            <>
                                <Loader2 size={13} className="animate-spin text-white" />
                                <span>Saving…</span>
                            </>
                        ) : saveStatus === "saved" && unsavedCount === 0 ? (
                            <>
                                <Check size={14} className="text-emerald-600" />
                                <span>Saved ✓</span>
                            </>
                        ) : (
                            <span>Save changes</span>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Toolbar & Segmented Filter (Sticky with Scroll-edge blur) ──────── */}
            <div className={cn(
                "sticky top-0 z-30 transition-all duration-200 -mx-4 px-4 sm:-mx-8 sm:px-8 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3",
                isScrolled ? "bg-white/85 backdrop-blur-[20px] saturate-[160%] shadow-[0_1px_0_var(--hairline,#E6E8EC)]" : "bg-transparent"
            )}>
                {/* Segmented Filter (Summary + Filter merged) */}
                <div 
                    role="radiogroup" 
                    aria-label="Filter attendance by status" 
                    className="inline-flex items-center p-0.5 bg-[#F2F3F5] rounded-[10px] overflow-x-auto max-w-full scrollbar-none"
                >
                    {[
                        { key: "all", label: "All", count: counts.all },
                        { key: "present", label: "Present", count: counts.present },
                        { key: "absent", label: "Absent", count: counts.absent },
                        { key: "half_day", label: "Half day", count: counts.half_day },
                        { key: "on_leave", label: "On leave", count: counts.on_leave },
                        { key: "holiday", label: "Holiday", count: counts.holiday }
                    ].map(seg => {
                        const isSelected = statusFilter === seg.key;
                        return (
                            <button
                                key={seg.key}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                onClick={() => setStatusFilter(seg.key)}
                                className={cn(
                                    "relative px-3 py-1 text-[13px] font-medium rounded-lg transition-colors cursor-pointer shrink-0 z-10 flex items-center gap-1.5",
                                    isSelected ? "text-[#14161A] font-semibold" : "text-[#5F6673] hover:text-[#14161A]"
                                )}
                            >
                                {isSelected && (
                                    <motion.div
                                        layoutId="filter-thumb"
                                        transition={SPRING_FAST}
                                        className="absolute inset-0 bg-white rounded-lg shadow-[0_0_0_0.5px_rgba(20,22,26,0.08)] -z-10"
                                    />
                                )}
                                <span>{seg.label}</span>
                                <span 
                                    className={cn(
                                        "tabular-nums text-[12px]",
                                        seg.count > 0 ? "font-semibold text-[#14161A]" : "font-normal text-[#5F6673]"
                                    )}
                                >
                                    {seg.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Right toolbar cluster: Search staff, Department, Mark all */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Search staff */}
                    <div className="relative w-52 sm:w-60">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5F6673] pointer-events-none" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search staff"
                            aria-label="Search staff"
                            className="w-full h-8 pl-8 pr-7 bg-[#F2F3F5] rounded-lg text-[13px] text-[#14161A] placeholder:text-[#5F6673] border-none outline-none focus:ring-2 focus:ring-[#2563EB]/30 transition-all font-normal"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5F6673] hover:text-[#14161A] p-0.5"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Department Pop-up button */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setActiveDeptMenuOpen(prev => !prev)}
                            className="h-8 px-2.5 rounded-lg text-[13px] font-medium text-[#14161A] hover:bg-[#F2F3F5] transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                            <span>
                                {departmentFilter === "all" ? "All departments" : departments.find(d => d._id === departmentFilter)?.name || "Department"}
                            </span>
                            <ChevronDown size={13} className="text-[#5F6673]" />
                        </button>

                        <AnimatePresence>
                            {activeDeptMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                                    transition={SPRING_FAST}
                                    style={{ transformOrigin: "top right" }}
                                    className="absolute right-0 top-9 w-52 bg-white rounded-xl shadow-[0_0_0_0.5px_rgba(20,22,26,0.08),0_8px_24px_-6px_rgba(20,22,26,0.14)] p-1 z-40 max-h-60 overflow-y-auto"
                                >
                                    <button
                                        type="button"
                                        onClick={() => { setDepartmentFilter("all"); setActiveDeptMenuOpen(false); }}
                                        className="w-full flex items-center justify-between px-3 py-1.5 text-[13px] text-[#14161A] hover:bg-[#F2F3F5] rounded-lg transition-colors cursor-pointer text-left"
                                    >
                                        <span>All departments</span>
                                        {departmentFilter === "all" && <Check size={14} className="text-[#2563EB]" />}
                                    </button>
                                    {departments.map(d => (
                                        <button
                                            key={d._id}
                                            type="button"
                                            onClick={() => { setDepartmentFilter(d._id); setActiveDeptMenuOpen(false); }}
                                            className="w-full flex items-center justify-between px-3 py-1.5 text-[13px] text-[#14161A] hover:bg-[#F2F3F5] rounded-lg transition-colors cursor-pointer text-left"
                                        >
                                            <span className="truncate">{d.name}</span>
                                            {departmentFilter === d._id && <Check size={14} className="text-[#2563EB]" />}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Mark all Pop-up button */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setActiveMarkAllOpen(prev => !prev)}
                            className="h-8 px-2.5 rounded-lg text-[13px] font-medium text-[#14161A] hover:bg-[#F2F3F5] transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                            <span>Mark all</span>
                            <ChevronDown size={13} className="text-[#5F6673]" />
                        </button>

                        <AnimatePresence>
                            {activeMarkAllOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                                    transition={SPRING_FAST}
                                    style={{ transformOrigin: "top right" }}
                                    className="absolute right-0 top-9 w-60 bg-white rounded-xl shadow-[0_0_0_0.5px_rgba(20,22,26,0.08),0_8px_24px_-6px_rgba(20,22,26,0.14)] p-1 z-40"
                                >
                                    <div className="px-3 py-1.5 text-[11px] font-semibold text-[#5F6673] border-b border-[#E6E8EC]/70 mb-1">
                                        Applies to the {filteredRecords.length} staff shown
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleMarkAll("present")}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-[#14161A] hover:bg-[#F2F3F5] rounded-lg transition-colors cursor-pointer text-left"
                                    >
                                        <Check size={14} className="text-[#5F6673]" />
                                        <span>Mark everyone present</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleMarkAll("absent")}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-[#14161A] hover:bg-[#F2F3F5] rounded-lg transition-colors cursor-pointer text-left"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-[#D92D20] inline-block" />
                                        <span>Mark everyone absent</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleMarkAll("holiday")}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-[#14161A] hover:bg-[#F2F3F5] rounded-lg transition-colors cursor-pointer text-left"
                                    >
                                        <span className="w-2 h-2 rounded-full border border-[#5F6673] inline-block" />
                                        <span>Mark everyone as holiday</span>
                                    </button>
                                    <div className="border-t border-[#E6E8EC]/70 my-1" />
                                    <button
                                        type="button"
                                        disabled={unpunchedCount === 0}
                                        onClick={handleMarkUnpunchedAbsent}
                                        className="w-full flex items-center justify-between px-3 py-1.5 text-[13px] text-[#14161A] hover:bg-[#F2F3F5] rounded-lg transition-colors cursor-pointer text-left disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <span>Mark unpunched as absent</span>
                                        <span className="text-[11px] text-[#5F6673] tabular-nums font-semibold">({unpunchedCount})</span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* ── Staff List (3 Zones, 56px rows, Inset Hairlines) ───────────────── */}
            <div ref={listContainerRef} className="mt-2" role="region" aria-label="Staff roster list">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-2 text-[#5F6673]">
                        <Loader2 size={24} className="animate-spin text-[#14161A]" />
                        <span className="text-[13px]">Loading staff…</span>
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <div className="py-16 text-center text-[#5F6673] text-[13px]">
                        {statusFilter !== "all" 
                            ? `No one is marked ${STATUS_CONFIG[statusFilter]?.label.toLowerCase() || statusFilter}.` 
                            : "No staff members found matching your search."}
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse table-fixed">
                        {/* Visually hidden header for screen readers */}
                        <thead className="sr-only">
                            <tr>
                                <th scope="col">Staff member</th>
                                <th scope="col">Timing / Shift</th>
                                <th scope="col">Status</th>
                                <th scope="col">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.map((rec) => {
                                const staffId = rec.staff?._id;
                                const firstName = rec.staff?.profile?.firstName || "";
                                const lastName = rec.staff?.profile?.lastName || "";
                                const fullName = `${firstName} ${lastName}`.trim() || rec.staff?.email || "Staff member";
                                const initials = (firstName[0] || "") + (lastName[0] || "") || "S";
                                const avatarUrl = rec.staff?.profile?.avatar;
                                const designationName = rec.staff?.hrDetails?.designation?.name || "Staff";
                                const departmentName = rec.staff?.department?.name || "General";
                                const shiftStart = rec.effectiveShift?.shiftStart || "09:00";
                                const shiftEnd = rec.effectiveShift?.shiftEnd || "18:00";
                                const currentStatus = rec.status || "present";
                                const statusMeta = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.present;
                                const isBiometricRemark = rec.remarks && rec.remarks.startsWith("Biometric In:");
                                const hasNote = Boolean(rec.remarks && !isBiometricRemark && !["On time", "Uninformed absence", "Approved leave", "Half day shift", "Official holiday"].includes(rec.remarks));
                                const isEditingNote = editingNoteId === staffId;

                                return (
                                    <tr
                                        key={staffId}
                                        data-staff-row
                                        data-staff-id={staffId}
                                        tabIndex={0}
                                        className="group relative h-14 hover:bg-[#F7F8FA] focus-within:bg-[#F7F8FA] outline-none transition-colors duration-100 border-b border-[#E6E8EC]/70"
                                    >
                                        {/* Zone 1: Identity (Avatar, Name, Subtitle) */}
                                        <td className="pl-2 pr-4 py-2 align-middle max-w-0 w-[55%] sm:w-[60%]">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {/* 32px Avatar */}
                                                <div className="w-8 h-8 rounded-full bg-[#F2F3F5] text-[#14161A] flex items-center justify-center font-medium text-[12px] shrink-0 overflow-hidden">
                                                    {avatarUrl ? (
                                                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span>{initials.toUpperCase()}</span>
                                                    )}
                                                </div>

                                                {/* Name + Subtitle (Single line, truncated) */}
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[14px] font-medium text-[#14161A] truncate leading-tight" title={fullName}>
                                                        {fullName}
                                                    </div>
                                                    <div className="text-[12px] text-[#5F6673] truncate leading-tight mt-0.5">
                                                        <span>{designationName} · {departmentName}</span>
                                                        {hasNote && <span className="ml-1 text-[#14161A]">· “{rec.remarks}”</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expandable Inline Note Box */}
                                            <AnimatePresence>
                                                {isEditingNote && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={SPRING_ACCORDION}
                                                        className="pt-2 pb-1"
                                                    >
                                                        <form
                                                            onSubmit={(e) => {
                                                                e.preventDefault();
                                                                handleNoteSave(staffId, noteDraft);
                                                            }}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <input
                                                                type="text"
                                                                autoFocus
                                                                value={noteDraft}
                                                                onChange={(e) => setNoteDraft(e.target.value)}
                                                                placeholder="Add note (Press Enter to save, Esc to cancel)"
                                                                className="h-7 text-[12px] bg-white border border-[#E6E8EC] rounded-md px-2 flex-1 outline-none focus:border-[#2563EB]"
                                                            />
                                                            <button
                                                                type="submit"
                                                                className="h-7 px-2.5 bg-[#14161A] text-white text-[11px] font-medium rounded-md hover:bg-black cursor-pointer"
                                                            >
                                                                Done
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingNoteId(null)}
                                                                className="h-7 px-2 text-[#5F6673] text-[11px] hover:text-[#14161A] cursor-pointer"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </form>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </td>

                                        {/* Zone 2: Shift (Tabular, Right-aligned) */}
                                        <td className="px-3 py-2 text-right align-middle tabular-nums whitespace-nowrap w-[150px] hidden sm:table-cell">
                                            {rec.checkInTime ? (
                                                <div className="flex flex-col items-end leading-tight">
                                                    <span className="text-[13px] font-medium text-[#14161A] inline-flex items-center gap-1">
                                                        <span>{rec.checkInTime}</span>
                                                        <span className="text-[#8C93A0] font-normal">–</span>
                                                        <span>{rec.checkOutTime || "—"}</span>
                                                        {rec.lateMinutes > 0 && (
                                                            <span className="text-[10px] px-1 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold" title={"Late by " + rec.lateMinutes + " mins"}>
                                                                +{rec.lateMinutes}m
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-[11px] text-[#8C93A0] mt-0.5" title={"Scheduled Shift: " + shiftStart + " to " + shiftEnd}>
                                                        Shift: {shiftStart}–{shiftEnd}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end leading-tight">
                                                    <span className="text-[13px] text-[#8C93A0]">—</span>
                                                    <span className="text-[11px] text-[#8C93A0] mt-0.5" title={"Scheduled Shift: " + shiftStart + " to " + shiftEnd}>
                                                        Shift: {shiftStart}–{shiftEnd}
                                                    </span>
                                                </div>
                                            )}
                                        </td>

                                        {/* Zone 3: Status Pull-Down Control */}
                                        <td className="px-3 py-2 text-right align-middle whitespace-nowrap w-[132px]">
                                            <div className="relative inline-block text-left">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveStatusMenuId(prev => prev === staffId ? null : staffId)}
                                                    className="inline-flex items-center gap-1.5 h-8 px-2 rounded-lg hover:bg-[#F2F3F5] active:scale-[0.98] transition-all text-[13px] font-medium text-[#14161A] cursor-pointer"
                                                    aria-haspopup="true"
                                                    aria-expanded={activeStatusMenuId === staffId}
                                                >
                                                    {/* Exception Dot or Neutral Check */}
                                                    {currentStatus === "present" ? (
                                                        <Check size={13} className="text-[#5F6673]" />
                                                    ) : currentStatus === "half_day" ? (
                                                        <span className="w-2 h-2 rounded-full border border-[#D97706] bg-gradient-to-r from-[#D97706] from-50% to-transparent to-50% inline-block" />
                                                    ) : currentStatus === "holiday" ? (
                                                        <span className="w-2 h-2 rounded-full border border-[#5F6673] inline-block" />
                                                    ) : (
                                                        <span className={cn("w-2 h-2 rounded-full inline-block", statusMeta.dot)} />
                                                    )}
                                                    <span>{statusMeta.label}</span>
                                                    <ChevronDown size={12} className="text-[#5F6673]" />
                                                </button>

                                                {/* Status Dropdown Menu with Keys 1-5 */}
                                                <AnimatePresence>
                                                    {activeStatusMenuId === staffId && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.96, y: -4 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.96, y: -4 }}
                                                            transition={SPRING_FAST}
                                                            style={{ transformOrigin: "top right" }}
                                                            className="absolute right-0 top-9 w-44 bg-white rounded-xl shadow-[0_0_0_0.5px_rgba(20,22,26,0.08),0_8px_24px_-6px_rgba(20,22,26,0.14)] p-1 z-40"
                                                        >
                                                            {Object.entries(STATUS_CONFIG).map(([sKey, sMeta]) => {
                                                                const isChosen = currentStatus === sKey;
                                                                return (
                                                                    <button
                                                                        key={sKey}
                                                                        type="button"
                                                                        onClick={() => handleStatusChange(staffId, sKey)}
                                                                        className={cn(
                                                                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] transition-colors cursor-pointer text-left",
                                                                            isChosen ? "bg-[#F2F3F5] font-semibold text-[#14161A]" : "text-[#14161A] hover:bg-[#F2F3F5] font-normal"
                                                                        )}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            {sKey === "present" ? (
                                                                                <Check size={13} className="text-[#5F6673]" />
                                                                            ) : sKey === "half_day" ? (
                                                                                <span className="w-2 h-2 rounded-full border border-[#D97706] bg-gradient-to-r from-[#D97706] from-50% to-transparent to-50% inline-block" />
                                                                            ) : sKey === "holiday" ? (
                                                                                <span className="w-2 h-2 rounded-full border border-[#5F6673] inline-block" />
                                                                            ) : (
                                                                                <span className={cn("w-2 h-2 rounded-full inline-block", sMeta.dot)} />
                                                                            )}
                                                                            <span>{sMeta.label}</span>
                                                                        </div>
                                                                        <span className="text-[11px] font-mono text-[#5F6673]">{sMeta.key}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </td>

                                        {/* Zone 4: Row Actions (⋯ on hover) */}
                                        <td className="pr-2 pl-1 py-2 text-right align-middle w-10">
                                            <div className="relative inline-block">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveRowMenuId(prev => prev === staffId ? null : staffId)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-md text-[#5F6673] hover:text-[#14161A] hover:bg-[#F2F3F5] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity cursor-pointer"
                                                    aria-label={`Actions for ${fullName}`}
                                                >
                                                    <MoreHorizontal size={15} />
                                                </button>

                                                <AnimatePresence>
                                                    {activeRowMenuId === staffId && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.96, y: -4 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.96, y: -4 }}
                                                            transition={SPRING_FAST}
                                                            style={{ transformOrigin: "top right" }}
                                                            className="absolute right-0 top-8 w-44 bg-white rounded-xl shadow-[0_0_0_0.5px_rgba(20,22,26,0.08),0_8px_24px_-6px_rgba(20,22,26,0.14)] p-1 z-40"
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActiveRowMenuId(null);
                                                                    setEditingNoteId(staffId);
                                                                    setNoteDraft(rec.remarks || "");
                                                                }}
                                                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-[#14161A] hover:bg-[#F2F3F5] rounded-lg transition-colors cursor-pointer text-left"
                                                            >
                                                                <FileText size={14} className="text-[#5F6673]" />
                                                                <span>{hasNote ? "Edit note…" : "Add note…"}</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActiveRowMenuId(null);
                                                                    setSelectedFaceUser(rec.staff);
                                                                    setIsFaceModalOpen(true);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-[#14161A] hover:bg-[#F2F3F5] rounded-lg transition-colors cursor-pointer text-left"
                                                            >
                                                                <Camera size={14} className="text-[#5F6673]" />
                                                                <span>{rec.staff?.faceEnrolledAt ? "Re-enroll face…" : "Enroll face…"}</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActiveRowMenuId(null);
                                                                    router.push(`/admin/hr/staff/${staffId}`);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-[#14161A] hover:bg-[#F2F3F5] rounded-lg transition-colors cursor-pointer text-left"
                                                            >
                                                                <Sparkles size={14} className="text-[#5F6673]" />
                                                                <span>View profile</span>
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Scan Attendance Sheet (§5.8) ────────────────────────────────────── */}
            <AnimatePresence>
                {isScanSheetOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsScanSheetOpen(false)}
                            className="fixed inset-0 bg-black/30 backdrop-blur-xs z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 20 }}
                            transition={SPRING_SHEET}
                            className="fixed inset-x-4 top-[10%] max-w-lg mx-auto bg-white rounded-2xl shadow-[0_0_0_0.5px_rgba(20,22,26,0.08),0_24px_64px_-12px_rgba(20,22,26,0.22)] p-6 z-50 overflow-hidden"
                        >
                            {/* Sheet Header */}
                            <div className="flex items-center justify-between pb-4 border-b border-[#E6E8EC]/80">
                                <div>
                                    <h3 className="text-[17px] font-semibold text-[#14161A]">Scan attendance</h3>
                                    <p className="text-[12px] text-[#5F6673] mt-0.5">Real-time attendance for {format(parsedDate, "EEEE, d MMMM")}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsWindowsPopoverOpen(prev => !prev)}
                                        aria-label="Scanner settings"
                                        title="Scanner time window settings"
                                        className="w-8 h-8 rounded-lg text-[#5F6673] hover:text-[#14161A] hover:bg-[#F2F3F5] flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                        <Sliders size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsScanSheetOpen(false)}
                                        aria-label="Close sheet"
                                        className="w-8 h-8 rounded-lg text-[#5F6673] hover:text-[#14161A] hover:bg-[#F2F3F5] flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Scan Windows Popover from Gear */}
                            <AnimatePresence>
                                {isWindowsPopoverOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={SPRING_ACCORDION}
                                        className="mt-3 p-3.5 bg-[#F7F8FA] rounded-xl border border-[#E6E8EC]/80 text-[13px]"
                                    >
                                        <div className="flex items-center justify-between pb-2.5">
                                            <span className="font-medium text-[#14161A]">Only accept scans inside these windows</span>
                                            <input
                                                type="checkbox"
                                                checked={useTimeRange}
                                                onChange={(e) => {
                                                    setUseTimeRange(e.target.checked);
                                                    localStorage.setItem("useTimeRange", String(e.target.checked));
                                                }}
                                                className="w-4 h-4 rounded text-[#14161A] cursor-pointer"
                                            />
                                        </div>

                                        {useTimeRange && (
                                            <div className="space-y-2 pt-2 border-t border-[#E6E8EC]/70">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[#5F6673]">Check-in window</span>
                                                    <div className="flex items-center gap-1.5 tabular-nums">
                                                        <input 
                                                            type="time" 
                                                            value={checkInStart} 
                                                            onChange={e => { setCheckInStart(e.target.value); localStorage.setItem("checkInStart", e.target.value); }}
                                                            className="h-7 px-2 bg-white rounded-md border border-[#E6E8EC] text-[12px] font-medium"
                                                        />
                                                        <span className="text-[#5F6673]">to</span>
                                                        <input 
                                                            type="time" 
                                                            value={checkInEnd} 
                                                            onChange={e => { setCheckInEnd(e.target.value); localStorage.setItem("checkInEnd", e.target.value); }}
                                                            className="h-7 px-2 bg-white rounded-md border border-[#E6E8EC] text-[12px] font-medium"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[#5F6673]">Check-out window</span>
                                                    <div className="flex items-center gap-1.5 tabular-nums">
                                                        <input 
                                                            type="time" 
                                                            value={checkOutStart} 
                                                            onChange={e => { setCheckOutStart(e.target.value); localStorage.setItem("checkOutStart", e.target.value); }}
                                                            className="h-7 px-2 bg-white rounded-md border border-[#E6E8EC] text-[12px] font-medium"
                                                        />
                                                        <span className="text-[#5F6673]">to</span>
                                                        <input 
                                                            type="time" 
                                                            value={checkOutEnd} 
                                                            onChange={e => { setCheckOutEnd(e.target.value); localStorage.setItem("checkOutEnd", e.target.value); }}
                                                            className="h-7 px-2 bg-white rounded-md border border-[#E6E8EC] text-[12px] font-medium"
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-[#5F6673] pt-1">Scans outside these windows won&apos;t count.</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Mode Segmented Control: Face | QR */}
                            <div className="mt-4 p-0.5 bg-[#F2F3F5] rounded-[10px] flex">
                                <button
                                    type="button"
                                    onClick={() => setScanSheetTab("face")}
                                    className={cn(
                                        "flex-1 py-1.5 text-[13px] font-medium rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5",
                                        scanSheetTab === "face" ? "bg-white text-[#14161A] font-semibold shadow-[0_0_0_0.5px_rgba(20,22,26,0.08)]" : "text-[#5F6673]"
                                    )}
                                >
                                    <Camera size={14} />
                                    <span>Face recognition</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScanSheetTab("qr")}
                                    className={cn(
                                        "flex-1 py-1.5 text-[13px] font-medium rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5",
                                        scanSheetTab === "qr" ? "bg-white text-[#14161A] font-semibold shadow-[0_0_0_0.5px_rgba(20,22,26,0.08)]" : "text-[#5F6673]"
                                    )}
                                >
                                    <QrCode size={14} />
                                    <span>QR Code</span>
                                </button>
                            </div>

                            {/* Content based on tab */}
                            <div className="py-6 text-center">
                                {scanSheetTab === "face" ? (
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 rounded-full bg-[#F2F3F5] text-[#14161A] flex items-center justify-center mx-auto">
                                            <Camera size={22} />
                                        </div>
                                        <div>
                                            <h4 className="text-[15px] font-semibold text-[#14161A]">Face scanner</h4>
                                            <p className="text-[12px] text-[#5F6673] mt-1 max-w-xs mx-auto">
                                                Camera recognizes enrolled teachers in under 1 second.
                                            </p>
                                        </div>
                                        {notEnrolledFaceCount > 0 && (
                                            <p className="text-[12px] text-[#5F6673] bg-[#F7F8FA] py-1.5 px-3 rounded-lg max-w-xs mx-auto">
                                                {notEnrolledFaceCount} of {records.length} staff haven&apos;t enrolled their face yet.
                                            </p>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/admin/attendance/scan?staff=true&date=${attendanceDate}`)}
                                            className="mt-2 h-9 px-5 bg-[#14161A] text-white rounded-lg text-[13px] font-semibold hover:bg-black transition-colors cursor-pointer inline-flex items-center gap-2"
                                        >
                                            <ScanLine size={15} />
                                            <span>Launch camera scanner</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 rounded-full bg-[#F2F3F5] text-[#14161A] flex items-center justify-center mx-auto">
                                            <QrCode size={22} />
                                        </div>
                                        <div>
                                            <h4 className="text-[15px] font-semibold text-[#14161A]">QR code scanner</h4>
                                            <p className="text-[12px] text-[#5F6673] mt-1 max-w-xs mx-auto">
                                                Scan staff ID cards with built-in QR codes.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/admin/attendance/scan?staff=true&date=${attendanceDate}`)}
                                            className="mt-2 h-9 px-5 bg-[#14161A] text-white rounded-lg text-[13px] font-semibold hover:bg-black transition-colors cursor-pointer inline-flex items-center gap-2"
                                        >
                                            <ScanLine size={15} />
                                            <span>Launch QR scanner</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Undo Toast (§5.9) ──────────────────────────────────────────────── */}
            <AnimatePresence>
                {undoToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        transition={SPRING_FAST}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#14161A] text-white px-4 py-2 rounded-xl text-[13px] font-medium shadow-[0_8px_24px_-6px_rgba(20,22,26,0.22)] flex items-center gap-3 z-50"
                    >
                        <span>{undoToast.message}</span>
                        <button
                            type="button"
                            onClick={handleUndo}
                            className="text-[#2563EB] hover:text-blue-300 font-semibold cursor-pointer"
                        >
                            Undo
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Modals: Face Enrollment & Biometric Excel ──────────────────────── */}
            <EnrollFaceModal
                user={selectedFaceUser}
                isOpen={isFaceModalOpen}
                onClose={() => {
                    setIsFaceModalOpen(false);
                    setSelectedFaceUser(null);
                }}
                onSuccess={() => fetchAttendance(attendanceDate)}
            />

            <ImportBiometricModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => {
                    fetchAttendance(attendanceDate);
                    toast.success("Attendance synced from Biometric device!");
                }}
            />
        </div>
    );
}
