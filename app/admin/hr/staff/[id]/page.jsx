"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
    ArrowLeft,
    Users, 
    User,
    Mail, 
    Phone, 
    MapPin, 
    Calendar, 
    Briefcase, 
    GraduationCap, 
    Shield, 
    CreditCard, 
    FileText, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    TrendingUp, 
    TrendingDown, 
    Save, 
    Edit3, 
    Coins, 
    Receipt, 
    Eye, 
    FileSpreadsheet, 
    Plus, 
    Trash2, 
    Loader2, 
    CalendarDays, 
    Building2, 
    Check, 
    X,
    Lock,
    Unlock,
    Info,
    Printer,
    BadgeCheck,
    Camera,
    Upload
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { cn } from "@/lib/utils";

export default function StaffProfilePage({ params }) {
    const resolvedParams = use(params);
    const id = resolvedParams?.id;

    const router = useRouter();
    const toast = useToast();
    const confirm = useConfirm();

    const [activeTab, setActiveTab] = useState("details"); // 'details', 'attendance', 'salary', 'deductions', 'payslips'
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Profile Data
    const [staff, setStaff] = useState(null);
    const [attendanceMetrics, setAttendanceMetrics] = useState(null);
    const [payslips, setPayslips] = useState([]);
    const [availableComponents, setAvailableComponents] = useState([]);
    const [designations, setDesignations] = useState([]);

    // Edit Profile Modal
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [profileForm, setProfileForm] = useState({});
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const fileInputRef = useRef(null);
    const modalFileInputRef = useRef(null);

    // Salary Structure State
    const [basicSalaryInput, setBasicSalaryInput] = useState(0);
    const [earningsStructure, setEarningsStructure] = useState([]); // [{ componentId, name, amount, calculationType, defaultValue, isIncluded }]

    // Deductions State
    const [deductionsStructure, setDeductionsStructure] = useState([]); // [{ componentId, name, amount, calculationType, defaultValue, isIncluded }]

    const fetchProfile = useCallback(async (signal) => {
        try {
            const res = await fetch(`/api/v1/hr/staff/${id}`, {
                signal: signal || AbortSignal.timeout(10000)
            });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            
            const staffData = data.staff;
            setStaff(staffData);
            setAttendanceMetrics(data.attendanceMetrics);
            setPayslips(data.payslips || []);
            setAvailableComponents(data.availableComponents || []);

            // Set up Salary Structure
            const basic = Number(staffData?.hrDetails?.basicSalary || 0);
            setBasicSalaryInput(basic);

            const activeEarnings = (data.availableComponents || []).filter(c => c.type === "earning");
            const assignedEarningsMap = new Map();
            (staffData?.hrDetails?.earnings || []).forEach(e => {
                const compId = e.component?._id || e.component;
                assignedEarningsMap.set(compId?.toString(), e.amount);
            });

            const earningsList = activeEarnings.map(comp => {
                const compIdStr = comp._id.toString();
                const hasAssigned = assignedEarningsMap.has(compIdStr);
                let defaultAmt = 0;
                if (comp.calculationType === 'percentage') {
                    defaultAmt = Math.round((basic * (comp.defaultValue || 0)) / 100);
                } else {
                    defaultAmt = comp.defaultValue || 0;
                }
                const currentAmount = hasAssigned ? assignedEarningsMap.get(compIdStr) : defaultAmt;

                return {
                    componentId: comp._id,
                    name: comp.name,
                    calculationType: comp.calculationType,
                    percentageBasis: comp.percentageBasis,
                    defaultValue: comp.defaultValue,
                    isIncluded: hasAssigned || (comp.defaultValue > 0),
                    amount: currentAmount
                };
            });
            setEarningsStructure(earningsList);

            // Set up Deductions Structure
            const activeDeductions = (data.availableComponents || []).filter(c => c.type === "deduction");
            const assignedDeductionsMap = new Map();
            (staffData?.hrDetails?.deductions || []).forEach(d => {
                const compId = d.component?._id || d.component;
                assignedDeductionsMap.set(compId?.toString(), d.amount);
            });

            const deductionsList = activeDeductions.map(comp => {
                const compIdStr = comp._id.toString();
                const hasAssigned = assignedDeductionsMap.has(compIdStr);
                let defaultAmt = 0;
                if (comp.calculationType === 'percentage') {
                    defaultAmt = Math.round((basic * (comp.defaultValue || 0)) / 100);
                } else {
                    defaultAmt = comp.defaultValue || 0;
                }
                const currentAmount = hasAssigned ? assignedDeductionsMap.get(compIdStr) : defaultAmt;

                return {
                    componentId: comp._id,
                    name: comp.name,
                    calculationType: comp.calculationType,
                    percentageBasis: comp.percentageBasis,
                    defaultValue: comp.defaultValue,
                    isIncluded: hasAssigned || (comp.defaultValue > 0),
                    amount: currentAmount
                };
            });
            setDeductionsStructure(deductionsList);

            // Initialize profile form
            setProfileForm({
                firstName: staffData?.profile?.firstName || "",
                lastName: staffData?.profile?.lastName || "",
                avatar: staffData?.profile?.avatar || null,
                phone: staffData?.profile?.phone || "",
                gender: staffData?.profile?.gender || "",
                bloodGroup: staffData?.profile?.bloodGroup || "",
                dob: staffData?.profile?.dateOfBirth ? staffData.profile.dateOfBirth.split("T")[0] : "",
                role: staffData?.role || "staff",
                designation: staffData?.hrDetails?.designation?._id || staffData?.hrDetails?.designation || "",
                qualification: staffData?.hrDetails?.qualification || "",
                joiningDate: staffData?.hrDetails?.joiningDate ? staffData.hrDetails.joiningDate.split("T")[0] : "",
                allowLogin: staffData?.allowLogin !== false,
                panNumber: staffData?.hrDetails?.panNumber || "",
                uanNumber: staffData?.hrDetails?.uanNumber || "",
                esiNumber: staffData?.hrDetails?.esiNumber || "",
                bankName: staffData?.hrDetails?.bankDetails?.bankName || "",
                accountName: staffData?.hrDetails?.bankDetails?.accountName || "",
                accountNumber: staffData?.hrDetails?.bankDetails?.accountNumber || "",
                ifscCode: staffData?.hrDetails?.bankDetails?.ifscCode || "",
                branch: staffData?.hrDetails?.bankDetails?.branch || "",
                street: staffData?.profile?.address?.street || "",
                city: staffData?.profile?.address?.city || "",
                state: staffData?.profile?.address?.state || "",
                pincode: staffData?.profile?.address?.pincode || ""
            });

        } catch (error) {
            if (error.name !== "AbortError") {
                toast.error("Failed to load staff details");
            }
        } finally {
            setLoading(false);
        }
    }, [id, toast]);

    const fetchDesignations = useCallback(async () => {
        try {
            const res = await fetch("/api/v1/hr/designations");
            if (res.ok) {
                const data = await res.json();
                setDesignations(data.designations || []);
            }
        } catch (error) {
            console.error("Failed to fetch designations:", error);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchProfile(controller.signal);
        fetchDesignations();
        return () => controller.abort();
    }, [fetchProfile, fetchDesignations]);

    // Recalculate percentage based items when Basic changes
    const handleBasicSalaryChange = (newBasic) => {
        const basicVal = Math.max(0, parseFloat(newBasic) || 0);
        setBasicSalaryInput(basicVal);

        // Update earnings percentage defaults
        setEarningsStructure(prev => prev.map(item => {
            if (item.calculationType === 'percentage') {
                return {
                    ...item,
                    amount: Math.round((basicVal * (item.defaultValue || 0)) / 100)
                };
            }
            return item;
        }));

        // Update deductions percentage defaults
        setDeductionsStructure(prev => prev.map(item => {
            if (item.calculationType === 'percentage') {
                return {
                    ...item,
                    amount: Math.round((basicVal * (item.defaultValue || 0)) / 100)
                };
            }
            return item;
        }));
    };

    // Save Salary Structure
    const handleSaveSalaryStructure = async () => {
        setSaving(true);
        try {
            const activeEarningsToSave = earningsStructure
                .filter(item => item.isIncluded && Number(item.amount) > 0)
                .map(item => ({
                    component: item.componentId,
                    amount: parseFloat(item.amount) || 0
                }));

            const res = await fetch(`/api/v1/hr/staff/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    basicSalary: basicSalaryInput,
                    earnings: activeEarningsToSave
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save salary structure");

            toast.success("Salary structure saved successfully");
            setStaff(data.staff);
        } catch (error) {
            toast.error(error.message || "Failed to update salary");
        } finally {
            setSaving(false);
        }
    };

    // Save Deductions Structure
    const handleSaveDeductions = async () => {
        setSaving(true);
        try {
            const activeDeductionsToSave = deductionsStructure
                .filter(item => item.isIncluded && Number(item.amount) > 0)
                .map(item => ({
                    component: item.componentId,
                    amount: parseFloat(item.amount) || 0
                }));

            const res = await fetch(`/api/v1/hr/staff/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    deductions: activeDeductionsToSave
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save deductions");

            toast.success("Taxes & deductions saved successfully");
            setStaff(data.staff);
        } catch (error) {
            toast.error(error.message || "Failed to update deductions");
        } finally {
            setSaving(false);
        }
    };

    // Handle Photo Upload
    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please upload an image file (JPG, PNG, WebP)");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Photo size exceeds 5MB limit");
            return;
        }

        setUploadingPhoto(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileType", "image");

        try {
            const uploadRes = await fetch("/api/v1/upload", {
                method: "POST",
                body: formData
            });
            const uploadData = await uploadRes.json();
            if (!uploadRes.ok) throw new Error(uploadData.error || "Failed to upload photo");

            const imageUrl = uploadData.url;

            // Immediately persist to staff profile
            const patchRes = await fetch(`/api/v1/hr/staff/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ avatar: imageUrl })
            });
            const patchData = await patchRes.json();
            if (!patchRes.ok) throw new Error(patchData.error || "Failed to update profile photo");

            setStaff(prev => ({
                ...prev,
                profile: {
                    ...prev?.profile,
                    avatar: imageUrl
                }
            }));
            setProfileForm(prev => ({
                ...prev,
                avatar: imageUrl
            }));
            toast.success("Profile photo updated successfully!");
        } catch (err) {
            console.error("Photo upload error:", err);
            toast.error(err.message || "Failed to upload photo");
        } finally {
            setUploadingPhoto(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
            if (modalFileInputRef.current) modalFileInputRef.current.value = "";
        }
    };

    // Handle Photo Removal
    const handleRemovePhoto = async (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        const ok = await confirm({
            title: "Remove Photo",
            message: "Are you sure you want to remove this staff profile photo?",
            confirmText: "Remove",
            variant: "danger"
        });
        if (!ok) return;

        setUploadingPhoto(true);
        try {
            const patchRes = await fetch(`/api/v1/hr/staff/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ avatar: null })
            });
            const patchData = await patchRes.json();
            if (!patchRes.ok) throw new Error(patchData.error || "Failed to remove photo");

            setStaff(prev => ({
                ...prev,
                profile: {
                    ...prev?.profile,
                    avatar: null
                }
            }));
            setProfileForm(prev => ({
                ...prev,
                avatar: null
            }));
            toast.success("Profile photo removed successfully");
        } catch (err) {
            toast.error(err.message || "Failed to remove photo");
        } finally {
            setUploadingPhoto(false);
        }
    };

    // Save Profile & Banking Changes
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                firstName: profileForm.firstName.trim(),
                lastName: profileForm.lastName.trim(),
                phone: profileForm.phone.trim(),
                gender: profileForm.gender,
                bloodGroup: profileForm.bloodGroup,
                dob: profileForm.dob || null,
                role: profileForm.role,
                designation: profileForm.designation || null,
                qualification: profileForm.qualification.trim(),
                joiningDate: profileForm.joiningDate || null,
                allowLogin: !!profileForm.allowLogin,
                ...(profileForm.avatar !== undefined ? { avatar: profileForm.avatar } : {}),
                panNumber: profileForm.panNumber.trim(),
                uanNumber: profileForm.uanNumber.trim(),
                esiNumber: profileForm.esiNumber.trim(),
                bankDetails: {
                    bankName: profileForm.bankName.trim(),
                    accountName: profileForm.accountName.trim(),
                    accountNumber: profileForm.accountNumber.trim(),
                    ifscCode: profileForm.ifscCode.trim(),
                    branch: profileForm.branch.trim()
                },
                address: {
                    street: profileForm.street.trim(),
                    city: profileForm.city.trim(),
                    state: profileForm.state.trim(),
                    pincode: profileForm.pincode.trim()
                }
            };

            const res = await fetch(`/api/v1/hr/staff/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update profile");

            toast.success("Profile updated successfully");
            setStaff(data.staff);
            setIsEditProfileOpen(false);
        } catch (error) {
            toast.error(error.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    if (!staff) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <EmptyState
                    icon={User}
                    title="Staff Member Not Found"
                    description="The requested staff profile does not exist or has been removed."
                    action={
                        <Link href="/admin/hr/staff">
                            <Button className="mt-4 bg-indigo-600 text-white">Back to Staff Directory</Button>
                        </Link>
                    }
                />
            </div>
        );
    }

    const fullName = `${staff.profile?.firstName || ""} ${staff.profile?.lastName || ""}`.trim() || "Staff Member";
    const designationName = staff.hrDetails?.designation?.name || "General Staff";
    const isSyntheticEmail = staff.email?.endsWith("@ims.internal");
    const isNonLogin = staff.allowLogin === false;

    // Derived Totals
    const totalAllowances = earningsStructure
        .filter(item => item.isIncluded)
        .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const grossSalary = basicSalaryInput + totalAllowances;

    const totalDeductions = deductionsStructure
        .filter(item => item.isIncluded)
        .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const estNetSalary = Math.max(0, grossSalary - totalDeductions);

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Top Back Navigation & Quick Actions */}
            <div className="flex items-center justify-between">
                <Link
                    href="/admin/hr/staff"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Staff Directory
                </Link>

                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => setIsEditProfileOpen(true)}
                        className="text-xs flex items-center gap-1.5"
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Profile
                    </Button>
                    <Link href={`/admin/hr/payslips?staff=${staff._id}`}>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5">
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            Generate Payslip
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Main Header Profile Card */}
            <Card className="p-6 bg-gradient-to-r from-white to-slate-50/50 dark:from-gray-900 dark:to-gray-900/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        {/* Interactive Avatar with Photo Upload */}
                        <div className="relative group shrink-0">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handlePhotoUpload}
                                disabled={uploadingPhoto}
                            />
                            {staff.profile?.avatar ? (
                                <img
                                    src={staff.profile.avatar}
                                    alt={fullName}
                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white dark:border-gray-800 shadow-md ring-1 ring-gray-200 dark:ring-gray-700"
                                />
                            ) : (
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-md shrink-0">
                                    {staff.profile?.firstName?.[0]?.toUpperCase() || "S"}
                                </div>
                            )}

                            {/* Hover Camera Overlay */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingPhoto}
                                title={staff.profile?.avatar ? "Change staff photo" : "Upload staff photo"}
                                aria-label="Upload staff photo"
                                className="absolute inset-0 bg-black/40 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity backdrop-blur-[1px] cursor-pointer"
                            >
                                {uploadingPhoto ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Camera className="w-5 h-5" />
                                        <span className="text-[10px] font-semibold">Change</span>
                                    </>
                                )}
                            </button>

                            {/* Camera quick-action badge at bottom right */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingPhoto}
                                title="Upload Photo"
                                aria-label="Upload Photo"
                                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-gray-900 transition-transform active:scale-95 cursor-pointer"
                            >
                                <Camera className="w-3 h-3" />
                            </button>

                            {/* Quick remove button if avatar exists */}
                            {staff.profile?.avatar && !uploadingPhoto && (
                                <button
                                    type="button"
                                    onClick={handleRemovePhoto}
                                    title="Remove photo"
                                    aria-label="Remove photo"
                                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 hover:bg-red-700 text-white items-center justify-center shadow-md border-2 border-white dark:border-gray-900 transition-opacity hidden group-hover:flex cursor-pointer"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {fullName}
                                </h1>
                                {staff.enrollmentNumber && (
                                    <span className="text-xs font-mono font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                                        {staff.enrollmentNumber}
                                    </span>
                                )}
                                <span className={cn(
                                    "text-xs font-medium px-2 py-0.5 rounded-md",
                                    staff.role === "admin" ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" :
                                    staff.role === "instructor" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" :
                                    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                )}>
                                    {staff.role === "admin" ? "Admin" : staff.role === "instructor" ? "Teaching Faculty" : "Support Staff"}
                                </span>
                            </div>

                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                                {designationName} {staff.hrDetails?.qualification && `• ${staff.hrDetails.qualification}`}
                            </p>

                            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1">
                                {staff.profile?.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                                        {staff.profile.phone}
                                    </span>
                                )}
                                {!isSyntheticEmail && (
                                    <span className="flex items-center gap-1">
                                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                                        {staff.email}
                                    </span>
                                )}
                                {staff.hrDetails?.joiningDate && (
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                        Joined {new Date(staff.hrDetails.joiningDate).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Financial Summary Chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs">
                        <div className="text-center px-2">
                            <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Basic Pay</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">₹{basicSalaryInput.toLocaleString()}</p>
                        </div>
                        <div className="text-center px-2 border-l border-gray-100 dark:border-gray-700">
                            <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">Allowances</p>
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">+₹{totalAllowances.toLocaleString()}</p>
                        </div>
                        <div className="text-center px-2 border-l border-gray-100 dark:border-gray-700">
                            <p className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">Gross Pay</p>
                            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">₹{grossSalary.toLocaleString()}</p>
                        </div>
                        <div className="text-center px-2 border-l border-gray-100 dark:border-gray-700">
                            <p className="text-[10px] uppercase font-bold tracking-wider text-gray-700 dark:text-gray-300">Est. Net Pay</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">₹{estNetSalary.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto pb-px">
                <button
                    onClick={() => setActiveTab("details")}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap",
                        activeTab === "details"
                            ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                            : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                    )}
                >
                    <User className="w-4 h-4" />
                    Profile & Details
                </button>

                <button
                    onClick={() => setActiveTab("salary")}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap",
                        activeTab === "salary"
                            ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                            : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                    )}
                >
                    <Coins className="w-4 h-4" />
                    Salary Structure (Gross Builder)
                </button>

                <button
                    onClick={() => setActiveTab("deductions")}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap",
                        activeTab === "deductions"
                            ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                            : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                    )}
                >
                    <Shield className="w-4 h-4" />
                    Taxes & Deductions
                </button>

                <button
                    onClick={() => setActiveTab("attendance")}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap",
                        activeTab === "attendance"
                            ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                            : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                    )}
                >
                    <CalendarDays className="w-4 h-4" />
                    Attendance Summary
                </button>

                <button
                    onClick={() => setActiveTab("payslips")}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap",
                        activeTab === "payslips"
                            ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                            : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                    )}
                >
                    <FileSpreadsheet className="w-4 h-4" />
                    Payslips History ({payslips.length})
                </button>
            </div>

            {/* TAB 1: Profile & Details */}
            {activeTab === "details" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal & Employment Info */}
                    <Card className="p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <User className="w-4 h-4 text-indigo-600" />
                                Personal & Employment Details
                            </h2>
                            <button
                                onClick={() => setIsEditProfileOpen(true)}
                                className="text-xs text-indigo-600 hover:underline"
                            >
                                Edit
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                            <div>
                                <span className="text-gray-400 block font-medium">Full Name</span>
                                <span className="text-gray-900 dark:text-white font-semibold">{fullName}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block font-medium">Employee Code</span>
                                <span className="font-mono text-gray-900 dark:text-white font-semibold">{staff.enrollmentNumber || "N/A"}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block font-medium">Designation</span>
                                <span className="text-gray-900 dark:text-white font-semibold">{designationName}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block font-medium">Category / Role</span>
                                <span className="text-gray-900 dark:text-white capitalize font-semibold">{staff.role}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block font-medium">Gender</span>
                                <span className="text-gray-900 dark:text-white capitalize font-semibold">{staff.profile?.gender || "Not specified"}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block font-medium">Blood Group</span>
                                <span className="text-gray-900 dark:text-white font-semibold">{staff.profile?.bloodGroup || "N/A"}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block font-medium">Date of Birth</span>
                                <span className="text-gray-900 dark:text-white font-semibold">{staff.profile?.dateOfBirth ? new Date(staff.profile.dateOfBirth).toLocaleDateString() : "N/A"}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block font-medium">Joining Date</span>
                                <span className="text-gray-900 dark:text-white font-semibold">{staff.hrDetails?.joiningDate ? new Date(staff.hrDetails.joiningDate).toLocaleDateString() : "N/A"}</span>
                            </div>
                            <div className="col-span-2">
                                <span className="text-gray-400 block font-medium">Residential Address</span>
                                <span className="text-gray-900 dark:text-white font-semibold">
                                    {staff.profile?.address ? `${staff.profile.address.street || ""}, ${staff.profile.address.city || ""}, ${staff.profile.address.state || ""} ${staff.profile.address.pincode || ""}`.trim() : "No address on record"}
                                </span>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex items-center justify-between text-xs">
                                <div>
                                    <span className="font-semibold text-gray-900 dark:text-white">Portal Access</span>
                                    <p className="text-[11px] text-gray-400">{isNonLogin ? "Staff member has no login credentials (attendance & payroll only)." : "Staff member can log in to portal."}</p>
                                </div>
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[11px] font-semibold",
                                    isNonLogin ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                )}>
                                    {isNonLogin ? "Payroll Only" : "Login Enabled"}
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* Bank & Statutory Numbers */}
                    <Card className="p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-emerald-600" />
                                Bank Details & Statutory IDs
                            </h2>
                            <button
                                onClick={() => setIsEditProfileOpen(true)}
                                className="text-xs text-indigo-600 hover:underline"
                            >
                                Edit
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Bank Details */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Bank Account</h3>
                                <div className="grid grid-cols-2 gap-y-2 text-xs">
                                    <div>
                                        <span className="text-gray-400 block font-medium">Bank Name</span>
                                        <span className="text-gray-900 dark:text-white font-semibold">{staff.hrDetails?.bankDetails?.bankName || "Not Provided"}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block font-medium">Account Holder</span>
                                        <span className="text-gray-900 dark:text-white font-semibold">{staff.hrDetails?.bankDetails?.accountName || fullName}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block font-medium">Account Number</span>
                                        <span className="font-mono text-gray-900 dark:text-white font-semibold">{staff.hrDetails?.bankDetails?.accountNumber || "Not Provided"}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block font-medium">IFSC Code</span>
                                        <span className="font-mono text-gray-900 dark:text-white font-semibold">{staff.hrDetails?.bankDetails?.ifscCode || "Not Provided"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Statutory Details */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">PAN Number</span>
                                    <span className="text-xs font-mono font-bold text-gray-900 dark:text-white mt-1 block">
                                        {staff.hrDetails?.panNumber || "—"}
                                    </span>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">UAN / EPF</span>
                                    <span className="text-xs font-mono font-bold text-gray-900 dark:text-white mt-1 block">
                                        {staff.hrDetails?.uanNumber || "—"}
                                    </span>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">ESI Number</span>
                                    <span className="text-xs font-mono font-bold text-gray-900 dark:text-white mt-1 block">
                                        {staff.hrDetails?.esiNumber || "—"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB 2: Salary Structure (Gross Salary Builder) */}
            {activeTab === "salary" && (
                <div className="space-y-6">
                    <Card className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 gap-4">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Coins className="w-5 h-5 text-indigo-600" />
                                    Monthly Salary Structure & Gross Builder
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Define the employee&apos;s Basic Salary and specific allowances to construct their total monthly Gross Pay.
                                </p>
                            </div>
                            <Button
                                onClick={handleSaveSalaryStructure}
                                disabled={saving}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Salary Structure
                            </Button>
                        </div>

                        <div className="space-y-6 pt-5">
                            {/* Basic Salary Input */}
                            <div className="max-w-md p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                                <label className="block text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider mb-1.5">
                                    Base Monthly Salary (Basic Pay) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-500 font-bold">₹</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={basicSalaryInput}
                                        onChange={(e) => handleBasicSalaryChange(e.target.value)}
                                        className="pl-8 font-bold text-base bg-white dark:bg-gray-900"
                                    />
                                </div>
                                <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-1.5">
                                    All percentage-based allowances (DA, HRA) and statutory contributions (EPF, ESI) are computed from this basic figure.
                                </p>
                            </div>

                            {/* Active Earning Components / Allowances */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
                                    Institute Allowances & Earning Components
                                </h3>

                                {earningsStructure.length === 0 ? (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center text-xs text-gray-400">
                                        No active earning components defined in master settings. Add components like DA, HRA in HR Settings.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {earningsStructure.map((item, idx) => (
                                            <div
                                                key={item.componentId}
                                                className={cn(
                                                    "flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all gap-3",
                                                    item.isIncluded
                                                        ? "bg-white dark:bg-gray-900 border-indigo-200 dark:border-indigo-900/80 shadow-xs"
                                                        : "bg-gray-50/60 dark:bg-gray-800/40 border-gray-200 dark:border-gray-800 opacity-60"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        id={`earning-${item.componentId}`}
                                                        checked={item.isIncluded}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setEarningsStructure(prev => prev.map((it, i) => i === idx ? { ...it, isIncluded: checked } : it));
                                                        }}
                                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                    />
                                                    <div>
                                                        <label htmlFor={`earning-${item.componentId}`} className="text-xs font-bold text-gray-900 dark:text-white cursor-pointer">
                                                            {item.name}
                                                        </label>
                                                        <p className="text-[10px] text-gray-400">
                                                            {item.calculationType === 'percentage'
                                                                ? `Rule: ${item.defaultValue}% of ${item.percentageBasis || 'basic'}`
                                                                : `Rule: Flat ₹${item.defaultValue || 0}`}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 self-end sm:self-center">
                                                    <span className="text-xs text-gray-400">Amount:</span>
                                                    <div className="relative w-36">
                                                        <span className="absolute left-2.5 top-2 text-xs text-gray-500 font-medium">₹</span>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            disabled={!item.isIncluded}
                                                            value={item.amount}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                setEarningsStructure(prev => prev.map((it, i) => i === idx ? { ...it, amount: val } : it));
                                                            }}
                                                            className="pl-6 py-1 h-8 text-xs font-semibold"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Live Gross Salary Calculation Summary */}
                            <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="space-y-1 text-center sm:text-left">
                                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Monthly Gross Salary</span>
                                    <p className="text-xs text-slate-300">
                                        Basic (₹{basicSalaryInput.toLocaleString()}) + Allowances (₹{totalAllowances.toLocaleString()})
                                    </p>
                                </div>
                                <div className="text-2xl font-extrabold text-emerald-400">
                                    ₹{grossSalary.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB 3: Taxes & Statutory Deductions */}
            {activeTab === "deductions" && (
                <div className="space-y-6">
                    <Card className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 gap-4">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-rose-600" />
                                    Statutory Taxes & Deductions Switchboard
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Toggle and configure EPF, ESI, Professional Tax (PT), and TDS for this employee.
                                </p>
                            </div>
                            <Button
                                onClick={handleSaveDeductions}
                                disabled={saving}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Deductions
                            </Button>
                        </div>

                        <div className="space-y-6 pt-5">
                            <div className="bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <strong>Private School / Exemption Policy:</strong> If your institution or this specific staff member is exempt from Professional Tax or EPF/ESI, uncheck the component below. Only checked deductions will be deducted during monthly payroll.
                                </div>
                            </div>

                            {deductionsStructure.length === 0 ? (
                                <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center text-xs text-gray-400">
                                    No active deduction components defined in master settings. Add deductions like PF, ESI in HR Settings.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {deductionsStructure.map((item, idx) => (
                                        <div
                                            key={item.componentId}
                                            className={cn(
                                                "flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all gap-3",
                                                item.isIncluded
                                                    ? "bg-white dark:bg-gray-900 border-rose-200 dark:border-rose-900/80 shadow-xs"
                                                    : "bg-gray-50/60 dark:bg-gray-800/40 border-gray-200 dark:border-gray-800 opacity-60"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    id={`deduction-${item.componentId}`}
                                                    checked={item.isIncluded}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setDeductionsStructure(prev => prev.map((it, i) => i === idx ? { ...it, isIncluded: checked } : it));
                                                    }}
                                                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-gray-300"
                                                />
                                                <div>
                                                    <label htmlFor={`deduction-${item.componentId}`} className="text-xs font-bold text-gray-900 dark:text-white cursor-pointer">
                                                        {item.name}
                                                    </label>
                                                    <p className="text-[10px] text-gray-400">
                                                        {item.calculationType === 'percentage'
                                                            ? `Rule: ${item.defaultValue}% of ${item.percentageBasis || 'basic'}`
                                                            : `Rule: Flat ₹${item.defaultValue || 0}`}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end sm:self-center">
                                                <span className="text-xs text-gray-400">Deduction:</span>
                                                <div className="relative w-36">
                                                    <span className="absolute left-2.5 top-2 text-xs text-gray-500 font-medium">₹</span>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        disabled={!item.isIncluded}
                                                        value={item.amount}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setDeductionsStructure(prev => prev.map((it, i) => i === idx ? { ...it, amount: val } : it));
                                                        }}
                                                        className="pl-6 py-1 h-8 text-xs font-semibold"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Net Take-Home Calculation Breakdown */}
                            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center sm:text-left border-b border-slate-800 pb-3">
                                    <div>
                                        <span className="text-[11px] text-slate-400 block font-semibold">Total Gross Earnings</span>
                                        <span className="text-base font-bold text-white">₹{grossSalary.toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <span className="text-[11px] text-rose-400 block font-semibold">Total Deductions & Taxes</span>
                                        <span className="text-base font-bold text-rose-400">-₹{totalDeductions.toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <span className="text-[11px] text-emerald-400 block font-semibold">Estimated Net Take-Home Pay</span>
                                        <span className="text-xl font-extrabold text-emerald-400">₹{estNetSalary.toLocaleString()}</span>
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-400 text-center sm:text-left">
                                    Actual net payout on payslips will additionally calculate attendance cuts (unpaid leave, late arrivals) and overtime additions.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB 4: Attendance Summary */}
            {activeTab === "attendance" && (
                <div className="space-y-6">
                    <Card className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 gap-4">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <CalendarDays className="w-5 h-5 text-indigo-600" />
                                    Monthly Attendance & Time Card
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Current month attendance records used directly for payroll calculation.
                                </p>
                            </div>
                            <Link href="/admin/hr/attendance">
                                <Button variant="secondary" className="text-xs">
                                    Go to Daily Attendance Sheet →
                                </Button>
                            </Link>
                        </div>

                        {/* Metric Tiles */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-5">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-center">
                                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">Days Present</span>
                                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                    {attendanceMetrics?.summary?.present || 0}
                                </p>
                            </div>

                            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800/60 text-center">
                                <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-300">Days Absent</span>
                                <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                                    {attendanceMetrics?.summary?.absent || 0}
                                </p>
                            </div>

                            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60 text-center">
                                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300">Half Days</span>
                                <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                                    {attendanceMetrics?.summary?.halfDay || 0}
                                </p>
                            </div>

                            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800/60 text-center">
                                <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300">On Leave</span>
                                <p className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">
                                    {attendanceMetrics?.summary?.onLeave || 0}
                                </p>
                            </div>

                            <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800/60 text-center">
                                <span className="text-[10px] uppercase font-bold text-red-700 dark:text-red-300">Late Cut (Hours)</span>
                                <p className="text-xl font-extrabold text-red-600 dark:text-red-400 mt-0.5">
                                    {attendanceMetrics?.summary?.totalLateHours || 0}h
                                </p>
                            </div>

                            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800/60 text-center">
                                <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300">Overtime (Hours)</span>
                                <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                                    {attendanceMetrics?.summary?.totalOvertimeHours || 0}h
                                </p>
                            </div>
                        </div>

                        {/* Attendance Logs Table */}
                        <div className="mt-6 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                            <div className="bg-gray-50 dark:bg-gray-800/60 px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                                This Month&apos;s Daily Attendance Logs
                            </div>

                            {(attendanceMetrics?.currentMonthLogs || []).length === 0 ? (
                                <div className="p-6 text-center text-xs text-gray-400">
                                    No attendance records found for this month yet.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
                                        <thead className="bg-gray-50/50 dark:bg-gray-800/40 text-[11px] font-semibold text-gray-400 uppercase">
                                            <tr>
                                                <th className="px-4 py-2.5">Date</th>
                                                <th className="px-4 py-2.5">Status</th>
                                                <th className="px-4 py-2.5">In Time</th>
                                                <th className="px-4 py-2.5">Out Time</th>
                                                <th className="px-4 py-2.5">Late / OT Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {attendanceMetrics.currentMonthLogs.map((log) => (
                                                <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">
                                                        {new Date(log.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                            log.status === "present" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" :
                                                            log.status === "absent" ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" :
                                                            log.status === "half_day" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" :
                                                            "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                                                        )}>
                                                            {log.status.replace("_", " ")}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 font-mono">{log.checkInTime || "—"}</td>
                                                    <td className="px-4 py-2.5 font-mono">{log.checkOutTime || "—"}</td>
                                                    <td className="px-4 py-2.5 text-gray-400">
                                                        {log.lateMinutes > 0 && <span className="text-red-500 mr-2">Late: {log.lateMinutes}m</span>}
                                                        {log.overtimeMinutes > 0 && <span className="text-emerald-500 mr-2">OT: {log.overtimeMinutes}m</span>}
                                                        {log.remarks && <span>{log.remarks}</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB 5: Payslips History */}
            {activeTab === "payslips" && (
                <div className="space-y-6">
                    <Card className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 gap-4">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                                    Payslip Ledger & Salary History
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Official salary slips generated for this employee.
                                </p>
                            </div>
                            <Link href={`/admin/hr/payslips?staff=${staff._id}`}>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5">
                                    <Plus className="w-4 h-4" />
                                    Create New Payslip
                                </Button>
                            </Link>
                        </div>

                        {payslips.length === 0 ? (
                            <div className="p-8 text-center space-y-3">
                                <EmptyState
                                    icon={FileSpreadsheet}
                                    title="No payslips generated yet"
                                    description="Generate the first monthly payslip for this staff member to track disbursements."
                                    action={
                                        <Link href={`/admin/hr/payslips?staff=${staff._id}`}>
                                            <Button className="mt-3 bg-indigo-600 text-white text-xs">
                                                Generate Payslip
                                            </Button>
                                        </Link>
                                    }
                                />
                            </div>
                        ) : (
                            <div className="overflow-x-auto mt-4">
                                <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
                                    <thead className="bg-gray-50 dark:bg-gray-800/60 uppercase font-semibold text-gray-400 text-[11px]">
                                        <tr>
                                            <th className="px-4 py-3">Month / Period</th>
                                            <th className="px-4 py-3">Basic Pay</th>
                                            <th className="px-4 py-3">Gross Salary</th>
                                            <th className="px-4 py-3">Deductions</th>
                                            <th className="px-4 py-3">Net Pay</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                        {payslips.map((ps) => {
                                            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                            const periodLabel = `${monthNames[(ps.month || 1) - 1]} ${ps.year}`;

                                            return (
                                                <tr key={ps._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                                                        {periodLabel}
                                                    </td>
                                                    <td className="px-4 py-3">₹{Number(ps.basicSalary || 0).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-emerald-600 font-semibold">₹{Number(ps.grossSalary || 0).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-rose-600 font-semibold">-₹{Number(ps.totalDeductions || 0).toLocaleString()}</td>
                                                    <td className="px-4 py-3 font-extrabold text-gray-900 dark:text-white">
                                                        ₹{Number(ps.netSalary || 0).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                            ps.status === "paid" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" :
                                                            "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                                        )}>
                                                            {ps.status || "generated"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Link href={`/admin/hr/payslips/${ps._id}`}>
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                className="text-xs flex items-center gap-1 ml-auto"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                                View / Print
                                                            </Button>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* EDIT PROFILE MODAL */}
            <Modal
                isOpen={isEditProfileOpen}
                onClose={() => !saving && setIsEditProfileOpen(false)}
                title="Edit Staff Member Details"
                maxWidth="max-w-2xl"
            >
                <form onSubmit={handleSaveProfile} className="space-y-5">
                    {/* Photo Upload in Edit Modal */}
                    <div className="flex items-center gap-4 p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200/80 dark:border-gray-700/80">
                        <input
                            ref={modalFileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handlePhotoUpload}
                            disabled={uploadingPhoto}
                        />
                        <div className="relative shrink-0">
                            {staff.profile?.avatar ? (
                                <img
                                    src={staff.profile.avatar}
                                    alt={fullName}
                                    className="w-14 h-14 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shadow-xs"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-xs">
                                    {staff.profile?.firstName?.[0]?.toUpperCase() || "S"}
                                </div>
                            )}
                            {uploadingPhoto && (
                                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center text-white">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white">Staff Photo</p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">JPG, PNG, or WebP (max 5MB). Shown on payslips and directory.</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={uploadingPhoto}
                                onClick={() => modalFileInputRef.current?.click()}
                                className="text-xs flex items-center gap-1.5"
                            >
                                <Upload className="w-3.5 h-3.5" />
                                {staff.profile?.avatar ? "Change Photo" : "Upload Photo"}
                            </Button>
                            {staff.profile?.avatar && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={uploadingPhoto}
                                    onClick={handleRemovePhoto}
                                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    title="Remove photo"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
                            <Input
                                value={profileForm.firstName || ""}
                                onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                            <Input
                                value={profileForm.lastName || ""}
                                onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Role / Category</label>
                            <select
                                value={profileForm.role}
                                onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value })}
                                className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            >
                                <option value="staff">Support Staff (Maid, Driver, Peon, Helper)</option>
                                <option value="instructor">Teaching Faculty / Teacher</option>
                                <option value="admin">Administrator / Office Staff</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Designation</label>
                            <select
                                value={profileForm.designation}
                                onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}
                                className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            >
                                <option value="">Select Designation...</option>
                                {designations.map((d) => (
                                    <option key={d._id} value={d._id}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                            <Input
                                value={profileForm.phone || ""}
                                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Qualification</label>
                            <Input
                                value={profileForm.qualification || ""}
                                onChange={(e) => setProfileForm({ ...profileForm, qualification: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Date of Joining</label>
                            <Input
                                type="date"
                                value={profileForm.joiningDate || ""}
                                onChange={(e) => setProfileForm({ ...profileForm, joiningDate: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
                            <Input
                                type="date"
                                value={profileForm.dob || ""}
                                onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                            <select
                                value={profileForm.gender || ""}
                                onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                                className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            >
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Blood Group</label>
                            <Input
                                placeholder="e.g. O+, B+, A+"
                                value={profileForm.bloodGroup || ""}
                                onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Portal Login Checkbox */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800">
                        <div className="space-y-0.5">
                            <span className="text-xs font-bold text-gray-900 dark:text-white">Allow Portal Login</span>
                            <p className="text-[11px] text-gray-400">Keep disabled for support staff, maids, and drivers who do not require login access.</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={profileForm.allowLogin}
                            onChange={(e) => setProfileForm({ ...profileForm, allowLogin: e.target.checked })}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                    </div>

                    {/* Address Section */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">Address</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <Input
                                    placeholder="Street Address"
                                    value={profileForm.street || ""}
                                    onChange={(e) => setProfileForm({ ...profileForm, street: e.target.value })}
                                />
                            </div>
                            <div>
                                <Input
                                    placeholder="City"
                                    value={profileForm.city || ""}
                                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                                />
                            </div>
                            <div>
                                <Input
                                    placeholder="State"
                                    value={profileForm.state || ""}
                                    onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bank & Statutory Details Section */}
                    <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-800">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">Bank & Statutory Information</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[11px] text-gray-400 mb-1">PAN Number</label>
                                <Input
                                    value={profileForm.panNumber || ""}
                                    onChange={(e) => setProfileForm({ ...profileForm, panNumber: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-gray-400 mb-1">UAN / EPF Number</label>
                                <Input
                                    value={profileForm.uanNumber || ""}
                                    onChange={(e) => setProfileForm({ ...profileForm, uanNumber: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-gray-400 mb-1">ESI Number</label>
                                <Input
                                    value={profileForm.esiNumber || ""}
                                    onChange={(e) => setProfileForm({ ...profileForm, esiNumber: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div>
                                <label className="block text-[11px] text-gray-400 mb-1">Bank Name</label>
                                <Input
                                    value={profileForm.bankName || ""}
                                    onChange={(e) => setProfileForm({ ...profileForm, bankName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-gray-400 mb-1">Account Holder Name</label>
                                <Input
                                    value={profileForm.accountName || ""}
                                    onChange={(e) => setProfileForm({ ...profileForm, accountName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-gray-400 mb-1">Account Number</label>
                                <Input
                                    value={profileForm.accountNumber || ""}
                                    onChange={(e) => setProfileForm({ ...profileForm, accountNumber: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-gray-400 mb-1">IFSC Code</label>
                                <Input
                                    value={profileForm.ifscCode || ""}
                                    onChange={(e) => setProfileForm({ ...profileForm, ifscCode: e.target.value.toUpperCase() })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsEditProfileOpen(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
