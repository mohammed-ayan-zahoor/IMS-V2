"use client";

import { useState, useEffect } from "react";
import {
    Upload, Save, Building, Globe, Mail, Phone, MapPin, Loader2, Hotel,
    Award, Clock, Bell, Smartphone, Download, Copy, Sliders, FileText,
    KeyRound, CheckCircle2, ShieldCheck, Check, Sparkles, Layers, Calendar, ExternalLink
} from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import Input from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import CertificateTemplateManager from "@/components/admin/CertificateTemplateManager";
import HtmlCertificateEditor from "@/components/admin/HtmlCertificateEditor";
import SessionManager from "@/components/admin/SessionManager";
import CloudinarySettingsForm from "@/components/CloudinarySettingsForm";
import PusherSettingsForm from "@/components/PusherSettingsForm";
import NotificationSettingsForm from "@/components/NotificationSettingsForm";

export default function SettingsPage() {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    
    // Main Settings Navigation Tab
    const [activeTab, setActiveTab] = useState('general'); // general | sessions | modules | attendance | receipts | tools | apis
    const [activeApiTab, setActiveApiTab] = useState('cloudinary');

    // Form State
    const [institute, setInstitute] = useState({
        name: "",
        contactEmail: "",
        contactPhone: "",
        website: "",
        address: { street: "", city: "", state: "", pincode: "" },
        branding: { logo: "" },
        type: "VOCATIONAL",
        settings: { receiptTemplate: "classic" }
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/v1/institute");
            if (res.ok) {
                const data = await res.json();
                setInstitute(prev => ({
                    ...prev,
                    ...data.institute,
                    address: {
                        street: data.institute?.address?.street || "Poonam Tower, Tiranga Chowk",
                        city: data.institute?.address?.city || "Dhule",
                        state: data.institute?.address?.state || "Maharashtra",
                        pincode: data.institute?.address?.pincode || "424001",
                    },
                    branding: { ...prev.branding, ...(data.institute?.branding || {}) },
                    settings: { ...prev.settings, ...(data.institute?.settings || {}) }
                }));
            }
        } catch (error) {
            console.error("Failed to fetch settings", error);
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const isValidImageUrl = (url) => {
        if (!url) return false;
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch (e) {
            return false;
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error("File size must be less than 2MB");
            e.target.value = "";
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileType", "logo");

        try {
            const res = await fetch("/api/v1/upload", {
                method: "POST",
                body: formData
            });

            const data = await res.json();
            if (res.ok) {
                setInstitute(prev => ({
                    ...prev,
                    branding: { ...prev.branding, logo: data.url }
                }));
                toast.success("Logo uploaded successfully");
            } else {
                toast.error(data.error || "Upload failed");
                e.target.value = "";
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Upload failed");
            e.target.value = "";
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        try {
            const { type, ...dataToSend } = institute;
            const res = await fetch("/api/v1/institute", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dataToSend)
            });

            if (res.ok) {
                toast.success("Settings saved successfully");
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to save settings");
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-[#444CE7]" size={28} />
                <span className="text-xs font-medium text-[#667085]">Loading institute settings…</span>
            </div>
        );
    }

    const hasAcademicStructure = institute.type === 'SCHOOL' || institute.type === 'COLLEGE';

    const NAV_TABS = [
        { id: 'general', label: 'General & Profile', icon: Building },
        ...(hasAcademicStructure ? [
            { id: 'sessions', label: 'Academic Sessions', icon: Calendar }
        ] : []),
        { id: 'modules', label: 'Modules & Features', icon: Sliders },
        { id: 'attendance', label: 'Attendance & Hours', icon: Clock },
        { id: 'receipts', label: 'Receipts & Templates', icon: FileText },
        { id: 'tools', label: 'Downloads & Tools', icon: Smartphone },
        { id: 'apis', label: 'Integrations & BY-API', icon: KeyRound },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-16 font-sans">
            
            {/* Header Title + Actions Row (Clean, Untitled UI Style) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E4E7EC]">
                <div>
                    <h1 className="text-2xl font-bold text-[#101828] tracking-tight">Settings</h1>
                    <p className="text-xs text-[#667085] mt-1 font-normal">
                        Manage your institutional profile, feature modules, automation rules, and API integrations.
                    </p>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto">
                    <button
                        type="button"
                        onClick={fetchSettings}
                        disabled={isSaving || uploading}
                        className="px-4 py-2 text-xs font-semibold text-[#344054] bg-white border border-[#D0D5DD] rounded-lg hover:bg-[#F9FAFB] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                        Reset
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSaving || uploading}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#444CE7] hover:bg-[#3538CD] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="animate-spin" size={14} /> Saving…
                            </>
                        ) : (
                            <>
                                <Save size={14} /> Save changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Horizontal Sub-Navigation Tab Bar (Clean Underline Style) */}
            <div className="border-b border-[#E4E7EC] overflow-x-auto no-scrollbar">
                <nav className="flex space-x-8 min-w-max pb-px" aria-label="Settings Tabs">
                    {NAV_TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap",
                                    isActive
                                        ? "border-[#444CE7] text-[#101828]"
                                        : "border-transparent text-[#667085] hover:text-[#101828] hover:border-slate-300"
                                )}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Main Settings Panel Area (Flat Panel with Subtle Border) */}
            <div className="bg-white border border-[#E4E7EC] rounded-2xl p-6 sm:p-8 space-y-8 shadow-xs">
                
                {/* TAB 1: General & Profile */}
                {activeTab === 'general' && (
                    <div className="space-y-8 animate-in fade-in duration-150">
                        <div className="pb-4 border-b border-[#E4E7EC]">
                            <h2 className="text-base font-semibold text-[#101828]">General Profile & Branding</h2>
                            <p className="text-xs text-[#667085] mt-0.5">Update primary institute name, logo, contact details, and registered address.</p>
                        </div>

                        {/* Logo & Identity Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 border-b border-[#E4E7EC]">
                            <div className="flex flex-col items-start justify-start">
                                <span className="text-xs font-semibold text-[#101828] mb-1">Institute Logo</span>
                                <p className="text-xs text-[#667085] mb-3">Printed on official receipts, certificates & student ID cards.</p>
                                
                                <div className="relative group w-36 h-24 rounded-xl border border-dashed border-[#D0D5DD] flex items-center justify-center bg-[#FAFAFB] overflow-hidden hover:border-[#444CE7] transition-colors">
                                    {isValidImageUrl(institute.branding?.logo) ? (
                                        <img src={institute.branding.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <Building className="text-[#98A2B3]" size={28} />
                                    )}
                                    <div className="absolute inset-0 bg-[#101828]/75 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        {uploading ? (
                                            <Loader2 className="animate-spin text-white mb-1" size={18} />
                                        ) : (
                                            <>
                                                <Upload className="text-white mb-1" size={16} />
                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change</span>
                                            </>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleLogoUpload}
                                        disabled={uploading}
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#101828]">Institute Name *</label>
                                    <div className="relative">
                                        <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" size={16} />
                                        <input
                                            required
                                            type="text"
                                            value={institute.name || ""}
                                            onChange={e => setInstitute({ ...institute, name: e.target.value })}
                                            className="w-full pl-10 pr-3.5 py-2 text-xs font-medium text-[#101828] bg-white border border-[#D0D5DD] rounded-lg outline-none focus:border-[#444CE7] focus:ring-4 focus:ring-[#444CE7]/10 transition-all placeholder:text-[#98A2B3]"
                                            placeholder="e.g. Azhka Institute of Technology"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-[#101828]">Institute Type</label>
                                        <div className="px-3.5 py-2 rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] flex items-center">
                                            <span className="text-xs font-medium text-[#344054]">
                                                {institute.type === 'COLLEGE' ? 'College / Higher-Ed' : (institute.type === 'SCHOOL' ? 'School / K-12' : 'Vocational / Coaching')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-[#101828]">Official Website</label>
                                        <div className="relative">
                                            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" size={16} />
                                            <input
                                                type="url"
                                                value={institute.website || ""}
                                                onChange={e => setInstitute({ ...institute, website: e.target.value })}
                                                className="w-full pl-10 pr-3.5 py-2 text-xs font-medium text-[#101828] bg-white border border-[#D0D5DD] rounded-lg outline-none focus:border-[#444CE7] focus:ring-4 focus:ring-[#444CE7]/10 transition-all placeholder:text-[#98A2B3]"
                                                placeholder="https://example.com"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="space-y-4 pb-8 border-b border-[#E4E7EC]">
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#98A2B3]">Contact Details</h3>
                                <p className="text-xs text-[#667085] mt-0.5">Primary communication channels for system notifications and student communications.</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#101828]">Contact Email *</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" size={16} />
                                        <input
                                            required
                                            type="email"
                                            value={institute.contactEmail || ""}
                                            onChange={e => setInstitute({ ...institute, contactEmail: e.target.value })}
                                            className="w-full pl-10 pr-3.5 py-2 text-xs font-medium text-[#101828] bg-white border border-[#D0D5DD] rounded-lg outline-none focus:border-[#444CE7] focus:ring-4 focus:ring-[#444CE7]/10 transition-all placeholder:text-[#98A2B3]"
                                            placeholder="admin@institute.com"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#101828]">Contact Phone</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" size={16} />
                                        <input
                                            type="text"
                                            value={institute.contactPhone || ""}
                                            onChange={e => setInstitute({ ...institute, contactPhone: e.target.value })}
                                            className="w-full pl-10 pr-3.5 py-2 text-xs font-medium text-[#101828] bg-white border border-[#D0D5DD] rounded-lg outline-none focus:border-[#444CE7] focus:ring-4 focus:ring-[#444CE7]/10 transition-all placeholder:text-[#98A2B3]"
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Postal Address */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#98A2B3]">Postal Address</h3>
                                <p className="text-xs text-[#667085] mt-0.5">Physical location printed on official documents and header receipts.</p>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#101828]">Street Address</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" size={16} />
                                        <input
                                            type="text"
                                            value={institute.address?.street || ""}
                                            onChange={e => setInstitute({ ...institute, address: { ...institute.address, street: e.target.value } })}
                                            className="w-full pl-10 pr-3.5 py-2 text-xs font-medium text-[#101828] bg-white border border-[#D0D5DD] rounded-lg outline-none focus:border-[#444CE7] focus:ring-4 focus:ring-[#444CE7]/10 transition-all"
                                            placeholder="Street & Building No."
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-[#101828]">City</label>
                                        <input
                                            type="text"
                                            value={institute.address?.city || ""}
                                            onChange={e => setInstitute({ ...institute, address: { ...institute.address, city: e.target.value } })}
                                            className="w-full px-3.5 py-2 text-xs font-medium text-[#101828] bg-white border border-[#D0D5DD] rounded-lg outline-none focus:border-[#444CE7] focus:ring-4 focus:ring-[#444CE7]/10 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-[#101828]">State</label>
                                        <input
                                            type="text"
                                            value={institute.address?.state || ""}
                                            onChange={e => setInstitute({ ...institute, address: { ...institute.address, state: e.target.value } })}
                                            className="w-full px-3.5 py-2 text-xs font-medium text-[#101828] bg-white border border-[#D0D5DD] rounded-lg outline-none focus:border-[#444CE7] focus:ring-4 focus:ring-[#444CE7]/10 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-[#101828]">Pincode</label>
                                        <input
                                            type="text"
                                            value={institute.address?.pincode || ""}
                                            onChange={e => setInstitute({ ...institute, address: { ...institute.address, pincode: e.target.value } })}
                                            className="w-full px-3.5 py-2 text-xs font-medium text-[#101828] bg-white border border-[#D0D5DD] rounded-lg outline-none focus:border-[#444CE7] focus:ring-4 focus:ring-[#444CE7]/10 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: Academic Sessions (Schools & Colleges) */}
                {activeTab === 'sessions' && (
                    <div className="space-y-6 animate-in fade-in duration-150">
                        <div className="pb-4 border-b border-[#E4E7EC]">
                            <h2 className="text-base font-semibold text-[#101828]">Academic Sessions</h2>
                            <p className="text-xs text-[#667085] mt-0.5">Create and manage institutional academic terms, active session selection, and term dates.</p>
                        </div>

                        <SessionManager />
                    </div>
                )}

                {/* TAB 2: Modules & Features (Flat List Rows - NO Box-in-Box!) */}
                {activeTab === 'modules' && (
                    <div className="space-y-8 animate-in fade-in duration-150">
                        <div className="pb-4 border-b border-[#E4E7EC]">
                            <h2 className="text-base font-semibold text-[#101828]">Module & Feature Toggles</h2>
                            <p className="text-xs text-[#667085] mt-0.5">Enable or disable optional modules and fee bundling rules for your campus.</p>
                        </div>

                        {/* Flat List Rows for Feature Toggles (Dividers only, zero card boxing) */}
                        <div className="divide-y divide-[#E4E7EC]">
                            {/* Transport */}
                            <div className="py-4 flex items-center justify-between gap-6">
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
                                        Transport Management
                                    </h3>
                                    <p className="text-xs text-[#667085]">
                                        Manage bus routes, vehicle assignments, and transport fee schedules.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setInstitute({
                                        ...institute,
                                        settings: {
                                            ...institute.settings,
                                            features: {
                                                ...institute.settings?.features,
                                                transport: !institute.settings?.features?.transport
                                            }
                                        }
                                    })}
                                    className={cn(
                                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                        institute.settings?.features?.transport ? "bg-[#444CE7]" : "bg-[#EAECF0]"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                            institute.settings?.features?.transport ? "translate-x-5" : "translate-x-0"
                                        )}
                                    />
                                </button>
                            </div>

                            {/* Hostel */}
                            <div className="py-4 flex items-center justify-between gap-6">
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
                                        Hostel Management
                                    </h3>
                                    <p className="text-xs text-[#667085]">
                                        Manage hostel blocks, room allotments, and residential fee structures.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setInstitute({
                                        ...institute,
                                        settings: {
                                            ...institute.settings,
                                            features: {
                                                ...institute.settings?.features,
                                                hostel: !institute.settings?.features?.hostel
                                            }
                                        }
                                    })}
                                    className={cn(
                                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                        institute.settings?.features?.hostel ? "bg-[#444CE7]" : "bg-[#EAECF0]"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                            institute.settings?.features?.hostel ? "translate-x-5" : "translate-x-0"
                                        )}
                                    />
                                </button>
                            </div>

                            {/* RTE & Scholarship */}
                            <div className="py-4 flex items-center justify-between gap-6">
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
                                        RTE & Scholarship Concessions
                                    </h3>
                                    <p className="text-xs text-[#667085]">
                                        Flag students under RTE quotas or grant customized fee concessions.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setInstitute({
                                        ...institute,
                                        settings: {
                                            ...institute.settings,
                                            features: {
                                                ...institute.settings?.features,
                                                rteAndScholarship: !institute.settings?.features?.rteAndScholarship
                                            }
                                        }
                                    })}
                                    className={cn(
                                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                        institute.settings?.features?.rteAndScholarship ? "bg-[#444CE7]" : "bg-[#EAECF0]"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                            institute.settings?.features?.rteAndScholarship ? "translate-x-5" : "translate-x-0"
                                        )}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Fee Bundling Rules */}
                        <div className="pt-6 border-t border-[#E4E7EC] space-y-4">
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#98A2B3]">Module Fee Bundling Rules</h3>
                                <p className="text-xs text-[#667085] mt-0.5">Configure how module charges are billed alongside tuition fees.</p>
                            </div>

                            <div className="divide-y divide-[#E4E7EC]">
                                <div className="py-4 flex items-center justify-between gap-6">
                                    <div className="space-y-0.5">
                                        <h4 className="text-xs font-semibold text-[#101828]">Bundle Hostel in Base Fee</h4>
                                        <p className="text-xs text-[#667085]">Includes hostel costs directly into base fee without itemized breakdown.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setInstitute({
                                            ...institute,
                                            settings: {
                                                ...institute.settings,
                                                features: {
                                                    ...institute.settings?.features,
                                                    bundleHostelInBaseFee: !(institute.settings?.features?.bundleHostelInBaseFee || institute.settings?.features?.combinedCourseFees)
                                                }
                                            }
                                        })}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            (institute.settings?.features?.bundleHostelInBaseFee || institute.settings?.features?.combinedCourseFees) ? "bg-[#444CE7]" : "bg-[#EAECF0]"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                (institute.settings?.features?.bundleHostelInBaseFee || institute.settings?.features?.combinedCourseFees) ? "translate-x-5" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>

                                <div className="py-4 flex items-center justify-between gap-6">
                                    <div className="space-y-0.5">
                                        <h4 className="text-xs font-semibold text-[#101828]">Bundle Transport in Base Fee</h4>
                                        <p className="text-xs text-[#667085]">Includes transport costs directly into base fee without itemized route billing.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setInstitute({
                                            ...institute,
                                            settings: {
                                                ...institute.settings,
                                                features: {
                                                    ...institute.settings?.features,
                                                    bundleTransportInBaseFee: !(institute.settings?.features?.bundleTransportInBaseFee || institute.settings?.features?.combinedCourseFees)
                                                }
                                            }
                                        })}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            (institute.settings?.features?.bundleTransportInBaseFee || institute.settings?.features?.combinedCourseFees) ? "bg-[#444CE7]" : "bg-[#EAECF0]"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                (institute.settings?.features?.bundleTransportInBaseFee || institute.settings?.features?.combinedCourseFees) ? "translate-x-5" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: Attendance & Hours */}
                {activeTab === 'attendance' && (
                    <div className="space-y-8 animate-in fade-in duration-150">
                        <div className="pb-4 border-b border-[#E4E7EC]">
                            <h2 className="text-base font-semibold text-[#101828]">Attendance Rules & Schedule</h2>
                            <p className="text-xs text-[#667085] mt-0.5">Configure daily scan modes, working hours, grace period, and notification triggers.</p>
                        </div>

                        {/* Tracking Mode Selection Cards (Visual Choices) */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-[#101828]">Daily Attendance Tracking Mode</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className={cn(
                                    "relative p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5",
                                    (institute.settings?.attendance?.mode || 'checkin_only') === 'checkin_only'
                                        ? "border-[#444CE7] bg-[#444CE7]/5 text-[#101828]"
                                        : "border-[#E4E7EC] bg-white text-[#667085] hover:border-slate-300"
                                )}>
                                    <input
                                        type="radio"
                                        name="attMode"
                                        value="checkin_only"
                                        checked={(institute.settings?.attendance?.mode || 'checkin_only') === 'checkin_only'}
                                        onChange={() => setInstitute({
                                            ...institute,
                                            settings: {
                                                ...institute.settings,
                                                attendance: { ...(institute.settings?.attendance || {}), mode: 'checkin_only' }
                                            }
                                        })}
                                        className="mt-0.5 accent-[#444CE7]"
                                    />
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold text-[#101828]">Single Daily Mark (Check-In Only)</p>
                                        <p className="text-xs text-[#667085] mt-1 leading-relaxed">Records entry status once per session. Ideal for coaching classes & fast entry.</p>
                                    </div>
                                    {(institute.settings?.attendance?.mode || 'checkin_only') === 'checkin_only' && (
                                        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#444CE7] text-white flex items-center justify-center shadow-xs">
                                            <Check size={12} strokeWidth={3} />
                                        </span>
                                    )}
                                </label>

                                <label className={cn(
                                    "relative p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5",
                                    institute.settings?.attendance?.mode === 'checkin_checkout'
                                        ? "border-[#444CE7] bg-[#444CE7]/5 text-[#101828]"
                                        : "border-[#E4E7EC] bg-white text-[#667085] hover:border-slate-300"
                                )}>
                                    <input
                                        type="radio"
                                        name="attMode"
                                        value="checkin_checkout"
                                        checked={institute.settings?.attendance?.mode === 'checkin_checkout'}
                                        onChange={() => setInstitute({
                                            ...institute,
                                            settings: {
                                                ...institute.settings,
                                                attendance: { ...(institute.settings?.attendance || {}), mode: 'checkin_checkout' }
                                            }
                                        })}
                                        className="mt-0.5 accent-[#444CE7]"
                                    />
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold text-[#101828]">Check-In + Check-Out (2 Scans)</p>
                                        <p className="text-xs text-[#667085] mt-1 leading-relaxed">Tracks morning arrival and evening departure times for accurate attendance duration.</p>
                                    </div>
                                    {institute.settings?.attendance?.mode === 'checkin_checkout' && (
                                        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#444CE7] text-white flex items-center justify-center shadow-xs">
                                            <Check size={12} strokeWidth={3} />
                                        </span>
                                    )}
                                </label>
                            </div>
                        </div>

                        {/* Working Hours & Grace Period */}
                        <div className="pt-6 border-t border-[#E4E7EC]">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#98A2B3] mb-4">Working Hours & Late Rules</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#101828] flex items-center gap-1.5">
                                        <Clock size={14} className="text-[#98A2B3]" /> Start Time (In Time)
                                    </label>
                                    <input
                                        type="time"
                                        value={institute.settings?.attendance?.workingHoursStart || "08:00"}
                                        onChange={e => setInstitute({
                                            ...institute,
                                            settings: {
                                                ...institute.settings,
                                                attendance: { ...(institute.settings?.attendance || {}), workingHoursStart: e.target.value }
                                            }
                                        })}
                                        className="w-full px-3.5 py-2 rounded-lg border border-[#D0D5DD] text-xs font-medium text-[#101828] focus:border-[#444CE7] focus:ring-4 focus:ring-[#444CE7]/10 outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#101828] flex items-center gap-1.5">
                                        <Clock size={14} className="text-[#98A2B3]" /> End Time (Out Time)
                                    </label>
                                    <input
                                        type="time"
                                        value={institute.settings?.attendance?.workingHoursEnd || "15:00"}
                                        onChange={e => setInstitute({
                                            ...institute,
                                            settings: {
                                                ...institute.settings,
                                                attendance: { ...(institute.settings?.attendance || {}), workingHoursEnd: e.target.value }
                                            }
                                        })}
                                        className="w-full px-3.5 py-2 rounded-lg border border-[#D0D5DD] text-xs font-medium text-[#101828] focus:border-[#444CE7] focus:ring-4 focus:ring-[#444CE7]/10 outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#101828] flex items-center gap-1.5">
                                        <Clock size={14} className="text-[#98A2B3]" /> Late Grace Period (Minutes)
                                    </label>
                                    <input
                                        type="number"
                                        min="0" max="60"
                                        value={institute.settings?.attendance?.lateGraceMinutes ?? 15}
                                        onChange={e => setInstitute({
                                            ...institute,
                                            settings: {
                                                ...institute.settings,
                                                attendance: { ...(institute.settings?.attendance || {}), lateGraceMinutes: parseInt(e.target.value) || 0 }
                                            }
                                        })}
                                        className="w-full px-3.5 py-2 rounded-lg border border-[#D0D5DD] text-xs font-medium text-[#101828] focus:border-[#444CE7] focus:ring-4 focus:ring-[#444CE7]/10 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Notifications */}
                        <div className="pt-6 border-t border-[#E4E7EC]">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#98A2B3] mb-3">Attendance Push Notification Triggers</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <label className="flex items-center gap-3 text-xs font-medium text-[#344054] cursor-pointer py-2">
                                    <input
                                        type="checkbox"
                                        checked={institute.settings?.attendance?.pushNotifications?.onPresent !== false}
                                        onChange={e => setInstitute({
                                            ...institute,
                                            settings: {
                                                ...institute.settings,
                                                attendance: {
                                                    ...(institute.settings?.attendance || {}),
                                                    pushNotifications: { ...(institute.settings?.attendance?.pushNotifications || {}), onPresent: e.target.checked }
                                                }
                                            }
                                        })}
                                        className="w-4 h-4 rounded border-[#D0D5DD] text-[#444CE7] focus:ring-[#444CE7]"
                                    />
                                    Notify on Present
                                </label>

                                <label className="flex items-center gap-3 text-xs font-medium text-[#344054] cursor-pointer py-2">
                                    <input
                                        type="checkbox"
                                        checked={institute.settings?.attendance?.pushNotifications?.onAbsent !== false}
                                        onChange={e => setInstitute({
                                            ...institute,
                                            settings: {
                                                ...institute.settings,
                                                attendance: {
                                                    ...(institute.settings?.attendance || {}),
                                                    pushNotifications: { ...(institute.settings?.attendance?.pushNotifications || {}), onAbsent: e.target.checked }
                                                }
                                            }
                                        })}
                                        className="w-4 h-4 rounded border-[#D0D5DD] text-[#444CE7] focus:ring-[#444CE7]"
                                    />
                                    Notify on Absent
                                </label>

                                <label className="flex items-center gap-3 text-xs font-medium text-[#344054] cursor-pointer py-2">
                                    <input
                                        type="checkbox"
                                        checked={institute.settings?.attendance?.pushNotifications?.onLate !== false}
                                        onChange={e => setInstitute({
                                            ...institute,
                                            settings: {
                                                ...institute.settings,
                                                attendance: {
                                                    ...(institute.settings?.attendance || {}),
                                                    pushNotifications: { ...(institute.settings?.attendance?.pushNotifications || {}), onLate: e.target.checked }
                                                }
                                            }
                                        })}
                                        className="w-4 h-4 rounded border-[#D0D5DD] text-[#444CE7] focus:ring-[#444CE7]"
                                    />
                                    Notify on Late
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 4: Receipts & Templates */}
                {activeTab === 'receipts' && (
                    <div className="space-y-8 animate-in fade-in duration-150">
                        <div className="pb-4 border-b border-[#E4E7EC]">
                            <h2 className="text-base font-semibold text-[#101828]">Fee Receipts & Certificate Design</h2>
                            <p className="text-xs text-[#667085] mt-0.5">Configure fee receipt layouts and custom certificate templates.</p>
                        </div>

                        {/* Receipt Design Selection */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-[#101828]">Fee Receipt Template Selection</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setInstitute({ ...institute, settings: { ...institute.settings, receiptTemplate: 'classic' } })}
                                    className={cn(
                                        "relative flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all cursor-pointer",
                                        institute.settings?.receiptTemplate === 'classic'
                                            ? "border-[#444CE7] bg-[#444CE7]/5"
                                            : "border-[#E4E7EC] bg-white hover:border-slate-300"
                                    )}
                                >
                                    <div className="w-16 h-20 bg-[#F9FAFB] rounded-lg flex flex-col p-1.5 border border-[#E4E7EC] shrink-0">
                                        <div className="h-2 w-1/2 bg-slate-300 rounded mb-1" />
                                        <div className="h-1.5 w-full bg-slate-200 rounded mb-1" />
                                        <div className="h-6 w-full bg-white rounded mt-auto border border-slate-200" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xs font-semibold text-[#101828]">Classic Full-Page Receipt</h3>
                                        <p className="text-xs text-[#667085] mt-1 leading-relaxed">Full A4 size layout showing itemized fee breakdown, logo, and terms.</p>
                                    </div>
                                    {institute.settings?.receiptTemplate === 'classic' && (
                                        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#444CE7] text-white flex items-center justify-center shadow-xs">
                                            <Check size={12} strokeWidth={3} />
                                        </span>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setInstitute({ ...institute, settings: { ...institute.settings, receiptTemplate: 'compact' } })}
                                    className={cn(
                                        "relative flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all cursor-pointer",
                                        institute.settings?.receiptTemplate === 'compact'
                                            ? "border-[#444CE7] bg-[#444CE7]/5"
                                            : "border-[#E4E7EC] bg-white hover:border-slate-300"
                                    )}
                                >
                                    <div className="w-16 h-20 bg-[#F9FAFB] rounded-lg flex flex-col p-1.5 border border-[#E4E7EC] shrink-0 justify-center">
                                        <div className="h-8 w-full bg-white rounded border border-slate-200 p-1 flex flex-col justify-between">
                                            <div className="h-1.5 w-1/2 bg-slate-300 rounded" />
                                            <div className="h-1.5 w-full bg-slate-200 rounded" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xs font-semibold text-[#101828]">Compact Slip-Style Receipt</h3>
                                        <p className="text-xs text-[#667085] mt-1 leading-relaxed">Compact half-page receipt slip designed for quick printing and paper saving.</p>
                                    </div>
                                    {institute.settings?.receiptTemplate === 'compact' && (
                                        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#444CE7] text-white flex items-center justify-center shadow-xs">
                                            <Check size={12} strokeWidth={3} />
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Certificate Templates */}
                        <div className="space-y-6 pt-6 border-t border-[#E4E7EC]">
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#98A2B3] mb-4">Image-Based Certificate Templates</h3>
                                <CertificateTemplateManager />
                            </div>
                            <div className="pt-6 border-t border-[#E4E7EC]">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#98A2B3] mb-4">HTML Certificate Templates</h3>
                                <HtmlCertificateEditor />
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 5: Downloads & Tools */}
                {activeTab === 'tools' && (
                    <div className="space-y-8 animate-in fade-in duration-150">
                        <div className="pb-4 border-b border-[#E4E7EC]">
                            <h2 className="text-base font-semibold text-[#101828]">Mobile Apps & Import Tools</h2>
                            <p className="text-xs text-[#667085] mt-0.5">Download the mobile Flutter app or standardized Excel templates for bulk data import.</p>
                        </div>

                        {/* Mobile Flutter App Download Card (Single Distinct Dark Surface) */}
                        <div className="p-6 rounded-2xl bg-[#101828] text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
                                    <Smartphone size={22} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-white">Flutter Student Mobile App (Android APK)</h3>
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-[#444CE7] text-white rounded-full">v0.1.0+1</span>
                                    </div>
                                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                        Direct release APK build for Android devices (~61.9 MB). Share this URL with students or staff to install the app instantly.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const downloadUrl = `${window.location.origin}/api/v1/app/download`;
                                        navigator.clipboard.writeText(downloadUrl);
                                        toast.success("APK download link copied to clipboard!");
                                    }}
                                    className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/10 text-white font-semibold text-xs rounded-lg hover:bg-white/20 transition-colors cursor-pointer border border-white/10"
                                >
                                    <Copy size={14} />
                                    Copy Link
                                </button>
                                <a
                                    href="/api/v1/app/download"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#444CE7] hover:bg-[#3538CD] text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                                >
                                    <Download size={14} />
                                    Download APK
                                </a>
                            </div>
                        </div>

                        {/* Excel Bulk Import Template */}
                        <div className="p-5 rounded-xl border border-[#E4E7EC] bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xs font-semibold text-[#101828]">Bulk Student Import Excel Template</h3>
                                <p className="text-xs text-[#667085] mt-0.5">
                                    Download the standardized Excel spreadsheet with required headers (FirstName, LastName, Email, Phone) to bulk import students.
                                </p>
                            </div>
                            <a
                                href="/api/v1/students/template"
                                target="_blank"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#101828] font-semibold text-xs rounded-lg border border-[#D0D5DD] hover:bg-slate-50 transition-colors shrink-0"
                            >
                                <Download size={14} className="text-[#667085]" />
                                Download Excel Template
                            </a>
                        </div>
                    </div>
                )}

                {/* TAB 6: Integrations & BY-API */}
                {activeTab === 'apis' && (
                    <div className="space-y-6 animate-in fade-in duration-150">
                        <div className="pb-4 border-b border-[#E4E7EC]">
                            <h2 className="text-base font-semibold text-[#101828]">Integrations & BY-APIs</h2>
                            <p className="text-xs text-[#667085] mt-0.5">Configure custom Cloudinary storage, SMS gateways, and Pusher WebSocket keys.</p>
                        </div>

                        {/* API Sub-tabs (Underline Style) */}
                        <div className="border-b border-[#E4E7EC]">
                            <nav className="flex space-x-6 pb-px" aria-label="API Integration Sub-tabs">
                                <button
                                    type="button"
                                    onClick={() => setActiveApiTab('cloudinary')}
                                    className={cn(
                                        "py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer",
                                        activeApiTab === 'cloudinary'
                                            ? "border-[#444CE7] text-[#101828]"
                                            : "border-transparent text-[#667085] hover:text-[#101828]"
                                    )}
                                >
                                    Cloudinary Storage
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveApiTab('msg91')}
                                    className={cn(
                                        "py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer",
                                        activeApiTab === 'msg91'
                                            ? "border-[#444CE7] text-[#101828]"
                                            : "border-transparent text-[#667085] hover:text-[#101828]"
                                    )}
                                >
                                    Notification Gateways
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveApiTab('pusher')}
                                    className={cn(
                                        "py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer",
                                        activeApiTab === 'pusher'
                                            ? "border-[#444CE7] text-[#101828]"
                                            : "border-transparent text-[#667085] hover:text-[#101828]"
                                    )}
                                >
                                    Pusher WebSockets & Beams
                                </button>
                            </nav>
                        </div>

                        {/* Sub-tab Content */}
                        <div className="pt-2">
                            {activeApiTab === 'cloudinary' && <CloudinarySettingsForm />}
                            {activeApiTab === 'msg91' && <NotificationSettingsForm />}
                            {activeApiTab === 'pusher' && <PusherSettingsForm />}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
