"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
    FileSpreadsheet, 
    Plus, 
    Trash2, 
    Loader2, 
    Printer, 
    Check, 
    ShieldCheck, 
    ChevronLeft, 
    ChevronRight, 
    MoreHorizontal, 
    Search, 
    ArrowUpRight,
    Coins,
    Sparkles,
    Info,
    Calendar,
    CheckCircle
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ── Apple-Design Critically Damped Springs ────────────────────────────────────
const SPRING_FAST = { type: "spring", bounce: 0, duration: 0.22 };

const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" }
];

const paymentModeOptions = [
    { value: "Cash", label: "Cash" },
    { value: "Bank Transfer", label: "Bank Transfer" },
    { value: "UPI", label: "UPI" },
    { value: "Cheque", label: "Cheque" }
];

const formatCurrency = (amount) => {
    return (Number(amount) || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const getMonthName = (monthNumber) => {
    return months.find(m => m.value === String(monthNumber))?.label || "Unknown";
};

const getInitials = (name) => {
    if (!name) return "—";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function PayslipsPage() {
    return (
        <Suspense fallback={<LoadingSpinner fullPage />}>
            <PayslipsContent />
        </Suspense>
    );
}

function PayslipsContent() {
    const { data: session } = useSession();
    const instituteId = session?.user?.institute?.id;
    const toast = useToast();
    const confirm = useConfirm();
    const searchParams = useSearchParams();

    // ── State: Data & Records ──────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [payslips, setPayslips] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [salaryComponents, setSalaryComponents] = useState([]);
    const [baseSalaryData, setBaseSalaryData] = useState(null);
    const [accounts, setAccounts] = useState([]);

    // ── State: Filter Controls ─────────────────────────────────────────────────
    const today = new Date();
    const [filterMonth, setFilterMonth] = useState(String(today.getMonth() + 1));
    const [filterYear, setFilterYear] = useState(String(today.getFullYear()));
    const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'paid' | 'unpaid'
    const [searchQuery, setSearchQuery] = useState("");
    const [activeRowMenuId, setActiveRowMenuId] = useState(null);

    // ── State: Modals ──────────────────────────────────────────────────────────
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isPrintOpen, setIsPrintOpen] = useState(false);
    const [isPayOpen, setIsPayOpen] = useState(false);

    // ── State: Create Form ─────────────────────────────────────────────────────
    const [selectedStaffId, setSelectedStaffId] = useState("");
    const [createMonth, setCreateMonth] = useState(String(today.getMonth() + 1));
    const [createYear, setCreateYear] = useState(String(today.getFullYear()));
    const [notes, setNotes] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("unpaid");
    const [paymentMode, setPaymentMode] = useState("Cash");
    const [monthlyAdjustments, setMonthlyAdjustments] = useState([]);
    const [previewLoading, setPreviewLoading] = useState(false);

    // ── State: Pay / Ledger Form ───────────────────────────────────────────────
    const [activePayslip, setActivePayslip] = useState(null);
    const [payMode, setPayMode] = useState("Bank Transfer");
    const [payAccount, setPayAccount] = useState("");
    const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
    const [payReference, setPayReference] = useState("");
    const [payNotes, setPayNotes] = useState("");
    const [paying, setPaying] = useState(false);

    const searchInputRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest("[data-row-menu-container]")) {
                setActiveRowMenuId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Active variable components that should be prompted dynamically every month
    const variableComponents = useMemo(() => {
        return salaryComponents.filter(c => c.recurrence === "variable" && c.isActive);
    }, [salaryComponents]);

    // Automatically prompt active variable components for the selected staff member
    useEffect(() => {
        if (!selectedStaffId) {
            setMonthlyAdjustments([]);
            return;
        }
        setMonthlyAdjustments(
            variableComponents.map(comp => ({
                id: comp._id,
                componentId: comp._id,
                type: comp.type,
                name: comp.name,
                description: comp.description || "",
                amount: 0,
                isCustom: false
            }))
        );
    }, [selectedStaffId, variableComponents]);

    // Auto-select staff from query parameter if present
    useEffect(() => {
        const staffParam = searchParams.get("staff");
        if (staffParam) {
            setSelectedStaffId(staffParam);
            setIsCreateOpen(true);
        }
    }, [searchParams]);

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, idx) => {
            const yr = String(currentYear - idx);
            return { value: yr, label: yr };
        });
    }, []);

    const fetchPayslips = useCallback(async (month, year, signal) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/hr/payslips?month=${month}&year=${year}`, {
                signal: signal || AbortSignal.timeout(10000)
            });
            if (!res.ok) throw new Error("Failed to fetch payslips");
            const data = await res.json();
            setPayslips(data.payslips || []);
        } catch (error) {
            if (error.name !== "AbortError") {
                setPayslips([]);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStaffList = useCallback(async (signal) => {
        try {
            const res = await fetch("/api/v1/hr/staff", { signal });
            if (res.ok) {
                const data = await res.json();
                setStaffList(data.staffMembers || []);
            }
        } catch (error) {
            if (error.name !== "AbortError") {
                console.error("Failed to load staff list", error);
            }
        }
    }, []);

    const fetchSalaryComponents = useCallback(async (signal) => {
        try {
            const res = await fetch("/api/v1/hr/salary-components", { signal });
            if (res.ok) {
                const data = await res.json();
                setSalaryComponents(data.salaryComponents || []);
            }
        } catch (error) {
            if (error.name !== "AbortError") {
                console.error("Failed to load salary components", error);
            }
        }
    }, []);

    const fetchAccounts = useCallback(async (signal) => {
        try {
            const res = await fetch("/api/v1/collectors", { signal });
            if (res.ok) {
                const data = await res.json();
                setAccounts((data.collectors || []).filter(c => c.isActive !== false));
            }
        } catch (error) {
            if (error.name !== "AbortError") {
                console.error("Failed to load accounts", error);
            }
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchPayslips(filterMonth, filterYear, controller.signal);
        fetchStaffList(controller.signal);
        fetchSalaryComponents(controller.signal);
        fetchAccounts(controller.signal);
        return () => controller.abort();
    }, [filterMonth, filterYear, fetchPayslips, fetchStaffList, fetchSalaryComponents, fetchAccounts, instituteId]);

    const accountOptions = useMemo(() => {
        return [
            { value: "", label: "Select Disbursing Account..." },
            ...accounts.map(acc => {
                const typeLabel = acc.accountType === "Bank" ? "Bank" : "Cash / Person";
                const balLabel = acc.currentBalance !== undefined ? ` • Bal: ₹${formatCurrency(acc.currentBalance)}` : "";
                const accNum = acc.accountNumber ? ` (${acc.accountNumber})` : "";
                return {
                    value: acc._id,
                    label: `${acc.name}${accNum} [${typeLabel}]${balLabel}`
                };
            })
        ];
    }, [accounts]);

    // Live preview generator whenever staff, month, or year changes
    useEffect(() => {
        if (!selectedStaffId || !isCreateOpen) {
            setBaseSalaryData(null);
            return;
        }

        const controller = new AbortController();

        const fetchPreviewDetails = async () => {
            setPreviewLoading(true);
            try {
                let staffDetail = staffList.find(u => u._id === selectedStaffId);
                if (!staffDetail) {
                    const staffRes = await fetch(`/api/v1/hr/staff/${selectedStaffId}`, { signal: controller.signal });
                    if (staffRes.ok) {
                        const sData = await staffRes.json();
                        staffDetail = sData.staff;
                    }
                }
                
                if (!staffDetail) throw new Error("Staff details not found");

                const basicSalary = staffDetail.hrDetails?.basicSalary || 0;
                
                const staffAttendanceRes = await fetch(`/api/v1/hr/attendance?staff=${selectedStaffId}`, { signal: controller.signal });
                const staffAttendanceData = await staffAttendanceRes.json();
                
                const monthIndex = parseInt(createMonth) - 1;
                const yearVal = parseInt(createYear);
                const startDate = new Date(yearVal, monthIndex, 1);
                const endDate = new Date(yearVal, createMonth, 0, 23, 59, 59, 999);
                const totalDaysInMonth = new Date(yearVal, createMonth, 0).getDate();

                const matchedLogs = (staffAttendanceData.records || []).filter(log => {
                    const logDate = new Date(log.date);
                    return logDate >= startDate && logDate <= endDate;
                });

                const summary = { present: 0, absent: 0, halfDay: 0, onLeave: 0, holiday: 0 };
                matchedLogs.forEach(log => {
                    if (log.status === "present") summary.present++;
                    else if (log.status === "absent") summary.absent++;
                    else if (log.status === "half_day") summary.halfDay++;
                    else if (log.status === "on_leave") summary.onLeave++;
                    else if (log.status === "holiday") summary.holiday++;
                });

                let salaryComponents = [];
                try {
                    const compRes = await fetch(`/api/v1/hr/salary-components`, { signal: controller.signal });
                    if (compRes.ok) {
                        const compData = await compRes.json();
                        salaryComponents = compData.salaryComponents || [];
                    }
                } catch (e) {}

                let hrSettings = {
                    shiftStart: "09:00",
                    shiftEnd: "18:00",
                    checkInGraceMins: 15,
                    checkOutGraceMins: 10,
                    deductionRatePerHour: 100,
                    midDayOutEnabled: true,
                    overtimeEnabled: true,
                    overtimeBufferMins: 30,
                    overtimeRatePerHour: 150
                };
                try {
                    const hrRes = await fetch(`/api/v1/hr/settings`, { signal: controller.signal });
                    if (hrRes.ok) {
                        const hrData = await hrRes.json();
                        if (hrData.settings) hrSettings = hrData.settings;
                    }
                } catch (e) {}

                const dailyRate = totalDaysInMonth > 0 ? (basicSalary / totalDaysInMonth) : 0;
                const paidDays = (summary.present || 0) + 
                                 ((summary.halfDay || 0) * 0.5) + 
                                 (summary.holiday || 0) + 
                                 (summary.onLeave || 0);
                const unpaidDays = Math.max(0, Math.round((totalDaysInMonth - paidDays) * 10) / 10);
                const absentDeduction = Math.round(unpaidDays * dailyRate * 100) / 100;

                const deptShift = staffDetail.department?.shiftTimings;
                const hasCustomDeptShift = Boolean(deptShift?.useCustomShift);
                const effectiveCheckInGrace = hasCustomDeptShift
                    ? (deptShift.checkInGraceMins ?? 15)
                    : (hrSettings.checkInGraceMins ?? 15);
                const effectiveCheckOutGrace = hasCustomDeptShift
                    ? (deptShift.checkOutGraceMins ?? 10)
                    : (hrSettings.checkOutGraceMins ?? 10);

                let totalLateHours = 0;
                let totalEarlyHours = 0;
                let totalMidDayHours = 0;
                let totalOvertimeHours = 0;

                matchedLogs.forEach(log => {
                    if (log.lateMinutes && log.lateMinutes > effectiveCheckInGrace) {
                        totalLateHours += Math.ceil(log.lateMinutes / 60);
                    }
                    if (log.earlyDepartureMinutes && log.earlyDepartureMinutes > effectiveCheckOutGrace) {
                        totalEarlyHours += Math.ceil(log.earlyDepartureMinutes / 60);
                    }
                    if (hrSettings.midDayOutEnabled && log.midDayOutMinutes && log.midDayOutMinutes > 0) {
                        totalMidDayHours += Math.ceil(log.midDayOutMinutes / 60);
                    }
                    if (hrSettings.overtimeEnabled && log.overtimeMinutes && log.overtimeMinutes > (hrSettings.overtimeBufferMins || 0)) {
                        const effectiveOtMinutes = log.overtimeMinutes - (hrSettings.overtimeBufferMins || 0);
                        const otHours = Math.floor(effectiveOtMinutes / 60);
                        if (otHours > 0) totalOvertimeHours += otHours;
                    }
                });

                const timingDeduction = (totalLateHours + totalEarlyHours + totalMidDayHours) * (hrSettings.deductionRatePerHour || 0);
                const overtimeAmount = totalOvertimeHours * (hrSettings.overtimeRatePerHour || 0);

                const earnings = [];
                const assignedEarningsMap = new Map();
                (staffDetail.hrDetails?.earnings || []).forEach(e => {
                    if (e.component?._id) assignedEarningsMap.set(e.component._id.toString(), e.amount || 0);
                    if (e.component?.name) assignedEarningsMap.set(e.component.name.toLowerCase().trim(), e.amount || 0);
                });

                const earningComponents = salaryComponents.filter(c => 
                    c.type === "earning" && 
                    c.name.trim().toLowerCase() !== "basic salary" && 
                    c.name.trim().toLowerCase() !== "basic" &&
                    c.recurrence !== "variable"
                );

                earningComponents.forEach(c => {
                    const amt = assignedEarningsMap.get(c._id.toString()) ?? assignedEarningsMap.get(c.name.toLowerCase().trim()) ?? 0;
                    earnings.push({
                        componentName: c.name,
                        amount: amt
                    });
                });

                if (earningComponents.length === 0) {
                    const defaultEarningNames = ["House Rent Allowance", "Conveyance Allowance", "Special Allowance", "Other Allowance"];
                    defaultEarningNames.forEach(name => {
                        const amt = assignedEarningsMap.get(name.toLowerCase().trim()) ?? 0;
                        earnings.push({
                            componentName: name,
                            amount: amt
                        });
                    });
                }

                earnings.push({
                    componentName: totalOvertimeHours > 0 
                        ? `Overtime (${totalOvertimeHours} hrs @ ₹${hrSettings.overtimeRatePerHour}/hr)` 
                        : "Overtime Allowance (0 hrs)",
                    amount: overtimeAmount
                });

                const deductions = [];
                const assignedDeductionsMap = new Map();
                (staffDetail.hrDetails?.deductions || []).forEach(d => {
                    if (d.component?._id) assignedDeductionsMap.set(d.component._id.toString(), d.amount || 0);
                    if (d.component?.name) assignedDeductionsMap.set(d.component.name.toLowerCase().trim(), d.amount || 0);
                });

                const deductionComponents = salaryComponents.filter(c => c.type === "deduction" && c.recurrence !== "variable");
                deductionComponents.forEach(c => {
                    const amt = assignedDeductionsMap.get(c._id.toString()) ?? assignedDeductionsMap.get(c.name.toLowerCase().trim()) ?? 0;
                    deductions.push({
                        componentName: c.name,
                        amount: amt
                    });
                });

                if (deductionComponents.length === 0) {
                    const defaultDeductionNames = ["Federal Income Tax (TDS)", "FICA / Provident Fund (PF)", "Health Insurance (ESI)"];
                    defaultDeductionNames.forEach(name => {
                        const amt = assignedDeductionsMap.get(name.toLowerCase().trim()) ?? 0;
                        deductions.push({
                            componentName: name,
                            amount: amt
                        });
                    });
                }

                const markedTotal = (summary.present || 0) + 
                                    (summary.absent || 0) + 
                                    (summary.halfDay || 0) + 
                                    (summary.onLeave || 0) + 
                                    (summary.holiday || 0);
                const unmarkedDays = Math.max(0, totalDaysInMonth - markedTotal);

                let attendanceDesc = `Attendance Deduction (${unpaidDays}d Unpaid`;
                const parts = [];
                if (summary.absent > 0) parts.push(`${summary.absent}d Abs`);
                if (summary.halfDay > 0) parts.push(`${summary.halfDay}d Half`);
                if (unmarkedDays > 0) parts.push(`${unmarkedDays}d Unmarked`);
                if (parts.length > 0) attendanceDesc += `: ${parts.join(", ")}`;
                attendanceDesc += ` @ ₹${dailyRate.toFixed(2)}/d)`;

                deductions.push({
                    componentName: unpaidDays > 0 ? attendanceDesc : "Attendance Deduction (0d)",
                    amount: absentDeduction
                });

                const detailsList = [];
                if (totalLateHours > 0) detailsList.push(`Late: ${totalLateHours}h`);
                if (totalEarlyHours > 0) detailsList.push(`Early-exit: ${totalEarlyHours}h`);
                if (totalMidDayHours > 0) detailsList.push(`Out-pass: ${totalMidDayHours}h`);
                deductions.push({
                    componentName: detailsList.length > 0 
                        ? `Timing Penalties (${detailsList.join(", ")} @ ₹${hrSettings.deductionRatePerHour}/hr)` 
                        : "Timing & Late Penalties (0 hrs)",
                    amount: timingDeduction
                });

                setBaseSalaryData({
                    fullName: staffDetail.fullName,
                    role: staffDetail.role,
                    basicSalary,
                    attendanceSummary: summary,
                    absentDeduction,
                    timingDeduction,
                    baseEarnings: earnings,
                    baseDeductions: deductions
                });
            } catch (err) {
                if (err.name !== "AbortError") {
                    console.error(err);
                    toast.error("Failed to generate salary calculation preview");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setPreviewLoading(false);
                }
            }
        };

        fetchPreviewDetails();
        return () => controller.abort();
    }, [selectedStaffId, createMonth, createYear, isCreateOpen, staffList, salaryComponents, toast]);

    // Live preview data combining base salary calculation + prompted variable adjustments
    const previewData = useMemo(() => {
        if (!baseSalaryData) return null;

        const earnings = [...baseSalaryData.baseEarnings];
        const deductions = [...baseSalaryData.baseDeductions];

        monthlyAdjustments.forEach(adj => {
            const amt = parseFloat(adj.amount) || 0;
            if (amt > 0) {
                if (adj.type === "earning") {
                    earnings.push({
                        componentName: adj.name || "Performance Bonus",
                        amount: amt
                    });
                } else {
                    deductions.push({
                        componentName: adj.name || "Performance Fine / Penalty",
                        amount: amt
                    });
                }
            }
        });

        const totalEarnings = baseSalaryData.basicSalary + earnings.reduce((sum, e) => sum + e.amount, 0);
        const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
        const netSalary = Math.max(0, totalEarnings - totalDeductions);

        return {
            ...baseSalaryData,
            earnings,
            deductions,
            totalEarnings,
            totalDeductions,
            netSalary
        };
    }, [baseSalaryData, monthlyAdjustments]);

    const handleCreatePayslip = async (e) => {
        e.preventDefault();
        if (!selectedStaffId) {
            toast.error("Please select a staff member");
            return;
        }

        const customEarnings = monthlyAdjustments
            .filter(a => a.type === "earning" && parseFloat(a.amount) > 0)
            .map(a => ({ componentName: a.name, amount: parseFloat(a.amount) }));
        const customDeductions = monthlyAdjustments
            .filter(a => a.type === "deduction" && parseFloat(a.amount) > 0)
            .map(a => ({ componentName: a.name, amount: parseFloat(a.amount) }));

        try {
            const res = await fetch("/api/v1/hr/payslips", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    staffId: selectedStaffId,
                    month: parseInt(createMonth),
                    year: parseInt(createYear),
                    paymentStatus,
                    paymentMode,
                    notes,
                    customEarnings,
                    customDeductions
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("Payslip generated successfully");
                setIsCreateOpen(false);
                setSelectedStaffId("");
                setNotes("");
                setBaseSalaryData(null);
                setMonthlyAdjustments([]);
                fetchPayslips(filterMonth, filterYear);
            } else {
                toast.error(data.error || "Failed to generate payslip");
            }
        } catch (error) {
            toast.error("Error generating payslip");
        }
    };

    const handleMarkAsPaid = async (e) => {
        e.preventDefault();
        if (!activePayslip) return;

        if (!payAccount) {
            toast.error("Please select a disbursing account from Accounts Master");
            return;
        }

        setPaying(true);
        try {
            const res = await fetch(`/api/v1/hr/payslips/${activePayslip._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    paymentStatus: "paid",
                    paymentMode: payMode,
                    disbursedFromAccount: payAccount,
                    paymentDate: payDate,
                    paymentReference: payReference,
                    notes: payNotes || activePayslip.notes
                })
            });

            if (res.ok) {
                toast.success("Salary payment recorded and posted to Daily Ledger");
                setIsPayOpen(false);
                fetchPayslips(filterMonth, filterYear);
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || "Failed to update payment status");
            }
        } catch (error) {
            toast.error("Error updating payment status");
        } finally {
            setPaying(false);
        }
    };

    const handleDeletePayslip = async (id, staffName) => {
        if (await confirm({
            title: "Delete Payslip?",
            message: `Are you sure you want to delete this payslip record for "${staffName}"? This action is permanent.`,
            type: "danger"
        })) {
            try {
                const res = await fetch(`/api/v1/hr/payslips/${id}`, { method: "DELETE" });
                if (res.ok) {
                    toast.success("Payslip deleted");
                    fetchPayslips(filterMonth, filterYear);
                } else {
                    toast.error("Failed to delete payslip");
                }
            } catch (error) {
                toast.error("Error deleting payslip");
            }
        }
    };

    // ── Month Stepper Helpers ──────────────────────────────────────────────────
    const handlePrevMonth = () => {
        const curM = parseInt(filterMonth);
        const curY = parseInt(filterYear);
        if (curM === 1) {
            setFilterMonth("12");
            setFilterYear(String(curY - 1));
        } else {
            setFilterMonth(String(curM - 1));
        }
    };

    const handleNextMonth = () => {
        const curM = parseInt(filterMonth);
        const curY = parseInt(filterYear);
        if (curM === 12) {
            setFilterMonth("1");
            setFilterYear(String(curY + 1));
        } else {
            setFilterMonth(String(curM + 1));
        }
    };

    // ── Keyboard Shortcuts (/ for search, Esc to close menus) ─────────────────
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                setActiveRowMenuId(null);
                return;
            }
            if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // ── Counts & Filtered Records ──────────────────────────────────────────────
    const counts = useMemo(() => {
        let paid = 0;
        let unpaid = 0;
        payslips.forEach(p => {
            if (p.paymentStatus === "paid") paid++;
            else unpaid++;
        });
        return { all: payslips.length, paid, unpaid };
    }, [payslips]);

    const filteredPayslips = useMemo(() => {
        return payslips.filter(p => {
            const staffName = `${p.staff?.profile?.firstName || ""} ${p.staff?.profile?.lastName || ""}`.trim().toLowerCase();
            const role = (p.staff?.role || "").toLowerCase();
            const query = searchQuery.toLowerCase();
            const matchesSearch = staffName.includes(query) || role.includes(query);
            const matchesStatus = statusFilter === "all" || p.paymentStatus === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [payslips, searchQuery, statusFilter]);

    return (
        <div className="text-[#14161A] select-none min-h-[calc(100vh-64px)] pb-24 font-[-apple-system,BlinkMacSystemFont,'Inter',system-ui,sans-serif]">
            {/* ── Page Header (H1, Live status subtitle, Month Stepper, Primary Action) ─ */}
            <div className="pt-2 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-[22px] font-semibold text-[#14161A] tracking-[-0.015em] leading-tight m-0">
                        Payslips
                    </h1>
                    <p className="text-[13px] text-[#5F6673] mt-1 font-normal tabular-nums">
                        {loading ? (
                            <span className="inline-flex items-center gap-1.5 text-indigo-600">
                                <Loader2 size={12} className="animate-spin" /> Loading payroll…
                            </span>
                        ) : (
                            <span>
                                {getMonthName(filterMonth)} {filterYear} · {payslips.length} {payslips.length === 1 ? "payslip" : "payslips"} ({counts.paid} paid, {counts.unpaid} unpaid)
                            </span>
                        )}
                    </p>
                </div>

                {/* Right cluster: Month Stepper & Primary Action */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* Month Stepper */}
                    <div className="inline-flex items-center h-8 bg-[#F2F3F5] rounded-lg p-0.5 text-[13px] font-medium text-[#14161A]">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            aria-label="Previous month"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-[#5F6673] hover:text-[#14161A] hover:bg-white active:scale-95 transition-all cursor-pointer"
                        >
                            <ChevronLeft size={15} />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setFilterMonth(String(today.getMonth() + 1));
                                setFilterYear(String(today.getFullYear()));
                            }}
                            className="px-2.5 text-[13px] font-medium hover:text-[#2563EB] transition-colors cursor-pointer tabular-nums"
                            title="Click to jump to current month"
                        >
                            {getMonthName(filterMonth)} {filterYear}
                        </button>
                        <button
                            type="button"
                            onClick={handleNextMonth}
                            aria-label="Next month"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-[#5F6673] hover:text-[#14161A] hover:bg-white active:scale-95 transition-all cursor-pointer"
                        >
                            <ChevronRight size={15} />
                        </button>
                    </div>

                    {/* Single Primary Action: Generate Payslip */}
                    <button
                        type="button"
                        onClick={() => setIsCreateOpen(true)}
                        className="h-8 px-3.5 rounded-lg bg-[#14161A] text-white hover:bg-black active:scale-[0.98] transition-all text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-none"
                    >
                        <Plus size={14} />
                        <span>Generate payslip</span>
                    </button>
                </div>
            </div>

            {/* ── Toolbar: Segmented Filter + Search ──────────────────────────────── */}
            <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E8EC]/80 mb-3">
                {/* Segmented Filter (Summary + Filter merged) */}
                <div 
                    role="radiogroup" 
                    aria-label="Filter payslips by status" 
                    className="inline-flex items-center p-0.5 bg-[#F2F3F5] rounded-[10px] overflow-x-auto max-w-full scrollbar-none"
                >
                    {[
                        { key: "all", label: "All", count: counts.all },
                        { key: "paid", label: "Paid", count: counts.paid },
                        { key: "unpaid", label: "Unpaid", count: counts.unpaid }
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
                                        layoutId="payslip-filter-thumb"
                                        transition={SPRING_FAST}
                                        className="absolute inset-0 bg-white rounded-lg shadow-[0_0_0_0.5px_rgba(20,22,26,0.08)] -z-10"
                                    />
                                )}
                                <span>{seg.label}</span>
                                <span className={cn(
                                    "text-[11px] tabular-nums font-normal",
                                    isSelected ? "text-[#14161A]" : "text-[#5F6673]"
                                )}>
                                    {seg.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Search staff input */}
                <div className="relative w-full sm:w-64">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5F6673]" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search staff or role… (/)"
                        className="w-full h-8 pl-8 pr-3 text-[13px] bg-[#F2F3F5] hover:bg-[#EBECEF] focus:bg-white text-[#14161A] placeholder:text-[#5F6673] rounded-lg border border-transparent focus:border-[#E6E8EC] focus:outline-none transition-all"
                    />
                </div>
            </div>

            {/* ── Main Content: Quiet 56px Rhythm List or Empty State ──────────────── */}
            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-2 text-[#5F6673] text-[13px]">
                    <Loader2 className="animate-spin text-indigo-600" size={24} />
                    <span>Loading payroll records…</span>
                </div>
            ) : filteredPayslips.length > 0 ? (
                <div className="divide-y divide-[#E6E8EC]/80 border-t border-b border-[#E6E8EC]/80">
                    {filteredPayslips.map((p) => {
                        const staffName = `${p.staff?.profile?.firstName || ""} ${p.staff?.profile?.lastName || ""}`.trim() || "Unknown";
                        const roleLabel = p.staff?.role === "instructor" ? "Teacher" : (p.staff?.role || "Staff");
                        const designation = p.staff?.hrDetails?.designation?.name;
                        const subRole = designation || roleLabel;
                        const isPaid = p.paymentStatus === "paid";
                        const initials = getInitials(staffName);
                        const isMenuOpen = activeRowMenuId === p._id;

                        return (
                            <div
                                key={p._id}
                                className="group relative min-h-[56px] py-2.5 px-3 flex items-center justify-between gap-4 hover:bg-[#F2F3F5]/60 transition-colors"
                            >
                                {/* Zone 1: Identity (Avatar, Name, Subtitle) */}
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-8 h-8 rounded-full bg-[#F2F3F5] text-[#5F6673] text-[12px] font-medium flex items-center justify-center shrink-0 border border-[#E6E8EC]/60">
                                        {initials}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[13px] font-medium text-[#14161A] truncate leading-tight">
                                            {staffName}
                                        </div>
                                        <div className="text-[12px] text-[#5F6673] truncate leading-tight mt-0.5">
                                            <span>{subRole}</span>
                                            <span className="mx-1 text-[#E6E8EC]">·</span>
                                            <span className="tabular-nums">Base ₹{formatCurrency(p.basicSalary)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Zone 2: Payroll Breakdown (Net salary + Gross/Ded subtext) */}
                                <div className="text-right shrink-0 min-w-[130px]">
                                    <div className="text-[13px] font-semibold text-[#14161A] tabular-nums leading-tight">
                                        ₹{formatCurrency(p.netSalary)}
                                    </div>
                                    <div className="text-[11px] text-[#5F6673] tabular-nums leading-tight mt-0.5">
                                        <span>Gross ₹{formatCurrency(p.grossSalary || (p.basicSalary + (p.earnings || []).reduce((s, e) => s + (e.amount || 0), 0)))}</span>
                                    </div>
                                </div>

                                {/* Zone 3: Payment Status */}
                                <div className="w-36 shrink-0 hidden sm:block">
                                    {isPaid ? (
                                        <div className="space-y-0.5">
                                            <div className="text-[12px] font-medium text-[#0E8A7D] flex items-center gap-1.5 leading-tight">
                                                <Check size={12} strokeWidth={2.5} />
                                                <span>Paid via {p.paymentMode}</span>
                                            </div>
                                            {p.disbursedFromAccount?.name && (
                                                <div className="text-[10px] text-[#5F6673] truncate leading-tight" title={p.disbursedFromAccount.name}>
                                                    A/C: {p.disbursedFromAccount.name}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#D92D20] leading-tight">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#D92D20]" />
                                            <span>Unpaid</span>
                                        </div>
                                    )}
                                </div>

                                {/* Zone 4: Actions (Quick Mark Paid + ⋯ Menu) */}
                                <div className="flex items-center gap-1 shrink-0" data-row-menu-container>
                                    {!isPaid && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActivePayslip(p);
                                                setPayMode(p.paymentMode || "Bank Transfer");
                                                setPayAccount(p.disbursedFromAccount?._id || (accounts[0]?._id || ""));
                                                setPayDate(new Date().toISOString().split("T")[0]);
                                                setPayReference(p.paymentReference || "");
                                                setPayNotes("");
                                                setIsPayOpen(true);
                                            }}
                                            className="h-7 px-2.5 text-[12px] font-medium text-[#14161A] hover:bg-[#EBECEF] rounded-md transition-colors cursor-pointer"
                                        >
                                            Mark paid…
                                        </button>
                                    )}

                                    {/* ⋯ Row Menu */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setActiveRowMenuId(isMenuOpen ? null : p._id)}
                                            aria-label="Row actions"
                                            className="w-7 h-7 flex items-center justify-center rounded-md text-[#5F6673] hover:text-[#14161A] hover:bg-[#EBECEF] active:scale-95 transition-all cursor-pointer"
                                        >
                                            <MoreHorizontal size={15} />
                                        </button>

                                        <AnimatePresence>
                                            {isMenuOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                                                    transition={SPRING_FAST}
                                                    style={{ transformOrigin: "top right" }}
                                                    className="absolute right-0 top-8 w-56 bg-white rounded-xl shadow-[0_0_0_0.5px_rgba(20,22,26,0.08),0_8px_24px_-6px_rgba(20,22,26,0.14)] p-1 z-40"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setActiveRowMenuId(null);
                                                            setActivePayslip(p);
                                                            setIsPrintOpen(true);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-[#14161A] hover:bg-[#F2F3F5] rounded-lg transition-colors cursor-pointer text-left"
                                                    >
                                                        <Printer size={14} className="text-[#5F6673]" />
                                                        <span>Print receipt…</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setActiveRowMenuId(null);
                                                            window.open(`/admin/hr/payslips/${p._id}`, "_blank");
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-[#14161A] hover:bg-[#F2F3F5] rounded-lg transition-colors cursor-pointer text-left"
                                                    >
                                                        <ArrowUpRight size={14} className="text-[#5F6673]" />
                                                        <span>Open MOU document</span>
                                                    </button>

                                                    <div className="h-[1px] bg-[#E6E8EC]/80 my-1" />

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setActiveRowMenuId(null);
                                                            handleDeletePayslip(p._id, staffName);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-[#D92D20] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-left"
                                                    >
                                                        <Trash2 size={14} className="text-[#D92D20]" />
                                                        <span>Delete payslip</span>
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Quiet Apple-Style Empty State */
                <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="w-10 h-10 rounded-full bg-[#F2F3F5] flex items-center justify-center text-[#5F6673] mb-3">
                        <FileSpreadsheet size={20} />
                    </div>
                    <div className="text-[15px] font-medium text-[#14161A]">
                        No payslips for {getMonthName(filterMonth)} {filterYear}
                    </div>
                    <p className="text-[13px] text-[#5F6673] mt-1 max-w-sm">
                        Generate monthly payslips for staff members using attendance records and wage structures.
                    </p>
                    <button
                        type="button"
                        onClick={() => setIsCreateOpen(true)}
                        className="mt-4 h-8 px-3 rounded-lg border border-[#E6E8EC] bg-transparent hover:bg-[#F2F3F5] active:scale-[0.98] transition-all text-[13px] font-medium text-[#14161A] flex items-center gap-1.5 cursor-pointer shadow-none"
                    >
                        <Plus size={14} />
                        <span>Generate payslip</span>
                    </button>
                </div>
            )}

            {/* ── MODAL: GENERATE PAYSLIP ─────────────────────────────────────────── */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => { setIsCreateOpen(false); setSelectedStaffId(""); setBaseSalaryData(null); setMonthlyAdjustments([]); }}
                title="Generate New Payslip"
                size="2xl"
                className="max-w-5xl"
            >
                <form onSubmit={handleCreatePayslip} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <Select
                                label="Staff Member / Teacher"
                                options={staffList.map(s => ({ value: s._id, label: s.fullName || `${s.profile?.firstName || ""} ${s.profile?.lastName || ""}`.trim() || s.email }))}
                                value={selectedStaffId}
                                onChange={(val) => setSelectedStaffId(val)}
                                placeholder="Select staff"
                                required
                            />
                        </div>
                        <div>
                            <Select
                                label="Payslip Month"
                                options={months}
                                value={createMonth}
                                onChange={(val) => setCreateMonth(val)}
                                required
                            />
                        </div>
                        <div>
                            <Select
                                label="Payslip Year"
                                options={years}
                                value={createYear}
                                onChange={(val) => setCreateYear(val)}
                                required
                            />
                        </div>
                    </div>

                    {/* LIVE PREVIEW CONTAINER */}
                    {previewLoading ? (
                        <div className="py-12 flex justify-center items-center text-[#5F6673] italic gap-2 text-[13px]">
                            <Loader2 className="animate-spin text-indigo-600" size={18} />
                            Calculating payroll variables and attendance logs...
                        </div>
                    ) : previewData ? (
                        <div className="bg-[#F2F3F5]/60 border border-[#E6E8EC] rounded-xl p-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#E6E8EC] gap-2">
                                <span className="text-[12px] font-medium text-[#14161A]">Salary details & attendance preview</span>
                                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#5F6673]">
                                    <span className="px-2 py-0.5 bg-white border border-[#E6E8EC] rounded-md font-medium text-emerald-700">{previewData.attendanceSummary.present || 0}d Present</span>
                                    <span className="px-2 py-0.5 bg-white border border-[#E6E8EC] rounded-md font-medium text-rose-700">{previewData.attendanceSummary.absent || 0}d Absent</span>
                                    <span className="px-2 py-0.5 bg-white border border-[#E6E8EC] rounded-md font-medium text-amber-700">{previewData.attendanceSummary.halfDay || 0}d Half</span>
                                    <span className="px-2 py-0.5 bg-white border border-[#E6E8EC] rounded-md font-medium text-[#0E8A7D]">{previewData.attendanceSummary.onLeave || 0}d Leave</span>
                                    <span className="px-2 py-0.5 bg-white border border-[#E6E8EC] rounded-md font-medium text-[#5F6673]">{previewData.attendanceSummary.holiday || 0}d Holiday</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {(() => {
                                    const otherEarnings = (previewData.earnings || []).filter(e => {
                                        const n = (e.componentName || "").trim().toLowerCase();
                                        return n !== "basic salary" && n !== "basic";
                                    });
                                    const eList = [
                                        { name: "Basic Salary", amount: previewData.basicSalary || 0 },
                                        ...otherEarnings.map(e => ({ name: e.componentName, amount: e.amount || 0 }))
                                    ];
                                    const seenDed = new Set();
                                    const dList = [];
                                    (previewData.deductions || []).forEach(d => {
                                        const norm = (d.componentName || "").trim().toLowerCase();
                                        if (!seenDed.has(norm)) {
                                            seenDed.add(norm);
                                            dList.push({ name: d.componentName, amount: d.amount || 0 });
                                        }
                                    });
                                    const rowsCount = Math.max(eList.length, dList.length);
                                    const paired = [];
                                    for (let i = 0; i < rowsCount; i++) {
                                        paired.push({
                                            earning: eList[i] || null,
                                            deduction: dList[i] || null
                                        });
                                    }

                                    return (
                                        <div className="border border-[#E6E8EC] overflow-hidden rounded-lg text-[12px] bg-white">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-[#F2F3F5] text-[#5F6673] font-medium border-b border-[#E6E8EC]">
                                                        <th className="py-2 px-3 text-left border-r border-[#E6E8EC] w-5/12 font-medium">Earnings</th>
                                                        <th className="py-2 px-3 text-right border-r border-[#E6E8EC] w-2/12 font-medium">Amount</th>
                                                        <th className="py-2 px-3 text-left border-r border-[#E6E8EC] w-4/12 font-medium">Deductions</th>
                                                        <th className="py-2 px-3 text-right w-2/12 font-medium">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[#E6E8EC]/80">
                                                    {paired.map((row, idx) => (
                                                        <tr key={idx} className="divide-x divide-[#E6E8EC]/80 hover:bg-[#F2F3F5]/40 transition-colors">
                                                            <td className="py-1.5 px-3 text-[#14161A]">{row.earning ? row.earning.name : ""}</td>
                                                            <td className="py-1.5 px-3 text-right tabular-nums font-medium text-[#14161A]">{row.earning ? `₹${formatCurrency(row.earning.amount)}` : ""}</td>
                                                            <td className="py-1.5 px-3 text-[#14161A]">{row.deduction ? row.deduction.name : ""}</td>
                                                            <td className="py-1.5 px-3 text-right tabular-nums font-medium text-[#14161A]">{row.deduction ? `₹${formatCurrency(row.deduction.amount)}` : ""}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-[#F2F3F5]/80 text-[#14161A] font-semibold border-t border-[#E6E8EC] divide-x divide-[#E6E8EC]">
                                                        <td className="py-1.5 px-3 text-left">Gross Earnings</td>
                                                        <td className="py-1.5 px-3 text-right tabular-nums">₹{formatCurrency(previewData.totalEarnings)}</td>
                                                        <td className="py-1.5 px-3 text-left">Total Deductions</td>
                                                        <td className="py-1.5 px-3 text-right tabular-nums text-rose-600">₹{formatCurrency(previewData.totalDeductions)}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    );
                                })()}

                                <div className="bg-[#14161A] text-white p-3 rounded-lg flex justify-between items-center">
                                    <span className="text-[12px] font-medium text-[#A0A4AB]">Net payable</span>
                                    <span className="font-semibold text-white text-[16px] tabular-nums">₹{formatCurrency(previewData.netSalary)}</span>
                                </div>
                            </div>
                        </div>
                    ) : selectedStaffId ? (
                        <div className="text-center py-6 text-[#5F6673] text-[13px]">Select staff to preview details.</div>
                    ) : null}

                    {/* Monthly Variable Adjustments */}
                    {previewData && (() => {
                        const variableAdjustments = monthlyAdjustments.filter(a => !a.isCustom);
                        const customAdjustments = monthlyAdjustments.filter(a => a.isCustom);

                        return (
                            <div className="bg-white border border-[#E6E8EC] rounded-xl p-4 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E6E8EC] pb-2 gap-2">
                                    <div>
                                        <div className="text-[12px] font-medium text-[#14161A] flex items-center gap-1.5">
                                            <Coins size={14} className="text-[#5F6673]" />
                                            <span>Monthly variable adjustments</span>
                                        </div>
                                        <p className="text-[11px] text-[#5F6673]">
                                            Prompted components for {getMonthName(createMonth)} {createYear}. Enter amount, or leave ₹0.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMonthlyAdjustments(prev => [
                                                ...prev,
                                                {
                                                    id: Date.now().toString(),
                                                    type: "deduction",
                                                    name: "One-off penalty / fine",
                                                    amount: 0,
                                                    isCustom: true
                                                }
                                            ]);
                                        }}
                                        className="h-7 px-2.5 rounded-md border border-[#E6E8EC] text-[12px] font-medium text-[#14161A] hover:bg-[#F2F3F5] flex items-center gap-1 transition-colors self-start sm:self-auto"
                                    >
                                        <Plus size={13} />
                                        <span>Add custom adjustment</span>
                                    </button>
                                </div>

                                {variableAdjustments.length > 0 ? (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {variableAdjustments.map((adj) => {
                                                const isDeduction = adj.type === "deduction";
                                                return (
                                                    <div
                                                        key={adj.id}
                                                        className="p-2.5 bg-[#F2F3F5]/60 rounded-lg border border-[#E6E8EC] flex items-center justify-between gap-3"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[12px] font-medium text-[#14161A] truncate">
                                                                    {adj.name}
                                                                </span>
                                                                <span className={cn(
                                                                    "text-[10px] font-medium px-1.5 py-0.2 rounded shrink-0",
                                                                    isDeduction
                                                                        ? "bg-rose-50 text-rose-700"
                                                                        : "bg-emerald-50 text-emerald-700"
                                                                )}>
                                                                    {isDeduction ? "Deduction (-)" : "Bonus (+)"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="w-24 shrink-0 relative">
                                                            <span className="absolute left-2 top-1.5 text-[11px] text-[#5F6673]">₹</span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                placeholder="0"
                                                                value={adj.amount > 0 ? adj.amount : ""}
                                                                onChange={(e) => {
                                                                    const val = Math.max(0, parseFloat(e.target.value) || 0);
                                                                    setMonthlyAdjustments(prev => prev.map(item => item.id === adj.id ? { ...item, amount: val } : item));
                                                                }}
                                                                className="w-full text-[12px] font-medium border border-[#E6E8EC] rounded-md py-1 pl-5 pr-2 bg-white text-[#14161A] focus:outline-none focus:border-[#14161A] text-right"
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-2.5 bg-[#F2F3F5]/60 rounded-lg text-[12px] text-[#5F6673]">
                                        No standard variable components configured in Salary Components. You can add one-off adjustments above.
                                    </div>
                                )}

                                {customAdjustments.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-[#E6E8EC]">
                                        {customAdjustments.map((adj) => (
                                            <div key={adj.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 bg-[#F2F3F5]/40 rounded-lg border border-[#E6E8EC]">
                                                <div className="w-full sm:w-36 shrink-0">
                                                    <select
                                                        value={adj.type}
                                                        onChange={(e) => {
                                                            const newType = e.target.value;
                                                            setMonthlyAdjustments(prev => prev.map(item => item.id === adj.id ? {
                                                                ...item,
                                                                type: newType,
                                                                name: newType === "deduction" ? "Performance fine / penalty" : "Performance bonus"
                                                            } : item));
                                                        }}
                                                        className="w-full text-[12px] font-medium border border-[#E6E8EC] rounded-md p-1.5 bg-white text-[#14161A]"
                                                    >
                                                        <option value="deduction">Deduction (-)</option>
                                                        <option value="earning">Bonus (+)</option>
                                                    </select>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <input
                                                        type="text"
                                                        value={adj.name}
                                                        placeholder="Reason (e.g. Late shift penalty)"
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setMonthlyAdjustments(prev => prev.map(item => item.id === adj.id ? { ...item, name: val } : item));
                                                        }}
                                                        className="w-full text-[12px] border border-[#E6E8EC] rounded-md p-1.5 bg-white text-[#14161A] placeholder:text-[#5F6673]"
                                                    />
                                                </div>

                                                <div className="w-full sm:w-28 shrink-0 relative">
                                                    <span className="absolute left-2 top-1.5 text-[11px] text-[#5F6673]">₹</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={adj.amount > 0 ? adj.amount : ""}
                                                        placeholder="0"
                                                        onChange={(e) => {
                                                            const amt = Math.max(0, parseFloat(e.target.value) || 0);
                                                            setMonthlyAdjustments(prev => prev.map(item => item.id === adj.id ? { ...item, amount: amt } : item));
                                                        }}
                                                        className="w-full text-[12px] font-medium border border-[#E6E8EC] rounded-md py-1 pl-5 pr-2 bg-white text-[#14161A] text-right"
                                                    />
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMonthlyAdjustments(prev => prev.filter(item => item.id !== adj.id));
                                                    }}
                                                    className="p-1.5 text-[#5F6673] hover:text-rose-600 transition-colors self-end sm:self-auto shrink-0"
                                                    title="Remove adjustment"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {previewData && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select
                                label="Initial Payment Status"
                                options={[
                                    { value: "unpaid", label: "Unpaid" },
                                    { value: "paid", label: "Paid" }
                                ]}
                                value={paymentStatus}
                                onChange={(val) => setPaymentStatus(val)}
                            />
                            {paymentStatus === "paid" && (
                                <Select
                                    label="Payment Mode"
                                    options={paymentModeOptions}
                                    value={paymentMode}
                                    onChange={(val) => setPaymentMode(val)}
                                />
                            )}
                        </div>
                    )}

                    <Input
                        label="Internal Notes"
                        placeholder="Add payslip details/remarks..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />

                    <div className="flex justify-end gap-2 pt-4 border-t border-[#E6E8EC]">
                        <Button type="button" variant="ghost" onClick={() => { setIsCreateOpen(false); setSelectedStaffId(""); setBaseSalaryData(null); }}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!selectedStaffId || previewLoading} className="bg-[#14161A] hover:bg-black text-white font-semibold">
                            Generate Payslip
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* ── MODAL: PRINT VIEW ──────────────────────────────────────────────── */}
            {isPrintOpen && activePayslip && (
                <Modal
                    isOpen={isPrintOpen}
                    onClose={() => setIsPrintOpen(false)}
                    title="Salary Payslip Printable Receipt"
                    size="2xl"
                    className="max-w-5xl"
                >
                    <div className="p-6 bg-white border border-[#E6E8EC] rounded-xl space-y-6" id="printable-payslip">
                        {/* Payslip Header */}
                        <div className="flex justify-between items-start border-b border-[#E6E8EC] pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-[#14161A] tracking-tight">SALARY PAYSLIP</h2>
                                <p className="text-[13px] text-[#5F6673] mt-1">Period: {getMonthName(activePayslip.month)} {activePayslip.year}</p>
                            </div>
                            <div className="text-right">
                                <span className="inline-flex items-center px-2.5 py-1 rounded text-[12px] font-medium bg-[#F2F3F5] text-[#14161A] capitalize border border-[#E6E8EC]">
                                    Status: {activePayslip.paymentStatus}
                                </span>
                                {activePayslip.paymentDate && (
                                    <p className="text-[11px] text-[#5F6673] mt-1">Paid: {new Date(activePayslip.paymentDate).toLocaleDateString()}</p>
                                )}
                            </div>
                        </div>

                        {/* Staff profile details grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[12px] text-[#5F6673] bg-[#F2F3F5]/60 p-4 rounded-xl border border-[#E6E8EC]">
                            <div>
                                <span className="block text-[11px] text-[#5F6673] font-medium">Employee Name</span>
                                <span className="text-[13px] font-semibold text-[#14161A] mt-0.5 block">
                                    {activePayslip.staff?.profile?.firstName || ""} {activePayslip.staff?.profile?.lastName || ""}
                                </span>
                            </div>
                            <div>
                                <span className="block text-[11px] text-[#5F6673] font-medium">Email Address</span>
                                <span className="text-[#14161A] block mt-0.5 truncate">{activePayslip.staff?.email || "—"}</span>
                            </div>
                            <div>
                                <span className="block text-[11px] text-[#5F6673] font-medium">Designation</span>
                                <span className="text-[#14161A] block mt-0.5">{activePayslip.staff?.hrDetails?.designation?.name || "Staff"}</span>
                            </div>
                            <div>
                                <span className="block text-[11px] text-[#5F6673] font-medium">Generated On</span>
                                <span className="text-[#14161A] block mt-0.5">{new Date(activePayslip.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        {/* Attendance Summary */}
                        <div className="space-y-2">
                            <span className="text-[12px] font-medium text-[#5F6673]">Attendance breakdown</span>
                            <div className="grid grid-cols-5 gap-2 border border-[#E6E8EC] p-3 rounded-lg text-center text-[12px] bg-[#F2F3F5]/40">
                                <div>
                                    <span className="block text-[11px] text-[#5F6673]">Present</span>
                                    <span className="text-emerald-700 font-semibold block mt-0.5">{activePayslip.attendanceSummary?.present || 0}d</span>
                                </div>
                                <div>
                                    <span className="block text-[11px] text-[#5F6673]">Absent</span>
                                    <span className="text-rose-700 font-semibold block mt-0.5">{activePayslip.attendanceSummary?.absent || 0}d</span>
                                </div>
                                <div>
                                    <span className="block text-[11px] text-[#5F6673]">Half Day</span>
                                    <span className="text-amber-700 font-semibold block mt-0.5">{activePayslip.attendanceSummary?.halfDay || 0}d</span>
                                </div>
                                <div>
                                    <span className="block text-[11px] text-[#5F6673]">Leave</span>
                                    <span className="text-[#0E8A7D] font-semibold block mt-0.5">{activePayslip.attendanceSummary?.onLeave || 0}d</span>
                                </div>
                                <div>
                                    <span className="block text-[11px] text-[#5F6673]">Holiday</span>
                                    <span className="text-[#5F6673] font-semibold block mt-0.5">{activePayslip.attendanceSummary?.holiday || 0}d</span>
                                </div>
                            </div>
                        </div>

                        {/* Wage Payslip 4-Column Table Grid */}
                        {(() => {
                            const eList = [
                                { name: "Basic Salary", amount: activePayslip.basicSalary || 0 },
                                ...(activePayslip.earnings || []).map(e => ({ name: e.componentName, amount: e.amount || 0 }))
                            ];
                            const dList = [
                                ...(activePayslip.deductions || []).map(d => ({ name: d.componentName, amount: d.amount || 0 }))
                            ];
                            const rowsCount = Math.max(eList.length, dList.length);
                            const paired = [];
                            for (let i = 0; i < rowsCount; i++) {
                                paired.push({
                                    earning: eList[i] || null,
                                    deduction: dList[i] || null
                                });
                            }
                            const gross = eList.reduce((sum, e) => sum + (e.amount || 0), 0);
                            const totDed = dList.reduce((sum, d) => sum + (d.amount || 0), 0);

                            return (
                                <div className="border border-[#E6E8EC] overflow-hidden rounded-lg text-[12px] bg-white">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-[#F2F3F5] text-[#5F6673] font-medium border-b border-[#E6E8EC]">
                                                <th className="py-2 px-3 text-left border-r border-[#E6E8EC] w-4/12 font-medium">Earnings</th>
                                                <th className="py-2 px-3 text-right border-r border-[#E6E8EC] w-2/12 font-medium">Amount</th>
                                                <th className="py-2 px-3 text-left border-r border-[#E6E8EC] w-4/12 font-medium">Deductions</th>
                                                <th className="py-2 px-3 text-right w-2/12 font-medium">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E6E8EC]/80 bg-white">
                                            {paired.map((row, idx) => (
                                                <tr key={idx} className="divide-x divide-[#E6E8EC]/80 hover:bg-[#F2F3F5]/40 transition-colors">
                                                    <td className="py-1.5 px-3 text-[#14161A]">{row.earning ? row.earning.name : ""}</td>
                                                    <td className="py-1.5 px-3 text-right tabular-nums font-medium text-[#14161A]">{row.earning ? `₹${formatCurrency(row.earning.amount)}` : ""}</td>
                                                    <td className="py-1.5 px-3 text-[#14161A]">{row.deduction ? row.deduction.name : ""}</td>
                                                    <td className="py-1.5 px-3 text-right tabular-nums font-medium text-[#14161A]">{row.deduction ? `₹${formatCurrency(row.deduction.amount)}` : ""}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-[#F2F3F5]/80 text-[#14161A] font-semibold border-t border-[#E6E8EC] divide-x divide-[#E6E8EC]">
                                                <td className="py-1.5 px-3 text-left">Gross Salary</td>
                                                <td className="py-1.5 px-3 text-right tabular-nums">₹{formatCurrency(gross)}</td>
                                                <td className="py-1.5 px-3 text-left">Total Deductions</td>
                                                <td className="py-1.5 px-3 text-right tabular-nums text-rose-600">₹{formatCurrency(totDed)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            );
                        })()}

                        {/* Totals row */}
                        <div className="bg-[#14161A] text-white rounded-lg p-3.5 flex justify-between items-center">
                            <div>
                                <span className="block text-[12px] font-medium text-[#A0A4AB]">Net salary payable</span>
                                <span className="text-[11px] text-[#A0A4AB]/80 mt-0.5">Calculated based on attendance and duty rules</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[18px] font-bold text-white tabular-nums">₹{formatCurrency(activePayslip.netSalary)}</span>
                            </div>
                        </div>

                        {/* Payment & Ledger status card */}
                        {activePayslip.paymentStatus === "paid" && (
                            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-3.5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[12px] font-medium text-emerald-900 flex items-center gap-1.5">
                                        <CheckCircle size={14} className="text-emerald-600" />
                                        Disbursed & Posted to Daily Ledger
                                    </span>
                                    <span className="text-[11px] text-emerald-700">
                                        {activePayslip.paymentDate ? new Date(activePayslip.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Paid"}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-[12px]">
                                    <div>
                                        <span className="block text-[10px] text-[#5F6673]">Account</span>
                                        <span className="font-medium text-[#14161A]">
                                            {activePayslip.disbursedFromAccount?.name || "General Counter"}
                                            {activePayslip.disbursedFromAccount?.accountNumber ? ` (${activePayslip.disbursedFromAccount.accountNumber})` : ""}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-[#5F6673]">Payment Mode</span>
                                        <span className="font-medium text-[#14161A]">{activePayslip.paymentMode || "Cash"}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-[#5F6673]">Reference / UTR</span>
                                        <span className="font-mono text-[#14161A] text-[11px]">{activePayslip.paymentReference || "—"}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activePayslip.notes && (
                            <div className="bg-[#F2F3F5]/60 p-3 rounded-lg text-[12px] text-[#5F6673] border border-[#E6E8EC]">
                                <span className="block font-medium text-[#14161A] mb-0.5">Notes / Remarks</span>
                                <p>{activePayslip.notes}</p>
                            </div>
                        )}

                        {/* Signatures */}
                        <div className="pt-8 flex justify-between items-end text-[12px] text-[#5F6673]">
                            <div className="border-t border-[#E6E8EC] pt-2 w-40 text-center">Employee Signature</div>
                            <div className="border-t border-[#E6E8EC] pt-2 w-40 text-center">Authorized Signature</div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center gap-3 pt-4 border-t border-[#E6E8EC]">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => window.open(`/admin/hr/payslips/${activePayslip._id}`, "_blank")}
                            className="text-[12px] font-medium"
                        >
                            Open MOU Document Format
                        </Button>
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" onClick={() => setIsPrintOpen(false)}>Close</Button>
                            <Button
                                onClick={() => {
                                    const printContent = document.getElementById("printable-payslip").innerHTML;
                                    const originalContent = document.body.innerHTML;
                                    document.body.innerHTML = printContent;
                                    window.print();
                                    document.body.innerHTML = originalContent;
                                    window.location.reload();
                                }}
                                className="bg-[#14161A] hover:bg-black text-white font-semibold flex items-center gap-1.5"
                            >
                                <Printer size={15} />
                                <span>Print Receipt</span>
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ── MODAL: PAY SLIP (DISBURSE & POST TO DAILY LEDGER) ───────────────── */}
            {isPayOpen && activePayslip && (
                <Modal
                    isOpen={isPayOpen}
                    onClose={() => setIsPayOpen(false)}
                    title="Disburse Payroll & Post to Daily Ledger"
                >
                    <form onSubmit={handleMarkAsPaid} className="space-y-4">
                        <div className="bg-[#F2F3F5]/60 border border-[#E6E8EC] rounded-xl p-3 flex items-center justify-between">
                            <div>
                                <span className="text-[11px] text-[#5F6673] block">Total net salary payable</span>
                                <span className="text-[13px] font-medium text-[#14161A]">
                                    {activePayslip.staff?.profile?.firstName} {activePayslip.staff?.profile?.lastName} · {getMonthName(activePayslip.month)} {activePayslip.year}
                                </span>
                            </div>
                            <span className="text-[17px] font-bold text-[#14161A] tabular-nums">
                                ₹{formatCurrency(activePayslip.netSalary)}
                            </span>
                        </div>

                        <Select
                            label="Disbursing Account (Accounts Master) *"
                            options={accountOptions}
                            value={payAccount}
                            onChange={(val) => setPayAccount(val)}
                            placeholder="Choose Bank or Cash Account..."
                            searchable={true}
                            required
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Select
                                label="Payment Mode *"
                                options={paymentModeOptions}
                                value={payMode}
                                onChange={(val) => setPayMode(val)}
                                required
                            />
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Disbursement Date *
                                </label>
                                <input
                                    type="date"
                                    value={payDate}
                                    onChange={(e) => setPayDate(e.target.value)}
                                    required
                                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Transaction Ref / UTR / Cheque # (Optional)
                            </label>
                            <input
                                type="text"
                                value={payReference}
                                onChange={(e) => setPayReference(e.target.value)}
                                placeholder="e.g. UTR-9823412431 or CHQ-00123"
                                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Disbursement Notes / Remarks (Optional)
                            </label>
                            <textarea
                                rows={2}
                                value={payNotes}
                                onChange={(e) => setPayNotes(e.target.value)}
                                placeholder="Additional notes for day book ledger..."
                                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                            />
                        </div>

                        <div className="bg-[#F2F3F5]/80 border border-[#E6E8EC] rounded-lg p-2.5 text-[11px] text-[#5F6673] flex items-start gap-2">
                            <ShieldCheck size={15} className="text-[#14161A] shrink-0 mt-0.5" />
                            <span>
                                Posting payment records an outflow entry under <strong>Faculty & Staff Payroll</strong> in the Daily Ledger and debits the selected account balance.
                            </span>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-[#E6E8EC]">
                            <Button type="button" variant="ghost" onClick={() => setIsPayOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={paying || !payAccount}
                                className="bg-[#14161A] hover:bg-black text-white font-semibold flex items-center gap-2"
                            >
                                {paying ? <Loader2 size={13} className="animate-spin" /> : null}
                                Confirm & Post to Ledger
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
