"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
    User, Lock, Save, Camera, Mail, Building, 
    CheckCircle2, Loader2, Phone, Calendar, 
    MapPin, HeartPulse, GraduationCap, LogOut,
    Clock, Shield, Users, KeyRound, Bell, BellOff, BellRing
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { cn } from "@/lib/utils";
import { enableWebPush } from "@/components/notifications/WebPushInitializer";

// --- Validation Schemas ---

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

const profileSchema = z.object({
    bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
    phone: z.string().optional()
});

export default function StudentSettingsPage() {
    const { data: session, status, update: updateSession } = useSession();
    const router = useRouter();
    const toast = useToast();
    const fileInputRef = useRef(null);

    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [attendanceRate, setAttendanceRate] = useState(null);
    const [pushPermission, setPushPermission] = useState(
        typeof window !== "undefined" && "Notification" in window
            ? Notification.permission
            : "unsupported"
    );
    const [isEnablingPush, setIsEnablingPush] = useState(false);

    // Profile Form (Bio & Phone)
    const {
        register: registerProfile,
        handleSubmit: handleProfileSubmit,
        reset: resetProfile,
        formState: { errors: profileErrors },
    } = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            bio: "",
            phone: ""
        }
    });

    // Password Form
    const {
        register: registerPass,
        handleSubmit: handlePassSubmit,
        reset: resetPass,
        formState: { errors: passErrors },
    } = useForm({
        resolver: zodResolver(passwordSchema),
    });

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
        if (session?.user?.id) {
            resetProfile({
                bio: session.user.profile?.bio || "",
                phone: session.user.profile?.phone || ""
            });
            fetchAttendanceStats();
        }
    }, [status, router, session, resetProfile]);

    const fetchAttendanceStats = async () => {
        try {
            const res = await fetch("/api/v1/student/dashboard");
            if (res.ok) {
                const data = await res.json();
                if (data?.attendancePercentage !== undefined) {
                    setAttendanceRate(data.attendancePercentage);
                }
            }
        } catch (_) {}
    };

    const onUpdateProfile = async (data) => {
        setIsSavingProfile(true);
        try {
            const res = await fetch("/api/v1/student/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (res.ok) {
                toast.success("Profile details updated successfully");
                await updateSession();
            } else {
                toast.error(result.error || "Failed to update profile");
            }
        } catch (error) {
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsSavingProfile(false);
        }
    };

    const onUpdateAvatar = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error("Image size must be less than 2MB");
            return;
        }

        setIsUploadingAvatar(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("fileType", "image");

            const uploadRes = await fetch("/api/v1/upload", {
                method: "POST",
                body: formData
            });

            if (!uploadRes.ok) throw new Error("Upload failed");
            const uploadData = await uploadRes.json();

            const updateRes = await fetch("/api/v1/student/profile/avatar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ avatarUrl: uploadData.url }),
            });

            if (updateRes.ok) {
                toast.success("Profile photo updated!");
                await updateSession();
            } else {
                throw new Error("Failed to save avatar URL");
            }
        } catch (error) {
            toast.error(error.message || "Failed to update avatar photo");
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const onChangePassword = async (data) => {
        setIsUpdatingPassword(true);
        try {
            const res = await fetch("/api/v1/auth/student/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword: data.currentPassword,
                    newPassword: data.newPassword,
                }),
            });
            const result = await res.json();
            if (res.ok) {
                toast.success("Password updated successfully");
                resetPass();
            } else {
                toast.error(result.error || "Failed to update password");
            }
        } catch (error) {
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    if (status === "loading") return <LoadingSpinner fullPage />;
    if (!session?.user) return null;

    const user = session.user;
    const profile = user.profile || {};

    // Format Date of Birth
    let formattedDob = "Not specified";
    if (profile.dateOfBirth) {
        try {
            formattedDob = format(new Date(profile.dateOfBirth), "dd MMM yyyy");
        } catch (_) {}
    }

    // Format Residential Address
    let fullAddress = "Not specified";
    if (profile.address) {
        if (typeof profile.address === "string") {
            fullAddress = profile.address;
        } else if (typeof profile.address === "object") {
            const { street, city, state, pincode } = profile.address;
            const parts = [street, city, state, pincode].filter(Boolean);
            if (parts.length > 0) fullAddress = parts.join(", ");
        }
    }

    const initials = user.name
        ? user.name.trim().split(" ").filter(Boolean).map(e => e[0]).slice(0, 2).join("").toUpperCase()
        : "ST";

    const instituteName = user.institute?.name || "Institute";
    const instituteCode = user.institute?.code || "";
    const instituteType = user.institute?.type || "School";
    const enrollment = user.enrollmentNumber || "N/A";
    const grNumber = profile.grNumber || "";
    const bloodGroup = profile.bloodGroup || "Not specified";
    const fatherName = profile.fatherName || "";
    const motherName = profile.motherName || "";

    return (
        <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 pb-24 bg-[#F8F9FC] min-h-screen">
            
            {/* 1. EDGE-TO-EDGE APP HERO HEADER (Native Mobile App Style) */}
            <div className="w-full bg-[#002045] text-white pt-8 pb-12 px-4 text-center">
                <div className="max-w-md mx-auto space-y-3">
                    
                    {/* Centered Avatar with Camera Action Button */}
                    <div className="relative inline-block mx-auto">
                        <div className="w-24 h-24 rounded-full border-4 border-white/20 overflow-hidden bg-[#1E3A8A] flex items-center justify-center shadow-lg">
                            {isUploadingAvatar ? (
                                <Loader2 className="animate-spin text-white" size={28} />
                            ) : user.avatar || user.image ? (
                                <img 
                                    src={user.avatar || user.image} 
                                    alt={user.name || "Student"} 
                                    className="w-full h-full object-cover" 
                                />
                            ) : (
                                <span className="text-3xl font-bold text-white tracking-wider">
                                    {initials}
                                </span>
                            )}
                        </div>

                        <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingAvatar}
                            title="Update Profile Photo"
                            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center border-2 border-[#002045] shadow transition-all active:scale-95 cursor-pointer"
                        >
                            <Camera size={14} />
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={onUpdateAvatar}
                        />
                    </div>

                    {/* Student Identity Information */}
                    <div>
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold mb-1">
                            <CheckCircle2 size={12} />
                            <span>Enrolled Student</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                            {user.name || "Student"}
                        </h1>
                        <p className="text-xs text-[#86A0CD] font-medium mt-1 leading-relaxed">
                            ID: {enrollment} {grNumber ? `• GR: ${grNumber}` : ""}
                            <br />
                            {instituteName} {instituteCode ? `(${instituteCode})` : ""}
                        </p>
                    </div>

                </div>
            </div>

            {/* 2. OVERLAPPING 3-COLUMN STATS BAR (App Bento Row - Single Horizontal Line) */}
            <div className="-mt-7 px-4 max-w-2xl mx-auto">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    
                    {/* Stat 1: Attendance */}
                    <div className="bg-white rounded-xl py-3 px-2 border border-[#E2E8F0] shadow-sm text-center">
                        <Clock size={16} className="mx-auto text-emerald-600 mb-1" />
                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Attendance</p>
                        <p className="text-sm sm:text-base font-bold text-[#002045] mt-0.5">
                            {attendanceRate !== null ? `${attendanceRate}%` : "Tracked"}
                        </p>
                    </div>

                    {/* Stat 2: Academic Type */}
                    <div className="bg-white rounded-xl py-3 px-2 border border-[#E2E8F0] shadow-sm text-center">
                        <GraduationCap size={16} className="mx-auto text-[#002045] mb-1" />
                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Level</p>
                        <p className="text-sm sm:text-base font-bold text-[#002045] uppercase mt-0.5 truncate">
                            {instituteType}
                        </p>
                    </div>

                    {/* Stat 3: Blood Group */}
                    <div className="bg-white rounded-xl py-3 px-2 border border-[#E2E8F0] shadow-sm text-center">
                        <HeartPulse size={16} className="mx-auto text-rose-600 mb-1" />
                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Blood</p>
                        <p className="text-sm sm:text-base font-bold text-[#002045] mt-0.5">
                            {bloodGroup}
                        </p>
                    </div>

                </div>
            </div>

            {/* 3. APP SECTION GROUPS (Native Mobile List Style) */}
            <div className="max-w-2xl mx-auto px-4 mt-6 space-y-6">

                {/* GROUP 1: PERSONAL DETAILS */}
                <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider pl-1">
                        Personal Details
                    </p>
                    <div className="bg-white rounded-xl border border-[#E2E8F0] divide-y divide-slate-100 shadow-xs overflow-hidden">
                        
                        <div className="flex items-center gap-3.5 p-3.5">
                            <Mail size={18} className="text-[#64748B] shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-[#94A3B8]">Email Address</p>
                                <p className="text-sm font-semibold text-[#0F172A] truncate">{user.email || "N/A"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3.5 p-3.5">
                            <Phone size={18} className="text-[#64748B] shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-[#94A3B8]">Phone Number</p>
                                <p className="text-sm font-semibold text-[#0F172A] truncate">{profile.phone || "Not specified"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3.5 p-3.5">
                            <User size={18} className="text-[#64748B] shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-[#94A3B8]">Gender</p>
                                <p className="text-sm font-semibold text-[#0F172A] capitalize">{profile.gender || "Not specified"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3.5 p-3.5">
                            <Calendar size={18} className="text-[#64748B] shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-[#94A3B8]">Date of Birth</p>
                                <p className="text-sm font-semibold text-[#0F172A]">{formattedDob}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3.5 p-3.5">
                            <MapPin size={18} className="text-[#64748B] shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-[#94A3B8]">Residential Address</p>
                                <p className="text-sm font-semibold text-[#0F172A] leading-snug">{fullAddress}</p>
                            </div>
                        </div>

                    </div>
                </div>

                {/* GROUP 2: FAMILY & GUARDIAN DETAILS */}
                {(fatherName || motherName) && (
                    <div className="space-y-1.5">
                        <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider pl-1">
                            Family & Guardian Details
                        </p>
                        <div className="bg-white rounded-xl border border-[#E2E8F0] divide-y divide-slate-100 shadow-xs overflow-hidden">
                            {fatherName && (
                                <div className="flex items-center gap-3.5 p-3.5">
                                    <Users size={18} className="text-[#64748B] shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-medium text-[#94A3B8]">Father&apos;s Name</p>
                                        <p className="text-sm font-semibold text-[#0F172A]">{fatherName}</p>
                                    </div>
                                </div>
                            )}
                            {motherName && (
                                <div className="flex items-center gap-3.5 p-3.5">
                                    <Users size={18} className="text-[#64748B] shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-medium text-[#94A3B8]">Mother&apos;s Name</p>
                                        <p className="text-sm font-semibold text-[#0F172A]">{motherName}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* GROUP 3: INSTITUTIONAL INFORMATION */}
                <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider pl-1">
                        Institutional Records
                    </p>
                    <div className="bg-white rounded-xl border border-[#E2E8F0] divide-y divide-slate-100 shadow-xs overflow-hidden">
                        
                        <div className="flex items-center gap-3.5 p-3.5">
                            <Building size={18} className="text-[#64748B] shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-[#94A3B8]">Enrollment Number</p>
                                <p className="text-sm font-bold text-[#002045] font-mono">{enrollment}</p>
                            </div>
                        </div>

                        {grNumber && (
                            <div className="flex items-center gap-3.5 p-3.5">
                                <Building size={18} className="text-[#64748B] shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-medium text-[#94A3B8]">General Register (GR) Number</p>
                                    <p className="text-sm font-bold text-[#002045] font-mono">{grNumber}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3.5 p-3.5">
                            <Building size={18} className="text-[#64748B] shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-[#94A3B8]">Campus / Institute</p>
                                <p className="text-sm font-semibold text-[#0F172A]">{instituteName}</p>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                <CheckCircle2 size={11} /> Active
                            </span>
                        </div>

                    </div>
                </div>

                {/* GROUP 4: ACCOUNT SECURITY */}
                <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider pl-1">
                        Account Security
                    </p>
                    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 sm:p-5 shadow-xs">
                        <form onSubmit={handlePassSubmit(onChangePassword)} className="space-y-3.5">
                            <div>
                                <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
                                    Current Password
                                </label>
                                <Input 
                                    type="password"
                                    icon={KeyRound}
                                    placeholder="Enter current password"
                                    {...registerPass("currentPassword")}
                                    error={passErrors.currentPassword?.message}
                                    className="rounded-xl text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
                                        New Password
                                    </label>
                                    <Input 
                                        type="password"
                                        icon={Lock}
                                        placeholder="Min. 8 chars"
                                        {...registerPass("newPassword")}
                                        error={passErrors.newPassword?.message}
                                        className="rounded-xl text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
                                        Confirm Password
                                    </label>
                                    <Input 
                                        type="password"
                                        icon={Lock}
                                        placeholder="Repeat new password"
                                        {...registerPass("confirmPassword")}
                                        error={passErrors.confirmPassword?.message}
                                        className="rounded-xl text-sm"
                                    />
                                </div>
                            </div>

                            <Button 
                                type="submit" 
                                disabled={isUpdatingPassword} 
                                className="w-full h-10 bg-[#002045] hover:bg-[#0D2D59] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer mt-1"
                            >
                                {isUpdatingPassword ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="animate-spin" size={14} />
                                        <span>Updating...</span>
                                    </div>
                                ) : (
                                    <span>Update Password</span>
                                )}
                            </Button>
                        </form>
                    </div>
                </div>

                {/* GROUP 5: PUSH NOTIFICATIONS */}
                <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider pl-1">
                        Push Notifications
                    </p>
                    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3.5">
                            <div className="flex items-center gap-3">
                                {pushPermission === "granted" ? (
                                    <BellRing size={18} className="text-[#002045]" />
                                ) : pushPermission === "denied" ? (
                                    <BellOff size={18} className="text-[#EF4444]" />
                                ) : (
                                    <Bell size={18} className="text-[#64748B]" />
                                )}
                                <div>
                                    <p className="text-sm font-semibold text-[#0F172A]">Browser Notifications</p>
                                    <p className="text-[11px] text-[#64748B] mt-0.5">
                                        {pushPermission === "granted" && "Enabled — you'll receive alerts like the mobile app"}
                                        {pushPermission === "denied" && "Blocked — enable in browser site settings"}
                                        {pushPermission === "default" && "Get attendance, fee, and message alerts in Chrome"}
                                        {pushPermission === "unsupported" && "Not supported in this browser"}
                                    </p>
                                </div>
                            </div>
                            {pushPermission !== "denied" && pushPermission !== "unsupported" && pushPermission !== "granted" && (
                                <button
                                    type="button"
                                    disabled={isEnablingPush}
                                    onClick={async () => {
                                        setIsEnablingPush(true);
                                        try {
                                            const ok = await enableWebPush(session?.user?.id);
                                            setPushPermission(Notification.permission);
                                            if (ok) toast.success("Notifications enabled");
                                            else toast.error("Permission not granted");
                                        } catch {
                                            toast.error("Failed to enable notifications");
                                        } finally {
                                            setIsEnablingPush(false);
                                        }
                                    }}
                                    className="shrink-0 text-[11px] font-bold uppercase tracking-wider bg-[#002045] text-white px-3 py-1.5 rounded-lg disabled:opacity-50 cursor-pointer"
                                >
                                    {isEnablingPush ? "Enabling..." : "Enable"}
                                </button>
                            )}
                            {pushPermission === "granted" && (
                                <span className="shrink-0 text-[11px] font-bold text-[#16A34A] uppercase tracking-wider">Active</span>
                            )}
                            {pushPermission === "denied" && (
                                <span className="shrink-0 text-[11px] font-bold text-[#EF4444] uppercase tracking-wider">Blocked</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* GROUP 6: STUDENT BIO */}
                <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider pl-1">
                        Student Bio
                    </p>
                    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs">
                        <form onSubmit={handleProfileSubmit(onUpdateProfile)} className="space-y-3">
                            <textarea 
                                {...registerProfile("bio")}
                                placeholder="Add a short note about yourself or study goals..."
                                rows={3}
                                className="w-full p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] focus:bg-white focus:border-[#002045] focus:ring-1 focus:ring-blue-100 outline-none text-xs sm:text-sm text-[#0F172A] resize-none transition-all"
                            />
                            {profileErrors.bio && (
                                <p className="text-xs text-rose-600 font-medium">{profileErrors.bio.message}</p>
                            )}
                            <div className="flex justify-end">
                                <Button 
                                    type="submit" 
                                    disabled={isSavingProfile}
                                    className="h-8 px-4 rounded-lg bg-[#002045] hover:bg-[#0D2D59] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                                >
                                    {isSavingProfile ? <Loader2 className="animate-spin mr-1" size={12} /> : <Save size={12} className="mr-1" />}
                                    <span>{isSavingProfile ? "Saving..." : "Save Bio"}</span>
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* GROUP 6: SIGN OUT */}
                <div className="pt-2">
                    <button
                        type="button"
                        onClick={async () => {
                            await signOut({ redirect: false });
                            window.location.href = "/login";
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer"
                    >
                        <LogOut size={16} strokeWidth={2} />
                        <span>Sign Out of Account</span>
                    </button>
                </div>

                <p className="text-center text-[11px] text-[#94A3B8] font-medium pt-2">
                    IMS Student Portal v2.0
                </p>

            </div>

        </div>
    );
}
