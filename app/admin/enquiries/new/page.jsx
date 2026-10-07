"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    ArrowLeft, Save, Loader2, Calendar, User, 
    GraduationCap, Clock
} from "lucide-react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";

export default function NewEnquiryPage() {
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState([]);

    const getFutureDate = (days) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split("T")[0];
    };

    // Form State with Smart Defaults
    const [formData, setFormData] = useState({
        studentName: "",
        fatherName: "",
        fatherAadhar: "",
        motherName: "",
        motherAadhar: "",
        studentAadhar: "",
        contactNumber: "",
        standard: "",
        course: "",
        address: "",
        enquiryDate: new Date().toISOString().split("T")[0],
        expectedConfirmationDate: getFutureDate(7), // +7 days auto
        followUpDate: getFutureDate(2),           // +2 days auto
        notes: "",
        referredBy: ""
    });

    useEffect(() => {
        fetchCourses();
    }, []);

    // ⌘S / Ctrl+S quick save
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.code === "KeyS")) {
                e.preventDefault();
                handleSubmit(e);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [formData]);

    const fetchCourses = async () => {
        try {
            const res = await fetch("/api/v1/courses");
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data.courses || []);
                setCourses(list.map(c => ({ label: `${c.name} (${c.code})`, value: c._id })));
            }
        } catch (error) {
            console.error("Failed to fetch courses", error);
            toast.error("Failed to load courses");
            setCourses([]);
        }
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!formData.studentName.trim()) {
            toast.error("Please enter student name");
            return;
        }
        if (!formData.contactNumber.trim()) {
            toast.error("Please enter contact number");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/v1/enquiries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success("Enquiry created successfully");
                router.push("/admin/enquiries");
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to create enquiry");
            }
        } catch (err) {
            toast.error("Failed to create enquiry");
        } finally {
            setLoading(false);
        }
    };

    const followUpPresets = [
        { label: "Tomorrow", days: 1 },
        { label: "+2 Days", days: 2 },
        { label: "+5 Days", days: 5 },
        { label: "+1 Week", days: 7 },
    ];

    return (
        <motion.div 
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-6xl mx-auto space-y-6 pb-24"
        >
            {/* Page Header */}
            <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-3.5">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs active:scale-95 transition-all duration-150 cursor-pointer"
                        title="Go back"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                                New Admission Enquiry
                            </h1>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                                Enquiry Form
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Record prospective student inquiries, contact info, and follow-up tracking.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 2-COLUMN FLOW */}
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">
                    
                    {/* LEFT COLUMN: Primary Details */}
                    <div className="space-y-6">
                        {/* Student Information */}
                        <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-5 transition-shadow hover:shadow-sm">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <User size={15} />
                                    </div>
                                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                        Student Information
                                    </h2>
                                </div>
                                <span className="text-[11px] font-medium text-slate-400">
                                    * Required fields
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Student Name *"
                                    placeholder="Enter full name"
                                    value={formData.studentName}
                                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                                    required
                                    autoFocus
                                />
                                <Input
                                    label="Contact Number *"
                                    placeholder="10-digit mobile number"
                                    value={formData.contactNumber}
                                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Father's Name"
                                    placeholder="Enter father's name"
                                    value={formData.fatherName}
                                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                                />
                                <Input
                                    label="Father's Aadhar"
                                    placeholder="12-digit number"
                                    value={formData.fatherAadhar}
                                    onChange={(e) => setFormData({ ...formData, fatherAadhar: e.target.value })}
                                />
                                <Input
                                    label="Mother's Name"
                                    placeholder="Enter mother's name"
                                    value={formData.motherName}
                                    onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                                />
                                <Input
                                    label="Mother's Aadhar"
                                    placeholder="12-digit number"
                                    value={formData.motherAadhar}
                                    onChange={(e) => setFormData({ ...formData, motherAadhar: e.target.value })}
                                />
                                <Input
                                    label="Student Aadhar"
                                    placeholder="12-digit number"
                                    value={formData.studentAadhar}
                                    onChange={(e) => setFormData({ ...formData, studentAadhar: e.target.value })}
                                />
                                <Input
                                    label="Standard / Class"
                                    placeholder="e.g. 10th, 12th, or Degree"
                                    value={formData.standard}
                                    onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                                />
                                <Input
                                    label="Referred By"
                                    placeholder="Name of person or source"
                                    value={formData.referredBy}
                                    onChange={(e) => setFormData({ ...formData, referredBy: e.target.value })}
                                />
                                <Input
                                    label="Residential Address"
                                    placeholder="Enter residential address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Course Enrollment Card */}
                        <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4 transition-shadow hover:shadow-sm">
                            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <GraduationCap size={15} />
                                </div>
                                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                    Course Interested In
                                </h2>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                                    Select Target Course
                                </label>
                                <Select
                                    value={formData.course}
                                    onChange={(val) => setFormData({ ...formData, course: val })}
                                    options={courses}
                                    placeholder="Select a course from catalog..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Follow-up & Confirmation */}
                    <div className="space-y-6">
                        <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-5 transition-shadow hover:shadow-sm">
                            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <Clock size={15} />
                                </div>
                                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                    Tracking & Follow-up
                                </h2>
                            </div>

                            <div className="space-y-4">
                                <Input
                                    label="Enquiry Date *"
                                    type="date"
                                    suffix={<Calendar size={14} className="text-slate-400 pointer-events-none" />}
                                    value={formData.enquiryDate}
                                    onChange={(e) => setFormData({ ...formData, enquiryDate: e.target.value })}
                                    required
                                />

                                <div>
                                    <Input
                                        label="Next Follow-up Date"
                                        type="date"
                                        suffix={<Calendar size={14} className="text-slate-400 pointer-events-none" />}
                                        value={formData.followUpDate}
                                        onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                                    />
                                    {/* Quick Preset Chips */}
                                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                        <span className="text-[10px] font-semibold text-slate-400 mr-1">Quick:</span>
                                        {followUpPresets.map(preset => {
                                            const targetD = getFutureDate(preset.days);
                                            const isSelected = formData.followUpDate === targetD;
                                            return (
                                                <button
                                                    key={preset.label}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, followUpDate: targetD }))}
                                                    className={cn(
                                                        "text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all duration-150 active:scale-95 cursor-pointer border",
                                                        isSelected 
                                                            ? "bg-blue-600 text-white border-blue-600 shadow-2xs" 
                                                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                                    )}
                                                >
                                                    {preset.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <Input
                                    label="Expected Confirmation"
                                    type="date"
                                    suffix={<Calendar size={14} className="text-slate-400 pointer-events-none" />}
                                    value={formData.expectedConfirmationDate}
                                    onChange={(e) => setFormData({ ...formData, expectedConfirmationDate: e.target.value })}
                                />
                                
                                <div className="space-y-1.5 pt-1">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                                        Discussion Notes
                                    </label>
                                    <textarea
                                        className="w-full bg-slate-50/50 focus:bg-white border border-slate-200/90 rounded-xl p-3 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-slate-400 transition-all min-h-[130px] resize-none"
                                        placeholder="Specific requirements, fee negotiation, questions asked..."
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* STICKY ACTION BAR */}
                <div className="sticky bottom-6 mt-8 z-30 bg-white/90 backdrop-blur-md border border-slate-200/80 p-3.5 rounded-2xl shadow-lg flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500 ml-2 hidden sm:block">
                        Press <kbd className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-600 font-mono mx-1">⌘S</kbd> to save, <kbd className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-600 font-mono mx-1">Tab</kbd> to navigate fields.
                    </p>
                    <div className="flex items-center gap-2.5 ml-auto">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => router.back()} 
                            className="min-w-[90px] rounded-xl active:scale-[0.98] transition-all cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={loading} 
                            className="min-w-[130px] rounded-xl active:scale-[0.98] bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer font-semibold"
                        >
                            {loading ? <Loader2 className="animate-spin mr-1.5" size={15} /> : <Save className="mr-1.5" size={15} />}
                            Save Entry
                        </Button>
                    </div>
                </div>
            </form>
        </motion.div>
    );
}
