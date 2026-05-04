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
    Target,
    X,
    Megaphone,
    Trophy,
    Clock,
    BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/contexts/ToastContext";

export default function StudentLayout({ children }) {
    const { data: session } = useSession();
    const pathname = usePathname();

    // Main Navigation (Top Bar & First 4 Bottom Items)
    const primaryNav = [
        { label: "Overview", icon: LayoutDashboard, href: "/student/dashboard" },
        { label: "Timetable", icon: Clock, href: "/student/timetable" },
        { label: "Assignments", icon: Calendar, href: "/student/calendar" },
        { label: "Attendance", icon: Calendar, href: "/student/attendance" },
    ];

    // Secondary Navigation (Hidden in "More" on Mobile)
    const secondaryNav = [
        { label: "My Batches", icon: Layers, href: "/student/batches" },
        { label: "Fees", icon: CreditCard, href: "/student/fees" },
        { label: "Syllabus", icon: Target, href: "/student/syllabus" },
        { label: "Materials", icon: BookOpen, href: "/student/materials" },
        { label: "Documents", icon: FileText, href: "/student/documents" },
        { label: "Notices", icon: Megaphone, href: "/student/notices" },
        { label: "Mock Tests", icon: Trophy, href: "/student/practice" },
        { label: "Exams", icon: PenTool, href: "/student/exams" },
        { label: "Messages", icon: MessageSquare, href: "/student/chat" },
        { label: "Settings", icon: Settings, href: "/student/settings" },
    ];

    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);


    return (
        <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] bg-slate-50 text-foreground h-screen w-screen overflow-hidden">
            
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-[240px] h-screen bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-40">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    {session?.user?.institute?.logo ? (
                        <img
                            src={session.user.institute.logo}
                            alt={session.user.institute.name}
                            className="w-10 h-10 rounded-lg object-contain bg-white p-1 border border-slate-100 shadow-sm shrink-0"
                            crossOrigin="anonymous"
                        />
                    ) : (
                        <div className="w-10 h-10 bg-premium-blue rounded-lg flex items-center justify-center shadow-sm shrink-0">
                            <span className="text-white font-black text-xl italic">
                                {session?.user?.institute?.name?.[0] || "I"}
                            </span>
                        </div>
                    )}
                    <div className="min-w-0">
                        <h1 className="text-sm font-black tracking-tighter leading-tight text-slate-900 truncate">
                            {session?.user?.institute?.name || "Quantech"}
                        </h1>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Student Portal</p>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1 scrollbar-hide">
                    <p className="px-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 mb-2">Menu</p>
                    {[...primaryNav, ...secondaryNav].map((item, index) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group text-[13px] font-semibold relative",
                                    isActive
                                        ? "bg-premium-blue/10 text-premium-blue"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <item.icon size={18} className={isActive ? "text-premium-blue" : "text-slate-400 group-hover:text-slate-600"} />
                                <span>{item.label}</span>
                                {isActive && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-premium-blue rounded-r-full" />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex flex-col min-w-0 h-full overflow-hidden w-full md:col-start-2">
                {/* Header */}
                <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30">
                    <div className="flex items-center gap-3 md:hidden">
                        {session?.user?.institute?.logo ? (
                            <img
                                src={session.user.institute.logo}
                                alt={session.user.institute.name}
                                className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 border border-slate-100 shadow-sm shrink-0"
                                crossOrigin="anonymous"
                            />
                        ) : (
                            <div className="w-8 h-8 bg-premium-blue rounded-lg flex items-center justify-center shadow-sm shrink-0">
                                <span className="text-white font-black text-sm italic">
                                    {session?.user?.institute?.name?.[0] || "I"}
                                </span>
                            </div>
                        )}
                        <div className="min-w-0">
                            <h1 className="text-sm font-black tracking-tighter leading-tight text-slate-900 truncate">
                                {session?.user?.institute?.name || "Quantech"}
                            </h1>
                            <p className="text-[9px] uppercase font-bold text-slate-400">Student Portal</p>
                        </div>
                    </div>

                    <div className="hidden md:block">
                        <h2 className="text-lg font-black text-slate-900 tracking-tight capitalize">
                            {pathname.split('/').pop() || "Dashboard"}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4 ml-auto">
                        <div className="flex items-center gap-3 group">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold leading-none text-slate-900">{session?.user?.name || "Student"}</p>
                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">{session?.user?.role}</p>
                            </div>
                            <Link href="/student/settings" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-transparent hover:border-premium-blue transition-all shrink-0">
                                {session?.user?.image ? (
                                    <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={20} className="text-slate-500" />
                                )}
                            </Link>
                            <button
                                onClick={() => signOut({ callbackUrl: "/login" })}
                                className="hidden md:flex w-10 h-10 rounded-full hover:bg-red-50 items-center justify-center text-slate-400 hover:text-red-600 transition-colors"
                                title="Sign Out"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main scrollable content */}
                <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8 scrollbar-hide pb-24 md:pb-8">
                    <div className="max-w-[1400px] mx-auto w-full">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={pathname}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                            >
                                {children}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-1 left-4 right-4 bg-gradient-to-r from-slate-200/90 via-slate-100/90 to-slate-200/90 backdrop-blur-xl rounded-2xl z-50 px-2 pt-2 border border-slate-400 shadow-[0_8px_30px_rgb(0,0,0,0.12)] safe-pb">
                <div className="flex justify-around items-center gap-1">
                    {primaryNav.map((item, index) => {
                        const isActive = pathname === item.href;
                        const bottomNavColors = ['text-blue-600', 'text-teal-600', 'text-orange-600', 'text-cyan-600'];
                        const bottomNavColor = bottomNavColors[index % bottomNavColors.length];
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center gap-1 pb-1 transition-all relative flex-1 min-w-[3.5rem]",
                                    isActive ? "text-blue-600" : `text-slate-500 ${bottomNavColor}`
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
                            className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-200 to-slate-100 rounded-t-[2rem] z-[70] p-8 md:hidden shadow-2xl safe-pb"
                        >
                            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-8" />
                            <h3 className="text-xl font-black text-slate-900 mb-6 px-2 italic tracking-tighter">Campus Resource Menu</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {secondaryNav.map((item, index) => {
                                    const isActive = pathname === item.href;
                                    const secondaryColors = ['from-blue-50 to-blue-100 border-blue-200 text-blue-900', 'from-teal-50 to-teal-100 border-teal-200 text-teal-900', 'from-orange-50 to-orange-100 border-orange-200 text-orange-900', 'from-cyan-50 to-cyan-100 border-cyan-200 text-cyan-900', 'from-red-50 to-red-100 border-red-200 text-red-900', 'from-amber-50 to-amber-100 border-amber-200 text-amber-900'];
                                    const colorClass = secondaryColors[index % secondaryColors.length];
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsMoreMenuOpen(false)}
                                            className={cn(
                                                "p-5 rounded-2xl border transition-all flex flex-col items-start gap-4",
                                                isActive 
                                                    ? "bg-premium-blue border-premium-blue text-white shadow-xl shadow-blue-900/20" 
                                                    : `bg-gradient-to-br ${colorClass}`
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

