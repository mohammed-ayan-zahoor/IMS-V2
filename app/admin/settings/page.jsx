"use client";

import { useState, useEffect } from "react";
import {
    Upload, Save, Building, Globe, Mail, Phone, MapPin, Loader2, Hotel,
    Award, Clock, Bell, Smartphone, Download, Copy, Sliders, FileText,
    KeyRound, CheckCircle2, ShieldCheck, Check, Sparkles, Layers, Calendar
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
    const [activeTab, setActiveTab] = useState('general'); // general | modules | attendance | receipts | tools | apis
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
                <Loader2 className="animate-spin text-premium-blue" size={32} />
                <span className="text-xs font-semibold text-slate-500">Loading institute settings…</span>
            </div>
        );
    }

    const hasAcademicStructure = institute.type === 'SCHOOL' || institute.type === 'COLLEGE';

    const NAV_TABS = [
        { id: 'general', label: 'General & Profile', icon: Building, desc: 'Name, logo, contact & address' },
        ...(hasAcademicStructure ? [
            { id: 'sessions', label: 'Academic Sessions', icon: Calendar, desc: 'Terms, years & active session' }
        ] : []),
        { id: 'modules', label: 'Modules & Features', icon: Sliders, desc: 'Transport, hostel & fee options' },
        { id: 'attendance', label: 'Attendance & Hours', icon: Clock, desc: 'Tracking mode, rules & alerts' },
        { id: 'receipts', label: 'Receipts & Templates', icon: FileText, desc: 'Slips & certificate templates' },
        { id: 'tools', label: 'Downloads & Tools', icon: Smartphone, desc: 'Flutter APK & import template' },
        { id: 'apis', label: 'Integrations & BY-API', icon: KeyRound, desc: 'Cloudinary, MSG91 & Pusher' },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
            {/* Sticky Action Bar */}
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Building className="text-slate-800" size={22} />
                        Institute Settings
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Configure institutional profile, feature toggles, automation rules, and integrations.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={fetchSettings}
                        disabled={isSaving || uploading}
                    >
                        Reset
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSaving || uploading}
                        className="flex items-center gap-1.5"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="animate-spin" size={16} /> Saving…
                            </>
                        ) : (
                            <>
                                <Save size={16} /> Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Layout Grid: Sidebar Navigation + Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Sleek Vertical Navigation Sidebar */}
                <div className="lg:col-span-3 space-y-1 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
                    {NAV_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "w-full text-left p-3 rounded-xl transition-all duration-200 flex items-start gap-3 group relative",
                                    isActive
                                        ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                                )}
                            >
                                <Icon size={18} className={cn("mt-0.5 shrink-0 transition-colors", isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-600")} />
                                <div>
                                    <p className="text-xs font-bold leading-tight">{tab.label}</p>
                                    <p className={cn("text-[10px] font-medium mt-0.5 leading-tight", isActive ? "text-slate-400" : "text-slate-400")}>
                                        {tab.desc}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Main Settings Panel Container */}
                <div className="lg:col-span-9 bg-white border border-slate-200/80 rounded-2xl shadow-xs p-6 md:p-8 space-y-8">
                    
                    {/* TAB 1: General & Profile */}
                    {activeTab === 'general' && (
                        <div className="space-y-8 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900">General Profile & Branding</h3>
                                <p className="text-xs text-slate-500 font-medium">Update primary institute name, logo, contact details, and registered address.</p>
                            </div>

                            {/* Logo & Identity Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl bg-slate-50/70 border border-slate-100">
                                <div className="flex flex-col items-center justify-center text-center">
                                    <span className="text-xs font-bold text-slate-700 mb-2">Institute Logo</span>
                                    <div className="relative group w-32 h-24 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-white overflow-hidden hover:border-blue-500 transition-colors">
                                        {isValidImageUrl(institute.branding?.logo) ? (
                                            <img src={institute.branding.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <Building className="text-slate-300" size={28} />
                                        )}
                                        <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            {uploading ? (
                                                <Loader2 className="animate-spin text-white mb-1" size={18} />
                                            ) : (
                                                <>
                                                    <Upload className="text-white mb-1" size={18} />
                                                    <span className="text-[9px] font-bold text-white uppercase tracking-wider">Upload Logo</span>
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
                                    <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Printed on official receipts & ID cards</p>
                                </div>

                                <div className="md:col-span-2 space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">Institute Name</label>
                                        <div className="relative">
                                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                required
                                                type="text"
                                                value={institute.name}
                                                onChange={e => setInstitute({ ...institute, name: e.target.value })}
                                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all text-xs font-semibold text-slate-800"
                                                placeholder="Institute Name"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Institute Type</label>
                                            <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center">
                                                <span className="text-xs font-semibold text-slate-800">
                                                    {institute.type === 'COLLEGE' ? 'College / Higher-Ed' : (institute.type === 'SCHOOL' ? 'School / K-12' : 'Vocational / Coaching')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Official Website</label>
                                            <div className="relative">
                                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="url"
                                                    value={institute.website || ""}
                                                    onChange={e => setInstitute({ ...institute, website: e.target.value })}
                                                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all text-xs font-semibold text-slate-800"
                                                    placeholder="https://example.com"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Details */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Contact Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Contact Email" icon={Mail}
                                        value={institute.contactEmail}
                                        onChange={e => setInstitute({ ...institute, contactEmail: e.target.value })}
                                        placeholder="admin@institute.com"
                                    />
                                    <Input
                                        label="Contact Phone" icon={Phone}
                                        value={institute.contactPhone || ""}
                                        onChange={e => setInstitute({ ...institute, contactPhone: e.target.value })}
                                        placeholder="+91 98765 43210"
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Postal Address</h4>
                                <div className="space-y-4">
                                    <Input
                                        label="Street Address" icon={MapPin}
                                        value={institute.address?.street || ""}
                                        onChange={e => setInstitute({ ...institute, address: { ...institute.address, street: e.target.value } })}
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <Input
                                            label="City"
                                            value={institute.address?.city || ""}
                                            onChange={e => setInstitute({ ...institute, address: { ...institute.address, city: e.target.value } })}
                                        />
                                        <Input
                                            label="State"
                                            value={institute.address?.state || ""}
                                            onChange={e => setInstitute({ ...institute, address: { ...institute.address, state: e.target.value } })}
                                        />
                                        <Input
                                            label="Pincode"
                                            value={institute.address?.pincode || ""}
                                            onChange={e => setInstitute({ ...institute, address: { ...institute.address, pincode: e.target.value } })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: Academic Sessions (Schools & Colleges) */}
                    {activeTab === 'sessions' && (
                        <div className="space-y-8 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900">Academic Sessions</h3>
                                <p className="text-xs text-slate-500 font-medium">Create and manage institutional academic terms, active session selection, and term dates.</p>
                            </div>

                            <SessionManager />
                        </div>
                    )}

                    {/* TAB 2: Modules & Features */}
                    {activeTab === 'modules' && (
                        <div className="space-y-8 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900">Module & Feature Toggles</h3>
                                <p className="text-xs text-slate-500 font-medium">Enable or disable optional modules and fee bundling rules for your campus.</p>
                            </div>

                            <div className="space-y-4">
                                {/* Transport */}
                                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-slate-300 transition-all">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-900">Transport Management</h4>
                                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Manage bus routes, vehicle assignments, and transport fee schedules.</p>
                                        </div>
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
                                            "relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 cursor-pointer",
                                            institute.settings?.features?.transport ? "bg-emerald-500" : "bg-slate-300"
                                        )}
                                    >
                                        <span className={cn(
                                            "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200",
                                            institute.settings?.features?.transport ? "translate-x-5" : "translate-x-0"
                                        )} />
                                    </button>
                                </div>

                                {/* Hostel */}
                                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-slate-300 transition-all">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                                            <Hotel size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-900">Hostel Management</h4>
                                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Manage hostel blocks, room allotments, and residential fee structures.</p>
                                        </div>
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
                                            "relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 cursor-pointer",
                                            institute.settings?.features?.hostel ? "bg-emerald-500" : "bg-slate-300"
                                        )}
                                    >
                                        <span className={cn(
                                            "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200",
                                            institute.settings?.features?.hostel ? "translate-x-5" : "translate-x-0"
                                        )} />
                                    </button>
                                </div>

                                {/* RTE & Scholarship */}
                                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-slate-300 transition-all">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                                            <Award size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-900">RTE & Scholarship Concessions</h4>
                                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Flag students under RTE quotas or grant customized fee concessions.</p>
                                        </div>
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
                                            "relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 cursor-pointer",
                                            institute.settings?.features?.rteAndScholarship ? "bg-emerald-500" : "bg-slate-300"
                                        )}
                                    >
                                        <span className={cn(
                                            "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200",
                                            institute.settings?.features?.rteAndScholarship ? "translate-x-5" : "translate-x-0"
                                        )} />
                                    </button>
                                </div>
                            </div>

                            {/* Fee Bundling Rules */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Module Fee Bundling Rules</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
                                        <div>
                                            <h5 className="text-xs font-bold text-slate-900">Bundle Hostel in Base Fee</h5>
                                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Includes hostel costs in tuition fee without itemized breakdown.</p>
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
                                                "relative w-10 h-5.5 rounded-full transition-colors duration-200 shrink-0 cursor-pointer mt-0.5",
                                                (institute.settings?.features?.bundleHostelInBaseFee || institute.settings?.features?.combinedCourseFees) ? "bg-emerald-500" : "bg-slate-300"
                                            )}
                                        >
                                            <span className={cn(
                                                "absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform duration-200",
                                                (institute.settings?.features?.bundleHostelInBaseFee || institute.settings?.features?.combinedCourseFees) ? "translate-x-4.5" : "translate-x-0"
                                            )} />
                                        </button>
                                    </div>

                                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
                                        <div>
                                            <h5 className="text-xs font-bold text-slate-900">Bundle Transport in Base Fee</h5>
                                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Includes transport costs in tuition fee without separate route billing.</p>
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
                                                "relative w-10 h-5.5 rounded-full transition-colors duration-200 shrink-0 cursor-pointer mt-0.5",
                                                (institute.settings?.features?.bundleTransportInBaseFee || institute.settings?.features?.combinedCourseFees) ? "bg-emerald-500" : "bg-slate-300"
                                            )}
                                        >
                                            <span className={cn(
                                                "absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform duration-200",
                                                (institute.settings?.features?.bundleTransportInBaseFee || institute.settings?.features?.combinedCourseFees) ? "translate-x-4.5" : "translate-x-0"
                                            )} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: Attendance & Hours */}
                    {activeTab === 'attendance' && (
                        <div className="space-y-8 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900">Attendance Rules & Schedule</h3>
                                <p className="text-xs text-slate-500 font-medium">Configure daily scan modes, working hours, grace period, and notification triggers.</p>
                            </div>

                            {/* Tracking Mode */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-800">Daily Attendance Tracking Mode</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className={cn(
                                        "p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3",
                                        (institute.settings?.attendance?.mode || 'checkin_only') === 'checkin_only'
                                            ? "border-premium-blue bg-blue-50/40 text-slate-900"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
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
                                            className="mt-0.5 accent-premium-blue"
                                        />
                                        <div>
                                            <p className="text-xs font-bold text-slate-900">Single Daily Mark (Check-In Only)</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Records entry status once per session. Ideal for coaching classes & quick marking.</p>
                                        </div>
                                    </label>

                                    <label className={cn(
                                        "p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3",
                                        institute.settings?.attendance?.mode === 'checkin_checkout'
                                            ? "border-premium-blue bg-blue-50/40 text-slate-900"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
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
                                            className="mt-0.5 accent-premium-blue"
                                        />
                                        <div>
                                            <p className="text-xs font-bold text-slate-900">Check-In + Check-Out (2 Scans)</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Tracks morning arrival and evening departure times for accurate attendance duration.</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Working Hours & Grace Period */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                        <Clock size={14} className="text-slate-400" /> Start Time (In Time)
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
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:border-premium-blue outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                        <Clock size={14} className="text-slate-400" /> End Time (Out Time)
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
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:border-premium-blue outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                        <Clock size={14} className="text-slate-400" /> Late Grace Period (Minutes)
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
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:border-premium-blue outline-none"
                                    />
                                </div>
                            </div>

                            {/* Notifications */}
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Attendance Push Notifications</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
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
                                            className="rounded text-premium-blue accent-premium-blue"
                                        />
                                        Notify on Present
                                    </label>

                                    <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
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
                                            className="rounded text-premium-blue accent-premium-blue"
                                        />
                                        Notify on Absent
                                    </label>

                                    <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
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
                                            className="rounded text-premium-blue accent-premium-blue"
                                        />
                                        Notify on Late
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: Receipts & Templates */}
                    {activeTab === 'receipts' && (
                        <div className="space-y-8 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900">Fee Receipts & Certificate Design</h3>
                                <p className="text-xs text-slate-500 font-medium">Configure fee receipt layouts, custom certificate templates, and academic sessions.</p>
                            </div>

                            {/* Receipt Design Selection */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Fee Receipt Template Selection</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setInstitute({ ...institute, settings: { ...institute.settings, receiptTemplate: 'classic' } })}
                                        className={cn(
                                            "flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all cursor-pointer",
                                            institute.settings?.receiptTemplate === 'classic'
                                                ? "border-premium-blue bg-blue-50/30 shadow-xs"
                                                : "border-slate-200 hover:border-slate-300"
                                        )}
                                    >
                                        <div className="w-16 h-20 bg-slate-100 rounded-lg flex flex-col p-1.5 border border-slate-200 shrink-0">
                                            <div className="h-2 w-1/2 bg-slate-300 rounded mb-1" />
                                            <div className="h-1.5 w-full bg-slate-200 rounded mb-1" />
                                            <div className="h-6 w-full bg-white rounded mt-auto border border-slate-200" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h5 className="text-xs font-bold text-slate-900">Classic Full-Page Receipt</h5>
                                                {institute.settings?.receiptTemplate === 'classic' && (
                                                    <CheckCircle2 size={14} className="text-premium-blue" />
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-1">Full A4 size layout showing itemized fee breakdown, logo, and terms.</p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setInstitute({ ...institute, settings: { ...institute.settings, receiptTemplate: 'compact' } })}
                                        className={cn(
                                            "flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all cursor-pointer",
                                            institute.settings?.receiptTemplate === 'compact'
                                                ? "border-premium-blue bg-blue-50/30 shadow-xs"
                                                : "border-slate-200 hover:border-slate-300"
                                        )}
                                    >
                                        <div className="w-16 h-20 bg-slate-100 rounded-lg flex flex-col p-1.5 border border-slate-200 shrink-0 justify-center">
                                            <div className="h-8 w-full bg-white rounded border border-slate-200 p-1 flex flex-col justify-between">
                                                <div className="h-1.5 w-1/2 bg-slate-300 rounded" />
                                                <div className="h-1.5 w-full bg-slate-200 rounded" />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h5 className="text-xs font-bold text-slate-900">Compact Slip-Style Receipt</h5>
                                                {institute.settings?.receiptTemplate === 'compact' && (
                                                    <CheckCircle2 size={14} className="text-premium-blue" />
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-1">Compact half-page receipt slip designed for quick printing and paper saving.</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Certificate Templates */}
                            <div className="space-y-6 pt-4 border-t border-slate-100">
                                <div>
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Image-Based Certificate Templates</h4>
                                    <CertificateTemplateManager />
                                </div>
                                <div>
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">HTML Certificate Templates</h4>
                                    <HtmlCertificateEditor />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 5: Downloads & Tools */}
                    {activeTab === 'tools' && (
                        <div className="space-y-8 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900">Mobile Apps & Import Tools</h3>
                                <p className="text-xs text-slate-500 font-medium">Download the mobile Flutter app or standardized Excel templates for bulk data import.</p>
                            </div>

                            {/* Mobile Flutter App Download Card */}
                            <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
                                        <Smartphone size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-bold text-white">Flutter Student Mobile App (Android APK)</h4>
                                            <span className="px-2 py-0.5 text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">v0.1.0+1</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">
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
                                        className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 hover:bg-slate-700 transition-all cursor-pointer"
                                    >
                                        <Copy size={15} />
                                        Copy Link
                                    </button>
                                    <a
                                        href="/api/v1/app/download"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-500 transition-all shadow-md shadow-blue-500/25"
                                    >
                                        <Download size={15} />
                                        Download APK
                                    </a>
                                </div>
                            </div>

                            {/* Excel Bulk Import Template */}
                            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900">Bulk Student Import Excel Template</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Download the standardized Excel spreadsheet with required headers (FirstName, LastName, Email, Phone) to bulk import students.
                                    </p>
                                </div>
                                <a
                                    href="/api/v1/students/template"
                                    target="_blank"
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-700 font-bold text-xs rounded-xl border border-slate-200 hover:bg-emerald-50 transition-colors shadow-xs shrink-0"
                                >
                                    <Download size={15} className="text-emerald-600" />
                                    Download Excel Template
                                </a>
                            </div>
                        </div>
                    )}

                    {/* TAB 6: Integrations & BY-API */}
                    {activeTab === 'apis' && (
                        <div className="space-y-8 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900">Integrations & BY-APIs</h3>
                                <p className="text-xs text-slate-500 font-medium">Configure custom Cloudinary storage, SMS gateways, and Pusher WebSocket keys.</p>
                            </div>

                            {/* API Sub-tabs */}
                            <div className="flex space-x-1 border-b border-slate-200 pb-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveApiTab('cloudinary')}
                                    className={cn(
                                        "px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer",
                                        activeApiTab === 'cloudinary'
                                            ? "bg-slate-900 text-white"
                                            : "text-slate-500 hover:bg-slate-100"
                                    )}
                                >
                                    Cloudinary Storage
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveApiTab('msg91')}
                                    className={cn(
                                        "px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer",
                                        activeApiTab === 'msg91'
                                            ? "bg-slate-900 text-white"
                                            : "text-slate-500 hover:bg-slate-100"
                                    )}
                                >
                                    Notification Gateways
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveApiTab('pusher')}
                                    className={cn(
                                        "px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer",
                                        activeApiTab === 'pusher'
                                            ? "bg-slate-900 text-white"
                                            : "text-slate-500 hover:bg-slate-100"
                                    )}
                                >
                                    Pusher WebSockets & Beams
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="pt-2">
                                {activeApiTab === 'cloudinary' && <CloudinarySettingsForm />}
                                {activeApiTab === 'msg91' && <NotificationSettingsForm />}
                                {activeApiTab === 'pusher' && <PusherSettingsForm />}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
