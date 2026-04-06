"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Card from "@/components/ui/Card";
import { useToast } from "@/contexts/ToastContext";

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
        contactNumber: "",
        standard: "",
        course: "",
        address: "",
        enquiryDate: new Date().toISOString().split("T")[0],
        expectedConfirmationDate: getFutureDate(7), // +7 days auto
        followUpDate: getFutureDate(2),           // +2 days auto
        notes: ""
    });

    useEffect(() => {
        fetchCourses();
    }, []);

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
        e.preventDefault();
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

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Zap className="text-amber-500" size={24} />
                        New Admission Enquiry
                    </h1>
                    <p className="text-sm font-medium text-slate-500">Fast-entry system for prospective students.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="relative">
                {/* 2-COLUMN FLOW */}
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                    
                    {/* LEFT COLUMN: Primary Details */}
                    <div className="space-y-6">
                        <Card className="p-6 border-t-4 border-t-premium-blue shadow-sm bg-white">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Student Information</h3>
                            
                            <div className="space-y-6">
                                {/* HIGHLIGHTED PRIMARY FIELDS */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-wider text-premium-blue ml-1 flex items-center gap-1">Student Name <span className="text-red-500">*</span></label>
                                        <input
                                            className="w-full bg-white border-2 border-blue-200 rounded-xl px-4 py-3 outline-none focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 text-lg font-bold text-slate-900 transition-all placeholder:font-medium placeholder:text-slate-300 shadow-sm"
                                            placeholder="Enter full name"
                                            value={formData.studentName}
                                            onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-wider text-premium-blue ml-1 flex items-center gap-1">Contact Number <span className="text-red-500">*</span></label>
                                        <input
                                            className="w-full bg-white border-2 border-blue-200 rounded-xl px-4 py-3 outline-none focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 text-lg font-bold text-slate-900 transition-all placeholder:font-medium placeholder:text-slate-300 shadow-sm"
                                            placeholder="10-digit mobile number"
                                            value={formData.contactNumber}
                                            onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* SECONDARY FIELDS (Compressed Inline) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <Input
                                        label="Father's Name"
                                        placeholder="Enter father's name"
                                        value={formData.fatherName}
                                        onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                                    />
                                    <Input
                                        label="Standard / Class"
                                        placeholder="e.g. 10th, 12th, or Degree"
                                        value={formData.standard}
                                        onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                                    />
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 shadow-sm bg-white">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Course Enrollment</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-1">Select Course</label>
                                    <Select
                                        value={formData.course}
                                        onChange={(val) => setFormData({ ...formData, course: val })}
                                        options={courses}
                                        placeholder="Select a course..."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-1">Address</label>
                                    <textarea
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:border-premium-blue/50 focus:ring-4 focus:ring-premium-blue/10 h-[42px] text-sm text-slate-800 transition-all resize-none"
                                        placeholder="Enter residential address"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* RIGHT COLUMN: Secondary (Tracking) */}
                    <div className="space-y-6">
                        <Card className="p-6 bg-slate-50/50 shadow-sm border-dashed border-2 border-slate-200">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Tracking & Follow-up</h3>
                            <div className="space-y-5">
                                <Input
                                    label="Enquiry Date"
                                    type="date"
                                    value={formData.enquiryDate}
                                    onChange={(e) => setFormData({ ...formData, enquiryDate: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Follow-up Date"
                                    type="date"
                                    value={formData.followUpDate}
                                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                                />
                                <Input
                                    label="Expected Confirmation"
                                    type="date"
                                    value={formData.expectedConfirmationDate}
                                    onChange={(e) => setFormData({ ...formData, expectedConfirmationDate: e.target.value })}
                                />
                                
                                <div className="pt-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-1 inline-block mb-1.5">Additional Notes</label>
                                    <textarea
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-premium-blue/50 focus:ring-4 focus:ring-premium-blue/10 min-h-[160px] text-sm text-slate-700 placeholder:text-slate-400 transition-all resize-none shadow-sm"
                                        placeholder="Any specific requirements, budget constraints, or conversation details..."
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* STICKY ACTION BAR */}
                <div className="sticky bottom-6 mt-8 z-40 bg-white/60 backdrop-blur-xl border border-slate-200/50 p-4 rounded-2xl flex justify-between items-center shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)]">
                    <p className="text-sm font-medium text-slate-500 ml-2 hidden sm:block">Press <kbd className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-600 font-sans mx-1">Tab</kbd> to quickly navigate fields.</p>
                    <div className="flex gap-3 ml-auto">
                        <Button type="button" variant="ghost" onClick={() => router.back()} className="min-w-[100px] h-12 font-bold text-slate-600 hover:bg-slate-100">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="min-w-[150px] h-12 font-black text-[15px] shadow-lg shadow-premium-blue/20">
                            {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : <Save className="mr-2" size={20} />}
                            Save Entry
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
