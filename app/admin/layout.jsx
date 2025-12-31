"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    BookOpen,
    Layers3,
    CreditCard,
    FileText,
    Calendar,
    FileSignature,
    UserCog,
    History,
    LogOut,
    ChevronRight,
    Menu,
    X
} from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

export default function AdminLayout({ children }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const [expandedGroup, setExpandedGroup] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Redirect if not authenticated or not admin
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && session?.user?.role === "student") {
            router.push("/student/dashboard");
        }
    }, [status, session, router]);

    const menuGroups = [
        {
            label: "Academic",
            icon: BookOpen,
            items: [
                { label: "Students", icon: Users, href: "/admin/students" },
                { label: "Courses", icon: BookOpen, href: "/admin/courses" },
                { label: "Batches", icon: Layers3, href: "/admin/batches" },
            ]
        },
        {
            label: "Learning",
            icon: FileSignature,
            items: [
                { label: "Attendance", icon: Calendar, href: "/admin/attendance" },
                { label: "Online Exams", icon: FileSignature, href: "/admin/exams" },
                { label: "Question Bank", icon: BookOpen, href: "/admin/question-bank" },
                { label: "Materials", icon: FileText, href: "/admin/materials" },
            ]
        },
        {
            label: "Administration",
            icon: UserCog,
            items: [
                { label: "Fees", icon: CreditCard, href: "/admin/fees" },
                { label: "User Management", icon: UserCog, href: "/admin/users" },
                { label: "Audit Logs", icon: History, href: "/admin/audit-logs" },
            ]
        },
    ];

    if (status === "loading") {
        return <LoadingSpinner fullPage />;
    }

    if (status === "unauthenticated" || session?.user?.role === "student") {
        return null; // Prevent flicker before redirect
    }

    const toggleGroup = (groupLabel) => {
        setExpandedGroup(prev => prev === groupLabel ? null : groupLabel);
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Mobile Menu Toggle */}
            <button
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden fixed top-4 left-4 z-40 w-10 h-10 glass rounded-xl flex items-center justify-center text-foreground/60"
            >
                <Menu size={20} />
            </button>

            {/* Overlay for Mobile */}
            {isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    className="lg:hidden fixed inset-0 bg-background/60 backdrop-blur-sm z-[60]"
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "w-64 border-r border-border bg-white fixed h-full z-[70] flex flex-col transition-transform duration-300 lg:translate-x-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-8 pb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter text-premium-blue">IMS-v2</h1>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Administrator Portal</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto scrollbar-hide font-geist-sans">
                    {/* Dashboard (Top Level) */}
                    <div>
                        <Link
                            href="/admin/dashboard"
                            onClick={() => setIsSidebarOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-bold border-l-4 border-transparent",
                                pathname === "/admin/dashboard"
                                    ? "soft-active border-premium-blue"
                                    : "hover:bg-slate-50 text-slate-500 hover:text-premium-blue"
                            )}
                        >
                            <LayoutDashboard size={18} className={cn(pathname === "/admin/dashboard" ? "text-premium-blue" : "text-slate-400 group-hover:text-premium-blue")} />
                            <span className="flex-1">Dashboard</span>
                        </Link>
                    </div>

                    {/* Groups */}
                    {menuGroups.map((group) => (
                        <div key={group.label} className="space-y-1">
                            <button
                                onClick={() => toggleGroup(group.label)}
                                className="flex items-center gap-2 w-full px-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 hover:text-premium-blue transition-colors mb-2"
                            >
                                <span>{group.label}</span>
                                <ChevronRight
                                    size={10}
                                    className={cn("transition-transform duration-200", expandedGroup === group.label && "rotate-90")}
                                />
                            </button>

                            {expandedGroup === group.label && (
                                <div className="space-y-1 animate-fade-in">
                                    {group.items.map((item) => {
                                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setIsSidebarOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-[13px] font-bold border-l-4 border-transparent ml-2",
                                                    isActive
                                                        ? "soft-active border-premium-blue"
                                                        : "hover:bg-slate-50 text-slate-500 hover:text-premium-blue"
                                                )}
                                            >
                                                <item.icon size={16} className={cn(isActive ? "text-premium-blue" : "text-slate-400 group-hover:text-premium-blue")} />
                                                <span className="flex-1">{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                <div className="p-4 mt-auto border-t border-border bg-slate-50/50">
                    <div className="bg-white rounded-xl p-3 flex items-center gap-3 mb-3 border border-border shadow-sm">
                        <div className="w-10 h-10 rounded-lg bg-premium-purple/10 flex items-center justify-center border border-premium-purple/20 text-premium-purple font-bold">
                            {session?.user?.name?.[0] || "A"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate text-slate-900">{session?.user?.name || "Admin"}</p>
                            <p className="text-[10px] text-slate-400 truncate uppercase font-bold tracking-tight">{session?.user?.role}</p>
                        </div>
                    </div>

                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg hover:bg-red-50 text-red-600 transition-all text-sm font-medium"
                    >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 min-h-screen p-6 md:p-10 relative bg-blueprint">
                <div className="relative z-10 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
