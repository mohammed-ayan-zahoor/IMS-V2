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
    X,
    Settings,
    Plus,
    List,
    ReceiptText,
    Building2,
    BarChart3,
    Database,
    RotateCcw
} from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

const sanitizeUrl = (url) => {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) return null;
        return url;
    } catch (e) {
        return null;
    }
};

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
            label: "Enquiry",
            icon: Users,
            items: [
                { label: "New Entry", icon: Plus, href: "/admin/enquiries/new" },
                { label: "View Entry", icon: List, href: "/admin/enquiries" },
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
            label: "Reports",
            icon: BarChart3,
            items: [
                { label: "Attendance", icon: Calendar, href: "/admin/reports/attendance" },
                { label: "Fees", icon: CreditCard, href: "/admin/fees" },
                { label: "Collection History", icon: ReceiptText, href: "/admin/collections" },
                { label: "Audit Logs", icon: History, href: "/admin/audit-logs" },
            ]
        },
        {
            label: "Administration",
            icon: UserCog,
            items: [
                { label: "Accounts Master", icon: Building2, href: "/admin/accounts" },
                { label: "User Management", icon: UserCog, href: "/admin/users" },
                { label: "Settings", icon: Settings, href: "/admin/settings" },
            ]
        },
        {
            label: "Utility",
            icon: Database,
            items: [
                { label: "System Backup", icon: Database, href: "/admin/utility/backup" },
                { label: "System Restore", icon: RotateCcw, href: "/admin/utility/restore" },
            ]
        },
    ];


    if (session?.user?.role === "super_admin") {
        menuGroups.unshift({
            label: "Super Admin",
            icon: LayoutDashboard,
            items: [
                { label: "Dashboard", icon: LayoutDashboard, href: "/super-admin" },
                { label: "Institutes", icon: Users, href: "/super-admin/institutes" },
            ]
        });
    }

    if (status === "loading") {
        return <LoadingSpinner fullPage />;
    }

    if (status === "unauthenticated" || session?.user?.role === "student") {
        return null; // Prevent flicker before redirect
    }

    const toggleGroup = (groupLabel) => {
        setExpandedGroup(prev => prev === groupLabel ? null : groupLabel);
    };

    // Determine base path for links (admin vs instructor)
    const getBasePath = () => {
        // If current path starts with /instructor, all links should use /instructor prefix
        if (pathname?.startsWith("/instructor")) return "/instructor";
        // Or if role is instructor (redundant but safe)
        if (session?.user?.role === "instructor") return "/instructor";
        return "/admin";
    };

    const basePath = getBasePath();

    // Helper to replace /admin with current base path
    const getHref = (href) => {
        if (href.startsWith("/admin")) {
            return href.replace("/admin", basePath);
        }
        return href;
    };

    const dashboardHref = getHref("/admin/dashboard");

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* ... (mobile menu toggle code remains same) ... */}
            <button
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden fixed top-4 left-4 z-40 w-10 h-10 glass rounded-xl flex items-center justify-center text-foreground/60 print:hidden"
            >
                <Menu size={20} />
            </button>

            {/* Overlay for Mobile */}
            {isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    className="lg:hidden fixed inset-0 bg-background/60 backdrop-blur-sm z-[60] print:hidden"
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "w-64 border-r border-border bg-white fixed h-full z-[70] flex flex-col transition-transform duration-300 lg:translate-x-0 print:hidden",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-6 pb-2 border-b border-slate-50">
                    <div className="flex items-center gap-3">
                        {sanitizeUrl(session?.user?.institute?.logo) ? (
                            <img
                                src={session.user.institute.logo}
                                alt={session.user.institute.name}
                                className="w-10 h-10 rounded-lg object-contain bg-white p-1 border border-slate-100 shadow-sm"
                                style={{ imageRendering: "-webkit-optimize-contrast" }}
                                crossOrigin="anonymous"
                                decoding="async"
                                loading="eager"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-lg bg-premium-blue/10 flex items-center justify-center border border-premium-blue/20 text-premium-blue font-black text-xs">
                                {session?.user?.institute?.name?.slice(0, 2).toUpperCase() || "I"}
                            </div>
                        )}
                        <div className="min-w-0">
                            <h1 className="text-sm font-black tracking-tight text-slate-800 truncate leading-tight">
                                {session?.user?.institute?.name || "IMS-v2"}
                            </h1>
                            <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                                {session?.user?.role} Portal
                            </p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto scrollbar-hide font-geist-sans">
                    {/* Dashboard (Top Level) */}
                    <div>
                        <Link
                            href={dashboardHref}
                            onClick={() => setIsSidebarOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-bold border-l-4 border-transparent",
                                pathname === dashboardHref
                                    ? "soft-active border-premium-blue"
                                    : "hover:bg-slate-50 text-slate-500 hover:text-premium-blue"
                            )}
                        >
                            <LayoutDashboard size={18} className={cn(pathname === dashboardHref ? "text-premium-blue" : "text-slate-400 group-hover:text-premium-blue")} />
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
                                        // Improved active state logic: check for exact match or deeper path match
                                        // but only if another more specific item doesn't match better.
                                        const href = getHref(item.href);
                                        const isExact = pathname === href;
                                        const isSubPath = pathname.startsWith(href + "/");

                                        // Check if any other item in any group is a more specific match for current path
                                        const hasMoreSpecificMatch = menuGroups.some(g =>
                                            g.items.some(i => {
                                                const otherHref = getHref(i.href);
                                                return i.href !== item.href && pathname.startsWith(otherHref) && otherHref.length > href.length;
                                            })
                                        );

                                        const isActive = isExact || (isSubPath && !hasMoreSpecificMatch);
                                        return (
                                            <Link
                                                key={href}
                                                href={href}
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
                        onClick={async () => {
                            await signOut({ redirect: false });
                            window.location.href = "/login";
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg hover:bg-red-50 text-red-600 transition-all text-sm font-medium"
                    >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>

                    <div className="mt-4 text-center">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-300">
                            Powered by <span className="text-premium-blue">IMS-v2</span>
                        </p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 min-h-screen p-6 md:p-10 relative bg-blueprint print:ml-0 print:p-4 print:bg-white">
                <div className="relative z-10 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
