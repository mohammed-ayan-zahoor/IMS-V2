"use client";

import { motion } from "framer-motion";
import { Settings, Shield, Bell, Lock, Globe, Zap } from "lucide-react";
import Button from "@/components/ui/Button";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function SuperAdminSettings() {
    return (
        <div className="space-y-10">
            <header>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <Settings size={20} />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                        Global <span className="text-slate-400">Settings</span>
                    </h1>
                </div>
                <p className="text-slate-500 font-medium ml-[3.25rem]">Configure platform-wide parameters and security protocols.</p>            </header>

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
                <SettingsCard
                    icon={Shield}
                    title="Security & Governance"
                    description="Manage authentication protocols, session timeouts, and IP white-listing."
                    status="Operational"
                />
                <SettingsCard
                    icon={Bell}
                    title="System Notifications"
                    description="Configure global SMTP settings and system-wide broadcast messages."
                    status="Configured"
                />
                <SettingsCard
                    icon={Globe}
                    title="Region & Localization"
                    description="Set default timezones, currency, and multi-language support parameters."
                    status="Active"
                />
                <SettingsCard
                    icon={Lock}
                    title="Audit Logs"
                    description="Retention policies for system-wide activity logs and security events."
                    status="Logging"
                />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-slate-900 p-12 rounded-[40px] text-white flex flex-col items-center text-center gap-6 relative overflow-hidden"
            >
                <div className="relative z-10 space-y-4">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-600/40">
                        <Zap size={32} fill="white" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tight">Advanced Controls</h2>
                    <p className="text-white/60 max-w-md mx-auto leading-relaxed">
                        These settings directly impact the platform's core infrastructure. Changes may require a system restart.
                    </p>
                    <div className="pt-4 flex gap-4 justify-center">
                        <Button variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-6 rounded-2xl font-black">
                            Save Changes
                        </Button>
                        <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8 py-6 rounded-2xl font-black">
                            Rollback Configuration
                        </Button>
                    </div>
                </div>

                {/* Decorative background glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/30 blur-[120px]" />
            </motion.div>
        </div>
    );
}

function SettingsCard({ icon: Icon, title, description, status }) {
    return (
        <motion.div
            variants={item}
            className="group bg-white p-8 rounded-[32px] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] transition-all duration-300"
        >
            <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-600/20 transition-all duration-300">
                    <Icon size={24} />
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-50 text-[10px] font-black text-emerald-600 uppercase tracking-widest border border-emerald-100">
                    {status}
                </div>
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2 group-hover:text-blue-600 transition-colors">
                {title}
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed font-medium">
                {description}
            </p>
        </motion.div>
    );
}
