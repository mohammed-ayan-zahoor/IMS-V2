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
    Tag,
    History,
    MessageSquare,
    Plus,
    Printer,
    UserPlus,
    Lock,
    Eye,
    Download,
    UploadCloud,
    File,
    Bus,
    Route,
    Car,
    Hotel
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
import { useAcademicSession } from "@/contexts/AcademicSessionContext";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

export default function StudentDetailsPage({ params }) {
    const router = useRouter();
    const toast = useToast();
    const confirm = useConfirm();
    const { id } = use(params);
    const { data: session } = useSession();
    const { selectedSessionId } = useAcademicSession();
    const isSchool = session?.user?.institute?.type === 'SCHOOL' || session?.user?.institute?.code === 'QUANTECH';

    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("profile");

    const [transportRoutes, setTransportRoutes] = useState([]);
    const [transportVehicles, setTransportVehicles] = useState([]);
    const [transportPresets, setTransportPresets] = useState([]);
    const isTransportEnabled = session?.user?.institute?.type === 'SCHOOL' || session?.user?.institute?.features?.transport;
    const isHostelEnabled = session?.user?.institute?.features?.hostel;


    // Enrollment Modal State
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [courseBatches, setCourseBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState("");
    const [feePresets, setFeePresets] = useState([]);
    const [selectedPreset, setSelectedPreset] = useState("");

    // Payment Modal State
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [selectedFee, setSelectedFee] = useState(null);
    const [paymentData, setPaymentData] = useState({
        amount: "",
        method: "cash",
        transactionId: "", // Renamed from reference
        notes: "",
        collectedBy: "",
        date: format(new Date(), "yyyy-MM-dd"),
        nextDueDate: "",
        installmentId: "" // Added installment selection
    });
    const [collectors, setCollectors] = useState([]);

    // Installments Configuration State
    const [configureInstallments, setConfigureInstallments] = useState(false);
    const [numInstallments, setNumInstallments] = useState(3);
    const [installmentInterval, setInstallmentInterval] = useState("monthly");
    const [enrollmentInstallments, setEnrollmentInstallments] = useState([]);

    // Standalone Installments Modal State
    const [isInstallmentsModalOpen, setIsInstallmentsModalOpen] = useState(false);
    const [manageInstallmentsList, setManageInstallmentsList] = useState([]);
    const [isSavingInstallments, setIsSavingInstallments] = useState(false);

    // Dynamic Equal Split Installments Generator
    const generateEqualInstallments = (totalAmount, count, interval) => {
        if (!totalAmount || count <= 0) return [];
        const baseAmount = Math.floor(totalAmount / count);
        const cents = totalAmount % count;
        const generated = [];
        const today = new Date();
        
        for (let i = 0; i < count; i++) {
            const dueDate = new Date(today);
            if (interval === 'monthly') {
                dueDate.setMonth(dueDate.getMonth() + (i + 1));
            } else if (interval === 'quarterly') {
                dueDate.setMonth(dueDate.getMonth() + (i + 1) * 3);
            } else {
                dueDate.setDate(dueDate.getDate() + (i + 1) * 15);
            }
            
            // Add cents to the first installment to avoid fractions
            const amount = i === 0 ? baseAmount + cents : baseAmount;
            
            generated.push({
                amount: amount.toString(),
                dueDate: format(dueDate, "yyyy-MM-dd")
            });
        }
        return generated;
    };

    // Calculate total enrollment fee amount dynamically
    const getEnrollmentTotalAmount = () => {
        if (selectedPreset) {
            const preset = feePresets.find(p => p._id === selectedPreset);
            if (preset) return preset.amount;
        }
        if (selectedCourse) {
            const course = courses.find(c => c._id === selectedCourse);
            if (course) return course.fees?.amount || 0;
        }
        return 0;
    };

    // Auto-generate installments when enrollment options or amounts change
    useEffect(() => {
        if (configureInstallments) {
            const total = getEnrollmentTotalAmount();
            const generated = generateEqualInstallments(total, numInstallments, installmentInterval);
            setEnrollmentInstallments(generated);
        } else {
            setEnrollmentInstallments([]);
        }
    }, [selectedPreset, selectedCourse, configureInstallments, numInstallments, installmentInterval, courses, feePresets]);

    const handleEnrollmentInstallmentChange = (index, field, value) => {
        const updated = [...enrollmentInstallments];
        updated[index] = {
            ...updated[index],
            [field]: value
        };
        setEnrollmentInstallments(updated);
    };

    const handleManageInstallmentChange = (index, field, value) => {
        const updated = [...manageInstallmentsList];
        updated[index] = {
            ...updated[index],
            [field]: value
        };
        setManageInstallmentsList(updated);
    };

    const handleAddManageInstallment = () => {
        const today = new Date();
        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 1);
        
        setManageInstallmentsList([
            ...manageInstallmentsList,
            {
                amount: 0,
                dueDate: format(nextMonth, "yyyy-MM-dd"),
                status: "pending"
            }
        ]);
    };

    const handleDeleteManageInstallment = (index) => {
        if (manageInstallmentsList[index].status === 'paid') {
            toast.error("Cannot delete a paid installment");
            return;
        }
        const updated = manageInstallmentsList.filter((_, i) => i !== index);
        setManageInstallmentsList(updated);
    };

    const handleGenerateManageInstallments = (count, interval) => {
        if (!selectedFee || count <= 0) return;
        
        // Keep paid installments
        const paidInsts = manageInstallmentsList.filter(i => i.status === 'paid');
        const paidSum = paidInsts.reduce((sum, i) => sum + i.amount, 0);
        
        // Remaining balance to split
        const finalExpected = selectedFee.totalAmount - (selectedFee.discount?.amount || 0) + (selectedFee.extraCharges?.amount || 0);
        const remaining = Math.max(0, finalExpected - paidSum);
        
        if (remaining <= 0) {
            toast.error("Fee is already fully paid by existing installments");
            return;
        }

        // Generate count equal splits
        const baseAmount = Math.floor(remaining / count);
        const cents = remaining % count;
        const generated = [];
        const today = new Date();

        for (let i = 0; i < count; i++) {
            const dueDate = new Date(today);
            if (interval === 'monthly') {
                dueDate.setMonth(dueDate.getMonth() + (i + 1));
            } else if (interval === 'quarterly') {
                dueDate.setMonth(dueDate.getMonth() + (i + 1) * 3);
            } else {
                dueDate.setDate(dueDate.getDate() + (i + 1) * 15);
            }
            
            const amount = i === 0 ? baseAmount + cents : baseAmount;
            generated.push({
                amount: amount,
                dueDate: format(dueDate, "yyyy-MM-dd"),
                status: "pending"
            });
        }

        // Combine paid + new pending
        setManageInstallmentsList([...paidInsts, ...generated]);
        toast.success(`Generated ${count} pending installments of ₹${baseAmount.toLocaleString()}!`);
    };

    const handleSaveInstallmentPlan = async (e) => {
        e.preventDefault();
        if (!selectedFee) return;

        const finalExpected = selectedFee.totalAmount - (selectedFee.discount?.amount || 0) + (selectedFee.extraCharges?.amount || 0);
        const currentSum = manageInstallmentsList.reduce((sum, inst) => sum + (parseFloat(inst.amount) || 0), 0);
        
        const EPSILON = 0.01;
        if (Math.abs(currentSum - finalExpected) > EPSILON) {
            toast.error(`Installments sum (₹${currentSum.toLocaleString()}) must equal expected total (₹${finalExpected.toLocaleString()})`);
            return;
        }

        try {
            setIsSavingInstallments(true);
            const res = await fetch(`/api/v1/fees/${selectedFee._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    installments: manageInstallmentsList.map(i => ({
                        amount: parseFloat(i.amount),
                        dueDate: i.dueDate,
                        status: i.status || 'pending',
                        paidDate: i.paidDate,
                        paymentMethod: i.paymentMethod,
                        transactionId: i.transactionId,
                        collectedBy: i.collectedBy,
                        notes: i.notes
                    }))
                })
            });

            if (res.ok) {
                setIsInstallmentsModalOpen(false);
                fetchStudentDetails();
                toast.success("Installment plan updated successfully!");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to update installment plan");
            }
        } catch (error) {
            toast.error("Failed to save installment plan");
        } finally {
            setIsSavingInstallments(false);
        }
    };

    const [isDeleting, setIsDeleting] = useState(false);
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);
    const [deletingFeeId, setDeletingFeeId] = useState(null);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [isTransportPayment, setIsTransportPayment] = useState(false);
    const [isHostelPayment, setIsHostelPayment] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        guardianDetails: { name: "", relation: "", phone: "" },
        referredBy: "",
        
        // Identity fields
        grNumber: "",
        studentIdUdise: "",
        aadharNumber: "",
        apaarId: "",
        penNumber: "",

        // Parent fields
        fatherName: "",
        fatherPhone: "",
        fatherAadhar: "",
        motherName: "",
        motherPhone: "",
        motherAadhar: "",

        // Profile fields
        nationality: "Indian",
        motherTongue: "",
        religion: "",
        caste: "",
        subCaste: "",

        // Birth fields
        placeOfBirth: {
            city: "",
            taluka: "",
            district: "",
            state: "",
            country: "India"
        },

        // School history fields
        lastSchoolAttended: "",
        admissionDate: "",
        admissionStd: "",
        leavingDate: "",
        leavingReason: "",
        studyingSinceStandard: "",

        // Conduct fields
        progress: "Good",
        conduct: "Good",
        remarks: ""
    });

    // Document Vault State
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);
    const [uploadDocModalOpen, setUploadDocModalOpen] = useState(false);
    const [docFormData, setDocFormData] = useState({
        name: "",
        category: "Other",
        file: null,
        base64: ""
    });

    const handleDocFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) { // 10MB limit for docs
            toast.error("File size must be less than 10MB");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setDocFormData({ ...docFormData, file, base64: reader.result });
        };
        reader.readAsDataURL(file);
    };

    const handleUploadDoc = async (e) => {
        e.preventDefault();
        if (!docFormData.base64) return toast.error("Please select a file");

        setIsUploadingDoc(true);
        try {
            const res = await fetch(`/api/v1/students/${id}/documents`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: docFormData.name || docFormData.file.name,
                    base64: docFormData.base64,
                    category: docFormData.category
                })
            });

            if (res.ok) {
                await fetchStudentDetails();
                setUploadDocModalOpen(false);
                setDocFormData({ name: "", category: "Other", file: null, base64: "" });
                toast.success("Document uploaded successfully!");
            } else {
                const err = await res.json();
                toast.error(err.error || "Upload failed");
            }
        } catch (error) {
            toast.error("An error occurred during upload");
        } finally {
            setIsUploadingDoc(false);
        }
    };

    const handleDeleteDoc = async (docId) => {
        if (await confirm({
            title: "Delete Document",
            message: "Are you sure you want to delete this document? This action cannot be undone.",
            confirmText: "Delete",
            variant: "danger"
        })) {
            try {
            const res = await fetch(`/api/v1/students/${id}/documents?docId=${docId}`, {
                method: "DELETE"
            });

            if (res.ok) {
                await fetchStudentDetails();
                toast.success("Document deleted");
            } else {
                const err = await res.json();
                toast.error(err.error || "Delete failed");
            }
        } catch (error) {
            toast.error("An error occurred");
        }
    }
};


    // Attendance State
    const [attendanceData, setAttendanceData] = useState([]);
    const [attendanceStats, setAttendanceStats] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [followUps, setFollowUps] = useState([]);
    const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
    const [isSavingFollowUp, setIsSavingFollowUp] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [followUpFormData, setFollowUpFormData] = useState({
        method: "call",
        status: "pending",
        response: "",
        nextActionDate: ""
    });

    useEffect(() => {
        if (activeTab === "attendance") {
            fetchAttendance();
        } else if (activeTab === "follow-ups") {
            fetchFollowUps();
        }
    }, [activeTab, currentMonth]);

    const fetchFollowUps = async () => {
        try {
            const sessionQuery = isSchool && selectedSessionId ? `?session=${selectedSessionId}` : "";
            const res = await fetch(`/api/v1/students/${id}/follow-ups${sessionQuery}`);
            const data = await res.json();
            setFollowUps(data.followUps || []);
        } catch (error) {
            console.error("Failed to fetch follow-ups", error);
        }
    };

    const handleAddFollowUp = async (e) => {
        e.preventDefault();
        try {
            setIsSavingFollowUp(true);
            const res = await fetch(`/api/v1/students/${id}/follow-ups`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...followUpFormData,
                    session: isSchool ? selectedSessionId : null
                })
            });

            if (res.ok) {
                setIsFollowUpModalOpen(false);
                setFollowUpFormData({ method: "call", status: "pending", response: "", nextActionDate: "" });
                fetchFollowUps();
                toast.success("Follow-up logged successfully!");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to log follow-up");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsSavingFollowUp(false);
        }
    };
    useEffect(() => {
        if (activeTab === "attendance") {
            fetchAttendance();
        }
    }, [activeTab, currentMonth]);

    const fetchAttendance = async () => {
        try {
            const month = currentMonth.getMonth() + 1;
            const year = currentMonth.getFullYear();
            const sessionQuery = isSchool && selectedSessionId ? `&session=${selectedSessionId}` : "";
            const res = await fetch(`/api/v1/attendance/students/${id}?month=${month}&year=${year}${sessionQuery}`);
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
            fetchPresetsForCourse(selectedCourse);
        } else {
            setCourseBatches([]);
            setFeePresets([]);
        }
        setSelectedPreset("");
    }, [selectedCourse]);

    const fetchPresetsForCourse = async (courseId) => {
        try {
            const res = await fetch(`/api/v1/fee-presets?courseId=${courseId}`);
            if (res.ok) {
                const data = await res.json();
                setFeePresets(data.presets || []);
            }
        } catch (error) {
            console.error("Failed to fetch presets", error);
        }
    };

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
                    guardianDetails: data.student.guardianDetails || { name: "", relation: "", phone: "" },
                    referredBy: data.student.referredBy || "",
                    
                    // Metadata fields
                    grNumber: data.student.grNumber || "",
                    studentIdUdise: data.student.studentIdUdise || "",
                    aadharNumber: data.student.aadharNumber || "",
                    apaarId: data.student.apaarId || "",
                    penNumber: data.student.penNumber || "",
                    fatherName: data.student.fatherName || "",
                    fatherPhone: data.student.fatherPhone || "",
                    fatherAadhar: data.student.fatherAadhar || "",
                    motherName: data.student.motherName || "",
                    motherPhone: data.student.motherPhone || "",
                    motherAadhar: data.student.motherAadhar || "",
                    nationality: data.student.nationality || "Indian",
                    motherTongue: data.student.motherTongue || "",
                    religion: data.student.religion || "",
                    caste: data.student.caste || "",
                    subCaste: data.student.subCaste || "",
                    placeOfBirth: {
                        city: data.student.placeOfBirth?.city || "",
                        taluka: data.student.placeOfBirth?.taluka || "",
                        district: data.student.placeOfBirth?.district || "",
                        state: data.student.placeOfBirth?.state || "",
                        country: data.student.placeOfBirth?.country || "India"
                    },
                    lastSchoolAttended: data.student.lastSchoolAttended || "",
                    admissionDate: data.student.admissionDate ? format(new Date(data.student.admissionDate), "yyyy-MM-dd") : "",
                    admissionStd: data.student.admissionStd || "",
                    leavingDate: data.student.leavingDate ? format(new Date(data.student.leavingDate), "yyyy-MM-dd") : "",
                    leavingReason: data.student.leavingReason || "",
                    studyingSinceStandard: data.student.studyingSinceStandard || "",
                    progress: data.student.progress || "Good",
                    conduct: data.student.conduct || "Good",
                    remarks: data.student.remarks || "",
                    transport: {
                        isAvailing: data.student.transport?.isAvailing || false,
                        route: data.student.transport?.route || "",
                        vehicle: data.student.transport?.vehicle || "",
                        pickupStop: data.student.transport?.pickupStop || "",
                        preset: data.student.transport?.preset || "",
                        maxCycles: data.student.transport?.maxCycles || "",
                        initializeForSession: false
                    }
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
        if (isTransportEnabled) fetchTransportData();
        const controller = new AbortController();
        fetchCollectors(controller.signal);
        return () => controller.abort();
    }, [id, isTransportEnabled]);

    const fetchTransportData = async () => {
        try {
            const [rRes, vRes, pRes] = await Promise.all([
                fetch("/api/v1/transport/routes"),
                fetch("/api/v1/transport/vehicles"),
                fetch("/api/v1/transport/fee-presets")
            ]);
            const [rData, vData, pData] = await Promise.all([rRes.json(), vRes.json(), pRes.json()]);
            setTransportRoutes(rData.routes || []);
            setTransportVehicles(vData.vehicles || []);
            setTransportPresets(pData.presets || []);
        } catch (error) {
            console.error("Failed to fetch transport data:", error);
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
            let fetchedBatches = data.batches || [];
            
            // For schools, only show batches in the active session (or legacy batches with no session)
            if (isSchool && selectedSessionId) {
                fetchedBatches = fetchedBatches.filter(b => 
                    b.session?._id === selectedSessionId || 
                    b.session === selectedSessionId || 
                    !b.session
                );
            }
            
            setCourseBatches(fetchedBatches);
        } catch (error) {
            console.error("Failed to fetch batches", error);
        }
    };

    const handleEnrollStudent = async (e) => {
        e.preventDefault();
        if (!selectedBatch) return;

        try {
            setIsEnrolling(true);
            const preset = feePresets.find(p => p._id === selectedPreset);
            const totalAmount = preset ? preset.amount : (courses.find(c => c._id === selectedCourse)?.fees?.amount || 0);

            if (configureInstallments) {
                const sum = enrollmentInstallments.reduce((acc, inst) => acc + (parseFloat(inst.amount) || 0), 0);
                const EPSILON = 0.01;
                if (Math.abs(sum - totalAmount) > EPSILON) {
                    toast.error(`Installment sum (₹${sum.toLocaleString()}) must equal total fee (₹${totalAmount.toLocaleString()})`);
                    return;
                }
            }

            const res = await fetch(`/api/v1/students/${id}/enroll`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    batchId: selectedBatch,
                    customAmount: preset ? preset.amount : null,
                    presetId: selectedPreset || null,
                    installments: configureInstallments ? enrollmentInstallments.map(i => ({
                        amount: parseFloat(i.amount),
                        dueDate: i.dueDate
                    })) : null
                })
            });

            if (res.ok) {
                setIsEnrollModalOpen(false);
                setSelectedBatch("");
                setSelectedCourse("");
                setConfigureInstallments(false);
                setEnrollmentInstallments([]);
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

    const handleDeleteTransportFee = async (feeId, amountPaid) => {
        const paid = amountPaid ?? 0;
        const warning = paid > 0
            ? `WARNING: This transport fee has payments of ₹${paid}. Deleting it will cancel the student's transport service and remove financial history.`
            : "Are you sure you want to cancel the transport service and delete this fee record?";

        if (await confirm({
            title: "Cancel Transport Service?",
            message: warning,
            type: "danger"
        })) {
            try {
                const res = await fetch(`/api/v1/transport/fees/${feeId}`, { method: "DELETE" });
                if (res.ok) {
                    toast.success("Transport service cancelled and fee deleted");
                    fetchStudentDetails();
                } else {
                    const err = await res.json();
                    toast.error(err.error || "Failed to cancel service");
                }
            } catch (error) {
                toast.error("An error occurred while deleting transport fee");
            }
        }
    };

    const openPaymentModal = (fee) => {
        setIsTransportPayment(false);
        setIsHostelPayment(false);
        setSelectedFee(fee);
        
        // Find next pending installment
        const nextPending = fee?.installments?.find(i => i.status === 'pending');
        
        setPaymentData({
            amount: nextPending 
                ? nextPending.amount.toString() 
                : (fee.totalAmount - (fee.paidAmount || 0)).toString(),
            method: "cash",
            transactionId: "",
            notes: "",
            collectedBy: "",
            date: format(new Date(), "yyyy-MM-dd"),
            nextDueDate: "",
            installmentId: nextPending ? nextPending._id : "adhoc"
        });
        setIsPayModalOpen(true);
    };
 
    const openTransportPaymentModal = (fee) => {
        setIsTransportPayment(true);
        setIsHostelPayment(false);
        setSelectedFee(fee);
        
        // Find next pending installment if any
        const nextPending = fee?.installments?.find(i => i.status === 'pending');
        
        setPaymentData({
            amount: nextPending 
                ? nextPending.amount.toString() 
                : (fee.totalAmount - (fee.paidAmount || 0)).toString(),
            method: "cash",
            transactionId: "",
            notes: "",
            collectedBy: "",
            date: format(new Date(), "yyyy-MM-dd"),
            nextDueDate: "",
            installmentId: nextPending ? nextPending._id : "adhoc"
        });
        setIsPayModalOpen(true);
    };

    const openHostelPaymentModal = (fee) => {
        setIsTransportPayment(false);
        setIsHostelPayment(true);
        setSelectedFee(fee);
        
        // Find next pending or overdue installment if any
        const nextPending = fee?.installments?.find(i => i.status === 'pending' || i.status === 'overdue');
        
        setPaymentData({
            amount: nextPending 
                ? nextPending.amount.toString() 
                : (fee.balanceAmount || 0).toString(),
            method: "cash",
            transactionId: "",
            notes: "",
            collectedBy: "",
            date: format(new Date(), "yyyy-MM-dd"),
            nextDueDate: "",
            installmentId: nextPending ? nextPending._id : "adhoc"
        });
        setIsPayModalOpen(true);
    };

    const [isRecordingPayment, setIsRecordingPayment] = useState(false);
    const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
    const [discountData, setDiscountData] = useState({ amount: "", reason: "" });
    const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

    const [isExtraChargesModalOpen, setIsExtraChargesModalOpen] = useState(false);
    const [extraChargesData, setExtraChargesData] = useState({ amount: "", reason: "" });
    const [isApplyingExtraCharges, setIsApplyingExtraCharges] = useState(false);

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

    const handleAddExtraCharges = async (e) => {
        e.preventDefault();
        if (!selectedFee || selectedFee._id === "new") {
            toast.error("Please record a payment first to create a fee record before adding extra charges.");
            return;
        }

        const amount = parseFloat(extraChargesData.amount);
        if (isNaN(amount) || amount <= 0 || !Number.isFinite(amount)) {
            toast.error("Please enter a valid amount greater than zero.");
            return;
        }

        if (!extraChargesData.reason || !extraChargesData.reason.trim()) {
            toast.error("Please provide a reason for the extra charges (e.g., 'Late Fine', 'Extra Materials').");
            return;
        }

        try {
            setIsApplyingExtraCharges(true);
            const res = await fetch(`/api/v1/fees/${selectedFee._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    extraCharges: {
                        amount: amount,
                        reason: extraChargesData.reason
                    }
                })
            });

            if (res.ok) {
                setIsExtraChargesModalOpen(false);
                setExtraChargesData({ amount: "", reason: "" });
                fetchStudentDetails();
                toast.success("Extra charges added successfully!");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to add extra charges");
            }
        } catch (error) {
            console.error("Extra charges error:", error);
            toast.error(error.message || "Failed to add extra charges");
        } finally {
            setIsApplyingExtraCharges(false);
        }
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        if (!selectedFee) return;

        if (!paymentData.collectedBy) {
            toast.warning("Please select a collector before recording the payment");
            return;
        }

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
                feeId = initData.data?.fee?._id;

                if (!feeId) throw new Error("Fee record initialization failed to return ID");
            }

            // 2. Record the payment
            let baseUrl = "/api/v1/fees";
            if (isTransportPayment) {
                baseUrl = "/api/v1/transport/fees";
            } else if (isHostelPayment) {
                baseUrl = "/api/v1/hostel/allotments";
            }
            const res = await fetch(`${baseUrl}/${feeId}/payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    installmentId: paymentData.installmentId === "adhoc" || !paymentData.installmentId ? undefined : paymentData.installmentId, amount: parseFloat(paymentData.amount),
                    method: paymentData.method,
                    transactionId: paymentData.transactionId,
                    collectedBy: paymentData.collectedBy,
                    notes: paymentData.notes,
                    date: paymentData.date,
                    nextDueDate: paymentData.nextDueDate || undefined
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

    const handleToggleStatus = async () => {
        const isCurrentlyActive = studentData?.student?.isActive;
        const actionText = isCurrentlyActive ? "Disable" : "Enable";
        
        if (await confirm({
            title: `${actionText} Student?`,
            message: `Are you sure you want to ${actionText.toLowerCase()} this student? ${isCurrentlyActive ? 'They will no longer be able to log in.' : 'They will regain access to their account.'}`,
            type: isCurrentlyActive ? "danger" : "info",
            confirmText: `Confirm ${actionText}`
        })) {
            try {
                setIsTogglingStatus(true);
                const res = await fetch(`/api/v1/students/${id}/status`, {
                    method: "PATCH"
                });

                if (res.ok) {
                    toast.success(`Student ${actionText.toLowerCase()}d successfully`);
                    fetchStudentDetails();
                } else {
                    const err = await res.json();
                    toast.error(err.error || `Failed to ${actionText.toLowerCase()} student`);
                }
            } catch (error) {
                console.error(error);
                toast.error(`Failed to ${actionText.toLowerCase()} student`);
            } finally {
                setIsTogglingStatus(false);
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

    const handleResetPassword = async () => {
        if (await confirm({
            title: "Reset Password?",
            message: "Are you sure you want to reset this student's password to the default institution password? (Student@123)",
            type: "warning",
            confirmText: "Yes, Reset Password"
        })) {
            try {
                setIsResettingPassword(true);
                const res = await fetch(`/api/v1/users/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password: "Student@123" })
                });

                if (res.ok) {
                    toast.success("Password has been reset to Student@123");
                } else {
                    const err = await res.json();
                    toast.error(err.error || "Failed to reset password");
                }
            } catch (error) {
                console.error("Reset error:", error);
                toast.error("Failed to reset password");
            } finally {
                setIsResettingPassword(false);
            }
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
                    {['admin', 'super_admin'].includes(session?.user?.role) && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                className={student?.isActive ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}
                                onClick={handleToggleStatus}
                                disabled={isTogglingStatus}
                            >
                                {student?.isActive ? <XCircle size={16} className="mr-2" /> : <CheckCircle size={16} className="mr-2" />}
                                {isTogglingStatus ? "Processing..." : (student?.isActive ? "Disable Student" : "Enable Student")}
                            </Button>
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
                        </>
                    )}
                    {session?.user?.role !== 'instructor' && (
                        <>
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-slate-600 border-slate-200 hover:bg-slate-50"
                                onClick={handleResetPassword}
                                disabled={isResettingPassword}
                            >
                                <Lock size={16} className="mr-2 text-slate-400" />
                                {isResettingPassword ? "Resetting..." : "Reset Password"}
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => setIsEditModalOpen(true)}
                            >
                                <Edit size={16} className="mr-2" />
                                Edit Profile
                            </Button>
                        </>
                    )}
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
                    {["profile", "academic", "financial", "attendance", "follow-ups", "documents"]
                        .filter(tab => {
                            if (tab === 'financial' && session?.user?.role === 'instructor') return false;
                            if (tab === 'follow-ups' && ['student', 'instructor'].includes(session?.user?.role)) return false;
                            return true;
                        })
                        .map((tab) => (
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                                <div className="space-y-6">
                                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Contact & Address</h3>
                                        </div>
                                        <div className="p-5 space-y-1">
                                            <InfoRow icon={Mail} label="Email Address" value={student.email} />
                                            <InfoRow icon={Phone} label="Phone Number" value={student.profile?.phone} />
                                            <InfoRow icon={MapPin} label="Street Address" value={student.profile?.address?.street} />
                                            <InfoRow icon={MapPin} label="City" value={student.profile?.address?.city} />
                                            <InfoRow icon={MapPin} label="State & Pin" value={`${student.profile?.address?.state || ''} ${student.profile?.address?.pincode || ''}`} />
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Identity & Academic IDs</h3>
                                        </div>
                                        <div className="p-5 space-y-1">
                                            <InfoRow icon={Shield} label="G.R. Number" value={student.grNumber} />
                                            <InfoRow icon={CreditCard} label="Aadhar Number" value={student.aadharNumber} />
                                            <InfoRow icon={FileText} label="U-DISE Student ID" value={student.studentIdUdise} />
                                            <InfoRow icon={Percent} label="APAAR ID" value={student.apaarId} />
                                            <InfoRow icon={Tag} label="PEN Number" value={student.penNumber} />
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Birth & Origin</h3>
                                        </div>
                                        <div className="p-5 space-y-1">
                                            <InfoRow icon={Calendar} label="Date of Birth" value={student.profile?.dateOfBirth ? format(new Date(student.profile.dateOfBirth), "dd MMM yyyy") : null} />
                                            <InfoRow icon={Shield} label="Blood Group" value={student.profile?.bloodGroup} />
                                            <InfoRow icon={MapPin} label="Place of Birth" value={student.placeOfBirth?.city} />
                                            <InfoRow icon={MapPin} label="Taluka/District" value={`${student.placeOfBirth?.taluka || ''} / ${student.placeOfBirth?.district || ''}`} />
                                            <InfoRow icon={MapPin} label="State (Birth)" value={student.placeOfBirth?.state} />
                                            <InfoRow icon={User} label="Nationality" value={student.nationality} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Parents Info</h3>
                                        </div>
                                        <div className="p-5 space-y-1">
                                            <InfoRow icon={User} label="Father's Name" value={student.fatherName} />
                                            <InfoRow icon={Phone} label="Father's Phone" value={student.fatherPhone} />
                                            <InfoRow icon={CreditCard} label="Father's Aadhar" value={student.fatherAadhar} />
                                            <InfoRow icon={User} label="Mother's Name" value={student.motherName} />
                                            <InfoRow icon={Phone} label="Mother's Phone" value={student.motherPhone} />
                                            <InfoRow icon={CreditCard} label="Mother's Aadhar" value={student.motherAadhar} />
                                            <InfoRow icon={UserPlus} label="Relation (Primary)" value={student.guardianDetails?.relation} />
                                            <InfoRow icon={Phone} label="Guardian Contact" value={student.guardianDetails?.phone} />
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Cultural Profile</h3>
                                        </div>
                                        <div className="p-5 space-y-1">
                                            <InfoRow icon={MessageSquare} label="Mother Tongue" value={student.motherTongue} />
                                            <InfoRow icon={Shield} label="Religion" value={student.religion} />
                                            <InfoRow icon={FileText} label="Caste" value={student.caste} />
                                            <InfoRow icon={Tag} label="Sub-Caste" value={student.subCaste} />
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Entrance & Admission</h3>
                                        </div>
                                        <div className="p-5 space-y-1">
                                            <InfoRow icon={Calendar} label="Admission Date" value={student.admissionDate ? format(new Date(student.admissionDate), "dd MMM yyyy") : null} />
                                            <InfoRow icon={BookOpen} label="Admission Std" value={student.admissionStd} />
                                            <InfoRow icon={History} label="Last School" value={student.lastSchoolAttended} />
                                            <InfoRow icon={UserPlus} label="Referred By" value={student.referredBy} />
                                    </div>
                                </div>

                                {isTransportEnabled && student.transport?.isAvailing && (
                                    <div className="premium-card p-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                                                <Car size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900">Transport Details</h3>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Active Assignment</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            <InfoRow icon={Route} label="Route" value={student.transport.route?.name || student.transport.route} />
                                            <InfoRow icon={Bus} label="Vehicle" value={student.transport.vehicle?.registrationNumber || student.transport.vehicle} />
                                            <InfoRow icon={MapPin} label="Pickup Stop" value={student.transport.pickupStop} />
                                            <InfoRow icon={CreditCard} label="Billing Plan" value={student.transport.preset?.name || student.transport.preset} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                {activeTab === "academic" && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-lg font-bold text-slate-900">{isSchool ? "Enrolled Sections" : "Enrolled Batches"}</h3>
                            <Button size="sm" onClick={() => setIsEnrollModalOpen(true)}>
                                <BookOpen size={16} className="mr-2" />
                                Enroll New {isSchool ? "Class" : "Course"}
                            </Button>
                        </div>
                        {(() => {
                            const displayBatches = isSchool && selectedSessionId
                                ? batches.filter(b => b.session?._id === selectedSessionId || b.session === selectedSessionId || !b.session)
                                : batches;

                            if (displayBatches.length > 0) {
                                return (
                                    <div className="grid gap-4">
                                        {displayBatches.map(batch => (
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
                                                    <div className="text-right flex items-center gap-2">
                                                        <Button size="sm"
                                                            variant="outline"
                                                            className="text-premium-blue border-blue-100 hover:bg-blue-50 hover:text-blue-700"
                                                            onClick={() => router.push(`/admin/students/${id}/admission-form?batchId=${batch._id}`)}
                                                        >
                                                            <Printer size={15} className="mr-2" />
                                                            Print Form
                                                        </Button>
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
                                );
                            } else {
                                return (
                                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <p className="text-slate-400 font-medium">No active enrollments found for this session.</p>
                                        <Button variant="link" className="mt-2 text-premium-blue" onClick={() => setIsEnrollModalOpen(true)}>Enroll in a {isSchool ? "class" : "course"}</Button>
                                    </div>
                                );
                            }
                        })()}
                    </div>
                )}

                {activeTab === "financial" && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-slate-900 px-1">Fee & Payment Status</h3>
                        <div className="grid gap-4">
                            {(() => {
                                const displayBatches = isSchool && selectedSessionId
                                    ? (studentData?.batches || []).filter(b => b.session?._id === selectedSessionId || b.session === selectedSessionId || !b.session)
                                    : (studentData?.batches || []);
                                
                                const displayFees = isSchool && selectedSessionId
                                    ? (studentData?.fees || []).filter(f => f.batch?.session === selectedSessionId || f.batch?.session?._id === selectedSessionId || !f.batch?.session)
                                    : (studentData?.fees || []);

                                if (displayBatches.length === 0) {
                                    return (
                                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                            <p className="text-slate-400 font-medium">No active enrollments found for this session.</p>
                                            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Enroll in a batch to see fee status</p>
                                        </div>
                                    );
                                }

                                return displayBatches.map(batch => {
                                    const fee = displayFees.find(f => f.batch?._id === batch._id);
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
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-slate-900">{batch.name}</h4>
                                                            {fee?.feePreset?.name && (
                                                                <span className="px-2 py-0.5 text-[10px] bg-blue-50 text-blue-600 rounded-full border border-blue-100 uppercase font-medium">
                                                                    {fee.feePreset.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <p className="text-xs text-slate-500">Original Total: ₹{originalTotal.toLocaleString()}</p>
                                                             {discountAmount > 0 && (
                                                                 <div className="flex items-center gap-1.5">
                                                                      <p className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 flex items-center gap-1">
                                                                          <Tag size={10} /> Discount: -₹{discountAmount.toLocaleString()}
                                                                      </p>
                                                                 </div>
                                                             )}
                                                             {fee?.extraCharges?.amount > 0 && (
                                                                 <div className="flex items-center gap-1.5">
                                                                      <p className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 flex items-center gap-1">
                                                                          <Tag size={10} /> Extra Charges: +₹{fee.extraCharges.amount.toLocaleString()}
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
                                                                    className="text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                                                                    onClick={() => {
                                                                        setSelectedFee(fee);
                                                                        setExtraChargesData({
                                                                            amount: fee.extraCharges?.amount || "",
                                                                            reason: fee.extraCharges?.reason || ""
                                                                        });
                                                                        setIsExtraChargesModalOpen(true);
                                                                    }}
                                                                    title="Add Extra Charges"
                                                                >
                                                                    <Plus size={14} />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-premium-blue hover:text-blue-700 hover:bg-blue-50"
                                                                    onClick={() => {
                                                                        setSelectedFee(fee);
                                                                        setManageInstallmentsList(fee.installments || []);
                                                                        setIsInstallmentsModalOpen(true);
                                                                    }}
                                                                    title="Manage Installment Plan"
                                                                >
                                                                    <Calendar size={14} />
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
                                                                        <Trash2 size={14} />
                                                                    )}
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

                                            {fee?.installments && fee.installments.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-slate-100/80 space-y-2">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Installment Schedule</p>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                                        {fee.installments.map((inst, index) => {
                                                            const isInstPaid = inst.status === 'paid';
                                                            const isOverdue = inst.status === 'overdue' || (inst.status === 'pending' && new Date(inst.dueDate) < new Date());
                                                            
                                                            return (
                                                                <div 
                                                                    key={inst._id || index}
                                                                    className={`p-2 rounded-xl border flex flex-col justify-between shadow-sm relative overflow-hidden transition-all ${
                                                                        isInstPaid 
                                                                            ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
                                                                            : isOverdue
                                                                                ? 'bg-rose-50/50 border-rose-100 text-rose-800 animate-pulse'
                                                                                : 'bg-slate-50/50 border-slate-100 text-slate-700'
                                                                    }`}
                                                                >
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[9px] font-bold uppercase tracking-wider bg-white/80 px-1.5 py-0.5 rounded-full border shadow-sm">
                                                                            #{index + 1}
                                                                        </span>
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                                                            isInstPaid 
                                                                                ? 'bg-emerald-500' 
                                                                                : isOverdue 
                                                                                    ? 'bg-rose-500 animate-pulse' 
                                                                                    : 'bg-slate-400'
                                                                        }`} />
                                                                    </div>
                                                                    <div className="mt-2 flex justify-between items-baseline gap-1">
                                                                        <span className="text-xs font-black">₹{inst.amount.toLocaleString()}</span>
                                                                        <span className="text-[9px] font-medium text-slate-400">
                                                                            {format(new Date(inst.dueDate), "MMM d")}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </Card>
                                    );
                                });
                            })()}
                            {batches.length === 0 && (
                                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 font-medium">No active enrollments found.</p>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Enroll in a batch to see fee status</p>
                                </div>
                            )}
                        </div>

                        {/* Transport Fees Section */}
                        {(() => {
                            const filteredTransportFees = (isSchool && selectedSessionId) 
                                ? (studentData?.transportFees || []).filter(f => f.session?._id === selectedSessionId || f.session === selectedSessionId)
                                : (studentData?.transportFees || []);
                            
                            if (!isTransportEnabled || filteredTransportFees.length === 0) return null;

                            return (
                                <div className="space-y-6 mt-8">
                                    <h3 className="text-lg font-bold text-slate-900 px-1">Transport Fees</h3>
                                    <div className="grid gap-4">
                                        {filteredTransportFees.map(fee => {
                                        const paidAmount = fee.paidAmount || 0;
                                        const totalAmount = fee.totalAmount || 0;
                                        const isPaid = fee.status === 'paid';

                                        return (
                                            <Card key={fee._id} className="border-amber-100 bg-amber-50/10">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                                                            <Bus size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-slate-900">{fee.route?.name || "Transport Fee"}</h4>
                                                                {fee.preset?.name && (
                                                                    <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-full border border-amber-200 uppercase font-medium">
                                                                        {fee.preset.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-500">Vehicle: {fee.vehicle?.registrationNumber || "N/A"}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-right">
                                                            <div className="text-xl font-black text-slate-900">
                                                                ₹{paidAmount.toLocaleString()}
                                                                <span className="text-xs text-slate-400 font-medium ml-1">/ {totalAmount.toLocaleString()}</span>
                                                            </div>
                                                            <p className={`text-xs font-bold ${isPaid ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                                {isPaid ? 'Fully Paid' : `Pending: ₹${Math.max(0, totalAmount - paidAmount).toLocaleString()}`}
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => window.open(`/admin/transport/receipts/${fee._id}`, '_blank')}
                                                                title="View Receipt"
                                                            >
                                                                <FileText size={16} className="text-slate-400 hover:text-amber-600" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleDeleteTransportFee(fee._id, fee.paidAmount ?? 0)}
                                                                title="Cancel Service & Delete Record"
                                                            >
                                                                <Trash2 size={16} className="text-slate-400 hover:text-red-600" />
                                                            </Button>
                                                            {!isPaid && (
                                                                <Button size="sm" variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-100" onClick={() => openTransportPaymentModal(fee)}>
                                                                    Pay Transport
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                        {/* Hostel Fees Section */}
                        {(() => {
                            const filteredHostelAllotments = (isSchool && selectedSessionId)
                                ? (studentData?.hostelAllotments || []).filter(a => a.session?._id === selectedSessionId || a.session === selectedSessionId)
                                : (studentData?.hostelAllotments || []);
                                
                            if (!isHostelEnabled || filteredHostelAllotments.length === 0) return null;

                            return (
                                <div className="space-y-6 mt-8">
                                    <h3 className="text-lg font-bold text-slate-900 px-1">Hostel Fees</h3>
                                    <div className="grid gap-4">
                                        {filteredHostelAllotments.map(allotment => {
                                        const paidAmount = allotment.paidAmount || 0;
                                        const totalAmount = allotment.totalAmount || 0;
                                        const isPaid = allotment.feeStatus === 'paid';

                                        return (
                                            <Card key={allotment._id} className="border-indigo-100 bg-indigo-50/10">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                                                            <Hotel size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-slate-900">
                                                                    {allotment.room?.roomNumber ? `Room ${allotment.room.roomNumber}` : 'Hostel Fee'}
                                                                </h4>
                                                                {allotment.block?.blockName && (
                                                                    <span className="px-2 py-0.5 text-[10px] bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200 uppercase font-medium">
                                                                        {allotment.block.blockName}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-500 capitalize">Billing Plan: {allotment.billingCycle} (₹{allotment.feePerCycle?.toLocaleString()}/cycle)</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-right">
                                                            <div className="text-xl font-black text-slate-900">
                                                                ₹{paidAmount.toLocaleString()}
                                                                <span className="text-xs text-slate-400 font-medium ml-1">/ {totalAmount.toLocaleString()}</span>
                                                            </div>
                                                            <p className={`text-xs font-bold ${isPaid ? 'text-emerald-500' : 'text-indigo-500'}`}>
                                                                {isPaid ? 'Fully Paid' : `Pending: ₹${Math.max(0, totalAmount - paidAmount).toLocaleString()}`}
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {!isPaid && (
                                                                <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-100" onClick={() => openHostelPaymentModal(allotment)}>
                                                                    Pay Hostel
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Render installments inside a table if there are installments */}
                                                {allotment.installments && allotment.installments.length > 0 && (
                                                    <div className="mt-4 pt-4 border-t border-slate-100 overflow-x-auto">
                                                        <table className="w-full text-left text-xs">
                                                            <thead>
                                                                <tr className="text-slate-400 uppercase font-semibold">
                                                                    <th className="pb-2">Period / Installment</th>
                                                                    <th className="pb-2">Amount</th>
                                                                    <th className="pb-2">Due Date</th>
                                                                    <th className="pb-2 text-right">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {allotment.installments.map((inst, index) => (
                                                                    <tr key={inst._id || index} className="text-slate-700">
                                                                        <td className="py-2">{inst.label}</td>
                                                                        <td className="py-2 font-semibold">₹{inst.amount?.toLocaleString()}</td>
                                                                        <td className="py-2 font-mono">
                                                                            {inst.dueDate && !isNaN(new Date(inst.dueDate)) 
                                                                                ? format(new Date(inst.dueDate), 'MMM d, yyyy') 
                                                                                : 'TBD'}
                                                                        </td>
                                                                        <td className="py-2 text-right">
                                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                                                inst.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                                                inst.status === 'overdue' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                                                'bg-amber-50 text-amber-600 border border-amber-100'
                                                                            }`}>
                                                                                {inst.status}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                    </div>
                )}

                {activeTab === "follow-ups" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <History size={20} className="text-premium-blue" />
                                Fee Follow-up History
                            </h3>
                            <Button size="sm" onClick={() => setIsFollowUpModalOpen(true)}>
                                <Plus size={16} className="mr-2" />
                                Log New Follow-up
                            </Button>
                        </div>

                        {/* Follow-up Timeline */}
                        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                            {followUps.length > 0 ? (
                                followUps.map((fu, idx) => (
                                    <div key={fu._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        {/* Icon Dot */}
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 group-[.is-active]:bg-premium-blue text-slate-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                            <MessageSquare size={16} />
                                        </div>
                                        {/* Content Card */}
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
                                            <div className="flex items-center justify-between space-x-2 mb-1">
                                                <div className="font-bold text-slate-900">{fu.staff?.fullName || 'Staff Member'}</div>
                                                <time className="font-mono text-xs text-slate-500">{format(new Date(fu.date), "MMM d, yyyy")}</time>
                                            </div>
                                            <div className="flex gap-2 mb-2">
                                                <Badge variant="soft" className="text-[10px] uppercase">{fu.method}</Badge>
                                                <Badge 
                                                    variant={fu.status === 'promised_payment' || fu.status === 'paid' ? 'success' : 'warning'} 
                                                    className="text-[10px] uppercase"
                                                >
                                                    {fu.status.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                            <div className="text-slate-600 text-sm italic">
                                                "{fu.response}"
                                            </div>
                                            {fu.nextActionDate && (
                                                <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex items-center gap-2 text-[11px] font-bold text-premium-blue">
                                                    <Calendar size={12} />
                                                    Next Follow-up: {format(new Date(fu.nextActionDate), "MMM d, yyyy")}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 font-medium">No follow-up history found.</p>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest leading-loose">
                                        Use follow-ups to track communication with students <br /> regarding pending fees and reminders.
                                    </p>
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
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <StatsBadge label="Present" value={attendanceStats.present} total={attendanceStats.total} color="emerald" />
                                <StatsBadge label="Absent" value={attendanceStats.absent} total={attendanceStats.total} color="red" />
                                <StatsBadge label="Late" value={attendanceStats.late} total={attendanceStats.total} color="amber" />
                                <StatsBadge label="Holidays" value={attendanceStats.holiday} total={attendanceStats.total} color="indigo" />
                                <div className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center">
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
                                        } else if (record.status === 'holiday') {
                                            statusColor = "bg-indigo-100 text-indigo-600 border border-indigo-200";
                                            icon = <Calendar size={14} />;
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

                {activeTab === "documents" && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between px-1">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Document Vault</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Secure storage for identity proofs and academic records
                                </p>
                            </div>
                            <Button 
                                onClick={() => setUploadDocModalOpen(true)}
                                size="sm" 
                                className="flex items-center gap-2"
                            >
                                <Plus size={16} />
                                <span>Upload Document</span>
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {studentData?.documents?.length > 0 ? (
                                studentData.documents.map((doc) => (
                                    <Card key={doc._id} className="p-0 overflow-hidden group hover:border-premium-blue/30 transition-all duration-300">
                                        <div className="p-4 flex items-start gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border",
                                                doc.category === 'Aadhar' ? "bg-blue-50 border-blue-100 text-blue-600" :
                                                doc.category === 'Marksheet' ? "bg-amber-50 border-amber-100 text-amber-600" :
                                                doc.category === 'Certificate' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                                                "bg-slate-50 border-slate-100 text-slate-400"
                                            )}>
                                                <FileText size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-slate-900 truncate" title={doc.name}>
                                                    {doc.name}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="neutral" className="text-[9px] uppercase tracking-tighter">
                                                        {doc.category}
                                                    </Badge>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                                                        {format(new Date(doc.uploadedAt), "dd MMM yyyy")}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50/50 p-2 border-t border-slate-50 flex items-center justify-end gap-1">
                                            <a 
                                                href={doc.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="p-2 text-slate-400 hover:text-premium-blue hover:bg-white rounded-lg transition-all"
                                                title="View"
                                            >
                                                <Eye size={14} />
                                            </a>
                                            <button 
                                                onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = doc.url;
                                                    link.download = doc.name;
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    document.body.removeChild(link);
                                                }}
                                                className="p-2 text-slate-400 hover:text-premium-blue hover:bg-white rounded-lg transition-all"
                                                title="Download"
                                            >
                                                <Download size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteDoc(doc._id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </Card>
                                ))
                            ) : (
                                <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-slate-200 mb-4 shadow-sm">
                                        <Shield size={32} />
                                    </div>
                                    <h4 className="text-slate-900 font-bold">No Documents Yet</h4>
                                    <p className="text-slate-400 text-xs mt-1 max-w-[200px]">
                                        Upload Aadhar, Marksheets, or Certificates for this student.
                                    </p>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="mt-6"
                                        onClick={() => setUploadDocModalOpen(true)}
                                    >
                                        <Plus size={16} className="mr-2" />
                                        Upload Your First Document
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>


            {/* Edit Profile Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Student Profile"
                size="xl"
            >
                <form onSubmit={handleUpdateStudent} className="space-y-6">
                    <EditModalContent 
                        formData={formData} 
                        setFormData={setFormData} 
                        uploading={uploading} 
                        handleFileChange={handleFileChange} 
                        courses={courses}
                        transportRoutes={transportRoutes}
                        transportVehicles={transportVehicles}
                        transportPresets={transportPresets}
                        studentData={studentData}
                        selectedSessionId={selectedSessionId}
                        isSchool={isSchool}
                    />
                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
                        <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button type="submit" size="lg">Save All Changes</Button>
                    </div>
                </form>
            </Modal>

            {/* Upload Document Modal */}
            <Modal
                isOpen={uploadDocModalOpen}
                onClose={() => setUploadDocModalOpen(false)}
                title="Upload Document"
                size="md"
            >
                <form onSubmit={handleUploadDoc} className="space-y-6">
                    <div className="space-y-4">
                        <Input
                            label="Document Name"
                            placeholder="e.g. Aadhar Card, Marksheet"
                            value={docFormData.name}
                            onChange={(e) => setDocFormData({ ...docFormData, name: e.target.value })}
                            required
                        />
                        <Select
                            label="Category"
                            value={docFormData.category}
                            onChange={(val) => setDocFormData({ ...docFormData, category: val })}
                            options={[
                                { label: "Aadhar", value: "Aadhar" },
                                { label: "Photo", value: "Photo" },
                                { label: "Marksheet", value: "Marksheet" },
                                { label: "Certificate", value: "Certificate" },
                                { label: "Birth Certificate", value: "Birth Certificate" },
                                { label: "Previous TC", value: "Previous TC" },
                                { label: "Other", value: "Other" }
                            ]}
                        />
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">File (PDF or Image)</label>
                            <div className="relative group">
                                <input 
                                    type="file" 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={handleDocFileChange}
                                    accept="image/*,.pdf"
                                />
                                <div className={cn(
                                    "p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all",
                                    docFormData.file ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200 group-hover:border-premium-blue group-hover:bg-blue-50/50"
                                )}>
                                    <UploadCloud size={32} className={cn(
                                        "mb-2",
                                        docFormData.file ? "text-emerald-500" : "text-slate-300 group-hover:text-premium-blue"
                                    )} />
                                    {docFormData.file ? (
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-emerald-700 truncate max-w-[200px]">{docFormData.file.name}</p>
                                            <p className="text-[10px] text-emerald-600 font-medium">{(docFormData.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-slate-600 tracking-tight leading-tight italic">Drag or click to browse</p>
                                            <p className="text-[10px] text-slate-400 font-medium uppercase mt-1 tracking-widest leading-loose">Max size: 10MB</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
                        <Button type="button" variant="ghost" onClick={() => setUploadDocModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isUploadingDoc}>
                            {isUploadingDoc ? <LoadingSpinner size="sm" className="mr-2" /> : <Plus size={16} className="mr-2" />}
                            {isUploadingDoc ? "Uploading..." : "Start Upload"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Enrollment Modal */}
            <Modal
                isOpen={isEnrollModalOpen}
                onClose={() => setIsEnrollModalOpen(false)}
                title={`Enroll in New ${isSchool ? "Class" : "Course"}`}
            >
                <form onSubmit={handleEnrollStudent} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <Select
                                label={`Select ${isSchool ? "Class" : "Course"}`}
                                value={selectedCourse}
                                onChange={(val) => setSelectedCourse(val)}
                                options={[
                                    { label: `-- Choose a ${isSchool ? "Class" : "Course"} --`, value: "" },
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
                                    label={`Select ${isSchool ? "Section" : "Batch"}`}
                                    value={selectedBatch}
                                    onChange={(val) => setSelectedBatch(val)}
                                    options={[
                                        { label: `-- Choose a ${isSchool ? "Section" : "Batch"} --`, value: "" },
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

                        {selectedCourse && feePresets.length > 0 && (
                            <div className="space-y-1 animate-fade-in">
                                <Select
                                    label={`Fee Structure (Optional)`}
                                    value={selectedPreset}
                                    onChange={(val) => setSelectedPreset(val)}
                                    options={[
                                        { label: "-- Use Default Fee --", value: "" },
                                        ...feePresets.map(p => {
                                            const subjectList = p.subjects?.length > 0 
                                                ? ` (${p.subjects.map(s => s.code || s.name).join(', ')})` 
                                                : '';
                                            return {
                                                label: `${p.name}${subjectList} - ₹${p.amount.toLocaleString()}`,
                                                value: p._id
                                            };
                                        })
                                    ]}
                                />
                                <p className="text-[11px] text-slate-400 italic px-1">
                                    Choose a subject combination to apply its specific fee.
                                </p>
                            </div>
                        )}

                        {selectedBatch && (
                            <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4 animate-fade-in">
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={configureInstallments}
                                        onChange={(e) => setConfigureInstallments(e.target.checked)}
                                        className="rounded border-slate-300 text-premium-blue focus:ring-premium-blue w-4 h-4"
                                    />
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Configure Installment Plan?</span>
                                </label>
                                
                                {configureInstallments && (
                                    <div className="space-y-4 pt-2 border-t border-slate-100/80 animate-fade-in">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Installments Count</label>
                                                <input 
                                                    type="number" 
                                                    min="2" 
                                                    max="12"
                                                    value={numInstallments}
                                                    onChange={(e) => setNumInstallments(Math.max(2, parseInt(e.target.value) || 2))}
                                                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl focus:border-premium-blue focus:ring-premium-blue font-bold text-slate-700"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billing Interval</label>
                                                <select
                                                    value={installmentInterval}
                                                    onChange={(e) => setInstallmentInterval(e.target.value)}
                                                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl focus:border-premium-blue focus:ring-premium-blue font-bold text-slate-700"
                                                >
                                                    <option value="monthly">Monthly</option>
                                                    <option value="quarterly">Quarterly</option>
                                                    <option value="custom">Bi-Weekly</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                                            {enrollmentInstallments.map((inst, index) => (
                                                <div key={index} className="flex gap-2 items-center p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                                                    <span className="text-[10px] font-black text-slate-400 bg-slate-50 w-5 h-5 rounded-full flex items-center justify-center border border-slate-100">
                                                        #{index + 1}
                                                    </span>
                                                    <div className="flex-1">
                                                        <input 
                                                            type="number"
                                                            value={inst.amount}
                                                            onChange={(e) => handleEnrollmentInstallmentChange(index, 'amount', e.target.value)}
                                                            placeholder="Amount"
                                                            className="w-full text-xs p-1.5 border border-slate-100 rounded-lg text-slate-700 font-bold focus:border-premium-blue focus:ring-0"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <input 
                                                            type="date"
                                                            value={inst.dueDate}
                                                            onChange={(e) => handleEnrollmentInstallmentChange(index, 'dueDate', e.target.value)}
                                                            className="w-full text-xs p-1.5 border border-slate-100 rounded-lg text-slate-700 font-medium focus:border-premium-blue focus:ring-0"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {(() => {
                                            const expected = getEnrollmentTotalAmount();
                                            const currentSum = enrollmentInstallments.reduce((sum, inst) => sum + (parseFloat(inst.amount) || 0), 0);
                                            const matches = Math.abs(currentSum - expected) < 0.01;
                                            return (
                                                <div className={`p-2.5 rounded-xl text-center text-xs font-bold border transition-colors ${
                                                    matches 
                                                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                                        : 'bg-red-50 border-red-100 text-red-700'
                                                }`}>
                                                    {matches 
                                                        ? `✓ Plan Configured Correctly! Sum matches ₹${expected.toLocaleString()}`
                                                        : `⚠ Mismatch: Split Sum is ₹${currentSum.toLocaleString()} (Must be exactly ₹${expected.toLocaleString()})`
                                                    }
                                                </div>
                                            );
                                        })()}
                                    </div>
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
                            ) : `Enroll Student`}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Manage Installments Modal */}
            <Modal
                isOpen={isInstallmentsModalOpen}
                onClose={() => setIsInstallmentsModalOpen(false)}
                title="Manage Fee Installment Plan"
            >
                <form onSubmit={handleSaveInstallmentPlan} className="space-y-6">
                    {selectedFee && (
                        <div className="space-y-4">
                            {/* Financial Summary Info */}
                            {(() => {
                                const expectedTotal = selectedFee.totalAmount - (selectedFee.discount?.amount || 0) + (selectedFee.extraCharges?.amount || 0);
                                const paidAmount = selectedFee.paidAmount || 0;
                                const unpaidRemaining = Math.max(0, expectedTotal - paidAmount);
                                
                                return (
                                    <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expected Total</p>
                                            <p className="text-sm font-black text-slate-700 mt-0.5">₹{expectedTotal.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Paid</p>
                                            <p className="text-sm font-black text-emerald-600 mt-0.5">₹{paidAmount.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unpaid Balance</p>
                                            <p className="text-sm font-black text-amber-600 mt-0.5">₹{unpaidRemaining.toLocaleString()}</p>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Split Configuration Panel */}
                            {(() => {
                                const expectedTotal = selectedFee.totalAmount - (selectedFee.discount?.amount || 0) + (selectedFee.extraCharges?.amount || 0);
                                const paidAmount = selectedFee.paidAmount || 0;
                                const unpaidRemaining = Math.max(0, expectedTotal - paidAmount);

                                if (unpaidRemaining <= 0) return null;

                                return (
                                    <div className="p-3.5 rounded-2xl border border-blue-50 bg-blue-50/10 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-premium-blue animate-pulse" />
                                            <h4 className="text-[10px] font-black text-premium-blue uppercase tracking-widest">Auto Split Remaining Balance</h4>
                                        </div>
                                        
                                        <div className="flex gap-2 items-end">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Parts</label>
                                                <input 
                                                    id="split_parts_input"
                                                    type="number"
                                                    min="1"
                                                    max="12"
                                                    defaultValue="3"
                                                    className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold"
                                                />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Interval</label>
                                                <select
                                                    id="split_interval_select"
                                                    className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold"
                                                >
                                                    <option value="monthly">Monthly</option>
                                                    <option value="quarterly">Quarterly</option>
                                                    <option value="custom">Bi-Weekly</option>
                                                </select>
                                            </div>
                                            <Button 
                                                type="button" 
                                                size="sm"
                                                className="h-[32px] px-3 font-bold text-xs"
                                                onClick={() => {
                                                    const partsVal = parseInt(document.getElementById('split_parts_input')?.value) || 3;
                                                    const intervalVal = document.getElementById('split_interval_select')?.value || 'monthly';
                                                    handleGenerateManageInstallments(partsVal, intervalVal);
                                                }}
                                            >
                                                Split
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Interactive Installment Schedules List */}
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Installment Schedule Details</label>
                                {manageInstallmentsList.map((inst, index) => {
                                    const isPaid = inst.status === 'paid';
                                    return (
                                        <div 
                                            key={index}
                                            className={`p-2.5 rounded-xl border flex gap-3 items-center shadow-sm relative transition-all ${
                                                isPaid 
                                                    ? 'bg-emerald-50/40 border-emerald-100/60' 
                                                    : 'bg-white border-slate-100'
                                            }`}
                                        >
                                            <div className="flex flex-col items-center justify-center">
                                                <span className={`text-[9px] font-black w-6 h-6 rounded-full flex items-center justify-center border ${
                                                    isPaid 
                                                        ? 'bg-emerald-100 border-emerald-200 text-emerald-700' 
                                                        : 'bg-slate-50 border-slate-200 text-slate-400'
                                                }`}>
                                                    #{index + 1}
                                                </span>
                                            </div>

                                            <div className="flex-1 grid grid-cols-2 gap-2">
                                                <div className="space-y-0.5">
                                                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Amount</span>
                                                    <input 
                                                        type="number"
                                                        value={inst.amount}
                                                        onChange={(e) => handleManageInstallmentChange(index, 'amount', e.target.value)}
                                                        disabled={isPaid}
                                                        className="w-full text-xs p-1.5 border border-slate-100 rounded-lg text-slate-700 font-black disabled:bg-slate-50 disabled:text-slate-500 focus:border-premium-blue"
                                                    />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Due Date</span>
                                                    <input 
                                                        type="date"
                                                        value={inst.dueDate ? format(new Date(inst.dueDate), "yyyy-MM-dd") : ""}
                                                        onChange={(e) => handleManageInstallmentChange(index, 'dueDate', e.target.value)}
                                                        disabled={isPaid}
                                                        className="w-full text-xs p-1.5 border border-slate-100 rounded-lg text-slate-700 font-medium disabled:bg-slate-50 disabled:text-slate-500 focus:border-premium-blue"
                                                    />
                                                </div>
                                            </div>

                                            {!isPaid ? (
                                                <Button 
                                                    type="button"
                                                    size="xs"
                                                    variant="ghost"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg"
                                                    onClick={() => handleDeleteManageInstallment(index)}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            ) : (
                                                <div className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-lg border border-emerald-200 flex items-center gap-1 uppercase">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    Paid
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {manageInstallmentsList.length === 0 && (
                                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <p className="text-slate-400 text-xs font-medium">No installments defined for this fee.</p>
                                    </div>
                                )}
                            </div>

                            {/* Add Custom Installment Action */}
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="w-full border-dashed text-premium-blue border-blue-200 hover:bg-blue-50"
                                onClick={handleAddManageInstallment}
                            >
                                <Plus size={14} className="mr-1.5" /> Add Custom Installment
                            </Button>

                            {/* Summary Match Alert */}
                            {(() => {
                                const expectedTotal = selectedFee.totalAmount - (selectedFee.discount?.amount || 0) + (selectedFee.extraCharges?.amount || 0);
                                const currentSum = manageInstallmentsList.reduce((sum, inst) => sum + (parseFloat(inst.amount) || 0), 0);
                                const matches = Math.abs(currentSum - expectedTotal) < 0.01;
                                
                                return (
                                    <div className={`p-3 rounded-xl border text-center text-xs font-bold transition-colors ${
                                        matches 
                                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                            : 'bg-red-50 border-red-100 text-red-700'
                                    }`}>
                                        {matches 
                                            ? `✓ Perfect! Total matches ₹${expectedTotal.toLocaleString()}`
                                            : `⚠ Mismatch: Sum of installments is ₹${currentSum.toLocaleString()} (Must equal expected total ₹${expectedTotal.toLocaleString()})`
                                        }
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                        <Button type="button" variant="ghost" onClick={() => setIsInstallmentsModalOpen(false)}>Cancel</Button>
                        <Button 
                            type="submit" 
                            disabled={
                                isSavingInstallments || 
                                !(() => {
                                    if (!selectedFee) return false;
                                    const expectedTotal = selectedFee.totalAmount - (selectedFee.discount?.amount || 0) + (selectedFee.extraCharges?.amount || 0);
                                    const currentSum = manageInstallmentsList.reduce((sum, inst) => sum + (parseFloat(inst.amount) || 0), 0);
                                    return Math.abs(currentSum - expectedTotal) < 0.01;
                                })()
                            }
                        >
                            {isSavingInstallments ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> : null}
                            Save Installment Plan
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Payment Modal */}
            <Modal
                isOpen={isPayModalOpen}
                onClose={() => setIsPayModalOpen(false)}
                title={isTransportPayment ? "Record Transport Fee Payment" : isHostelPayment ? "Record Hostel Fee Payment" : "Record Fee Payment"}
            >
                <form onSubmit={handleRecordPayment} className="space-y-5">
                    <div className="space-y-1.5">
                        <Select
                            label="Select Installment (Optional)"
                            value={paymentData.installmentId}
                            onChange={(val) => {
                                const inst = selectedFee?.installments?.find(i => i._id === val);
                                let amt = "";
                                if (val === "adhoc") {
                                    amt = (selectedFee.totalAmount - (selectedFee.paidAmount || 0)).toString();
                                } else if (inst) {
                                    amt = inst.amount.toString();
                                }
                                setPaymentData({
                                    ...paymentData,
                                    installmentId: val,
                                    amount: amt
                                });
                            }}
                            options={[
                                { label: "-- Select Installment --", value: "" },
                                { label: "+ Record New / Ad-hoc Payment", value: "adhoc" },
                                ...(selectedFee?.installments || [])
                                    .filter(i => i.status !== 'paid')
                                    .map((inst) => ({
                                        label: `Installment - ₹${inst.amount} (Due: ${inst.dueDate && !isNaN(new Date(inst.dueDate)) ? format(new Date(inst.dueDate), 'MMM d') : 'TBD'})`,
                                        value: inst._id
                                    }))
                            ]}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            id="amount"
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
                    </div>

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
                            label="Next Due Date"
                            type="date"
                            value={paymentData.nextDueDate}
                            onChange={(e) => setPaymentData({ ...paymentData, nextDueDate: e.target.value })}
                            placeholder="For remaining balance"
                        />
                    </div>

                    <Input
                        label="Transaction Ref / Note (Optional)"
                        placeholder="e.g. UPI ID or Cheque No."
                        value={paymentData.transactionId}
                        onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                    />

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Collected By</label>
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
                    <Input
                        label="Notes"
                        value={paymentData.notes}
                        onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                        placeholder="Additional notes..."
                    />

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

            {/* Extra Charges Modal */}
            <Modal
                isOpen={isExtraChargesModalOpen}
                onClose={() => setIsExtraChargesModalOpen(false)}
                title="Add Extra Charges"
            >
                <form onSubmit={handleAddExtraCharges} className="space-y-6">
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-4">
                        <p className="text-xs text-orange-600 font-bold uppercase tracking-wider mb-1">Applying For</p>
                        <p className="text-sm font-bold text-slate-900">{selectedFee?.batch?.name}</p>
                        <p className="text-xs text-slate-500">Current Balance: ₹{selectedFee?.balanceAmount?.toLocaleString() || 0}</p>
                    </div>

                    <div className="space-y-4">
                        <Input
                            label="Extra Charge Amount (₹)"
                            type="number"
                            placeholder="Amount to add"
                            value={extraChargesData.amount}
                            onChange={(e) => setExtraChargesData({ ...extraChargesData, amount: e.target.value })}
                            required
                            min="0"
                        />

                        <Input
                            label="Reason for Extra Charges"
                            placeholder="e.g. Late Fine, Extra Materials, Damage Fee, etc."
                            value={extraChargesData.reason}
                            onChange={(e) => setExtraChargesData({ ...extraChargesData, reason: e.target.value })}
                            required
                        />
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-700">
                        <p className="font-bold mb-1">How it works:</p>
                        <p>The extra charges will be added to the last pending installment. If all installments are paid, a new one will be created.</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                        <Button type="button" variant="ghost" onClick={() => setIsExtraChargesModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isApplyingExtraCharges} className="bg-orange-500 hover:bg-orange-600 border-none text-white font-bold px-4 py-2 rounded-lg">
                            {isApplyingExtraCharges ? "Adding..." : "Add Extra Charges"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Follow-up Modal */}
            <Modal
                isOpen={isFollowUpModalOpen}
                onClose={() => setIsFollowUpModalOpen(false)}
                title="Log Fee Follow-up"
            >
                <form onSubmit={handleAddFollowUp} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Method"
                            value={followUpFormData.method}
                            onChange={(val) => setFollowUpFormData({ ...followUpFormData, method: val })}
                            options={[
                                { label: 'Phone Call', value: 'call' },
                                { label: 'WhatsApp', value: 'whatsapp' },
                                { label: 'In-Person Visit', value: 'visit' },
                                { label: 'Email', value: 'email' },
                                { label: 'Other', value: 'other' }
                            ]}
                            required
                        />
                        <Select
                            label="Outcome Status"
                            value={followUpFormData.status}
                            onChange={(val) => setFollowUpFormData({ ...followUpFormData, status: val })}
                            options={[
                                { label: 'Pending / No Answer', value: 'pending' },
                                { label: 'Promised Payment', value: 'promised_payment' },
                                { label: 'Not Reachable', value: 'not_reachable' },
                                { label: 'Requested Callback', value: 'requested_callback' },
                                { label: 'Refused / Issue', value: 'refused' },
                                { label: 'Paid Immediately', value: 'paid' }
                            ]}
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conversation Response</label>
                        <textarea
                            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-premium-blue/20 focus:border-premium-blue outline-none min-h-[100px]"
                            placeholder="Write down what the student or parent said..."
                            value={followUpFormData.response}
                            onChange={(e) => setFollowUpFormData({ ...followUpFormData, response: e.target.value })}
                            required
                        />
                    </div>

                    <Input
                        label="Next Follow-up Date (Optional Reminder)"
                        type="date"
                        value={followUpFormData.nextActionDate}
                        onChange={(e) => setFollowUpFormData({ ...followUpFormData, nextActionDate: e.target.value })}
                    />

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            fullWidth
                            onClick={() => setIsFollowUpModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            fullWidth
                            disabled={isSavingFollowUp}
                        >
                            {isSavingFollowUp ? "Saving..." : "Save Follow-up"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function EditModalContent({ formData, setFormData, uploading, handleFileChange, courses, transportRoutes, transportVehicles, transportPresets, studentData, selectedSessionId, isSchool }) {
    const [editTab, setEditTab] = useState("basic");

    const tabClasses = (tab) => `
        flex-1 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all
        ${editTab === tab ? 'border-premium-blue text-premium-blue bg-premium-blue/5' : 'border-transparent text-slate-400 hover:bg-slate-50'}
    `;

    return (
        <div className="space-y-6">
            {/* Modal Internal Tabs */}
            <div className="flex border-b border-slate-100 -mx-6 bg-slate-50/50">
                <button type="button" onClick={() => setEditTab("basic")} className={tabClasses("basic")}>Basic Profile</button>
                <button type="button" onClick={() => setEditTab("parents")} className={tabClasses("parents")}>Parents & Origins</button>
                <button type="button" onClick={() => setEditTab("school")} className={tabClasses("school")}>School & Certificate</button>
                {courses.length === 0 && ( // Just a hacky way to check if we have transport context or use a proper prop
                     <button type="button" onClick={() => setEditTab("transport")} className={tabClasses("transport")}>Transport</button>
                )}
            </div>

            <div className="animate-fade-in py-2">
                {editTab === "basic" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="First Name"
                                value={formData.profile.firstName}
                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, firstName: e.target.value } })}
                                required
                            />
                            <Input
                                label="Last Name"
                                value={formData.profile.lastName}
                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, lastName: e.target.value } })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Phone Number"
                                value={formData.profile.phone}
                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, phone: e.target.value } })}
                            />
                            <Input
                                label="Date of Birth"
                                type="date"
                                value={formData.profile.dateOfBirth}
                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, dateOfBirth: e.target.value } })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center border border-slate-200 overflow-hidden shrink-0 shadow-sm">
                                    {formData.profile.avatar ? (
                                        <img src={formData.profile.avatar} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={24} className="text-slate-300" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Update Photo</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        disabled={uploading}
                                        className="block w-full text-xs text-slate-500 cursor-pointer file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-premium-blue file:text-white hover:file:bg-premium-blue/90"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Gender</label>
                                <Select
                                    value={formData.profile.gender}
                                    onChange={(val) => setFormData({ ...formData, profile: { ...formData.profile, gender: val } })}
                                    options={[
                                        { label: "Male", value: "Male" },
                                        { label: "Female", value: "Female" },
                                        { label: "Other", value: "Other" },
                                        { label: "Not Specified", value: "Not Specified" }
                                    ]}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Blood Group</label>
                                <Select
                                    value={formData.profile.bloodGroup}
                                    onChange={(val) => setFormData({ ...formData, profile: { ...formData.profile, bloodGroup: val } })}
                                    options={[
                                        { label: "Select", value: "" },
                                        { label: "A+", value: "A+" }, { label: "A-", value: "A-" },
                                        { label: "B+", value: "B+" }, { label: "B-", value: "B-" },
                                        { label: "AB+", value: "AB+" }, { label: "AB-", value: "AB-" },
                                        { label: "O+", value: "O+" }, { label: "O-", value: "O-" }
                                    ]}
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            <Input
                                label="Referred By"
                                value={formData.referredBy}
                                onChange={(e) => setFormData({ ...formData, referredBy: e.target.value })}
                                placeholder="How did they find us?"
                            />
                        </div>

                        <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Residential Address</h4>
                            <Input
                                placeholder="Street Address"
                                value={formData.profile.address?.street}
                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, address: { ...formData.profile.address, street: e.target.value } } })}
                            />
                            <div className="grid grid-cols-3 gap-3">
                                <Input
                                    placeholder="City"
                                    value={formData.profile.address?.city}
                                    onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, address: { ...formData.profile.address, city: e.target.value } } })}
                                />
                                <Input
                                    placeholder="State"
                                    value={formData.profile.address?.state}
                                    onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, address: { ...formData.profile.address, state: e.target.value } } })}
                                />
                                <Input
                                    placeholder="Zip/Pin"
                                    value={formData.profile.address?.pincode}
                                    onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, address: { ...formData.profile.address, pincode: e.target.value } } })}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {editTab === "parents" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4 p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><User size={12}/> Father's Details</h4>
                                <Input label="Father's Full Name" value={formData.fatherName} onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })} />
                                <Input label="Father's Phone" value={formData.fatherPhone} onChange={(e) => setFormData({ ...formData, fatherPhone: e.target.value })} />
                                <Input label="Father's Aadhar" value={formData.fatherAadhar} onChange={(e) => setFormData({ ...formData, fatherAadhar: e.target.value })} />
                            </div>
                            <div className="space-y-4 p-5 bg-pink-50/50 rounded-2xl border border-pink-100/50">
                                <h4 className="text-[10px] font-black text-pink-400 uppercase tracking-widest flex items-center gap-2"><User size={12}/> Mother's Details</h4>
                                <Input label="Mother's Full Name" value={formData.motherName} onChange={(e) => setFormData({ ...formData, motherName: e.target.value })} />
                                <Input label="Mother's Phone" value={formData.motherPhone} onChange={(e) => setFormData({ ...formData, motherPhone: e.target.value })} />
                                <Input label="Mother's Aadhar" value={formData.motherAadhar} onChange={(e) => setFormData({ ...formData, motherAadhar: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={12}/> Birth & Origin Details</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Place of Birth (City)" value={formData.placeOfBirth?.city} onChange={(e) => setFormData({ ...formData, placeOfBirth: { ...formData.placeOfBirth, city: e.target.value } })} />
                                <Input label="Taluka" value={formData.placeOfBirth?.taluka} onChange={(e) => setFormData({ ...formData, placeOfBirth: { ...formData.placeOfBirth, taluka: e.target.value } })} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <Input label="District" value={formData.placeOfBirth?.district} onChange={(e) => setFormData({ ...formData, placeOfBirth: { ...formData.placeOfBirth, district: e.target.value } })} />
                                <Input label="State" value={formData.placeOfBirth?.state} onChange={(e) => setFormData({ ...formData, placeOfBirth: { ...formData.placeOfBirth, state: e.target.value } })} />
                                <Input label="Nationality" value={formData.nationality} onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <Input label="Mother Tongue" value={formData.motherTongue} onChange={(e) => setFormData({ ...formData, motherTongue: e.target.value })} />
                                <Input label="Religion" value={formData.religion} onChange={(e) => setFormData({ ...formData, religion: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Caste" value={formData.caste} onChange={(e) => setFormData({ ...formData, caste: e.target.value })} />
                                <Input label="Sub-Caste" value={formData.subCaste} onChange={(e) => setFormData({ ...formData, subCaste: e.target.value })} />
                            </div>
                        </div>
                    </div>
                )}

                {editTab === "school" && (
                    <div className="space-y-6">
                        <div className="space-y-4 p-5 bg-premium-blue/5 rounded-2xl border border-premium-blue/10">
                            <h4 className="text-[10px] font-black text-premium-blue uppercase tracking-widest flex items-center gap-2"><Shield size={12}/> Government & Institutional IDs</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="G.R. Number" value={formData.grNumber} onChange={(e) => setFormData({ ...formData, grNumber: e.target.value })} />
                                <Input label="U-DISE Student ID" value={formData.studentIdUdise} onChange={(e) => setFormData({ ...formData, studentIdUdise: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <Input label="Student Aadhar" value={formData.aadharNumber} onChange={(e) => setFormData({ ...formData, aadharNumber: e.target.value })} />
                                <Input label="APAAR ID" value={formData.apaarId} onChange={(e) => setFormData({ ...formData, apaarId: e.target.value })} />
                                <Input label="PEN Number" value={formData.penNumber} onChange={(e) => setFormData({ ...formData, penNumber: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><BookOpen size={12}/> School Enrollment & Leaving Info</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Last School Attended" value={formData.lastSchoolAttended} onChange={(e) => setFormData({ ...formData, lastSchoolAttended: e.target.value })} />
                                <Input label="Admission Date" type="date" value={formData.admissionDate} onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Select 
                                    label="Admission Std" 
                                    value={formData.admissionStd} 
                                    onChange={(val) => setFormData({ ...formData, admissionStd: val })} 
                                    options={[
                                        { label: "Select Standard", value: "" },
                                        ...courses.map(c => ({ label: c.name, value: c.name }))
                                    ]}
                                />
                                <Input label="Studying Since (Words/Date)" value={formData.studyingSinceStandard} onChange={(e) => setFormData({ ...formData, studyingSinceStandard: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 mt-2">
                                <Input label="Date of Leaving" type="date" value={formData.leavingDate} onChange={(e) => setFormData({ ...formData, leavingDate: e.target.value })} />
                                <Input label="Reason for Leaving" value={formData.leavingReason} onChange={(e) => setFormData({ ...formData, leavingReason: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                             <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Progress</label>
                                <Select
                                    value={formData.progress}
                                    onChange={(val) => setFormData({ ...formData, progress: val })}
                                    options={[
                                        { label: "Good", value: "Good" },
                                        { label: "Fair", value: "Fair" },
                                        { label: "Satisfactory", value: "Satisfactory" },
                                        { label: "Excellent", value: "Excellent" }
                                    ]}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Conduct</label>
                                <Select
                                    value={formData.conduct}
                                    onChange={(val) => setFormData({ ...formData, conduct: val })}
                                    options={[
                                        { label: "Good", value: "Good" },
                                        { label: "Exemplary", value: "Exemplary" },
                                        { label: "Satisfactory", value: "Satisfactory" },
                                        { label: "Fair", value: "Fair" }
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {editTab === "transport" && (
                    <div className="space-y-6">
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white text-amber-600 flex items-center justify-center border border-amber-200">
                                    <Car size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">Transport Service</h4>
                                    <p className="text-xs text-slate-500">Toggle transport for this student</p>
                                </div>
                            </div>
                            <div 
                                className={`w-14 h-7 rounded-full p-1 cursor-pointer transition-all duration-300 ${formData.transport?.isAvailing ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                onClick={() => setFormData({ 
                                    ...formData, 
                                    transport: { ...formData.transport, isAvailing: !formData.transport?.isAvailing } 
                                })}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 transform ${formData.transport?.isAvailing ? 'translate-x-7' : 'translate-x-0'}`} />
                            </div>
                        </div>

                        {formData.transport?.isAvailing && (
                            <div className="space-y-4 animate-in slide-in-from-top-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Select Route</label>
                                        <Select
                                            value={formData.transport.route}
                                            onChange={(val) => setFormData({ 
                                                ...formData, 
                                                transport: { ...formData.transport, route: val, vehicle: "", pickupStop: "", preset: "" } 
                                            })}
                                            options={[
                                                { label: "Select Route", value: "" },
                                                ...(transportRoutes || []).map(r => ({ label: r.name, value: r._id }))
                                            ]}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Select Vehicle</label>
                                        <Select
                                            value={formData.transport.vehicle}
                                            onChange={(val) => setFormData({ 
                                                ...formData, 
                                                transport: { ...formData.transport, vehicle: val } 
                                            })}
                                            options={[
                                                { label: "Select Vehicle", value: "" },
                                                ...(transportVehicles || [])
                                                    .filter(v => !formData.transport.route || v.route === formData.transport.route || (v.route?._id || v.route) === formData.transport.route)
                                                    .map(v => ({ 
                                                        label: `${v.registrationNumber} (${v.type}) - ${v.currentOccupancy || 0}/${v.capacity}`, 
                                                        value: v._id,
                                                        disabled: v.currentOccupancy >= v.capacity
                                                    }))
                                            ]}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Pickup/Drop Point</label>
                                        <Select
                                            value={formData.transport.pickupStop}
                                            onChange={(val) => setFormData({ 
                                                ...formData, 
                                                transport: { ...formData.transport, pickupStop: val } 
                                            })}
                                            options={[
                                                { label: "Select Stop", value: "" },
                                                ...(transportRoutes.find(r => (r._id || r) === formData.transport.route)?.stops || [])
                                                    .map((s, idx) => ({ label: `${s.name} (${s.pickupTime})`, value: s.name, key: `${s.name}-${idx}` }))
                                            ]}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Fee Preset</label>
                                        <Select
                                            value={formData.transport.preset}
                                            onChange={(val) => {
                                                const preset = transportPresets.find(p => p._id === val);
                                                setFormData({ 
                                                    ...formData, 
                                                    transport: { 
                                                        ...formData.transport, 
                                                        preset: val,
                                                        maxCycles: preset?.maxCycles || "" 
                                                    } 
                                                });
                                            }}
                                            options={[
                                                { label: "Select Plan", value: "" },
                                                ...(transportPresets || [])
                                                    .filter(p => !formData.transport.route || !p.route || (p.route?._id || p.route) === formData.transport.route)
                                                    .map(p => ({ label: `${p.name} - ₹${p.amount}/${p.billingCycle}`, value: p._id }))
                                            ]}
                                        />
                                    </div>
                                </div>

                                {formData.transport.preset && (
                                    <div className="animate-fade-in pt-2">
                                        <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 text-amber-700">
                                                    <Calendar size={16} />
                                                    <span className="text-[11px] font-bold uppercase tracking-wider">Dynamic Billing Duration</span>
                                                </div>
                                                <Badge className="bg-amber-100 text-amber-700 border-none font-bold">Override</Badge>
                                            </div>
                                            <div className="grid grid-cols-[1fr_2fr] gap-4 items-center">
                                                <Input 
                                                    type="number"
                                                    placeholder="Cycles"
                                                    value={formData.transport.maxCycles}
                                                    onChange={(e) => setFormData({ 
                                                        ...formData, 
                                                        transport: { ...formData.transport, maxCycles: e.target.value } 
                                                    })}
                                                    className="bg-white"
                                                />
                                                <p className="text-[11px] text-amber-600/80 font-medium leading-relaxed">
                                                    Set how many months/cycles the student will be charged. 
                                                    <br/>Leave blank to use the default session length.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Session Awareness - Manual Initialization */}
                                {(() => {
                                    const hasFeeForCurrentSession = (isSchool && selectedSessionId)
                                        ? (studentData?.transportFees || []).some(f => f.session?._id === selectedSessionId || f.session === selectedSessionId)
                                        : (studentData?.transportFees || []).length > 0;

                                    if (!hasFeeForCurrentSession && formData.transport.isAvailing) {
                                        return (
                                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between animate-fade-in mt-4">
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Initialize for New Session</p>
                                                    <p className="text-[11px] text-blue-600/80 leading-relaxed max-w-[240px]">
                                                        Create a transport fee record for the currently selected session.
                                                    </p>
                                                </div>
                                                <div 
                                                    onClick={() => setFormData({ 
                                                        ...formData, 
                                                        transport: { ...formData.transport, initializeForSession: !formData.transport.initializeForSession } 
                                                    })}
                                                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ${formData.transport.initializeForSession ? 'bg-blue-600' : 'bg-slate-200'}`}
                                                >
                                                    <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 transform ${formData.transport.initializeForSession ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
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
                {value || <span className="text-slate-300 italic font-medium">Not provided</span>}
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
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-200",
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

