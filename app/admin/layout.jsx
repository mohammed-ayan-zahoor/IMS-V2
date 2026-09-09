"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import MobileInstructorNav from "@/components/mobile/MobileInstructorNav";
import NotificationBellDropdown from "@/components/notifications/NotificationBellDropdown";
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
    PanelLeft,
    PanelLeftClose, 
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
    Megaphone,
    Bus,
    Hotel,
    Globe,
    Briefcase,
    Coins,
    CalendarDays,
    UserCheck,
    FileSpreadsheet,
    Landmark,
    ClipboardList,
    PhoneCall,
    Mail
} from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import InstituteSwitcher from "@/components/shared/InstituteSwitcher";
import Button from "@/components/ui/Button";
import StudentSearch from "@/components/admin/StudentSearch";
import ActivityFeed from "@/components/admin/ActivityFeed";
import { useAcademicSession } from "@/contexts/AcademicSessionContext";
import { Loader2 } from "lucide-react";

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
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const { sessions, selectedSessionId, changeSession, loading: sessionsLoading } = useAcademicSession();

    useEffect(() => {
        const saved = localStorage.getItem("admin_sidebar_collapsed");
        if (saved !== null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsSidebarCollapsed(saved === "true");
        }
    }, []);

    const toggleSidebarCollapsed = () => {
        setIsSidebarCollapsed(prev => {
            const next = !prev;
            localStorage.setItem("admin_sidebar_collapsed", String(next));
            return next;
        });
    };

    // Redirect logic...
    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        else if (status === "authenticated" && session?.user?.role === "student") router.push("/student/dashboard");
    }, [status, session, router]);



    const [liveFeatures, setLiveFeatures] = useState(null);

    useEffect(() => {
        if (session?.user?.institute?.id) {
            fetch("/api/v1/institute")
                .then(res => res.json())
                .then(data => {
                    if (data?.institute?.settings?.features) {
                        setLiveFeatures(data.institute.settings.features);
                    }
                })
                .catch(err => console.error("Failed to load live features in layout", err));
        }
    }, [session?.user?.institute?.id, pathname]);

    const features = liveFeatures || session?.user?.institute?.features || {};
    const isSchool = session?.user?.institute?.type === 'SCHOOL' || session?.user?.institute?.code === 'QUANTECH';
    const isTransportEnabled = !!features.transport;
    const isHostelEnabled = !!features.hostel;
    const menuGroups = [
        {
            label: "Academic",
            icon: BookOpen,
            items: [
                { label: "Departments", icon: Building2, href: "/admin/departments", instituteType: ["COLLEGE"] },
                { label: "Students", icon: Users, href: "/admin/students" },
                { label: isSchool ? "Class" : "Courses", icon: BookOpen, href: "/admin/courses" },
                { label: "Subjects", icon: Layers3, href: "/admin/subjects" }, // Changed icon to Layers3 for subjects to distinguish
                { label: isSchool ? "Section" : "Batches", icon: Layers3, href: "/admin/batches" },
            ]
        },
        {
            label: "Enquiry",
            icon: Contact,
            role: ["admin", "super_admin"],
            items: [
                { label: "New Entry", icon: Plus, href: "/admin/enquiries/new" },
                { label: "View Entry", icon: List, href: "/admin/enquiries" },
                { label: "Online Enquiry", icon: List, href: "/admin/enquiries/applications" },
            ]
        },
        {
            label: "Learning",
            icon: Award,
            items: [
                { label: "Attendance", icon: Calendar, href: "/admin/attendance" },
                { label: "Online Exams", icon: FileSignature, href: "/admin/exams" },
                { label: "Question Bank", icon: Database, href: "/admin/question-bank" },
                { label: "Notices", icon: Megaphone, href: "/admin/notices" },
                { label: "Materials", icon: FileText, href: "/admin/materials" },
                { label: "School Calendar", icon: CalendarDays, href: "/admin/calendar" },
            ]
        },
        {
            label: "Finance",
            icon: CreditCard,
            role: ["admin", "super_admin"],
            items: [
                { label: "Fees", icon: CreditCard, href: "/admin/fees" },
                { label: "Collection History", icon: ReceiptText, href: "/admin/collections" },
            ]
        },
        {
            label: "Expenses",
            icon: Coins,
            role: ["admin", "super_admin"],
            items: [
                { label: "Add Expense", icon: PlusCircle, href: "/admin/expenses/add" },
                { label: "Expense Report", icon: BarChart3, href: "/admin/expenses/report" },
                { label: "Expense Master", icon: Receipt, href: "/admin/expenses/master" },
            ]
        },
        {
            label: "Incomes",
            icon: Landmark,
            role: ["admin", "super_admin"],
            items: [
                { label: "Add Income", icon: PlusCircle, href: "/admin/incomes/add" },
                { label: "Income Report", icon: BarChart3, href: "/admin/incomes/report" },
                { label: "Income Master", icon: Receipt, href: "/admin/incomes/master" },
            ]
        },
        // Transport
        ...(isTransportEnabled ? [{
            label: "Transport",
            icon: Bus,
            role: ["admin", "super_admin"],
            items: [
                { label: "Transport", icon: Bus, href: "/admin/transport" }
            ]
        }] : []),
        // Hostel
        ...(isHostelEnabled ? [{
            label: "Hostel",
            icon: Hotel,
            role: ["admin", "super_admin"],
            items: [
                { label: "Hostel", icon: Hotel, href: "/admin/hostel" }
            ]
        }] : []),
        {
            label: "Front Office",
            icon: ClipboardList,
            role: ["admin", "super_admin", "instructor", "staff"],
            permission: "view_front_office",
            items: [
                { label: "Visitor Book", icon: ClipboardList, href: "/admin/front-office/visitor-book" },
                { label: "Phone Call Log", icon: PhoneCall, href: "/admin/front-office/calls" },
                { label: "Postals", icon: Mail, href: "/admin/front-office/postals" },
                { label: "Complaints", icon: MessageSquare, href: "/admin/front-office/complaints" }
            ]
        },
        {
            label: "Human Resources",
            icon: UserCog,
            role: ["admin", "super_admin", "instructor", "staff"],
            items: [
                { label: "Designations", icon: Briefcase, href: "/admin/hr/designations", role: ["admin", "super_admin"] },
                { label: "Earnings & Deductions", icon: Coins, href: "/admin/hr/salary-components", role: ["admin", "super_admin"] },
                { label: "Leave Types", icon: CalendarDays, href: "/admin/hr/leave-types", role: ["admin", "super_admin"] },
                { label: "Staff Attendance", icon: UserCheck, href: "/admin/hr/attendance", role: ["admin", "super_admin"] },
                { label: "Payslip Generator", icon: FileSpreadsheet, href: "/admin/hr/payslips", role: ["admin", "super_admin"] },
                { label: "Leave Requests", icon: CalendarDays, href: "/admin/hr/leave-requests" }
            ]
        },
        {
            label: "Reports",
            icon: BarChart3,
            items: [
                { label: "Follow-up Queue", icon: History, href: "/admin/reports/follow-ups" },
                { label: "Attendance", icon: Calendar, href: "/admin/reports/attendance" },
                { label: "Admissions", icon: TrendingUp, href: "/admin/reports/admissions", instituteType: ["VOCATIONAL"] },
            ]
        },
        {
            label: "Administration",
            icon: Settings,
            role: ["admin", "super_admin"],
            items: [
                { label: "Accounts Master", icon: Building2, href: "/admin/accounts" },
                { label: "User Management", icon: UserCog, href: "/admin/users" },
                { label: "Audit Logs", icon: History, href: "/admin/audit-logs" },
                { label: "Completion Tracking", icon: CheckCircle2, href: "/admin/completion-tracking", instituteType: ["VOCATIONAL"] },
                { label: "Certificate Management", icon: Award, href: "/admin/certificate-management" },
                { label: "ID Card Management", icon: Contact, href: "/admin/id-cards" },
                { label: "ID Card (PDFMe) [Test]", icon: Contact, href: "/admin/id-cards-pdfme" },
                { label: "Website Builder", icon: Globe, href: "/admin/website" },
                { label: "Website Results", icon: Award, href: "/admin/website/results" },
                { label: "MOU Tracker", icon: FileSignature, href: "/admin/mou-tracker", role: ["super_admin"] },

                { label: "Settings", icon: Settings, href: "/admin/settings" },
            ]
        }
    ].filter(group => {
        const hasRole = !group.role || group.role.includes(session?.user?.role);
        if (!hasRole) return false;
        if (group.permission && ['instructor', 'staff'].includes(session?.user?.role)) {
            return !!session?.user?.permissions?.includes(group.permission);
        }
        return true;
     })
     .map(group => ({
         ...group,
         items: group.items.filter(item => {
             const hasRole = !item.role || item.role.includes(session?.user?.role);
             const hasInstituteType = !item.instituteType || item.instituteType.includes(session?.user?.institute?.type);
             return hasRole && hasInstituteType;
         })
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
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (activeGroup) setExpandedGroup(activeGroup.label);
        }
    }, [pathname, expandedGroup, menuGroups]);

    if (status === "loading") return <LoadingSpinner fullPage />;
    if (status === "unauthenticated" || session?.user?.role === "student") return null;

    if (pathname === "/admin/website" || pathname === "/admin/attendance/scan") {
        return <>{children}</>;
    }

    const toggleGroup = (groupLabel) => setExpandedGroup(prev => prev === groupLabel ? null : groupLabel);
    const isDashboard = pathname === "/admin/dashboard" || pathname === "/instructor/dashboard";
    
    // Page Title Logic
    const getPageTitle = () => {
        if (isDashboard) return { title: "Dashboard", subtitle: "Overview and recent activity" };
        
        const allItems = menuGroups.flatMap(g => g.items);
        const currentItem = allItems.find(i => pathname === i.href) || 
                            [...allItems].sort((a, b) => b.href.length - a.href.length).find(i => pathname.startsWith(i.href + "/"));
        
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

    const isInstructorOrStaff = ['instructor', 'staff'].includes(session?.user?.role);

    return (
        <div className={cn(
            "grid grid-cols-1 bg-[#f9fafb] text-[#111827] h-screen w-screen overflow-hidden transition-[grid-template-columns] duration-300",
            isSidebarCollapsed ? "lg:grid-cols-[72px_minmax(0,1fr)]" : "lg:grid-cols-[240px_minmax(0,1fr)]"
        )}>
            {/* Mobile Native Shell Nav Bar for Instructors/Staff */}
            {isInstructorOrStaff && <MobileInstructorNav />}

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div onClick={() => setIsSidebarOpen(false)} className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] no-print" />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "h-screen bg-gradient-to-b from-slate-200 to-slate-100 border-r border-[#f1f5f9] flex flex-col fixed inset-y-0 left-0 z-[90] transition-all duration-300 lg:static lg:translate-x-0 no-print",
                isSidebarCollapsed ? "w-60 lg:w-[72px]" : "w-60",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Logo Area */}
                <div className={cn(
                    "border-b border-[#f1f5f9] mb-4 shrink-0 transition-all flex items-center justify-between",
                    isSidebarCollapsed ? "p-3 lg:px-2 lg:py-4 justify-center" : "p-4 pr-3"
                )}>
                    <div className="flex-1 min-w-0">
                        <InstituteSwitcher isCollapsed={isSidebarCollapsed} />
                    </div>
                    {!isSidebarCollapsed && (
                        <button
                            onClick={toggleSidebarCollapsed}
                            className="hidden lg:flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors ml-1 shrink-0"
                            title="Collapse sidebar"
                            aria-label="Collapse sidebar"
                        >
                            <PanelLeftClose size={18} />
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className={cn(
                    "flex-1 overflow-y-auto space-y-4 py-2 min-h-0",
                    isSidebarCollapsed ? "px-2 lg:px-2" : "px-4 space-y-8"
                )}>
                     {/* Primary Dashboard Link */}
                     <Link
                         href="/admin/dashboard"
                         onClick={() => setIsSidebarOpen(false)}
                         title={isSidebarCollapsed ? "Dashboard" : undefined}
                         className={cn(
                            "flex items-center rounded-full transition-all group text-[13px] font-semibold relative",
                            isSidebarCollapsed ? "lg:justify-center lg:px-0 lg:py-2.5 px-4 py-2.5 gap-3" : "gap-3 px-4 py-2.5",
                             isDashboard ? "soft-active" : "text-[#6b7280] hover:bg-[#f9fafb]"
                         )}
                     >
                         <span className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-r transition-all", isDashboard ? "bg-blue-500" : "")} />
                         <LayoutDashboard size={18} className={isDashboard ? "" : "text-blue-500"} />
                         <span className={cn(isSidebarCollapsed && "lg:hidden")}>Dashboard</span>
                     </Link>

                     {/* Thin separator below Dashboard in collapsed mode */}
                     {isSidebarCollapsed && (
                         <div className="hidden lg:block border-t border-slate-300/70 my-2 mx-3" />
                     )}

                     {/* Groups */}
                     {menuGroups.map((group, groupIndex) => {
                         const groupColors = ['text-blue-600', 'text-teal-600', 'text-orange-600', 'text-cyan-600', 'text-red-600', 'text-amber-600'];
                         const itemColors = ['text-blue-500', 'text-teal-500', 'text-orange-500', 'text-cyan-500', 'text-red-500', 'text-amber-500'];
                         const groupColor = groupColors[groupIndex % groupColors.length];
                         const itemColor = itemColors[groupIndex % itemColors.length];
                         const isExpanded = expandedGroup === group.label;
                         const GroupIcon = group.icon || BookOpen;
                         
                         return (
                         <div key={group.label} className="space-y-1">
                             {/* Thin separator between groups in collapsed desktop mode */}
                             {isSidebarCollapsed && groupIndex > 0 && (
                                 <div className="hidden lg:block border-t border-slate-300/50 my-1.5 mx-3" />
                             )}

                             {/* Group Header Button */}
                             <button 
                                 onClick={() => toggleGroup(group.label)}
                                 title={group.label}
                                 className={cn(
                                     "w-full flex items-center transition-colors font-bold uppercase tracking-wider group",
                                     isSidebarCollapsed 
                                         ? "justify-between lg:justify-center px-4 py-2 lg:px-0 lg:py-1" 
                                         : "justify-between px-4 py-2 text-[11px] text-[#9ca3af] hover:text-[#374151]"
                                 )}
                             >
                                 {isSidebarCollapsed ? (
                                     <>
                                         {/* Desktop Collapsed View: group icon badge */}
                                         <div className={cn(
                                             "hidden lg:flex w-9 h-9 rounded-xl items-center justify-center transition-all",
                                             isExpanded ? "bg-slate-300/80 shadow-xs ring-1 ring-slate-400/30" : "hover:bg-slate-200/60"
                                         )}>
                                             <GroupIcon size={17} className={cn(groupColor, "transition-transform duration-200", isExpanded && "scale-105")} />
                                         </div>
                                         {/* Mobile Drawer View */}
                                         <div className="flex lg:hidden items-center justify-between w-full text-[11px] text-[#9ca3af] hover:text-[#374151]">
                                             <span className={groupColor}>{group.label}</span>
                                             <ChevronRight size={14} className={cn("transition-transform duration-200 text-[#9ca3af]", isExpanded && "rotate-90")} />
                                         </div>
                                     </>
                                 ) : (
                                     <>
                                         <span className={groupColor}>{group.label}</span>
                                         <ChevronRight size={14} className={cn("transition-transform duration-200 text-[#9ca3af]", isExpanded && "rotate-90")} />
                                     </>
                                 )}
                             </button>

                             {/* Group Items: strictly rendered only when isExpanded */}
                             {isExpanded && (
                                 <div className={cn(
                                     "space-y-1 animate-in fade-in duration-200",
                                     !isSidebarCollapsed && "pl-2",
                                     isSidebarCollapsed && "lg:my-1.5 lg:py-1.5 lg:border-y lg:border-slate-300/80 lg:bg-slate-200/50 lg:rounded-2xl"
                                 )}>
                                     {group.items.map((item) => {
                                         const Icon = item.icon;
                                         const actualHref = item.href.startsWith("/admin") && pathname.startsWith("/instructor") 
                                             ? item.href.replace("/admin", "/instructor") 
                                             : item.href;
                                         const isActive = pathname === actualHref || pathname.startsWith(actualHref + "/");
                                         return (
                                             <Link
                                                 key={item.label}
                                                 href={actualHref}
                                                 target={item.target}
                                                 onClick={() => setIsSidebarOpen(false)}
                                                 title={item.label}
                                                 className={cn(
                                                     "flex items-center rounded-full transition-all group text-[13px] font-semibold relative",
                                                     isSidebarCollapsed ? "lg:justify-center lg:px-0 lg:py-2.5 px-4 py-2 gap-3" : "gap-3 px-4 py-2",
                                                     isActive 
                                                         ? "soft-active" 
                                                         : "text-[#6b7280] hover:bg-[#f9fafb]"
                                                 )}
                                             >
                                                 <span className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-r transition-all", isActive ? "bg-blue-500" : "")} />
                                                 <Icon size={18} className={isActive ? "" : itemColor} />
                                                 <span className={cn(isSidebarCollapsed && "lg:hidden")}>{item.label}</span>
                                             </Link>
                                         );
                                     })}
                                 </div>
                             )}
                         </div>
                     );
                     })}
                </nav>

                {/* Footer User Info */}
                <div className={cn(
                    "border-t border-[#f1f5f9] bg-[#f9fafb] shrink-0 transition-all",
                    isSidebarCollapsed ? "p-2 lg:p-2" : "p-4"
                )}>
                    <div className={cn(
                        "flex items-center gap-3 mb-3",
                        isSidebarCollapsed ? "px-2 lg:px-0 lg:justify-center" : "px-2"
                    )}>
                        <div 
                            className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0"
                            title={`${session?.user?.name || "User"} (${session?.user?.role || "Admin"})`}
                        >
                            {session?.user?.name?.[0] || "A"}
                        </div>
                        <div className={cn("flex-1 min-w-0", isSidebarCollapsed && "lg:hidden")}>
                            <p className="text-xs font-bold text-[#111827] truncate">{session?.user?.name || "User"}</p>
                            <p className="text-[10px] text-[#6b7280] uppercase tracking-wider font-bold">{session?.user?.role || "Admin"}</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <button
                            onClick={toggleSidebarCollapsed}
                            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                            className={cn(
                                "hidden lg:flex items-center justify-center gap-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 border border-slate-200/70 transition-all",
                                isSidebarCollapsed ? "p-2" : "px-3 py-2"
                            )}
                        >
                            {isSidebarCollapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
                            <span className={cn(isSidebarCollapsed && "lg:hidden")}>Collapse Sidebar</span>
                        </button>
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            title="Sign Out"
                            className={cn(
                                "w-full flex items-center justify-center gap-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all",
                                isSidebarCollapsed ? "px-3 py-2 lg:p-2" : "px-3 py-2"
                            )}
                        >
                            <LogOut size={14} />
                            <span className={cn(isSidebarCollapsed && "lg:hidden")}>Sign Out</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <div className={cn(
                "flex flex-col min-w-0 h-screen overflow-hidden",
                isInstructorOrStaff ? "pt-14 pb-16 md:pt-0 md:pb-0" : ""
            )}>
                {/* Header (Desktop View & General Header) */}
                <header className={cn(
                    "h-16 bg-white border-b border-[#f1f5f9] px-6 flex items-center justify-between shrink-0 no-print",
                    isInstructorOrStaff ? "hidden md:flex" : ""
                )}>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 text-[#6b7280] hover:bg-[#f9fafb] rounded-lg transition-colors"
                            aria-label="Toggle menu"
                        >
                            <Menu size={20} />
                        </button>
                        <button
                            onClick={toggleSidebarCollapsed}
                            className="hidden lg:flex items-center justify-center p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            {isSidebarCollapsed ? <PanelLeft size={19} /> : <PanelLeftClose size={19} />}
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-[#111827] tracking-tight">{title}</h1>
                            <p className="text-[11px] text-[#6b7280] font-medium hidden sm:block">{subtitle}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Search Pill */}
                        <div className="hidden md:block w-64 lg:w-80">
                            <StudentSearch />
                        </div>

                        <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 hover:bg-white transition-all shadow-sm shrink-0">
                            <Calendar size={12} className="text-blue-500" />
                            {sessionsLoading ? (
                                <Loader2 size={12} className="animate-spin text-slate-400" />
                            ) : (
                                <select 
                                    value={selectedSessionId || ""} 
                                    onChange={(e) => changeSession(e.target.value)}
                                    className="bg-transparent border-none text-[11px] font-bold text-slate-700 outline-none cursor-pointer min-w-[80px]"
                                >
                                    {sessions.map(s => (
                                        <option key={s._id} value={s._id}>
                                            {s.sessionName}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Real-time Notification Bell */}
                        <NotificationBellDropdown />

                        <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                            <img 
                                src={`https://ui-avatars.com/api/?name=${session?.user?.name || 'Admin'}&background=0f172a&color=fff&bold=true`} 
                                alt="Profile" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-hidden flex">
                    <div className={cn(
                        "flex-1 overflow-y-auto bg-[#f9fafb] scrollbar-hide print-reset min-w-0",
                        (pathname === "/admin/chat" || pathname === "/admin/website") ? "p-0" : isInstructorOrStaff ? "p-3 md:p-8" : "p-4 sm:p-8"
                    )}>
                        <div className={cn(
                            "animate-fade-in h-full w-full",
                            (pathname === "/admin/chat" || pathname === "/admin/website") ? "w-full h-full" : "mx-auto space-y-8",
                            "w-full max-w-[1600px]"
                        )}>
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
