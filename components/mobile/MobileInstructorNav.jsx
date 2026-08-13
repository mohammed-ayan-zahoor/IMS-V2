"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { 
    LayoutDashboard, 
    UserCheck, 
    Layers3, 
    Megaphone, 
    User, 
    X, 
    LogOut, 
    CalendarDays, 
    ChevronRight,
    Building2,
    Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAcademicSession } from "@/contexts/AcademicSessionContext";

export default function MobileInstructorNav() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const { sessions, selectedSessionId } = useAcademicSession();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const isSchool = session?.user?.institute?.type === 'SCHOOL' || session?.user?.institute?.code === 'QUANTECH';
    const activeSessionObj = sessions?.find(s => s._id === selectedSessionId);

    const navItems = [
        {
            id: "home",
            label: "Home",
            icon: LayoutDashboard,
            href: "/admin/dashboard"
        },
        {
            id: "attendance",
            label: "Attendance",
            icon: UserCheck,
            href: "/admin/attendance"
        },
        {
            id: "classes",
            label: isSchool ? "Sections" : "Batches",
            icon: Layers3,
            href: "/admin/batches"
        },
        {
            id: "updates",
            label: "Notices",
            icon: Megaphone,
            href: "/admin/notices"
        }
    ];

    const isTabActive = (href) => {
        if (href === "/admin/dashboard") {
            return pathname === "/admin/dashboard" || pathname === "/instructor/dashboard";
        }
        return pathname.startsWith(href);
    };

    return (
        <>
            {/* Flat Top App Bar */}
            <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between px-4 z-40 no-print">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                        {session?.user?.institute?.name?.[0] || "Q"}
                    </div>
                    <div>
                        <p className="text-xs font-bold tracking-tight leading-none text-white truncate max-w-[150px]">
                            {session?.user?.institute?.name || "Quantech"}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider leading-none">
                            {session?.user?.role === 'instructor' ? 'Teacher Portal' : 'Staff Portal'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {activeSessionObj && (
                        <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Calendar size={10} />
                            {activeSessionObj.sessionName}
                        </span>
                    )}

                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="w-8 h-8 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                    >
                        <User size={16} />
                    </button>
                </div>
            </header>

            {/* Flat Bottom App Navigation Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-40 pb-safe no-print">
                <div className="grid grid-cols-5 h-14">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isTabActive(item.href);
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-0.5 transition-colors",
                                    active ? "text-white" : "text-slate-400 hover:text-slate-200"
                                )}
                            >
                                <Icon size={18} />
                                <span className={cn("text-[10px] font-bold tracking-tight", active ? "text-white font-black" : "")}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}

                    {/* Menu Button */}
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className={cn(
                            "flex flex-col items-center justify-center gap-0.5 transition-colors",
                            isMenuOpen ? "text-white" : "text-slate-400 hover:text-slate-200"
                        )}
                    >
                        <User size={18} />
                        <span className="text-[10px] font-bold tracking-tight">Menu</span>
                    </button>
                </div>
            </nav>

            {/* Slide-Up Flat Profile Menu Sheet */}
            {isMenuOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 animate-in fade-in duration-150">
                    <div 
                        className="fixed inset-0"
                        onClick={() => setIsMenuOpen(false)} 
                    />
                    
                    <div className="relative bg-slate-900 border-t border-slate-800 rounded-t-xl p-5 text-white space-y-4 animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto">
                        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto" />

                        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-md bg-slate-800 border border-slate-700 text-white flex items-center justify-center font-bold text-sm uppercase">
                                    {session?.user?.name?.[0] || "T"}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white leading-tight">
                                        {session?.user?.name || "Teacher Account"}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-medium">{session?.user?.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="w-7 h-7 rounded-md bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Navigation Links */}
                        <div className="space-y-1">
                            <Link
                                href="/admin/hr/leave-requests"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center justify-between p-3 bg-slate-800/80 hover:bg-slate-800 rounded-md text-xs font-bold text-slate-200 transition-colors"
                            >
                                <span className="flex items-center gap-2.5">
                                    <CalendarDays size={16} className="text-slate-400" /> My Leave Requests
                                </span>
                                <ChevronRight size={14} className="text-slate-500" />
                            </Link>

                            <Link
                                href="/admin/materials"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center justify-between p-3 bg-slate-800/80 hover:bg-slate-800 rounded-md text-xs font-bold text-slate-200 transition-colors"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Building2 size={16} className="text-slate-400" /> Learning Materials
                                </span>
                                <ChevronRight size={14} className="text-slate-500" />
                            </Link>

                            <Link
                                href="/admin/calendar"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center justify-between p-3 bg-slate-800/80 hover:bg-slate-800 rounded-md text-xs font-bold text-slate-200 transition-colors"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Calendar size={16} className="text-slate-400" /> School Calendar
                                </span>
                                <ChevronRight size={14} className="text-slate-500" />
                            </Link>
                        </div>

                        {/* Sign Out Button */}
                        <div className="pt-2 border-t border-slate-800">
                            <button
                                onClick={() => signOut({ callbackUrl: "/login" })}
                                className="w-full flex items-center justify-center gap-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 p-3 rounded-md text-xs font-bold uppercase tracking-wider transition-colors"
                            >
                                <LogOut size={15} /> Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
