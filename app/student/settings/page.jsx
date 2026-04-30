"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
    User, Lock, Save, Camera, Mail, Building, 
    CheckCircle2, Linkedin, Github, Globe, Loader2, 
    Smartphone, PenTool, ExternalLink, ArrowUpRight 
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/contexts/ToastContext";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

// --- Schemas ---

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
    phone: z.string().optional(),
    socialLinks: z.object({
        linkedin: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
        github: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
        portfolio: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
    })
});

export default function StudentSettingsPage() {
    const { data: session, status, update: updateSession } = useSession();
    const router = useRouter();
    const toast = useToast();
    const fileInputRef = useRef(null);

    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    // Profile Form
    const {
        register: registerProfile,
        handleSubmit: handleProfileSubmit,
        reset: resetProfile,
        formState: { errors: profileErrors },
    } = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            bio: "",
            phone: "",
            socialLinks: { linkedin: "", github: "", portfolio: "" }
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
            // Fetch fresh data or use session
            resetProfile({
                bio: session.user.profile?.bio || "",
                phone: session.user.profile?.phone || "",
                socialLinks: {
                    linkedin: session.user.profile?.socialLinks?.linkedin || "",
                    github: session.user.profile?.socialLinks?.github || "",
                    portfolio: session.user.profile?.socialLinks?.portfolio || "",
                }
            });
        }
    }, [status, router, session, resetProfile]);

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
                toast.success("Profile updated successfully");
                await updateSession(); // Refresh session data
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
            // 1. Upload to Cloudinary
            const formData = new FormData();
            formData.append("file", file);
            formData.append("fileType", "image");

            const uploadRes = await fetch("/api/v1/upload", {
                method: "POST",
                body: formData
            });

            if (!uploadRes.ok) throw new Error("Upload failed");
            const uploadData = await uploadRes.json();

            // 2. Update User Profile
            const updateRes = await fetch("/api/v1/student/profile/avatar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ avatarUrl: uploadData.url }),
            });

            if (updateRes.ok) {
                toast.success("Avatar updated!");
                await updateSession();
            } else {
                throw new Error("Failed to save avatar URL");
            }
        } catch (error) {
            toast.error(error.message || "Failed to update avatar");
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
    if (!session) return null;

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-20">
            {/* Header */}
            {/* Header Area - Soft Premium Theme */}
            <div className="p-10 rounded-[3rem] bg-white border border-slate-100 text-slate-900 relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-premium-blue/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-[2.5rem] bg-slate-50 border-4 border-white p-1 overflow-hidden transition-all duration-500 group-hover:border-premium-blue/50 group-hover:scale-105 shadow-xl">
                                {isUploadingAvatar ? (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-100">
                                        <Loader2 className="animate-spin text-premium-blue" size={32} />
                                    </div>
                                ) : session.user?.image ? (
                                    <img src={session.user.image} alt="Profile" className="w-full h-full object-cover rounded-[2rem]" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-3xl font-black text-slate-300 italic">
                                        {session.user?.name?.[0]}
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-2 -right-2 w-10 h-10 bg-premium-blue text-white rounded-2xl flex items-center justify-center shadow-xl border-4 border-white hover:bg-blue-700 transition-all active:scale-95"
                                disabled={isUploadingAvatar}
                            >
                                <Camera size={18} />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                onChange={onUpdateAvatar}
                            />
                        </div>
                        <div className="text-center md:text-left">
                            <h1 className="text-3xl font-black italic tracking-tight text-slate-900">{session.user?.name}</h1>
                            <p className="text-premium-blue font-bold text-sm flex items-center gap-2 justify-center md:text-left mt-1 uppercase tracking-widest">
                                <CheckCircle2 size={14} /> Student Member
                            </p>
                            <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                                <Badge variant="neutral" className="bg-slate-50 text-slate-500 border-slate-100 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                    ID: {session.user?.enrollmentNumber || 'N/A'}
                                </Badge>
                                <Badge variant="neutral" className="bg-slate-50 text-slate-500 border-slate-100 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                    {session.user?.institute?.name}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-10 md:grid-cols-3">
                {/* Profile Customization Form */}
                <div className="md:col-span-2 space-y-10">
                    <Card className="rounded-[3rem] border-none shadow-xl overflow-hidden group">
                        <div className="p-10 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                                    <PenTool size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 italic tracking-tight">Public Profile</h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Share your journey and links</p>
                                </div>
                            </div>
                            <Button 
                                onClick={handleProfileSubmit(onUpdateProfile)} 
                                disabled={isSavingProfile}
                                className="bg-premium-blue text-white hover:bg-blue-700 rounded-2xl px-8 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20"
                            >
                                {isSavingProfile ? <Loader2 className="animate-spin mr-2" size={14} /> : <Save size={14} className="mr-2" />}
                                {isSavingProfile ? "Saving..." : "Save Profile"}
                            </Button>
                        </div>
                        <div className="p-10 space-y-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">About Me / Bio</label>
                                <textarea 
                                    {...registerProfile("bio")}
                                    placeholder="Tell the world about yourself..."
                                    className="w-full min-h-[150px] p-6 rounded-[2rem] bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all font-medium text-slate-700 resize-none shadow-inner"
                                />
                                {profileErrors.bio && <p className="text-xs text-rose-500 font-bold ml-1">{profileErrors.bio.message}</p>}
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <Input 
                                    label="Mobile Phone"
                                    icon={Smartphone}
                                    {...registerProfile("phone")}
                                    placeholder="+91 ..."
                                    error={profileErrors.phone?.message}
                                    className="rounded-[1.5rem]"
                                />
                                <Input 
                                    label="LinkedIn Profile"
                                    icon={Linkedin}
                                    {...registerProfile("socialLinks.linkedin")}
                                    placeholder="https://linkedin.com/in/..."
                                    error={profileErrors.socialLinks?.linkedin?.message}
                                    className="rounded-[1.5rem]"
                                />
                                <Input 
                                    label="GitHub Profile"
                                    icon={Github}
                                    {...registerProfile("socialLinks.github")}
                                    placeholder="https://github.com/..."
                                    error={profileErrors.socialLinks?.github?.message}
                                    className="rounded-[1.5rem]"
                                />
                                <Input 
                                    label="Personal Website"
                                    icon={Globe}
                                    {...registerProfile("socialLinks.portfolio")}
                                    placeholder="https://..."
                                    error={profileErrors.socialLinks?.portfolio?.message}
                                    className="rounded-[1.5rem]"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Official Information (Read Only) */}
                    <Card className="rounded-[3rem] border-none shadow-xl overflow-hidden opacity-80 grayscale-[0.5] hover:grayscale-0 transition-all duration-700">
                        <div className="p-10 bg-slate-50/50 border-b border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
                                    <Building size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 italic tracking-tight">Institutional Records</h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verified by Administration</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Primary Email</p>
                                <p className="text-lg font-black text-slate-800">{session.user?.email}</p>
                             </div>
                             <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Enrollment Date</p>
                                <p className="text-lg font-black text-slate-800 italic">August 12, 2024</p>
                             </div>
                             <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Current Status</p>
                                <Badge variant="success" className="bg-emerald-50 text-emerald-600 border-emerald-100 uppercase text-[9px] font-black px-4">Active Member</Badge>
                             </div>
                        </div>
                    </Card>
                </div>

                {/* Security Section */}
                <div className="space-y-10">
                    <Card className="rounded-[3rem] border-none shadow-xl overflow-hidden group">
                        <div className="p-10 bg-slate-50/50 border-b border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-rose-500 shadow-sm group-hover:rotate-12 transition-transform">
                                    <Lock size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 italic tracking-tight">Security</h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Update Password</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-10">
                            <form onSubmit={handlePassSubmit(onChangePassword)} className="space-y-6">
                                <Input 
                                    label="Current Password"
                                    type="password"
                                    icon={Lock}
                                    {...registerPass("currentPassword")}
                                    error={passErrors.currentPassword?.message}
                                    className="rounded-[1.5rem]"
                                />
                                <Input 
                                    label="New Password"
                                    type="password"
                                    icon={Lock}
                                    {...registerPass("newPassword")}
                                    error={passErrors.newPassword?.message}
                                    className="rounded-[1.5rem]"
                                />
                                <Input 
                                    label="Confirm Password"
                                    type="password"
                                    icon={Lock}
                                    {...registerPass("confirmPassword")}
                                    error={passErrors.confirmPassword?.message}
                                    className="rounded-[1.5rem]"
                                />
                                <Button 
                                    type="submit" 
                                    disabled={isUpdatingPassword} 
                                    className="w-full bg-premium-blue text-white hover:bg-blue-700 rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] mt-4 shadow-lg shadow-blue-500/20"
                                >
                                    {isUpdatingPassword ? <Loader2 className="animate-spin mr-2" size={14} /> : <Save size={14} className="mr-2" />}
                                    Update Password
                                </Button>
                            </form>
                        </div>
                    </Card>

                    {/* Quick Access Links */}
                    <div className="p-10 rounded-[3rem] bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                        <h4 className="text-lg font-black italic mb-6 flex items-center gap-2">
                            Quick Nav <ArrowUpRight size={20} />
                        </h4>
                        <div className="space-y-3">
                            <QuickLink label="My Certificates" icon={ExternalLink} onClick={() => router.push('/student/documents')} />
                            <QuickLink label="Fee Receipts" icon={ExternalLink} onClick={() => router.push('/student/fees')} />
                            <QuickLink label="Live Timetable" icon={ExternalLink} onClick={() => router.push('/student/timetable')} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function QuickLink({ label, icon: Icon, onClick }) {
    return (
        <button 
            onClick={onClick}
            className="w-full flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 transition-all group/link"
        >
            <span className="text-xs font-black uppercase tracking-widest text-blue-100">{label}</span>
            <Icon size={14} className="text-white group-hover/link:translate-x-1 transition-transform" />
        </button>
    );
}
