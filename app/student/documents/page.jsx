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
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Accessing Vault...</p>
                                </div>
                            ) : idCardData?.generatedCard ? (
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
                                                <div className="relative w-full h-full rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200 bg-white group-hover:scale-[1.02] transition-transform">
                                                    <img 
                                                        src={idCardData.generatedCard.frontImage} 
                                                        className="w-full h-full object-contain" 
                                                        alt="ID Card Front"
                                                    />
                                                </div>
                                            </div>

                                            {/* Back Side */}
                                            <div className="absolute inset-0 backface-hidden rotate-y-180">
                                                <div className="relative w-full h-full rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200 bg-white">
                                                    <img 
                                                        src={idCardData.generatedCard.backImage} 
                                                        className="w-full h-full object-contain" 
                                                        alt="ID Card Back"
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col md:flex-row items-center gap-6">
                                        <div className="text-center md:text-left space-y-1">
                                            <p className="text-slate-900 font-black text-lg">Digital Identity Card</p>
                                            <p className="text-slate-400 text-xs font-medium">This is your official campus ID card generated by the administrator.</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <a href={idCardData.generatedCard.frontImage} target="_blank" download>
                                                <Button variant="outline" className="gap-2 group">
                                                    <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                                                    <span>Front View</span>
                                                </Button>
                                            </a>
                                            <a href={idCardData.generatedCard.backImage} target="_blank" download>
                                                <Button variant="outline" className="gap-2 group">
                                                    <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                                                    <span>Back View</span>
                                                </Button>
                                            </a>
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
            <div className="relative h-32 bg-white border-b border-slate-100 overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-premium-blue/5 to-premium-purple/5 z-0" />
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 group-hover:opacity-60 transition-opacity duration-700 mix-blend-multiply">
                    <iframe 
                        src={`${cert.pdfUrl || `/api/v1/students/certificates/${cert._id}/download`}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                        className="w-[200%] h-[400px] origin-top-left scale-50 -mt-8 -ml-4"
                        tabIndex={-1}
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent z-10" />
                <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between text-slate-900 z-20">
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
            <div className="w-12 h-12 rounded-2xl shrink-0 shadow-sm border border-slate-200 overflow-hidden relative bg-slate-50">
                {doc.url?.match(/\.(jpeg|jpg|png|webp|gif)$/i) ? (
                    <img src={doc.url} className="w-full h-full object-cover" alt="Preview" />
                ) : doc.url ? (
                    <div className="absolute w-[200px] h-[200px] origin-top-left scale-[0.24] pointer-events-none">
                        <iframe src={`${doc.url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} className="w-full h-full" tabIndex={-1} />
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <FileText size={20} />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 truncate" title={doc.name}>{doc.name}</h4>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-premium-blue hover:bg-slate-50"
                            title="View"
                        >
                            <Eye size={14} />
                        </a>
                        <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            download={doc.name}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-premium-blue hover:bg-slate-50"
                            title="Download"
                        >
                            <Download size={14} />
                        </a>
                    </div>
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
