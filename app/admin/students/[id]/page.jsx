"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    BookOpen,
    CreditCard,
    Clock,
    ArrowLeft,
    Shield,
    FileText
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

export default function StudentDetailsPage({ params }) {
    const router = useRouter();
    // Unwrap params using React.use() for Next.js 15+ compatibility if needed, 
    // but standard props work in 14. safe to treat as promise in newer versions.
    // For now assuming standard pattern.
    const { id } = use(params);

    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("profile"); // profile, academic, financial

    useEffect(() => {
        fetchStudentDetails();
    }, [id]);

    const fetchStudentDetails = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/v1/students/${id}`);
            if (res.ok) {
                const data = await res.json();
                setStudentData(data);
            } else {
                console.error("Failed to fetch student");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner fullPage />;
    if (!studentData) return <div className="p-10 text-center text-slate-400">Student not found</div>;

    const { student, batches, fees } = studentData;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
                    <ArrowLeft size={18} />
                    <span className="ml-2">Back</span>
                </Button>
            </div>

            {/* Profile Header Card */}
            <Card className="border-transparent shadow-sm bg-gradient-to-r from-white to-slate-50">
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start">
                    <div className="w-24 h-24 rounded-2xl bg-premium-blue/10 flex items-center justify-center text-premium-blue text-4xl font-bold border border-premium-blue/20 shadow-blue-500/10 shadow-lg">
                        {student.profile?.firstName?.[0]}
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{student.fullName}</h1>
                            <Badge variant={student.isActive ? "success" : "danger"} className="text-xs px-2.5 py-0.5">
                                {student.isActive ? "Active Student" : "Inactive"}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-500 font-medium mt-2">
                            <div className="flex items-center gap-2">
                                <Mail size={14} />
                                <span>{student.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Shield size={14} />
                                <span className="font-mono">{student.enrollmentNumber || "PENDING"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={14} />
                                <span>Joined {format(new Date(student.createdAt), "MMM yyyy")}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-t border-slate-100 px-6">
                    {["profile", "academic", "financial"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-4 text-sm font-bold uppercase tracking-wide border-b-2 transition-all ${activeTab === tab
                                    ? "border-premium-blue text-premium-blue"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </Card>

            {/* Tab Content */}
            <div className="animate-fade-in">
                {activeTab === "profile" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card title="Personal Details">
                            <div className="space-y-4">
                                <InfoRow label="Phone" value={student.profile?.phone} icon={Phone} />
                                <InfoRow label="Address" value={formatAddress(student.profile?.address)} icon={MapPin} />
                                <InfoRow label="Date of Birth" value={student.profile?.dateOfBirth ? format(new Date(student.profile.dateOfBirth), "PPP") : "Not set"} icon={Calendar} />
                            </div>
                        </Card>
                        <Card title="Guardian Information">
                            <div className="space-y-4">
                                <InfoRow label="Guardian Name" value={student.guardianDetails?.name} icon={User} />
                                <InfoRow label="Relation" value={student.guardianDetails?.relation} icon={User} />
                                <InfoRow label="Contact" value={student.guardianDetails?.phone} icon={Phone} />
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === "academic" && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-slate-900 px-1">Enrolled Batches</h3>
                        {batches.length > 0 ? (
                            <div className="grid gap-4">
                                {batches.map(batch => (
                                    <Card key={batch._id} className="hover:border-premium-blue/30 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-violet-50 text-violet-600">
                                                    <BookOpen size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{batch.name}</h4>
                                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">{batch.course?.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant="primary" className="mb-1">{batch.enrollment?.status}</Badge>
                                                <p className="text-xs text-slate-400">Enrolled: {format(new Date(batch.enrollment?.enrolledAt), "MMM d, yyyy")}</p>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <p className="text-slate-400 font-medium">No active enrollments found.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "financial" && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-slate-900 px-1">Fee & Payment Status</h3>
                        <div className="grid gap-4">
                            {fees.map(fee => (
                                <Card key={fee._id}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                                                <CreditCard size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900">{fee.batch?.name || "Course Fee"}</h4>
                                                <p className="text-xs text-slate-500">Total: ₹{fee.totalAmount?.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-black text-slate-900">
                                                ₹{((fee.paidAmount || 0)).toLocaleString()}
                                                <span className="text-xs text-slate-400 font-medium ml-1">/ {fee.totalAmount?.toLocaleString()}</span>
                                            </div>
                                            <p className={`text-xs font-bold ${fee.status === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                {fee.status === 'paid' ? 'Fully Paid' : `Pending: ₹${(fee.totalAmount - (fee.paidAmount || 0)).toLocaleString()}`}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                            {fees.length === 0 && (
                                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 font-medium">No fee records found.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function InfoRow({ label, value, icon: Icon }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                {Icon && <Icon size={14} />}
                <span>{label}</span>
            </div>
            <div className="text-sm font-bold text-slate-700 text-right">
                {value || <span className="text-slate-300 italic">Not provided</span>}
            </div>
        </div>
    );
}

function formatAddress(addr) {
    if (!addr) return null;
    const parts = [addr.street, addr.city, addr.state, addr.pincode].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
}
