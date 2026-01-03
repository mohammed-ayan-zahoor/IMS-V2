"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Layers,
    FileText,
    CreditCard,
    Calendar,
    PenTool,
    Settings,
    LogOut,
    Bell,
    User
} from "lucide-react";
import { motion } from "framer-motion";

export default function StudentLayout({ children }) {
    const { data: session } = useSession();
    const pathname = usePathname();

    const navItems = [
        { label: "Overview", icon: LayoutDashboard, href: "/student/dashboard" },
        { label: "My Batches", icon: Layers, href: "/student/batches" },
        { label: "Materials", icon: FileText, href: "/student/materials" },
        { label: "Attendance", icon: Calendar, href: "/student/attendance" },
        { label: "Fees", icon: CreditCard, href: "/student/fees" },
        { label: "Exams", icon: PenTool, href: "/student/exams" },
    ];

    return (
        <div className="min-h-screen bg-white text-foreground flex flex-col">
            {/* Navbar */}
            <header className="h-20 bg-white border-b border-border fixed top-0 w-full z-50 px-6 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-8">
                    <Link href="/student/dashboard" className="flex items-center gap-2 group">
                        <div className="w-10 h-10 bg-premium-blue rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                            <span className="text-white font-black text-xl italic">I</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-black tracking-tighter leading-none text-slate-900">IMS-v2</h1>
                            <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Student Portal</p>
                        </div>
                    </Link>

                    <nav className="hidden md:flex items-center gap-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                                        isActive
                                            ? "bg-premium-blue text-white shadow-sm"
                                            : "text-slate-500 hover:text-premium-blue hover:bg-slate-50"
                                    )}
                                >
                                    <item.icon size={16} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        aria-label="View notifications"
                        onClick={() => alert("Notification system coming soon in Phase 5!")}
                        className="w-10 h-10 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-premium-blue transition-colors relative"
                    >
                        <Bell size={20} />
                        <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-red-500 rounded-full border-2 border-white" aria-hidden="true" />
                    </button>

                    <div className="h-8 w-[1px] bg-border mx-2" />

                    <div className="flex items-center gap-3 pl-2 group cursor-pointer">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold leading-none text-slate-900">{session?.user?.name || "Student"}</p>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">{session?.user?.role}</p>
                        </div>
                        <Link href="/student/settings" className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-border group-hover:border-premium-purple transition-colors">
                            <User size={20} className="text-slate-500 group-hover:text-premium-purple" />
                        </Link>
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="w-10 h-10 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 pt-28 pb-24 md:pb-12 px-6 bg-academic">
                <div className="max-w-7xl mx-auto w-full">
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {children}
                    </motion.div>
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50 px-6 py-3 safe-area-pb">
                <div className="flex justify-between items-center">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center gap-1 transition-colors relative min-w-[3.5rem]",
                                    isActive ? "text-premium-blue" : "text-slate-400 hover:text-slate-600"
                                )}
                                aria-label={item.label}
                            >
                                <div className={cn(
                                    "p-1.5 rounded-xl transition-all",
                                    isActive ? "bg-blue-50" : "bg-transparent"
                                )}>
                                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                                <span className="sr-only">{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="bottomNavIndicator"
                                        className="absolute -top-3 w-8 h-1 bg-premium-blue rounded-b-full"
                                    />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>        </div>
    );
}
