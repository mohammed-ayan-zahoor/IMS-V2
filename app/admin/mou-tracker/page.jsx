"use client";

import { useState, useEffect, useMemo, useRef, useLayoutEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
    Search,
    X,
    RefreshCw,
    Plus,
    Tag,
    Printer,
    Download,
    FileSignature,
    User,
    Mail,
    Phone,
    MapPin,
    ChevronDown,
    ChevronUp,
    FileText,
    Pencil,
    Trash2,
    Landmark,
    Copy,
    Check,
    ArrowUpDown,
    Building2,
    GraduationCap,
    School,
    Coins,
    Calculator,
    Loader2,
    Hash
} from "lucide-react";

import { MOTION_TOKENS, STATUS_CONFIG } from "./motion-tokens";
import { useReducedMotion } from "./useReducedMotion";
import { useNumberTween } from "./useNumberTween";
import StatusListbox from "./StatusListbox";
import { ToastProvider, useToast } from "./Toast";
import "./mou-tracker.motion.css";

const STATUS_TABS = [
    { key: "all", label: "All" },
    { key: "new", label: "New" },
    { key: "contacted", label: "Contacted" },
    { key: "converted", label: "Converted" },
    { key: "rejected", label: "Rejected" }
];

function formatCurrency(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(amount);
}

