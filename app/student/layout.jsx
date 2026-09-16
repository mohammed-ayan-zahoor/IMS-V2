"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Clock,
    CalendarCheck,
    CreditCard,
    BookOpen,
    Layers,
    FileText,
    Settings,
    LogOut,
    MessageSquare,
    MoreHorizontal,
    Bell,
    X,
    Megaphone,
    Trophy,
    PenTool,
    Search,
    ChevronLeft,
    ChevronRight,
    Target
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBellDropdown from "@/components/notifications/NotificationBellDropdown";
import WebPushInitializer from "@/components/notifications/WebPushInitializer";

export default function StudentLayout({ children }) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Full navigation list for sidebar
    const navItems = [
        { label: "Dashboard", icon: LayoutDashboard, href: "/student/dashboard" },
        { label: "Attendance", icon: CalendarCheck, href: "/student/attendance" },
        { label: "Timetable", icon: Clock, href: "/student/timetable" },
        { label: "Fees", icon: CreditCard, href: "/student/fees" },
        { label: "Library", icon: BookOpen, href: "/student/library" },
        { label: "My Batches", icon: Layers, href: "/student/batches" },
        { label: "Materials", icon: FileText, href: "/student/materials" },
        { label: "Syllabus", icon: Target, href: "/student/syllabus" },
        { label: "Exams", icon: PenTool, href: "/student/exams" },
        { label: "Mock Tests", icon: Trophy, href: "/student/practice" },
        { label: "Notices", icon: Megaphone, href: "/student/notices" },
        { label: "Messages", icon: MessageSquare, href: "/student/chat" },
        { label: "Settings", icon: Settings, href: "/student/settings" },
    ];

    // Mobile primary bottom tabs (4 tabs + More)
    const mobileBottomTabs = [
        { label: "Dashboard", icon: LayoutDashboard, href: "/student/dashboard" },
        { label: "Attendance", icon: CalendarCheck, href: "/student/attendance" },
        { label: "Timetable", icon: Clock, href: "/student/timetable" },
        { label: "Fees", icon: CreditCard, href: "/student/fees" },
    ];

    // Mobile "More" menu items
    const mobileMoreItems = [
        { label: "Library", icon: BookOpen, href: "/student/library", desc: "Catalog & issued books" },
        { label: "My Batches", icon: Layers, href: "/student/batches", desc: "Active enrolled classes" },
        { label: "Materials", icon: FileText, href: "/student/materials", desc: "Notes & study resources" },
        { label: "Syllabus", icon: Target, href: "/student/syllabus", desc: "Course curriculum progress" },
        { label: "Exams", icon: PenTool, href: "/student/exams", desc: "Schedule & results" },
        { label: "Mock Tests", icon: Trophy, href: "/student/practice", desc: "Practice & quizzes" },
        { label: "Notices", icon: Megaphone, href: "/student/notices", desc: "Announcements & alerts" },
        { label: "Messages", icon: MessageSquare, href: "/student/chat", desc: "Instructor communications" },
        { label: "Settings", icon: Settings, href: "/student/settings", desc: "Profile & preferences" },
    ];

    // If student is attempting an exam, hide navigation for distraction-free mode
    if (pathname.includes('/take')) {
        return (
            <div className="bg-[#FFFFFF] text-[#1E1B2E] h-screen w-screen overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full w-full"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </div>
        );
    }

    // Determine readable page title and breadcrumb
    const getPageTitle = () => {
        if (pathname === "/student/dashboard") return "Student Details";
        if (pathname === "/student/attendance") return "Attendance Record";
        if (pathname === "/student/timetable") return "Class Timetable";
        if (pathname === "/student/fees") return "Fees & Payments";
        if (pathname === "/student/library") return "Student Library";
        if (pathname === "/student/batches") return "My Batches";
        if (pathname === "/student/materials") return "Study Materials";
        if (pathname === "/student/syllabus") return "Curriculum Syllabus";
        if (pathname === "/student/exams") return "Examinations";
        if (pathname === "/student/practice") return "Mock Practice Tests";
        if (pathname === "/student/notices") return "Campus Notices";
        if (pathname === "/student/chat") return "Messages";
        if (pathname === "/student/settings") return "Account Settings";
        return "Student Portal";
    };

    const isSubPage = pathname !== "/student/dashboard";
    const isChatPage = pathname === "/student/chat";

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[#FFFFFF] text-[#1E1B2E] font-sans antialiased">
            <WebPushInitializer />
            
            {/* Desktop Sidebar (Adtech Spec: Solid deep navy-indigo #2C2A46, unbordered) */}
            <aside className="hidden md:flex flex-col w-56 lg:w-64 h-screen bg-[#2C2A46] shrink-0 z-40 px-4 py-6 justify-between select-none">
                <div className="space-y-6">
                    {/* Brand Mark (Adtech Spec: Soft-square 40x40px #6E5AE0 tile + two-line wordmark) */}
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-10 h-10 rounded-[10px] bg-[#6E5AE0] flex items-center justify-center shrink-0 shadow-none">
                            <span className="text-white font-bold text-sm tracking-tight">
                                {session?.user?.institute?.name ? session.user.institute.name.substring(0, 4).toLowerCase() : "five"}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[13px] text-white font-normal leading-tight truncate">
                                {session?.user?.institute?.name || "Dimensions"}
                            </p>
                            <p className="text-[12px] text-[#B7B3D6] font-normal leading-tight truncate">
                                of learning
                            </p>
                        </div>
                    </div>

                    {/* Nav Items List */}
                    <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-210px)] scrollbar-hide pt-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3.5 py-2.5 rounded-[12px] transition-colors text-[14px] font-normal w-full",
                                        isActive
                                            ? "bg-[#EDE8FB] text-[#1E1B2E] font-medium"
                                            : "text-[#B7B3D6] hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <item.icon
                                        size={18}
                                        strokeWidth={1.8}
                                        className={isActive ? "text-[#6E5AE0]" : "text-[#B7B3D6]"}
                                    />
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Sign Out (Adtech Spec: Plain coral text link at bottom, unboxed) */}
                <div className="pt-4 pb-10 px-2">
                    <button
                        onClick={async () => {
                            await signOut({ redirect: false });
                            window.location.href = "/login";
                        }}
                        className="flex items-center gap-2 text-[14px] font-normal text-[#F4586A] hover:text-[#ff7887] transition-colors w-full text-left cursor-pointer"
                    >
                        <LogOut size={16} strokeWidth={1.8} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Viewport */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#FFFFFF]">
                
                {/* Header Bar (Adtech Spec: clean white, search pill, user block, circular icon buttons) */}
                <header className="h-16 lg:h-20 bg-[#FFFFFF] border-b border-[#E9E8F0] flex items-center justify-between px-4 sm:px-8 shrink-0 z-30">
                    
                    {/* Left: Page Title & Breadcrumb */}
                    <div className="flex items-center gap-3 min-w-0">
                        {isSubPage && (
                            <button
                                onClick={() => router.back()}
                                className="w-7 h-7 rounded-full border border-[#E9E8F0] flex items-center justify-center text-[#8D8A9B] hover:text-[#1E1B2E] hover:border-[#8D8A9B] transition-colors shrink-0 cursor-pointer"
                                title="Back"
                            >
                                <ChevronLeft size={16} />
                            </button>
                        )}
                        <div className="min-w-0">
                            <h1 className="text-[18px] lg:text-[20px] font-bold text-[#1E1B2E] leading-tight truncate">
                                {getPageTitle()}
                            </h1>
                            <p className="text-[12px] text-[#8D8A9B] leading-tight truncate mt-0.5">
                                Student Portal <span className="text-[#8D8A9B]/60">/</span> {getPageTitle()}
                            </p>
                        </div>
                    </div>

                    {/* Right: Search Pill + User Block + Circular Actions */}
                    <div className="flex items-center gap-3 sm:gap-4 ml-auto">
                        
                        {/* Search Input Pill (Adtech Spec: Pill shape 999px, thin 1px border #E9E8F0, white fill) */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (searchQuery.trim()) {
                                    router.push(`/student/materials?q=${encodeURIComponent(searchQuery.trim())}`);
                                }
                            }}
                            className="relative hidden md:flex items-center"
                        >
                            <Search size={16} className="absolute left-3.5 text-[#8D8A9B]" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search anything (press Enter)"
                                className="w-48 lg:w-64 h-9 pl-9 pr-4 text-[13px] text-[#1E1B2E] placeholder:text-[#8D8A9B] bg-white border border-[#E9E8F0] rounded-full focus:outline-none focus:border-[#6E5AE0] transition-colors"
                            />
                        </form>

                        {/* User Block (Adtech Spec: Circular 36px avatar + two-line text) */}
                        <Link
                            href="/student/settings"
                            className="flex items-center gap-3 pl-1 sm:pl-2 hover:opacity-80 transition-opacity cursor-pointer group"
                            title="Account Settings"
                        >
                            <div className="w-9 h-9 rounded-full bg-[#EDE8FB] border border-[#E9E8F0] flex items-center justify-center overflow-hidden shrink-0">
                                {session?.user?.image ? (
                                    <img src={session.user.image} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-[#6E5AE0] text-[12px] font-bold">
                                        {session?.user?.name ? session.user.name.substring(0, 2).toUpperCase() : "ST"}
                                    </span>
                                )}
                            </div>
                            <div className="hidden sm:block text-left">
                                <p className="text-[13px] font-bold text-[#1E1B2E] leading-tight truncate max-w-[130px] group-hover:text-[#6E5AE0] transition-colors">
                                    {session?.user?.name || "Student"}
                                </p>
                                <p className="text-[11px] text-[#8D8A9B] leading-tight truncate">
                                    Student
                                </p>
                            </div>
                        </Link>

                        {/* Circular Action Buttons (Adtech Spec: Circular 32px, thin border #E9E8F0, white fill) */}
                        <div className="flex items-center gap-2">
                            <NotificationBellDropdown 
                                triggerClassName="w-8 h-8 rounded-full border border-[#E9E8F0] bg-white flex items-center justify-center text-[#8D8A9B] hover:text-[#1E1B2E] hover:border-[#8D8A9B] transition-colors relative outline-none cursor-pointer"
                                iconSize={15}
                            />
                            <Link
                                href="/student/settings"
                                className="w-8 h-8 rounded-full border border-[#E9E8F0] bg-white flex items-center justify-center text-[#8D8A9B] hover:text-[#1E1B2E] hover:border-[#8D8A9B] transition-colors shrink-0"
                                title="Settings"
                            >
                                <Settings size={15} />
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Scrollable Canvas */}
                <main className={cn(
                    "flex-1 bg-[#FFFFFF] min-w-0",
                    isChatPage
                        ? "overflow-hidden flex flex-col p-0 pb-16 md:pb-0 h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)]"
                        : "overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-hide pb-28 md:pb-8 touch-pan-y"
                )}>
                    <div className={cn(
                        "w-full",
                        isChatPage ? "h-full flex-1 flex flex-col min-h-0" : "max-w-[1400px] mx-auto"
                    )}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={pathname}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className={isChatPage ? "h-full w-full flex-1 flex flex-col min-h-0" : undefined}
                            >
                                {children}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>

            {/* Mobile Native iOS Bottom Navigation Bar (< 768px) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-[#E9E8F0] safe-pb">
                <div className="flex items-center justify-around h-14 px-2">
                    {mobileBottomTabs.map((tab) => {
                        const isActive = pathname === tab.href;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={cn(
                                    "flex flex-col items-center justify-center flex-1 py-1 transition-colors relative min-w-[50px]",
                                    isActive ? "text-[#6E5AE0]" : "text-[#8D8A9B]"
                                )}
                            >
                                <tab.icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                                <span className={cn(
                                    "text-[10px] mt-1 leading-none font-medium tracking-tight",
                                    isActive ? "text-[#6E5AE0] font-bold" : "text-[#8D8A9B]"
                                )}>
                                    {tab.label}
                                </span>
                                {isActive && (
                                    <div className="w-1 h-1 rounded-full bg-[#6E5AE0] mt-0.5" />
                                )}
                            </Link>
                        );
                    })}

                    {/* More Menu Trigger */}
                    <button
                        onClick={() => setIsMoreMenuOpen(true)}
                        className={cn(
                            "flex flex-col items-center justify-center flex-1 py-1 transition-colors relative min-w-[50px]",
                            isMoreMenuOpen ? "text-[#6E5AE0]" : "text-[#8D8A9B]"
                        )}
                    >
                        <MoreHorizontal size={20} strokeWidth={1.8} />
                        <span className="text-[10px] mt-1 leading-none font-medium tracking-tight">
                            More
                        </span>
                    </button>
                </div>
            </nav>

            {/* Mobile Cupertino Bottom Drawer for Secondary Navigation */}
            <AnimatePresence>
                {isMoreMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMoreMenuOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] md:hidden"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] border-t border-[#E9E8F0] z-[70] px-5 pt-4 pb-7 md:hidden shadow-2xl safe-pb max-h-[85vh] flex flex-col"
                        >
                            {/* Drag Handle */}
                            <div className="w-10 h-1 bg-[#CBD5E1] rounded-full mx-auto mb-3 shrink-0" />

                            {/* Header */}
                            <div className="flex items-center justify-between mb-2 pb-3 border-b border-[#F1F5F9] shrink-0">
                                <div>
                                    <h3 className="text-base font-bold text-[#0D1C2E]">More Services</h3>
                                    <p className="text-xs text-[#8D8A9B]">Academics, tools & student resources</p>
                                </div>
                                <button
                                    onClick={() => setIsMoreMenuOpen(false)}
                                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-[#545F72] transition-colors cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Scrollable Resources List */}
                            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1 touch-pan-y">
                                {mobileMoreItems.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsMoreMenuOpen(false)}
                                            className={cn(
                                                "group flex items-center justify-between py-3 px-2 rounded-xl transition-all",
                                                isActive
                                                    ? "bg-slate-100/80 text-[#002045]"
                                                    : "hover:bg-slate-50 active:bg-slate-100"
                                            )}
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <item.icon
                                                    size={20}
                                                    strokeWidth={1.8}
                                                    className={cn(
                                                        "shrink-0 transition-colors",
                                                        isActive ? "text-[#002045]" : "text-[#545F72] group-hover:text-[#0D1C2E]"
                                                    )}
                                                />
                                                <div className="min-w-0">
                                                    <p className={cn("text-sm leading-tight", isActive ? "font-bold text-[#002045]" : "font-semibold text-[#0D1C2E]")}>
                                                        {item.label}
                                                    </p>
                                                    <p className="text-xs text-[#8D8A9B] leading-tight truncate mt-0.5">
                                                        {item.desc}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight
                                                size={16}
                                                className={cn(
                                                    "shrink-0 transition-transform group-hover:translate-x-0.5",
                                                    isActive ? "text-[#002045]" : "text-[#CBD5E1]"
                                                )}
                                            />
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Bottom Sign Out */}
                            <div className="pt-3 mt-2 border-t border-[#F1F5F9] shrink-0">
                                <button
                                    onClick={async () => {
                                        await signOut({ redirect: false });
                                        window.location.href = "/login";
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-rose-600 bg-rose-50/70 hover:bg-rose-100/70 font-semibold text-xs tracking-wide uppercase transition-colors cursor-pointer"
                                >
                                    <LogOut size={16} strokeWidth={2} />
                                    <span>Sign Out of Account</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
