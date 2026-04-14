"use client";

import { useState, useEffect } from "react";
import { 
    Link as LinkIcon, Copy, Check, Filter, 
    Search, User, Mail, Phone, Calendar, 
    Trash2, UserPlus, XCircle, Info, ExternalLink,
    ChevronDown, Eye, GraduationCap, MapPin, Users
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
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
    // session.user.institute is structured as { id, name, code, logo } in lib/auth.js
    const instituteId = typeof instituteObj === 'object' ? (instituteObj?.id || instituteObj?._id) : instituteObj;

    // Get the base URL for the admission form
    const publicFormUrl = typeof window !== 'undefined' && instituteId
        ? `${window.location.origin}/admission/${instituteId}` 
        : "";

    useEffect(() => {
        if (instituteId) {
            fetchApplications();
        } else if (status === 'unauthenticated') {
            setLoading(false); // Stop loading if not logged in
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
                fetchApplications(); // Refresh
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
            const res = await fetch(`/api/v1/batches?courseId=${application.course?._id}&instituteId=${instituteId}`);
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
        
        // Use a more robust copy approach
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(publicFormUrl)
                .then(() => {
                    setIsLinkCopied(true);
                    toast.success("Link copied to clipboard!");
                    setTimeout(() => setIsLinkCopied(false), 2000);
                })
                .catch((err) => {
                    console.error("Clipboard write failed", err);
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
            toast.success("Link copied (fallback)!");
            setTimeout(() => setIsLinkCopied(false), 2000);
        } catch (err) {
            toast.error("Could not copy link. Please manually copy it.");
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
        app.firstName.toLowerCase().includes(search.toLowerCase()) ||
        app.lastName.toLowerCase().includes(search.toLowerCase()) ||
        app.email.toLowerCase().includes(search.toLowerCase()) ||
        app.course?.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header with Link Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Online Enquiry</h1>
                    <p className="text-slate-400 mt-1 text-sm font-medium">Manage student submissions from the public admission portal.</p>
                </div>
            </div>

            {/* Public Link Card */}
            <Card className="bg-gradient-to-r from-premium-blue/5 to-indigo-500/5 border-premium-blue/10">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-premium-blue/10 shrink-0">
                            <LinkIcon className="text-premium-blue" size={32} />
                        </div>
                        <div className="flex-1 space-y-1">
                            <h3 className="text-lg font-bold text-slate-800">Your Shareable Admission Link</h3>
                            <p className="text-sm text-slate-500 font-medium">Copy this link and send it to potential students to collect their admission details.</p>
                            <div className="mt-3 flex items-center gap-2">
                                <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-400 text-sm font-mono truncate shadow-inner min-h-[40px] flex items-center">
                                    {publicFormUrl || <span className="animate-pulse">Generating Link...</span>}
                                </div>
                                <Button 
                                    onClick={copyToClipboard}
                                    variant="outline"
                                    disabled={!publicFormUrl}
                                    className={isLinkCopied ? "border-emerald-500 text-emerald-600 bg-emerald-50" : ""}
                                >
                                    {isLinkCopied ? <Check size={18} className="mr-2" /> : <Copy size={18} className="mr-2" />}
                                    {isLinkCopied ? "Copied" : "Copy Link"}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    onClick={handleOpenLink}
                                    disabled={!publicFormUrl}
                                    className="text-slate-400 hover:text-premium-blue"
                                >
                                    <ExternalLink size={18} />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Submissions Table */}
            <Card className="border-transparent shadow-sm">
                <CardHeader className="flex-col md:flex-row items-stretch md:items-center gap-4">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400/50 group-focus-within:text-premium-blue transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, email or course..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-premium-blue/30 focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {['pending', 'converted', 'cancelled'].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                                    statusFilter === status 
                                    ? "bg-premium-blue text-white shadow-md shadow-blue-500/20" 
                                    : "bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100"
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-20 flex justify-center"><LoadingSpinner /></div>
                    ) : filteredApplications.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-y border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-left">Applicant</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-left">Course</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-left">Applied On</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-left">Referred By</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredApplications.map((app) => (
                                        <tr key={app._id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-premium-blue/10 flex items-center justify-center text-premium-blue font-bold text-sm">
                                                        {app.firstName[0]}{app.lastName[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{app.firstName} {app.lastName}</p>
                                                        <p className="text-[11px] font-medium text-slate-400">{app.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-slate-700">{app.course?.name || "N/A"}</p>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="primary" className="text-[9px]">{app.learningMode}</Badge>
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            Fee: ₹ {app.course?.fees?.amount?.toLocaleString() || app.course?.fees?.toLocaleString() || "0"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-bold text-slate-600">{format(new Date(app.createdAt), "PP")}</p>
                                                <p className="text-[10px] font-medium text-slate-400">{format(new Date(app.createdAt), "p")}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-[12px] font-bold text-slate-700">
                                                    {app.referredBy || <span className="text-slate-300 italic font-normal">—</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => setSelectedApplication(app)}
                                                        className="text-slate-400 hover:text-premium-blue"
                                                        title="View Details"
                                                    >
                                                        <Eye size={18} />
                                                    </Button>
                                                    {app.status === 'pending' && (
                                                        <>
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                className="text-emerald-600 hover:bg-emerald-50 border-emerald-100"
                                                                onClick={() => handleOpenConvertModal(app)}
                                                            >
                                                                <UserPlus size={16} className="mr-2" />
                                                                Convert
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                onClick={() => handleUpdateStatus(app._id, 'cancelled')}
                                                                disabled={updating === app._id}
                                                                className="text-slate-400 hover:text-red-500"
                                                                title="Cancel Application"
                                                            >
                                                                {updating === app._id ? <LoadingSpinner size="sm"/> : <XCircle size={18} />}
                                                            </Button>
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
                        <div className="p-20 text-center">
                            <GraduationCap className="mx-auto text-slate-200 mb-4" size={64} />
                            <h3 className="text-lg font-bold text-slate-800">No applications found</h3>
                            <p className="text-slate-400 max-w-xs mx-auto mt-2">Share your admission link to start receiving applications.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Application Detail Modal */}
            <Modal
                isOpen={!!selectedApplication}
                onClose={() => setSelectedApplication(null)}
                title="Application Details"
                maxWidth="2xl"
            >
                {selectedApplication && (
                    <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        {/* Status Ribbon */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-premium-blue/10 flex items-center justify-center text-premium-blue">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">{selectedApplication.firstName} {selectedApplication.lastName}</h3>
                                    <p className="text-sm font-medium text-slate-400">ID: {selectedApplication._id}</p>
                                </div>
                             </div>
                             <Badge variant={
                                 selectedApplication.status === 'pending' ? 'warning' : 
                                 selectedApplication.status === 'converted' ? 'success' : 'danger'
                             } className="px-4 py-1 text-sm">
                                 {selectedApplication.status}
                             </Badge>
                        </div>

                        {/* Info Grid */}
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Contact Info */}
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-premium-blue">
                                    <Mail size={12} /> Contact Information
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Mail size={16} className="text-slate-300" />
                                        <span className="text-sm font-bold text-slate-700">{selectedApplication.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone size={16} className="text-slate-300" />
                                        <span className="text-sm font-bold text-slate-700">{selectedApplication.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Calendar size={16} className="text-slate-300" />
                                        <span className="text-sm font-bold text-slate-700">Born: {format(new Date(selectedApplication.dateOfBirth), "PP")}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Academic Intent */}
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">
                                    <GraduationCap size={12} /> Academic Intent
                                </h4>
                                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Target Course</p>
                                        <p className="text-sm font-black text-slate-800">{selectedApplication.course?.name}</p>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Mode</p>
                                            <Badge variant="primary">{selectedApplication.learningMode}</Badge>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Fees</p>
                                            <p className="text-sm font-black text-premium-blue">₹ {selectedApplication.course?.fees?.amount?.toLocaleString() || selectedApplication.course?.fees?.toLocaleString() || "0"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Guardian Info */}
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">
                                    <Users size={12} /> Guardian Details
                                </h4>
                                <div className="space-y-2">
                                    <p className="text-sm font-bold text-slate-700">{selectedApplication.guardian.name}</p>
                                    <p className="text-xs text-slate-500 font-medium capitalize">{selectedApplication.guardian.relation}</p>
                                    <p className="text-sm font-bold text-slate-700">{selectedApplication.guardian.phone}</p>
                                </div>
                            </div>

                            {/* Address Info */}
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">
                                    <MapPin size={12} /> Permanent Address
                                </h4>
                                <div className="text-sm font-medium text-slate-600 leading-relaxed">
                                    {selectedApplication.address.street}<br />
                                    {selectedApplication.address.city}, {selectedApplication.address.state} - {selectedApplication.address.pincode}
                                </div>
                            </div>

                            {/* Referral Info */}
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
                                    <Users size={12} /> Referral Source
                                </h4>
                                <div className="text-sm font-bold text-slate-700">
                                    {selectedApplication.referredBy || "Self / Not Specified"}
                                </div>
                            </div>
                        </div>

                        {/* Additional Info */}
                        {selectedApplication.notes && (
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Applicant Notes</h4>
                                <p className="text-sm text-slate-600 italic">"{selectedApplication.notes}"</p>
                            </div>
                        )}

                        {/* Footer Actions */}
                        <div className="pt-6 border-t border-slate-100 flex gap-3">
                            <Button 
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleOpenConvertModal(selectedApplication)}
                            >
                                <UserPlus size={18} className="mr-2" />
                                Start Admission Process
                            </Button>
                            <Button 
                                variant="outline" 
                                className="text-red-500 border-red-100 hover:bg-red-50"
                                onClick={() => handleUpdateStatus(selectedApplication._id, 'cancelled')}
                            >
                                <XCircle size={18} className="mr-2" />
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
                    <div className="space-y-6">
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Confirming Registration</p>
                            <h4 className="text-sm font-black text-slate-800">
                                {selectedApplication.firstName} {selectedApplication.lastName}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">Course: {selectedApplication.course?.name}</p>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
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
                                    className="h-12 rounded-xl text-sm"
                                />
                            ) : (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                                    <p className="text-xs font-bold text-amber-700">No active batches found for this course.</p>
                                    <p className="text-[10px] text-amber-600 mt-1 uppercase">Please create a batch first in the Courses section.</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 flex gap-3">
                            <Button 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => setIsConvertModalOpen(false)}
                                disabled={isConverting}
                            >
                                Cancel
                            </Button>
                            <Button 
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
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
        </div>
    );
}
