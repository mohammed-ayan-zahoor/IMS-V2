"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    BookOpen,
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
        { label: "My Batches", icon: BookOpen, href: "/student/batches" },
        { label: "Materials", icon: BookOpen, href: "/student/materials" },
        { label: "Attendance", icon: Calendar, href: "/student/attendance" },
        { label: "Fees", icon: CreditCard, href: "/student/fees" },
        { label: "Exams", icon: PenTool, href: "/student/exams" },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Navbar */}
            <header className="h-20 glass border-b border-glass-border fixed top-0 w-full z-50 px-6 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href="/student/dashboard" className="flex items-center gap-2 group">
                        <div className="w-10 h-10 bg-premium-blue rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                            <span className="text-white font-black text-xl italic">I</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-black tracking-tighter leading-none">IMS-v2</h1>
                            <p className="text-[10px] uppercase font-bold text-foreground/40 mt-0.5">Student Portal</p>
                        </div>
                    </Link>

                    <nav className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2",
                                        isActive
                                            ? "bg-premium-blue/10 text-premium-blue shadow-[0_0_20px_rgba(59,130,246,0.1)] border border-premium-blue/20"
                                            : "text-foreground/50 hover:text-foreground hover:bg-white/5"
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
                        onClick={() => { }}
                        className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center text-foreground/40 hover:text-foreground transition-colors relative"
                    >
                        <Bell size={20} />
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background" aria-hidden="true" />
                    </button>

                    <div className="h-8 w-[1px] bg-glass-border mx-2" />

                    <div className="flex items-center gap-3 pl-2 group cursor-pointer">
                        <div className="text-right">
                            <p className="text-sm font-bold leading-none">{session?.user?.name || "Student"}</p>
                            <p className="text-[10px] text-foreground/40 mt-1 uppercase font-bold tracking-widest">{session?.user?.role}</p>
                        </div>
                        <Link href="/student/settings" className="w-10 h-10 rounded-xl bg-gradient-to-tr from-premium-purple to-premium-blue p-[1px] group-hover:scale-105 transition-transform">
                            <div className="w-full h-full bg-background rounded-[11px] flex items-center justify-center overflow-hidden">
                                <User size={20} className="text-premium-purple" />
                            </div>
                        </Link>
                        <button
                            onClick={() => signOut()}
                            className="w-10 h-10 rounded-xl hover:bg-red-500/10 flex items-center justify-center text-red-500/50 hover:text-red-500 transition-colors"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 pt-28 pb-12 px-6 relative">
                <div className="max-w-7xl mx-auto w-full">
                    <div className="absolute top-0 left-1/4 w-[40%] h-[40%] bg-premium-purple/5 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute bottom-0 right-1/4 w-[40%] h-[40%] bg-premium-blue/5 rounded-full blur-[120px] pointer-events-none" />
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {children}
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
