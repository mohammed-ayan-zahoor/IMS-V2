"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Building2,
    ArrowLeft,
    Shield,
    KeyRound,
    User,
    Phone,
    MapPin,
    Mail,
    CheckCircle2,
    Zap
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import Link from "next/link";
import Button from "@/components/ui/Button";

const container = {
    hidden: { opacity: 0, y: 20 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            staggerChildren: 0.1,
            duration: 0.4,
            ease: [0.23, 1, 0.32, 1]
        }
    }
};

const item = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 }
};

export default function CreateInstitutePage() {
    const toast = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        adminEmail: "",
        adminPassword: "",
        adminName: "",
        contactPhone: "",
        addressStr: ""
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: name === "code" ? value.toUpperCase() : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/v1/institutes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const contentType = res.headers.get("content-type");
                let errorMessage = "Failed to create institute.";

                if (contentType?.includes("application/json")) {
                    const data = await res.json();
                    if (data.error && typeof data.error === 'string') {
                        errorMessage = data.error;
                    }
                }
                throw new Error(errorMessage);
            }
            toast.success("Institute protocol initialized successfully!");
            router.push("/super-admin/institutes");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="max-w-3xl mx-auto"
        >
            <div className="mb-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/super-admin/institutes">
                        <motion.button
                            whileHover={{ x: -4 }}
                            className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 shadow-sm transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </motion.button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Register Organization</h1>
                        <p className="text-slate-500 font-medium">Provision new institutional nodes on the network.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Organization Details */}
                <motion.div variants={item} className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                            <Building2 size={20} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Organization Profile</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            label="Organization Legal Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            icon={Building2}
                            required
                        />
                        <FormField
                            label="Institutional ID (Unique Code)"
                            name="code"
                            value={formData.code}
                            onChange={handleChange}
                            icon={Shield}
                            required
                            placeholder="e.g. ACME_UNI"
                            className="uppercase"
                        />
                        <FormField
                            label="Direct Support Line"
                            name="contactPhone"
                            value={formData.contactPhone}
                            onChange={handleChange}
                            icon={Phone}
                        />
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <MapPin size={12} /> Registered Address
                            </label>
                            <textarea
                                name="addressStr"
                                value={formData.addressStr}
                                onChange={handleChange}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold placeholder:text-slate-300 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 focus:bg-white transition-all min-h-[100px]"
                                rows="3"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Root Admin Account */}
                <motion.div variants={item} className="bg-slate-900 p-8 rounded-[32px] relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-blue-400">
                                <KeyRound size={20} />
                            </div>
                            <h3 className="text-xl font-black text-white tracking-tight">Root Auditor Credential</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4">
                                <CheckCircle2 className="text-emerald-400" size={20} />
                                <p className="text-sm font-bold text-white/70">
                                    Initializing first-tier administrator for the organization.
                                </p>
                            </div>

                            <DarkFormField
                                label="Full Legal Name"
                                name="adminName"
                                value={formData.adminName}
                                onChange={handleChange}
                                icon={User}
                            />
                            <DarkFormField
                                label="Official Email Access"
                                type="email"
                                name="adminEmail"
                                value={formData.adminEmail}
                                onChange={handleChange}
                                icon={Mail}
                                required
                            />
                            <div className="md:col-span-2">
                                <DarkFormField
                                    label="Secure Access Key"
                                    type="password"
                                    name="adminPassword"
                                    value={formData.adminPassword}
                                    onChange={handleChange}
                                    icon={KeyRound}
                                    required
                                    minLength={12}
                                />
                            </div>
                        </div>
                    </div>
                    {/* Background Detail */}
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-blue-600/20 blur-[100px]" />
                </motion.div>

                <motion.div variants={item} className="pt-6">
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-16 rounded-[24px] font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Zap size={20} strokeWidth={3} />
                                Provision High-Level Access
                            </>
                        )}
                    </Button>
                </motion.div>
            </form>
        </motion.div>
    );
}

function FormField({ label, icon: Icon, className, ...props }) {
    return (
        <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Icon size={12} /> {label}
            </label>
            <input
                {...props}
                className={cn(
                    "w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold placeholder:text-slate-300 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 focus:bg-white transition-all font-mono tracking-tight",
                    className
                )}
            />
        </div>
    );
}

function DarkFormField({ label, icon: Icon, className, ...props }) {
    return (
        <div className="space-y-2">
            <label className="text-xs font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Icon size={12} /> {label}
            </label>
            <input
                {...props}
                className={cn(
                    "w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white placeholder:text-white/20 outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white/10 transition-all font-mono tracking-tight",
                    className
                )}
            />
        </div>
    );
}

function cn(...inputs) {
    return inputs.filter(Boolean).join(" ");
}
