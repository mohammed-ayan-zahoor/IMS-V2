"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Card, { CardContent } from "@/components/ui/Card";
import { useToast } from "@/contexts/ToastContext";

export default function NewEnquiryPage() {
    const router = useRouter();
    const toast = useToast(); const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        studentName: "",
        fatherName: "",
        contactNumber: "",
        standard: "",
        course: "",
        address: "",
        enquiryDate: new Date().toISOString().split("T")[0], // Today
        expectedConfirmationDate: "",
        followUpDate: "",
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
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()} className="text-slate-500">
                    <ArrowLeft size={20} />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">New Admission Enquiry</h1>
                    <p className="text-slate-400 text-sm">Record details for a prospective student.</p>
                </div>
            </div>

            <Card>
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Personal Info */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Student Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Input
                                    label="Student Name"
                                    placeholder="Enter full name"
                                    value={formData.studentName}
                                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Father's Name"
                                    placeholder="Enter father's name"
                                    value={formData.fatherName}
                                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                                />
                                <Input
                                    label="Contact Number"
                                    placeholder="10-digit mobile number"
                                    value={formData.contactNumber}
                                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Standard / Class"
                                    placeholder="e.g. 10th, 12th, or Degree"
                                    value={formData.standard}
                                    onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Course & Address */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Course Interest</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">Select Course</label>
                                    <Select
                                        value={formData.course}
                                        onChange={(val) => setFormData({ ...formData, course: val })}
                                        options={courses}
                                        placeholder="Select a course..."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">Address</label>
                                    <textarea
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-premium-blue/50 focus:ring-4 focus:ring-premium-blue/10 min-h-[42px] text-sm transition-all resize-none"
                                        placeholder="Enter residential address"
                                        rows={1}
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Status & Dates */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Tracking & Follow-up</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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
                            </div>
                            <div className="mt-5 space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">Additional Notes</label>
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-premium-blue/50 focus:ring-4 focus:ring-premium-blue/10 min-h-[100px] text-sm text-slate-700 placeholder:text-slate-400 transition-all resize-none"
                                    placeholder="Any specific requirements or conversation details..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                            <Button type="submit" disabled={loading} className="min-w-[120px]">
                                {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                                Save Entry
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
