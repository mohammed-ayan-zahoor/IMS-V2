"use client";

import { useState, useEffect, use } from "react";
import { 
    User, Mail, Phone, Calendar, MapPin, 
    BookOpen, Users, Save, CheckCircle2, 
    ArrowRight, ArrowLeft, Info, BookCheck, GraduationCap,
    Clock, Globe, School, ShieldCheck, Check, ChevronRight,
    Lock, Search, Camera
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Card, { CardContent } from "@/components/ui/Card";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export default function PublicAdmissionForm({ params }) {
    const { instituteId } = use(params);
    const toast = useToast();
    const [institute, setInstitute] = useState(null);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [step, setStep] = useState(1);
    const [errors, setErrors] = useState({});
    const [courseSearch, setCourseSearch] = useState("");
    
    const [formData, setFormData] = useState({
        institute: instituteId,
        photo: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        gender: "",
        course: "",
        learningMode: "Offline",
        guardian: {
            name: "",
            phone: "",
            relation: ""
        },
        address: {
            street: "",
            city: "",
            state: "",
            pincode: ""
        },
        previousEducation: "",
        notes: "",
        referredBy: ""
    });

    const [selectedCourse, setSelectedCourse] = useState(null);

    useEffect(() => {
        fetchInitialData();
    }, [instituteId]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [instRes, courseRes] = await Promise.all([
                fetch(`/api/v1/public/institute/fetch-by-id/${instituteId}`),
                fetch(`/api/v1/public/courses?instituteId=${instituteId}`)
            ]);

            const instData = await instRes.json();
            const courseData = await courseRes.json();

            if (instRes.ok) setInstitute(instData.institute);
            if (courseRes.ok) setCourses(courseData.courses || []);
        } catch (error) {
            console.error("Failed to load initial data", error);
            toast.error("Failed to load form details");
        } finally {
            setLoading(false);
        }
    };

    const handleCourseSelect = (course) => {
        setSelectedCourse(course);
        setFormData({ ...formData, course: course._id });
        setErrors({ ...errors, course: null });
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error("Photo size must be less than 2MB");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData({ ...formData, photo: reader.result });
        };
        reader.readAsDataURL(file);
    };

    const validateStep = () => {
        const newErrors = {};
        if (step === 1) {
            if (!formData.firstName) newErrors.firstName = "Required";
            if (!formData.lastName) newErrors.lastName = "Required";
            if (!formData.phone) newErrors.phone = "Required";
        } else if (step === 2) {
            if (!formData.email) newErrors.email = "Required";
            if (!formData.dateOfBirth) newErrors.dateOfBirth = "Required";
        } else if (step === 3) {
            if (!formData.course) newErrors.course = "Required";
        } else if (step === 4) {
            if (!formData.guardian.name) newErrors.guardianName = "Required";
            if (!formData.guardian.phone) newErrors.guardianPhone = "Required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = () => {
        if (validateStep()) {
            setStep(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            toast.error("Please fill all required fields");
        }
    };

    const prevStep = () => {
        setStep(prev => prev - 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch("/api/v1/admissions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setSubmitted(true);
                toast.success("Application submitted successfully!");
            } else {
                const data = await res.json();
                toast.error(data.error || "Submission failed");
            }
        } catch (error) {
            toast.error("An error occurred during submission");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
            <LoadingSpinner />
        </div>
    );

    if (!institute) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
            <Card className="max-w-md w-full text-center p-8 border-none shadow-xl">
                <Info className="mx-auto text-slate-300 mb-4" size={48} />
                <h1 className="text-xl font-bold text-slate-900">Institute Not Found</h1>
                <p className="text-slate-500 mt-2">The admission link you followed might be invalid or expired.</p>
            </Card>
        </div>
    );

    if (submitted) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-geist-sans overflow-hidden">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", damping: 20 }} className="max-w-xl w-full">
                <Card className="p-8 md:p-12 text-center border-none shadow-2xl bg-white rounded-[32px] overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500" />
                    
                    {/* Animated Success Icon */}
                    <motion.div 
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner border border-emerald-100"
                    >
                        <CheckCircle2 size={48} className="drop-shadow-sm" />
                    </motion.div>

                    {/* Personalized Headline */}
                    <div className="space-y-3">
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight italic">
                            🎉 You're officially in, <span className="text-premium-blue">{formData.firstName}</span>!
                        </h1>
                        <p className="text-slate-400 font-medium text-base">Your application for <span className="text-slate-700 font-bold">{selectedCourse?.name || "the course"}</span> is now processing at {institute.name}.</p>
                    </div>

                    {/* Momentum Checklist (What happens next) */}
                    <div className="mt-10 mb-8 p-6 bg-slate-50/50 rounded-3xl border border-slate-100 text-left space-y-5">
                         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                             The Enrollment Roadmap <ArrowRight size={12} className="text-slate-300" />
                         </h3>
                         <div className="space-y-5 relative">
                             {/* Vertical Line Connector */}
                             <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100" />
                             
                             {[
                                 { text: "Application successfully submitted", status: "completed" },
                                 { text: "Admissions office review (Within 24hrs)", status: "current" },
                                 { text: "Personal interview & counseling", status: "pending" },
                                 { text: "Final seat installment & enrollment", status: "pending" }
                             ].map((step, i) => (
                                 <div key={i} className="flex gap-4 items-center relative z-10 transition-all duration-300">
                                     <div className={cn(
                                         "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm border text-[10px] font-black",
                                         step.status === 'completed' ? "bg-emerald-500 border-emerald-500 text-white" :
                                         step.status === 'current' ? "bg-white border-premium-blue text-premium-blue animate-pulse" :
                                         "bg-white border-slate-200 text-slate-300"
                                     )}>
                                         {step.status === 'completed' ? <Check size={14} /> : i + 1}
                                     </div>
                                     <p className={cn(
                                         "text-sm font-bold leading-tight transition-colors",
                                         step.status === 'completed' ? "text-slate-500" :
                                         step.status === 'current' ? "text-slate-800" : "text-slate-300"
                                     )}>{step.text}</p>
                                 </div>
                             ))}
                         </div>
                    </div>
                    
                    {/* Upgrade CTA Hierarchy */}
                    <div className="space-y-4">
                        
                        <Button 
                            variant="ghost"
                            className="w-full h-14 rounded-2xl font-black text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                            onClick={() => window.location.reload()}
                        >
                             ➕ Submit Another Application
                        </Button>
                    </div>

                    {/* Trust & Support Footer */}
                    <div className="mt-8 pt-6 border-t border-slate-50 space-y-4">
                        <div className="flex items-center justify-center gap-3">
                            <Lock size={12} className="text-emerald-500" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Your data is <span className="text-emerald-600">securely stored</span> (SSL encrypted)
                            </p>
                        </div>
                        <a 
                            href="https://wa.me/919488842786" // Replace with actual support number if known
                            target="_blank"
                            className="inline-flex items-center gap-2 text-[11px] font-black text-premium-blue uppercase tracking-widest hover:underline"
                        >
                            Need help? Chat with Support <ArrowRight size={12} />
                        </a>
                    </div>
                </Card>
            </motion.div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-32 font-geist-sans overflow-x-hidden">
            {/* Top Navigation / Branding */}
            <div className="max-w-3xl mx-auto w-full pt-8 px-4 flex flex-col items-center">
                <header className="w-full flex items-center justify-between mb-8">
                     <div className="flex items-center gap-3">
                         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-white">
                             {institute.branding?.logo ? (
                                 <img src={institute.branding.logo} alt={institute.name} className="w-full h-full object-contain" />
                             ) : (
                                 <School className="text-premium-blue" size={24} />
                             )}
                         </div>
                         <div className="hidden sm:block">
                            <h2 className="text-lg font-black text-slate-800 tracking-tighter uppercase leading-none">{institute.name}</h2>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Admission portal</p>
                         </div>
                     </div>
                     <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl shadow-sm border border-slate-100">
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/>
                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Applications Open</span>
                     </div>
                </header>

                {/* Progress Bar (Compact) */}
                <div className="w-full mb-10 px-2">
                    <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3 px-1">
                        <span>Step {step} of 5</span>
                        <span className={cn(step >= 4 ? "text-emerald-500" : "text-slate-400")}>{Math.round((step/5) * 100)}% Complete</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-premium-blue shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            initial={{ width: "0%" }}
                            animate={{ width: `${(step / 5) * 100}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>

                {/* Main Content Area */}
                <main className="w-full">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="w-full"
                        >
                            {/* STEP 1: IDENTITY */}
                            {step === 1 && (
                                <div className="space-y-6">
                                    <div className="text-center sm:text-left flex flex-col sm:flex-row justify-between items-center sm:items-start gap-6">
                                        <div>
                                            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-2 italic">Who are you? 👤</h1>
                                            <p className="text-slate-400 font-medium text-sm">Tell us your legal name and contact phone.</p>
                                        </div>
                                        <div className="relative group cursor-pointer shrink-0">
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                onChange={handlePhotoChange} 
                                            />
                                            <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center overflow-hidden group-hover:border-premium-blue group-hover:bg-blue-50 transition-colors">
                                                {formData.photo ? (
                                                    <img src={formData.photo} alt="Student Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <>
                                                        <Camera size={20} className="text-slate-400 group-hover:text-premium-blue mb-1" />
                                                        <span className="text-[9px] font-bold text-slate-400 group-hover:text-premium-blue uppercase tracking-wider">Photo</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Input
                                            label="First Name"
                                            placeholder="Enter first name"
                                            value={formData.firstName}
                                            onChange={(e) => {
                                                setFormData({ ...formData, firstName: e.target.value });
                                                if(errors.firstName) setErrors({ ...errors, firstName: null });
                                            }}
                                            error={errors.firstName}
                                            className="h-14 rounded-2xl bg-white border-slate-200"
                                            required
                                        />
                                        <Input
                                            label="Last Name"
                                            placeholder="Enter last name"
                                            value={formData.lastName}
                                            onChange={(e) => {
                                                setFormData({ ...formData, lastName: e.target.value });
                                                if(errors.lastName) setErrors({ ...errors, lastName: null });
                                            }}
                                            error={errors.lastName}
                                            className="h-14 rounded-2xl bg-white border-slate-200"
                                            required
                                        />
                                        <div className="sm:col-span-2">
                                            <Input
                                                label="Phone Number"
                                                placeholder="+91 00000 00000"
                                                value={formData.phone}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, phone: e.target.value });
                                                    if(errors.phone) setErrors({ ...errors, phone: null });
                                                }}
                                                error={errors.phone}
                                                className="h-14 rounded-2xl bg-white border-slate-200 text-lg font-black"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="p-4 bg-white/50 border border-slate-100 rounded-3xl flex items-center gap-3">
                                        <Lock size={16} className="text-blue-400 shrink-0" />
                                        <p className="text-[11px] text-slate-500 font-medium leading-tight">We value your privacy. Your data is encrypted and only shared with the admissions office.</p>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: CONTACT & INFO */}
                            {step === 2 && (
                                <div className="space-y-6">
                                    <div className="text-center sm:text-left">
                                        <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-2 italic">More about you 🎂</h1>
                                        <p className="text-slate-400 font-medium text-sm">Providing correct details helps us reach you faster.</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <Input
                                                label="Email Address"
                                                type="email"
                                                placeholder="example@mail.com"
                                                value={formData.email}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, email: e.target.value });
                                                    if(errors.email) setErrors({ ...errors, email: null });
                                                }}
                                                error={errors.email}
                                                className="h-14 rounded-2xl bg-white border-slate-200"
                                                required
                                            />
                                        </div>
                                        <Input
                                            type="date"
                                            label="Date of Birth"
                                            value={formData.dateOfBirth}
                                            onChange={(e) => {
                                                setFormData({ ...formData, dateOfBirth: e.target.value });
                                                if(errors.dateOfBirth) setErrors({ ...errors, dateOfBirth: null });
                                            }}
                                            error={errors.dateOfBirth}
                                            className="h-14 rounded-2xl bg-white border-slate-200"
                                            required
                                        />
                                        <Select
                                            label="Gender"
                                            value={formData.gender}
                                            onChange={(val) => setFormData({ ...formData, gender: val })}
                                            options={[
                                                { label: "Male", value: "Male" },
                                                { label: "Female", value: "Female" },
                                                { label: "Other", value: "Other" }
                                            ]}
                                            className="h-14 rounded-2xl bg-white border-slate-200"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: PROGRAM SELECTION */}
                            {step === 3 && (
                                <div className="space-y-6">
                                    <div className="text-center sm:text-left">
                                        <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-2 italic">Pick a Program 🎓</h1>
                                        <p className="text-slate-400 font-medium text-sm">Choose the course and learning mode you prefer.</p>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="relative group">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-premium-blue transition-colors" size={16} />
                                            <input 
                                                type="text"
                                                placeholder="Search for a course..."
                                                className="w-full h-12 bg-white border border-slate-100 rounded-2xl pl-12 pr-4 text-sm font-medium outline-none focus:ring-4 focus:ring-premium-blue/5 focus:border-premium-blue/20 transition-all"
                                                onChange={(e) => setCourseSearch(e.target.value)}
                                            />
                                        </div>

                                        <div className={cn(
                                            "grid gap-3 max-h-[40vh] overflow-y-auto pr-1 pb-2 scrollbar-premium",
                                            courses.length > 4 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
                                        )}>
                                            {courses.filter(c => c.name.toLowerCase().includes((courseSearch || "").toLowerCase())).map((c) => (
                                                <motion.div
                                                    key={c._id}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => handleCourseSelect(c)}
                                                    className={cn(
                                                        "p-4 rounded-3xl border-2 cursor-pointer transition-all duration-300 flex items-center gap-4 group",
                                                        formData.course === c._id 
                                                            ? "border-premium-blue bg-blue-50/50" 
                                                            : errors.course ? "border-red-200 bg-red-50/20" : "border-slate-100 bg-white hover:border-slate-200"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all",
                                                        formData.course === c._id ? "bg-premium-blue text-white shadow-lg shadow-blue-500/20" : "bg-slate-50 text-slate-400 group-hover:bg-premium-blue/10 group-hover:text-premium-blue"
                                                    )}>
                                                        <BookOpen size={18} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-black text-slate-800 leading-tight truncate">{c.name}</h4>
                                                        <p className="text-[9px] font-bold text-premium-blue uppercase mt-1">
                                                            ₹ {c.fees?.amount?.toLocaleString() || c.fees?.toLocaleString() || "0"}
                                                        </p>
                                                    </div>
                                                    {formData.course === c._id && (
                                                        <div className="w-6 h-6 bg-premium-blue text-white rounded-full flex items-center justify-center shrink-0">
                                                            <Check size={14} />
                                                        </div>
                                                    )}
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Learning Environment</label>
                                         <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm gap-1">
                                             {['Online', 'Offline', 'Hybrid'].map((m) => (
                                                 <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, learningMode: m })}
                                                    className={cn(
                                                        "flex-1 py-3 rounded-xl text-xs font-black transition-all",
                                                        formData.learningMode === m 
                                                            ? "bg-premium-blue text-white shadow-lg shadow-blue-500/20" 
                                                            : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                                    )}
                                                 >
                                                     {m}
                                                 </button>
                                             ))}
                                         </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: GUARDIAN & ADDRESS */}
                            {step === 4 && (
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-500 flex items-center justify-center">
                                                <Users size={14} />
                                            </div>
                                            <h3 className="text-base font-black text-slate-800 italic">Guardian Details</h3>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="sm:col-span-2">
                                                <Input
                                                    label="Guardian Name"
                                                    value={formData.guardian.name}
                                                    onChange={(e) => setFormData({ ...formData, guardian: { ...formData.guardian, name: e.target.value } })}
                                                    error={errors.guardianName}
                                                    className="h-12 rounded-xl bg-white"
                                                    required
                                                />
                                            </div>
                                            <Select
                                                label="Relation"
                                                value={formData.guardian.relation}
                                                onChange={(val) => setFormData({ ...formData, guardian: { ...formData.guardian, relation: val } })}
                                                options={[{ label: "Father", value: "Father" }, { label: "Mother", value: "Mother" }, { label: "Guardian", value: "Guardian" }]}
                                                className="h-12 rounded-xl bg-white"
                                            />
                                            <Input
                                                label="Phone"
                                                value={formData.guardian.phone}
                                                onChange={(e) => setFormData({ ...formData, guardian: { ...formData.guardian, phone: e.target.value } })}
                                                error={errors.guardianPhone}
                                                className="h-12 rounded-xl bg-white"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-lg bg-premium-blue/10 text-premium-blue flex items-center justify-center">
                                                <MapPin size={14} />
                                            </div>
                                            <h3 className="text-base font-black text-slate-800 italic">Your Location</h3>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="sm:col-span-2">
                                                <Input
                                                    label="Street"
                                                    value={formData.address.street}
                                                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                                                    className="h-12 rounded-xl bg-white"
                                                />
                                            </div>
                                            <Input
                                                label="City"
                                                value={formData.address.city}
                                                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                                                className="h-12 rounded-xl bg-white"
                                            />
                                            <div className="grid grid-cols-2 gap-3">
                                                <Input
                                                    label="State"
                                                    value={formData.address.state}
                                                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                                                    className="h-12 rounded-xl bg-white"
                                                />
                                                <Input
                                                    label="Pin"
                                                    value={formData.address.pincode}
                                                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, pincode: e.target.value } })}
                                                    className="h-12 rounded-xl bg-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 5: FINALIZE */}
                            {step === 5 && (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-100 shadow-inner">
                                            <ShieldCheck size={28} />
                                        </div>
                                        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-1 italic">Ready to submit? 🚀</h1>
                                        <p className="text-slate-400 font-medium text-xs">One last review before we process your request.</p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-premium-blue">
                                                    <User size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Name</p>
                                                    <p className="font-bold text-slate-700 leading-tight">{formData.firstName} {formData.lastName}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setStep(1)} className="text-[10px] font-black text-premium-blue uppercase hover:underline">Fix</button>
                                        </div>

                                        <div className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-amber-500">
                                                    <GraduationCap size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Selected Course</p>
                                                    <p className="font-bold text-slate-700 truncate leading-tight">{selectedCourse?.name}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setStep(3)} className="text-[10px] font-black text-premium-blue uppercase hover:underline">Change</button>
                                        </div>

                                        <div className="space-y-2 pt-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">How did you hear about us? (Referred By)</label>
                                            <input
                                                className="w-full bg-white border border-slate-100 rounded-2xl h-12 px-4 shadow-sm outline-none focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium"
                                                placeholder="Friend name, Social Media, etc."
                                                value={formData.referredBy}
                                                onChange={(e) => setFormData({ ...formData, referredBy: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2 pt-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Additional Notes (Optional)</label>
                                            <textarea
                                                rows={2}
                                                className="w-full bg-white border border-slate-100 rounded-2xl p-4 outline-none focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium"
                                                placeholder="Tell us anything else..."
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            {/* STICKY FOOTER NAVIGATION */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-6 py-4 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
                <div className="max-w-3xl mx-auto w-full flex items-center gap-3">
                    {step > 1 && (
                        <button 
                            onClick={prevStep}
                            className="w-12 h-12 rounded-xl border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95"
                        >
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    
                    {step < 5 ? (
                        <Button 
                            onClick={nextStep}
                            className="flex-1 h-12 rounded-xl font-black text-sm shadow-xl shadow-blue-500/10 group"
                        >
                            Continue <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={16} />
                        </Button>
                    ) : (
                        <Button 
                            onClick={handleSubmit}
                            disabled={submitting}
                            variant="premium"
                            className="flex-1 h-12 rounded-xl font-black text-sm shadow-xl shadow-blue-500/10 group"
                        >
                            {submitting ? (
                                <LoadingSpinner size="sm" className="mr-3 text-white" />
                            ) : (
                                <CheckCircle2 className="mr-2 group-hover:scale-110 transition-transform" size={16} />
                            )}
                            {submitting ? "Processing..." : "Complete Registration"}
                        </Button>
                    )}
                </div>
                <div className="max-w-3xl mx-auto w-full mt-2 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <Clock size={10} className="text-slate-300" />
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">Takes ~2 mins</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={10} className="text-emerald-400" />
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">SSL Secured</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
