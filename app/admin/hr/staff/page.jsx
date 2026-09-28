"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
    Users, 
    UserPlus, 
    Search, 
    Filter, 
    GraduationCap, 
    Shield, 
    HeartHandshake, 
    Phone, 
    Mail, 
    Coins, 
    Eye, 
    Trash2, 
    Edit3,
    CheckCircle2, 
    AlertCircle, 
    KeyRound, 
    Building2,
    Calendar,
    BadgeCheck,
    CreditCard,
    FileSpreadsheet,
    Loader2,
    Fingerprint
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { cn } from "@/lib/utils";

export default function StaffDirectoryPage() {
    const toast = useToast();
    const confirm = useConfirm();

    const [staffList, setStaffList] = useState([]);
    const [counts, setCounts] = useState({ all: 0, instructor: 0, admin: 0, staff: 0 });
    const [designations, setDesignations] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [roleFilter, setRoleFilter] = useState("all");
    const [designationFilter, setDesignationFilter] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [search, setSearch] = useState("");

    // Modal state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [showBankingSection, setShowBankingSection] = useState(false);

    const [editFormData, setEditFormData] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        role: "staff",
        designation: "",
        department: "",
        qualification: "",
        joiningDate: "",
        basicSalary: "",
        allowLogin: false,
        biometricId: ""
    });

    // Add Staff Form
    const initialFormState = {
        firstName: "",
        lastName: "",
        phone: "",
        role: "staff", // default to staff/support
        designation: "",
        department: "",
        qualification: "",
        joiningDate: new Date().toISOString().split("T")[0],
        basicSalary: "",
        allowLogin: false, // default false for support staff, toggled to true for instructors/admins
        email: "",
        password: "",
        panNumber: "",
        uanNumber: "",
        esiNumber: "",
        bankName: "",
        accountName: "",
        accountNumber: "",
        ifscCode: "",
        branch: "",
        biometricId: ""
    };

    const [formData, setFormData] = useState(initialFormState);

    const fetchDesignations = useCallback(async () => {
        try {
            const res = await fetch("/api/v1/hr/designations");
            if (res.ok) {
                const data = await res.json();
                setDesignations(data.designations || []);
            }
        } catch (error) {
            console.error("Failed to load designations:", error);
        }
    }, []);

    const fetchDepartments = useCallback(async () => {
        try {
            const res = await fetch("/api/v1/departments");
            if (res.ok) {
                const data = await res.json();
                setDepartments(data.departments || []);
            }
        } catch (error) {
            console.error("Failed to load departments:", error);
        }
    }, []);

    const fetchStaff = useCallback(async (signal) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (roleFilter !== "all") params.append("role", roleFilter);
            if (designationFilter) params.append("designation", designationFilter);
            if (departmentFilter) params.append("department", departmentFilter);
            if (search.trim()) params.append("search", search.trim());

            const res = await fetch(`/api/v1/hr/staff?${params.toString()}`, {
                signal: signal || AbortSignal.timeout(10000)
            });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            setStaffList(data.staffMembers || []);
            if (data.counts) setCounts(data.counts);
        } catch (error) {
            if (error.name !== "AbortError") {
                toast.error("Failed to load staff directory");
            }
        } finally {
            setLoading(false);
        }
    }, [roleFilter, designationFilter, departmentFilter, search, toast]);

    useEffect(() => {
        fetchDesignations();
        fetchDepartments();
    }, [fetchDesignations, fetchDepartments]);

    useEffect(() => {
        const controller = new AbortController();
        const delayTimer = setTimeout(() => {
            fetchStaff(controller.signal);
        }, 200);

        return () => {
            clearTimeout(delayTimer);
            controller.abort();
        };
    }, [fetchStaff]);

    const handleRoleTabChange = (role) => {
        setRoleFilter(role);
    };

    const handleOpenAddModal = (defaultRole = "staff") => {
        const loginAllowed = defaultRole !== "staff";
        setFormData({
            ...initialFormState,
            role: defaultRole,
            allowLogin: loginAllowed
        });
        setShowBankingSection(false);
        setIsAddModalOpen(true);
    };

    const handleRoleSelectChange = (newRole) => {
        // Auto-suggest login allowed if admin or instructor
        const loginAllowed = newRole !== "staff";
        setFormData(prev => ({
            ...prev,
            role: newRole,
            allowLogin: loginAllowed
        }));
    };

    const handleAddStaffSubmit = async (e) => {
        e.preventDefault();
        if (!formData.firstName.trim()) {
            toast.error("First name is required");
            return;
        }

        if (formData.allowLogin) {
            if (!formData.email.trim()) {
                toast.error("Email is required for staff with portal login");
                return;
            }
            if (!formData.password || formData.password.length < 6) {
                toast.error("Password must be at least 6 characters");
                return;
            }
        }

        setSubmitting(true);
        try {
            const payload = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                phone: formData.phone.trim(),
                role: formData.role,
                designation: formData.designation || undefined,
                department: formData.department || undefined,
                qualification: formData.qualification.trim(),
                joiningDate: formData.joiningDate,
                basicSalary: parseFloat(formData.basicSalary) || 0,
                allowLogin: !!formData.allowLogin,
                biometricId: formData.biometricId?.trim() || undefined,
                email: formData.allowLogin ? formData.email.trim() : undefined,
                password: formData.allowLogin ? formData.password : undefined,
                panNumber: formData.panNumber.trim(),
                uanNumber: formData.uanNumber.trim(),
                esiNumber: formData.esiNumber.trim(),
                bankDetails: formData.accountNumber ? {
                    accountName: formData.accountName.trim() || `${formData.firstName} ${formData.lastName}`.trim(),
                    accountNumber: formData.accountNumber.trim(),
                    bankName: formData.bankName.trim(),
                    ifscCode: formData.ifscCode.trim(),
                    branch: formData.branch.trim()
                } : undefined
            };

            const res = await fetch("/api/v1/hr/staff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to create staff member");
            }

            toast.success("Staff member registered successfully");
            setIsAddModalOpen(false);
            fetchStaff();
        } catch (error) {
            toast.error(error.message || "Failed to add staff member");
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenEditModal = (member) => {
        setEditingStaff(member);
        setEditFormData({
            firstName: member.profile?.firstName || "",
            lastName: member.profile?.lastName || "",
            phone: member.profile?.phone || "",
            role: member.role || "staff",
            designation: member.hrDetails?.designation?._id || member.hrDetails?.designation || "",
            department: member.department?._id || member.department || "",
            qualification: member.hrDetails?.qualification || "",
            joiningDate: member.hrDetails?.joiningDate ? member.hrDetails.joiningDate.split("T")[0] : "",
            basicSalary: member.hrDetails?.basicSalary ?? "",
            allowLogin: member.allowLogin !== false,
            biometricId: member.hrDetails?.biometricId || ""
        });
        setIsEditModalOpen(true);
    };

    const handleEditStaffSubmit = async (e) => {
        e.preventDefault();
        if (!editingStaff?._id) return;
        setSubmitting(true);
        try {
            const payload = {
                firstName: editFormData.firstName.trim(),
                lastName: editFormData.lastName.trim(),
                phone: editFormData.phone.trim(),
                role: editFormData.role,
                designation: editFormData.designation || null,
                department: editFormData.department || null,
                qualification: editFormData.qualification.trim(),
                joiningDate: editFormData.joiningDate || null,
                basicSalary: parseFloat(editFormData.basicSalary) || 0,
                allowLogin: !!editFormData.allowLogin,
                biometricId: editFormData.biometricId?.trim() || null
            };

            const res = await fetch(`/api/v1/hr/staff/${editingStaff._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update staff member");

            toast.success("Staff member updated successfully");
            setIsEditModalOpen(false);
            setEditingStaff(null);
            fetchStaff();
        } catch (error) {
            toast.error(error.message || "Failed to update staff member");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteStaff = async (staffId, name) => {
        const confirmed = await confirm({
            title: "Remove Staff Member?",
            message: `Are you sure you want to remove ${name} from active staff? Their payroll and attendance history will be archived.`,
            type: "danger"
        });

        if (!confirmed) return;

        try {
            const res = await fetch(`/api/v1/hr/staff/${staffId}`, {
                method: "DELETE"
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to remove staff member");
            toast.success("Staff member removed");
            fetchStaff();
        } catch (error) {
            toast.error(error.message || "Failed to remove staff member");
        }
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case "admin":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">Admin</span>;
            case "instructor":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Teaching Faculty</span>;
            case "staff":
            default:
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Support Staff</span>;
        }
    };

    return (
        <div className="space-y-6 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                        Staff Directory & Payroll Accounts
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Track all teaching faculty, administrators, and non-teaching support staff (maids, drivers, helpers) for payroll and attendance.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => handleOpenAddModal("staff")}
                        variant="secondary"
                        className="flex items-center gap-2 border-slate-300 dark:border-slate-700"
                    >
                        <HeartHandshake className="w-4 h-4 text-amber-600" />
                        + Add Support Staff
                    </Button>
                    <Button
                        onClick={() => handleOpenAddModal("instructor")}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add Staff Member
                    </Button>
                </div>
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card 
                    onClick={() => handleRoleTabChange("all")}
                    className={cn(
                        "p-4 cursor-pointer transition-all border",
                        roleFilter === "all" ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm" : "hover:border-gray-300 dark:hover:border-gray-700"
                    )}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Staff</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{counts.all || 0}</p>
                        </div>
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                </Card>

                <Card 
                    onClick={() => handleRoleTabChange("instructor")}
                    className={cn(
                        "p-4 cursor-pointer transition-all border",
                        roleFilter === "instructor" ? "border-blue-500 ring-2 ring-blue-500/20 shadow-sm" : "hover:border-gray-300 dark:hover:border-gray-700"
                    )}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Teaching Faculty</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{counts.instructor || 0}</p>
                        </div>
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                            <GraduationCap className="w-5 h-5" />
                        </div>
                    </div>
                </Card>

                <Card 
                    onClick={() => handleRoleTabChange("admin")}
                    className={cn(
                        "p-4 cursor-pointer transition-all border",
                        roleFilter === "admin" ? "border-purple-500 ring-2 ring-purple-500/20 shadow-sm" : "hover:border-gray-300 dark:hover:border-gray-700"
                    )}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Administrators</p>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{counts.admin || 0}</p>
                        </div>
                        <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                            <Shield className="w-5 h-5" />
                        </div>
                    </div>
                </Card>

                <Card 
                    onClick={() => handleRoleTabChange("staff")}
                    className={cn(
                        "p-4 cursor-pointer transition-all border",
                        roleFilter === "staff" ? "border-amber-500 ring-2 ring-amber-500/20 shadow-sm" : "hover:border-gray-300 dark:hover:border-gray-700"
                    )}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Support / Helpers</p>
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{counts.staff || 0}</p>
                        </div>
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
                            <HeartHandshake className="w-5 h-5" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filter and Search Bar */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Role Filter Tabs */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                        <button
                            onClick={() => handleRoleTabChange("all")}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                                roleFilter === "all"
                                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            All ({counts.all || 0})
                        </button>
                        <button
                            onClick={() => handleRoleTabChange("instructor")}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                                roleFilter === "instructor"
                                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            Teaching Faculty ({counts.instructor || 0})
                        </button>
                        <button
                            onClick={() => handleRoleTabChange("admin")}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                                roleFilter === "admin"
                                    ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-xs"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            Admins ({counts.admin || 0})
                        </button>
                        <button
                            onClick={() => handleRoleTabChange("staff")}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                                roleFilter === "staff"
                                    ? "bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-xs"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            Support Staff ({counts.staff || 0})
                        </button>
                    </div>

                    {/* Search & Designation Dropdown */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                            <Input
                                placeholder="Search by name, phone..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 text-xs"
                            />
                        </div>

                        <select
                            value={designationFilter}
                            onChange={(e) => setDesignationFilter(e.target.value)}
                            className="w-full sm:w-44 text-xs border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All Designations</option>
                            {designations.map((d) => (
                                <option key={d._id} value={d._id}>{d.name}</option>
                            ))}
                        </select>

                        <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            className="w-full sm:w-44 text-xs border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All Departments</option>
                            {departments.map((dept) => (
                                <option key={dept._id} value={dept._id}>{dept.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Staff List Table */}
            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <LoadingSpinner />
                </div>
            ) : staffList.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="No staff members found"
                    description={search || roleFilter !== 'all' ? "Try clearing search or filters to see more results." : "Start by registering your institute's instructors, administrators, and support staff."}
                    action={
                        <Button onClick={() => handleOpenAddModal("staff")} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add First Staff Member
                        </Button>
                    }
                />
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                            <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                                <tr>
                                    <th className="px-6 py-3.5">Staff Member</th>
                                    <th className="px-6 py-3.5">Role & Designation</th>
                                    <th className="px-6 py-3.5">Contact</th>
                                    <th className="px-6 py-3.5">Portal Access</th>
                                    <th className="px-6 py-3.5">Basic Salary</th>
                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {staffList.map((member) => {
                                    const fullName = `${member.profile?.firstName || ""} ${member.profile?.lastName || ""}`.trim() || "Staff Member";
                                    const designationName = member.hrDetails?.designation?.name || "General Staff";
                                    const isNonLogin = member.allowLogin === false;
                                    const isSyntheticEmail = member.email?.endsWith("@ims.internal");

                                    return (
                                        <tr key={member._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {member.profile?.avatar ? (
                                                        <img
                                                            src={member.profile.avatar}
                                                            alt={fullName}
                                                            className="w-10 h-10 rounded-full object-cover shrink-0 shadow-xs border border-gray-200 dark:border-gray-700"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
                                                            {member.profile?.firstName?.[0]?.toUpperCase() || "S"}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                            {fullName}
                                                            {member.enrollmentNumber && (
                                                                <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                                                                    {member.enrollmentNumber}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-400">
                                                            Joined {member.hrDetails?.joiningDate ? new Date(member.hrDetails.joiningDate).toLocaleDateString() : "N/A"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {getRoleBadge(member.role)}
                                                        {member.department && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                                {member.department.name}
                                                            </span>
                                                        )}
                                                        {member.hrDetails?.biometricId && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-200 dark:border-violet-800" title="Biometric Device Punch ID">
                                                                <Fingerprint className="w-2.5 h-2.5 text-violet-600" /> {member.hrDetails.biometricId}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                        {designationName}
                                                    </p>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="text-xs space-y-1">
                                                    {member.profile?.phone ? (
                                                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                                                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                            {member.profile.phone}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">No phone</span>
                                                    )}
                                                    {!isSyntheticEmail ? (
                                                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                            <span className="truncate">{member.email}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] text-slate-400 italic">No external email</span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                {isNonLogin ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                                        Payroll Only
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                        Portal Login
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900 dark:text-white">
                                                    ₹{Number(member.hrDetails?.basicSalary || 0).toLocaleString()}
                                                </div>
                                                <span className="text-[10px] text-gray-400">Basic / month</span>
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleOpenEditModal(member)}
                                                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs font-semibold"
                                                        title="Edit Staff Member & Department"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                                        Edit
                                                    </Button>
                                                    <Link href={`/admin/hr/staff/${member._id}`}>
                                                        <Button
                                                            size="sm"
                                                            variant="primary"
                                                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white shadow-xs border border-slate-900"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 text-slate-300" />
                                                            Profile & Payroll
                                                        </Button>
                                                    </Link>

                                                    <button
                                                        onClick={() => handleDeleteStaff(member._id, fullName)}
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                        title="Remove staff member"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Add Staff Member Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => !submitting && setIsAddModalOpen(false)}
                title="Register New Staff Member"
                maxWidth="max-w-2xl"
            >
                <form onSubmit={handleAddStaffSubmit} className="space-y-5">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                First Name <span className="text-rose-500">*</span>
                            </label>
                            <Input
                                placeholder="e.g. Ramesh"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Last Name
                            </label>
                            <Input
                                placeholder="e.g. Kumar"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Role / Category <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={formData.role}
                                onChange={(e) => handleRoleSelectChange(e.target.value)}
                                className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            >
                                <option value="staff">Support Staff (Maid, Driver, Peon, Helper)</option>
                                <option value="instructor">Teaching Faculty / Teacher</option>
                                <option value="admin">Administrator / Office Staff</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Designation
                            </label>
                            <select
                                value={formData.designation}
                                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Select Designation...</option>
                                {designations.map((d) => (
                                    <option key={d._id} value={d._id}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Department / Shift Group
                            </label>
                            <select
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Select Department...</option>
                                {departments.map((d) => (
                                    <option key={d._id} value={d._id}>
                                        {d.name} {d.shiftTimings?.useCustomShift ? `(${d.shiftTimings.shiftStart} - ${d.shiftTimings.shiftEnd})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Phone Number
                            </label>
                            <Input
                                placeholder="e.g. 9876543210"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Date of Joining
                            </label>
                            <Input
                                type="date"
                                value={formData.joiningDate}
                                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Basic Monthly Salary (₹)
                            </label>
                            <Input
                                type="number"
                                min="0"
                                placeholder="e.g. 15000"
                                value={formData.basicSalary}
                                onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Qualification
                            </label>
                            <Input
                                placeholder="e.g. B.Ed, M.Sc, 10th Pass"
                                value={formData.qualification}
                                onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                <Fingerprint className="w-3.5 h-3.5 text-violet-600" />
                                Biometric / Punch ID
                            </label>
                            <Input
                                placeholder="e.g. 101"
                                value={formData.biometricId}
                                onChange={(e) => setFormData({ ...formData, biometricId: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Portal Login Credentials Section */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                    <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                                    Enable Portal Login & Credentials
                                </label>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                    Toggle off for support staff (maids, sweepers, drivers) who only need payroll and attendance records.
                                </p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={formData.allowLogin}
                                onClick={() => setFormData({ ...formData, allowLogin: !formData.allowLogin })}
                                className={cn(
                                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                    formData.allowLogin ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-700"
                                )}
                            >
                                <span
                                    className={cn(
                                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                        formData.allowLogin ? "translate-x-5" : "translate-x-0"
                                    )}
                                />
                            </button>
                        </div>

                        {formData.allowLogin ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Login Email <span className="text-rose-500">*</span>
                                    </label>
                                    <Input
                                        type="email"
                                        placeholder="staff@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required={formData.allowLogin}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Initial Password <span className="text-rose-500">*</span>
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder="At least 6 characters"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required={formData.allowLogin}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg p-2.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                                <span>
                                    No email or password required. An internal employee ID will be assigned automatically for payslips and attendance tracking.
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Collapsible Statutory & Bank Details */}
                    <div>
                        <button
                            type="button"
                            onClick={() => setShowBankingSection(!showBankingSection)}
                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                            <CreditCard className="w-3.5 h-3.5" />
                            {showBankingSection ? "Hide Statutory & Bank Details ▲" : "+ Add Statutory & Bank Details (Optional) ▼"}
                        </button>

                        {showBankingSection && (
                            <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">PAN Number</label>
                                        <Input
                                            placeholder="ABCDE1234F"
                                            value={formData.panNumber}
                                            onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">UAN / PF Number</label>
                                        <Input
                                            placeholder="101234567890"
                                            value={formData.uanNumber}
                                            onChange={(e) => setFormData({ ...formData, uanNumber: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">ESI Number</label>
                                        <Input
                                            placeholder="17 digits"
                                            value={formData.esiNumber}
                                            onChange={(e) => setFormData({ ...formData, esiNumber: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Bank Name</label>
                                        <Input
                                            placeholder="e.g. State Bank of India"
                                            value={formData.bankName}
                                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Account Holder Name</label>
                                        <Input
                                            placeholder="Name as in bank"
                                            value={formData.accountName}
                                            onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Account Number</label>
                                        <Input
                                            placeholder="Bank account number"
                                            value={formData.accountNumber}
                                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">IFSC Code</label>
                                        <Input
                                            placeholder="SBIN0001234"
                                            value={formData.ifscCode}
                                            onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Modal Actions */}
                    <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsAddModalOpen(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={submitting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create Staff Member
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Staff Member Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingStaff(null);
                }}
                title={editingStaff ? `Edit Staff: ${editingStaff.profile?.firstName} ${editingStaff.profile?.lastName || ""}` : "Edit Staff Member"}
                size="lg"
            >
                <form onSubmit={handleEditStaffSubmit} className="space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                First Name <span className="text-rose-500">*</span>
                            </label>
                            <Input
                                placeholder="e.g. Ramesh"
                                value={editFormData.firstName}
                                onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Last Name
                            </label>
                            <Input
                                placeholder="e.g. Kumar"
                                value={editFormData.lastName}
                                onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Role / Category <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={editFormData.role}
                                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                                className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            >
                                <option value="staff">Support Staff (Maid, Driver, Peon, Helper)</option>
                                <option value="instructor">Teaching Faculty / Teacher</option>
                                <option value="admin">Administrator / Office Staff</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Designation
                            </label>
                            <select
                                value={editFormData.designation}
                                onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                                className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Select Designation...</option>
                                {designations.map((d) => (
                                    <option key={d._id} value={d._id}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Department / Shift Group
                            </label>
                            <select
                                value={editFormData.department}
                                onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                                className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Select Department...</option>
                                {departments.map((d) => (
                                    <option key={d._id} value={d._id}>
                                        {d.name} {d.shiftTimings?.useCustomShift ? `(${d.shiftTimings.shiftStart} - ${d.shiftTimings.shiftEnd})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Phone Number
                            </label>
                            <Input
                                placeholder="e.g. 9876543210"
                                value={editFormData.phone}
                                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Date of Joining
                            </label>
                            <Input
                                type="date"
                                value={editFormData.joiningDate}
                                onChange={(e) => setEditFormData({ ...editFormData, joiningDate: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Basic Monthly Salary (₹)
                            </label>
                            <Input
                                type="number"
                                min="0"
                                placeholder="e.g. 15000"
                                value={editFormData.basicSalary}
                                onChange={(e) => setEditFormData({ ...editFormData, basicSalary: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Qualification
                            </label>
                            <Input
                                placeholder="e.g. B.Ed, M.Sc, 10th Pass"
                                value={editFormData.qualification}
                                onChange={(e) => setEditFormData({ ...editFormData, qualification: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                <Fingerprint className="w-3.5 h-3.5 text-violet-600" />
                                Biometric / Punch ID
                            </label>
                            <Input
                                placeholder="e.g. 101"
                                value={editFormData.biometricId}
                                onChange={(e) => setEditFormData({ ...editFormData, biometricId: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Portal Login Credentials Section */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                    <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                                    Portal Login Access
                                </label>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                    Allow this staff member to log in to the portal using their registered email.
                                </p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={editFormData.allowLogin}
                                onClick={() => setEditFormData({ ...editFormData, allowLogin: !editFormData.allowLogin })}
                                className={cn(
                                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                    editFormData.allowLogin ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-700"
                                )}
                            >
                                <span
                                    className={cn(
                                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                        editFormData.allowLogin ? "translate-x-5" : "translate-x-0"
                                    )}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Modal Actions */}
                    <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setIsEditModalOpen(false);
                                setEditingStaff(null);
                            }}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={submitting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
