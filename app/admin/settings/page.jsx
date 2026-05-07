"use client";

import { useState, useEffect } from "react";
import { Upload, Save, Building, Globe, Mail, Phone, MapPin, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import Input from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import CertificateTemplateManager from "@/components/admin/CertificateTemplateManager";
import HtmlCertificateEditor from "@/components/admin/HtmlCertificateEditor";
import SessionManager from "@/components/admin/SessionManager";

export default function SettingsPage() {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form State
    const [institute, setInstitute] = useState({
        name: "",
        contactEmail: "",
        contactPhone: "",
        website: "",
        address: {
            street: "",
            city: "",
            state: "",
            pincode: ""
        },
        branding: {
            logo: ""
        },
        type: "VOCATIONAL",
        settings: {
            receiptTemplate: "classic"
        }
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/v1/institute");
            if (res.ok) {
                const data = await res.json();
                // Merge with default structure to avoid undefined errors
                setInstitute(prev => ({
                    ...prev,
                    ...data.institute,
                    address: { ...prev.address, ...(data.institute?.address || {}) },
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

        // basic validation
        if (file.size > 2 * 1024 * 1024) {
            toast.error("File size must be less than 2MB");
            e.target.value = ""; // Clear input to allow re-selection
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

            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (err) {
                console.error("Failed to parse upload response:", text);
                throw new Error("Server returned an invalid response");
            }

            if (res.ok) {
                setInstitute(prev => ({
                    ...prev,
                    branding: { ...prev.branding, logo: data.url }
                }));
                toast.success("Logo uploaded successfully");
            } else {
                toast.error(data.error || "Upload failed");
                e.target.value = ""; // Clear input on failure checks
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error(error.message || "Upload failed");
            e.target.value = ""; // Clear input on exception
        } finally {
            setUploading(false);
        }
    };
    const handleSubmit = async (e) => {
         e.preventDefault();
         setIsSaving(true);
         try {
             // Don't send type field from admin - it's immutable and set by super admin
             const { type, ...dataToSend } = institute;
             
             const res = await fetch("/api/v1/institute", {
                 method: "PATCH",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify(dataToSend)
             });

             const data = await res.json();
             if (res.ok) {
                 toast.success("Settings saved successfully");
             } else {
                 toast.error(data.error || "Failed to save settings");
             }
         } catch (error) {
             console.error("Save error:", error);
             toast.error("Failed to save settings");
         } finally {
             setIsSaving(false);
         }
     };


    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-premium-blue" /></div>;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Page Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Institute Settings</h1>
                    <p className="text-[12px] text-slate-400 font-medium tracking-tight">Manage institute branding, contacts and system preferences</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Branding Section */}
                <Card title="Branding">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="flex-1 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Institute Name</label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        required
                                        type="text"
                                        value={institute.name}
                                        onChange={e => setInstitute({ ...institute, name: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all font-medium"
                                        placeholder="Institute Name"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                 <label className="text-sm font-bold text-slate-700">Institute Type</label>
                                 <div className="p-3 rounded-xl border-2 border-slate-200 bg-slate-50">
                                     <div className="flex items-center justify-between">
                                         <div>
                                             <p className="text-sm font-bold text-slate-700">
                                                 {institute.type === 'SCHOOL' ? 'School' : 'Vocational / Coaching'}
                                             </p>
                                             <p className="text-[10px] text-slate-500 font-medium italic mt-1">
                                                 Set by Super Admin (read-only)
                                             </p>
                                         </div>
                                         <div className="px-3 py-1.5 bg-slate-200 rounded-lg">
                                             <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                                 {institute.type || 'VOCATIONAL'}
                                             </span>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Website</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="url"
                                        value={institute.website || ""}
                                        onChange={e => setInstitute({ ...institute, website: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-premium-blue focus:ring-4 focus:ring-premium-blue/10 outline-none transition-all font-medium"
                                        placeholder="https://example.com"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Logo Upload */}
                        <div className="w-full md:w-auto flex flex-col items-center">
                            <span className="text-sm font-bold text-slate-700 mb-2">Institute Logo</span>
                            <div className="relative group w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden hover:border-premium-blue transition-colors">
                                {isValidImageUrl(institute.branding?.logo) ? (
                                    <img src={institute.branding.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <Building className="text-slate-300" size={32} />
                                )}

                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    {uploading ? (
                                        <Loader2 className="animate-spin text-white mb-1" size={24} />
                                    ) : (
                                        <>
                                            <Upload className="text-white mb-1" size={24} />
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
                            <p className="text-[10px] text-slate-400 mt-2 font-medium">Recorded on Receipts</p>
                        </div>
                    </div>
                </Card>

                {/* Contact Information */}
                <Card title="Contact Details">
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
                </Card>

                {/* Address */}
                <Card title="Address">
                    <div className="space-y-4">
                        <Input
                            label="Street Address" icon={MapPin}
                            value={institute.address?.street || ""}
                            onChange={e => setInstitute({ ...institute, address: { ...institute.address, street: e.target.value } })}
                        />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                </Card>

                {/* Module Toggles (Vocational Only) */}
                {institute.type !== 'SCHOOL' && (
                    <Card title="Module Toggles">
                        <div className="space-y-4">
                            <p className="text-xs text-slate-500 font-medium -mt-2">Enable or disable optional features for your institute.</p>
                            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-700">Transport Management</h4>
                                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">Manage routes, vehicles, drivers and transport fees</p>
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
                                        "relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0",
                                        institute.settings?.features?.transport ? "bg-emerald-500" : "bg-slate-200"
                                    )}
                                >
                                    <span className={cn(
                                        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200",
                                        institute.settings?.features?.transport ? "translate-x-6" : "translate-x-0"
                                    )} />
                                </button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Receipt Settings */}
                <Card title="Fee Receipt Settings">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-slate-700">Receipt Design Template</label>
                                <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Receipt Design Template">
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={institute.settings?.receiptTemplate === 'classic'}
                                        onClick={() => setInstitute({ ...institute, settings: { ...institute.settings, receiptTemplate: 'classic' } })}
                                        className={cn(
                                            "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                                            institute.settings?.receiptTemplate === 'classic'
                                                ? "border-premium-blue bg-premium-blue/5"
                                                : "border-slate-100 hover:border-slate-200"
                                        )}
                                    >
                                        <div className="w-full aspect-[3/4] bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 shadow-inner">
                                            <div className="w-4/5 h-4/5 bg-white shadow-sm flex flex-col gap-1 p-2">
                                                <div className="h-2 w-1/3 bg-slate-100 mb-1" />
                                                <div className="h-1 w-full bg-slate-50" />
                                                <div className="h-5 w-full bg-slate-50 mt-auto" />
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wider">Classic Full</span>
                                    </button>
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={institute.settings?.receiptTemplate === 'compact'}
                                        onClick={() => setInstitute({ ...institute, settings: { ...institute.settings, receiptTemplate: 'compact' } })}
                                        className={cn(
                                            "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                                            institute.settings?.receiptTemplate === 'compact'
                                                ? "border-premium-blue bg-premium-blue/5"
                                                : "border-slate-100 hover:border-slate-200"
                                        )}
                                    >
                                        <div className="w-full aspect-[3/4] bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 shadow-inner">
                                            <div className="w-4/5 h-1/2 bg-white shadow-sm flex flex-col gap-1 p-2">
                                                <div className="h-1 w-1/3 bg-slate-100 mb-1" />
                                                <div className="h-4 w-full bg-slate-50 mt-auto" />
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wider">Compact Slip</span>
                                    </button>
                                </div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-3">Layout Details</h4>
                                <ul className="space-y-2">
                                    <li className="flex items-start gap-2 text-xs font-medium text-slate-500">
                                        <div className="w-1.5 h-1.5 rounded-full bg-premium-blue mt-1 shrink-0" />
                                        <span>{institute.settings?.receiptTemplate === 'classic' ? 'Professional full-page layout' : 'Compact slip-style layout (50% A4 height)'}</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-xs font-medium text-slate-500">
                                        <div className="w-1.5 h-1.5 rounded-full bg-premium-blue mt-1 shrink-0" />
                                        <span>Showcases institute logo and branding</span>
                                    </li>
                                    {institute.settings?.receiptTemplate === 'compact' && (
                                        <li className="flex items-start gap-2 text-xs font-bold text-amber-600">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                                            <span>Option to print 2 slips per A4 page</span>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Data Management */}
                    <Card title="Data Management">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-bold text-slate-700">Bulk Student Import Template</h4>
                                <p className="text-xs text-slate-500 max-w-sm mt-1">
                                    Download the standardized Excel template with required headers (FirstName, LastName, Email, etc.) to bulk upload students.
                                </p>
                            </div>
                            <a
                                href="/api/v1/students/template"
                                target="_blank"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 font-bold text-sm rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                Download Template
                            </a>
                        </div>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isSaving || uploading} className="px-8">
                            {isSaving ? (
                                <>
                                    <Loader2 className="animate-spin mr-2" size={18} /> Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2" size={18} /> Save Settings
                                </>
                            )}
                        </Button>
                    </div>

            </form>

            {/* Academic Sessions - Only for Schools */}
            {institute.type === 'SCHOOL' && (
                <div className="space-y-6 border-t border-slate-200 pt-8">
                    <SessionManager />
                </div>
            )}

            {/* Certificate Templates - Outside Form */}
            <div className="space-y-8 border-t border-slate-200 pt-8">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Image-Based Templates</h3>
                    <CertificateTemplateManager />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">HTML Certificate Templates</h3>
                    <HtmlCertificateEditor />
                </div>
            </div>
        
        </div>
    );
}
