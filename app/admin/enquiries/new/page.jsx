"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Calendar } from "lucide-react";
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
                    type="button"
                    onClick={() => router.back()}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                        New Admission Enquiry
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Enter details for prospective student enquiries.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="relative">
                {/* 2-COLUMN FLOW */}
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                    
                    {/* LEFT COLUMN: Primary Details */}
                    <div className="space-y-6">
                        <Card className="p-6 bg-white border border-slate-200/80 rounded-xl">
                            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-5">Student Information</h2>
                            
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
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Address</label>
                                    <input
                                        className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-400 placeholder:text-slate-400 transition-colors"
                                        placeholder="Enter residential address"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 bg-white border border-slate-200/80 rounded-xl">
                            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-5">Course Enrollment</h2>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Select Course</label>
                                <Select
                                    value={formData.course}
                                    onChange={(val) => setFormData({ ...formData, course: val })}
                                    options={courses}
                                    placeholder="Select a course..."
                                />
                            </div>
                        </Card>
                    </div>

                    {/* RIGHT COLUMN: Secondary (Tracking) */}
                    <div className="space-y-6">
                        <Card className="p-6 bg-white border border-slate-200/80 rounded-xl">
                            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-5">Tracking & Follow-up</h2>
                            <div className="space-y-4">
                                <Input
                                    label="Enquiry Date *"
                                    type="date"
                                    suffix={<Calendar size={14} className="text-slate-400 pointer-events-none" />}
                                    value={formData.enquiryDate}
                                    onChange={(e) => setFormData({ ...formData, enquiryDate: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Follow-up Date"
                                    type="date"
                                    suffix={<Calendar size={14} className="text-slate-400 pointer-events-none" />}
                                    value={formData.followUpDate}
                                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                                />
                                <Input
                                    label="Expected Confirmation"
                                    type="date"
                                    suffix={<Calendar size={14} className="text-slate-400 pointer-events-none" />}
                                    value={formData.expectedConfirmationDate}
                                    onChange={(e) => setFormData({ ...formData, expectedConfirmationDate: e.target.value })}
                                />
                                
                                <div className="space-y-1 pt-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Additional Notes</label>
                                    <textarea
                                        className="w-full bg-white border border-slate-200 rounded-md p-3 text-xs font-medium text-slate-900 outline-none focus:border-slate-400 placeholder:text-slate-400 transition-colors min-h-[140px] resize-none"
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
                <div className="sticky bottom-6 mt-8 z-40 bg-white border border-slate-200 p-4 rounded-xl flex justify-between items-center">
                    <p className="text-xs font-medium text-slate-500 ml-2 hidden sm:block">Press <kbd className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-600 font-mono mx-1">Tab</kbd> to quickly navigate fields.</p>
                    <div className="flex gap-3 ml-auto">
                        <Button type="button" variant="outline" onClick={() => router.back()} className="min-w-[100px]">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="min-w-[140px]">
                            {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
                            Save Entry
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
