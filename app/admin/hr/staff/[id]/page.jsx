"use client";

import { useState, useEffect, useCallback, use, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Camera,
  Copy,
  Check,
  Loader2,
  FileSpreadsheet,
  Edit3,
  User,
  ChevronRight,
  Phone,
  Mail,
  Calendar,
} from "lucide-react";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

import { ProfileTab } from "@/components/hr/staff-profile/ProfileTab";
import { SalaryTab } from "@/components/hr/staff-profile/SalaryTab";
import { DeductionsTab } from "@/components/hr/staff-profile/DeductionsTab";
import { AttendanceTab } from "@/components/hr/staff-profile/AttendanceTab";
import { PayslipsTab } from "@/components/hr/staff-profile/PayslipsTab";
import { ActionBar } from "@/components/hr/staff-profile/ActionBar";
import { EditProfileModal } from "@/components/hr/staff-profile/EditProfileModal";

export default function StaffProfilePage({ params }) {
  const resolvedParams = use(params);
  const id = resolvedParams?.id;

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const toast = useToast();
  const confirm = useConfirm();

  // Tab State with URL query sync
  const queryTab = searchParams.get("tab");
  const initialTab =
    queryTab === "details"
      ? "profile"
      : queryTab && ["profile", "salary", "deductions", "attendance", "payslips"].includes(queryTab)
      ? queryTab
      : "profile";

  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab changes with URL
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", newTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Main page data
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState(null);
  const [attendanceMetrics, setAttendanceMetrics] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [availableComponents, setAvailableComponents] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Edit Profile Form State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  const modalFileInputRef = useRef(null);

  // Copy state for employee code
  const [copiedCode, setCopiedCode] = useState(false);

  // Attendance Month Switcher State
  const [attendanceMonth, setAttendanceMonth] = useState(() => new Date().getMonth() + 1);
  const [attendanceYear, setAttendanceYear] = useState(() => new Date().getFullYear());
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Scroll observer for mini identity in sticky tab bar
  const headerRef = useRef(null);
  const [isScrolledPastHeader, setIsScrolledPastHeader] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!headerRef.current) return;
      const rect = headerRef.current.getBoundingClientRect();
      setIsScrolledPastHeader(rect.bottom < 80);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- Page-Level Draft Store for Salary and Deductions ---
  const [basicSalaryInput, setBasicSalaryInput] = useState(0);
  const [savedBasicSalary, setSavedBasicSalary] = useState(0);

  const [earningsStructure, setEarningsStructure] = useState([]);
  const [savedEarningsStructure, setSavedEarningsStructure] = useState([]);

  const [deductionsStructure, setDeductionsStructure] = useState([]);
  const [savedDeductionsStructure, setSavedDeductionsStructure] = useState([]);

  // Fetch staff profile and dependent data
  const fetchProfile = useCallback(
    async (signal) => {
      try {
        const res = await fetch(`/api/v1/hr/staff/${id}`, {
          signal: signal || AbortSignal.timeout(10000),
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();

        const staffData = data.staff;
        setStaff(staffData);
        setAttendanceMetrics(data.attendanceMetrics);
        setPayslips(data.payslips || []);
        setAvailableComponents(data.availableComponents || []);

        // Salary Structure initialization
        const basic = Number(staffData?.hrDetails?.basicSalary || 0);
        setBasicSalaryInput(basic);
        setSavedBasicSalary(basic);

        const activeEarnings = (data.availableComponents || []).filter(
          (c) => c.type === "earning" && c.recurrence !== "variable"
        );
        const assignedEarningsMap = new Map();
        (staffData?.hrDetails?.earnings || []).forEach((e) => {
          const compId = e.component?._id || e.component;
          assignedEarningsMap.set(compId?.toString(), e.amount);
        });

        const earningsList = activeEarnings.map((comp) => {
          const compIdStr = comp._id.toString();
          const hasAssigned = assignedEarningsMap.has(compIdStr);
          let defaultAmt = 0;
          if (comp.calculationType === "percentage") {
            defaultAmt = Math.round((basic * (comp.defaultValue || 0)) / 100);
          } else {
            defaultAmt = comp.defaultValue || 0;
          }
          const currentAmount = hasAssigned
            ? assignedEarningsMap.get(compIdStr)
            : defaultAmt;

          return {
            componentId: comp._id,
            name: comp.name,
            calculationType: comp.calculationType,
            percentageBasis: comp.percentageBasis,
            defaultValue: comp.defaultValue,
            isIncluded: hasAssigned || comp.defaultValue > 0,
            amount: currentAmount,
            isOverridden: hasAssigned && comp.calculationType === "percentage" && currentAmount !== defaultAmt,
          };
        });
        setEarningsStructure(earningsList);
        setSavedEarningsStructure(JSON.parse(JSON.stringify(earningsList)));

        // Deductions Structure initialization
        const activeDeductions = (data.availableComponents || []).filter(
          (c) => c.type === "deduction" && c.recurrence !== "variable"
        );
        const assignedDeductionsMap = new Map();
        (staffData?.hrDetails?.deductions || []).forEach((d) => {
          const compId = d.component?._id || d.component;
          assignedDeductionsMap.set(compId?.toString(), d.amount);
        });

        const deductionsList = activeDeductions.map((comp) => {
          const compIdStr = comp._id.toString();
          const hasAssigned = assignedDeductionsMap.has(compIdStr);
          let defaultAmt = 0;
          if (comp.calculationType === "percentage") {
            defaultAmt = Math.round((basic * (comp.defaultValue || 0)) / 100);
          } else {
            defaultAmt = comp.defaultValue || 0;
          }
          const currentAmount = hasAssigned
            ? assignedDeductionsMap.get(compIdStr)
            : defaultAmt;

          return {
            componentId: comp._id,
            name: comp.name,
            calculationType: comp.calculationType,
            percentageBasis: comp.percentageBasis,
            defaultValue: comp.defaultValue,
            isIncluded: hasAssigned || comp.defaultValue > 0,
            amount: currentAmount,
            isOverridden: hasAssigned && comp.calculationType === "percentage" && currentAmount !== defaultAmt,
          };
        });
        setDeductionsStructure(deductionsList);
        setSavedDeductionsStructure(JSON.parse(JSON.stringify(deductionsList)));

        // Profile Form initialization
        setProfileForm({
          firstName: staffData?.profile?.firstName || "",
          lastName: staffData?.profile?.lastName || "",
          avatar: staffData?.profile?.avatar || null,
          phone: staffData?.profile?.phone || "",
          gender: staffData?.profile?.gender || "",
          bloodGroup: staffData?.profile?.bloodGroup || "",
          dob: staffData?.profile?.dateOfBirth
            ? staffData.profile.dateOfBirth.split("T")[0]
            : "",
          role: staffData?.role || "staff",
          designation:
            staffData?.hrDetails?.designation?._id ||
            staffData?.hrDetails?.designation ||
            "",
          department:
            staffData?.department?._id || staffData?.department || "",
          qualification: staffData?.hrDetails?.qualification || "",
          joiningDate: staffData?.hrDetails?.joiningDate
            ? staffData.hrDetails.joiningDate.split("T")[0]
            : "",
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
          pincode: staffData?.profile?.address?.pincode || "",
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          toast.error("Failed to load staff details");
        }
      } finally {
        setLoading(false);
      }
    },
    [id, toast]
  );

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

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/departments");
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchProfile(controller.signal);
    fetchDesignations();
    fetchDepartments();
    return () => controller.abort();
  }, [fetchProfile, fetchDesignations, fetchDepartments]);

  // Attendance Month Switcher
  const handleAttendanceMonthChange = async (m, y) => {
    setAttendanceMonth(m);
    setAttendanceYear(y);
    try {
      setAttendanceLoading(true);
      const res = await fetch(`/api/v1/hr/staff/${id}?month=${m}&year=${y}`);
      if (!res.ok) throw new Error("Failed to load attendance");
      const data = await res.json();
      if (data.attendanceMetrics) {
        setAttendanceMetrics(data.attendanceMetrics);
      }
    } catch (err) {
      console.error("Error loading month attendance:", err);
      toast.error("Failed to load attendance for selected month");
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Dirty detection for Salary & Deductions
  const isSalaryDirty = useMemo(() => {
    if (basicSalaryInput !== savedBasicSalary) return true;
    if (earningsStructure.length !== savedEarningsStructure.length) return true;
    return (
      JSON.stringify(
        earningsStructure.map((e) => ({
          id: e.componentId,
          amount: Number(e.amount),
          inc: e.isIncluded,
          ovr: e.isOverridden,
        }))
      ) !==
      JSON.stringify(
        savedEarningsStructure.map((e) => ({
          id: e.componentId,
          amount: Number(e.amount),
          inc: e.isIncluded,
          ovr: e.isOverridden,
        }))
      )
    );
  }, [basicSalaryInput, savedBasicSalary, earningsStructure, savedEarningsStructure]);

  const isDeductionsDirty = useMemo(() => {
    if (deductionsStructure.length !== savedDeductionsStructure.length) return true;
    return (
      JSON.stringify(
        deductionsStructure.map((d) => ({
          id: d.componentId,
          amount: Number(d.amount),
          inc: d.isIncluded,
          ovr: d.isOverridden,
        }))
      ) !==
      JSON.stringify(
        savedDeductionsStructure.map((d) => ({
          id: d.componentId,
          amount: Number(d.amount),
          inc: d.isIncluded,
          ovr: d.isOverridden,
        }))
      )
    );
  }, [deductionsStructure, savedDeductionsStructure]);

  // Warn on beforeunload if edits are unsaved
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isSalaryDirty || isDeductionsDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSalaryDirty, isDeductionsDirty]);

  // Salary change handlers
  const handleBasicSalaryChange = (newBasic) => {
    const basicVal = Math.max(0, parseFloat(newBasic) || 0);
    setBasicSalaryInput(basicVal);

    // Auto-update non-overridden percentage components
    setEarningsStructure((prev) =>
      prev.map((item) => {
        if (item.calculationType === "percentage" && !item.isOverridden) {
          return {
            ...item,
            amount: Math.round((basicVal * (item.defaultValue || 0)) / 100),
          };
        }
        return item;
      })
    );

    setDeductionsStructure((prev) =>
      prev.map((item) => {
        if (item.calculationType === "percentage" && !item.isOverridden) {
          return {
            ...item,
            amount: Math.round((basicVal * (item.defaultValue || 0)) / 100),
          };
        }
        return item;
      })
    );
  };

  const handleEarningChange = (index, updatedItem) => {
    setEarningsStructure((prev) => {
      const copy = [...prev];
      copy[index] = updatedItem;
      return copy;
    });
  };

  const handleDeductionChange = (index, updatedItem) => {
    setDeductionsStructure((prev) => {
      const copy = [...prev];
      copy[index] = updatedItem;
      return copy;
    });
  };

  // Discard actions
  const handleDiscardSalary = () => {
    setBasicSalaryInput(savedBasicSalary);
    setEarningsStructure(JSON.parse(JSON.stringify(savedEarningsStructure)));
    toast.success("Salary changes discarded");
  };

  const handleDiscardDeductions = () => {
    setDeductionsStructure(JSON.parse(JSON.stringify(savedDeductionsStructure)));
    toast.success("Deduction changes discarded");
  };

  // Save Salary Structure
  const [salaryActionState, setSalaryActionState] = useState("idle"); // idle | dirty | saving | saved | error
  const handleSaveSalaryStructure = async () => {
    if (!basicSalaryInput || basicSalaryInput <= 0) {
      toast.error("Please enter a valid monthly basic pay");
      return;
    }

    setSalaryActionState("saving");
    try {
      const activeEarningsToSave = earningsStructure
        .filter((item) => item.isIncluded && Number(item.amount) > 0)
        .map((item) => ({
          component: item.componentId,
          amount: parseFloat(item.amount) || 0,
        }));

      const res = await fetch(`/api/v1/hr/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basicSalary: basicSalaryInput,
          earnings: activeEarningsToSave,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save salary structure");

      setSavedBasicSalary(basicSalaryInput);
      setSavedEarningsStructure(JSON.parse(JSON.stringify(earningsStructure)));
      setStaff(data.staff);
      setSalaryActionState("saved");
      toast.success("Salary structure saved successfully");
      setTimeout(() => setSalaryActionState("idle"), 1200);
    } catch (error) {
      setSalaryActionState("error");
      toast.error(error.message || "Failed to update salary");
    }
  };

  // Save Deductions Structure
  const [deductionsActionState, setDeductionsActionState] = useState("idle");
  const handleSaveDeductions = async () => {
    setDeductionsActionState("saving");
    try {
      const activeDeductionsToSave = deductionsStructure
        .filter((item) => item.isIncluded && Number(item.amount) > 0)
        .map((item) => ({
          component: item.componentId,
          amount: parseFloat(item.amount) || 0,
        }));

      const res = await fetch(`/api/v1/hr/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deductions: activeDeductionsToSave,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save deductions");

      setSavedDeductionsStructure(JSON.parse(JSON.stringify(deductionsStructure)));
      setStaff(data.staff);
      setDeductionsActionState("saved");
      toast.success("Taxes & deductions saved successfully");
      setTimeout(() => setDeductionsActionState("idle"), 1200);
    } catch (error) {
      setDeductionsActionState("error");
      toast.error(error.message || "Failed to update deductions");
    }
  };

  // Photo Upload & Removal
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
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Failed to upload photo");

      const imageUrl = uploadData.url;

      const patchRes = await fetch(`/api/v1/hr/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: imageUrl }),
      });
      const patchData = await patchRes.json();
      if (!patchRes.ok) throw new Error(patchData.error || "Failed to update profile photo");

      setStaff((prev) => ({
        ...prev,
        profile: {
          ...prev?.profile,
          avatar: imageUrl,
        },
      }));
      setProfileForm((prev) => ({
        ...prev,
        avatar: imageUrl,
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

  const handleRemovePhoto = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const ok = await confirm({
      title: "Remove Photo",
      message: "Are you sure you want to remove this staff profile photo?",
      confirmText: "Remove",
      variant: "danger",
    });
    if (!ok) return;

    setUploadingPhoto(true);
    try {
      const patchRes = await fetch(`/api/v1/hr/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: null }),
      });
      const patchData = await patchRes.json();
      if (!patchRes.ok) throw new Error(patchData.error || "Failed to remove photo");

      setStaff((prev) => ({
        ...prev,
        profile: {
          ...prev?.profile,
          avatar: null,
        },
      }));
      setProfileForm((prev) => ({
        ...prev,
        avatar: null,
      }));
      toast.success("Profile photo removed successfully");
    } catch (err) {
      toast.error(err.message || "Failed to remove photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Save Profile modal
  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (profileForm.allowLogin) {
      if (!profileForm.email?.trim()) {
        toast.error("Please enter a valid login email address");
        return;
      }
      if (profileForm.password && profileForm.password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
    }

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
        department: profileForm.department || null,
        qualification: profileForm.qualification.trim(),
        joiningDate: profileForm.joiningDate || null,
        allowLogin: !!profileForm.allowLogin,
        ...(profileForm.email?.trim()
          ? { email: profileForm.email.trim().toLowerCase() }
          : {}),
        ...(profileForm.password?.trim()
          ? { password: profileForm.password.trim() }
          : {}),
        ...(profileForm.avatar !== undefined ? { avatar: profileForm.avatar } : {}),
        panNumber: profileForm.panNumber.trim(),
        uanNumber: profileForm.uanNumber.trim(),
        esiNumber: profileForm.esiNumber.trim(),
        bankDetails: {
          bankName: profileForm.bankName.trim(),
          accountName: profileForm.accountName.trim(),
          accountNumber: profileForm.accountNumber.trim(),
          ifscCode: profileForm.ifscCode.trim(),
          branch: profileForm.branch.trim(),
        },
        address: {
          street: profileForm.street.trim(),
          city: profileForm.city.trim(),
          state: profileForm.state.trim(),
          pincode: profileForm.pincode.trim(),
        },
      };

      const res = await fetch(`/api/v1/hr/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const handleOpenEditProfile = () => {
    if (staff) {
      const isSynthetic = staff.email?.endsWith("@ims.internal");
      setProfileForm({
        firstName: staff.profile?.firstName || "",
        lastName: staff.profile?.lastName || "",
        avatar: staff.profile?.avatar || null,
        phone: staff.profile?.phone || "",
        email: isSynthetic ? "" : staff.email || "",
        existingInternalEmail: isSynthetic ? staff.email : null,
        password: "",
        gender: staff.profile?.gender || "",
        bloodGroup: staff.profile?.bloodGroup || "",
        dob: staff.profile?.dateOfBirth
          ? staff.profile.dateOfBirth.split("T")[0]
          : "",
        role: staff.role || "staff",
        designation:
          staff.hrDetails?.designation?._id ||
          staff.hrDetails?.designation ||
          "",
        department: staff.department?._id || staff.department || "",
        qualification: staff.hrDetails?.qualification || "",
        joiningDate: staff.hrDetails?.joiningDate
          ? staff.hrDetails.joiningDate.split("T")[0]
          : "",
        allowLogin: staff.allowLogin !== false,
        panNumber: staff.hrDetails?.panNumber || "",
        uanNumber: staff.hrDetails?.uanNumber || "",
        esiNumber: staff.hrDetails?.esiNumber || "",
        bankName: staff.hrDetails?.bankDetails?.bankName || "",
        accountName: staff.hrDetails?.bankDetails?.accountName || "",
        accountNumber: staff.hrDetails?.bankDetails?.accountNumber || "",
        ifscCode: staff.hrDetails?.bankDetails?.ifscCode || "",
        branch: staff.hrDetails?.bankDetails?.branch || "",
        street: staff.profile?.address?.street || "",
        city: staff.profile?.address?.city || "",
        state: staff.profile?.address?.state || "",
        pincode: staff.profile?.address?.pincode || "",
      });
      setIsEditProfileOpen(true);
    }
  };

  const handleCopyCode = async (code) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error("Failed to copy code", err);
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
      <div className="p-8 max-w-4xl mx-auto">
        <EmptyState
          icon={User}
          title="Staff Member Not Found"
          description="The requested staff profile does not exist or has been removed."
          action={
            <Link href="/admin/hr/staff">
              <Button className="mt-4 bg-[#4F46E5] text-white">
                Back to Staff Directory
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const fullName =
    `${staff.profile?.firstName || ""} ${staff.profile?.lastName || ""}`.trim() ||
    "Staff Member";
  const employeeCode = staff.employeeCode || staff.employeeId || "";
  const designationName = staff.hrDetails?.designation?.name || "General Staff";
  const departmentName = staff.department?.name || staff.department?.code || "";
  const isAdmin = staff.role === "admin";

  const formatJoiningDate = (dateVal) => {
    if (!dateVal) return null;
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return null;
      return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(d);
    } catch {
      return null;
    }
  };

  const calculateTenure = (joiningDateVal) => {
    if (!joiningDateVal) return "";
    try {
      const joined = new Date(joiningDateVal);
      if (isNaN(joined.getTime())) return "";
      const now = new Date();
      const diffMonths =
        (now.getFullYear() - joined.getFullYear()) * 12 +
        (now.getMonth() - joined.getMonth());
      if (diffMonths < 1) return "Joined recently";
      if (diffMonths < 12) return `${diffMonths} mos`;
      const years = Math.floor(diffMonths / 12);
      return `${years} ${years === 1 ? "yr" : "yrs"}`;
    } catch {
      return "";
    }
  };

  const joiningFormatted = formatJoiningDate(staff.hrDetails?.joiningDate);
  const tenure = calculateTenure(staff.hrDetails?.joiningDate);

  // Derived Totals for Profile summary & compensation
  const totalAllowances = earningsStructure
    .filter((item) => item.isIncluded)
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const liveGrossSalary = basicSalaryInput + totalAllowances;

  const totalDeductions = deductionsStructure
    .filter((item) => item.isIncluded)
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const liveEstNetSalary = Math.max(0, liveGrossSalary - totalDeductions);

  // Tab definitions
  const tabs = [
    { id: "profile", label: "Profile" },
    {
      id: "salary",
      label: "Salary",
      isDirty: isSalaryDirty,
    },
    {
      id: "deductions",
      label: "Deductions",
      isDirty: isDeductionsDirty,
    },
    { id: "attendance", label: "Attendance" },
    {
      id: "payslips",
      label: "Payslips",
      count: payslips.length,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F8FC] dark:bg-[#0B0F17] text-[#101323] dark:text-gray-100 pb-28">
      {/* 7.0 BREADCRUMB */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-3">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-[#6B7280] dark:text-gray-400"
        >
          <Link
            href="/admin/hr"
            className="hover:text-[#101323] dark:hover:text-white transition-colors"
          >
            Human resources
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#8E93A8]/60" />
          <Link
            href="/admin/hr/staff"
            className="hover:text-[#101323] dark:hover:text-white transition-colors"
          >
            Staff directory
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#8E93A8]/60" />
          <span
            className="font-medium text-[#101323] dark:text-white truncate max-w-[200px]"
            aria-current="page"
          >
            {fullName}
          </span>
        </nav>
      </div>

      {/* 7.0 IDENTITY BLOCK (Unboxed, on page background) */}
      <header
        ref={headerRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-6 border-b border-[#E9E9F1] dark:border-gray-800/80"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          {/* Identity details */}
          <div className="flex items-start gap-4 sm:gap-5 min-w-0">
            {/* 72x72 Avatar with hover camera overlay */}
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
                  className="w-[72px] h-[72px] rounded-[14px] object-cover border border-[#E9E9F1] dark:border-gray-800 shadow-xs"
                />
              ) : (
                <div className="w-[72px] h-[72px] rounded-[14px] bg-[#4F46E5] flex items-center justify-center text-white font-semibold text-2xl shadow-xs select-none">
                  {staff.profile?.firstName?.[0]?.toUpperCase() || "S"}
                </div>
              )}

              {/* Hover Camera Overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                title="Change staff photo"
                aria-label="Change staff photo"
                className="absolute inset-0 bg-[#0F172A]/50 text-white rounded-[14px] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 flex flex-col items-center justify-center gap-0.5 transition-opacity backdrop-blur-[2px] cursor-pointer"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span className="text-[10px] font-semibold">Change</span>
                  </>
                )}
              </button>
            </div>

            {/* Name, Roles, and Metadata */}
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[22px] leading-[26px] font-semibold tracking-[-0.02em] text-[#101323] dark:text-white truncate">
                  {fullName}
                </h1>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-[4px] bg-[#EEF0FF] dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-300 text-xs font-semibold select-none">
                    Admin
                  </span>
                )}
              </div>

              <div className="text-sm font-medium text-[#101323]/80 dark:text-gray-300">
                {designationName}
                {departmentName ? ` · ${departmentName}` : ""}
              </div>

              {/* Contact & Date Metadata Line */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6B7280] dark:text-gray-400 pt-0.5">
                {employeeCode && (
                  <span className="inline-flex items-center gap-1 font-mono text-[13px] text-[#101323] dark:text-gray-300">
                    <span>{employeeCode}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(employeeCode)}
                      title="Copy employee code"
                      aria-label="Copy employee code"
                      className="text-[#6B7280] hover:text-[#101323] dark:hover:text-white p-0.5 cursor-pointer"
                    >
                      {copiedCode ? (
                        <Check className="w-3.5 h-3.5 text-[#047857]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <span aria-live="polite" className="sr-only">
                      {copiedCode ? "Copied" : ""}
                    </span>
                  </span>
                )}

                {staff.profile?.phone && (
                  <>
                    <span>·</span>
                    <a
                      href={`tel:${staff.profile.phone}`}
                      className="hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3 text-[#8E93A8]" />
                      <span>{staff.profile.phone}</span>
                    </a>
                  </>
                )}

                {staff.email && (
                  <>
                    <span>·</span>
                    <a
                      href={`mailto:${staff.email}`}
                      className="hover:underline flex items-center gap-1 truncate max-w-[220px]"
                    >
                      <Mail className="w-3 h-3 text-[#8E93A8]" />
                      <span className="truncate">{staff.email}</span>
                    </a>
                  </>
                )}

                {joiningFormatted && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#8E93A8]" />
                      <span>Joined {joiningFormatted}</span>
                      {tenure ? <span>· {tenure}</span> : null}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Header Action CTAs (§7.0: Primary + Secondary same shape & size) */}
          <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
            <button
              type="button"
              onClick={handleOpenEditProfile}
              className="h-9 px-3.5 rounded-[8px] border border-[#8E93A8]/50 dark:border-gray-700 bg-transparent hover:bg-[#F1F1F8] dark:hover:bg-gray-800 text-xs font-semibold text-[#101323] dark:text-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer active:scale-97 shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>Edit profile</span>
            </button>

            <Link href={`/admin/hr/payslips?staff=${staff._id}`}>
              <button
                type="button"
                className="h-9 px-4 rounded-[8px] bg-[#4F46E5] hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-97"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Generate payslip</span>
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* 7.0 TAB BAR (Sticky, Translucent, Roving Tabindex & Sliding Spring Indicator) */}
      <div className="sticky top-0 z-30 bg-[#F8F8FC]/80 dark:bg-[#0B0F17]/80 backdrop-blur-xl border-b border-[#E9E9F1] dark:border-gray-800/80 transition-shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Mini-identity on scroll past header */}
          <div
            className={`flex items-center gap-2.5 transition-opacity duration-200 mr-4 ${
              isScrolledPastHeader ? "opacity-100" : "opacity-0 pointer-events-none w-0 overflow-hidden"
            }`}
          >
            {staff.profile?.avatar ? (
              <img
                src={staff.profile.avatar}
                alt={fullName}
                className="w-6 h-6 rounded-md object-cover border border-[#E9E9F1] dark:border-gray-800 shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-md bg-[#4F46E5] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                {staff.profile?.firstName?.[0]?.toUpperCase() || "S"}
              </div>
            )}
            <span className="text-xs font-semibold text-[#101323] dark:text-gray-100 truncate max-w-[140px]">
              {fullName}
            </span>
          </div>

          {/* Tab Navigation */}
          <nav
            role="tablist"
            aria-label="Staff profile sections"
            className="flex items-center space-x-1 sm:space-x-4 overflow-x-auto no-scrollbar py-1"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${tab.id}`}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative py-3 px-3 text-xs font-medium transition-colors cursor-pointer select-none whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? "text-[#101323] dark:text-white font-semibold"
                      : "text-[#6B7280] dark:text-gray-400 hover:text-[#101323] dark:hover:text-gray-200"
                  }`}
                >
                  <span>{tab.label}</span>

                  {/* Tab Count Numeral */}
                  {tab.count !== undefined && (
                    <span className="text-[11px] font-mono tabular-nums text-[#6B7280] dark:text-gray-400">
                      {tab.count}
                    </span>
                  )}

                  {/* Dirty Dot Indicator */}
                  {tab.isDirty && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]"
                      title="Unsaved changes"
                      aria-label="Unsaved changes"
                    />
                  )}

                  {/* Active Sliding Indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#4F46E5]"
                      transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* MAIN TAB CONTENT REGION */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {activeTab === "profile" && (
          <div
            role="tabpanel"
            id="tabpanel-profile"
            aria-labelledby="tab-profile"
          >
            <ProfileTab
              staff={staff}
              grossSalary={liveGrossSalary}
              estNetSalary={liveEstNetSalary}
              onOpenEditProfile={handleOpenEditProfile}
              onSwitchTab={handleTabChange}
            />
          </div>
        )}

        {activeTab === "salary" && (
          <div
            role="tabpanel"
            id="tabpanel-salary"
            aria-labelledby="tab-salary"
          >
            <SalaryTab
              basicSalary={basicSalaryInput}
              onBasicSalaryChange={handleBasicSalaryChange}
              earnings={earningsStructure}
              onEarningChange={handleEarningChange}
              deductions={deductionsStructure}
            />
          </div>
        )}

        {activeTab === "deductions" && (
          <div
            role="tabpanel"
            id="tabpanel-deductions"
            aria-labelledby="tab-deductions"
          >
            <DeductionsTab
              basicSalary={basicSalaryInput}
              earnings={earningsStructure}
              deductions={deductionsStructure}
              onDeductionChange={handleDeductionChange}
            />
          </div>
        )}

        {activeTab === "attendance" && (
          <div
            role="tabpanel"
            id="tabpanel-attendance"
            aria-labelledby="tab-attendance"
          >
            <AttendanceTab
              attendanceMetrics={attendanceMetrics}
              month={attendanceMonth}
              year={attendanceYear}
              onMonthChange={handleAttendanceMonthChange}
              loading={attendanceLoading}
            />
          </div>
        )}

        {activeTab === "payslips" && (
          <div
            role="tabpanel"
            id="tabpanel-payslips"
            aria-labelledby="tab-payslips"
          >
            <PayslipsTab
              payslips={payslips}
              staffId={staff._id}
            />
          </div>
        )}
      </main>

      {/* STICKY ACTION BAR FOR SALARY TAB */}
      {activeTab === "salary" && (
        <ActionBar
          dirtyCount={isSalaryDirty ? 1 : 0}
          state={salaryActionState !== "idle" ? salaryActionState : isSalaryDirty ? "dirty" : "idle"}
          onSave={handleSaveSalaryStructure}
          onDiscard={handleDiscardSalary}
          saveLabel="Save salary structure"
          errorMessage="Couldn't save salary structure"
        />
      )}

      {/* STICKY ACTION BAR FOR DEDUCTIONS TAB */}
      {activeTab === "deductions" && (
        <ActionBar
          dirtyCount={isDeductionsDirty ? 1 : 0}
          state={deductionsActionState !== "idle" ? deductionsActionState : isDeductionsDirty ? "dirty" : "idle"}
          onSave={handleSaveDeductions}
          onDiscard={handleDiscardDeductions}
          saveLabel="Save deductions"
          errorMessage="Couldn't save deductions"
        />
      )}

      {/* PRESERVED EDIT PROFILE MODAL */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        saving={saving}
        profileForm={profileForm}
        setProfileForm={setProfileForm}
        onSubmit={handleSaveProfile}
        staff={staff}
        designations={designations}
        departments={departments}
        uploadingPhoto={uploadingPhoto}
        modalFileInputRef={modalFileInputRef}
        onPhotoUpload={handlePhotoUpload}
        onRemovePhoto={handleRemovePhoto}
      />
    </div>
  );
}
