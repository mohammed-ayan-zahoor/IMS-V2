"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Save, Camera, Mail, Building } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

    // ... (form setup remains)

    // ... (onChangePassword remains)

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
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
                                <div className="p-3 bg-slate-50 rounded-xl font-medium text-slate-700 flex items-center gap-3 border border-slate-100">
                                    <User size={16} className="text-slate-400 shrink-0" />
                                    {session.user?.name ?? "Unknown"}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Email Address</label>
                                <div className="p-3 bg-slate-50 rounded-xl font-medium text-slate-700 flex items-center gap-3 border border-slate-100">
                                    <Mail size={16} className="text-slate-400 shrink-0" />
                                    {session.user?.email ?? "—"}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Institute</label>
                                <div className="p-3 bg-slate-50 rounded-xl font-medium text-slate-700 flex items-center gap-3 border border-slate-100">
                                    <Building size={16} className="text-slate-400 shrink-0" />
                                    {session.user?.institute?.name || "Not Assigned"}
                                </div>
                            </div>
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
