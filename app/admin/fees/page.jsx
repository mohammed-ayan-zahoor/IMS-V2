"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
    CreditCard,
    Search,
    MoreVertical,
    Filter,
    CheckCircle,
    AlertCircle,
    Clock,
    DollarSign,
    Trash2,
    XCircle,
    Settings,
    Tag,
    Layers,
    MessageCircle
} from "lucide-react";
import Link from "next/link";
import Select from "@/components/ui/Select";
// Verified: Usage of Select component is compatible with onChange(value) signature.
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { format } from "date-fns";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import * as XLSX from "xlsx";
import { useAcademicSession } from "@/contexts/AcademicSessionContext";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default function FeesPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const { data: session } = useSession();
    const { selectedSessionId } = useAcademicSession();
    const isSchool = session?.user?.institute?.type === 'SCHOOL' || session?.user?.institute?.code === 'QUANTECH';
    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedFee, setSelectedFee] = useState(null); // For detail/payment view
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedBreakdownFee, setSelectedBreakdownFee] = useState(null);
    const [isManageHeadsModalOpen, setIsManageHeadsModalOpen] = useState(false);
    const [feeHeadsList, setFeeHeadsList] = useState([]);
    const [batchStudentsList, setBatchStudentsList] = useState([]);
    const [loadingBatchStudents, setLoadingBatchStudents] = useState(false);
    const [isSubmittingManageHeads, setIsSubmittingManageHeads] = useState(false);
    const [manageHeadsData, setManageHeadsData] = useState({
        batchId: "",
        feeHeadId: "",
        customName: "",
        amount: "",
        category: "other",
        action: "apply",
        target: "all",
        studentIds: [],
        reason: ""
    });

    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    const [showOverdueOnly, setShowOverdueOnly] = useState(false);
    const [showCancelledOnly, setShowCancelledOnly] = useState(false);
    const [showDiscountedOnly, setShowDiscountedOnly] = useState(false);

    // Payment Form state
    const [paymentData, setPaymentData] = useState({
        installmentId: "",
        amount: "",
        method: "cash",
        transactionId: "",
        collectedBy: "",
        notes: "",
        date: format(new Date(), "yyyy-MM-dd"), // Default to today
        nextDueDate: "", // Optional
        penaltyPaid: ""
    });
    const [collectors, setCollectors] = useState([]);
    const [sendWhatsAppReceipt, setSendWhatsAppReceipt] = useState(true);

    const isVocational = session?.user?.institute?.type === 'VOCATIONAL';

    // Filters & Report State
    const [courses, setCourses] = useState([]);
    const [courseBundles, setCourseBundles] = useState([]);
    const [batches, setBatches] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [selectedBatch, setSelectedBatch] = useState("");
    const [percentageFilter, setPercentageFilter] = useState("");
    const [summary, setSummary] = useState({ totalGross: 0, totalDiscount: 0, extraCharges: 0, totalCollected: 0, totalPending: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const rowsPerPage = 50;
    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        // Fetch data if: 
        // 1. A session is selected
        // 2. OR it's NOT a school (vocational institutes don't always use sessions)
        if (selectedSessionId || isVocational) {
            fetchFees();
            fetchStats();
        }
        fetchCourses();
        fetchFeeHeadsList();
        if (isVocational) {
            fetchCourseBundles();
        }
        const controller = new AbortController();
        fetchCollectors(controller.signal);
        return () => controller.abort();
    }, [selectedSessionId, currentPage, debouncedSearch, isVocational]);

    useEffect(() => {
        if (selectedCourse) {
            fetchBatches(selectedCourse);
        } else {
            setBatches([]);
        }
        setSelectedBatch(""); // Reset batch when course changes
    }, [selectedCourse]);

    useEffect(() => {
        if (selectedSessionId || isVocational) {
            fetchFees();
            fetchStats();
            setCurrentPage(1);
        }
    }, [selectedCourse, selectedBatch, percentageFilter, showCancelledOnly, showDiscountedOnly]);

    const fetchFeeHeadsList = async () => {
        try {
            const res = await fetch("/api/v1/fee-heads");
            if (res.ok) {
                const data = await res.json();
                setFeeHeadsList(data.feeHeads || []);
            }
        } catch (e) {
            console.error("Failed to load fee heads:", e);
        }
    };

    const fetchStudentsForBatch = async (batchId) => {
        if (!batchId) {
            setBatchStudentsList([]);
            return;
        }
        setLoadingBatchStudents(true);
        try {
            const res = await fetch(`/api/v1/batches/${batchId}`);
            if (res.ok) {
                const data = await res.json();
                const enrolled = (data.enrolledStudents || [])
                    .filter(e => e.status === "active" && e.student)
                    .map(e => ({
                        _id: e.student._id || e.student,
                        name: `${e.student.profile?.firstName || ''} ${e.student.profile?.lastName || ''}`.trim() || e.student.email || 'Student',
                        enrollmentNumber: e.student.enrollmentNumber || ''
                    }));
                setBatchStudentsList(enrolled);
            }
        } catch (e) {
            console.error("Failed to fetch students for batch:", e);
        } finally {
            setLoadingBatchStudents(false);
        }
    };

    const handleBulkAssignSubmit = async (e) => {
        e.preventDefault();
        if (!manageHeadsData.batchId) {
            toast.error("Please select a class / section");
            return;
        }

        const selectedHead = feeHeadsList.find(h => h._id === manageHeadsData.feeHeadId);
        const nameToUse = selectedHead ? selectedHead.name : manageHeadsData.customName;
        if (!nameToUse) {
            toast.error("Please select or enter a fee head name");
            return;
        }

        if (manageHeadsData.action === "apply" && (!manageHeadsData.amount || parseFloat(manageHeadsData.amount) <= 0)) {
            toast.error("Please enter a valid amount");
            return;
        }

        if (manageHeadsData.target === "selected" && manageHeadsData.studentIds.length === 0) {
            toast.error("Please select at least one student");
            return;
        }

        setIsSubmittingManageHeads(true);
        try {
            const res = await fetch("/api/v1/fees/bulk-assign-components", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    batchId: manageHeadsData.batchId,
                    feeHeadId: manageHeadsData.feeHeadId || undefined,
                    name: nameToUse,
                    category: selectedHead?.category || manageHeadsData.category,
                    amount: parseFloat(manageHeadsData.amount) || 0,
                    action: manageHeadsData.action,
                    target: manageHeadsData.target,
                    studentIds: manageHeadsData.studentIds,
                    reason: manageHeadsData.reason
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || "Fee head assigned successfully");
                setIsManageHeadsModalOpen(false);
                setManageHeadsData({
                    batchId: "",
                    feeHeadId: "",
                    customName: "",
                    amount: "",
                    category: "other",
                    action: "apply",
                    target: "all",
                    studentIds: [],
                    reason: ""
                });
                fetchFees();
            } else {
                toast.error(data.error || "Failed to update fee components");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to update fee components");
        } finally {
            setIsSubmittingManageHeads(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const res = await fetch("/api/v1/courses");
            if (res.ok) {
                const data = await res.json();
                setCourses(data.courses || []);
            }
        } catch (error) {
            console.error("Failed to fetch courses", error);
        }
    };

    const fetchCourseBundles = async () => {
        try {
            const res = await fetch("/api/v1/course-bundles");
            if (res.ok) {
                const data = await res.json();
                setCourseBundles(data.courseBundles || data.bundles || (Array.isArray(data) ? data : []));
            }
        } catch (error) {
            console.error("Failed to fetch course bundles", error);
        }
    };

    const fetchBatches = async (courseId) => {
        try {
            const sessionParam = selectedSessionId && selectedSessionId !== 'all' ? `&sessionId=${selectedSessionId}` : '';
            const res = await fetch(`/api/v1/batches?courseId=${courseId}${sessionParam}`);
            if (res.ok) {
                const data = await res.json();
                setBatches(data.batches || []);
            }
        } catch (error) {
            console.error("Failed to fetch batches", error);
        }
    };

    const fetchFees = async () => {
        try {
            setLoading(true);
            const url = new URL('/api/v1/fees', window.location.origin);
            // Send academic session for schools and colleges (exclude session-less vocational)
            if (selectedSessionId && selectedSessionId !== 'all') url.searchParams.append('session', selectedSessionId);
            if (selectedCourse) url.searchParams.append('course', selectedCourse);
            if (selectedBatch) url.searchParams.append('batch', selectedBatch);
            if (percentageFilter) url.searchParams.append('percentage', percentageFilter);
            if (showCancelledOnly) url.searchParams.append('includeCancelled', 'true');
            if (showDiscountedOnly) url.searchParams.append('discountOnly', 'true');
            if (debouncedSearch) url.searchParams.append('search', debouncedSearch);
            url.searchParams.append('page', currentPage.toString());
            url.searchParams.append('limit', rowsPerPage.toString());

            // Show all students by default to allow ad-hoc payments
            url.searchParams.append('includeAll', 'true');
            const res = await fetch(url);
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch fees: ${res.statusText}`);
            }
            const data = await res.json();
            
            // Handle Paginated Result
            if (data && typeof data === 'object' && Array.isArray(data.fees)) {
                setFees(data.fees);
                setTotalPages(data.totalPages || 1);
                setTotalRecords(data.total || 0);
            } else if (Array.isArray(data)) {
                // Fallback for non-paginated legacy or extended queries if they don't support pagination yet
                setFees(data);
                setTotalPages(1);
                setTotalRecords(data.length);
            } else {
                console.error("Expected array but got:", data);
                setFees([]);
                toast.error("Received invalid data from server");
            }
        } catch (error) {
            console.error("Failed to fetch fees", error);
            toast.error(error.message || "Failed to load fee records");
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const url = new URL('/api/v1/fees/stats', window.location.origin);
            // Send academic session for schools and colleges (exclude session-less vocational)
            if (selectedSessionId && selectedSessionId !== 'all') url.searchParams.append('session', selectedSessionId);
            if (selectedCourse) url.searchParams.append('course', selectedCourse);
            if (selectedBatch) url.searchParams.append('batch', selectedBatch);
            if (showDiscountedOnly) url.searchParams.append('discountOnly', 'true');
            
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setSummary(data);
            }
        } catch (error) {
            console.error("Failed to fetch stats", error);
        }
    };

    const fetchCollectors = async (signal) => {
        try {
            const res = await fetch("/api/v1/collectors", {
                signal: signal || AbortSignal.timeout(10000)
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch collectors (${res.status})`);
            }
            const data = await res.json();
            if (signal?.aborted) return;
            setCollectors(data.collectors || []);
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error("Failed to fetch collectors", error);
            toast.error(error.message || "Failed to load fee collectors");
        }
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        if (isSubmittingPayment) return;

        // Allow if installmentId is set OR if we are in adhoc mode (where we send null/undefined)
        // But currently our Select uses "adhoc" string.
        if (!selectedFee) return;

        // Validate Amount
        const amountNum = parseFloat(paymentData.amount);
        if (!paymentData.amount || isNaN(amountNum) || amountNum <= 0) {
            toast.warning("Please enter a valid positive amount");
            return;
        }

        if (amountNum > (selectedFee.balanceAmount || 0)) {
            toast.warning("Amount exceeds pending balance");
            return;
        }

        const payload = {
            ...paymentData,
            amount: amountNum,
            penaltyPaid: paymentData.penaltyPaid ? parseFloat(paymentData.penaltyPaid) || 0 : 0
        };

        // Conditional Validation for Transaction ID
        if (["upi", "card", "bank_transfer"].includes(paymentData.method) && !paymentData.transactionId) {
            toast.warning("Transaction reference is required for this payment method");
            return;
        }

        if (!paymentData.collectedBy) {
            toast.warning("Please select a collector before recording the payment");
            return;
        }

        if (payload.installmentId === 'adhoc') {
            delete payload.installmentId; // Remove it so backend sees it as ad-hoc
        } else if (!payload.installmentId) {
            toast.warning("Please select an installment or choose Ad-hoc Payment");
            return;
        }

        try {
            setIsSubmittingPayment(true);
            const res = await fetch(`/api/v1/fees/${selectedFee._id}/payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const feeId = selectedFee._id;
                const studentPhone = selectedFee.student?.profile?.phone || selectedFee.student?.guardianDetails?.phone;
                setIsPaymentModalOpen(false);
                setPaymentData({ installmentId: "", amount: "", method: "cash", transactionId: "", collectedBy: "", notes: "" });
                fetchFees(); // Refresh list to update balance/status

                if (sendWhatsAppReceipt && studentPhone) {
                    toast.success("Payment recorded! Sending WhatsApp PDF receipt...");
                    fetch('/api/v1/messaging/whatsapp/send-receipt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'fee', id: feeId })
                    }).then(r => r.json()).then(data => {
                        if (data.success) {
                            toast.success(`WhatsApp receipt PDF dispatched via ${data.provider}!`);
                        }
                    }).catch(err => {
                        console.warn('Auto WhatsApp receipt dispatch error:', err);
                    });
                } else {
                    toast.success("Payment recorded successfully");
                }
            } else {
                let errorMessage = "Failed to record payment";
                try {
                    const error = await res.json();
                    errorMessage = error.error || errorMessage;
                } catch (e) { /* ignore parse error */ }

                toast.error(errorMessage);
            }
        } catch (err) {
            console.error(err);
            toast.error("Network error while recording payment");
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    const openPaymentModal = (fee) => {
        setSelectedFee(fee);
        
        // Find next pending installment
        const nextPending = fee?.installments?.find(i => i.status === 'pending');
        
        setPaymentData({
            installmentId: nextPending ? nextPending._id : "adhoc",
            amount: nextPending 
                ? nextPending.amount.toString() 
                : (fee.totalAmount - (fee.paidAmount || 0)).toString(),
            method: "cash",
            transactionId: "",
            collectedBy: "",
            notes: "",
            date: format(new Date(), "yyyy-MM-dd"),
            nextDueDate: "",
            penaltyPaid: nextPending?.penaltyAmount ? nextPending.penaltyAmount.toString() : ""
        });
        fetchCollectors();
        setIsPaymentModalOpen(true);
    };

    // No longer needed client-side filtering as we do it on the server
    const filteredFees = fees;



     const handleExport = (formatType = 'xlsx') => {
         if (!filteredFees.length) {
             toast.error("No data to export");
             return;
         }

         const dataToExport = filteredFees.map(fee => {
             const baseAmount = fee.totalAmount || 0;
             const discount = fee.discount?.amount || 0;
             const extraCharges = fee.extraCharges?.amount || 0;
             const grossAmount = baseAmount - discount + extraCharges;
             const paidAmount = fee.paidAmount || 0;
             const balanceAmount = fee.balanceAmount || 0;
             const pendingInstallment = fee.installments?.find(i => i.status === 'pending');

             return {
                 "Student Name": `${fee.student?.profile?.firstName || ''} ${fee.student?.profile?.lastName || ''}`.trim(),
                 "Enrollment No": fee.student?.enrollmentNumber || "N/A",
                 "Batch": fee.batch?.name || "N/A",
                 "Base Fee": baseAmount,
                 "Discount (-)": discount,
                 "Discount Reason": fee.discount?.reason || "N/A",
                 "Extra Charges (+)": extraCharges,
                 "Charges Reason": fee.extraCharges?.reason || "N/A",
                 "Total Gross": grossAmount,
                 "Paid Amount": paidAmount,
                 "Balance Amount": balanceAmount,
                 "Payment %": grossAmount > 0 ? Math.round((paidAmount / grossAmount) * 100) : 0,
                 "Status": balanceAmount <= 0 ? "Paid" : "Pending",
                 "Pending Installments": fee.installments?.filter(i => i.status === 'pending').length || 0,
                 "Next Due Date": pendingInstallment?.dueDate ? format(new Date(pendingInstallment.dueDate), 'yyyy-MM-dd') : "N/A"
             };
         });

         const worksheet = XLSX.utils.json_to_sheet(dataToExport);
         const workbook = XLSX.utils.book_new();
         XLSX.utils.book_append_sheet(workbook, worksheet, "Fee Ledger");

         // Auto-width columns (Enterprise Polish)
         if (formatType === 'xlsx') {
             worksheet["!cols"] = [
                 { wch: 25 }, // Student Name
                 { wch: 18 }, // Enrollment No
                 { wch: 18 }, // Batch
                 { wch: 12 }, // Base Fee
                 { wch: 12 }, // Discount (-)
                 { wch: 20 }, // Discount Reason
                 { wch: 12 }, // Extra Charges (+)
                 { wch: 20 }, // Charges Reason
                 { wch: 12 }, // Total Gross
                 { wch: 12 }, // Paid Amount
                 { wch: 12 }, // Balance Amount
                 { wch: 12 }, // Payment %
                 { wch: 12 }, // Status
                 { wch: 15 }, // Pending Installments
                 { wch: 16 }  // Next Due Date
             ];
         }

         const fileName = `Fee_Ledger_Export_${format(new Date(), 'yyyy-MM-dd')}.${formatType}`;
         XLSX.writeFile(workbook, fileName);
         toast.success(`Export started (${formatType.toUpperCase()})`);
     };

    // Summary calculation is now done on the server via fetchStats()
    // No need for client-side reduce useEffect
    return (
        <div className="space-y-6">
            {/* Page Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Fee Ledger</h1>
                    <p className="text-[12px] text-slate-400 font-medium tracking-tight">Track incoming payments and financial status</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('csv')}
                        className="flex items-center gap-2"
                    >
                        <span className="font-mono text-xs font-bold">CSV</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('xlsx')}
                        className="flex items-center gap-2"
                    >
                        <DollarSign size={14} className="text-emerald-600" />
                        <span>Export Excel</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsManageHeadsModalOpen(true)}
                        className="flex items-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                        <Layers size={14} className="text-blue-600" />
                        <span>Manage Fee Heads</span>
                    </Button>
                    <Link href="/admin/fees/presets">
                        <Button
                            variant="primary"
                            size="sm"
                            className="flex items-center gap-2 bg-premium-blue hover:bg-premium-blue/90"
                        >
                            <Settings size={14} />
                            <span>Manage Presets</span>
                        </Button>
                    </Link>
                </div>
            </div>


            {/* Report Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-slate-50/70 border border-slate-200/70 rounded-lg p-4 transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Gross</p>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">₹{(summary.totalGross || 0).toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-slate-200/60 rounded-md text-slate-700">
                            <DollarSign size={18} />
                        </div>
                    </div>
                </div>
                <div className="bg-rose-50/70 border border-rose-100/70 rounded-lg p-4 transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-rose-600/80 uppercase tracking-wider">Total Discount</p>
                            <h3 className="text-2xl font-bold text-rose-600 mt-1">₹{(summary.totalDiscount || 0).toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-rose-100/80 rounded-md text-rose-600">
                            <XCircle size={18} />
                        </div>
                    </div>
                </div>
                <div className="bg-orange-50/70 border border-orange-100/70 rounded-lg p-4 transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-orange-600/80 uppercase tracking-wider">Extra Charges</p>
                            <h3 className="text-2xl font-bold text-orange-600 mt-1">₹{(summary.extraCharges || 0).toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-orange-100/80 rounded-md text-orange-600">
                            <AlertCircle size={18} />
                        </div>
                    </div>
                </div>
                <div className="bg-emerald-50/70 border border-emerald-100/70 rounded-lg p-4 transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-emerald-600/80 uppercase tracking-wider">Total Collected</p>
                            <h3 className="text-2xl font-bold text-emerald-600 mt-1">₹{(summary.totalCollected || 0).toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-emerald-100/80 rounded-md text-emerald-600">
                            <CheckCircle size={18} />
                        </div>
                    </div>
                </div>
                <div className="bg-amber-50/70 border border-amber-100/70 rounded-lg p-4 transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-amber-600/80 uppercase tracking-wider">Total Pending</p>
                            <h3 className="text-2xl font-bold text-amber-600 mt-1">₹{(summary.totalPending || 0).toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-amber-100/80 rounded-md text-amber-600">
                            <AlertCircle size={18} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-[#F9FAFB] border-b border-slate-100">
                    <div className="flex-1 max-w-sm relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search student..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-md pl-9 pr-4 py-2 outline-none focus:border-slate-400 transition-colors text-xs font-medium"
                        />
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <Select
                            className="w-full md:w-48"
                            value={selectedCourse}
                            onChange={(val) => setSelectedCourse(val)}
                            options={[
                                { label: `All ${isSchool ? "Classes" : "Courses"}`, value: "" },
                                ...(isVocational && courseBundles.filter(b => b.isActive !== false).length > 0 ? [
                                    { label: "── 🎁 PACKAGES ──", value: "hdr_bundles", disabled: true },
                                    ...courseBundles.filter(b => b.isActive !== false).map(b => ({ label: `🎁 ${b.title}`, value: b._id })),
                                    { label: "── COURSES ──", value: "hdr_courses", disabled: true },
                                ] : []),
                                ...courses.map(c => ({ label: c.name, value: c._id }))
                            ]}
                            placeholder={isSchool ? "Filter Class" : "Filter Course"}
                        />
                        <Select
                            className="w-full md:w-48"
                            value={selectedBatch}
                            onChange={(val) => setSelectedBatch(val)}
                            options={[
                                { label: `All ${isSchool ? "Sections" : "Batches"}`, value: "" },
                                ...batches.map(b => {
                                    const cName = b.course?.name || courses.find(c => String(c._id) === String(b.course?._id || b.course))?.name;
                                    return { label: cName ? `${cName} - ${b.name}` : b.name, value: b._id };
                                })
                            ]}
                            disabled={!selectedCourse}
                            placeholder={isSchool ? "Filter Section" : "Filter Batch"}
                        />
                        <Select
                            className="w-full md:w-40"
                            value={percentageFilter}
                            onChange={(val) => setPercentageFilter(val)}
                            options={[
                                { label: "All", value: "" },
                                { label: "≤ 25%", value: "25" },
                                { label: "≤ 50%", value: "50" },
                                { label: "≤ 70%", value: "70" }
                            ]}
                            placeholder="Payment %"
                        />
                    </div>
                </div>
                <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-300 text-premium-blue focus:ring-premium-blue/20"
                                checked={showOverdueOnly}
                                onChange={(e) => setShowOverdueOnly(e.target.checked)}
                            />
                            Show Overdue Only
                        </label>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-300 text-slate-500 focus:ring-slate-300/20"
                                checked={showCancelledOnly}
                                onChange={(e) => setShowCancelledOnly(e.target.checked)}
                            />
                            Show Cancelled
                        </label>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-300 text-premium-blue focus:ring-premium-blue/20"
                                checked={showDiscountedOnly}
                                onChange={(e) => setShowDiscountedOnly(e.target.checked)}
                            />
                            Show Discounted
                        </label>
                    </div>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-mono text-xs">
                        {filteredFees.length} records
                    </Badge>
                </div>
                <div>
                    {(() => {
                        const startIndex = (currentPage - 1) * rowsPerPage;
                        const paginatedFees = fees;

                        if (loading) return <LoadingSpinner />;
                        if (filteredFees.length === 0) {
                            return (
                                <EmptyState
                                    icon={CreditCard}
                                    title="No fee records found"
                                    description="Fee records are created when students are admitted."
                                />
                            );
                        }

                        return (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-white border-y border-slate-200/80 text-xs font-semibold text-slate-400">
                                                 <th className="px-6 py-3.5 uppercase tracking-wider">Student</th>
                                                 <th className="px-6 py-3.5 uppercase tracking-wider">{isSchool ? "Section" : "Batch"}</th>
                                                 <th className="px-6 py-3.5 uppercase tracking-wider text-right">Total Fee</th>
                                                 <th className="px-6 py-3.5 uppercase tracking-wider text-right">Discount</th>
                                                 <th className="px-6 py-3.5 uppercase tracking-wider text-right">Extra Charges</th>
                                                 <th className="px-6 py-3.5 uppercase tracking-wider text-right">Paid</th>
                                                 <th className="px-6 py-3.5 uppercase tracking-wider text-right">Balance</th>
                                                 <th className="px-6 py-3.5 uppercase tracking-wider text-right">Actions</th>
                                             </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {paginatedFees.map((fee) => (
                                                <tr key={fee._id || fee.student?._id} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                                                {fee.student?.profile?.firstName} {fee.student?.profile?.lastName}
                                                                {fee.student?.hostelInfo && (
                                                                    <span className={cn(
                                                                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0",
                                                                        fee.student.hostelInfo.isCombined
                                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                            : fee.student.hostelInfo.balanceAmount > 0 
                                                                                ? "bg-rose-50 text-rose-600 border-rose-100" 
                                                                                : "bg-indigo-50 text-indigo-600 border-indigo-100"
                                                                    )} title={fee.student.hostelInfo.isCombined ? "Combined Base Fee Mode Active" : `Hostel Balance: ₹${fee.student.hostelInfo.balanceAmount}`}>
                                                                        {fee.student.hostelInfo.isCombined ? "Combined Base Fee" : (fee.student.hostelInfo.balanceAmount > 0 ? "Hostel Dues" : "Hostel")}
                                                                    </span>
                                                                )}
                                                            </p>
                                                            <p className="text-xs font-mono text-slate-400">{fee.student?.enrollmentNumber}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                                                                {fee.batch?.course?.code ? `${fee.batch.course.code} / ${fee.batch.name}` : (fee.batch?.name || "-")}
                                                            </span>
                                                            {fee.batch?.semester && (
                                                                <span className="px-1.5 py-0.2 text-[10px] bg-blue-50 text-blue-700 font-bold rounded border border-blue-200">
                                                                    Sem {fee.batch.semester}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-sm font-semibold text-slate-700 font-mono">
                                                        <div>₹{fee.totalAmount?.toLocaleString()}</div>
                                                        {fee.components && fee.components.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedBreakdownFee(fee)}
                                                                className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:text-blue-800 underline font-sans mt-0.5 font-normal cursor-pointer"
                                                            >
                                                                <span>{fee.components.filter(c => !c.isWaived).length} heads</span>
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-sm font-semibold text-rose-600 font-mono">
                                                         ₹{fee.discount?.amount?.toLocaleString() || 0}
                                                     </td>
                                                     <td className="px-6 py-4 text-right text-sm font-semibold text-amber-600 font-mono">
                                                         ₹{fee.extraCharges?.amount?.toLocaleString() || 0}
                                                     </td>
                                                     <td className="px-6 py-4 text-right text-sm font-semibold text-emerald-600 font-mono">
                                                         ₹{fee.paidAmount?.toLocaleString()}
                                                     </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {!fee.hasFeeRecord ? (
                                                            <Badge className="bg-slate-100 text-slate-500 border-slate-200">
                                                                No fee profile
                                                            </Badge>
                                                        ) : fee.status === 'cancelled' ? (
                                                            <Badge className="bg-slate-100 text-slate-500 border-slate-200">
                                                                Cancelled
                                                            </Badge>
                                                        ) : (
                                                            <>
                                                                <div className={`text-sm font-bold ${fee.balanceAmount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                                    ₹{fee.balanceAmount?.toLocaleString()}
                                                                </div>
                                                                {fee.installments?.some(i => i.status === 'pending' && new Date(i.dueDate) < new Date()) && (
                                                                    <Badge className="mt-1 bg-rose-100 text-rose-600 border-rose-200">
                                                                        Overdue
                                                                    </Badge>
                                                                )}
                                                            </>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => openPaymentModal(fee)}
                                                                className="border-slate-200 hover:border-premium-blue hover:text-premium-blue"
                                                                disabled={loading || fee.status === 'cancelled'}
                                                            >
                                                                <DollarSign size={14} className="mr-1" /> Pay
                                                            </Button>
                                                            {fee.hasFeeRecord && fee.status !== 'cancelled' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                                                    onClick={async () => {
                                                                        if (!await confirm({
                                                                            title: "Cancel Fee?",
                                                                            message: "This will set the total to match the amount paid, waive all pending installments, and mark the fee as cancelled. This action cannot be undone.",
                                                                            type: "danger"
                                                                        })) return;

                                                                        try {
                                                                            const res = await fetch(`/api/v1/fees/${fee._id}/cancel`, { method: 'POST' });
                                                                            if (res.ok) {
                                                                                toast.success("Fee cancelled successfully");
                                                                                fetchFees();
                                                                            } else {
                                                                                const err = await res.json().catch(() => ({}));
                                                                                toast.error(err.error || "Failed to cancel fee");
                                                                            }
                                                                        } catch (e) {
                                                                            console.error(e);
                                                                            toast.error("Error cancelling fee");
                                                                        }
                                                                    }}
                                                                >
                                                                    <XCircle size={14} />
                                                                </Button>
                                                            )}
                                                            {fee.hasFeeRecord && fee.status !== 'cancelled' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                                    onClick={async () => {
                                                                        if (!await confirm({
                                                                            title: "Delete Fee Record?",
                                                                            message: "This will soft-delete the fee record. It will be removed from all views.",
                                                                            type: "danger"
                                                                        })) return;

                                                                        try {
                                                                            const res = await fetch(`/api/v1/fees/${fee._id}`, { method: 'DELETE' });
                                                                            if (res.ok) {
                                                                                toast.success("Fee record deleted");
                                                                                fetchFees();
                                                                            } else {
                                                                                const err = await res.json().catch(() => ({}));
                                                                                toast.error(err.error || "Failed to delete");
                                                                            }
                                                                        } catch (e) {
                                                                            console.error(e);
                                                                            toast.error("Error deleting fee");
                                                                        }
                                                                    }}
                                                                >
                                                                    <Trash2 size={14} />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50">
                                        <span className="text-xs text-slate-500 font-medium">
                                            Showing {startIndex + 1}–{Math.min(startIndex + rowsPerPage, totalRecords)} of {totalRecords}
                                        </span>
                                        <div className="flex gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                disabled={currentPage === 1}
                                                onClick={() => setCurrentPage(p => p - 1)}
                                                className="text-xs"
                                            >
                                                Prev
                                            </Button>
                                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                                                .map((p, idx, arr) => (
                                                    <span key={p} className="flex items-center">
                                                        {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-slate-400">...</span>}
                                                        <Button
                                                            size="sm"
                                                            variant={p === currentPage ? "default" : "ghost"}
                                                            onClick={() => setCurrentPage(p)}
                                                            className={`text-xs ${p === currentPage ? 'bg-premium-blue text-white' : ''}`}
                                                        >
                                                            {p}
                                                        </Button>
                                                    </span>
                                                ))
                                            }
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                disabled={currentPage === totalPages}
                                                onClick={() => setCurrentPage(p => p + 1)}
                                                className="text-xs"
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>

{/* Fee Heads Breakdown Modal */}
            <Modal
                isOpen={Boolean(selectedBreakdownFee)}
                onClose={() => setSelectedBreakdownFee(null)}
                title="Fee Components Breakdown"
            >
                {selectedBreakdownFee && (
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex justify-between items-center text-xs">
                            <div>
                                <div className="font-bold text-slate-800">
                                    {selectedBreakdownFee.student?.profile?.firstName} {selectedBreakdownFee.student?.profile?.lastName}
                                </div>
                                <div className="text-slate-500 font-mono text-[11px]">
                                    {selectedBreakdownFee.batch?.name || selectedBreakdownFee.student?.enrollmentNumber}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] uppercase font-bold text-slate-400">Total Fee</div>
                                <div className="text-base font-bold text-slate-900 font-mono">
                                    ₹{selectedBreakdownFee.totalAmount?.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                            {(selectedBreakdownFee.components || []).map((comp, idx) => (
                                <div key={idx} className={`p-3 flex items-center justify-between text-xs ${comp.isWaived ? 'bg-slate-50 opacity-60' : 'bg-white'}`}>
                                    <div>
                                        <div className={`font-semibold text-slate-800 ${comp.isWaived ? 'line-through' : ''}`}>
                                            {comp.name}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded uppercase font-mono">
                                                {comp.category || 'other'}
                                            </span>
                                            {comp.isWaived && (
                                                <span className="text-[10px] text-rose-600 font-medium">
                                                    (Waived: {comp.waivedReason || 'Opted out'})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`font-bold font-mono text-slate-800 ${comp.isWaived ? 'line-through' : ''}`}>
                                        ₹{(comp.amount || 0).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button variant="outline" size="sm" onClick={() => setSelectedBreakdownFee(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Manage Fee Heads Modal (Apply to Whole Class or Certain Members) */}
            <Modal
                isOpen={isManageHeadsModalOpen}
                onClose={() => setIsManageHeadsModalOpen(false)}
                title="Manage Section Fee Heads"
                className="max-w-xl"
            >
                <form onSubmit={handleBulkAssignSubmit} className="space-y-4">
                    <p className="text-xs text-slate-500">
                        Add or remove specific fee components (such as Books, Uniforms, or Kits) for an entire section or selective students.
                    </p>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Select Section / Class Batch</label>
                        <Select
                            value={manageHeadsData.batchId}
                            onChange={(val) => {
                                setManageHeadsData(prev => ({ ...prev, batchId: val, studentIds: [] }));
                                fetchStudentsForBatch(val);
                            }}
                            options={[
                                { label: "-- Select Section / Batch --", value: "" },
                                ...batches.map(b => ({ label: b.name, value: b._id }))
                            ]}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Fee Head</label>
                            <Select
                                value={manageHeadsData.feeHeadId}
                                onChange={(val) => {
                                    const head = feeHeadsList.find(h => h._id === val);
                                    setManageHeadsData(prev => ({
                                        ...prev,
                                        feeHeadId: val,
                                        customName: head ? head.name : "",
                                        category: head ? head.category : "other"
                                    }));
                                }}
                                options={[
                                    { label: "-- Choose Fee Head --", value: "" },
                                    ...feeHeadsList.map(h => ({ label: `${h.name} (${h.category})`, value: h._id }))
                                ]}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Action</label>
                            <Select
                                value={manageHeadsData.action}
                                onChange={(val) => setManageHeadsData(prev => ({ ...prev, action: val }))}
                                options={[
                                    { label: "Apply / Charge Fee", value: "apply" },
                                    { label: "Remove / Waive Fee", value: "remove" }
                                ]}
                            />
                        </div>
                    </div>

                    {manageHeadsData.action === "apply" && (
                        <Input
                            id="headAmount"
                            label="Component Amount (₹)"
                            type="number"
                            placeholder="e.g. 3000"
                            value={manageHeadsData.amount}
                            onChange={(e) => setManageHeadsData(prev => ({ ...prev, amount: e.target.value }))}
                        />
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Apply To</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setManageHeadsData(prev => ({ ...prev, target: "all" }))}
                                className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-all ${manageHeadsData.target === 'all' ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-semibold' : 'border-slate-200 text-slate-600'}`}
                            >
                                Entire Section (All Students)
                            </button>
                            <button
                                type="button"
                                onClick={() => setManageHeadsData(prev => ({ ...prev, target: "selected" }))}
                                className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-all ${manageHeadsData.target === 'selected' ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-semibold' : 'border-slate-200 text-slate-600'}`}
                            >
                                Selected Students Only
                            </button>
                        </div>
                    </div>

                    {manageHeadsData.target === "selected" && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-slate-700">Select Students ({manageHeadsData.studentIds.length} selected):</span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setManageHeadsData(prev => ({ ...prev, studentIds: batchStudentsList.map(s => s._id) }))}
                                        className="text-blue-600 hover:underline text-[11px]"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setManageHeadsData(prev => ({ ...prev, studentIds: [] }))}
                                        className="text-slate-500 hover:underline text-[11px]"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>

                            {loadingBatchStudents ? (
                                <div className="text-center py-4 text-xs text-slate-400">Loading section students...</div>
                            ) : batchStudentsList.length === 0 ? (
                                <div className="text-center py-4 text-xs text-slate-400 border border-dashed rounded-lg">
                                    No students found. Please select a valid section.
                                </div>
                            ) : (
                                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 divide-y divide-slate-100 bg-slate-50/40">
                                    {batchStudentsList.map(s => {
                                        const isChecked = manageHeadsData.studentIds.includes(s._id);
                                        return (
                                            <label key={s._id} className="flex items-center gap-2.5 py-1.5 px-2 hover:bg-slate-100/70 rounded cursor-pointer text-xs">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setManageHeadsData(prev => ({
                                                            ...prev,
                                                            studentIds: checked
                                                                ? [...prev.studentIds, s._id]
                                                                : prev.studentIds.filter(id => id !== s._id)
                                                        }));
                                                    }}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="font-medium text-slate-800">{s.name}</span>
                                                <span className="text-[10px] text-slate-400 font-mono ml-auto">{s.enrollmentNumber}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    <Input
                        id="headReason"
                        label="Reason / Audit Note (Optional)"
                        placeholder="e.g. Sibling uniform reuse, Opted out of textbook pack"
                        value={manageHeadsData.reason}
                        onChange={(e) => setManageHeadsData(prev => ({ ...prev, reason: e.target.value }))}
                    />

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setIsManageHeadsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmittingManageHeads} className="flex-1 bg-premium-blue text-white">
                            {isSubmittingManageHeads ? "Updating..." : manageHeadsData.action === "apply" ? "Apply Fee Head" : "Remove Fee Head"}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                title="Record Payment"
            >
                {selectedFee && (() => {
                    const selectedInst = selectedFee.installments?.find(i => i._id === paymentData.installmentId);
                    return (
                        <div className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Student</p>
                                <p className="font-bold text-slate-700">{selectedFee.student?.profile?.firstName} {selectedFee.student?.profile?.lastName}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] uppercase font-bold text-slate-400">Current Balance</p>
                                <p className="font-bold text-amber-600 text-lg">₹{selectedFee.balanceAmount?.toLocaleString()}</p>
                            </div>
                        </div>

                        <form onSubmit={handleRecordPayment} className="space-y-5">
                            <div className="space-y-1.5">
                                <Select
                                    value={paymentData.installmentId}
                                    onChange={(val) => {
                                        const inst = selectedFee.installments.find(i => i._id === val);
                                        let amt = "";
                                        let pen = "";
                                        if (val === "adhoc") {
                                            amt = (selectedFee.totalAmount - (selectedFee.paidAmount || 0)).toString();
                                        } else if (inst) {
                                            amt = inst.amount.toString();
                                            pen = inst.penaltyAmount ? inst.penaltyAmount.toString() : "";
                                        }
                                        setPaymentData({
                                            ...paymentData,
                                            installmentId: val,
                                            amount: amt,
                                            penaltyPaid: pen
                                        });
                                    }}
                                    options={[
                                        { label: "-- Select Installment --", value: "" },
                                        { label: "+ Record New / Ad-hoc Payment", value: "adhoc" },
                                        ...selectedFee.installments
                                            .filter(i => i.status !== 'paid')
                                            .map((inst) => ({
                                                label: `Installment - ₹${inst.amount} (Due: ${format(new Date(inst.dueDate), 'MMM d')})`,
                                                value: inst._id
                                            }))
                                    ]}
                                />
                            </div>

                            {selectedInst?.penaltyAmount > 0 && (
                                <div className="bg-amber-50 border border-amber-200/60 text-amber-800 rounded-xl p-3.5 text-xs font-medium space-y-1">
                                    <div className="font-bold flex justify-between">
                                        <span>⚠️ Overdue Penalty Notice</span>
                                        <span className="font-black text-rose-600">₹{selectedInst.penaltyAmount} Pending</span>
                                    </div>
                                    <p className="text-[10px] text-amber-600/90 font-medium">This installment is past due. A late fee penalty of ₹{selectedInst.penaltyAmount} has accrued.</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    id="paymentDate"
                                    label="Payment Date"
                                    type="date"
                                    value={paymentData.date}
                                    onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                                    required
                                />
                                <Input
                                    id="nextDueDate"
                                    label="Next Due Date (Remaining Balance)"
                                    type="date"
                                    value={paymentData.nextDueDate}
                                    onChange={(e) => setPaymentData({ ...paymentData, nextDueDate: e.target.value })}
                                    placeholder="Optional"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1">
                                    <Input
                                        id="amount"
                                        label="Amount Received (₹)"
                                        type="number"
                                        value={paymentData.amount}
                                        onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="col-span-1">
                                    <Input
                                        id="penaltyPaid"
                                        label="Penalty Received (₹)"
                                        type="number"
                                        placeholder="Optional"
                                        value={paymentData.penaltyPaid}
                                        onChange={(e) => setPaymentData({ ...paymentData, penaltyPaid: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-1 space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">Payment Method</label>
                                    <Select
                                        value={paymentData.method}
                                        onChange={(val) => setPaymentData({ ...paymentData, method: val })}
                                        options={[
                                            { label: "Cash", value: "cash" },
                                            { label: "UPI", value: "upi" },
                                            { label: "Card", value: "card" },
                                            { label: "Bank Transfer", value: "bank_transfer" },
                                            { label: "Cheque", value: "cheque" }
                                        ]}
                                    />
                                </div>
                            </div>

                            <Input
                                id="transactionId"
                                label="Transaction ID / Ref No."
                                placeholder="Optional"
                                value={paymentData.transactionId}
                                onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                            />

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">Collected By</label>
                                <Select
                                    value={paymentData.collectedBy}
                                    onChange={(val) => setPaymentData({ ...paymentData, collectedBy: val })}
                                    options={[
                                        { label: "Select Collector", value: "" },
                                        ...collectors.map(c => ({ label: c.name, value: c.name }))
                                    ]}
                                    required
                                />
                            </div>

                            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={sendWhatsAppReceipt}
                                    onChange={(e) => setSendWhatsAppReceipt(e.target.checked)}
                                    className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 cursor-pointer"
                                />
                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                                    <MessageCircle size={15} className="text-emerald-600 shrink-0" />
                                    <span>Send WhatsApp Receipt PDF to student / guardian upon payment</span>
                                </div>
                            </label>

                            <div className="pt-2 flex gap-3">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmittingPayment} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20">
                                    {isSubmittingPayment ? "Recording..." : "Record Payment"}
                                </Button>
                            </div>
                        </form>
                    </div>
                );
            })()}
            </Modal>
        </div >
    );
}

