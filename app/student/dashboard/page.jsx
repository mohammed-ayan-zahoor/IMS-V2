"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Search,
    ChevronDown,
    MoreHorizontal,
    Phone,
    Mail,
    MapPin,
    MessageSquare,
    Award,
    Edit3,
    BookOpen,
    Clock,
    CheckCircle2,
    Trophy,
    ArrowUpRight,
    TrendingUp,
    Sparkles,
    Calendar,
    Layers,
    AlertCircle,
    Check,
    FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Skeleton from "@/components/shared/Skeleton";

export default function StudentDashboard() {
    const { data: session } = useSession();
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Interactive Filters & Popover States
    const [activityFilter, setActivityFilter] = useState("This Week");
    const [isKebabOpen, setIsKebabOpen] = useState(false);
    const [performanceFilter, setPerformanceFilter] = useState("Last 6 Months");
    const [courseSearch, setCourseSearch] = useState("");
    const [courseStatusFilter, setCourseStatusFilter] = useState("All");

    const kebabRef = useRef(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Close kebab menu on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (kebabRef.current && !kebabRef.current.contains(e.target)) {
                setIsKebabOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const res = await fetch("/api/v1/student/dashboard");
            if (res.ok) {
                const json = await res.json();
                setData(json);
                setError(null);
            } else {
                setError("Failed to load student dashboard");
            }
        } catch (err) {
            console.error("Dashboard fetch error:", err);
            setError("Network connection issue. Please refresh.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-3">
                        <Skeleton className="h-[480px] w-full rounded-[16px]" />
                    </div>
                    <div className="lg:col-span-5">
                        <Skeleton className="h-[480px] w-full rounded-[16px]" />
                    </div>
                    <div className="lg:col-span-4">
                        <Skeleton className="h-[480px] w-full rounded-[16px]" />
                    </div>
                </div>
                <Skeleton className="h-[300px] w-full rounded-[16px]" />
            </div>
        );
    }

    // Profile Fallbacks
    const profile = data?.studentProfile || {
        name: session?.user?.name || "Student",
        enrollmentNumber: "STU-005",
        avatar: session?.user?.image || null,
        email: session?.user?.email || "student@institute.edu",
        phone: "+91 98765 43210",
        address: "Academic Block A, Campus Resident",
        status: "Active",
        courseName: "Secondary Academic Program",
        batchName: "Section A",
        awards: [
            { id: "a1", title: "Top Performer in Science Quiz", year: "2025" },
            { id: "a2", title: "100% Attendance Distinction", year: "2024" }
        ]
    };

    // Dynamic Learning Activity Datasets for "This Week" / "Last Week" / "Monthly Average"
    const activityDatasets = {
        "This Week": {
            hoursSummary: "16 Hours",
            caption: "Total Weekly Study",
            target: "85% Rate",
            modules: "4 Modules",
            chart: data?.learningActivity || [
                { day: "Mon", classHours: 3.5, quizHours: 1.5, selfHours: 1.0 },
                { day: "Tue", classHours: 4.0, quizHours: 1.0, selfHours: 1.5 },
                { day: "Wed", classHours: 2.5, quizHours: 2.0, selfHours: 1.0 },
                { day: "Thu", classHours: 4.5, quizHours: 1.0, selfHours: 2.0 },
                { day: "Fri", classHours: 3.0, quizHours: 1.5, selfHours: 1.5 },
                { day: "Sat", classHours: 2.0, quizHours: 1.0, selfHours: 0.5 },
                { day: "Sun", classHours: 1.0, quizHours: 0.5, selfHours: 1.5 }
            ]
        },
        "Last Week": {
            hoursSummary: "19 Hours",
            caption: "Completed Study Hours",
            target: "92% Rate",
            modules: "5 Modules",
            chart: [
                { day: "Mon", classHours: 4.0, quizHours: 1.5, selfHours: 1.5 },
                { day: "Tue", dayName: "Tue", classHours: 4.5, quizHours: 1.0, selfHours: 2.0 },
                { day: "Wed", classHours: 3.0, quizHours: 1.5, selfHours: 1.5 },
                { day: "Thu", classHours: 4.0, quizHours: 1.5, selfHours: 1.5 },
                { day: "Fri", classHours: 3.5, quizHours: 2.0, selfHours: 1.0 },
                { day: "Sat", classHours: 2.5, quizHours: 1.0, selfHours: 1.0 },
                { day: "Sun", classHours: 1.5, quizHours: 0.5, selfHours: 1.0 }
            ]
        },
        "Monthly Average": {
            hoursSummary: "17.5 Hours",
            caption: "Weekly Average",
            target: "88% Rate",
            modules: "16 Modules",
            chart: [
                { day: "Mon", classHours: 3.8, quizHours: 1.4, selfHours: 1.2 },
                { day: "Tue", classHours: 4.2, quizHours: 1.1, selfHours: 1.6 },
                { day: "Wed", classHours: 2.8, quizHours: 1.8, selfHours: 1.2 },
                { day: "Thu", classHours: 4.3, quizHours: 1.2, selfHours: 1.8 },
                { day: "Fri", classHours: 3.2, quizHours: 1.6, selfHours: 1.4 },
                { day: "Sat", classHours: 2.2, quizHours: 0.9, selfHours: 0.8 },
                { day: "Sun", classHours: 1.2, quizHours: 0.6, selfHours: 1.2 }
            ]
        }
    };

    const currentActivity = activityDatasets[activityFilter] || activityDatasets["This Week"];

    // Dynamic Performance Datasets
    const performanceDatasets = {
        "Last 6 Months": {
            overallScore: data?.performance?.overallScore || 80,
            delta: "+3.4%",
            participation: data?.performance?.participation || 85,
            quizScore: 78,
            examScore: 88,
            absence: 15,
            monthlyTrend: [
                { month: "Jan", score: 72 },
                { month: "Feb", score: 76 },
                { month: "Mar", score: 79 },
                { month: "Apr", score: 81 },
                { month: "May", score: 84 },
                { month: "Jun", score: 88 }
            ],
            svgPath: "M 0,60 Q 50,45 100,40 T 200,28 T 300,15",
            svgArea: "M 0,60 Q 50,45 100,40 T 200,28 T 300,15 L 300,80 L 0,80 Z",
            tooltipX: "right-8",
            quote: data?.performance?.quote || "Success is the sum of small efforts, repeated day in and day out."
        },
        "Last 3 Months": {
            overallScore: 84,
            delta: "+4.2%",
            participation: 90,
            quizScore: 82,
            examScore: 91,
            absence: 10,
            monthlyTrend: [
                { month: "Apr", score: 81 },
                { month: "May", score: 84 },
                { month: "Jun", score: 88 }
            ],
            svgPath: "M 0,55 Q 75,35 150,30 T 300,12",
            svgArea: "M 0,55 Q 75,35 150,30 T 300,12 L 300,80 L 0,80 Z",
            tooltipX: "right-10",
            quote: "Focus on progress, not perfection. Every challenge is a stepping stone."
        },
        "Academic Year": {
            overallScore: 82,
            delta: "+5.1%",
            participation: 88,
            quizScore: 80,
            examScore: 89,
            absence: 12,
            monthlyTrend: [
                { month: "Term 1", score: 74 },
                { month: "Midterm", score: 79 },
                { month: "Term 2", score: 83 },
                { month: "Finals", score: 88 }
            ],
            svgPath: "M 0,65 Q 60,50 120,42 T 240,24 T 300,10",
            svgArea: "M 0,65 Q 60,50 120,42 T 240,24 T 300,10 L 300,80 L 0,80 Z",
            tooltipX: "right-8",
            quote: "Consistent discipline outlasts temporary motivation every time."
        }
    };

    const currentPerformance = performanceDatasets[performanceFilter] || performanceDatasets["Last 6 Months"];

    // Enrolled Courses Data
    const enrolledCourses = (data?.enrolledCourses && data.enrolledCourses.length > 0)
        ? data.enrolledCourses
        : [
            {
                id: "c1",
                title: "Advanced Mathematics & Calculus",
                code: "MATH-101",
                category: "Core STEM",
                lessons: 24,
                durationHours: 36,
                progress: 80,
                status: "Ongoing",
                score: 84,
                certificate: "In Progress"
            },
            {
                id: "c2",
                title: "Physics & Mechanics",
                code: "PHYS-201",
                category: "Core Science",
                lessons: 18,
                durationHours: 28,
                progress: 100,
                status: "Completed",
                score: 92,
                certificate: "Olympiad"
            },
            {
                id: "c3",
                title: "English Literature & Composition",
                code: "ENG-104",
                category: "Humanities",
                lessons: 15,
                durationHours: 22,
                progress: 65,
                status: "Ongoing",
                score: 76,
                certificate: "In Progress"
            }
        ];

    // Filter courses based on search & status
    const filteredCourses = enrolledCourses.filter(course => {
        const matchesSearch = course.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
            course.category.toLowerCase().includes(courseSearch.toLowerCase()) ||
            course.code.toLowerCase().includes(courseSearch.toLowerCase());
        const matchesStatus = courseStatusFilter === "All" || course.status === courseStatusFilter;
        return matchesSearch && matchesStatus;
    });

    // Gauge geometry calculation for semi-circle (radius 50, arc length = PI * 50 = ~157)
    const gaugeScore = Math.min(100, Math.max(0, currentPerformance.overallScore));

    return (
        <div className="space-y-6 select-text pb-6">
            
            {/* Top Asymmetric 3-Column Grid (Adtech: ~25% Profile | ~40% Activity | ~35% Performance) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* 1. Student Profile Card (~25% width on desktop) */}
                <div className="lg:col-span-3 rounded-[16px] border border-[#E9E8F0] bg-white overflow-hidden shadow-none">
                    
                    {/* Header Tint Block (Adtech Spec: Solid light lavender #E7E1FA, rounded top only) */}
                    <div className="bg-[#E7E1FA] pt-6 pb-4 px-4 flex flex-col items-center justify-center relative">
                        {/* Circular Avatar with crisp 3px white ring */}
                        <Link
                            href="/student/settings"
                            className="w-[72px] h-[72px] rounded-full border-[3px] border-white bg-white overflow-hidden shadow-none shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                            title="Edit Profile Photo"
                        >
                            {profile.avatar ? (
                                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-[#6E5AE0] flex items-center justify-center text-white font-bold text-xl">
                                    {profile.name.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                        </Link>
                    </div>

                    {/* White Body */}
                    <div className="p-4 sm:p-5 space-y-4">
                        
                        {/* Status Badges Row (STU-005 lavender pill + Active coral pill) */}
                        <div className="flex items-center justify-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#EDE8FB] text-[#6E5AE0] text-[11px] font-semibold tracking-tight">
                                {profile.enrollmentNumber}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-[#FBE3E6] text-[#F4586A] text-[11px] font-semibold tracking-tight">
                                {profile.status}
                            </span>
                        </div>

                        {/* Name & Subtitle */}
                        <div className="text-center">
                            <h2 className="text-[17px] font-bold text-[#1E1B2E] leading-tight">
                                {profile.name}
                            </h2>
                            <p className="text-[12px] text-[#8D8A9B] mt-0.5">
                                {profile.courseName}
                            </p>
                        </div>

                        {/* Action Buttons: Phone & Mail Ghost Circles + Chat Pill */}
                        <div className="flex items-center justify-center gap-2 pt-1 pb-2">
                            <a
                                href={`tel:${profile.phone}`}
                                className="w-8 h-8 rounded-full border border-[#E9E8F0] flex items-center justify-center text-[#8D8A9B] hover:text-[#1E1B2E] hover:border-[#8D8A9B] transition-colors cursor-pointer"
                                title={`Call: ${profile.phone}`}
                            >
                                <Phone size={14} />
                            </a>
                            <a
                                href={`mailto:${profile.email}`}
                                className="w-8 h-8 rounded-full border border-[#E9E8F0] flex items-center justify-center text-[#8D8A9B] hover:text-[#1E1B2E] hover:border-[#8D8A9B] transition-colors cursor-pointer"
                                title={`Email: ${profile.email}`}
                            >
                                <Mail size={14} />
                            </a>
                            <Link
                                href="/student/chat"
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EDE8FB] text-[#6E5AE0] text-[12px] font-semibold hover:bg-[#dfd7f9] transition-colors cursor-pointer"
                            >
                                <MessageSquare size={13} />
                                <span>Chat</span>
                            </Link>
                        </div>

                        {/* Contact Section (Square tinted icons + label/value pairs, no dividers) */}
                        <div className="pt-2">
                            <h3 className="text-[13px] font-bold text-[#1E1B2E] mb-3">Contact</h3>
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-[8px] bg-[#F1EFFB] flex items-center justify-center text-[#6E5AE0] shrink-0 mt-0.5">
                                        <Mail size={13} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] text-[#8D8A9B] leading-none">Email</p>
                                        <a href={`mailto:${profile.email}`} className="text-[12px] font-medium text-[#1E1B2E] hover:text-[#6E5AE0] leading-tight truncate block mt-0.5">
                                            {profile.email}
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-[8px] bg-[#F1EFFB] flex items-center justify-center text-[#6E5AE0] shrink-0 mt-0.5">
                                        <Phone size={13} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] text-[#8D8A9B] leading-none">Phone Number</p>
                                        <a href={`tel:${profile.phone}`} className="text-[12px] font-medium text-[#1E1B2E] hover:text-[#6E5AE0] leading-tight block mt-0.5">
                                            {profile.phone}
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-[8px] bg-[#F1EFFB] flex items-center justify-center text-[#6E5AE0] shrink-0 mt-0.5">
                                        <MapPin size={13} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] text-[#8D8A9B] leading-none">Address</p>
                                        <p className="text-[12px] font-medium text-[#1E1B2E] leading-tight line-clamp-2 mt-0.5">
                                            {profile.address}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Awards & Recognisations Section (Unboxed plain list) */}
                        <div className="pt-2">
                            <h3 className="text-[13px] font-bold text-[#1E1B2E] mb-2.5">Awards & Recognisations</h3>
                            <div className="space-y-2">
                                {profile.awards.map((award) => (
                                    <Link
                                        key={award.id}
                                        href="/student/timeline"
                                        className="flex items-center gap-2 text-[12px] text-[#1E1B2E] hover:text-[#6E5AE0] transition-colors group cursor-pointer"
                                    >
                                        <Award size={14} className="text-[#8D8A9B] group-hover:text-[#6E5AE0] shrink-0" />
                                        <span className="truncate">{award.title}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Footer Edit Profile Button */}
                        <div className="pt-3">
                            <Link
                                href="/student/settings"
                                className="w-full py-2 px-4 rounded-full border border-[#E9E8F0] bg-white text-[#1E1B2E] text-[12px] font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Edit3 size={13} className="text-[#8D8A9B]" />
                                Edit Profile
                            </Link>
                        </div>
                    </div>
                </div>

                {/* 2. "Learning Activity" Card (~40% width on desktop) */}
                <div className="lg:col-span-5 rounded-[16px] border border-[#E9E8F0] bg-white p-5 lg:p-6 shadow-none flex flex-col justify-between h-full min-h-[480px]">
                    
                    {/* Header */}
                    <div>
                        <div className="flex items-center justify-between mb-6 relative">
                            <h3 className="text-[15px] font-bold text-[#1E1B2E]">Learning Activity</h3>
                            
                            <div className="flex items-center gap-2">
                                {/* Interactive Dropdown Pill */}
                                <div className="relative">
                                    <select
                                        value={activityFilter}
                                        onChange={(e) => setActivityFilter(e.target.value)}
                                        className="h-7 pl-3 pr-6 text-[12px] text-[#8D8A9B] hover:text-[#1E1B2E] bg-white border border-[#E9E8F0] rounded-full focus:outline-none focus:border-[#6E5AE0] appearance-none cursor-pointer font-medium"
                                    >
                                        <option value="This Week">This Week</option>
                                        <option value="Last Week">Last Week</option>
                                        <option value="Monthly Average">Monthly Average</option>
                                    </select>
                                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8D8A9B] pointer-events-none" />
                                </div>

                                {/* Kebab Menu with floating quick actions */}
                                <div className="relative" ref={kebabRef}>
                                    <button
                                        onClick={() => setIsKebabOpen(!isKebabOpen)}
                                        className="text-[#8D8A9B] hover:text-[#1E1B2E] p-1.5 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                                        title="Activity Actions"
                                    >
                                        <MoreHorizontal size={16} />
                                    </button>

                                    <AnimatePresence>
                                        {isKebabOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                                className="absolute right-0 top-8 w-48 bg-white border border-[#E9E8F0] rounded-[12px] shadow-lg py-1.5 z-30 space-y-0.5"
                                            >
                                                <Link
                                                    href="/student/attendance"
                                                    className="flex items-center gap-2 px-3 py-2 text-[12px] text-[#1E1B2E] hover:bg-[#F1EFFB] hover:text-[#6E5AE0] transition-colors"
                                                    onClick={() => setIsKebabOpen(false)}
                                                >
                                                    <Calendar size={13} />
                                                    Detailed Attendance
                                                </Link>
                                                <Link
                                                    href="/student/timetable"
                                                    className="flex items-center gap-2 px-3 py-2 text-[12px] text-[#1E1B2E] hover:bg-[#F1EFFB] hover:text-[#6E5AE0] transition-colors"
                                                    onClick={() => setIsKebabOpen(false)}
                                                >
                                                    <Clock size={13} />
                                                    Weekly Timetable
                                                </Link>
                                                <Link
                                                    href="/student/materials"
                                                    className="flex items-center gap-2 px-3 py-2 text-[12px] text-[#1E1B2E] hover:bg-[#F1EFFB] hover:text-[#6E5AE0] transition-colors"
                                                    onClick={() => setIsKebabOpen(false)}
                                                >
                                                    <FileText size={13} />
                                                    Study Materials
                                                </Link>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        {/* Stacked Bar Chart (Adtech Spec: unboxed, floats on white card, 3 colored segments) */}
                        <div className="pt-2 pb-4">
                            {/* Y-axis ticks and plot container */}
                            <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 relative px-2">
                                
                                {/* Faint Baseline */}
                                <div className="absolute bottom-6 left-0 right-0 h-[1px] bg-[#E9E8F0]" />

                                {currentActivity.chart.map((item) => {
                                    // Total hours max scale = 8 hours
                                    const maxHeightPx = 180;
                                    const classPx = (item.classHours / 8) * maxHeightPx;
                                    const quizPx = (item.quizHours / 8) * maxHeightPx;
                                    const selfPx = (item.selfHours / 8) * maxHeightPx;

                                    return (
                                        <div key={item.day} className="flex-1 flex flex-col items-center justify-end h-full z-10 group cursor-default">
                                            {/* Stacked Bar Column */}
                                            <div className="w-5 sm:w-7 flex flex-col justify-end">
                                                {/* Top Segment: Coral (Self Study) */}
                                                <div
                                                    style={{ height: `${selfPx}px` }}
                                                    className="w-full bg-[#F4586A] rounded-t-[4px] transition-all group-hover:brightness-95"
                                                    title={`${item.day} Self-study: ${item.selfHours}h`}
                                                />
                                                {/* Middle Segment: Gold (Quiz) */}
                                                <div
                                                    style={{ height: `${quizPx}px` }}
                                                    className="w-full bg-[#F4C24A] transition-all group-hover:brightness-95"
                                                    title={`${item.day} Quiz/Lab: ${item.quizHours}h`}
                                                />
                                                {/* Bottom Segment: Indigo (Class) */}
                                                <div
                                                    style={{ height: `${classPx}px` }}
                                                    className="w-full bg-[#6E5AE0] transition-all group-hover:brightness-95"
                                                    title={`${item.day} Class Lecture: ${item.classHours}h`}
                                                />
                                            </div>

                                            {/* X-axis day label */}
                                            <span className="text-[11px] font-medium text-[#8D8A9B] mt-2 group-hover:text-[#1E1B2E] transition-colors">
                                                {item.day}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Chart Legend */}
                            <div className="flex items-center justify-center gap-5 mt-4 pt-2 border-t border-[#E9E8F0]/50 text-[11px] text-[#8D8A9B]">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#6E5AE0]" />
                                    <span>Class ({currentActivity.chart.reduce((acc, c) => acc + c.classHours, 0).toFixed(1)}h)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#F4C24A]" />
                                    <span>Quizzes ({currentActivity.chart.reduce((acc, c) => acc + c.quizHours, 0).toFixed(1)}h)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#F4586A]" />
                                    <span>Self-study ({currentActivity.chart.reduce((acc, c) => acc + c.selfHours, 0).toFixed(1)}h)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Metric Summary Row (Adtech Spec: 3 stat blocks separated by thin vertical hairline dividers) */}
                    <div className="grid grid-cols-3 border-t border-[#E9E8F0] pt-4 mt-2">
                        <div className="pr-3">
                            <p className="text-[17px] font-bold text-[#1E1B2E] leading-none">{currentActivity.hoursSummary}</p>
                            <p className="text-[11px] text-[#8D8A9B] mt-1 truncate">{currentActivity.caption}</p>
                        </div>
                        <div className="px-3 border-l border-[#E9E8F0]">
                            <p className="text-[17px] font-bold text-[#1E1B2E] leading-none">{currentActivity.target}</p>
                            <p className="text-[11px] text-[#8D8A9B] mt-1 truncate">Attendance Target</p>
                        </div>
                        <div className="pl-3 border-l border-[#E9E8F0]">
                            <p className="text-[17px] font-bold text-[#1E1B2E] leading-none">{currentActivity.modules}</p>
                            <p className="text-[11px] text-[#8D8A9B] mt-1 truncate">Completed This Term</p>
                        </div>
                    </div>
                </div>

                {/* 3. "Performance" Card (~35% width on desktop) */}
                <div className="lg:col-span-4 rounded-[16px] border border-[#E9E8F0] bg-white p-5 lg:p-6 shadow-none flex flex-col justify-between h-full min-h-[480px]">
                    
                    <div>
                        {/* Header with Interactive Filter Pill */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[15px] font-bold text-[#1E1B2E]">Performance</h3>
                            
                            <div className="relative">
                                <select
                                    value={performanceFilter}
                                    onChange={(e) => setPerformanceFilter(e.target.value)}
                                    className="h-7 pl-3 pr-6 text-[12px] text-[#8D8A9B] hover:text-[#1E1B2E] bg-white border border-[#E9E8F0] rounded-full focus:outline-none focus:border-[#6E5AE0] appearance-none cursor-pointer font-medium"
                                >
                                    <option value="Last 6 Months">Last 6 Months</option>
                                    <option value="Last 3 Months">Last 3 Months</option>
                                    <option value="Academic Year">Academic Year</option>
                                </select>
                                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8D8A9B] pointer-events-none" />
                            </div>
                        </div>

                        {/* Semi-Circular Score Gauge & Legend */}
                        <div className="flex items-center justify-between gap-4 py-2">
                            {/* Semi-circular gauge SVG */}
                            <div className="relative w-32 h-20 flex flex-col items-center justify-end shrink-0">
                                <svg className="w-32 h-20 overflow-visible" viewBox="0 0 120 70">
                                    {/* Track background */}
                                    <path
                                        d="M 10,65 A 50,50 0 0,1 110,65"
                                        fill="none"
                                        stroke="#E9E8F0"
                                        strokeWidth="10"
                                        strokeLinecap="round"
                                    />
                                    {/* Colored active arc */}
                                    <path
                                        d="M 10,65 A 50,50 0 0,1 110,65"
                                        fill="none"
                                        stroke="url(#performanceGrad)"
                                        strokeWidth="10"
                                        strokeLinecap="round"
                                        strokeDasharray="157"
                                        strokeDashoffset={157 * (1 - gaugeScore / 100)}
                                    />
                                    <defs>
                                        <linearGradient id="performanceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#33C481" />
                                            <stop offset="60%" stopColor="#F4C24A" />
                                            <stop offset="100%" stopColor="#6E5AE0" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute bottom-0 flex flex-col items-center">
                                    <span className="text-[20px] font-bold text-[#1E1B2E] leading-none">
                                        {gaugeScore}%
                                    </span>
                                    <span className="text-[10px] text-[#8D8A9B] mt-0.5">Total Score</span>
                                </div>
                            </div>

                            {/* Legend List */}
                            <div className="space-y-1.5 flex-1 pr-1">
                                <div className="flex items-center justify-between text-[12px]">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#6E5AE0]" />
                                        <span className="text-[#8D8A9B]">Participation</span>
                                    </div>
                                    <span className="font-semibold text-[#1E1B2E]">{currentPerformance.participation}%</span>
                                </div>
                                <div className="flex items-center justify-between text-[12px]">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#F4C24A]" />
                                        <span className="text-[#8D8A9B]">Class Quiz</span>
                                    </div>
                                    <span className="font-semibold text-[#1E1B2E]">{currentPerformance.quizScore}%</span>
                                </div>
                                <div className="flex items-center justify-between text-[12px]">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#F4586A]" />
                                        <span className="text-[#8D8A9B]">Exam Marks</span>
                                    </div>
                                    <span className="font-semibold text-[#1E1B2E]">{currentPerformance.examScore}%</span>
                                </div>
                                <div className="flex items-center justify-between text-[12px]">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#8D8A9B]/40" />
                                        <span className="text-[#8D8A9B]">Absence</span>
                                    </div>
                                    <span className="font-semibold text-[#1E1B2E]">{currentPerformance.absence}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Trend Area Chart with Floating Tooltip Callout */}
                        <div className="relative pt-3 pb-1">
                            <div className="h-28 w-full relative">
                                <svg className="w-full h-24 overflow-visible" preserveAspectRatio="none" viewBox="0 0 300 80">
                                    <defs>
                                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#6E5AE0" stopOpacity="0.25" />
                                            <stop offset="100%" stopColor="#6E5AE0" stopOpacity="0.0" />
                                        </linearGradient>
                                    </defs>
                                    {/* Area fill */}
                                    <path
                                        d={currentPerformance.svgArea}
                                        fill="url(#trendGradient)"
                                    />
                                    {/* Line stroke */}
                                    <path
                                        d={currentPerformance.svgPath}
                                        fill="none"
                                        stroke="#6E5AE0"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                    />
                                </svg>

                                {/* Floating Tooltip (Adtech Spec: The ONE legitimate shadow use case on the page) */}
                                <div className={cn("absolute top-2 bg-white border border-[#E9E8F0] shadow-md rounded-[8px] px-2.5 py-1 text-center pointer-events-none transition-all", currentPerformance.tooltipX)}>
                                    <p className="text-[11px] font-bold text-[#1E1B2E] leading-none flex items-center gap-1">
                                        {currentPerformance.overallScore}%
                                        <span className="text-[#33C481] text-[10px] font-medium">{currentPerformance.delta}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Month labels along bottom */}
                            <div className="flex items-center justify-between text-[11px] text-[#8D8A9B] px-1">
                                {currentPerformance.monthlyTrend.map((m) => (
                                    <span key={m.month}>{m.month}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Motivational Quote Banner (Adtech Spec: The ONE deliberate flat pale-yellow #FCF3D6 highlight strip) */}
                    <div className="bg-[#FCF3D6] rounded-[10px] p-3 text-[12px] font-medium text-[#1E1B2E] leading-snug mt-3">
                        &ldquo;{currentPerformance.quote}&rdquo; 🌟
                    </div>
                </div>
            </div>

            {/* Bottom Full-Width "Enrolled Courses" Card (Adtech Spec: Hairline dividers, progress rings, status pills) */}
            <div className="rounded-[16px] border border-[#E9E8F0] bg-white p-5 lg:p-6 shadow-none">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9E8F0]">
                    <div>
                        <h3 className="text-[15px] font-bold text-[#1E1B2E]">Enrolled Courses</h3>
                        <p className="text-[12px] text-[#8D8A9B]">Subject progression and continuous grading</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Course Search Pill */}
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D8A9B]" />
                            <input
                                type="text"
                                value={courseSearch}
                                onChange={(e) => setCourseSearch(e.target.value)}
                                placeholder="Search course, category, etc"
                                className="w-44 sm:w-56 h-8 pl-8 pr-3 text-[12px] text-[#1E1B2E] placeholder:text-[#8D8A9B] bg-white border border-[#E9E8F0] rounded-full focus:outline-none focus:border-[#6E5AE0]"
                            />
                        </div>

                        {/* Status Filter Dropdown Pill */}
                        <div className="relative">
                            <select
                                value={courseStatusFilter}
                                onChange={(e) => setCourseStatusFilter(e.target.value)}
                                className="h-8 pl-3 pr-7 text-[12px] text-[#1E1B2E] bg-white border border-[#E9E8F0] rounded-full focus:outline-none appearance-none cursor-pointer"
                            >
                                <option value="All">All Status</option>
                                <option value="Ongoing">Ongoing</option>
                                <option value="Completed">Completed</option>
                            </select>
                            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8D8A9B] pointer-events-none" />
                        </div>

                        {/* View All Primary Pill */}
                        <Link
                            href="/student/batches"
                            className="h-8 px-4 rounded-full bg-[#6E5AE0] text-white text-[12px] font-medium hover:bg-[#5946cb] transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                        >
                            View All
                        </Link>
                    </div>
                </div>

                {/* Course Rows List (Hairline separated, clickable rows linking to batches/syllabus) */}
                <div className="divide-y divide-[#E9E8F0]">
                    {filteredCourses.map((course) => {
                        const isCompleted = course.status === "Completed";
                        return (
                            <div
                                key={course.id}
                                onClick={() => router.push("/student/batches")}
                                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:bg-slate-50/70 px-2 rounded-[8px] cursor-pointer group"
                                title="Click to view course details and syllabus"
                            >
                                {/* Left: Subject Thumbnail + Title Block */}
                                <div className="flex items-center gap-3.5 min-w-[240px]">
                                    <div className="w-10 h-10 rounded-[8px] bg-[#F1EFFB] flex items-center justify-center text-[#6E5AE0] group-hover:scale-105 transition-transform shrink-0">
                                        <BookOpen size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-[13px] font-bold text-[#1E1B2E] leading-tight truncate group-hover:text-[#6E5AE0] transition-colors">
                                            {course.title}
                                        </h4>
                                        <p className="text-[11px] text-[#8D8A9B] mt-0.5 truncate">
                                            {course.category} • {course.code}
                                        </p>
                                    </div>
                                </div>

                                {/* Meta Stats (Lessons & Duration) */}
                                <div className="flex items-center gap-4 text-[11px] text-[#8D8A9B]">
                                    <div className="flex items-center gap-1.5">
                                        <Layers size={13} className="text-[#8D8A9B]" />
                                        <span>{course.lessons} Lessons</span>
                                    </div>
                                    <span>•</span>
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={13} className="text-[#8D8A9B]" />
                                        <span>{course.durationHours}h Total</span>
                                    </div>
                                </div>

                                {/* Progress Ring + Percentage */}
                                <div className="flex items-center gap-3">
                                    <div className="relative w-7 h-7 flex items-center justify-center">
                                        <svg className="w-7 h-7 transform -rotate-90">
                                            <circle
                                                cx="14"
                                                cy="14"
                                                r="11"
                                                stroke="#E9E8F0"
                                                strokeWidth="2.5"
                                                fill="transparent"
                                            />
                                            <circle
                                                cx="14"
                                                cy="14"
                                                r="11"
                                                stroke={isCompleted ? "#33C481" : "#F4C24A"}
                                                strokeWidth="2.5"
                                                fill="transparent"
                                                strokeDasharray="69.1"
                                                strokeDashoffset={69.1 * (1 - course.progress / 100)}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                    </div>
                                    <span className="text-[13px] font-bold text-[#1E1B2E]">
                                        {course.progress}%
                                    </span>
                                </div>

                                {/* Status Pill */}
                                <div>
                                    <span className={cn(
                                        "px-3 py-0.5 rounded-full text-[11px] font-semibold tracking-tight",
                                        isCompleted
                                            ? "bg-[#E8F8F0] text-[#059669]"
                                            : "bg-[#FEF6E6] text-[#D97706]"
                                    )}>
                                        {course.status}
                                    </span>
                                </div>

                                {/* Score */}
                                <div className="text-right">
                                    <p className="text-[13px] font-bold text-[#1E1B2E] leading-none">
                                        {course.score}
                                        <span className="text-[11px] text-[#8D8A9B] font-normal">/100</span>
                                    </p>
                                    <p className="text-[10px] text-[#8D8A9B] mt-0.5">Average Grade</p>
                                </div>

                                {/* Certificate Tag */}
                                <div>
                                    {isCompleted ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#6E5AE0]/30 text-[#6E5AE0] text-[11px] font-semibold bg-[#EDE8FB]">
                                            <Trophy size={11} />
                                            {course.certificate}
                                        </span>
                                    ) : (
                                        <span className="text-[11px] text-[#8D8A9B]">
                                            In Progress
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {filteredCourses.length === 0 && (
                        <div className="py-10 text-center text-[#8D8A9B] text-[13px]">
                            No enrolled courses matching your search criteria.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
