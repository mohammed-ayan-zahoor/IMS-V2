"use client";

import { useState, useEffect } from "react";
import { 
    FileText, 
    Shield, 
    Download, 
    Eye, 
    ChevronRight, 
    CheckCircle, 
    Clock, 
    FileCheck,
    CreditCard,
    ArrowRight,
    Search,
    Loader2,
    Calendar,
    Briefcase,
    Globe,
    User,
    Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";

export default function StudentDocumentsPage() {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("academic"); // academic, personal, idcard
    const [docs, setDocs] = useState({ kyc: [], certificates: [] });
    const [idCardData, setIdCardData] = useState(null);
    const [isIdCardLoading, setIsIdCardLoading] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        fetchDocs();
    }, []);

    const fetchDocs = async () => {
        try {
            const res = await fetch("/api/v1/student/documents");
            if (res.ok) {
                const data = await res.json();
                setDocs(data);
            } else {
                toast.error("Failed to load documents");
            }
        } catch (error) {
            console.error("Fetch Docs Error:", error);
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const fetchIDCard = async () => {
        if (idCardData) return;
        setIsIdCardLoading(true);
        try {
            const res = await fetch("/api/v1/student/id-card");
            if (res.ok) {
                const data = await res.json();
                setIdCardData(data);
            } else {
                toast.error("Failed to load ID card data");
            }
        } catch (error) {
            console.error("Fetch ID Card Error:", error);
            toast.error("An error occurred");
        } finally {
            setIsIdCardLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "idcard") {
            fetchIDCard();
        }
    }, [activeTab]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-16 h-16 border-4 border-slate-100 border-t-premium-blue rounded-full animate-spin" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Accessing Vault...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            {/* Header Section */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-premium-blue to-premium-purple opacity-20 blur-xl group-hover:opacity-30 transition duration-1000" />
                <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6 p-8 rounded-3xl bg-white border border-slate-100 shadow-xl overflow-hidden">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-premium-blue flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                <Shield size={24} className="animate-pulse" />
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tighter italic">Document Vault</h1>
                        </div>
                        <p className="text-slate-400 font-medium text-sm max-w-md">
                            Secure storage for your academic achievements, identity records, and digital credentials.
                        </p>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
                        {[
                            { id: "academic", label: "Academic", icon: FileCheck },
                            { id: "personal", label: "Identity", icon: User },
                            { id: "idcard", label: "Digital ID", icon: CreditCard }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all duration-300",
                                    activeTab === tab.id 
                                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50" 
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <tab.icon size={14} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                >
                    {activeTab === "academic" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {docs.certificates?.length > 0 ? (
                                docs.certificates.map((cert) => (
                                    <CertificateCard key={cert._id} cert={cert} />
                                ))
                            ) : (
                                <EmptyState 
                                    icon={FileCheck} 
                                    title="No Certificates Issued" 
                                    description="Your academic certificates (TC, LC, Bonafide) will appear here once issued by the office."
                                />
                            )}
                        </div>
                    )}

                    {activeTab === "personal" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {docs.kyc?.length > 0 ? (
                                docs.kyc.map((doc) => (
                                    <PersonalDocCard key={doc._id} doc={doc} />
                                ))
                            ) : (
                                <EmptyState 
                                    icon={User} 
                                    title="No Identity Records" 
                                    description="Upload your identity documents (Aadhar, Birth Certificate) at the front office to see them here."
                                />
                            )}
                        </div>
                    )}

                    {activeTab === "idcard" && (
                        <div className="flex justify-center py-10">
                            {isIdCardLoading ? (
                                <div className="flex flex-col items-center gap-4 py-20">
                                    <Loader2 className="w-12 h-12 animate-spin text-slate-200" />
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Generating Digital ID...</p>
                                </div>
                            ) : idCardData ? (
                                <div className="space-y-12 flex flex-col items-center w-full max-w-4xl">
                                    {/* Interactive ID Card Container */}
                                    <div 
                                        className="relative perspective-1000 w-full max-w-[420px] aspect-[1.58/1] cursor-pointer group"
                                        onClick={() => setIsFlipped(!isFlipped)}
                                    >
                                        <motion.div
                                            className="relative w-full h-full transition-all duration-700 preserve-3d"
                                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                        >
                                            {/* Front Side */}
                                            <div className="absolute inset-0 backface-hidden">
                                                <div className="relative w-full h-full rounded-[2rem] overflow-hidden shadow-2xl border border-white/20 bg-slate-900 group-hover:scale-[1.02] transition-transform">
                                                    {/* Background Image */}
                                                    {idCardData.template?.frontImageUrl && (
                                                        <img 
                                                            src={idCardData.template.frontImageUrl} 
                                                            className="absolute inset-0 w-full h-full object-cover opacity-60" 
                                                            alt="ID Card Front"
                                                        />
                                                    )}
                                                    {/* Glass Overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent backdrop-blur-[2px]" />
                                                    
                                                    {/* Content Overlay */}
                                                    <div className="relative h-full p-8 flex flex-col">
                                                        {/* Header */}
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-center gap-3">
                                                                {idCardData.student.instituteLogo && (
                                                                    <img src={idCardData.student.instituteLogo} className="w-10 h-10 object-contain bg-white rounded-lg p-1 shadow-sm" alt="Logo" />
                                                                )}
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-black text-white leading-tight uppercase tracking-tight">{idCardData.student.instituteName}</span>
                                                                    <span className="text-[8px] text-white/60 font-bold uppercase tracking-[0.2em]">Student Identity</span>
                                                                </div>
                                                            </div>
                                                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                                                                <Shield size={14} className="text-white" />
                                                            </div>
                                                        </div>

                                                        {/* Main Body */}
                                                        <div className="mt-8 flex gap-6">
                                                            <div className="relative">
                                                                <div className="w-24 h-24 rounded-2xl border-2 border-white/30 overflow-hidden shadow-lg bg-slate-800">
                                                                    {idCardData.student.profilePicture ? (
                                                                        <img src={idCardData.student.profilePicture} className="w-full h-full object-cover" alt="Student" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-white/20">
                                                                            <User size={40} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-md">
                                                                    <CheckCircle size={14} strokeWidth={3} />
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 flex flex-col justify-center">
                                                                <h2 className="text-xl font-black text-white tracking-tight leading-tight uppercase">{idCardData.student.fullName}</h2>
                                                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">{idCardData.student.courseName}</p>
                                                                <div className="grid grid-cols-2 gap-4 mt-4">
                                                                    <div>
                                                                        <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Enrollment No.</p>
                                                                        <p className="text-[10px] font-black text-white mt-0.5">{idCardData.student.enrollmentNumber || idCardData.student.grNumber || "PENDING"}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Valid Thru</p>
                                                                        <p className="text-[10px] font-black text-white mt-0.5">MAY 2026</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Back Side */}
                                            <div className="absolute inset-0 backface-hidden rotate-y-180">
                                                <div className="relative w-full h-full rounded-[2rem] overflow-hidden shadow-2xl border border-white/20 bg-slate-800">
                                                     {idCardData.template?.backImageUrl && (
                                                        <img 
                                                            src={idCardData.template.backImageUrl} 
                                                            className="absolute inset-0 w-full h-full object-cover opacity-60" 
                                                            alt="ID Card Back"
                                                        />
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 to-transparent backdrop-blur-[2px]" />
                                                    
                                                    <div className="relative h-full p-8 flex flex-col">
                                                        <div className="flex-1 space-y-4">
                                                            <div>
                                                                <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Emergency Contact</p>
                                                                <p className="text-[11px] font-black text-white mt-1">{idCardData.student.phone}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Address</p>
                                                                <p className="text-[11px] font-black text-white mt-1 leading-relaxed max-w-[200px]">{idCardData.student.address}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Blood Group</p>
                                                                <p className="text-[11px] font-black text-emerald-400 mt-1">{idCardData.student.bloodGroup}</p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="mt-auto pt-6 border-t border-white/10 flex items-center justify-between">
                                                            <div className="w-12 h-12 bg-white rounded-lg p-1.5 shadow-lg">
                                                                {/* Simple QR Code Placeholder */}
                                                                <div className="w-full h-full bg-slate-100 rounded-sm grid grid-cols-3 grid-rows-3 gap-0.5 overflow-hidden">
                                                                    {[...Array(9)].map((_, i) => (
                                                                        <div key={i} className={cn("bg-slate-900", Math.random() > 0.4 ? "opacity-100" : "opacity-0")} />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[8px] font-black text-white/60 uppercase tracking-widest">Digital Authentication</p>
                                                                <p className="text-[7px] text-white/30 font-bold uppercase mt-0.5 tracking-tighter italic">Verified by Quantech Security</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col md:flex-row items-center gap-6">
                                        <div className="text-center md:text-left space-y-1">
                                            <p className="text-slate-900 font-black text-lg">Interactive Digital ID</p>
                                            <p className="text-slate-400 text-xs font-medium">Click the card to flip it and see emergency details.</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button variant="outline" className="gap-2 group">
                                                <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                                                <span>Download PDF</span>
                                            </Button>
                                            <Button className="gap-2 group bg-premium-blue hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                                                <Globe size={16} className="group-hover:rotate-12 transition-transform" />
                                                <span>Add to Mobile Wallet</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <EmptyState 
                                    icon={CreditCard} 
                                    title="ID Card Not Generated" 
                                    description="Your digital identity card is not yet available. Please contact the administrator to generate your campus ID."
                                />
                            )}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Bottom Help Section */}
            <div className="mt-12 p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-200">
                        <Lock size={24} />
                    </div>
                    <div>
                        <h4 className="text-lg font-black text-slate-900 tracking-tight">Need a hard copy?</h4>
                        <p className="text-sm text-slate-500 font-medium max-w-sm mt-1">
                            Visit the main office to request physical laminated ID cards or official stamped copies of your certificates.
                        </p>
                    </div>
                </div>
                <Button variant="ghost" className="gap-2 font-black text-premium-blue hover:text-premium-blue hover:bg-blue-50">
                    Request Support <ArrowRight size={16} />
                </Button>
            </div>

            <style jsx global>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
                .preserve-3d {
                    transform-style: preserve-3d;
                }
                .backface-hidden {
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
                .rotate-y-180 {
                    transform: rotateY(180deg);
                }
            `}</style>
        </div>
    );
}

function CertificateCard({ cert }) {
    return (
        <Card className="p-0 overflow-hidden border-slate-100 hover:border-premium-blue/30 transition-all duration-500 group hover:shadow-2xl">
            <div className="relative h-32 bg-white border-b border-slate-100 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-premium-blue/10 to-premium-purple/10 opacity-40 group-hover:opacity-60 transition-opacity" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-premium-blue/5">
                    <FileCheck size={120} strokeWidth={1} />
                </div>
                <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between text-slate-900">
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none">Certificate</p>
                        <h3 className="text-base font-black truncate max-w-[180px]">{cert.template?.templateName || "Academic Record"}</h3>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-premium-blue text-white shadow-lg flex items-center justify-center">
                        <CheckCircle size={14} strokeWidth={3} />
                    </div>
                </div>
            </div>
            <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                            Issued on {new Date(cert.issueDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                    <Badge variant="soft" className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border-emerald-100">Verified</Badge>
                </div>
                <div className="flex gap-2">
                    <a 
                        href={cert.pdfUrl || `/api/v1/students/certificates/${cert._id}/download`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 rounded-xl bg-premium-blue text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <Eye size={12} /> View Document
                    </a>
                    <a 
                        href={`/api/v1/students/certificates/${cert._id}/download`}
                        download
                        className="w-12 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-premium-blue hover:bg-blue-50 transition-all"
                        title="Download Document"
                    >
                        <Download size={16} />
                    </a>
                </div>
            </div>
        </Card>
    );
}

function PersonalDocCard({ doc }) {
    return (
        <Card className="p-5 flex items-start gap-4 hover:border-slate-300 transition-all group">
            <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border",
                doc.category === 'Aadhar' ? "bg-blue-50 border-blue-100 text-blue-600" :
                doc.category === 'Marksheet' ? "bg-amber-50 border-amber-100 text-amber-600" :
                "bg-slate-50 border-slate-100 text-slate-400"
            )}>
                <FileText size={20} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 truncate" title={doc.name}>{doc.name}</h4>
                    <a 
                        href={doc.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-premium-blue hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition-all"
                    >
                        <Download size={14} />
                    </a>
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{doc.category}</span>
                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                    </span>
                </div>
            </div>
        </Card>
    );
}

function EmptyState({ icon: Icon, title, description }) {
    return (
        <div className="col-span-full py-24 flex flex-col items-center justify-center text-center bg-white/50 rounded-[3rem] border border-dashed border-slate-200 backdrop-blur-sm">
            <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center text-slate-200 mb-6 shadow-xl ring-1 ring-slate-100">
                <Icon size={40} strokeWidth={1} />
            </div>
            <h4 className="text-xl font-black text-slate-900 tracking-tight italic">{title}</h4>
            <p className="text-slate-400 text-sm mt-2 max-w-[280px] font-medium leading-relaxed">
                {description}
            </p>
            <Button variant="ghost" size="sm" className="mt-8 text-premium-blue hover:bg-blue-50">
                Contact Front Office
            </Button>
        </div>
    );
}
