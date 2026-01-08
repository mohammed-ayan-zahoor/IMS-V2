"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import {
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    BookOpen,
    CreditCard,
    ArrowLeft,
    Shield,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Edit,
    Trash2,
    FileText,
    Percent,
    Tag
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

export default function StudentDetailsPage({ params }) {
    const router = useRouter();
    const toast = useToast();
    const confirm = useConfirm();
    const { id } = use(params);

    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("profile");


    // Enrollment Modal State
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [courseBatches, setCourseBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState("");

    // Payment Modal State
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [selectedFee, setSelectedFee] = useState(null);
    const [paymentData, setPaymentData] = useState({
        amount: "",
        method: "cash",
        reference: "",
        notes: "",
        collectedBy: "",
        date: format(new Date(), "yyyy-MM-dd")
    });
    const [collectors, setCollectors] = useState([]);

    const [isDeleting, setIsDeleting] = useState(false);
    const [deletingFeeId, setDeletingFeeId] = useState(null);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        profile: { firstName: "", lastName: "", phone: "", dateOfBirth: "", address: {} },
        guardianDetails: { name: "", relation: "", phone: "" }
    });


    // Attendance State
    const [attendanceData, setAttendanceData] = useState([]);
    const [attendanceStats, setAttendanceStats] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        if (activeTab === "attendance") {
            fetchAttendance();
        }
    }, [activeTab, currentMonth]);

    const fetchAttendance = async () => {
        try {
            const month = currentMonth.getMonth() + 1;
            const year = currentMonth.getFullYear();
            const res = await fetch(`/api/v1/attendance/students/${id}?month=${month}&year=${year}`);
            const data = await res.json();
            setAttendanceData(data.attendance || []);
            setAttendanceStats(data.stats || null);
        } catch (error) {
            console.error("Failed to fetch attendance", error);
        }
    };

    const handleMonthChange = (direction) => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + direction);
            return newDate;
        });
    };

    useEffect(() => {
        if (isEnrollModalOpen && courses.length === 0) {
            fetchCourses();
        }
    }, [isEnrollModalOpen]);

    useEffect(() => {
        if (selectedCourse) {
            fetchBatchesForCourse(selectedCourse);
        } else {
            setCourseBatches([]);
        }
    }, [selectedCourse]);

    const fetchStudentDetails = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/v1/students/${id}`);
            if (!res.ok) throw new Error("Failed to fetch student");
            const data = await res.json();
            setStudentData(data);

            // Populate form data for editing with normalized address
            if (data.student) {
                const defaultAddress = { street: "", city: "", state: "", pincode: "" };
                setFormData({
                    email: data.student.email,
                    profile: {
                        ...data.student.profile,
                        address: { ...defaultAddress, ...(data.student.profile?.address || {}) },
                        avatar: data.student.profile?.avatar || ""
                    },
                    guardianDetails: data.student.guardianDetails || { name: "", relation: "", phone: "" }
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudentDetails();
        const controller = new AbortController();
        fetchCollectors(controller.signal);
        return () => controller.abort();
    }, [id]);

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

    const fetchCourses = async () => {
        try {
            const res = await fetch("/api/v1/courses");
            const data = await res.json();
            setCourses(data.courses || []);
        } catch (error) {
            console.error("Failed to fetch courses", error);
        }
    };

    const fetchBatchesForCourse = async (courseId) => {
        try {
            const res = await fetch(`/api/v1/batches?courseId=${courseId}`);
            const data = await res.json();
            setCourseBatches(data.batches || []);
        } catch (error) {
            console.error("Failed to fetch batches", error);
        }
    };

    const handleEnrollStudent = async (e) => {
        e.preventDefault();
        if (!selectedBatch) return;

        try {
            setIsEnrolling(true);
            const res = await fetch(`/api/v1/students/${id}/enroll`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ batchId: selectedBatch })
            });

            if (res.ok) {
                setIsEnrollModalOpen(false);
                setSelectedBatch("");
                setSelectedCourse("");
                fetchStudentDetails();
                toast.success("Student enrolled successfully!");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to enroll student");
            }
        } catch (error) {
            toast.error("Enrollment failed");
        } finally {
            setIsEnrolling(false);
        }
    };

    const handleUnenrollStudent = async (batchId, batchName) => {
        if (await confirm({
            title: "Unenroll Student?",
            message: `Are you sure you want to remove this student from batch "${batchName}"? WARNING: This will DELETE all fee records and payment history associated with this batch.`,
            type: "danger"
        })) {
            try {
                const res = await fetch(`/api/v1/students/${id}/enroll?batchId=${batchId}`, {
                    method: "DELETE"
                });

                if (res.ok) {
                    toast.success("Student unenrolled successfully");
                    fetchStudentDetails();
                } else {
                    const err = await res.json();
                    toast.error(err.error || "Failed to unenroll student");
                }
            } catch (error) {
                console.error("Unenroll error:", error);
                toast.error("Failed to unenroll student");
            }
        }
    };

    const handleDeleteFee = async (feeId, amountPaid) => {
        if (deletingFeeId) return;

        const paid = amountPaid ?? 0;
        const warning = paid > 0
            ? `WARNING: This fee has a paid amount of ₹${paid}. Deleting it will remove this financial record forever.`
            : "Are you sure you want to delete this fee record?";

        if (await confirm({
            title: "Delete Fee Record?",
            message: warning,
            type: "danger"
        })) {
            try {
                setDeletingFeeId(feeId);
                const res = await fetch(`/api/v1/fees/${feeId}`, { method: "DELETE" });
                if (res.ok) {
                    toast.success("Fee record deleted");
                    fetchStudentDetails();
                } else {
                    const err = await res.json();
                    toast.error(err.error || "Failed to delete fee");
                }
            } catch (error) {
                toast.error("Failed to delete fee");
            } finally {
                setDeletingFeeId(null);
            }
        }
    };

    const openPaymentModal = (fee) => {
        setSelectedFee(fee);
        setPaymentData({
            amount: (fee.totalAmount - (fee.paidAmount || 0)).toString(),
            method: "cash",
            reference: "",
            notes: "",
            collectedBy: "",
            date: format(new Date(), "yyyy-MM-dd")
        });
        fetchCollectors();
        setIsPayModalOpen(true);
    };

    const [isRecordingPayment, setIsRecordingPayment] = useState(false);
    const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
    const [discountData, setDiscountData] = useState({ amount: "", reason: "" });
    const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

    const handleApplyDiscount = async (e) => {
        e.preventDefault();
        if (!selectedFee || selectedFee._id === "new") {
            toast.error("Please record a payment first to create a fee record before applying a discount.");
            return;
        }

        const amount = parseFloat(discountData.amount);
        if (isNaN(amount) || amount <= 0 || !Number.isFinite(amount)) {
            toast.error("Please enter a valid discount amount greater than zero.");
            return;
        }

        const paidAmount = selectedFee.paidAmount || 0;
        const totalAmount = selectedFee.totalAmount || 0;
        const maxAllowedDiscount = totalAmount - paidAmount;

        if (amount > maxAllowedDiscount) {
            toast.error(`Discount cannot exceed the remaining balance of ₹${maxAllowedDiscount.toLocaleString()}.`);
            return;
        }

        try {
            setIsApplyingDiscount(true);
            const res = await fetch(`/api/v1/fees/${selectedFee._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    discount: {
                        amount: amount,
                        reason: discountData.reason
                    }
                })
            });

            if (res.ok) {
                setIsDiscountModalOpen(false);
                fetchStudentDetails();
                toast.success("Discount applied successfully!");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to apply discount");
            }
        } catch (error) {
            console.error("Discount error:", error);
            toast.error(error.message || "Discount failed");
        } finally {
            setIsApplyingDiscount(false);
        }
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        if (!selectedFee) return;

        try {
            setIsRecordingPayment(true);
            let feeId = selectedFee._id;

            // 1. If this is a "virtual" fee record (no record in DB), initialize it first
            if (feeId === "new") {
                const initRes = await fetch(`/api/v1/students/${id}/enroll`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ batchId: selectedFee.batch._id })
                });

                if (!initRes.ok) {
                    const err = await initRes.json();
                    throw new Error(err.error || "Failed to initialize fee record");
                }

                const initData = await initRes.json();
                feeId = initData.fee?._id;

                if (!feeId) throw new Error("Fee record initialization failed to return ID");
            }

            // 2. Record the payment
            const res = await fetch(`/api/v1/fees/${feeId}/payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...paymentData,
                    amount: parseFloat(paymentData.amount)
                })
            });

            if (res.ok) {
                setIsPayModalOpen(false);
                fetchStudentDetails();
                toast.success("Payment recorded successfully!");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to record payment");
            }
        } catch (error) {
            console.error("Payment error:", error);
            toast.error(error.message || "Payment failed");
        } finally {
            setIsRecordingPayment(false);
        }
    };

    const handleDeleteStudent = async () => {
        if (await confirm({
            title: "Delete Student?",
            message: "Are you sure you want to permanently delete this student? This action cannot be undone.",
            type: "danger"
        })) {
            try {
                setIsDeleting(true);
                const res = await fetch(`/api/v1/students/${id}`, {
                    method: "DELETE"
                });

                if (res.ok) {
                    toast.success("Student deleted successfully");
                    router.push("/admin/students");
                } else {
                    const err = await res.json();
                    toast.error(err.error || "Failed to delete student");
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to delete student");
            } finally {
                setIsDeleting(false);
            }
        }
    };

    // Upload State
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const data = new FormData();
        data.append("file", file);
        data.append("fileType", "image");

        try {
            const res = await fetch("/api/v1/upload", {
                method: "POST",
                body: data
            });
            const json = await res.json();
            if (res.ok) {
                setFormData(prev => ({
                    ...prev,
                    profile: { ...prev.profile, avatar: json.url }
                }));
                toast.success("Photo uploaded!");
            } else {
                toast.error(json.error || "Upload failed");
            }
        } catch (err) {
            console.error(err);
            toast.error("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateStudent = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/v1/students/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsEditModalOpen(false);
                fetchStudentDetails();
                toast.success("Student profile updated successfully!");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to update profile");
            }
        } catch (error) {
            toast.error("Update failed");
        }
    };

    if (loading) return <LoadingSpinner fullPage />;
    if (!studentData) return <div className="p-10 text-center text-slate-400">Student not found</div>;

    const { student, batches, fees } = studentData;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
                    <ArrowLeft size={18} />
                    <span className="ml-2">Back</span>
                </Button>

                <div className="flex gap-3">
                    <Button
                        variant="soft"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={handleDeleteStudent}
                        disabled={isDeleting}
                    >
                        <Trash2 size={16} className="mr-2" />
                        {isDeleting ? "Deleting..." : "Delete Student"}
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setIsEditModalOpen(true)}
                    >
                        <Edit size={16} className="mr-2" />
                        Edit Profile
                    </Button>
                </div>
            </div>

            {/* Profile Header Card */}
            <Card className="border-transparent shadow-sm bg-gradient-to-r from-white to-slate-50">
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start">
                    <div className="w-24 h-24 rounded-2xl bg-premium-blue/10 flex items-center justify-center text-premium-blue text-4xl font-bold border border-premium-blue/20 shadow-blue-500/10 shadow-lg overflow-hidden shrink-0 relative group">
                        {student.profile?.avatar ? (
                            <img src={student.profile.avatar} alt={student.fullName} className="w-full h-full object-cover" />
                        ) : (
                            student.profile?.firstName?.[0]
                        )}
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Change Photo"
                        >
                            <Edit size={24} className="text-white" />
                        </button>
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{student.fullName}</h1>
                            <Badge variant={student.isActive ? "success" : "danger"} className="text-xs px-2.5 py-0.5">
                                {student.isActive ? "Active Student" : "Inactive"}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-500 font-medium mt-2">
                            <div className="flex items-center gap-2">
                                <Mail size={14} />
                                <span>{student.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Shield size={14} />
                                <span className="font-mono">{student.enrollmentNumber || "PENDING"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={14} />
                                <span>Joined {student.createdAt ? format(new Date(student.createdAt), "MMM yyyy") : "N/A"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                {/* ... existing tabs code ... */}
                <div className="flex border-t border-slate-100 px-6">
                    {["profile", "academic", "financial", "attendance"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-4 text-sm font-bold uppercase tracking-wide border-b-2 transition-all ${activeTab === tab
                                ? "border-premium-blue text-premium-blue"
                                : "border-transparent text-slate-400 hover:text-slate-600"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </Card>

            {/* Tab Content */}
            <div className="animate-fade-in">
                {activeTab === "profile" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card title="Personal Details">
                            <div className="space-y-4">
                                <InfoRow label="Phone" value={student.profile?.phone} icon={Phone} />
                                <InfoRow label="Address" value={formatAddress(student.profile?.address)} icon={MapPin} />
                                <InfoRow label="Date of Birth" value={student.profile?.dateOfBirth ? format(new Date(student.profile.dateOfBirth), "PPP") : "Not set"} icon={Calendar} />
                            </div>
                        </Card>
                        <Card title="Guardian Information">
                            <div className="space-y-4">
                                <InfoRow label="Guardian Name" value={student.guardianDetails?.name} icon={User} />
                                <InfoRow label="Relation" value={student.guardianDetails?.relation} icon={User} />
                                <InfoRow label="Contact" value={student.guardianDetails?.phone} icon={Phone} />
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === "academic" && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-lg font-bold text-slate-900">Enrolled Batches</h3>
                            <Button size="sm" onClick={() => setIsEnrollModalOpen(true)}>
                                <BookOpen size={16} className="mr-2" />
                                Enroll New Course
                            </Button>
                        </div>
                        {batches.length > 0 ? (
                            <div className="grid gap-4">
                                {batches.map(batch => (
                                    <Card key={batch._id} className="hover:border-premium-blue/30 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-violet-50 text-violet-600">
                                                    <BookOpen size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{batch.name}</h4>
                                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">{batch.course?.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant="primary" className="mb-2">{batch.enrollment?.status}</Badge>
                                                <p className="text-xs text-slate-400 mb-2">
                                                    Enrolled: {batch.enrollment?.enrolledAt
                                                        ? format(new Date(batch.enrollment.enrolledAt), "MMM d, yyyy")
                                                        : "N/A"}
                                                </p>
                                                <Button size="xs"
                                                    variant="ghost"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 px-2"
                                                    onClick={() => handleUnenrollStudent(batch._id, batch.name)}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <p className="text-slate-400 font-medium">No active enrollments found.</p>
                                <Button variant="link" className="mt-2 text-premium-blue" onClick={() => setIsEnrollModalOpen(true)}>Enroll in a course</Button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "financial" && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-slate-900 px-1">Fee & Payment Status</h3>
                        <div className="grid gap-4">
                            {batches.map(batch => {
                                const fee = fees.find(f => f.batch?._id === batch._id);
                                const originalTotal = fee?.totalAmount || batch.course?.fees?.amount || 0;
                                const discountAmount = fee?.discount?.amount || 0;
                                const totalPayable = originalTotal - discountAmount;
                                const paidAmount = fee?.paidAmount || 0;
                                const isPaid = fee?.status === 'paid';

                                return (
                                    <Card key={batch._id}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                                                    <CreditCard size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{batch.name}</h4>
                                                    <div className="flex flex-col gap-0.5">
                                                        <p className="text-xs text-slate-500">Original Total: ₹{originalTotal.toLocaleString()}</p>
                                                        {discountAmount > 0 && (
                                                            <div className="flex items-center gap-1.5">
                                                                <p className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 flex items-center gap-1">
                                                                    <Tag size={10} /> Discount: -₹{discountAmount.toLocaleString()}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <div className="text-xl font-black text-slate-900">
                                                        ₹{paidAmount.toLocaleString()}
                                                        <span className="text-xs text-slate-400 font-medium ml-1">/ {totalPayable.toLocaleString()}</span>
                                                    </div>
                                                    <p className={`text-xs font-bold ${isPaid ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                        {isPaid ? 'Fully Paid' : `Pending: ₹${Math.max(0, totalPayable - paidAmount).toLocaleString()}`}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    {fee ? (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-amber-500 hover:text-amber-700 hover:bg-amber-50"
                                                                onClick={() => {
                                                                    setSelectedFee(fee);
                                                                    setDiscountData({
                                                                        amount: fee.discount?.amount || "",
                                                                        reason: fee.discount?.reason || ""
                                                                    });
                                                                    setIsDiscountModalOpen(true);
                                                                }}
                                                                title="Apply Discount"
                                                            >
                                                                <Percent size={14} />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => handleDeleteFee(fee._id, fee.paidAmount ?? 0)}
                                                                disabled={deletingFeeId === fee._id}
                                                                aria-label="Delete Fee"
                                                            >
                                                                {deletingFeeId === fee._id ? (
                                                                    <div className="w-3 h-3 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                                                                ) : (
                                                                    <Trash2 size={14} className={isPaid ? "" : "hidden"} />
                                                                )}
                                                                {!isPaid && (deletingFeeId === fee._id ? "" : "Delete")}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => window.open(`/admin/receipts/${fee._id}`, '_blank')}
                                                                title="View Receipt"
                                                            >
                                                                <FileText size={16} className="text-slate-400 hover:text-premium-blue" />
                                                            </Button>
                                                            {!isPaid && (
                                                                <Button size="sm" variant="outline" onClick={() => openPaymentModal(fee)}>
                                                                    Pay Fee
                                                                </Button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <Button size="sm" variant="outline" onClick={() => openPaymentModal({ batch, totalAmount: originalTotal, _id: "new" })}>
                                                            Pay Fee
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                            {batches.length === 0 && (
                                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 font-medium">No active enrollments found.</p>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Enroll in a batch to see fee status</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "attendance" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-lg font-bold text-slate-900">Attendance History</h3>
                            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                                <button onClick={() => handleMonthChange(-1)} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500">
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="text-sm font-bold text-slate-700 min-w-[100px] text-center">
                                    {format(currentMonth, "MMMM yyyy")}
                                </span>
                                <button onClick={() => handleMonthChange(1)} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500">
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Stats Overview */}
                        {attendanceStats && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatsBadge label="Present" value={attendanceStats.present} total={attendanceStats.total} color="emerald" />
                                <StatsBadge label="Absent" value={attendanceStats.absent} total={attendanceStats.total} color="red" />
                                <StatsBadge label="Late" value={attendanceStats.late} total={attendanceStats.total} color="amber" />
                                <div className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center">
                                    <span className="text-xl font-black text-slate-700">
                                        {attendanceStats.total > 0
                                            ? Math.round((attendanceStats.present / attendanceStats.total) * 100)
                                            : 0}%
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Attendance Rate</span>
                                </div>
                            </div>
                        )}

                        {/* Calendar Grid */}
                        <Card className="p-6">
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                                    <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest py-2">
                                        {day}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {eachDayOfInterval({
                                    start: startOfWeek(startOfMonth(currentMonth)),
                                    end: endOfWeek(endOfMonth(currentMonth))
                                }).map((day, idx) => {
                                    // Find record for this day
                                    const record = attendanceData.find(a => isSameDay(new Date(a.date), day));
                                    const isCurrentMonth = isSameMonth(day, currentMonth);

                                    let statusColor = "bg-slate-50 text-slate-300";
                                    let icon = null;

                                    if (record) {
                                        if (record.status === 'present') {
                                            statusColor = "bg-emerald-100 text-emerald-600 border border-emerald-200";
                                            icon = <CheckCircle size={14} />;
                                        } else if (record.status === 'absent') {
                                            statusColor = "bg-rose-100 text-rose-600 border border-rose-200";
                                            icon = <XCircle size={14} />;
                                        } else if (record.status === 'late') {
                                            statusColor = "bg-amber-100 text-amber-600 border border-amber-200";
                                            icon = <Clock size={14} />;
                                        } else if (record.status === 'excused') {
                                            statusColor = "bg-blue-100 text-blue-600 border border-blue-200";
                                            icon = <AlertCircle size={14} />;
                                        }
                                    }

                                    return (
                                        <div
                                            key={idx}
                                            className={`
                                                min-h-[80px] p-2 rounded-lg flex flex-col items-start justify-between transition-all
                                                ${isCurrentMonth ? statusColor : "opacity-30 bg-slate-50"}
                                            `}
                                        >
                                            <span className={`text-xs font-bold ${isCurrentMonth ? "text-slate-700" : "text-slate-300"}`}>
                                                {format(day, "d")}
                                            </span>
                                            {isCurrentMonth && record && (
                                                <div className="self-end" title={record.remarks || record.status}>
                                                    {icon}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>
                )}
            </div>


            {/* Existing Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Student Profile"
            >
                {/* ... existing form ... */}
                <form onSubmit={handleUpdateStudent} className="space-y-6">
                    {/* Personal Info */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Personal Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                id="firstName"
                                label="First Name"
                                value={formData.profile.firstName}
                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, firstName: e.target.value } })}
                                required
                            />
                            <Input
                                id="lastName"
                                label="Last Name"
                                value={formData.profile.lastName}
                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, lastName: e.target.value } })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                id="phone"
                                label="Phone Number"
                                value={formData.profile.phone}
                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, phone: e.target.value } })}
                            />

                            <div className="col-span-2 md:col-span-2 flex items-center gap-4 py-2">
                                <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden shrink-0">
                                    {formData.profile.avatar ? (
                                        <img src={formData.profile.avatar} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={24} className="text-slate-300" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Update Photo</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        disabled={uploading}
                                        className="block w-full text-sm text-slate-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-lg file:border-0
                                        file:text-xs file:font-semibold
                                        file:bg-premium-blue/10 file:text-premium-blue
                                        hover:file:bg-premium-blue/20
                                        "
                                    />
                                    {uploading && <p className="text-xs text-premium-blue mt-1">Uploading...</p>}
                                </div>
                            </div>

                            <Input
                                id="dob"
                                label="Date of Birth"
                                type="date"
                                value={formData.profile.dateOfBirth}
                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, dateOfBirth: e.target.value } })}
                            />
                        </div>

                        <div className="space-y-3 pt-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Address</label>
                            <div className="grid grid-cols-1 gap-3">
                                <Input
                                    placeholder="Street Address"
                                    value={formData.profile.address.street}
                                    onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, address: { ...formData.profile.address, street: e.target.value } } })}
                                />
                                <div className="grid grid-cols-3 gap-3">
                                    <Input
                                        placeholder="City"
                                        value={formData.profile.address.city}
                                        onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, address: { ...formData.profile.address, city: e.target.value } } })}
                                    />
                                    <Input
                                        placeholder="State"
                                        value={formData.profile.address.state}
                                        onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, address: { ...formData.profile.address, state: e.target.value } } })}
                                    />
                                    <Input
                                        placeholder="Zip/Pin"
                                        value={formData.profile.address.pincode}
                                        onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, address: { ...formData.profile.address, pincode: e.target.value } } })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Guardian Info */}
                    <div className="space-y-4 pt-2 border-t border-slate-50">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mt-2">Guardian Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                id="guardianName"
                                label="Guardian Name"
                                value={formData.guardianDetails.name}
                                onChange={(e) => setFormData({ ...formData, guardianDetails: { ...formData.guardianDetails, name: e.target.value } })}
                            />
                            <div className="space-y-1">
                                <label htmlFor="guardianRelation" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Relation</label>
                                <Select
                                    id="guardianRelation"
                                    value={formData.guardianDetails.relation}
                                    onChange={(val) => setFormData({ ...formData, guardianDetails: { ...formData.guardianDetails, relation: val } })}
                                    options={[
                                        { label: "Select Relation", value: "" },
                                        { label: "Father", value: "father" },
                                        { label: "Mother", value: "mother" },
                                        { label: "Guardian", value: "guardian" },
                                        { label: "Other", value: "other" }
                                    ]}
                                />
                            </div>
                        </div>
                        <Input
                            id="guardianPhone"
                            label="Guardian Contact"
                            value={formData.guardianDetails.phone}
                            onChange={(e) => setFormData({ ...formData, guardianDetails: { ...formData.guardianDetails, phone: e.target.value } })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                        <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Changes</Button>
                    </div>
                </form>
            </Modal>

            {/* Enrollment Modal */}
            <Modal
                isOpen={isEnrollModalOpen}
                onClose={() => setIsEnrollModalOpen(false)}
                title="Enroll in New Course"
            >
                <form onSubmit={handleEnrollStudent} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <Select
                                label="Select Course"
                                value={selectedCourse}
                                onChange={(val) => setSelectedCourse(val)}
                                options={[
                                    { label: "-- Choose a Course --", value: "" },
                                    ...courses.map(course => ({
                                        label: `${course.name} (${course.code})`,
                                        value: course._id
                                    }))
                                ]}
                            />
                        </div>

                        {selectedCourse && (
                            <div className="space-y-1 animate-fade-in">
                                <Select
                                    label="Select Batch"
                                    value={selectedBatch}
                                    onChange={(val) => setSelectedBatch(val)}
                                    options={[
                                        { label: "-- Choose a Batch --", value: "" },
                                        ...courseBatches.map(batch => {
                                            const startDate = batch.schedule?.startDate ? new Date(batch.schedule.startDate) : null;
                                            const dateStr = startDate && !isNaN(startDate) ? format(startDate, "MMM d") : "TBD";
                                            return {
                                                label: `${batch.name} (Starts: ${dateStr})`,
                                                value: batch._id
                                            };
                                        })
                                    ]}
                                />
                                {courseBatches.length === 0 && (
                                    <p className="text-xs text-amber-500 font-medium px-1">No active batches for this course.</p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                        <Button type="button" variant="ghost" onClick={() => setIsEnrollModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={!selectedBatch || isEnrolling}>
                            {isEnrolling ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                    Enrolling...
                                </>
                            ) : "Enroll Student"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Payment Modal */}
            <Modal
                isOpen={isPayModalOpen}
                onClose={() => setIsPayModalOpen(false)}
                title="Record Fee Payment"
            >
                <form onSubmit={handleRecordPayment} className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Payment For</p>
                        <p className="text-sm font-bold text-slate-900">{selectedFee?.batch?.name}</p>
                        <p className="text-xs text-slate-500">Total Due: ₹{((selectedFee?.totalAmount || 0) - (selectedFee?.paidAmount || 0)).toLocaleString()}</p>
                    </div>

                    <div className="space-y-4">
                        <Input
                            label="Payment Amount (₹)"
                            type="number"
                            value={paymentData.amount}
                            onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                            required
                            min="1"
                        />

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Payment Method</label>
                            <Select
                                value={paymentData.method}
                                onChange={(val) => setPaymentData({ ...paymentData, method: val })}
                                options={[
                                    { label: "Cash", value: "cash" },
                                    { label: "UPI / Online", value: "upi" },
                                    { label: "Bank Transfer", value: "bank_transfer" },
                                    { label: "Cheque", value: "cheque" }
                                ]}
                            />
                        </div>

                        <Input
                            label="Transaction Ref / Note (Optional)"
                            placeholder="e.g. UPI ID or Cheque No."
                            value={paymentData.reference}
                            onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                        />

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Collected By</label>
                            <Select
                                value={paymentData.collectedBy}
                                onChange={(val) => setPaymentData({ ...paymentData, collectedBy: val })}
                                options={[
                                    { label: "Select Collector", value: "" },
                                    ...collectors.map(c => ({ label: c.name, value: c._id }))
                                ]}
                                required
                            />
                        </div>
                        <Input
                            label="Payment Date"
                            type="date"
                            value={paymentData.date}
                            onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                        <Button type="button" variant="ghost" onClick={() => setIsPayModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Record Payment</Button>
                    </div>
                </form>
            </Modal>

            {/* Discount Modal */}
            <Modal
                isOpen={isDiscountModalOpen}
                onClose={() => setIsDiscountModalOpen(false)}
                title="Apply Fee Discount"
            >
                <form onSubmit={handleApplyDiscount} className="space-y-6">
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-4">
                        <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mb-1">Applying For</p>
                        <p className="text-sm font-bold text-slate-900">{selectedFee?.batch?.name}</p>
                        <p className="text-xs text-slate-500">Original Total: ₹{selectedFee?.totalAmount?.toLocaleString()}</p>
                    </div>

                    <div className="space-y-4">
                        <Input
                            label="Discount Amount (₹)"
                            type="number"
                            placeholder="Amount to deduct"
                            value={discountData.amount}
                            onChange={(e) => setDiscountData({ ...discountData, amount: e.target.value })}
                            required
                            min="0"
                            max={selectedFee?.totalAmount || 0}
                        />

                        <Input
                            label="Reason for Discount"
                            placeholder="e.g. Special Offer, Scholarship, etc."
                            value={discountData.reason}
                            onChange={(e) => setDiscountData({ ...discountData, reason: e.target.value })}
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                        <Button type="button" variant="ghost" onClick={() => setIsDiscountModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isApplyingDiscount} className="bg-amber-500 hover:bg-amber-600 border-none text-white font-bold px-4 py-2 rounded-lg">
                            {isApplyingDiscount ? "Applying..." : "Apply Discount"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div >
    );
}

function InfoRow({ label, value, icon: Icon }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                {Icon && <Icon size={14} />}
                <span>{label}</span>
            </div>
            <div className="text-sm font-bold text-slate-700 text-right">
                {value || <span className="text-slate-300 italic">Not provided</span>}
            </div>
        </div>
    );
}


function StatsBadge({ label, value, total, color }) {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    const colors = {
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
        red: "bg-red-50 text-red-600 border-red-200",
        amber: "bg-amber-50 text-amber-600 border-amber-200",
    };

    return (
        <div className={`px-4 py-2 rounded-xl border ${colors[color]} flex flex-col items-center min-w-[80px]`}>
            <span className="text-xl font-black">{value}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</span>
        </div>
    );
}

function formatAddress(addr) {
    if (!addr) return null;
    const parts = [addr.street, addr.city, addr.state, addr.pincode].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
}

