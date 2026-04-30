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
    RotateCcw, 
    MessageSquare, 
    Receipt,
    Bell,
    Search as SearchIcon,
    PlusCircle,
    CheckCircle2,
    Award,
    TrendingUp,
    Contact,
    Megaphone
} from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import InstituteSwitcher from "@/components/shared/InstituteSwitcher";
import Button from "@/components/ui/Button";
import StudentSearch from "@/components/admin/StudentSearch";
import ActivityFeed from "@/components/admin/ActivityFeed";
import QuickAddModal from "@/components/admin/QuickAddModal";

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
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

    // Redirect logic...
    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        else if (status === "authenticated" && session?.user?.role === "student") router.push("/student/dashboard");
    }, [status, session, router]);

    // Auto-expand group logic...
    useEffect(() => {
        if (!expandedGroup && pathname) {
            const activeGroup = menuGroups.find(g => 
                g.items.some(i => {
                    const actualHref = i.href.startsWith("/admin") && pathname.startsWith("/instructor") 
                        ? i.href.replace("/admin", "/instructor") 
                        : i.href;
                    return pathname === actualHref || pathname.startsWith(actualHref + "/");
                })
            );
            if (activeGroup) setExpandedGroup(activeGroup.label);
        }
    }, [pathname]);

    const menuGroups = [
        {
            label: "Academic",
            items: [
                { label: "Students", icon: Users, href: "/admin/students" },
                { label: "Courses", icon: BookOpen, href: "/admin/courses" },
                { label: "Subjects", icon: Layers3, href: "/admin/subjects" }, // Changed icon to Layers3 for subjects to distinguish
                { label: "Batches", icon: Layers3, href: "/admin/batches" },
            ]
        },
        {
            label: "Enquiry",
            items: [
                { label: "New Entry", icon: Plus, href: "/admin/enquiries/new" },
                { label: "View Entry", icon: List, href: "/admin/enquiries" },
                { label: "Online Enquiry", icon: List, href: "/admin/enquiries/applications" },
            ]
        },
        {
            label: "Learning",
            items: [
                { label: "Attendance", icon: Calendar, href: "/admin/attendance" },
                { label: "Online Exams", icon: FileSignature, href: "/admin/exams" },
                { label: "Question Bank", icon: Database, href: "/admin/question-bank" },
                { label: "Notices", icon: Megaphone, href: "/admin/notices" },
                { label: "Materials", icon: FileText, href: "/admin/materials" },
            ]
        },
        {
            label: "Finance",
            role: ["admin", "super_admin"],
            items: [
                { label: "Fees", icon: CreditCard, href: "/admin/fees" },
                { label: "Collection History", icon: ReceiptText, href: "/admin/collections" },
                { label: "Add Expense", icon: PlusCircle, href: "/admin/expenses/add" },
                { label: "Expense Report", icon: BarChart3, href: "/admin/expenses/report" },
                { label: "Expense Master", icon: Receipt, href: "/admin/expenses/master" },
            ]
        },
        {
            label: "Reports",
            items: [
                { label: "Follow-up Queue", icon: History, href: "/admin/reports/follow-ups" },
                { label: "Attendance", icon: Calendar, href: "/admin/reports/attendance" },
                { label: "Audit Logs", icon: History, href: "/admin/audit-logs", role: ["admin", "super_admin"] },
            ]
        },
        {
            label: "Administration",
            role: ["admin", "super_admin"],
            items: [
                { label: "Accounts Master", icon: Building2, href: "/admin/accounts" },
                { label: "User Management", icon: UserCog, href: "/admin/users" },
                { label: "Completion Tracking", icon: CheckCircle2, href: "/admin/completion-tracking" },
                { label: "Certificate Management", icon: Award, href: "/admin/certificate-management" },
                { label: "ID Card Management", icon: Contact, href: "/admin/id-cards" },
                { label: "Completion Analytics", icon: TrendingUp, href: "/admin/completion-analytics" },
                { label: "Settings", icon: Settings, href: "/admin/settings" },
            ]
        }
    ].filter(group => !group.role || group.role.includes(session?.user?.role))
     .map(group => ({
         ...group,
         items: group.items.filter(item => !item.role || item.role.includes(session?.user?.role))
     }));

    if (session?.user?.role === "super_admin") {
        menuGroups.unshift({
            label: "Super Admin",
            items: [
                { label: "Dashboard", icon: LayoutDashboard, href: "/super-admin" },
                { label: "Institutes", icon: Users, href: "/super-admin/institutes" },
            ]
        });
    }

    if (status === "loading") return <LoadingSpinner fullPage />;
    if (status === "unauthenticated" || session?.user?.role === "student") return null;

    const toggleGroup = (groupLabel) => setExpandedGroup(prev => prev === groupLabel ? null : groupLabel);
    const isDashboard = pathname === "/admin/dashboard" || pathname === "/instructor/dashboard";
    
    // Page Title Logic
    const getPageTitle = () => {
        if (isDashboard) return { title: "Dashboard", subtitle: "Overview and recent activity" };
        
        const allItems = menuGroups.flatMap(g => g.items);
        const currentItem = allItems.find(i => pathname === i.href || pathname.startsWith(i.href + "/"));
        
        if (currentItem) {
            return {
                title: currentItem.label,
                subtitle: `Manage your ${currentItem.label.toLowerCase()} effectively`
            };
        }
        
        // Fallback for special pages like Settings or deep routes
        const segments = pathname.split('/').filter(Boolean);
        const lastSegment = segments[segments.length - 1];
        const formattedTitle = lastSegment ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, ' ') : "Portal";
        
        return { 
            title: formattedTitle, 
            subtitle: "Administrative access and management"
        };
    };
    const { title, subtitle } = getPageTitle();

    return (
        <div className="flex bg-[#f9fafb] text-[#111827] h-screen overflow-hidden">
            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div onClick={() => setIsSidebarOpen(false)} className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] no-print" />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "w-60 h-full bg-gradient-to-b from-slate-200 to-slate-100 border-r border-[#f1f5f9] flex flex-col fixed inset-y-0 left-0 z-[90] transition-transform duration-300 lg:static lg:translate-x-0 no-print",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Logo Area */}
                <div className="p-6 border-b border-[#f1f5f9] mb-4">
                    <InstituteSwitcher />
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-4 space-y-8 scrollbar-hide py-2">
                     {/* Primary Dashboard Link */}
                     <Link
                         href="/admin/dashboard"
                         onClick={() => setIsSidebarOpen(false)}
                         className={cn(
                            "flex items-center gap-3 px-4 py-2.5 rounded-full transition-all group text-[13px] font-semibold relative",
                             isDashboard ? "soft-active" : "text-[#6b7280] hover:bg-[#f9fafb]"
                         )}
                     >
                         <span className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-r transition-all", isDashboard ? "bg-blue-500" : "")} />
                         <LayoutDashboard size={18} className={isDashboard ? "" : "text-blue-500"} />
                         <span>Dashboard</span>
                     </Link>

                     {/* Groups */}
                     {menuGroups.map((group, groupIndex) => {
                         const groupColors = ['text-blue-600', 'text-teal-600', 'text-orange-600', 'text-cyan-600', 'text-red-600', 'text-amber-600'];
                         const itemColors = ['text-blue-500', 'text-teal-500', 'text-orange-500', 'text-cyan-500', 'text-red-500', 'text-amber-500'];
                         const groupColor = groupColors[groupIndex % groupColors.length];
                         const itemColor = itemColors[groupIndex % itemColors.length];
                         
                         return (
                         <div key={group.label} className="space-y-2">
                             <h4 className={cn("px-4 text-[10px] font-black uppercase tracking-[0.1em]", groupColor)}>
                                 {group.label}
                             </h4>
                             <div className="space-y-1">
                                 {group.items.map((item) => {
                                     const isActive = pathname.startsWith(item.href);
                                     return (
                                         <Link
                                             key={item.href}
                                             href={item.href}
                                             onClick={() => setIsSidebarOpen(false)}
                                             className={cn(
                                                 "flex items-center gap-3 px-4 py-2 rounded-full transition-all group text-[13px] font-semibold relative",
                                                 isActive ? "soft-active" : "text-[#6b7280] hover:bg-[#f9fafb]"
                                             )}
                                         >
                                             <span className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-r transition-all", isActive ? itemColor : "")} />
                                             <item.icon size={16} className={cn("transition-colors", !isActive && itemColor)} />
                                             <span>{item.label}</span>
                                         </Link>
                                     );
                                 })}
                             </div>
                         </div>
                     );
                     })}
                </nav>

                {/* Sidebar Footer - User Profile */}
                <div className="p-4 mt-auto border-t border-[#f1f5f9]">
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#f9fafb] mb-3">
                        <div className="w-10 h-10 rounded-xl bg-premium-blue/10 flex items-center justify-center text-premium-blue font-bold text-sm">
                            {session?.user?.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-[#111827] truncate">{session?.user?.name || "Admin"}</p>
                            <p className="text-[10px] text-[#9ca3af] font-black uppercase tracking-wider">{session?.user?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={async () => {
                            await signOut({ redirect: false });
                            window.location.href = "/login";
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-[#6b7280] hover:text-red-600 transition-colors text-[13px] font-semibold w-full"
                    >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                    <div className="mt-4 pb-2">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#e5e7eb] text-center italic">
                            Quantech Premium
                        </p>
                    </div>
                </div>
            </aside>

            {/* Main Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {/* Global Header */}
                <header className="h-20 bg-white border-b border-[#f1f5f9] flex items-center justify-between px-8 shrink-0 no-print">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-[#6b7280] hover:text-[#111827] mr-2">
                            <Menu size={20} />
                        </button>
                        <div className="hidden sm:block">
                            <h2 className="text-[20px] font-bold text-[#111827] tracking-tight">{title}</h2>
                            <p className="text-[13px] text-[#6b7280] font-medium leading-none mt-0.5">{subtitle}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Search Pill */}
                        <div className="hidden md:block">
                            <StudentSearch />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-4 border-l border-[#f1f5f9] pl-6">
                            <Button 
                                variant="primary" 
                                size="sm" 
                                onClick={() => setIsQuickAddOpen(true)}
                                className="hidden sm:flex items-center gap-2"
                            >
                                <Plus size={16} strokeWidth={3} />
                                <span>Create</span>
                            </Button>
                            <button className="text-[#9ca3af] hover:text-[#111827] transition-colors relative">
                                <Bell size={20} />
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
                            </button>
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-border overflow-hidden">
                                <img 
                                    src={`https://ui-avatars.com/api/?name=${session?.user?.name || 'Admin'}&background=eff6ff&color=3b82f6&bold=true`} 
                                    alt="Profile" 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Area - 3 Zone Implementation */}
                <main className="flex-1 flex overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-8 bg-[#f9fafb] scrollbar-hide print-reset">
                        <div className={cn(
                            "mx-auto space-y-8 animate-fade-in",
                            isDashboard ? "w-full" : "max-w-7xl"
                        )}>
                            {children}
                        </div>
                    </div>
                    
                    {/* Activity Panel (Dashboard Only) */}
                    {isDashboard && (
                        <aside className="hidden xl:flex xl:flex-[0.28] border-l border-[#f1f5f9] bg-white overflow-hidden">
                            <ActivityFeed onQuickAdd={() => setIsQuickAddOpen(true)} />
                        </aside>
                    )}
                </main>
            </div>

            {/* Quick Add Student Modal */}
            <QuickAddModal 
                isOpen={isQuickAddOpen} 
                onClose={() => setIsQuickAddOpen(false)} 
            />
        </div>
    );
}
