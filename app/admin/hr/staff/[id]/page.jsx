"use client";

import { useState, useEffect, useCallback, use, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Camera,
  Copy,
  Check,
  Loader2,
  FileSpreadsheet,
  Edit3,
  User,
  Phone,
  Mail,
  Calendar,
  Shield,
} from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { cn } from "@/lib/utils";

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
  const [salaryActionState, setSalaryActionState] = useState("idle");
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
              <button
                type="button"
                className="mt-4 h-8 px-4 rounded-lg bg-[#14161A] text-white hover:bg-black text-[13px] font-semibold transition-all cursor-pointer"
              >
                Back to Staff Directory
              </button>
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
  const isInstructor = staff.role === "instructor" || staff.role === "faculty";

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

  const totalAllowances = earningsStructure
    .filter((item) => item.isIncluded)
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const liveGrossSalary = basicSalaryInput + totalAllowances;

  const totalDeductions = deductionsStructure
    .filter((item) => item.isIncluded)
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const liveEstNetSalary = Math.max(0, liveGrossSalary - totalDeductions);

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
    <div className="space-y-6 w-full pb-20 select-none">
      {/* ── Breadcrumb Navigation ────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
        <Link href="/admin/hr" className="hover:text-slate-900 transition-colors">
          Human resources
        </Link>
        <span>›</span>
        <Link href="/admin/hr/staff" className="hover:text-slate-900 transition-colors">
          Staff directory
        </Link>
        <span>›</span>
        <span className="font-semibold text-slate-900 truncate max-w-[260px]">
          {fullName}
        </span>
      </nav>

      {/* ── Profile Header & Integrated Tabs (Student Profile Style) ─── */}
      <div className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-xs mb-6">
        <div className="p-6 flex flex-col md:flex-row gap-6 items-start">
          {/* Avatar with hover upload trigger */}
          <div className="w-20 h-20 rounded-lg bg-blue-50/70 text-blue-600 font-bold border border-blue-100/70 flex items-center justify-center text-3xl shrink-0 relative group overflow-hidden">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={uploadingPhoto}
            />
            {staff.profile?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={staff.profile.avatar}
                alt={fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              staff.profile?.firstName?.[0]?.toUpperCase() || "S"
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Change Photo"
            >
              {uploadingPhoto ? (
                <Loader2 size={20} className="text-white animate-spin" />
              ) : (
                <Camera size={20} className="text-white" />
              )}
            </button>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{fullName}</h1>
              <Badge
                variant={staff.isActive !== false ? "success" : "danger"}
                className="text-[10px] px-2 py-0.5 font-bold"
              >
                {staff.isActive !== false ? "Active Staff" : "Inactive"}
              </Badge>
              {isAdmin ? (
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-bold">
                  Admin
                </Badge>
              ) : isInstructor ? (
                <Badge variant="primary" className="text-[10px] px-2 py-0.5 font-bold">
                  Teaching faculty
                </Badge>
              ) : (
                <Badge variant="neutral" className="text-[10px] px-2 py-0.5 font-bold">
                  Support staff
                </Badge>
              )}
            </div>

            <p className="text-xs font-semibold text-slate-500">
              {designationName}
              {departmentName ? ` • Department of ${departmentName}` : ""}
            </p>

            <div className="flex flex-wrap gap-4 text-xs text-slate-500 font-medium pt-0.5">
              {staff.email && (
                <div className="flex items-center gap-1.5">
                  <Mail size={13} className="text-slate-400" />
                  <a href={`mailto:${staff.email}`} className="hover:text-slate-900 hover:underline">
                    {staff.email}
                  </a>
                </div>
              )}
              {employeeCode && (
                <div className="flex items-center gap-1.5">
                  <Shield size={13} className="text-slate-400" />
                  <span className="font-mono font-semibold text-slate-700">{employeeCode}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(employeeCode)}
                    className="text-slate-400 hover:text-slate-700 p-0.5 transition-colors cursor-pointer"
                    title="Copy employee code"
                  >
                    {copiedCode ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </div>
              )}
              {staff.profile?.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone size={13} className="text-slate-400" />
                  <a href={`tel:${staff.profile.phone}`} className="hover:text-slate-900">
                    {staff.profile.phone}
                  </a>
                </div>
              )}
              {joiningFormatted && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  <span>
                    Joined {joiningFormatted}
                    {tenure ? ` (${tenure})` : ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-start">
            <button
              type="button"
              onClick={handleOpenEditProfile}
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Edit3 size={13} className="text-slate-500" />
              <span>Edit profile</span>
            </button>

            <Link href={`/admin/hr/payslips?staff=${staff._id}`}>
              <button
                type="button"
                className="h-8 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <FileSpreadsheet size={13} />
                <span>Generate payslip</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Integrated Tabs Bar */}
        <div className="flex border-t border-slate-100 px-4 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.isDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content Region ───────────────────────────────────────────── */}
      <main className="mt-6">
        {activeTab === "profile" && (
          <ProfileTab
            staff={staff}
            grossSalary={liveGrossSalary}
            estNetSalary={liveEstNetSalary}
            onOpenEditProfile={handleOpenEditProfile}
            onSwitchTab={handleTabChange}
          />
        )}

        {activeTab === "salary" && (
          <SalaryTab
            basicSalary={basicSalaryInput}
            onBasicSalaryChange={handleBasicSalaryChange}
            earnings={earningsStructure}
            onEarningChange={handleEarningChange}
            deductions={deductionsStructure}
          />
        )}

        {activeTab === "deductions" && (
          <DeductionsTab
            basicSalary={basicSalaryInput}
            earnings={earningsStructure}
            deductions={deductionsStructure}
            onDeductionChange={handleDeductionChange}
          />
        )}

        {activeTab === "attendance" && (
          <AttendanceTab
            attendanceMetrics={attendanceMetrics}
            month={attendanceMonth}
            year={attendanceYear}
            onMonthChange={handleAttendanceMonthChange}
            loading={attendanceLoading}
          />
        )}

        {activeTab === "payslips" && (
          <PayslipsTab
            payslips={payslips}
            staffId={staff._id}
          />
        )}
      </main>

      {/* ── Sticky Action Bar for Salary Tab ────────────────────────────── */}
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

      {/* ── Sticky Action Bar for Deductions Tab ────────────────────────── */}
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

      {/* ── Edit Profile Modal ─────────────────────────────────────────── */}
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
