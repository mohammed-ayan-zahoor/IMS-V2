"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
    Link as LinkIcon, Copy, Check, 
    Search, User, Mail, Phone, Calendar, 
    UserPlus, XCircle, ExternalLink,
    Eye, GraduationCap, MapPin, Users, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";
import { useSession } from "next-auth/react";
import { format } from "date-fns";

export default function AdmissionApplicationsPage() {
    const toast = useToast();
    const { data: session, status } = useSession();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("pending");
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
    const [batches, setBatches] = useState([]);
    const [selectedBatchId, setSelectedBatchId] = useState("");
    const [isConverting, setIsConverting] = useState(false);
    const [isLinkCopied, setIsLinkCopied] = useState(false);

    // Normalize instituteId
    const instituteObj = session?.user?.institute;
    const instituteId = typeof instituteObj === 'object' ? (instituteObj?.id || instituteObj?._id) : instituteObj;

    // Get the base URL for the admission form
    const publicFormUrl = typeof window !== 'undefined' && instituteId
        ? `${window.location.origin}/admission/${instituteId}` 
        : "";

    useEffect(() => {
        if (instituteId) {
            fetchApplications();
        } else if (status === 'unauthenticated') {
            setLoading(false);
        }
    }, [instituteId, status, statusFilter]);

    const fetchApplications = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/v1/admissions?instituteId=${instituteId}&status=${statusFilter}`);
            const data = await res.json();
            if (res.ok) {
                setApplications(data.applications || []);
            } else {
                toast.error(data.error || "Failed to fetch applications");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            setUpdating(id);
            const res = await fetch("/api/v1/admissions", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: newStatus })
            });

            if (res.ok) {
                toast.success(`Application ${newStatus} successfully`);
                fetchApplications();
                if (selectedApplication?._id === id) setSelectedApplication(null);
            } else {
                const data = await res.json();
                toast.error(data.error || "Update failed");
            }
        } catch (error) {
            toast.error("Failed to update status");
        } finally {
            setUpdating(null);
        }
    };

    const handleOpenConvertModal = async (application) => {
        setSelectedApplication(application);
        setIsConvertModalOpen(true);
        try {
            const courseId = application.course?._id || application.course || "";
            const res = await fetch(`/api/v1/batches?courseId=${courseId}&instituteId=${instituteId}`);
            const data = await res.json();
            if (res.ok) {
                setBatches(data.batches || []);
                if (data.batches?.length > 0) {
                    setSelectedBatchId(data.batches[0]._id);
                }
            }
        } catch (error) {
            toast.error("Failed to load batches");
        }
    };

    const handleConvert = async () => {
        if (!selectedBatchId) {
            toast.error("Please select a batch first");
            return;
        }

        try {
            setIsConverting(true);
            const res = await fetch("/api/v1/admissions/convert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    applicationId: selectedApplication._id,
                    batchId: selectedBatchId
                })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Student assigned and enrolled successfully!");
                setIsConvertModalOpen(false);
                setSelectedApplication(null);
                fetchApplications();
            } else {
                toast.error(data.error || "Conversion failed");
            }
        } catch (error) {
            toast.error("An error occurred during conversion");
        } finally {
            setIsConverting(false);
        }
    };

    const copyToClipboard = () => {
        if (!publicFormUrl) {
            toast.error("Link not ready yet. Please wait...");
            return;
        }
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(publicFormUrl)
                .then(() => {
                    setIsLinkCopied(true);
                    toast.success("Link copied to clipboard!");
                    setTimeout(() => setIsLinkCopied(false), 2000);
                })
                .catch(() => {
                    fallbackCopyTextToClipboard(publicFormUrl);
                });
        } else {
            fallbackCopyTextToClipboard(publicFormUrl);
        }
    };

    const fallbackCopyTextToClipboard = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            setIsLinkCopied(true);
            toast.success("Link copied!");
            setTimeout(() => setIsLinkCopied(false), 2000);
        } catch (err) {
            toast.error("Could not copy link automatically.");
        }
        document.body.removeChild(textArea);
    };

    const handleOpenLink = () => {
        if (publicFormUrl) {
            window.open(publicFormUrl, '_blank', 'noopener,noreferrer');
        } else {
            toast.error("Link not available yet.");
        }
    };

    const filteredApplications = applications.filter(app => 
        app.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        app.lastName?.toLowerCase().includes(search.toLowerCase()) ||
        app.email?.toLowerCase().includes(search.toLowerCase()) ||
        app.course?.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <motion.div 
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6 max-w-full pb-20"
        >
            {/* Header with Title and Status */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            Online Enquiry
                        </h1>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200/60">
                            Public Portal
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Manage prospective student submissions received via your public link.
                    </p>
                </div>
            </div>

            {/* Public Link Panel - Apple Glass Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-shadow hover:shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <LinkIcon size={14} />
                    </div>
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Your Shareable Admission Link
                    </h2>
                </div>
                <p className="text-xs text-slate-500 font-medium mb-3">
                    Copy and share this link directly with students or post on social media to collect inquiries.
                </p>
                
                <div className="relative flex items-center max-w-2xl">
                    <input
                        type="text"
                        readOnly
                        value={publicFormUrl}
                        placeholder="Generating link..."
                        className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-3 pr-28 py-2.5 text-xs font-mono text-slate-700 outline-none select-all focus:border-blue-400 focus:bg-white transition-colors"
                    />
                    <div className="absolute right-1.5 flex items-center gap-1">
                        <button
                            type="button"
                            onClick={copyToClipboard}
                            disabled={!publicFormUrl}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50",
                                isLinkCopied 
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-2xs" 
                                    : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs"
                            )}
                        >
                            {isLinkCopied ? <Check size={13} /> : <Copy size={13} />}
                            <span>{isLinkCopied ? "Copied" : "Copy Link"}</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenLink}
                            disabled={!publicFormUrl}
                            title="Open link in new tab"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                            <ExternalLink size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Submissions Section */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                {/* Search & Segmented Filter Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 p-4 bg-slate-50/60 border-b border-slate-100">
                    <div className="flex-1 relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input
                            type="text"
                            placeholder="Search by name, email, or course..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-xs font-medium"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Apple Segmented Control */}
                    <div className="flex items-center p-1 bg-slate-200/60 rounded-xl border border-slate-200/50 shadow-2xs shrink-0 self-start sm:self-auto">
                        {['pending', 'converted', 'cancelled'].map(status => {
                            const isSelected = statusFilter === status;
                            return (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={cn(
                                        "relative px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-150 cursor-pointer active:scale-95",
                                        isSelected ? "text-slate-900 font-bold" : "text-slate-600 hover:text-slate-900"
                                    )}
                                >
                                    {isSelected && (
                                        <motion.span
                                            layoutId="admissionStatusPill"
                                            className="absolute inset-0 bg-white rounded-lg shadow-xs border border-slate-200/50"
                                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                                        />
                                    )}
                                    <span className="relative z-10">{status}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    {loading ? (
                        <div className="p-20 flex justify-center"><LoadingSpinner /></div>
                    ) : filteredApplications.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 text-left">Applicant</th>
                                        <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 text-left">Course</th>
                                        <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 text-left">Applied On</th>
                                        <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 text-left">Referred By</th>
                                        <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredApplications.map((app) => (
                                        <tr key={app._id} className="group hover:bg-slate-50/80 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/60 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                                        {app.firstName?.[0]}{app.lastName?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900 leading-tight">
                                                            {app.firstName} {app.lastName}
                                                        </p>
                                                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                                                            {app.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold text-slate-700">
                                                        {app.course?.name || "N/A"}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="primary" className="text-[9px]">
                                                            {app.learningMode}
                                                        </Badge>
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            Fee: ₹ {app.course?.fees?.amount?.toLocaleString() || app.course?.fees?.toLocaleString() || "0"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <p className="text-xs font-semibold text-slate-700">
                                                    {format(new Date(app.createdAt), "PP")}
                                                </p>
                                                <p className="text-[10px] font-medium text-slate-400">
                                                    {format(new Date(app.createdAt), "p")}
                                                </p>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="text-xs font-semibold text-slate-700">
                                                    {app.referredBy || <span className="text-slate-300 italic font-normal">—</span>}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button 
                                                        onClick={() => setSelectedApplication(app)}
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg active:scale-95 transition-all cursor-pointer"
                                                        title="View Details"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {app.status === 'pending' && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleOpenConvertModal(app)}
                                                                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                                            >
                                                                <UserPlus size={14} />
                                                                <span>Convert</span>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleUpdateStatus(app._id, 'cancelled')}
                                                                disabled={updating === app._id}
                                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg active:scale-95 transition-all cursor-pointer"
                                                                title="Cancel Application"
                                                            >
                                                                {updating === app._id ? <LoadingSpinner size="sm"/> : <XCircle size={16} />}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-16 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
                                <GraduationCap size={28} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-800">
                                No applications found
                            </h3>
                            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 mb-4">
                                {search ? "Try searching with different keywords." : "Share your public admission link to start receiving applications."}
                            </p>
                            {!search && (
                                <button
                                    type="button"
                                    onClick={copyToClipboard}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
                                >
                                    <Copy size={13} />
                                    <span>Copy Admission Link</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Application Detail Modal */}
            <Modal
                isOpen={!!selectedApplication}
                onClose={() => setSelectedApplication(null)}
                title="Application Details"
                maxWidth="2xl"
            >
                {selectedApplication && (
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        {/* Status Ribbon */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                             <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        {selectedApplication.firstName} {selectedApplication.lastName}
                                    </h3>
                                    <p className="text-xs font-medium text-slate-400">
                                        ID: {selectedApplication._id}
                                    </p>
                                </div>
                             </div>
                             <Badge variant={
                                 selectedApplication.status === 'pending' ? 'warning' : 
                                 selectedApplication.status === 'converted' ? 'success' : 'danger'
                             } className="px-3 py-1 text-xs capitalize font-bold">
                                 {selectedApplication.status}
                             </Badge>
                        </div>

                        {/* Info Grid */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Contact Info */}
                            <div className="space-y-3">
                                <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                                    <Mail size={12} /> Contact Information
                                </h4>
                                <div className="space-y-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2.5">
                                        <Mail size={14} className="text-slate-400 shrink-0" />
                                        <span className="text-xs font-semibold text-slate-700 truncate">{selectedApplication.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <Phone size={14} className="text-slate-400 shrink-0" />
                                        <span className="text-xs font-semibold text-slate-700">{selectedApplication.phone}</span>
                                    </div>
                                    {selectedApplication.dateOfBirth && (
                                        <div className="flex items-center gap-2.5">
                                            <Calendar size={14} className="text-slate-400 shrink-0" />
                                            <span className="text-xs font-semibold text-slate-700">Born: {format(new Date(selectedApplication.dateOfBirth), "PP")}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Academic Intent */}
                            <div className="space-y-3">
                                <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                                    <GraduationCap size={12} /> Academic Intent
                                </h4>
                                <div className="space-y-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Target Course</p>
                                        <p className="text-xs font-bold text-slate-800">{selectedApplication.course?.name || "N/A"}</p>
                                    </div>
                                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Mode</p>
                                            <Badge variant="primary" className="text-[9px]">{selectedApplication.learningMode}</Badge>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Fees</p>
                                            <p className="text-xs font-bold text-blue-600">₹ {selectedApplication.course?.fees?.amount?.toLocaleString() || selectedApplication.course?.fees?.toLocaleString() || "0"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Guardian Info */}
                            {selectedApplication.guardian && (
                                <div className="space-y-3">
                                    <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-500">
                                        <Users size={12} /> Guardian Details
                                    </h4>
                                    <div className="space-y-1 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-xs font-bold text-slate-700">{selectedApplication.guardian.name}</p>
                                        <p className="text-[11px] text-slate-500 font-medium capitalize">{selectedApplication.guardian.relation}</p>
                                        <p className="text-xs font-bold text-slate-700 mt-1">{selectedApplication.guardian.phone}</p>
                                    </div>
                                </div>
                            )}

                            {/* Address Info */}
                            {selectedApplication.address && (
                                <div className="space-y-3">
                                    <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                                        <MapPin size={12} /> Address
                                    </h4>
                                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs font-medium text-slate-600 leading-relaxed">
                                        {selectedApplication.address.street}<br />
                                        {selectedApplication.address.city}, {selectedApplication.address.state} - {selectedApplication.address.pincode}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Additional Info */}
                        {selectedApplication.notes && (
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Applicant Notes</h4>
                                <p className="text-xs text-slate-600 italic">&ldquo;{selectedApplication.notes}&rdquo;</p>
                            </div>
                        )}

                        {/* Footer Actions */}
                        <div className="pt-4 border-t border-slate-100 flex gap-2.5">
                            <Button 
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-xl active:scale-[0.98] transition-all cursor-pointer font-semibold"
                                onClick={() => handleOpenConvertModal(selectedApplication)}
                            >
                                <UserPlus size={16} className="mr-2" />
                                Start Admission Process
                            </Button>
                            <Button 
                                variant="outline" 
                                className="text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl active:scale-[0.98] transition-all cursor-pointer font-semibold"
                                onClick={() => handleUpdateStatus(selectedApplication._id, 'cancelled')}
                            >
                                <XCircle size={16} className="mr-2" />
                                Reject Application
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Conversion Modal */}
            <Modal
                isOpen={isConvertModalOpen}
                onClose={() => !isConverting && setIsConvertModalOpen(false)}
                title="Convert to Student"
                maxWidth="sm"
            >
                {selectedApplication && (
                    <div className="space-y-5">
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Confirming Registration</p>
                            <h4 className="text-sm font-bold text-slate-800">
                                {selectedApplication.firstName} {selectedApplication.lastName}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">Course: {selectedApplication.course?.name}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Assign to Batch (Required)
                            </label>
                            {batches.length > 0 ? (
                                <Select
                                    value={selectedBatchId}
                                    onChange={(val) => setSelectedBatchId(val)}
                                    options={batches.map(b => ({
                                        label: `${b.name} (${b.activeEnrollmentCount || 0}/${b.capacity})`,
                                        value: b._id
                                    }))}
                                    className="rounded-xl text-xs"
                                />
                            ) : (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                                    <p className="text-xs font-bold text-amber-700">No active batches found for this course.</p>
                                    <p className="text-[10px] text-amber-600 mt-1 uppercase font-semibold">Please create a batch first in Courses.</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-3 flex gap-2.5">
                            <Button 
                                variant="outline" 
                                className="flex-1 rounded-xl active:scale-[0.98] transition-all cursor-pointer"
                                onClick={() => setIsConvertModalOpen(false)}
                                disabled={isConverting}
                            >
                                Cancel
                            </Button>
                            <Button 
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-xl active:scale-[0.98] transition-all cursor-pointer font-semibold"
                                onClick={handleConvert}
                                disabled={isConverting || batches.length === 0}
                            >
                                {isConverting ? (
                                    <LoadingSpinner size="sm" className="text-white" />
                                ) : (
                                    "Confirm Enrollment"
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </motion.div>
    );
}
