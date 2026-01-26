"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Building2,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Shield
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export default function SuperAdminLayout({ children }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && session?.user?.role !== "super_admin") {
            router.push("/dashboard");
        }
    }, [status, session, router]);

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-slate-500 font-medium">Authenticating...</p>
                </motion.div>
            </div>
        );
    }

    if (session?.user?.role !== "super_admin") return null;

    return (
        <div className="flex h-screen bg-[#F8FAFC]">
            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: isSidebarOpen ? 280 : 88 }}
                className="bg-white border-r border-slate-200 flex flex-col relative z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
            >
                {/* Branding */}
                <div className="h-20 flex items-center px-6 border-b border-slate-100">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="min-w-[40px] h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                            <Shield size={22} strokeWidth={2.5} />
                        </div>
                        <AnimatePresence mode="wait">
                            {isSidebarOpen && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="font-black text-slate-800 tracking-tight text-lg whitespace-nowrap"
                                >
                                    IMS <span className="text-blue-600">Admin</span>
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto no-scrollbar">
                    <NavLink
                        href="/super-admin"
                        icon={LayoutDashboard}
                        label="Dashboard"
                        isOpen={isSidebarOpen}
                        active={pathname === "/super-admin"}
                    />
                    <NavLink
                        href="/super-admin/institutes"
                        icon={Building2}
                        label="Institutes"
                        isOpen={isSidebarOpen}
                        active={pathname.startsWith("/super-admin/institutes")}
                    />
                    <NavLink
                        href="/super-admin/settings"
                        icon={Settings}
                        label="Global Settings"
                        isOpen={isSidebarOpen}
                        active={pathname === "/super-admin/settings"}
                    />
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-slate-100 space-y-4">
                    <div className={cn(
                        "flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 transition-all",
                        !isSidebarOpen && "justify-center px-0 bg-transparent border-transparent"
                    )}>
                        <div className="min-w-[40px] h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm border-2 border-white shadow-sm ring-1 ring-slate-100">
                            {session.user.name?.[0] || 'A'}
                        </div>
                        {isSidebarOpen && (
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-800 truncate leading-none mb-1">
                                    {session.user.name || 'System Admin'}
                                </p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">
                                    Super Admin
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={async () => {
                            await signOut({ redirect: false });
                            window.location.href = "/login";
                        }}
                        className={cn(
                            "group flex items-center gap-3 w-full p-3 rounded-xl transition-all",
                            "hover:bg-red-50 text-slate-400 hover:text-red-600",
                            !isSidebarOpen && "justify-center"
                        )}
                        title="Sign Out"
                    >
                        <LogOut size={20} className="transition-transform group-hover:-translate-x-0.5" />
                        {isSidebarOpen && <span className="font-bold text-sm uppercase tracking-wide">Sign Out</span>}
                    </button>
                </div>

                {/* Toggle Button */}
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="absolute -right-3 top-24 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 shadow-sm z-50 transition-colors"
                    aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                    aria-expanded={isSidebarOpen}
                >
                    {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>            </motion.aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 flex justify-between items-center sticky top-0 z-20">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-blue-600 rounded-full" />
                        <h2 className="text-slate-800 font-black tracking-tight text-xl uppercase">
                            Platform <span className="text-slate-400">Manager</span>
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100"
                        >
                            <ExternalLink size={16} />
                            <span>Preview Site</span>
                        </Link>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
                    <div className="p-8 max-w-[1600px] mx-auto min-h-full">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        >
                            {children}
                        </motion.div>
                    </div>
                </main>
            </div>
        </div>
    );
}

function NavLink({ href, icon: Icon, label, isOpen, active }) {
    return (
        <Link
            href={href}
            className={cn(
                "relative group flex items-center gap-3 p-3 rounded-xl transition-all duration-300",
                active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 active:scale-95"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                !isOpen && "justify-center"
            )}
        >
            <Icon
                size={22}
                strokeWidth={active ? 2.5 : 2}
                className={cn("shrink-0", active ? "text-white" : "group-hover:scale-110 transition-transform")}
            />
            {isOpen && (
                <span className={cn(
                    "font-bold text-sm tracking-wide transition-opacity duration-300",
                    active ? "opacity-100" : "opacity-80 group-hover:opacity-100"
                )}>
                    {label}
                </span>
            )}

            {!active && isOpen && (
                <div className="absolute left-0 w-1 h-0 bg-blue-600 rounded-full group-hover:h-3 transition-all duration-300" />
            )}
        </Link>
    )
}
