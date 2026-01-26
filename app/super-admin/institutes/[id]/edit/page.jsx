"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    Building2,
    ArrowLeft,
    Shield,
    Phone,
    MapPin,
    Zap,
    Save,
    Activity
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

export default function EditInstitutePage() {
    const toast = useToast();
    const router = useRouter();
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        contactPhone: "",
        addressStr: "",
        status: "active"
    });

    useEffect(() => {
        const controller = new AbortController();

        const fetchInstitute = async () => {
            try {
                const res = await fetch(`/api/v1/institutes/${params.id}`, {
                    signal: controller.signal
                });
                if (!res.ok) throw new Error("Could not find organization data.");
                const data = await res.json();
                const inst = data.institute;
                if (!inst) throw new Error("Institute data not found.");
                setFormData({
                    name: inst.name || "",
                    code: inst.code || "",
                    contactPhone: inst.contactPhone || "",
                    addressStr: inst.addressStr || "",
                    status: inst.status || "active"
                });
            } catch (error) {
                if (error.name === "AbortError") return;
                toast.error(error.message);
                router.push("/super-admin/institutes");
            } finally {
                setLoading(false);
            }
        };

        if (params.id) fetchInstitute();

        return () => controller.abort();
    }, [params.id]);
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: name === "code" ? value.toUpperCase() : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch(`/api/v1/institutes/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error("Failed to synchronize updates.");

            toast.success("Organization archives updated successfully.");
            router.push("/super-admin/institutes");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

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
                        <motion.span
                            whileHover={{ x: -4 }}
                            className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 shadow-sm transition-colors inline-flex cursor-pointer"
                        >
                            <ArrowLeft size={20} />
                        </motion.span>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Modify Instance</h1>
                        <p className="text-slate-500 font-medium">Update institutional parameters for {formData.name}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Organization Details */}
                <motion.div variants={item} className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">                    <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <Building2 size={20} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Core Repository</h3>
                </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            label="Legal Entity Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            icon={Building2}
                            required
                        />
                        <FormField
                            label="Auth Code (Immutable)"
                            name="code"
                            value={formData.code}
                            onChange={handleChange}
                            icon={Shield}
                            required
                            disabled
                            className="bg-slate-100 cursor-not-allowed opacity-60"
                        />
                        <FormField
                            label="Contact Matrix"
                            name="contactPhone"
                            value={formData.contactPhone}
                            onChange={handleChange}
                            icon={Phone}
                        />
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Activity size={12} /> Operational Status
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 focus:bg-white transition-all appearance-none"
                            >
                                <option value="active">Active High-Trust</option>
                                <option value="suspended">Suspended / Restricted</option>
                            </select>
                        </div>
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

                <motion.div variants={item} className="pt-6">
                    <Button
                        type="submit"
                        disabled={saving}
                        className="w-full h-16 rounded-[24px] font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20"
                    >
                        {saving ? (
                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save size={20} strokeWidth={3} />
                                Synchronize Updates
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

function cn(...inputs) {
    return inputs.filter(Boolean).join(" ");
}
