"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Save, Camera, Mail, Building, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Badge from "@/components/ui/Badge";
import * as z from "zod";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export default function StudentSettingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(passwordSchema),
    });

    const onChangePassword = async (data) => {
        setIsLoading(true);
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
                reset();
            } else {
                toast.error(result.error || "Failed to update password");
            }
        } catch (error) {
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    if (status === "loading") return <LoadingSpinner fullPage />;
    if (!session) return null; // Should be handled by useEffect, but safe return

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* ... (Header remains) */}
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account Settings</h1>
                <p className="text-slate-500">Manage your profile and security preferences.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                {/* Profile Card */}
                <Card className="h-fit">
                    <div className="p-6 border-b border-border">
                        <div className="flex items-center gap-2">
                            <User className="text-premium-blue" size={20} />
                            <h2 className="font-bold text-lg text-slate-800">My Profile</h2>
                        </div>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex justify-center">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                                    {session.user?.image ? (
                                        <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-3xl font-black text-slate-300">
                                            {session.user?.name?.[0] || "?"}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Institutional Data</h3>
                                <Badge variant="success" className="text-[10px] py-0 px-2 flex items-center gap-1 opacity-80">
                                    <CheckCircle2 size={10} /> Verified
                                </Badge>
                            </div>
                            
                            <div className="space-y-4">
                                <ProfileItem label="Full Name" value={session.user?.name ?? "Unknown"} icon={User} />
                                <ProfileItem label="Email Address" value={session.user?.email ?? "—"} icon={Mail} />
                                <ProfileItem label="Institute" value={session.user?.institute?.name || "Not Assigned"} icon={Building} />
                            </div>

                            <p className="text-[10px] text-slate-400 italic text-center pt-2">
                                To update your official records, please contact the administration office.
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Security Card */}
                <Card className="h-fit">
                    <div className="p-6 border-b border-border">
                        <div className="flex items-center gap-2">
                            <Lock className="text-premium-purple" size={20} />
                            <h2 className="font-bold text-lg text-slate-800">Security</h2>
                        </div>
                    </div>
                    <div className="p-6">
                        <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
                            <Input
                                label="Current Password"
                                type="password"
                                icon={Lock}
                                {...register("currentPassword")}
                                error={errors.currentPassword?.message}
                            />
                            <Input
                                label="New Password"
                                type="password"
                                icon={Lock}
                                {...register("newPassword")}
                                error={errors.newPassword?.message}
                            />
                            <Input
                                label="Confirm Password"
                                type="password"
                                icon={Lock}
                                {...register("confirmPassword")}
                                error={errors.confirmPassword?.message}
                            />

                            <div className="pt-2">
                                <Button type="submit" disabled={isLoading} className="w-full">
                                    {isLoading ? "Updating..." : "Update Password"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </Card>
            </div>
        </div>
    );
}

function ProfileItem({ label, value, icon: Icon }) {
    return (
        <div className="group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter ml-1">
                {label}
            </label>
            <div className="mt-1 p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center gap-3 transition-colors hover:bg-slate-50">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                    <Icon size={14} />
                </div>
                <span className="text-sm font-bold text-slate-700 truncate">{value}</span>
            </div>
        </div>
    );
}

