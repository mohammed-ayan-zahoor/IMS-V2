"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
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
    Mail,
    Boxes,
    Package,
    ShieldCheck,
    ShieldAlert,
    SlidersHorizontal,
    User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import InstituteSwitcher from "@/components/shared/InstituteSwitcher";
import Button from "@/components/ui/Button";
import StudentSearch from "@/components/admin/StudentSearch";
import SpotlightSearch from "@/components/shared/SpotlightSearch";
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
    const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);
    const { sessions, selectedSessionId, changeSession, loading: sessionsLoading } = useAcademicSession();

    const handleSignOut = async () => {
        try {
            await signOut({ redirect: false });
        } catch (err) {
            console.error("SignOut error:", err);
        } finally {
            window.location.href = "/login";
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            // ⌘K / Ctrl+K for Spotlight
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setIsSpotlightOpen((prev) => !prev);
                return;
            }

            // ⌘B / Ctrl+B for Sidebar Collapse/Expand
            if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === "b" || e.code === "KeyB")) {
                e.preventDefault();
                toggleSidebarCollapsed();
                return;
            }

            // Shortcut for Sign Out:
            // 1. Ctrl+L (control key on Mac/Windows)
            // 2. ⌘+Shift+L / Ctrl+Shift+L
            // 3. Alt+L / ⌥L (Option+L on Mac)
            const isL = e.key.toLowerCase() === "l" || e.code === "KeyL";
            const isCtrlL = e.ctrlKey && isL;
            const isCmdShiftL = (e.metaKey || e.ctrlKey) && e.shiftKey && isL;
            const isAltL = e.altKey && isL;

            if (isCtrlL || isCmdShiftL || isAltL) {
                e.preventDefault();
                e.stopPropagation();
                handleSignOut();
                return;
            }
        };
        const handleCustomOpen = () => setIsSpotlightOpen(true);

        const handleClickOutside = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setIsUserMenuOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown, true);
        window.addEventListener("open-spotlight", handleCustomOpen);
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            window.removeEventListener("keydown", handleKeyDown, true);
            window.removeEventListener("open-spotlight", handleCustomOpen);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem("admin_sidebar_collapsed");
        if (saved !== null) {
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
    const isSchool = session?.user?.institute?.type === 'SCHOOL' || 
                     session?.user?.institute?.code === 'QUANTECH' ||
                     (session?.user?.institute?.type === 'COLLEGE' && session?.user?.institute?.structure === 'CLASS_BASED');
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
                { label: "Day Book & Ledger", icon: FileSpreadsheet, href: "/admin/finance/ledger" },
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
            label: "Stock & Inventory",
            icon: Boxes,
            role: ["admin", "super_admin", "instructor", "staff"],
            permission: "manage_stock",
            items: [
                { label: "Stock & Inventory", icon: Boxes, href: "/admin/stock" }
            ]
        },
        {
            label: "Library",
            icon: BookOpen,
            role: ["admin", "super_admin", "instructor", "staff"],
            permission: "manage_library",
            items: [
                { label: "Library", icon: BookOpen, href: "/admin/library" }
            ]
        },
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
                { label: "Staff Directory", icon: Users, href: "/admin/hr/staff", role: ["admin", "super_admin"] },
                { label: "Departments & Shifts", icon: Building2, href: "/admin/departments", role: ["admin", "super_admin"] },
                { label: "Designations", icon: Briefcase, href: "/admin/hr/designations", role: ["admin", "super_admin"] },
                { label: "Earnings & Deductions", icon: Coins, href: "/admin/hr/salary-components", role: ["admin", "super_admin"] },
                { label: "Leave Types", icon: CalendarDays, href: "/admin/hr/leave-types", role: ["admin", "super_admin"] },
                { label: "Staff Attendance", icon: UserCheck, href: "/admin/hr/attendance", role: ["admin", "super_admin"] },
                { label: "Payslip Generator", icon: FileSpreadsheet, href: "/admin/hr/payslips", role: ["admin", "super_admin"] },
                { label: "Permissions & Leaves", icon: CalendarDays, href: "/admin/hr/leave-requests" },
                { label: "HR Settings", icon: SlidersHorizontal, href: "/admin/hr/settings", role: ["admin", "super_admin"] }
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
                { label: "Approvals", icon: ShieldCheck, href: "/admin/approvals" },
                { label: "Master Admin & Rules", icon: ShieldAlert, href: "/admin/settings/master-admin" },
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

                { label: "WhatsApp Broadcast", icon: MessageSquare, href: "/admin/utility/whatsapp-broadcast" },
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

    // Calculate the single, unambiguous active nav link (exact match beats prefix match)
    const allNavHrefs = menuGroups.flatMap(g => g.items.map(item => {
        return item.href.startsWith("/admin") && pathname.startsWith("/instructor") 
            ? item.href.replace("/admin", "/instructor") 
            : item.href;
    }));
    const exactMatchNavHref = allNavHrefs.find(h => pathname === h);
    const activeNavHref = exactMatchNavHref || allNavHrefs
        .filter(h => pathname.startsWith(h + "/"))
        .sort((a, b) => b.length - a.length)[0];

    return (
        <div className="flex bg-[#f9fafb] text-[#111827] h-screen w-screen overflow-hidden">
            {/* Mobile Native Shell Nav Bar for Instructors/Staff */}
            {isInstructorOrStaff && <MobileInstructorNav />}

            {/* Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setIsSidebarOpen(false)} 
                        className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-[80] no-print" 
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside className={cn(
                "h-screen bg-slate-100 border-r border-[#f1f5f9] flex flex-col fixed inset-y-0 left-0 z-[90] lg:static no-print shrink-0 overflow-hidden select-none",
                "transition-[width,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                isSidebarCollapsed ? "w-60 lg:w-[72px]" : "w-60 lg:w-[240px]",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                {/* Logo Area */}
                <div className={cn(
                    "border-b border-slate-200/80 mb-3 shrink-0 transition-all duration-200 flex items-center",
                    isSidebarCollapsed ? "p-2.5 justify-center" : "p-3"
                )}>
                    <div className="w-full min-w-0">
                        <InstituteSwitcher isCollapsed={isSidebarCollapsed} />
                    </div>
                </div>

                {/* Navigation */}
                <nav className={cn(
                    "flex-1 overflow-y-auto space-y-4 py-2 min-h-0",
                    isSidebarCollapsed ? "px-2 lg:px-2" : "px-3 space-y-6"
                )}>
                     {/* Primary Dashboard Link */}
                     <Link
                         href="/admin/dashboard"
                         onClick={() => setIsSidebarOpen(false)}
                         title={isSidebarCollapsed ? "Dashboard" : undefined}
                         className={cn(
                            "flex items-center rounded-xl transition-all duration-150 group text-[13px] font-semibold relative active:scale-[0.98]",
                            isSidebarCollapsed ? "lg:justify-center lg:px-0 lg:py-2.5 px-3 py-2.5 gap-3" : "gap-3 px-3 py-2",
                            isDashboard ? "bg-white text-blue-600 shadow-xs border border-slate-200/60 font-bold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                         )}
                     >
                         <span className={cn("absolute left-0 top-1 bottom-1 w-1 rounded-r transition-all duration-150", isDashboard ? "bg-blue-500" : "opacity-0")} />
                         <LayoutDashboard size={18} className={cn("shrink-0 transition-transform duration-150 group-hover:scale-105", isDashboard ? "text-blue-600" : "text-blue-500")} />
                         <span className={cn("truncate whitespace-nowrap transition-opacity duration-200", isSidebarCollapsed && "lg:hidden")}>Dashboard</span>
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
                                     "w-full flex items-center transition-colors font-bold uppercase tracking-wider group cursor-pointer active:scale-[0.98]",
                                     isSidebarCollapsed 
                                         ? "justify-between lg:justify-center px-3 py-1.5 lg:px-0 lg:py-1" 
                                         : "justify-between px-3 py-1.5 text-[11px] text-[#9ca3af] hover:text-[#374151]"
                                 )}
                             >
                                 {isSidebarCollapsed ? (
                                     <>
                                         {/* Desktop Collapsed View: group icon badge */}
                                         <div className={cn(
                                             "hidden lg:flex w-9 h-9 rounded-xl items-center justify-center transition-all duration-150",
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

                             {/* Group Items: fluid spring accordion */}
                             <AnimatePresence initial={false}>
                                 {isExpanded && (
                                     <motion.div
                                         key={`group-${group.label}`}
                                         initial={{ opacity: 0, height: 0 }}
                                         animate={{ opacity: 1, height: "auto" }}
                                         exit={{ opacity: 0, height: 0 }}
                                         transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                         className={cn(
                                             "overflow-hidden space-y-1",
                                             !isSidebarCollapsed && "pl-2",
                                             isSidebarCollapsed && "lg:my-1.5 lg:py-1.5 lg:border-y lg:border-slate-300/80 lg:bg-slate-200/50 lg:rounded-2xl"
                                         )}
                                     >
                                         {group.items.map((item) => {
                                             const Icon = item.icon;
                                             const actualHref = item.href.startsWith("/admin") && pathname.startsWith("/instructor") 
                                                 ? item.href.replace("/admin", "/instructor") 
                                                 : item.href;
                                             const isActive = actualHref === activeNavHref;
                                             return (
                                                 <Link
                                                     key={item.label}
                                                     href={actualHref}
                                                     target={item.target}
                                                     onClick={() => setIsSidebarOpen(false)}
                                                     title={item.label}
                                                     className={cn(
                                                         "flex items-center rounded-xl transition-all duration-150 group text-[13px] font-semibold relative active:scale-[0.98]",
                                                         isSidebarCollapsed ? "lg:justify-center lg:px-0 lg:py-2.5 px-3 py-2 gap-3" : "gap-3 px-3 py-2",
                                                         isActive 
                                                             ? "bg-white text-blue-600 shadow-xs border border-slate-200/60 font-bold" 
                                                             : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                                                     )}
                                                 >
                                                     <span className={cn("absolute left-0 top-1 bottom-1 w-1 rounded-r transition-all duration-150", isActive ? "bg-blue-500" : "opacity-0")} />
                                                     <Icon size={17} className={cn("shrink-0 transition-transform duration-150 group-hover:scale-105", isActive ? "text-blue-600" : itemColor)} />
                                                     <span className={cn("truncate whitespace-nowrap transition-opacity duration-200", isSidebarCollapsed && "lg:hidden")}>{item.label}</span>
                                                 </Link>
                                             );
                                         })}
                                     </motion.div>
                                 )}
                             </AnimatePresence>
                         </div>
                     );
                     })}
                </nav>

                {/* Footer User Info */}
                <div className={cn(
                    "border-t border-slate-200/80 bg-slate-100/90 shrink-0 transition-all duration-200",
                    isSidebarCollapsed ? "p-2" : "p-3"
                )}>
                    <div className={cn(
                        "flex items-center gap-2.5 mb-2.5",
                        isSidebarCollapsed ? "justify-center" : "px-1"
                    )}>
                        <div 
                            className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-slate-300/50"
                            title={`${session?.user?.name || "User"} (${session?.user?.role || "Admin"})`}
                        >
                            {session?.user?.name?.[0]?.toUpperCase() || "A"}
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate leading-tight">{session?.user?.name || "User"}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold truncate mt-0.5">{session?.user?.role || "Admin"}</p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleSignOut}
                        title="Sign Out (Ctrl+L / ⌥L)"
                        className={cn(
                            "w-full flex items-center gap-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 border border-transparent hover:border-rose-200/60 active:scale-[0.98] transition-all duration-150 cursor-pointer",
                            isSidebarCollapsed ? "p-2 justify-center" : "px-2.5 py-1.5 justify-between"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <LogOut size={14} className="shrink-0" />
                            {!isSidebarCollapsed && <span>Sign Out</span>}
                        </div>
                        {!isSidebarCollapsed && (
                            <span className="text-[10px] font-mono text-rose-500 bg-rose-100/70 px-1.5 py-0.5 rounded-md font-semibold">
                                Ctrl+L
                            </span>
                        )}
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <div className={cn(
                "flex-1 flex flex-col min-w-0 h-screen overflow-hidden",
                isInstructorOrStaff ? "pt-14 pb-16 md:pt-0 md:pb-0" : ""
            )}>
                {/* Header (Desktop View & General Header) */}
                <header className={cn(
                    "h-16 bg-white border-b border-[#f1f5f9] px-4 sm:px-6 flex items-center justify-between shrink-0 no-print",
                    isInstructorOrStaff ? "hidden md:flex" : ""
                )}>
                    <div className="flex items-center gap-3 sm:gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 rounded-xl transition-all duration-150 cursor-pointer"
                            aria-label="Toggle menu"
                        >
                            <Menu size={20} />
                        </button>
                        {/* Single, Canonical macOS-style Sidebar Toggle Button */}
                        <button
                            onClick={toggleSidebarCollapsed}
                            className="hidden lg:flex items-center justify-center w-8 h-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100/90 active:scale-95 rounded-lg border border-transparent hover:border-slate-200/70 transition-all duration-150 cursor-pointer"
                            title={isSidebarCollapsed ? "Expand sidebar (⌘B)" : "Collapse sidebar (⌘B)"}
                            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            {isSidebarCollapsed ? (
                                <PanelLeft size={18} className="text-blue-600" />
                            ) : (
                                <PanelLeftClose size={18} className="text-slate-500" />
                            )}
                        </button>
                        <div>
                            <h1 className="text-base sm:text-lg font-bold text-[#111827] tracking-tight leading-tight">{title}</h1>
                            <p className="text-[11px] text-[#6b7280] font-medium hidden sm:block tracking-normal mt-0.5">{subtitle}</p>
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

                        {/* User Profile Dropdown Menu with Sign Out Option */}
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={() => setIsUserMenuOpen(prev => !prev)}
                                className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 overflow-hidden shrink-0 active:scale-95 transition-transform hover:ring-2 hover:ring-blue-500/20 cursor-pointer flex items-center justify-center"
                                title="User Account Menu"
                                aria-label="User Account Menu"
                                aria-expanded={isUserMenuOpen}
                            >
                                <img 
                                    src={`https://ui-avatars.com/api/?name=${session?.user?.name || 'Admin'}&background=0f172a&color=fff&bold=true`} 
                                    alt="Profile" 
                                    className="w-full h-full object-cover"
                                />
                            </button>

                            <AnimatePresence>
                                {isUserMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.96, y: -4 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.96, y: -4 }}
                                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                                        style={{ transformOrigin: "top right" }}
                                        className="absolute right-0 top-10 w-56 bg-white rounded-xl shadow-xl border border-slate-200/80 py-1.5 z-50 overflow-hidden"
                                    >
                                        <div className="px-3 py-2 border-b border-slate-100">
                                            <p className="text-xs font-bold text-slate-900 truncate">
                                                {session?.user?.name || "Admin User"}
                                            </p>
                                            <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                                                {session?.user?.email || (session?.user?.role ? `${session.user.role.toUpperCase()}` : "Administrator")}
                                            </p>
                                        </div>

                                        <div className="p-1">
                                            <Link
                                                href="/admin/settings"
                                                onClick={() => setIsUserMenuOpen(false)}
                                                className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                                            >
                                                <Settings size={14} className="text-slate-400" />
                                                <span>Settings</span>
                                            </Link>
                                        </div>

                                        <div className="p-1 border-t border-slate-100">
                                            <button
                                                onClick={() => {
                                                    setIsUserMenuOpen(false);
                                                    handleSignOut();
                                                }}
                                                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg active:scale-95 transition-transform cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <LogOut size={14} />
                                                    <span>Sign Out</span>
                                                </div>
                                                <span className="text-[10px] font-mono text-red-400 bg-red-100/70 px-1.5 py-0.5 rounded font-bold">
                                                    Ctrl+L
                                                </span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
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
            <SpotlightSearch isOpen={isSpotlightOpen} onClose={() => setIsSpotlightOpen(false)} />
        </div>
    );
}
