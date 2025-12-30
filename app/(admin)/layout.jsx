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
    Layer3,
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Redirect if not authenticated or not admin
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && session?.user?.role === "student") {
            router.push("/student/dashboard");
        }
    }, [status, session, router]);

    if (status === "loading") {
        return <LoadingSpinner fullPage />;
    }

    if (status === "unauthenticated" || session?.user?.role === "student") {
        return null; // Prevent flicker before redirect
    }

    const menuItems = [
        { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
        { label: "Students", icon: Users, href: "/admin/students" },
        { label: "Courses", icon: BookOpen, href: "/admin/courses" },
        { label: "Batches", icon: Layer3, href: "/admin/batches" },
        { label: "Fees", icon: CreditCard, href: "/admin/fees" },
        { label: "Materials", icon: FileText, href: "/admin/materials" },
        { label: "Attendance", icon: Calendar, href: "/admin/attendance" },
        { label: "Exams", icon: FileSignature, href: "/admin/exams" },
        { label: "User Management", icon: UserCog, href: "/admin/users" },
        { label: "Audit Logs", icon: History, href: "/admin/audit-logs" },
    ];

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
                "w-64 border-r border-glass-border glass fixed h-full z-[70] flex flex-col transition-transform duration-300 lg:translate-x-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter text-premium-blue">IMS-v2</h1>
                        <p className="text-[10px] uppercase font-bold text-foreground/40 mt-1">Administrator Portal</p>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        aria-label="Close navigation menu"
                        className="lg:hidden w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center text-foreground/40"
                    >
                        <X size={18} />
                    </button>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto font-geist-sans">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsSidebarOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
                                    isActive
                                        ? "bg-premium-blue text-white shadow-lg shadow-blue-500/20"
                                        : "hover:bg-white/5 text-foreground/60 hover:text-foreground"
                                )}
                            >
                                <item.icon size={18} className={cn(isActive ? "text-white" : "text-foreground/40 group-hover:text-premium-blue")} />
                                <span className="flex-1">{item.label}</span>
                                {isActive && <ChevronRight size={14} className="opacity-50" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto border-t border-glass-border">
                    <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3 mb-4 border border-glass-border">
                        <div className="w-10 h-10 rounded-full bg-premium-purple/20 flex items-center justify-center border border-premium-purple/30 text-premium-purple font-bold">
                            {session?.user?.name?.[0] || "A"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{session?.user?.name || "Admin"}</p>
                            <p className="text-[10px] text-foreground/50 truncate uppercase tracking-tighter">{session?.user?.role}</p>
                        </div>
                    </div>

                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-red-500/10 text-red-500 transition-all text-sm font-medium"
                    >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 min-h-screen p-4 md:p-8 relative">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-premium-blue/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="relative z-10 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
