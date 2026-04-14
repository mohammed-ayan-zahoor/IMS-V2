"use client";

import { useState, useEffect } from "react";
import { X, User, Mail, BookOpen, Layers3, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";

export default function QuickAddModal({ isOpen, onClose }) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        courseId: "",
        batchId: ""
    });

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen]);

    const fetchInitialData = async () => {
        try {
            const [coursesRes, batchesRes] = await Promise.all([
                fetch("/api/v1/courses"),
                fetch("/api/v1/batches")
            ]);
            if (coursesRes.ok) {
                const data = await coursesRes.json();
                setCourses(data.courses || []);
            }
            if (batchesRes.ok) {
                const data = await batchesRes.json();
                setBatches(data.batches || []);
            }
        } catch (error) {
            console.error("Fetch error:", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/v1/students", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    profile: {
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        phone: formData.phone
                    },
                    email: formData.email,
                    course: formData.courseId,
                    batch: formData.batchId,
                    isActive: true
                })
            });

            if (res.ok) {
                toast.success("Student added successfully!");
                onClose();
                // Reset form
                setFormData({ firstName: "", lastName: "", email: "", phone: "", courseId: "", batchId: "" });
            } else {
                const error = await res.json();
                toast.error(error.message || "Failed to add student");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div onClick={onClose} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <div className="bg-white rounded-[14px] shadow-2xl w-full max-w-lg relative z-10 animate-in fade-in zoom-in duration-200 premium-card overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Quick Student Admission</h3>
                        <p className="text-[12px] text-slate-400 font-medium">Create a new student record instantly</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                <input 
                                    required
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                                    className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-3 text-[13px] font-medium outline-none focus:ring-2 focus:ring-premium-blue/10 transition-all" 
                                    placeholder="e.g. Ayan" 
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                            <input 
                                required
                                value={formData.lastName}
                                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-[13px] font-medium outline-none focus:ring-2 focus:ring-premium-blue/10 transition-all" 
                                placeholder="e.g. Zahoor" 
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input 
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-3 text-[13px] font-medium outline-none focus:ring-2 focus:ring-premium-blue/10 transition-all" 
                                placeholder="name@example.com" 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Course Allocation</label>
                            <Select 
                                value={formData.courseId}
                                onChange={(val) => setFormData({...formData, courseId: val})}
                                placeholder="Select Course"
                                buttonClassName="bg-slate-50 border-none py-3 rounded-xl"
                                options={courses.map(c => ({ label: c.name, value: c._id }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Batch Assignment</label>
                            <Select 
                                value={formData.batchId}
                                onChange={(val) => setFormData({...formData, batchId: val})}
                                placeholder="Select Batch"
                                buttonClassName="bg-slate-50 border-none py-3 rounded-xl"
                                options={batches.filter(b => b.course?._id === formData.courseId || !formData.courseId).map(b => ({ label: b.name, value: b._id }))}
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button 
                            type="submit" 
                            fullWidth 
                            size="lg" 
                            disabled={loading}
                            className="bg-premium-blue shadow-lg shadow-blue-500/20"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : "Finalize Enrollment"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
