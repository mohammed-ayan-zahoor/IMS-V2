"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
    const router = useRouter();
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
            {/* Top App Bar (Mobile View Only: md:hidden) */}
            <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 flex items-center justify-between px-4 z-40 shadow-sm no-print">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center font-black text-white text-xs shadow-sm shadow-indigo-500/30">
                        {session?.user?.institute?.name?.[0] || "Q"}
                    </div>
                    <div>
                        <p className="text-xs font-black tracking-tight leading-none text-white truncate max-w-[140px]">
                            {session?.user?.institute?.name || "Quantech"}
                        </p>
                        <p className="text-[10px] text-indigo-300 font-bold mt-0.5 uppercase tracking-widest leading-none">
                            {session?.user?.role === 'instructor' ? 'Teacher Portal' : 'Staff Portal'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {activeSessionObj && (
                        <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Calendar size={10} />
                            {activeSessionObj.sessionName}
                        </span>
                    )}

                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 hover:text-white transition-all overflow-hidden"
                    >
                        {session?.user?.image ? (
                            <img src={session.user.image} alt="User Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User size={18} />
                        )}
                    </button>
                </div>
            </header>

            {/* Bottom App Navigation Bar (Mobile View Only: md:hidden) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 z-40 pb-safe no-print shadow-2xl">
                <div className="grid grid-cols-5 h-16">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isTabActive(item.href);
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 transition-all relative",
                                    active ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
                                )}
                            >
                                {active && (
                                    <span className="absolute top-0 w-8 h-0.5 bg-indigo-500 rounded-b-full shadow-sm shadow-indigo-500" />
                                )}
                                <Icon size={20} className={cn("transition-transform", active ? "scale-110" : "")} />
                                <span className={cn("text-[10px] font-bold tracking-tight", active ? "text-indigo-400 font-extrabold" : "")}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}

                    {/* Menu Button */}
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 transition-all relative",
                            isMenuOpen ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
                        )}
                    >
                        <User size={20} />
                        <span className="text-[10px] font-bold tracking-tight">Menu</span>
                    </button>
                </div>
            </nav>

            {/* Slide-Up Mobile Profile Menu Overlay */}
            {isMenuOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
                    <div 
                        className="fixed inset-0"
                        onClick={() => setIsMenuOpen(false)} 
                    />
                    
                    <div className="relative bg-slate-900 border-t border-slate-800 rounded-t-[28px] p-6 text-white space-y-5 animate-in slide-in-from-bottom duration-250 shadow-2xl max-h-[85vh] overflow-y-auto">
                        {/* Header handle */}
                        <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto" />

                        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-black text-base uppercase">
                                    {session?.user?.name?.[0] || "T"}
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white leading-tight">
                                        {session?.user?.name || "Teacher Account"}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-medium">{session?.user?.email}</p>
                                    <span className="inline-block mt-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        {session?.user?.role === 'instructor' ? 'Instructor / Teacher' : 'Staff Member'}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Navigation Menu List */}
                        <div className="space-y-1.5 pt-1">
                            <Link
                                href="/admin/hr/leave-requests"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center justify-between p-3.5 bg-slate-800/60 hover:bg-slate-800 rounded-2xl text-sm font-semibold transition-all"
                            >
                                <span className="flex items-center gap-3 text-slate-200">
                                    <CalendarDays size={18} className="text-indigo-400" /> My Leave Requests
                                </span>
                                <ChevronRight size={16} className="text-slate-500" />
                            </Link>

                            <Link
                                href="/admin/materials"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center justify-between p-3.5 bg-slate-800/60 hover:bg-slate-800 rounded-2xl text-sm font-semibold transition-all"
                            >
                                <span className="flex items-center gap-3 text-slate-200">
                                    <Building2 size={18} className="text-teal-400" /> Learning Materials
                                </span>
                                <ChevronRight size={16} className="text-slate-500" />
                            </Link>

                            <Link
                                href="/admin/calendar"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center justify-between p-3.5 bg-slate-800/60 hover:bg-slate-800 rounded-2xl text-sm font-semibold transition-all"
                            >
                                <span className="flex items-center gap-3 text-slate-200">
                                    <Calendar size={18} className="text-amber-400" /> School Calendar
                                </span>
                                <ChevronRight size={16} className="text-slate-500" />
                            </Link>
                        </div>

                        {/* Sign Out Button */}
                        <div className="pt-3 border-t border-slate-800">
                            <button
                                onClick={() => signOut({ callbackUrl: "/login" })}
                                className="w-full flex items-center justify-center gap-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 p-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
                            >
                                <LogOut size={16} /> Sign Out of Portal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
