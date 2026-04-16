"use client";

import { useState } from "react";
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
    User,
    MessageSquare,
    MoreHorizontal,
    Bell,
    X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/contexts/ToastContext";

export default function StudentLayout({ children }) {
    const { data: session } = useSession();
    const pathname = usePathname();

    // Main Navigation (Top Bar & First 4 Bottom Items)
    const primaryNav = [
        { label: "Overview", icon: LayoutDashboard, href: "/student/dashboard" },
        { label: "My Batches", icon: Layers, href: "/student/batches" },
        { label: "Attendance", icon: Calendar, href: "/student/attendance" },
        { label: "Fees", icon: CreditCard, href: "/student/fees" },
    ];

    // Secondary Navigation (Hidden in "More" on Mobile)
    const secondaryNav = [
        { label: "Materials", icon: FileText, href: "/student/materials" },
        { label: "Exams", icon: PenTool, href: "/student/exams" },
        { label: "Messages", icon: MessageSquare, href: "/student/chat" },
        { label: "Settings", icon: Settings, href: "/student/settings" },
    ];

    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);


    return (
        <div className="min-h-screen bg-white text-foreground flex flex-col overflow-x-hidden">
            {/* Navbar */}
            <header className="h-20 bg-white border-b border-border fixed top-0 w-full z-50 px-4 md:px-6 flex items-center justify-between shadow-sm safe-pt">
                <div className="flex items-center gap-3 md:gap-8 overflow-hidden">
                    <Link href="/student/dashboard" className="flex items-center gap-2 group min-w-0">
                        {session?.user?.institute?.logo ? (
                            <img
                                src={session.user.institute.logo}
                                alt={session.user.institute.name}
                                className="w-10 h-10 rounded-lg object-contain bg-white p-1 border border-slate-100 shadow-sm group-hover:scale-105 transition-transform shrink-0"
                                crossOrigin="anonymous"
                            />
                        ) : (
                            <div className="w-10 h-10 bg-premium-blue rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                                <span className="text-white font-black text-xl italic">
                                    {session?.user?.institute?.name?.[0] || "I"}
                                </span>
                            </div>
                        )}
                        <div className="min-w-0">
                            <h1 className="text-base md:text-lg font-black tracking-tighter leading-tight text-slate-900 truncate md:whitespace-normal md:overflow-visible">
                                {session?.user?.institute?.name || "IMS-v2"}                            </h1>
                            <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Student Portal</p>
                        </div>
                    </Link>

                    <nav className="hidden md:flex items-center gap-1">
                        {[...primaryNav, ...secondaryNav].map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 uppercase tracking-tight",
                                        isActive
                                            ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                    )}
                                >
                                    <item.icon size={14} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 pl-2 group cursor-pointer">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold leading-none text-slate-900">{session?.user?.name || "Student"}</p>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">{session?.user?.role}</p>
                        </div>
                        <Link href="/student/settings" className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-border group-hover:border-premium-purple transition-colors">
                            <User size={20} className="text-slate-500 group-hover:text-premium-purple" />
                        </Link>
                        <button
                            onClick={async () => {
                                await signOut({ redirect: false });
                                window.location.href = "/login";
                            }}
                            className="w-10 h-10 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 pt-28 md:pt-32 pb-24 md:pb-12 px-4 bg-academic">
                <div className="student-app-container">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-1 left-4 right-4 bg-white/90 backdrop-blur-xl rounded-2xl z-50 px-2 pt-2 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] safe-pb">
                <div className="flex justify-around items-center gap-1">
                    {primaryNav.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center gap-1 pb-1 transition-all relative flex-1 min-w-[3.5rem]",
                                    isActive ? "text-blue-600" : "text-slate-500"
                                )}
                            >
                                <div className={cn(
                                    "p-1.5 rounded-xl transition-all",
                                    isActive ? "bg-blue-50 scale-110" : "bg-transparent"
                                )}>
                                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                                <span className={cn(
                                    "text-[9px] font-bold uppercase tracking-tighter transition-all",
                                    isActive ? "opacity-100" : "opacity-60 text-slate-400"
                                )}>
                                    {item.label.split(' ')[0]}
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabIndicator"
                                        className="absolute -bottom-1.5 w-8 h-1 bg-blue-600 rounded-t-full"
                                    />
                                )}
                            </Link>
                        );
                    })}

                    {/* More Button */}
                    <button
                        onClick={() => setIsMoreMenuOpen(true)}
                        className="flex flex-col items-center gap-1 pb-1 text-slate-500 flex-1"
                    >
                        <div className="p-1.5">
                            <MoreHorizontal size={20} />
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-tighter opacity-60 text-slate-400">More</span>
                    </button>
                </div>
            </div>

            {/* More Menu Drawer */}
            <AnimatePresence>
                {isMoreMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMoreMenuOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2rem] z-[70] p-8 md:hidden shadow-2xl safe-pb"
                        >
                            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-8" />
                            <h3 className="text-xl font-black text-slate-900 mb-6 px-2 italic tracking-tighter">Campus Resource Menu</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {secondaryNav.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsMoreMenuOpen(false)}
                                            className={cn(
                                                "p-5 rounded-2xl border transition-all flex flex-col items-start gap-4",
                                                isActive 
                                                    ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20" 
                                                    : "bg-slate-50 border-slate-100 text-slate-900 hover:border-slate-300"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                                isActive ? "bg-white/20" : "bg-white shadow-sm"
                                            )}>
                                                <item.icon size={22} />
                                            </div>
                                            <span className="text-sm font-black uppercase tracking-tight">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setIsMoreMenuOpen(false)}
                                className="w-full mt-8 py-4 px-6 bg-slate-100 text-slate-600 rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                <X size={18} /> Close Menu
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

