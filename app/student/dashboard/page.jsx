"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
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
    AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Skeleton from "@/components/shared/Skeleton";

export default function StudentDashboard() {
    const { data: session } = useSession();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activityFilter, setActivityFilter] = useState("This Week");
    const [performanceFilter, setPerformanceFilter] = useState("Last 6 Months");
    const [courseSearch, setCourseSearch] = useState("");
    const [courseStatusFilter, setCourseStatusFilter] = useState("All");

    useEffect(() => {
        fetchDashboardData();
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

    // Fallback data structure if fields are empty
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

    const learningActivity = data?.learningActivity || [
        { day: "Mon", classHours: 3.5, quizHours: 1.5, selfHours: 1.0 },
        { day: "Tue", classHours: 4.0, quizHours: 1.0, selfHours: 1.5 },
        { day: "Wed", classHours: 2.5, quizHours: 2.0, selfHours: 1.0 },
        { day: "Thu", classHours: 4.5, quizHours: 1.0, selfHours: 2.0 },
        { day: "Fri", classHours: 3.0, quizHours: 1.5, selfHours: 1.5 },
        { day: "Sat", classHours: 2.0, quizHours: 1.0, selfHours: 0.5 },
        { day: "Sun", classHours: 1.0, quizHours: 0.5, selfHours: 1.5 }
    ];

    const performance = data?.performance || {
        overallScore: 80,
        participation: data?.attendance || 85,
        quizScore: 78,
        examScore: 88,
        monthlyTrend: [
            { month: "Jan", score: 72 },
            { month: "Feb", score: 76 },
            { month: "Mar", score: 79 },
            { month: "Apr", score: 81 },
            { month: "May", score: 84 },
            { month: "Jun", score: 88 }
        ],
        quote: "Success is the sum of small efforts, repeated day in and day out."
    };

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
            course.category.toLowerCase().includes(courseSearch.toLowerCase());
        const matchesStatus = courseStatusFilter === "All" || course.status === courseStatusFilter;
        return matchesSearch && matchesStatus;
    });

    // Gauge geometry calculation for semi-circle
    const gaugeScore = Math.min(100, Math.max(0, performance.overallScore));
    // Semi-circle arc: radius 54, circumference for 180 degrees = PI * 54 = ~169.6
    const arcCircumference = Math.PI * 54;
    const strokeDashoffset = arcCircumference * (1 - gaugeScore / 100);

    return (
        <div className="space-y-6 select-text pb-6">
            
            {/* Top Asymmetric 3-Column Grid (Adtech: ~25% Profile | ~40% Activity | ~35% Performance) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* 1. Student Profile Card (~25% width on desktop) */}
                <div className="lg:col-span-3 rounded-[16px] border border-[#E9E8F0] bg-white overflow-hidden shadow-none">
                    
                    {/* Header Tint Block (Adtech Spec: Solid light lavender #E7E1FA, rounded top only) */}
                    <div className="bg-[#E7E1FA] pt-6 pb-4 px-4 flex flex-col items-center justify-center relative">
                        {/* Circular Avatar with crisp 3px white ring */}
                        <div className="w-[72px] h-[72px] rounded-full border-[3px] border-white bg-white overflow-hidden shadow-none shrink-0">
                            {profile.avatar ? (
                                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-[#6E5AE0] flex items-center justify-center text-white font-bold text-xl">
                                    {profile.name.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                        </div>
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
                                className="w-8 h-8 rounded-full border border-[#E9E8F0] flex items-center justify-center text-[#8D8A9B] hover:text-[#1E1B2E] hover:border-[#8D8A9B] transition-colors"
                                title="Call"
                            >
                                <Phone size={14} />
                            </a>
                            <a
                                href={`mailto:${profile.email}`}
                                className="w-8 h-8 rounded-full border border-[#E9E8F0] flex items-center justify-center text-[#8D8A9B] hover:text-[#1E1B2E] hover:border-[#8D8A9B] transition-colors"
                                title="Email"
                            >
                                <Mail size={14} />
                            </a>
                            <Link
                                href="/student/chat"
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EDE8FB] text-[#6E5AE0] text-[12px] font-semibold hover:bg-[#dfd7f9] transition-colors"
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
                                        <p className="text-[12px] font-medium text-[#1E1B2E] leading-tight truncate mt-0.5">
                                            {profile.email}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-[8px] bg-[#F1EFFB] flex items-center justify-center text-[#6E5AE0] shrink-0 mt-0.5">
                                        <Phone size={13} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] text-[#8D8A9B] leading-none">Phone Number</p>
                                        <p className="text-[12px] font-medium text-[#1E1B2E] leading-tight mt-0.5">
                                            {profile.phone}
                                        </p>
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
                                    <div key={award.id} className="flex items-center gap-2 text-[12px] text-[#1E1B2E]">
                                        <Award size={14} className="text-[#8D8A9B] shrink-0" />
                                        <span className="truncate">{award.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer Edit Profile Button */}
                        <div className="pt-3">
                            <Link
                                href="/student/settings"
                                className="w-full py-2 px-4 rounded-full border border-[#E9E8F0] bg-white text-[#1E1B2E] text-[12px] font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
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
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[15px] font-bold text-[#1E1B2E]">Learning Activity</h3>
                            <div className="flex items-center gap-2">
                                <button className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#E9E8F0] text-[12px] text-[#8D8A9B] hover:text-[#1E1B2E] bg-white transition-colors">
                                    <span>{activityFilter}</span>
                                    <ChevronDown size={13} />
                                </button>
                                <button className="text-[#8D8A9B] hover:text-[#1E1B2E] p-1">
                                    <MoreHorizontal size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Stacked Bar Chart (Adtech Spec: unboxed, floats on white card, 3 colored segments) */}
                        <div className="pt-2 pb-4">
                            {/* Y-axis ticks and plot container */}
                            <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 relative px-2">
                                
                                {/* Faint Baseline */}
                                <div className="absolute bottom-6 left-0 right-0 h-[1px] bg-[#E9E8F0]" />

                                {learningActivity.map((item) => {
                                    // Total hours max scale = 8 hours
                                    const total = item.classHours + item.quizHours + item.selfHours;
                                    const maxHeightPx = 180;
                                    const classPx = (item.classHours / 8) * maxHeightPx;
                                    const quizPx = (item.quizHours / 8) * maxHeightPx;
                                    const selfPx = (item.selfHours / 8) * maxHeightPx;

                                    return (
                                        <div key={item.day} className="flex-1 flex flex-col items-center justify-end h-full z-10 group">
                                            {/* Stacked Bar Column */}
                                            <div className="w-5 sm:w-7 flex flex-col justify-end">
                                                {/* Top Segment: Coral (Self Study) */}
                                                <div
                                                    style={{ height: `${selfPx}px` }}
                                                    className="w-full bg-[#F4586A] rounded-t-[4px] transition-all group-hover:opacity-90"
                                                    title={`Self-study: ${item.selfHours}h`}
                                                />
                                                {/* Middle Segment: Gold (Quiz) */}
                                                <div
                                                    style={{ height: `${quizPx}px` }}
                                                    className="w-full bg-[#F4C24A] transition-all group-hover:opacity-90"
                                                    title={`Quiz/Lab: ${item.quizHours}h`}
                                                />
                                                {/* Bottom Segment: Indigo (Class) */}
                                                <div
                                                    style={{ height: `${classPx}px` }}
                                                    className="w-full bg-[#6E5AE0] transition-all group-hover:opacity-90"
                                                    title={`Class Lecture: ${item.classHours}h`}
                                                />
                                            </div>

                                            {/* X-axis day label */}
                                            <span className="text-[11px] font-medium text-[#8D8A9B] mt-2 group-hover:text-[#1E1B2E]">
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
                                    <span>Class ({learningActivity.reduce((acc, c) => acc + c.classHours, 0)}h)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#F4C24A]" />
                                    <span>Quizzes ({learningActivity.reduce((acc, c) => acc + c.quizHours, 0)}h)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#F4586A]" />
                                    <span>Self-study ({learningActivity.reduce((acc, c) => acc + c.selfHours, 0)}h)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Metric Summary Row (Adtech Spec: 3 stat blocks separated by thin vertical hairline dividers) */}
                    <div className="grid grid-cols-3 border-t border-[#E9E8F0] pt-4 mt-2">
                        <div className="pr-3">
                            <p className="text-[17px] font-bold text-[#1E1B2E] leading-none">16 Hours</p>
                            <p className="text-[11px] text-[#8D8A9B] mt-1 truncate">Total Weekly Study</p>
                        </div>
                        <div className="px-3 border-l border-[#E9E8F0]">
                            <p className="text-[17px] font-bold text-[#1E1B2E] leading-none">85% Rate</p>
                            <p className="text-[11px] text-[#8D8A9B] mt-1 truncate">Attendance Target</p>
                        </div>
                        <div className="pl-3 border-l border-[#E9E8F0]">
                            <p className="text-[17px] font-bold text-[#1E1B2E] leading-none">4 Modules</p>
                            <p className="text-[11px] text-[#8D8A9B] mt-1 truncate">Completed This Term</p>
                        </div>
                    </div>
                </div>

                {/* 3. "Performance" Card (~35% width on desktop) */}
                <div className="lg:col-span-4 rounded-[16px] border border-[#E9E8F0] bg-white p-5 lg:p-6 shadow-none flex flex-col justify-between h-full min-h-[480px]">
                    
                    <div>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[15px] font-bold text-[#1E1B2E]">Performance</h3>
                            <button className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#E9E8F0] text-[12px] text-[#8D8A9B] hover:text-[#1E1B2E] bg-white transition-colors">
                                <span>{performanceFilter}</span>
                                <ChevronDown size={13} />
                            </button>
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
                                    <span className="font-semibold text-[#1E1B2E]">{performance.participation}%</span>
                                </div>
                                <div className="flex items-center justify-between text-[12px]">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#F4C24A]" />
                                        <span className="text-[#8D8A9B]">Class Quiz</span>
                                    </div>
                                    <span className="font-semibold text-[#1E1B2E]">{performance.quizScore}%</span>
                                </div>
                                <div className="flex items-center justify-between text-[12px]">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#F4586A]" />
                                        <span className="text-[#8D8A9B]">Exam Marks</span>
                                    </div>
                                    <span className="font-semibold text-[#1E1B2E]">{performance.examScore}%</span>
                                </div>
                                <div className="flex items-center justify-between text-[12px]">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#8D8A9B]/40" />
                                        <span className="text-[#8D8A9B]">Absence</span>
                                    </div>
                                    <span className="font-semibold text-[#1E1B2E]">{Math.max(0, 100 - performance.participation)}%</span>
                                </div>
                            </div>
                        </div>

                        {/* 6-Month Trend Area Chart with Floating Tooltip Callout */}
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
                                        d="M 0,60 Q 50,45 100,40 T 200,28 T 300,15 L 300,80 L 0,80 Z"
                                        fill="url(#trendGradient)"
                                    />
                                    {/* Line stroke */}
                                    <path
                                        d="M 0,60 Q 50,45 100,40 T 200,28 T 300,15"
                                        fill="none"
                                        stroke="#6E5AE0"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                    />
                                </svg>

                                {/* Floating Tooltip (Adtech Spec: The ONE legitimate shadow use case on the page) */}
                                <div className="absolute top-2 right-8 bg-white border border-[#E9E8F0] shadow-md rounded-[8px] px-2.5 py-1 text-center pointer-events-none">
                                    <p className="text-[11px] font-bold text-[#1E1B2E] leading-none flex items-center gap-1">
                                        {performance.overallScore}%
                                        <span className="text-[#33C481] text-[10px] font-medium">+3.4%</span>
                                    </p>
                                </div>
                            </div>

                            {/* Month labels along bottom */}
                            <div className="flex items-center justify-between text-[11px] text-[#8D8A9B] px-1">
                                {performance.monthlyTrend.map((m) => (
                                    <span key={m.month}>{m.month}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Motivational Quote Banner (Adtech Spec: The ONE deliberate flat pale-yellow #FCF3D6 highlight strip) */}
                    <div className="bg-[#FCF3D6] rounded-[10px] p-3 text-[12px] font-medium text-[#1E1B2E] leading-snug mt-3">
                        &ldquo;{performance.quote}&rdquo; 🌟
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
                            className="h-8 px-4 rounded-full bg-[#6E5AE0] text-white text-[12px] font-medium hover:bg-[#5946cb] transition-colors flex items-center justify-center shrink-0"
                        >
                            View All
                        </Link>
                    </div>
                </div>

                {/* Course Rows List (Hairline separated, no per-row cards) */}
                <div className="divide-y divide-[#E9E8F0]">
                    {filteredCourses.map((course) => {
                        const isCompleted = course.status === "Completed";
                        return (
                            <div
                                key={course.id}
                                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:bg-slate-50/50 px-2 rounded-[8px]"
                            >
                                {/* Left: Subject Thumbnail + Title Block */}
                                <div className="flex items-center gap-3.5 min-w-[240px]">
                                    <div className="w-10 h-10 rounded-[8px] bg-[#F1EFFB] flex items-center justify-center text-[#6E5AE0] shrink-0">
                                        <BookOpen size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-[13px] font-bold text-[#1E1B2E] leading-tight truncate">
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