function formatRelativeTime(dateInput) {
    if (!dateInput) return "—";
    const date = new Date(dateInput);
    const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (diffSec < 60) return "just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatIST(dateInput) {
    if (!dateInput) return "—";
    return new Date(dateInput).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

function MouTrackerContent() {
    const { data: session, status: sessionStatus } = useSession();
    const router = useRouter();
    const isReducedMotion = useReducedMotion();
    const { showToast } = useToast();

    const [rawSubmissions, setRawSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSlowLoading, setIsSlowLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);

    // Multi-row expand support (non-accordion)
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [notesText, setNotesText] = useState({});
    const [savingNotes, setSavingNotes] = useState({});

    // Row change flash and delayed exit
    const [flashingRefId, setFlashingRefId] = useState(null);
    const [delayExitingIds, setDelayExitingIds] = useState(new Set());
    const [copiedKey, setCopiedKey] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);

    // Sorting
    const [sortField, setSortField] = useState("createdAt");
    const [sortAsc, setSortAsc] = useState(false);

    // Modals
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("upi");
    const [paymentReference, setPaymentReference] = useState("");
    const [paymentNotes, setPaymentNotes] = useState("");
    const [isRecordingPayment, setIsRecordingPayment] = useState(false);
    const [paymentError, setPaymentError] = useState(null);

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingMOU, setEditingMOU] = useState(null);
    const [isSavingForm, setIsSavingForm] = useState(false);
    const [formError, setFormError] = useState(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [mouFormData, setMouFormData] = useState({
        schoolName: "",
        city: "",
        principalName: "",
        designation: "Principal",
        contactEmail: "",
        contactPhone: "",
        studentCount: "",
        yr1: "",
        yr2: "",
        yr3: "",
        instituteType: "school",
        mouDuration: "1",
        planType: "standard",
        customRate: "",
        coupon: "",
        udiseCode: "",
        address: "",
        action: "manual_entry",
        status: "new",
        notes: ""
    });

    // Live memoized commercial calculation for Edit / Add MOU modal
    const formLiveCalculation = useMemo(() => {
        const isCollege = mouFormData.instituteType !== "school";
        const duration = parseInt(mouFormData.mouDuration) || 1;
        let count = 0;
        let yearlyTotal = 0;
        let rate = 59;
        let yearWiseCounts = null;

        if (isCollege) {
            const yr1 = parseInt(mouFormData.yr1) || 0;
            const yr2 = parseInt(mouFormData.yr2) || 0;
            const yr3 = mouFormData.instituteType === "college_degree" ? (parseInt(mouFormData.yr3) || 0) : 0;
            count = yr1 + yr2 + yr3;
            yearWiseCounts = { yr1, yr2, yr3 };
            const isSDC = ["SDC", "SDC20", "SDC-SPECIAL"].includes((mouFormData.coupon || "").trim().toUpperCase());
            const yr2Rate = isSDC ? 20 : 30;
            const yr3Rate = isSDC ? 20 : 30;
            yearlyTotal = (yr1 * 59) + (yr2 * yr2Rate) + (yr3 * yr3Rate);
            rate = count > 0 ? Math.round(yearlyTotal / count) : 0;
        } else {
            count = parseInt(mouFormData.studentCount) || 0;
            if (mouFormData.planType === "plus") rate = 69;
            else if (mouFormData.planType === "custom") rate = parseFloat(mouFormData.customRate) || 0;
            else rate = 59;
            yearlyTotal = count * rate;
        }

        const totalPrice = yearlyTotal * duration;
        let upfrontPercent = 0.5;
        let advanceTierLabel = "> 1000 Students: 50% Advance";
        if (count < 500) {
            upfrontPercent = 1.0;
            advanceTierLabel = "< 500 Students: 100% Advance";
        } else if (count <= 1000) {
            upfrontPercent = 0.75;
            advanceTierLabel = "500 - 1000 Students: 75% Advance";
        }
        const upfrontPrice = yearlyTotal * upfrontPercent;

        return {
            count,
            duration,
            rate,
            yearlyTotal,
            totalPrice,
            upfrontPercent,
            upfrontPrice,
            advanceTierLabel,
            yearWiseCounts
        };
    }, [
        mouFormData.instituteType,
        mouFormData.mouDuration,
        mouFormData.studentCount,
        mouFormData.yr1,
        mouFormData.yr2,
        mouFormData.yr3,
        mouFormData.coupon,
        mouFormData.planType,
        mouFormData.customRate
    ]);

    // Refs for scroll locking and focus recovery
    const triggerButtonsRef = useRef({});
    const tabsContainerRef = useRef(null);
    const tabButtonsRef = useRef({});
    const [tabIndicatorStyle, setTabIndicatorStyle] = useState({ x: 0, w: 0 });
    const [tabsReady, setTabsReady] = useState(false);

    // Lock scroll on actual scrolling container in admin layout without forced gutter
    const lockScroll = (lock) => {
        const scrollContainer = document.querySelector("main > div.overflow-y-auto") || document.body;
        if (lock) {
            scrollContainer.style.overflow = "hidden";
        } else {
            scrollContainer.style.overflow = "";
        }
    };

    useEffect(() => {
        const anyModalOpen = Boolean(deleteTarget || isFormModalOpen || isPaymentModalOpen);
        lockScroll(anyModalOpen);
        return () => lockScroll(false);
    }, [deleteTarget, isFormModalOpen, isPaymentModalOpen]);

    // Global Escape key listener for accessible modal dismissal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                if (isFormModalOpen && !isSavingForm) setIsFormModalOpen(false);
                if (isPaymentModalOpen && !isRecordingPayment) setIsPaymentModalOpen(false);
                if (deleteTarget && !isDeleting) setDeleteTarget(null);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isFormModalOpen, isSavingForm, isPaymentModalOpen, isRecordingPayment, deleteTarget, isDeleting]);

    // Authentication redirect
    useEffect(() => {
        if (sessionStatus === "authenticated" && session?.user?.role !== "super_admin") {
            router.push("/admin/dashboard");
        }
    }, [session, sessionStatus, router]);

    // Debounce search by 200ms
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 200);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch data
    const fetchSubmissions = async (showInitialLoading = true) => {
        if (showInitialLoading) setLoading(true);

        const slowTimer = setTimeout(() => {
            setIsSlowLoading(true);
        }, 150);

        try {
            const res = await fetch("/api/v1/mou/submissions?limit=1000", { cache: "no-store" });
            const data = await res.json();
            if (data.submissions) {
                setRawSubmissions(data.submissions);
            }
        } catch (error) {
            console.error("Failed to fetch submissions:", error);
            showToast("Failed to load MOU submissions", "error");
        } finally {
            clearTimeout(slowTimer);
            if (showInitialLoading) setLoading(false);
            setIsSlowLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSubmissions(true);
        const interval = setInterval(() => {
            fetchSubmissions(false);
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    // Grouping by refId
    const groupedMous = useMemo(() => {
        const groups = new Map();
        for (const sub of rawSubmissions) {
            const key = sub.refId || sub._id;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(sub);
        }

        const result = [];
        for (const [refKey, group] of groups.entries()) {
            group.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            const newest = group[0];

            const allPayments = [];
            const seenPaymentIds = new Set();
            for (const doc of group) {
                if (doc.payments && Array.isArray(doc.payments)) {
                    for (const p of doc.payments) {
                        const pId = p._id ? String(p._id) : `${p.paidDate}-${p.amount}`;
                        if (!seenPaymentIds.has(pId)) {
                            seenPaymentIds.add(pId);
                            allPayments.push(p);
                        }
                    }
                }
            }

            result.push({
                ...newest,
                refKey,
                payments: allPayments.length > 0 ? allPayments : (newest.payments || []),
                activityCount: group.length,
                activities: group.map(d => ({
                    id: d._id,
                    action: d.action,
                    createdAt: d.createdAt,
                    metadata: d.metadata,
                    notes: d.notes
                }))
            });
        }

        // Apply sorting
        result.sort((a, b) => {
            let valA, valB;
            if (sortField === "totalPrice") {
                valA = Number(a.totalPrice) || 0;
                valB = Number(b.totalPrice) || 0;
            } else if (sortField === "studentCount") {
                valA = Number(a.studentCount) || 0;
                valB = Number(b.studentCount) || 0;
            } else if (sortField === "schoolName") {
                valA = (a.schoolName || "").toLowerCase();
                valB = (b.schoolName || "").toLowerCase();
            } else {
                valA = new Date(a.createdAt || 0).getTime();
                valB = new Date(b.createdAt || 0).getTime();
            }

            if (valA < valB) return sortAsc ? -1 : 1;
            if (valA > valB) return sortAsc ? 1 : -1;
            return 0;
        });

        return result;
    }, [rawSubmissions, sortField, sortAsc]);

    // Status counts
    const statusCounts = useMemo(() => {
        const counts = { all: groupedMous.length, new: 0, contacted: 0, converted: 0, rejected: 0 };
        for (const m of groupedMous) {
            if (counts[m.status] !== undefined) {
                counts[m.status]++;
            }
        }
        return counts;
    }, [groupedMous]);

    // Filtered MOUs with 600ms grace period for leaving rows
    const filteredMous = useMemo(() => {
        return groupedMous.filter(mou => {
            const matchesStatus = statusFilter === "all" || mou.status === statusFilter || delayExitingIds.has(mou._id);
            if (!matchesStatus) return false;

            if (debouncedSearch.trim()) {
                const q = debouncedSearch.trim().toLowerCase();
                const school = (mou.schoolName || "").toLowerCase();
                const principal = (mou.principalName || "").toLowerCase();
                const email = (mou.contactEmail || "").toLowerCase();
                const city = (mou.city || "").toLowerCase();
                const ref = (mou.refId || "").toLowerCase();
                if (!school.includes(q) && !principal.includes(q) && !email.includes(q) && !city.includes(q) && !ref.includes(q)) {
                    return false;
                }
            }
            return true;
        });
    }, [groupedMous, statusFilter, debouncedSearch, delayExitingIds]);

    // KPIs
    const kpis = useMemo(() => {
        let totalOpp = 0;
        let totalStudents = 0;
        let convertedCount = 0;

        for (const m of filteredMous) {
            totalOpp += Number(m.totalPrice) || 0;
            totalStudents += Number(m.studentCount) || 0;
            if (m.status === "converted") {
                convertedCount++;
            }
        }

        return {
            totalOpportunity: totalOpp,
            totalStudents,
            totalMous: filteredMous.length,
            convertedCount
        };
    }, [filteredMous]);

    // Number tweens (§4.4)
    const tweenOpportunity = useNumberTween(kpis.totalOpportunity);
    const tweenStudents = useNumberTween(kpis.totalStudents);
    const tweenMous = useNumberTween(kpis.totalMous);
    const tweenConverted = useNumberTween(kpis.convertedCount);

    // Sliding tab underline measurement (§4.3)
    useLayoutEffect(() => {
        const activeBtn = tabButtonsRef.current[statusFilter];
        const container = tabsContainerRef.current;
        if (activeBtn && container) {
            const containerRect = container.getBoundingClientRect();
            const btnRect = activeBtn.getBoundingClientRect();
            const x = btnRect.left - containerRect.left;
            const w = btnRect.width;

            setTabIndicatorStyle({ x, w });
            if (!tabsReady) {
                // Ensure first paint does not animate from 0
                requestAnimationFrame(() => setTabsReady(true));
            }
        }
    }, [statusFilter, tabsReady]);

    // Pagination
    const pageSize = 25;
    const totalPages = Math.max(1, Math.ceil(filteredMous.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedMous = filteredMous.slice(startIndex, startIndex + pageSize);
    const showingStart = filteredMous.length === 0 ? 0 : startIndex + 1;
    const showingEnd = Math.min(filteredMous.length, startIndex + pageSize);

    // Toggle row with focus retention & smooth scroll (§3.A)
    const toggleRow = (mouId, currentNotes) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(mouId)) {
                // Closing
                const activeEl = document.activeElement;
                const panel = document.getElementById(`panel-${mouId}`);
                if (panel && panel.contains(activeEl)) {
                    triggerButtonsRef.current[mouId]?.focus();
                }
                next.delete(mouId);
            } else {
                // Opening
                next.add(mouId);
                setNotesText(n => ({ ...n, [mouId]: currentNotes || "" }));

                setTimeout(() => {
                    const rowElem = document.getElementById(`row-${mouId}`);
                    if (rowElem) {
                        const rect = rowElem.getBoundingClientRect();
                        if (rect.bottom > window.innerHeight) {
                            rowElem.scrollIntoView({
                                block: "nearest",
                                behavior: isReducedMotion ? "auto" : "smooth"
                            });
                        }
                    }
                }, 260);
            }
            return next;
        });
    };

    // Copy to clipboard with visual feedback (§3.M)
    const copyToClipboard = async (text, key) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedKey(key);
            showToast(`Copied ${text}`, "info");
            setTimeout(() => setCopiedKey(null), 1500);
        } catch {
            showToast("Failed to copy", "error");
        }
    };

    // Download MOU PDF with visual loading spinner & toast notifications
    const handleDownloadMOU = async (mou) => {
        if (!mou?._id || downloadingId === mou._id) return;

        try {
            setDownloadingId(mou._id);
            showToast(`Generating official PDF for ${mou.schoolName || "MOU"}...`, "info");

            const res = await fetch(`/api/v1/mou/pdf?id=${mou._id}`);
            if (!res.ok) {
                const errText = await res.text().catch(() => "");
                throw new Error(errText || `Server returned status ${res.status}`);
            }

            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            let filename = `MOU_${(mou.schoolName || "Institute").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
            const disposition = res.headers.get("Content-Disposition");
            if (disposition && disposition.includes("filename=")) {
                const match = disposition.match(/filename=["']?([^"']+)["']?/);
                if (match && match[1]) filename = match[1];
            }

            const tempLink = document.createElement("a");
            tempLink.href = blobUrl;
            tempLink.download = filename;
            document.body.appendChild(tempLink);
            tempLink.click();
            document.body.removeChild(tempLink);
            window.URL.revokeObjectURL(blobUrl);

            showToast("MOU PDF downloaded successfully", "success");
        } catch (err) {
            console.error("PDF download error:", err);
            showToast("Failed to generate or download PDF. Please try again.", "error");
        } finally {
            setDownloadingId(null);
        }
    };

    // Update status with optimistic UI & grace period for tab leaving
    const handleUpdateStatus = async (mou, newStatus) => {
        if (newStatus === "converted") {
            openPaymentModal(mou);
            return;
        }

        const oldStatus = mou.status;
        if (statusFilter !== "all" && statusFilter === oldStatus && newStatus !== oldStatus) {
            // Keep row visible for 600ms before fading out
            setDelayExitingIds(prev => new Set(prev).add(mou._id));
            setTimeout(() => {
                setDelayExitingIds(prev => {
                    const next = new Set(prev);
                    next.delete(mou._id);
                    return next;
                });
            }, 600);
        }

        try {
            const res = await fetch(`/api/v1/mou/submissions/${mou._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });
            if (!res.ok) throw new Error("Status update failed");

            setRawSubmissions(prev =>
                prev.map(sub => (sub.refId === mou.refId ? { ...sub, status: newStatus } : sub))
            );
            showToast(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
        } catch (error) {
            showToast("Failed to update status", "error");
            throw error;
        }
    };

    // Save notes
    const handleSaveNotes = async (mouId) => {
        setSavingNotes(prev => ({ ...prev, [mouId]: true }));
        try {
            const text = notesText[mouId] || "";
            const res = await fetch(`/api/v1/mou/submissions/${mouId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes: text })
            });
            if (!res.ok) throw new Error("Failed to save notes");

            const target = groupedMous.find(m => m._id === mouId);
            const ref = target?.refId;
            setRawSubmissions(prev =>
                prev.map(sub => (sub.refId === ref || sub._id === mouId ? { ...sub, notes: text } : sub))
            );
            showToast("Notes saved successfully");
        } catch {
            showToast("Failed to save notes", "error");
        } finally {
            setSavingNotes(prev => ({ ...prev, [mouId]: false }));
        }
    };

    // Delete with fade out
    const handleDeleteGroupedMou = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/v1/mou/submissions/${deleteTarget._id}`, {
                method: "DELETE"
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete submission.");

            const ref = deleteTarget.refId;
            setRawSubmissions(prev => prev.filter(sub => (ref ? sub.refId !== ref : sub._id !== deleteTarget._id)));
            setDeleteTarget(null);
            showToast(`Deleted ${deleteTarget.schoolName} and associated records`);
        } catch (error) {
            showToast(error.message || "Failed to delete submission", "error");
        } finally {
            setIsDeleting(false);
        }
    };

    // Form modals
    const openCreateModal = () => {
        setEditingMOU(null);
        setFormError(null);
        setMouFormData({
            schoolName: "",
            city: "",
            principalName: "",
            designation: "Principal",
            contactEmail: "",
            contactPhone: "",
            studentCount: "",
            yr1: "",
            yr2: "",
            yr3: "",
            instituteType: "school",
            mouDuration: "1",
            planType: "standard",
            customRate: "",
            coupon: "",
            udiseCode: "",
            address: "",
            action: "manual_entry",
            status: "new",
            notes: ""
        });
        setIsFormModalOpen(true);
    };

    const openEditModal = (mou) => {
        setEditingMOU(mou);
        setFormError(null);
        setMouFormData({
            schoolName: mou.schoolName || "",
            city: mou.city || "",
            principalName: mou.principalName || "",
            designation: mou.designation || "Principal",
            contactEmail: mou.contactEmail || "",
            contactPhone: mou.contactPhone || "",
            studentCount: mou.studentCount !== undefined && mou.studentCount !== null ? String(mou.studentCount) : "",
            yr1: mou.yearWiseCounts?.yr1 !== undefined && mou.yearWiseCounts?.yr1 !== null ? String(mou.yearWiseCounts.yr1) : "",
            yr2: mou.yearWiseCounts?.yr2 !== undefined && mou.yearWiseCounts?.yr2 !== null ? String(mou.yearWiseCounts.yr2) : "",
            yr3: mou.yearWiseCounts?.yr3 !== undefined && mou.yearWiseCounts?.yr3 !== null ? String(mou.yearWiseCounts.yr3) : "",
            instituteType: mou.instituteType || "school",
            mouDuration: mou.mouDuration ? String(mou.mouDuration) : "1",
            planType: mou.planType || "standard",
            customRate: mou.planType === "custom" && mou.perStudentRate ? String(mou.perStudentRate) : "",
            coupon: mou.coupon || "",
            udiseCode: mou.udiseCode || "",
            address: mou.address || "",
            action: mou.action || "manual_entry",
            status: mou.status || "new",
            notes: mou.notes || ""
        });
        setIsFormModalOpen(true);
    };

    const handleSaveMOUForm = async (e) => {
        e.preventDefault();
        const isCollege = mouFormData.instituteType !== "school";

        if (!mouFormData.schoolName || !mouFormData.city || !mouFormData.principalName || !mouFormData.contactEmail) {
            setFormError("Please fill out all required fields.");
            return;
        }

        const {
            count,
            duration,
            rate,
            totalPrice,
            upfrontPrice,
            yearWiseCounts
        } = formLiveCalculation;

        if (isCollege) {
            if (count <= 0) {
                setFormError("Please enter at least one year-wise student count (> 0).");
                return;
            }
        } else {
            if (count <= 0) {
                setFormError("Please enter a valid student count (> 0).");
                return;
            }
            if (mouFormData.planType === "custom" && (!rate || rate <= 0)) {
                setFormError("Please enter a valid positive custom per-student rate.");
                return;
            }
        }

        setIsSavingForm(true);
        setFormError(null);

        try {
            if (editingMOU) {
                const res = await fetch(`/api/v1/mou/submissions/${editingMOU._id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        schoolName: mouFormData.schoolName.trim(),
                        city: mouFormData.city.trim(),
                        principalName: mouFormData.principalName.trim(),
                        designation: mouFormData.designation.trim() || "Principal",
                        contactEmail: mouFormData.contactEmail.trim(),
                        contactPhone: mouFormData.contactPhone.trim(),
                        studentCount: count,
                        mouDuration: duration,
                        perStudentRate: rate,
                        planType: isCollege ? "custom" : mouFormData.planType,
                        instituteType: mouFormData.instituteType,
                        ...(yearWiseCounts ? { yearWiseCounts } : { yearWiseCounts: { yr1: 0, yr2: 0, yr3: 0 } }),
                        coupon: (mouFormData.coupon || "").trim().toUpperCase(),
                        udiseCode: mouFormData.udiseCode.trim(),
                        address: mouFormData.address.trim(),
                        totalPrice,
                        upfrontPrice,
                        action: mouFormData.action || "manual_entry",
                        status: mouFormData.status || "new",
                        notes: mouFormData.notes.trim()
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to update MOU.");

                // Row flash on changed refId
                setFlashingRefId(editingMOU.refId);
                setTimeout(() => setFlashingRefId(null), 1200);
                showToast("MOU updated successfully");
            } else {
                const refId = `QP/MOU/MANUAL-${Math.floor(1000 + Math.random() * 9000)}`;
                const res = await fetch("/api/v1/mou/submissions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        refId,
                        schoolName: mouFormData.schoolName.trim(),
                        city: mouFormData.city.trim(),
                        principalName: mouFormData.principalName.trim(),
                        designation: mouFormData.designation.trim() || "Principal",
                        contactEmail: mouFormData.contactEmail.trim(),
                        contactPhone: mouFormData.contactPhone.trim(),
                        studentCount: count,
                        mouDuration: duration,
                        perStudentRate: rate,
                        planType: isCollege ? "custom" : mouFormData.planType,
                        instituteType: mouFormData.instituteType,
                        ...(yearWiseCounts && { yearWiseCounts }),
                        ...(mouFormData.coupon && { coupon: mouFormData.coupon.trim().toUpperCase() }),
                        udiseCode: mouFormData.udiseCode.trim(),
                        address: mouFormData.address.trim(),
                        totalPrice,
                        upfrontPrice,
                        action: mouFormData.action || "manual_entry",
                        status: mouFormData.status || "new",
                        notes: mouFormData.notes.trim() || "Manual MOU entry."
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to create manual MOU.");

                setFlashingRefId(refId);
                setTimeout(() => setFlashingRefId(null), 1200);
                showToast("Manual MOU created successfully");
            }

            setIsFormModalOpen(false);
            setEditingMOU(null);
            fetchSubmissions(false);
        } catch (err) {
            setFormError(err.message || "Failed to save MOU.");
            showToast(err.message || "Save failed", "error");
        } finally {
            setIsSavingForm(false);
        }
    };

    // Payment modal
    const openPaymentModal = (sub) => {
        setSelectedSubmission(sub);
        const totalPaid = sub.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        const balance = Math.max(0, sub.totalPrice - totalPaid);
        setPaymentAmount(totalPaid === 0 ? String(sub.upfrontPrice) : String(balance));
        setPaymentMethod("upi");
        setPaymentReference("");
        setPaymentNotes("");
        setPaymentError(null);
        setIsPaymentModalOpen(true);
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        if (!paymentAmount || isNaN(paymentAmount) || Number(paymentAmount) <= 0) {
            setPaymentError("Please enter a valid positive payment amount.");
            return;
        }

        setIsRecordingPayment(true);
        setPaymentError(null);

        try {
            const res = await fetch(`/api/v1/mou/submissions/${selectedSubmission._id}/payments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: Number(paymentAmount),
                    paymentMethod,
                    referenceId: paymentReference,
                    notes: paymentNotes
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to record payment.");

            setIsPaymentModalOpen(false);
            fetchSubmissions(false);
            showToast("Payment recorded successfully");
            window.open(`/admin/mou-tracker/receipt/${selectedSubmission._id}`, "_blank");
        } catch (err) {
            setPaymentError(err.message || "Failed to submit payment transaction.");
            showToast(err.message || "Payment recording failed", "error");
        } finally {
            setIsRecordingPayment(false);
        }
    };

    const toggleSort = (field) => {
        if (sortField === field) {
            setSortAsc(prev => !prev);
        } else {
            setSortField(field);
            setSortAsc(false);
        }
    };

    if (sessionStatus === "loading" || (sessionStatus === "authenticated" && session?.user?.role !== "super_admin")) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-2 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="mou-tracker space-y-6">
            {/* Header & Staging Tag */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2">
                <div>
                    <h1 className="text-xl font-bold text-[#171a2f] tracking-tight">MOU Tracker</h1>
                    <p className="text-xs text-[#667085] mt-0.5">
                        Track, review, and manage institute MOUs across the commercial pipeline.
                    </p>
                </div>
                {process.env.NODE_ENV !== "production" && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#667085] font-medium self-start sm:self-auto bg-amber-50/70 border border-amber-200/60 px-2.5 py-1 rounded-[6px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Staging
                    </span>
                )}
            </div>

            {/* Unboxed Stat Strip with Number Tweens (§3.G & §4.4) */}
            <div className="grid grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] border border-[#e4e7ef] rounded-[6px] bg-white divide-y lg:divide-y-0 lg:divide-x divide-[#e4e7ef]">
                {/* EST. OPPORTUNITY (Wide, Accent) */}
                <div className="p-4 sm:p-5">
                    <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Est. Opportunity</p>
                    <div className="text-2xl sm:text-[34px] font-bold text-[#4f46e5] tracking-tight tabular-nums mt-1 leading-tight min-w-[6ch]">
                        <span aria-hidden="true">{formatCurrency(tweenOpportunity)}</span>
                        <span className="sr-only">{formatCurrency(kpis.totalOpportunity)}</span>
                    </div>
                    <p className="text-[11px] text-[#667085] mt-1">across {kpis.totalMous} active {kpis.totalMous === 1 ? "MOU" : "MOUs"}</p>
                </div>

                {/* STUDENT LEADS */}
                <div className="p-4 sm:p-5">
                    <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Student Leads</p>
                    <div className="text-xl sm:text-2xl font-bold text-[#171a2f] tracking-tight tabular-nums mt-1 min-w-[4ch]">
                        <span aria-hidden="true">{tweenStudents.toLocaleString("en-IN")}</span>
                        <span className="sr-only">{kpis.totalStudents.toLocaleString("en-IN")}</span>
                    </div>
                    <p className="text-[11px] text-[#667085] mt-1">total enrolled pipeline</p>
                </div>

                {/* MOUs */}
                <div className="p-4 sm:p-5">
                    <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">MOUs</p>
                    <div className="text-xl sm:text-2xl font-bold text-[#171a2f] tracking-tight tabular-nums mt-1 min-w-[2ch]">
                        <span aria-hidden="true">{tweenMous}</span>
                        <span className="sr-only">{kpis.totalMous}</span>
                    </div>
                    <p className="text-[11px] text-[#667085] mt-1">distinct institutes</p>
                </div>

                {/* CONVERTED */}
                <div className="p-4 sm:p-5">
                    <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Converted</p>
                    <div className="text-xl sm:text-2xl font-bold text-[#047857] tracking-tight tabular-nums mt-1 min-w-[2ch]">
                        <span aria-hidden="true">{tweenConverted}</span>
                        <span className="sr-only">{kpis.convertedCount}</span>
                    </div>
                    <p className="text-[11px] text-[#667085] mt-1">
                        {kpis.totalMous > 0 ? `${Math.round((kpis.convertedCount / kpis.totalMous) * 100)}% conversion` : "0% conversion"}
                    </p>
                </div>
            </div>

            {/* Toolbar (Search, Refresh, Coupons, Add Manual) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[280px] sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" size={16} />
                    <input
                        type="text"
                        placeholder="Search by school, signatory, email, city, or ref..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-white border border-[#e4e7ef] rounded-[6px] text-xs outline-none focus:border-[#4f46e5] text-[#171a2f] placeholder-[#98a2b3] transition-colors"
                    />
                    {/* Clear (×) button with smooth opacity transition (§3.L) */}
                    <button
                        type="button"
                        onClick={() => setSearch("")}
                        aria-label="Clear search"
                        style={{
                            opacity: search ? 1 : 0,
                            pointerEvents: search ? "auto" : "none",
                            transition: `opacity var(--mou-dur-fast) var(--mou-ease-standard)`
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#171a2f]"
                    >
                        <X size={14} />
                    </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Refresh button with full-iteration CSS spinner (§3.K) */}
                    <button
                        type="button"
                        onClick={() => {
                            setIsRefreshing(true);
                            fetchSubmissions(false);
                        }}
                        disabled={isRefreshing}
                        title="Refresh list"
                        aria-label="Refresh pipeline list"
                        className="p-2 border border-[#e4e7ef] bg-white rounded-[6px] text-[#667085] hover:text-[#171a2f] hover:bg-[#f5f6fa] transition-colors btn-pressable disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={isRefreshing ? "refresh-spinner text-[#4f46e5]" : ""} />
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push("/super-admin/coupons")}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#e4e7ef] bg-white rounded-[6px] text-xs font-medium text-[#171a2f] hover:bg-[#f5f6fa] transition-colors btn-pressable"
                    >
                        <Tag size={13} className="text-[#667085]" />
                        <span>MOU Coupons</span>
                    </button>

                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-[6px] text-xs font-semibold transition-colors btn-pressable"
                    >
                        <Plus size={14} />
                        <span>Add Manual MOU</span>
                    </button>
                </div>
            </div>

            {/* Status Filter Tabs with Sliding Indicator (§3.D & §4.3) */}
            <div className="flex items-center justify-between border-b border-[#e4e7ef] overflow-x-auto">
                <div
                    ref={tabsContainerRef}
                    data-ready={tabsReady}
                    className="tabs-nav flex items-center gap-6 relative"
                >
                    {STATUS_TABS.map((tab) => {
                        const isActive = statusFilter === tab.key;
                        const count = statusCounts[tab.key] ?? 0;
                        return (
                            <button
                                key={tab.key}
                                ref={(el) => (tabButtonsRef.current[tab.key] = el)}
                                type="button"
                                onClick={() => {
                                    setStatusFilter(tab.key);
                                    setPage(1);
                                }}
                                className={`pb-2.5 text-xs font-medium transition-colors duration-120 whitespace-nowrap relative ${
                                    isActive ? "text-[#171a2f] font-semibold" : "text-[#667085] hover:text-[#171a2f]"
                                }`}
                            >
                                {tab.label}
                                <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full transition-colors duration-120 ${
                                    isActive ? "bg-indigo-50 text-[#4f46e5]" : "bg-slate-100 text-[#667085]"
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}

                    {/* Single sliding indicator bar */}
                    <div
                        className="tab-indicator"
                        style={{
                            transform: `translateX(${tabIndicatorStyle.x}px) scaleX(${tabIndicatorStyle.w})`,
                            width: 1
                        }}
                    />
                </div>

                {/* "Clear filters" text button with slide and fade (§3.L) */}
                <div
                    style={{
                        opacity: statusFilter !== "all" || search ? 1 : 0,
                        transform: statusFilter !== "all" || search ? "none" : "translateX(4px)",
                        pointerEvents: statusFilter !== "all" || search ? "auto" : "none",
                        transition: `opacity var(--mou-dur-base) var(--mou-ease-standard), transform var(--mou-dur-base) var(--mou-ease-standard)`
                    }}
                >
                    <button
                        type="button"
                        onClick={() => {
                            setSearch("");
                            setStatusFilter("all");
                            setPage(1);
                        }}
                        className="text-xs text-[#4f46e5] hover:underline whitespace-nowrap pb-2.5"
                    >
                        Clear filters
                    </button>
                </div>
            </div>

            {/* Framed Table Container (1px border, 6px radius, no shadow) */}
            <div className="border border-[#e4e7ef] rounded-[6px] bg-white overflow-hidden">
                {/* Desktop & Tablet Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse" aria-busy={isSlowLoading}>
                        <thead>
                            <tr className="bg-[#fafbfd] border-b border-[#e4e7ef] text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                                <th
                                    className="py-3 px-4 cursor-pointer select-none group"
                                    onClick={() => toggleSort("schoolName")}
                                >
                                    <div className="flex items-center gap-1">
                                        <span>MOU</span>
                                        <ArrowUpDown size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </th>
                                <th className="py-3 px-4">Signatory</th>
                                <th
                                    className="py-3 px-4 cursor-pointer select-none group"
                                    onClick={() => toggleSort("studentCount")}
                                >
                                    <div className="flex items-center gap-1">
                                        <span>Students &amp; Plan</span>
                                        <ArrowUpDown size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </th>
                                <th
                                    className="py-3 px-4 text-right cursor-pointer select-none group"
                                    onClick={() => toggleSort("totalPrice")}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        <span>Value</span>
                                        <ArrowUpDown size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </th>
                                <th className="py-3 px-4 hidden lg:table-cell">Activity</th>
                                <th className="py-3 px-4 text-right">Status &amp; Actions</th>
                            </tr>
                        </thead>

                        <tbody className={`divide-y divide-[#e4e7ef] text-xs text-[#171a2f] ${isSlowLoading ? "table-body-dim" : "table-body-normal"}`}>
                            {loading ? (
                                // Synchronised Skeleton Pulse Container (§3.F & §4.5)
                                <tr>
                                    <td colSpan="6" className="p-6">
                                        <div className="skeleton-container space-y-3">
                                            {[1, 2, 3, 4].map((n) => (
                                                <div key={n} className="h-10 bg-[#f5f6fa] border border-[#e4e7ef] rounded-[6px]" />
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedMous.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-[#667085]">
                                        No MOUs recorded matching the current filter.
                                    </td>
                                </tr>
                            ) : (
                                paginatedMous.map((mou) => {
                                    const isExpanded = expandedRows.has(mou._id);
                                    const isFlashing = flashingRefId === mou.refId;
                                    const latestActivity = mou.activities?.[0];

                                    return (
                                        <Fragment key={mou._id}>
                                            <tr
                                                id={`row-${mou._id}`}
                                                data-flash={isFlashing}
                                                className={`transition-colors duration-120 relative ${
                                                    isExpanded ? "bg-[#fafbfd]" : "hover:bg-[#fafbfd]"
                                                }`}
                                            >
                                                {/* MOU column with 2px accent bar */}
                                                <td className="py-3 px-4 align-top relative">
                                                    <div
                                                        className="row-accent-bar absolute left-0 top-0 bottom-0 w-[2px] bg-[#4f46e5]"
                                                        data-active={isExpanded}
                                                    />
                                                    <p className="font-mono text-[11px] font-semibold text-[#4f46e5] uppercase">
                                                        {mou.refId || "—"}
                                                    </p>
                                                    <p className="font-semibold text-sm text-[#171a2f] mt-0.5">
                                                        {mou.schoolName}
                                                    </p>
                                                    <p className="text-[11px] text-[#667085] flex items-center gap-1 mt-0.5">
                                                        <MapPin size={11} className="shrink-0" />
                                                        <span>{mou.city || "—"}</span>
                                                    </p>
                                                </td>

                                                {/* Signatory column */}
                                                <td className="py-3 px-4 align-top">
                                                    <p className="font-medium text-xs text-[#171a2f]">
                                                        {mou.principalName}
                                                    </p>
                                                    <p className="text-[11px] text-[#667085]">
                                                        {mou.designation || "Principal"}
                                                    </p>
                                                    <p className="text-[11px] text-[#667085] mt-1 flex items-center gap-1">
                                                        <Mail size={11} className="shrink-0" />
                                                        <span className="truncate max-w-[170px]">{mou.contactEmail}</span>
                                                    </p>
                                                    {mou.contactPhone && (
                                                        <p className="text-[11px] text-[#667085] flex items-center gap-1">
                                                            <Phone size={11} className="shrink-0" />
                                                            <span>{mou.contactPhone}</span>
                                                        </p>
                                                    )}
                                                </td>

                                                {/* Students & Plan column */}
                                                <td className="py-3 px-4 align-top">
                                                    <p className="font-semibold text-xs tabular-nums text-[#171a2f]">
                                                        {(mou.studentCount || 0).toLocaleString("en-IN")} students
                                                    </p>
                                                    <p className="text-[11px] text-[#667085] mt-0.5">
                                                        {mou.planType === "plus"
                                                            ? "Plus Plan (₹69)"
                                                            : mou.planType === "custom"
                                                            ? `Custom (₹${mou.perStudentRate || 59})`
                                                            : "Standard Plan (₹59)"}
                                                    </p>
                                                    <p className="text-[11px] text-[#667085]">
                                                        {mou.mouDuration || 1} {mou.mouDuration === 1 ? "year" : "years"}
                                                        {mou.instituteType !== "school" && (
                                                            <span className="ml-1 text-[10px] text-indigo-600 font-medium">
                                                                • {mou.instituteType === "college_degree" ? "Degree" : "PU"}
                                                            </span>
                                                        )}
                                                    </p>
                                                </td>

                                                {/* Value column */}
                                                <td className="py-3 px-4 align-top text-right tabular-nums">
                                                    <p className="font-bold text-xs text-[#171a2f]">
                                                        {formatCurrency(mou.totalPrice)}
                                                    </p>
                                                    <p className="text-[11px] text-[#047857] font-medium mt-0.5">
                                                        Upfront: {formatCurrency(mou.upfrontPrice)}
                                                    </p>
                                                    <p className="text-[10px] text-[#667085]">
                                                        ₹{mou.perStudentRate || 59}/student
                                                    </p>
                                                </td>

                                                {/* Activity column */}
                                                <td className="py-3 px-4 align-top hidden lg:table-cell">
                                                    {latestActivity ? (
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                {latestActivity.action === "print" ? (
                                                                    <Printer size={13} className="text-[#667085]" />
                                                                ) : latestActivity.action === "download_pdf" ? (
                                                                    <Download size={13} className="text-[#667085]" />
                                                                ) : (
                                                                    <FileSignature size={13} className="text-[#667085]" />
                                                                )}
                                                                <span className="font-medium text-xs text-[#171a2f]">
                                                                    {latestActivity.action === "print"
                                                                        ? "Printed"
                                                                        : latestActivity.action === "download_pdf"
                                                                        ? "PDF Saved"
                                                                        : "Manual Entry"}
                                                                </span>
                                                            </div>
                                                            <p
                                                                className="text-[11px] text-[#667085] mt-0.5 cursor-help"
                                                                title={formatIST(latestActivity.createdAt)}
                                                            >
                                                                {formatRelativeTime(latestActivity.createdAt)}
                                                            </p>
                                                            {mou.activityCount > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleRow(mou._id, mou.notes)}
                                                                    className="inline-block mt-1 text-[10px] text-[#667085] hover:text-[#4f46e5] bg-[#f5f6fa] border border-[#e4e7ef] px-1.5 py-0.5 rounded-[4px] transition-colors"
                                                                >
                                                                    +{mou.activityCount - 1} more
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[#667085]">—</span>
                                                    )}
                                                </td>

                                                {/* Status & Actions column */}
                                                <td className="py-3 px-4 align-top text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {/* Accessible Desktop Listbox with Mobile native fallback (§3.B) */}
                                                        <StatusListbox
                                                            value={mou.status}
                                                            onChange={(newStatus) => handleUpdateStatus(mou, newStatus)}
                                                        />

                                                        <button
                                                            type="button"
                                                            disabled={downloadingId === mou._id}
                                                            onClick={() => handleDownloadMOU(mou)}
                                                            title={downloadingId === mou._id ? "Generating PDF..." : "Download Official MOU PDF"}
                                                            className={`p-1.5 border rounded-[6px] transition-all btn-pressable ${
                                                                downloadingId === mou._id
                                                                    ? "border-indigo-300 bg-indigo-50/70 text-[#4f46e5] cursor-wait"
                                                                    : "border-[#e4e7ef] hover:border-[#4f46e5] text-[#667085] hover:text-[#4f46e5] bg-white"
                                                            }`}
                                                        >
                                                            {downloadingId === mou._id ? (
                                                                <Loader2 size={13} className="animate-spin text-[#4f46e5]" />
                                                            ) : (
                                                                <Download size={13} />
                                                            )}
                                                        </button>

                                                        {/* Fixed slot for Receipt button to prevent layout jumps (§3.J) */}
                                                        <div className="w-[28px] h-[28px] flex items-center justify-center">
                                                            {mou.status === "converted" && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => window.open(`/admin/mou-tracker/receipt/${mou._id}`, "_blank")}
                                                                    title="View Commercial Receipt"
                                                                    style={{
                                                                        animation: `fadeIn var(--mou-dur-fast) var(--mou-ease-standard)`
                                                                    }}
                                                                    className="p-1.5 border border-[#e4e7ef] hover:border-[#4f46e5] text-[#4f46e5] rounded-[6px] transition-colors btn-pressable"
                                                                >
                                                                    <FileText size={13} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(mou)}
                                                            title="Edit MOU"
                                                            className="p-1.5 border border-[#e4e7ef] hover:border-[#171a2f] text-[#667085] hover:text-[#171a2f] rounded-[6px] transition-colors btn-pressable"
                                                        >
                                                            <Pencil size={13} />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => setDeleteTarget(mou)}
                                                            title="Delete MOU"
                                                            className="p-1.5 border border-[#e4e7ef] hover:border-[#b42318] text-[#667085] hover:text-[#b42318] rounded-[6px] transition-colors btn-pressable"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>

                                                        <button
                                                            ref={(el) => (triggerButtonsRef.current[mou._id] = el)}
                                                            type="button"
                                                            aria-expanded={isExpanded}
                                                            aria-controls={`panel-${mou._id}`}
                                                            onClick={() => toggleRow(mou._id, mou.notes)}
                                                            title={isExpanded ? "Collapse details" : "Expand details"}
                                                            className="p-1.5 border border-[#e4e7ef] text-[#667085] hover:text-[#171a2f] rounded-[6px] transition-colors btn-pressable"
                                                        >
                                                            <ChevronDown
                                                                size={13}
                                                                data-expanded={isExpanded}
                                                                className="chevron-icon"
                                                            />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Row Detail Panel — Grid-rows CSS expand technique (§4.1) */}
                                            <tr className="border-b border-[#e4e7ef]">
                                                <td colSpan="6" className="p-0 border-0">
                                                    <div
                                                        id={`panel-${mou._id}`}
                                                        className="row-detail-container"
                                                        data-state={isExpanded ? "open" : "closed"}
                                                    >
                                                        <div className="row-detail-inner bg-[#fafbfd]">
                                                            <div className="row-detail-content p-5">
                                                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                                                    {/* Left: 60% (3 cols) Facts, Notes, Payments */}
                                                                    <div className="lg:col-span-3 space-y-4">
                                                                        <div className="bg-white border border-[#e4e7ef] rounded-[6px] p-4 space-y-3 text-xs">
                                                                            <div className="flex items-center justify-between">
                                                                                <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                                                                                    Institute &amp; Agreement Details
                                                                                </p>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => copyToClipboard(mou.refId, `ref-${mou._id}`)}
                                                                                    title="Copy Reference ID"
                                                                                    className="inline-flex items-center gap-1 text-[11px] text-[#667085] hover:text-[#171a2f] transition-colors"
                                                                                >
                                                                                    {copiedKey === `ref-${mou._id}` ? (
                                                                                        <>
                                                                                            <Check size={11} className="text-emerald-600" />
                                                                                            <span className="text-emerald-600 font-medium">Copied</span>
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <Copy size={11} />
                                                                                            <span>Copy Ref</span>
                                                                                        </>
                                                                                    )}
                                                                                </button>
                                                                            </div>

                                                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                                                <div>
                                                                                    <span className="text-[#667085] block text-[11px]">UDISE Code:</span>
                                                                                    <span className="font-mono text-[#171a2f]">{mou.udiseCode || "—"}</span>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-[#667085] block text-[11px]">Institute Type:</span>
                                                                                    <span className="text-[#171a2f] font-medium">
                                                                                        {mou.instituteType === "college_degree"
                                                                                            ? "Degree College (3 Yrs)"
                                                                                            : mou.instituteType === "college_pu"
                                                                                            ? "PU / Diploma (2 Yrs)"
                                                                                            : "School / Jr. College"}
                                                                                    </span>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-[#667085] block text-[11px]">Duration:</span>
                                                                                    <span className="text-[#171a2f] font-medium">{mou.mouDuration || 1} Year(s)</span>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-[#667085] block text-[11px]">Promo / Coupon:</span>
                                                                                    <span className="font-mono text-[#171a2f]">{mou.coupon || "None"}</span>
                                                                                </div>
                                                                            </div>

                                                                            {mou.address && (
                                                                                <div className="pt-2 border-t border-[#e4e7ef]">
                                                                                    <span className="text-[#667085] block text-[11px]">Address:</span>
                                                                                    <span className="text-[#171a2f] leading-relaxed">{mou.address}</span>
                                                                                </div>
                                                                            )}

                                                                            {mou.yearWiseCounts && (mou.yearWiseCounts.yr1 > 0 || mou.yearWiseCounts.yr2 > 0 || mou.yearWiseCounts.yr3 > 0) && (
                                                                                <div className="pt-2 border-t border-[#e4e7ef] space-y-1">
                                                                                    <span className="text-[#667085] block text-[11px]">Student ID Card Breakdown:</span>
                                                                                    <div className="text-[11px] text-[#171a2f] space-y-0.5">
                                                                                        <p>1st Year: {(mou.yearWiseCounts.yr1 || 0).toLocaleString("en-IN")} students @ ₹59</p>
                                                                                        <p>2nd Year: {(mou.yearWiseCounts.yr2 || 0).toLocaleString("en-IN")} students @ ₹{mou.coupon ? "20" : "30"}</p>
                                                                                        {mou.instituteType === "college_degree" && (
                                                                                            <p>3rd Year: {(mou.yearWiseCounts.yr3 || 0).toLocaleString("en-IN")} students @ ₹{mou.coupon ? "20" : "30"}</p>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Lead Notes */}
                                                                        <div className="bg-white border border-[#e4e7ef] rounded-[6px] p-4 space-y-2">
                                                                            <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                                                                                Internal Lead Notes
                                                                            </p>
                                                                            <textarea
                                                                                value={notesText[mou._id] ?? mou.notes ?? ""}
                                                                                onChange={(e) => setNotesText(prev => ({ ...prev, [mou._id]: e.target.value }))}
                                                                                rows={2}
                                                                                placeholder="Add comments, follow-up timeline, or next steps..."
                                                                                className="w-full p-2.5 bg-[#fafbfd] border border-[#e4e7ef] rounded-[6px] text-xs text-[#171a2f] outline-none focus:border-[#4f46e5] resize-none transition-colors"
                                                                            />
                                                                            <div className="flex justify-end">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleSaveNotes(mou._id)}
                                                                                    disabled={savingNotes[mou._id]}
                                                                                    className="px-3 py-1.5 bg-[#171a2f] hover:bg-black text-white rounded-[6px] text-xs font-medium transition-colors btn-pressable disabled:opacity-50"
                                                                                >
                                                                                    {savingNotes[mou._id] ? "Saving..." : "Save Notes"}
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Payments Ledger if Converted */}
                                                                        {mou.status === "converted" && (
                                                                            <div className="bg-white border border-[#e4e7ef] rounded-[6px] p-4 space-y-3">
                                                                                <div className="flex items-center justify-between">
                                                                                    <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider flex items-center gap-1.5">
                                                                                        <Landmark size={13} className="text-[#4f46e5]" /> Payment Collections ({(mou.payments || []).length})
                                                                                    </p>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => openPaymentModal(mou)}
                                                                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-[6px] text-[11px] font-medium transition-colors btn-pressable"
                                                                                    >
                                                                                        <Plus size={12} /> Record Payment
                                                                                    </button>
                                                                                </div>

                                                                                {(!mou.payments || mou.payments.length === 0) ? (
                                                                                    <p className="text-xs text-[#667085] py-2">No payments logged yet.</p>
                                                                                ) : (
                                                                                    <div className="overflow-x-auto">
                                                                                        <table className="w-full text-xs text-left border-collapse">
                                                                                            <thead>
                                                                                                <tr className="border-b border-[#e4e7ef] text-[11px] text-[#667085]">
                                                                                                    <th className="pb-1.5">Date</th>
                                                                                                    <th className="pb-1.5">Method</th>
                                                                                                    <th className="pb-1.5">Reference</th>
                                                                                                    <th className="pb-1.5 text-right">Amount</th>
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody className="divide-y divide-slate-100 text-xs">
                                                                                                {mou.payments.map((p, idx) => (
                                                                                                    <tr key={p._id || idx}>
                                                                                                        <td className="py-1.5 text-[#667085]">{new Date(p.paidDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                                                                                                        <td className="py-1.5 font-medium uppercase text-[11px]">{p.paymentMethod}</td>
                                                                                                        <td className="py-1.5 font-mono text-[10px] text-[#667085]">{p.referenceId || "—"}</td>
                                                                                                        <td className="py-1.5 text-right font-semibold text-[#171a2f]">{formatCurrency(p.amount)}</td>
                                                                                                    </tr>
                                                                                                ))}
                                                                                            </tbody>
                                                                                        </table>
                                                                                    </div>
                                                                                )}

                                                                                <div className="pt-2 border-t border-[#e4e7ef] flex items-center justify-between text-xs font-semibold">
                                                                                    <span className="text-[#667085]">Remaining Balance:</span>
                                                                                    <span className="font-mono text-[#4f46e5]">
                                                                                        {formatCurrency(Math.max(0, (mou.totalPrice || 0) - ((mou.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0))))}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Right: 40% (2 cols) Signature & Activity Timeline */}
                                                                    <div className="lg:col-span-2 space-y-4">
                                                                        <div className="bg-white border border-[#e4e7ef] rounded-[6px] p-4">
                                                                            <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider mb-2">
                                                                                Digital Signature
                                                                            </p>
                                                                            {mou.signatureDataUrl ? (
                                                                                <div className="bg-white border border-[#e4e7ef] rounded-[4px] p-2 flex items-center justify-center max-h-28 overflow-hidden">
                                                                                    <img
                                                                                        src={mou.signatureDataUrl}
                                                                                        alt="Digital Signature"
                                                                                        className="max-h-24 max-w-full object-contain"
                                                                                    />
                                                                                </div>
                                                                            ) : (
                                                                                <p className="text-xs text-[#667085] italic py-4 text-center">
                                                                                    No digital signature captured.
                                                                                </p>
                                                                            )}
                                                                        </div>

                                                                        <div className="bg-white border border-[#e4e7ef] rounded-[6px] p-4 space-y-3">
                                                                            <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                                                                                Activity History ({mou.activities?.length || 0})
                                                                            </p>

                                                                            <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-[#e4e7ef]">
                                                                                {mou.activities?.map((act, actIdx) => (
                                                                                    <div key={act.id || actIdx} className="relative text-xs">
                                                                                        <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-[#4f46e5] border-2 border-white shadow-sm" />
                                                                                        <div className="flex items-center justify-between gap-2">
                                                                                            <span className="font-semibold text-xs text-[#171a2f]">
                                                                                                {act.action === "print"
                                                                                                    ? "Printed MOU"
                                                                                                    : act.action === "download_pdf"
                                                                                                    ? "Downloaded PDF"
                                                                                                    : "Manual Entry"}
                                                                                            </span>
                                                                                            <span
                                                                                                className="text-[11px] text-[#667085] cursor-help"
                                                                                                title={formatIST(act.createdAt)}
                                                                                            >
                                                                                                {formatRelativeTime(act.createdAt)}
                                                                                            </span>
                                                                                        </div>
                                                                                        {act.metadata?.ip && (
                                                                                            <p className="text-[10px] text-[#667085] mt-0.5">
                                                                                                IP: {act.metadata.ip}
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>

                                                                            <div className="pt-2 border-t border-[#e4e7ef]">
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={downloadingId === mou._id}
                                                                                    onClick={() => handleDownloadMOU(mou)}
                                                                                    className={`w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 border text-xs font-semibold rounded-[6px] transition-all shadow-xs btn-pressable ${
                                                                                        downloadingId === mou._id
                                                                                            ? "border-indigo-300 bg-indigo-50 text-[#4f46e5] cursor-wait"
                                                                                            : "border-[#e4e7ef] hover:border-[#4f46e5] text-[#171a2f] hover:text-[#4f46e5] bg-white hover:bg-[#fafbfd]"
                                                                                    }`}
                                                                                >
                                                                                    {downloadingId === mou._id ? (
                                                                                        <>
                                                                                            <Loader2 size={13} className="animate-spin text-[#4f46e5]" />
                                                                                            <span>Generating Official PDF...</span>
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <Download size={13} className="text-[#4f46e5]" />
                                                                                            <span>Download Official MOU PDF</span>
                                                                                        </>
                                                                                    )}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile List View (<768px) */}
                <div className="block md:hidden divide-y divide-[#e4e7ef]">
                    {loading ? (
                        <div className="p-8 text-center text-xs text-[#667085]">
                            Loading pipeline submissions...
                        </div>
                    ) : paginatedMous.length === 0 ? (
                        <div className="p-8 text-center text-xs text-[#667085]">
                            No MOUs recorded matching the current filter.
                        </div>
                    ) : (
                        paginatedMous.map((mou) => {
                            const isExpanded = expandedRows.has(mou._id);
                            const latestActivity = mou.activities?.[0];

                            return (
                                <div
                                    key={mou._id}
                                    id={`mobile-row-${mou._id}`}
                                    className="p-4 space-y-2 mobile-card"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-[11px] font-semibold text-[#4f46e5] uppercase">
                                            {mou.refId || "—"}
                                        </span>
                                        <StatusListbox
                                            value={mou.status}
                                            onChange={(newStatus) => handleUpdateStatus(mou, newStatus)}
                                        />
                                    </div>

                                    <div>
                                        <p className="font-semibold text-sm text-[#171a2f]">{mou.schoolName}</p>
                                        <p className="text-xs text-[#667085]">{mou.principalName} • {mou.city || "—"}</p>
                                    </div>

                                    <div className="flex items-center justify-between text-xs pt-1">
                                        <span className="tabular-nums text-[#667085]">
                                            {(mou.studentCount || 0).toLocaleString("en-IN")} students
                                        </span>
                                        <span className="font-bold text-sm text-[#171a2f] tabular-nums">
                                            {formatCurrency(mou.totalPrice)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                        <span className="text-[11px] text-[#667085]">
                                            {latestActivity ? `${latestActivity.action === "print" ? "Printed" : "PDF"} ${formatRelativeTime(latestActivity.createdAt)}` : "—"}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                disabled={downloadingId === mou._id}
                                                onClick={() => handleDownloadMOU(mou)}
                                                title={downloadingId === mou._id ? "Generating PDF..." : "Download MOU PDF"}
                                                className={`p-2 border rounded-[6px] transition-all ${
                                                    downloadingId === mou._id
                                                        ? "border-indigo-300 bg-indigo-50 text-[#4f46e5] cursor-wait"
                                                        : "border-[#e4e7ef] text-[#667085] hover:text-[#4f46e5] bg-white"
                                                }`}
                                            >
                                                {downloadingId === mou._id ? (
                                                    <Loader2 size={13} className="animate-spin text-[#4f46e5]" />
                                                ) : (
                                                    <Download size={13} />
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(mou)}
                                                className="p-2 border border-[#e4e7ef] text-[#667085] rounded-[6px]"
                                            >
                                                <Pencil size={13} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDeleteTarget(mou)}
                                                className="p-2 border border-[#e4e7ef] text-rose-600 rounded-[6px]"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => toggleRow(mou._id, mou.notes)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#e4e7ef] text-xs font-medium text-[#171a2f] rounded-[6px]"
                                            >
                                                {isExpanded ? "Hide" : "Details"}
                                                <ChevronDown size={12} className={`transition-transform duration-180 ${isExpanded ? "rotate-180" : ""}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Mobile Expanded panel with grid-rows technique */}
                                    <div className="row-detail-container" data-state={isExpanded ? "open" : "closed"}>
                                        <div className="row-detail-inner">
                                            <div className="row-detail-content pt-3 border-t border-[#e4e7ef] space-y-3 text-xs">
                                                <div className="bg-[#fafbfd] p-3 rounded-[6px] space-y-1.5">
                                                    <p><span className="text-[#667085]">Email:</span> {mou.contactEmail}</p>
                                                    {mou.contactPhone && <p><span className="text-[#667085]">Phone:</span> {mou.contactPhone}</p>}
                                                    <p><span className="text-[#667085]">Plan:</span> {mou.planType} ({mou.mouDuration || 1} yr)</p>
                                                    <p><span className="text-[#667085]">Upfront:</span> {formatCurrency(mou.upfrontPrice)}</p>
                                                </div>
                                                {mou.status === "converted" && (
                                                    <button
                                                        type="button"
                                                        onClick={() => window.open(`/admin/mou-tracker/receipt/${mou._id}`, "_blank")}
                                                        className="w-full py-2 bg-[#171a2f] text-white rounded-[6px] text-xs font-medium"
                                                    >
                                                        View Receipt
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Pagination Footer */}
                <div className="flex items-center justify-between p-3 sm:px-4 border-t border-[#e4e7ef] bg-[#fafbfd] text-xs">
                    <p className="text-[#667085]">
                        Showing {showingStart}–{showingEnd} of {filteredMous.length} MOUs
                    </p>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            disabled={currentPage <= 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="px-2.5 py-1 border border-[#e4e7ef] bg-white rounded-[6px] text-xs font-medium text-[#171a2f] hover:bg-[#f5f6fa] disabled:opacity-40 transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-[#667085] px-1 text-[11px]">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={currentPage >= totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className="px-2.5 py-1 border border-[#e4e7ef] bg-white rounded-[6px] text-xs font-medium text-[#171a2f] hover:bg-[#f5f6fa] disabled:opacity-40 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* PORTALED DIALOGS & OVERLAYS (Root DOM Stacking Context) */}
            {isMounted && typeof document !== "undefined" && createPortal(
                <>
                    {/* DELETE CONFIRMATION DIALOG with AnimatePresence exit animations (§3.H) */}
                    <AnimatePresence>
                        {deleteTarget && (
                            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-0">
                                {/* Dimmed neutral backdrop with subtle blur to eliminate glare/white patches */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1, transition: { duration: MOTION_TOKENS.durBase, ease: MOTION_TOKENS.easeOut } }}
                                    exit={{ opacity: 0, transition: { duration: MOTION_TOKENS.durFast, ease: MOTION_TOKENS.easeIn } }}
                                    onClick={() => !isDeleting && setDeleteTarget(null)}
                                    className="fixed inset-0 bg-[#0f172a]/70 backdrop-blur-[2px] mou-portal-layer"
                                />

                                {/* Modal Panel: Desktop center scale/translate, Mobile bottom sheet */}
                                <motion.div
                                    role="dialog"
                                    aria-modal="true"
                                    aria-labelledby="delete-dialog-title"
                                    style={{ opacity: 0 }}
                                    initial={{
                                        opacity: 0,
                                        y: typeof window !== "undefined" && window.innerWidth < 640 ? "100%" : 8,
                                        scale: typeof window !== "undefined" && window.innerWidth < 640 ? 1 : 0.98
                                    }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        scale: 1,
                                        transition: {
                                            duration: typeof window !== "undefined" && window.innerWidth < 640 ? MOTION_TOKENS.durSheet : MOTION_TOKENS.durSlow,
                                            ease: MOTION_TOKENS.easeOut
                                        }
                                    }}
                                    exit={{
                                        opacity: 0,
                                        y: typeof window !== "undefined" && window.innerWidth < 640 ? "100%" : 0,
                                        transition: {
                                            duration: MOTION_TOKENS.durFast,
                                            ease: MOTION_TOKENS.easeIn
                                        }
                                    }}
                                    className="relative z-10 bg-white rounded-[14px] p-6 max-w-md w-full shadow-2xl border border-[#e4e7ef] space-y-4 mou-portal-layer"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-rose-50 text-[#b42318] rounded-[6px] shrink-0">
                                            <Trash2 size={18} />
                                        </div>
                                        <div>
                                            <h3 id="delete-dialog-title" className="text-sm font-bold text-[#171a2f]">
                                                Delete MOU &amp; Activity Records
                                            </h3>
                                            <p className="text-xs text-[#667085] mt-1 leading-relaxed">
                                                Are you sure you want to permanently delete <strong className="text-[#171a2f]">{deleteTarget.schoolName}</strong> ({deleteTarget.refId})?
                                            </p>
                                            <p className="text-xs text-[#b42318] font-medium mt-2 bg-rose-50 border border-rose-200/60 p-2.5 rounded-[6px]">
                                                This will remove all {deleteTarget.activityCount} activity record(s) associated with this MOU from the database.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-2">
                                        <button
                                            type="button"
                                            disabled={isDeleting}
                                            onClick={() => setDeleteTarget(null)}
                                            className="px-3 py-1.5 border border-[#e4e7ef] bg-white hover:bg-[#f5f6fa] text-[#171a2f] rounded-[6px] text-xs font-medium transition-colors btn-pressable"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isDeleting}
                                            onClick={handleDeleteGroupedMou}
                                            className="min-w-[90px] px-3.5 py-1.5 bg-[#b42318] hover:bg-rose-800 text-white rounded-[6px] text-xs font-semibold transition-colors btn-pressable disabled:opacity-50"
                                        >
                                            {isDeleting ? "Deleting..." : "Delete MOU"}
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* MANUAL MOU ENTRY / EDIT MODAL with AnimatePresence (§3.H) */}
                    <AnimatePresence>
                        {isFormModalOpen && (
                            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-0">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1, transition: { duration: MOTION_TOKENS.durBase, ease: MOTION_TOKENS.easeOut } }}
                                    exit={{ opacity: 0, transition: { duration: MOTION_TOKENS.durFast, ease: MOTION_TOKENS.easeIn } }}
                                    onClick={() => !isSavingForm && setIsFormModalOpen(false)}
                                    className="fixed inset-0 bg-[#0f172a]/70 backdrop-blur-[2px] mou-portal-layer"
                                />

                                <motion.div
                                    role="dialog"
                                    aria-modal="true"
                                    aria-labelledby="mou-form-dialog-title"
                                    style={{ opacity: 0 }}
                                    initial={{
                                        opacity: 0,
                                        y: typeof window !== "undefined" && window.innerWidth < 640 ? "100%" : 8,
                                        scale: typeof window !== "undefined" && window.innerWidth < 640 ? 1 : 0.98
                                    }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        scale: 1,
                                        transition: {
                                            duration: typeof window !== "undefined" && window.innerWidth < 640 ? MOTION_TOKENS.durSheet : MOTION_TOKENS.durSlow,
                                            ease: MOTION_TOKENS.easeOut
                                        }
                                    }}
                            exit={{
                                opacity: 0,
                                y: typeof window !== "undefined" && window.innerWidth < 640 ? "100%" : 0,
                                transition: {
                                    duration: MOTION_TOKENS.durFast,
                                    ease: MOTION_TOKENS.easeIn
                                }
                            }}
                            className="relative z-10 bg-white rounded-[14px] max-w-2xl w-full shadow-2xl border border-[#e4e7ef] max-h-[90vh] flex flex-col overflow-hidden mou-portal-layer"
                        >
                            <form onSubmit={handleSaveMOUForm} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                                {/* Fixed Modal Header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e4e7ef] bg-white shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-[8px] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4f46e5] shrink-0">
                                            <Building2 size={18} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 id="mou-form-dialog-title" className="text-sm font-bold text-[#171a2f]">
                                                    {editingMOU ? "Edit MOU Submission" : "Add Manual MOU Record"}
                                                </h3>
                                                {editingMOU?.refId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(editingMOU.refId, "modal-ref")}
                                                        title="Click to copy Ref ID"
                                                        className="inline-flex items-center gap-1 font-mono text-[10px] bg-slate-100 hover:bg-slate-200 text-[#475467] px-2 py-0.5 rounded-[4px] font-semibold transition-colors"
                                                    >
                                                        {copiedKey === "modal-ref" ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
                                                        {editingMOU.refId}
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-xs text-[#667085] mt-0.5">
                                                {editingMOU
                                                    ? "Update institutional parameters, pricing, duration, and pipeline status."
                                                    : "Record an offline agreement or handle manual institutional entry."}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsFormModalOpen(false)}
                                        aria-label="Close dialog"
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#667085] hover:text-[#171a2f] hover:bg-slate-100 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Scrollable Form Body */}
                                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs">
                                {formError && (
                                    <div className="bg-rose-50 text-[#b42318] p-3 rounded-[8px] text-xs border border-rose-200 font-medium">
                                        {formError}
                                    </div>
                                )}

                                {/* SECTION 1: INSTITUTION & CONTACT DETAILS */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-[#475467] uppercase tracking-wider">
                                            Institution &amp; Contact Details
                                        </span>
                                    </div>

                                    {/* Segmented Type Selector */}
                                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-[8px] border border-slate-200/80">
                                        {[
                                            { value: "school", label: "School", icon: School },
                                            { value: "college_degree", label: "Degree College (3 Yrs)", icon: GraduationCap },
                                            { value: "college_pu", label: "PU / Diploma (2 Yrs)", icon: Building2 }
                                        ].map(opt => {
                                            const isSelected = mouFormData.instituteType === opt.value;
                                            const Icon = opt.icon;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setMouFormData({ ...mouFormData, instituteType: opt.value })}
                                                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[6px] text-xs font-semibold transition-all duration-120 select-none ${
                                                        isSelected
                                                            ? "bg-white text-[#4f46e5] shadow-xs border border-indigo-100 font-bold"
                                                            : "text-[#667085] hover:text-[#171a2f]"
                                                    }`}
                                                >
                                                    <Icon size={13} className={isSelected ? "text-[#4f46e5]" : "text-[#667085]"} />
                                                    <span className="truncate">{opt.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-[#475467] mb-1">
                                                School / Institute Name <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    required
                                                    value={mouFormData.schoolName}
                                                    onChange={(e) => setMouFormData({ ...mouFormData, schoolName: e.target.value })}
                                                    placeholder="e.g. Cambridge High School"
                                                    className="w-full pl-8 pr-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-[#e4e7ef] rounded-[6px] text-xs outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]/20 text-[#171a2f] transition-colors"
                                                />
                                                <Building2 size={13} className="absolute left-2.5 top-2.5 text-[#98a2b3] pointer-events-none" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-[#475467] mb-1">
                                                City / Location <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    required
                                                    value={mouFormData.city}
                                                    onChange={(e) => setMouFormData({ ...mouFormData, city: e.target.value })}
                                                    placeholder="e.g. Mumbai, Maharashtra"
                                                    className="w-full pl-8 pr-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-[#e4e7ef] rounded-[6px] text-xs outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]/20 text-[#171a2f] transition-colors"
                                                />
                                                <MapPin size={13} className="absolute left-2.5 top-2.5 text-[#98a2b3] pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-[#475467] mb-1">
                                                Signatory Name <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    required
                                                    value={mouFormData.principalName}
                                                    onChange={(e) => setMouFormData({ ...mouFormData, principalName: e.target.value })}
                                                    placeholder="e.g. Dr. R. K. Sharma"
                                                    className="w-full pl-8 pr-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-[#e4e7ef] rounded-[6px] text-xs outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]/20 text-[#171a2f] transition-colors"
                                                />
                                                <User size={13} className="absolute left-2.5 top-2.5 text-[#98a2b3] pointer-events-none" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-[#475467] mb-1">
                                                Designation
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={mouFormData.designation}
                                                    onChange={(e) => setMouFormData({ ...mouFormData, designation: e.target.value })}
                                                    placeholder="Principal / Director"
                                                    className="w-full pl-8 pr-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-[#e4e7ef] rounded-[6px] text-xs outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]/20 text-[#171a2f] transition-colors"
                                                />
                                                <FileSignature size={13} className="absolute left-2.5 top-2.5 text-[#98a2b3] pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-[#475467] mb-1">
                                                Contact Email <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="email"
                                                    required
                                                    value={mouFormData.contactEmail}
                                                    onChange={(e) => setMouFormData({ ...mouFormData, contactEmail: e.target.value })}
                                                    placeholder="principal@school.edu.in"
                                                    className="w-full pl-8 pr-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-[#e4e7ef] rounded-[6px] text-xs outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]/20 text-[#171a2f] transition-colors"
                                                />
                                                <Mail size={13} className="absolute left-2.5 top-2.5 text-[#98a2b3] pointer-events-none" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-[#475467] mb-1">
                                                Contact Phone
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="tel"
                                                    value={mouFormData.contactPhone}
                                                    onChange={(e) => setMouFormData({ ...mouFormData, contactPhone: e.target.value })}
                                                    placeholder="9876543210"
                                                    className="w-full pl-8 pr-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-[#e4e7ef] rounded-[6px] text-xs outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]/20 text-[#171a2f] transition-colors"
                                                />
                                                <Phone size={13} className="absolute left-2.5 top-2.5 text-[#98a2b3] pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 2: COMMERCIAL TERMS & LIVE PRICING ENGINE */}
                                <div className="space-y-3 pt-2 border-t border-[#e4e7ef]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-[#475467] uppercase tracking-wider">
                                            Commercial Terms &amp; Pricing
                                        </span>
                                    </div>

                                    {mouFormData.instituteType === "school" ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#475467] mb-1">
                                                    Student Strength <span className="text-rose-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        required
                                                        value={mouFormData.studentCount}
                                                        onChange={(e) => setMouFormData({ ...mouFormData, studentCount: e.target.value })}
                                                        placeholder="450"
                                                        className="w-full pl-8 pr-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-[#e4e7ef] rounded-[6px] text-xs outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]/20 text-[#171a2f] transition-colors"
                                                    />
                                                    <Hash size={13} className="absolute left-2.5 top-2.5 text-[#98a2b3] pointer-events-none" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#475467] mb-1">
                                                    Duration
                                                </label>
                                                <select
                                                    value={mouFormData.mouDuration}
                                                    onChange={(e) => setMouFormData({ ...mouFormData, mouDuration: e.target.value })}
                                                    className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-[#e4e7ef] rounded-[6px] text-xs outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]/20 text-[#171a2f] transition-colors cursor-pointer"
                                                >
                                                    <option value="1">1 Year</option>
                                                    <option value="2">2 Years</option>
                                                    <option value="3">3 Years</option>
                                                    <option value="4">4 Years</option>
                                                    <option value="5">5 Years</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#475467] mb-1">
                                                    Plan
                                                </label>
                                                <select
                                                    value={mouFormData.planType}
                                                    onChange={(e) => setMouFormData({ ...mouFormData, planType: e.target.value })}
                                                    className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-[#e4e7ef] rounded-[6px] text-xs outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]/20 text-[#171a2f] transition-colors cursor-pointer"
                                                >
                                                    <option value="standard">Standard (₹59 / yr)</option>
                                                    <option value="plus">Plus (₹69 / yr)</option>
                                                    <option value="custom">Custom Rate</option>
                                                </select>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 bg-[#fafbfd] border border-[#e4e7ef] p-3 rounded-[8px]">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-[11px] font-semibold text-[#475467] uppercase">
                                                    Year-wise Student Strength
                                                </label>
                                                <span className="text-[10px] text-[#667085]">
                                                    {["SDC", "SDC20", "SDC-SPECIAL"].includes((mouFormData.coupon || "").trim().toUpperCase()) ? "SDC Special Discount Applied" : "Standard Multi-Year Rates"}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <span className="text-[10px] text-[#667085] block font-medium">1st Yr (₹59)</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={mouFormData.yr1}
                                                        onChange={(e) => setMouFormData({ ...mouFormData, yr1: e.target.value })}
                                                        placeholder="100"
                                                        className="w-full p-2 bg-white border border-[#e4e7ef] rounded-[6px] text-xs outline-none focus:border-[#4f46e5]"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-[#667085] block font-medium">
                                                        2nd Yr (₹{["SDC", "SDC20", "SDC-SPECIAL"].includes((mouFormData.coupon || "").trim().toUpperCase()) ? "20" : "30"})
                                                    </span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={mouFormData.yr2}
                                                        onChange={(e) => setMouFormData({ ...mouFormData, yr2: e.target.value })}
                                                        placeholder="100"
                                                        className="w-full p-2 bg-white border border-[#e4e7ef] rounded-[6px] text-xs outline-none focus:border-[#4f46e5]"
                                                    />
                                                </div>
                                                {mouFormData.instituteType === "college_degree" && (
                                                    <div>
                                                        <span className="text-[10px] text-[#667085] block font-medium">
                                                            3rd Yr (₹{["SDC", "SDC20", "SDC-SPECIAL"].includes((mouFormData.coupon || "").trim().toUpperCase()) ? "20" : "30"})
                                                        </span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={mouFormData.yr3}
                                                            onChange={(e) => setMouFormData({ ...mouFormData, yr3: e.target.value })}
                                                            placeholder="100"
                                                            className="w-full p-2 bg-white border border-[#e4e7ef] rounded-[6px] text-xs outline-none focus:border-[#4f46e5]"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {mouFormData.planType === "custom" && mouFormData.instituteType === "school" && (
                                        <div>
                                            <label className="block text-[11px] font-semibold text-[#475467] mb-1">
                                                Custom Rate (₹ / Student / Year) <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={mouFormData.customRate}
                                                onChange={(e) => setMouFormData({ ...mouFormData, customRate: e.target.value })}
                                                placeholder="75"
                                                className="w-full p-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-[#e4e7ef] rounded-[6px] text-xs outline-none focus:border-[#4f46e5] text-[#171a2f]"
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-[#475467] mb-1">
                                                Coupon Code (Optional)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={mouFormData.coupon}
                                                    onChange={(e) => setMouFormData({ ...mouFormData, coupon: e.target.value.toUpperCase() })}
                                                    placeholder="e.g. SDC"
                                                    className="w-full pl-8 pr-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-[#e4e7ef] rounded-[6px] text-xs uppercase outline-none focus:border-[#4f46e5] text-[#171a2f] font-mono"
                                                />
                                                <Tag size={13} className="absolute left-2.5 top-2.5 text-[#98a2b3] pointer-events-none" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-[#475467] mb-1">
                                                UDISE / AISHE Code (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={mouFormData.udiseCode}
                                                onChange={(e) => setMouFormData({ ...mouFormData, udiseCode: e.target.value })}
                                                placeholder="e.g. 27251400101"
                                                className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-[#e4e7ef] rounded-[6px] text-xs outline-none focus:border-[#4f46e5] text-[#171a2f]"
                                            />
                                        </div>
                                    </div>

                                    {/* LIVE COMMERCIAL BREAKDOWN CARD */}
                                    <div className="bg-gradient-to-br from-indigo-50/70 via-slate-50 to-indigo-50/40 border border-indigo-100 rounded-[10px] p-3.5 space-y-2">
                                        <div className="flex items-center justify-between text-[11px] font-semibold text-[#4f46e5] uppercase tracking-wider">
                                            <span className="flex items-center gap-1.5 font-bold">
                                                <Coins size={14} className="text-[#4f46e5]" />
                                                Live Commercial Calculation
                                            </span>
                                            <span className="text-[10px] bg-indigo-100/90 text-[#4338ca] px-2.5 py-0.5 rounded-full font-bold">
                                                {formLiveCalculation.advanceTierLabel}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2.5 pt-1 text-left">
                                            <div className="bg-white/95 border border-indigo-100/70 rounded-[8px] p-2.5 shadow-2xs">
                                                <span className="text-[10px] text-[#667085] block font-medium">Est. Total Contract</span>
                                                <span className="text-sm font-extrabold text-[#171a2f] block mt-0.5">
                                                    ₹{formLiveCalculation.totalPrice.toLocaleString("en-IN")}
                                                </span>
                                                <span className="text-[10px] text-[#667085] block mt-0.5">
                                                    {formLiveCalculation.count} students · {formLiveCalculation.duration} yr{formLiveCalculation.duration > 1 ? "s" : ""}
                                                </span>
                                            </div>
                                            <div className="bg-white/95 border border-indigo-100/70 rounded-[8px] p-2.5 shadow-2xs">
                                                <span className="text-[10px] text-[#667085] block font-medium">Upfront Advance Due</span>
                                                <span className="text-sm font-extrabold text-[#4f46e5] block mt-0.5">
                                                    ₹{formLiveCalculation.upfrontPrice.toLocaleString("en-IN")}
                                                </span>
                                                <span className="text-[10px] text-emerald-600 block mt-0.5 font-semibold">
                                                    {formLiveCalculation.upfrontPercent * 100}% Advance
                                                </span>
                                            </div>
                                            <div className="bg-white/95 border border-indigo-100/70 rounded-[8px] p-2.5 shadow-2xs">
                                                <span className="text-[10px] text-[#667085] block font-medium">Effective Rate</span>
                                                <span className="text-sm font-extrabold text-[#171a2f] block mt-0.5">
                                                    ₹{formLiveCalculation.rate}
                                                </span>
                                                <span className="text-[10px] text-[#667085] block mt-0.5">
                                                    /student /year
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 3: PIPELINE STATUS & INTERNAL NOTES */}
                                <div className="space-y-3 pt-2 border-t border-[#e4e7ef]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-[#475467] uppercase tracking-wider">
                                            Pipeline Status &amp; Internal Notes
                                        </span>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#475467] mb-1.5">
                                            Commercial Pipeline Status
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {[
                                                { value: "new", label: "New", activeClass: "bg-sky-50 text-sky-700 border-sky-300 ring-2 ring-sky-200" },
                                                { value: "contacted", label: "Contacted", activeClass: "bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-200" },
                                                { value: "converted", label: "Converted", activeClass: "bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200" },
                                                { value: "rejected", label: "Rejected", activeClass: "bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-200" }
                                            ].map(st => {
                                                const isSelected = mouFormData.status === st.value;
                                                return (
                                                    <button
                                                        key={st.value}
                                                        type="button"
                                                        onClick={() => setMouFormData({ ...mouFormData, status: st.value })}
                                                        className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[6px] border text-xs font-semibold transition-all duration-120 select-none ${
                                                            isSelected
                                                                ? `${st.activeClass} font-bold shadow-2xs`
                                                                : "bg-white border-[#e4e7ef] text-[#667085] hover:bg-slate-50 hover:text-[#171a2f]"
                                                        }`}
                                                    >
                                                        {isSelected && <Check size={11} className="shrink-0" />}
                                                        <span>{st.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#475467] mb-1">
                                            Internal Notes / Next Steps
                                        </label>
                                        <textarea
                                            value={mouFormData.notes}
                                            onChange={(e) => setMouFormData({ ...mouFormData, notes: e.target.value })}
                                            rows={2}
                                            placeholder="Log follow-up comments, discount approvals, or offline context..."
                                            className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-[#e4e7ef] rounded-[6px] text-xs outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]/20 text-[#171a2f] transition-colors resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Fixed Footer at bottom of Modal */}
                            <div className="px-6 py-3.5 border-t border-[#e4e7ef] bg-[#fafbfd] flex items-center justify-between shrink-0">
                                    <div className="text-xs text-[#667085] flex items-center gap-2">
                                        <span className="hidden sm:inline">
                                            Total: <strong className="text-[#171a2f]">₹{formLiveCalculation.totalPrice.toLocaleString("en-IN")}</strong>
                                        </span>
                                        <span className="hidden sm:inline text-slate-300">|</span>
                                        <span className="hidden sm:inline">
                                            Advance: <strong className="text-[#4f46e5]">₹{formLiveCalculation.upfrontPrice.toLocaleString("en-IN")}</strong> ({formLiveCalculation.upfrontPercent * 100}%)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsFormModalOpen(false)}
                                            className="px-3.5 py-1.5 border border-[#e4e7ef] bg-white hover:bg-[#f5f6fa] text-[#171a2f] rounded-[6px] text-xs font-medium transition-colors btn-pressable"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSavingForm}
                                            className="inline-flex items-center justify-center gap-1.5 min-w-[110px] px-4 py-1.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-[6px] text-xs font-semibold shadow-xs transition-colors btn-pressable disabled:opacity-50"
                                        >
                                            {isSavingForm ? (
                                                <>
                                                    <Loader2 size={13} className="animate-spin" />
                                                    <span>Saving...</span>
                                                </>
                                            ) : (
                                                <span>{editingMOU ? "Update MOU" : "Create MOU"}</span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* PAYMENT RECORD MODAL with AnimatePresence (§3.H) */}
                    <AnimatePresence>
                        {isPaymentModalOpen && selectedSubmission && (
                            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-0">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1, transition: { duration: MOTION_TOKENS.durBase, ease: MOTION_TOKENS.easeOut } }}
                                    exit={{ opacity: 0, transition: { duration: MOTION_TOKENS.durFast, ease: MOTION_TOKENS.easeIn } }}
                                    onClick={() => !isRecordingPayment && setIsPaymentModalOpen(false)}
                                    className="fixed inset-0 bg-[#0f172a]/70 backdrop-blur-[2px] mou-portal-layer"
                                />

                                <motion.div
                                    role="dialog"
                                    aria-modal="true"
                                    aria-labelledby="payment-dialog-title"
                                    style={{ opacity: 0 }}
                                    initial={{
                                        opacity: 0,
                                        y: typeof window !== "undefined" && window.innerWidth < 640 ? "100%" : 8,
                                        scale: typeof window !== "undefined" && window.innerWidth < 640 ? 1 : 0.98
                                    }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        scale: 1,
                                        transition: {
                                            duration: typeof window !== "undefined" && window.innerWidth < 640 ? MOTION_TOKENS.durSheet : MOTION_TOKENS.durSlow,
                                            ease: MOTION_TOKENS.easeOut
                                        }
                                    }}
                                    exit={{
                                        opacity: 0,
                                        y: typeof window !== "undefined" && window.innerWidth < 640 ? "100%" : 0,
                                        transition: {
                                            duration: MOTION_TOKENS.durFast,
                                            ease: MOTION_TOKENS.easeIn
                                        }
                                    }}
                                    className="relative z-10 bg-white rounded-[14px] p-6 max-w-md w-full shadow-2xl border border-[#e4e7ef] space-y-4 mou-portal-layer"
                                >
                                    <div className="flex items-center justify-between border-b border-[#e4e7ef] pb-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-[8px] bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#047857] shrink-0">
                                                <Landmark size={18} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 id="payment-dialog-title" className="text-sm font-bold text-[#171a2f]">Record Payment</h3>
                                                    {selectedSubmission.refId && (
                                                        <span className="font-mono text-[10px] bg-slate-100 text-[#475467] px-1.5 py-0.5 rounded-[4px] font-semibold">
                                                            {selectedSubmission.refId}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-[#667085] mt-0.5 truncate max-w-[240px]" title={selectedSubmission.schoolName}>
                                                    {selectedSubmission.schoolName}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsPaymentModalOpen(false)}
                                            aria-label="Close dialog"
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-[#667085] hover:text-[#171a2f] hover:bg-slate-100 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    {paymentError && (
                                        <div className="bg-rose-50 text-[#b42318] p-3 rounded-[8px] text-xs border border-rose-200 font-medium">
                                            {paymentError}
                                        </div>
                                    )}

                                    <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
                                        {(() => {
                                            const totalVal = selectedSubmission.totalPrice || 0;
                                            const alreadyPaid = selectedSubmission.payments?.reduce((s, p) => s + (p.amount || 0), 0) || 0;
                                            const balanceDue = Math.max(0, totalVal - alreadyPaid);
                                            return (
                                                <div className="bg-[#fafbfd] border border-[#e4e7ef] p-3 rounded-[8px] grid grid-cols-3 gap-2">
                                                    <div>
                                                        <span className="text-[10px] text-[#667085] block font-medium">Total Value</span>
                                                        <span className="font-bold text-xs text-[#171a2f]">{formatCurrency(totalVal)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] text-[#667085] block font-medium">Already Paid</span>
                                                        <span className="font-bold text-xs text-[#047857]">{formatCurrency(alreadyPaid)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] text-[#667085] block font-medium">Balance Due</span>
                                                        <span className={`font-bold text-xs ${balanceDue > 0 ? "text-[#b42318]" : "text-[#047857]"}`}>
                                                            {formatCurrency(balanceDue)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div>
                                            <label className="block text-[11px] font-semibold text-[#475467] mb-1">
                                                Amount (₹) <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                min="0.01"
                                                step="0.01"
                                                value={paymentAmount}
                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                                placeholder="e.g. 25000"
                                                className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-[#e4e7ef] rounded-[6px] text-xs font-semibold outline-none focus:border-[#4f46e5] text-[#171a2f] transition-colors"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-semibold text-[#475467] mb-1">Payment Method</label>
                                            <select
                                                value={paymentMethod}
                                                onChange={(e) => setPaymentMethod(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-[#e4e7ef] rounded-[6px] text-xs outline-none focus:border-[#4f46e5] text-[#171a2f] transition-colors cursor-pointer"
                                            >
                                                <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                                                <option value="bank_transfer">Bank Transfer / NEFT</option>
                                                <option value="cash">Cash Settlement</option>
                                                <option value="card">Debit / Credit Card</option>
                                                <option value="cheque">Cheque</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-semibold text-[#475467] mb-1">Reference ID (Optional)</label>
                                            <input
                                                type="text"
                                                value={paymentReference}
                                                onChange={(e) => setPaymentReference(e.target.value)}
                                                placeholder="UTR number or txn ref"
                                                className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-[#e4e7ef] rounded-[6px] text-xs font-mono outline-none focus:border-[#4f46e5] text-[#171a2f] transition-colors"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-semibold text-[#475467] mb-1">Notes (Optional)</label>
                                            <textarea
                                                value={paymentNotes}
                                                onChange={(e) => setPaymentNotes(e.target.value)}
                                                rows={2}
                                                placeholder="Payment comments or remarks..."
                                                className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-[#e4e7ef] rounded-[6px] text-xs outline-none focus:border-[#4f46e5] text-[#171a2f] resize-none transition-colors"
                                            />
                                        </div>

                                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e4e7ef]">
                                            <button
                                                type="button"
                                                onClick={() => setIsPaymentModalOpen(false)}
                                                className="px-3.5 py-1.5 border border-[#e4e7ef] bg-white hover:bg-[#f5f6fa] text-[#171a2f] rounded-[6px] text-xs font-medium transition-colors btn-pressable"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isRecordingPayment}
                                                className="inline-flex items-center justify-center gap-1.5 min-w-[140px] px-4 py-1.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-[6px] text-xs font-semibold transition-colors btn-pressable disabled:opacity-50"
                                            >
                                                {isRecordingPayment ? (
                                                    <>
                                                        <Loader2 size={13} className="animate-spin" />
                                                        <span>Recording...</span>
                                                    </>
                                                ) : (
                                                    <span>Record &amp; View Receipt</span>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </>,
                document.body
            )}
        </div>
    );
}

export default function MouTrackerPage() {
    return (
        <MotionConfig reducedMotion="user">
            <ToastProvider>
                <MouTrackerContent />
            </ToastProvider>
        </MotionConfig>
    );
}
