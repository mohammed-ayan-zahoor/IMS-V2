"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
    X, 
    Eye, 
    EyeOff, 
    Loader, 
    FileText, 
    Calendar,
    Award,
    Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

export default function CertificateVisibilityModal({ isOpen, onClose, student }) {
    const [mounted, setMounted] = useState(false);
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState({});
    const [deleting, setDeleting] = useState({});
    const toast = useToast();
    const confirm = useConfirm();

    useEffect(() => {
        setMounted(true);
        if (isOpen && student) {
            fetchCertificates();
        }
    }, [isOpen, student]);

    const fetchCertificates = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/v1/students/${student._id}/certificates`);
            const data = await res.json();
            if (res.ok) {
                setCertificates(data.certificates || []);
            }
        } catch (error) {
            console.error("Error fetching certificates:", error);
            toast.error("Failed to load certificates");
        } finally {
            setLoading(false);
        }
    };

    const toggleVisibility = async (certId) => {
        try {
            setToggling(prev => ({ ...prev, [certId]: true }));
            const res = await fetch(`/api/v1/certificates/${certId}/toggle-visibility`, {
                method: "PATCH"
            });
            const data = await res.json();

            if (res.ok) {
                setCertificates(prev => prev.map(c => 
                    c._id === certId ? { ...c, visibleToStudent: data.visibleToStudent } : c
                ));
                toast.success(data.message);
            }
        } catch (error) {
            console.error("Toggle visibility error:", error);
            toast.error("An error occurred");
        } finally {
            setToggling(prev => ({ ...prev, [certId]: false }));
        }
    };

    const handleDeleteCertificate = async (certId) => {
        const isConfirmed = await confirm({
            title: "Delete Certificate?",
            message: "This will permanently remove this certificate record. This action cannot be undone.",
            type: "danger"
        });

        if (!isConfirmed) return;

        try {
            setDeleting(prev => ({ ...prev, [certId]: true }));
            const res = await fetch(`/api/v1/certificates/${certId}`, {
                method: "DELETE"
            });
            const data = await res.json();

            if (res.ok) {
                setCertificates(prev => prev.filter(c => c._id !== certId));
                toast.success(data.message || "Certificate deleted successfully");
            } else {
                toast.error(data.error || data.message || "Failed to delete certificate");
            }
        } catch (error) {
            console.error("Delete certificate error:", error);
            toast.error("An error occurred during deletion");
        } finally {
            setDeleting(prev => ({ ...prev, [certId]: false }));
        }
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div 
                className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-premium-blue/10 flex items-center justify-center">
                                <Award className="text-premium-blue" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Document Visibility</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">
                                    Student: <span className="text-premium-blue font-bold ml-1">{student?.fullName || student?.name}</span>
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-2.5 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-200 hover:shadow-sm text-slate-400 hover:text-slate-900"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* List Content */}
                <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-3 max-h-[460px] custom-scrollbar bg-white">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="relative">
                                <Loader className="animate-spin text-premium-blue" size={32} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Award size={14} className="text-premium-blue/40" />
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Fetching Documents...</p>
                        </div>
                    ) : certificates.length === 0 ? (
                        <div className="text-center py-16 px-8">
                            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
                                <FileText className="text-slate-200" size={40} />
                            </div>
                            <h3 className="text-slate-900 font-bold mb-1">No Documents Issued</h3>
                            <p className="text-slate-500 text-sm font-medium">Use the issuance tools to generate certificates for this student.</p>
                        </div>
                    ) : (
                        certificates.map((cert) => (
                            <div 
                                key={cert._id}
                                className={cn(
                                    "group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300",
                                    cert.visibleToStudent 
                                        ? "bg-blue-50/30 border-blue-100 shadow-sm shadow-blue-500/5" 
                                        : "bg-white border-slate-100 hover:border-premium-blue/20 hover:shadow-lg hover:shadow-slate-200/40"
                                )}
                            >
                                {/* Doc Icon */}
                                <div className={cn(
                                    "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300",
                                    cert.visibleToStudent 
                                        ? "bg-premium-blue text-white border-premium-blue shadow-lg shadow-premium-blue/20 scale-105" 
                                        : "bg-slate-50 border-slate-100 text-slate-400 group-hover:text-premium-blue group-hover:bg-premium-blue/5 group-hover:border-premium-blue/10"
                                )}>
                                    <FileText size={20} />
                                </div>

                                {/* Info */}
                                <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-black text-slate-900 truncate">
                                            {cert.template?.templateName || cert.template?.category || "Certificate"}
                                        </h4>
                                        {cert.isDuplicate && (
                                            <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[8px] font-black uppercase tracking-tighter border border-amber-100">
                                                Duplicate
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <Calendar size={10} className="text-slate-300" />
                                            {new Date(cert.issueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                        <span className="text-[9px] font-black text-slate-300">/</span>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                            SN: <span className="text-slate-500 font-bold">{cert.certificateNumber}</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0 ml-auto">
                                    <button
                                        onClick={() => toggleVisibility(cert._id)}
                                        disabled={toggling[cert._id] || deleting[cert._id]}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                            cert.visibleToStudent 
                                                ? "bg-white text-premium-blue border-premium-blue/20 hover:bg-blue-50 shadow-sm" 
                                                : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-white hover:border-slate-200"
                                        )}
                                    >
                                        {toggling[cert._id] ? (
                                            <Loader className="animate-spin" size={14} />
                                        ) : cert.visibleToStudent ? (
                                            <><Eye size={14} /> Visible</>
                                        ) : (
                                            <><EyeOff size={14} /> Hidden</>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => handleDeleteCertificate(cert._id)}
                                        disabled={deleting[cert._id] || toggling[cert._id]}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 hover:border-red-100 border border-transparent transition-all"
                                        title="Delete Permanently"
                                    >
                                        {deleting[cert._id] ? (
                                            <Loader className="animate-spin" size={16} />
                                        ) : (
                                            <Trash2 size={16} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-end">
                    <Button 
                        onClick={onClose} 
                        className="h-11 px-10 text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-premium-blue/20"
                    >
                        Done
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
}
