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
    ArrowLeft,
    Shield,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Edit,
    Trash2
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";

export default function StudentDetailsPage({ params }) {
    const router = useRouter();
    const { id } = use(params);

    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("profile");


    // Enrollment Modal State
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [courseBatches, setCourseBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState("");

    // Payment Modal State
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [selectedFee, setSelectedFee] = useState(null);
    const [paymentData, setPaymentData] = useState({
        amount: "",
        method: "cash",
        reference: "",
        notes: ""
    });

    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        profile: { firstName: "", lastName: "", phone: "", dateOfBirth: "", address: {} },
        guardianDetails: { name: "", relation: "", phone: "" }
    });


    // Attendance State
    const [attendanceData, setAttendanceData] = useState([]);
    const [attendanceStats, setAttendanceStats] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        if (activeTab === "attendance") {
            fetchAttendance();
        }
    }, [activeTab, currentMonth]);

    const fetchAttendance = async () => {
        try {
            const month = currentMonth.getMonth() + 1;
            const year = currentMonth.getFullYear();
            const res = await fetch(`/api/v1/attendance/students/${id}?month=${month}&year=${year}`);
            const data = await res.json();
            setAttendanceData(data.attendance || []);
            setAttendanceStats(data.stats || null);
        } catch (error) {
            console.error("Failed to fetch attendance", error);
        }
    };

    const handleMonthChange = (direction) => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + direction);
            return newDate;
        });
    };

    useEffect(() => {
        if (isEnrollModalOpen && courses.length === 0) {
            fetchCourses();
        }
    }, [isEnrollModalOpen]);

    useEffect(() => {
        if (selectedCourse) {
            fetchBatchesForCourse(selectedCourse);
        } else {
            setCourseBatches([]);
        }
    }, [selectedCourse]);

    const fetchStudentDetails = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/v1/students/${id}`);
            if (!res.ok) throw new Error("Failed to fetch student");
            const data = await res.json();
            setStudentData(data);

            // Populate form data for editing
            if (data.student) {
                setFormData({
                    email: data.student.email,
                    profile: { ...data.student.profile, address: data.student.profile?.address || {} },
                    guardianDetails: data.student.guardianDetails || { name: "", relation: "", phone: "" }
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudentDetails();
    }, [id]);

    const fetchCourses = async () => {
        try {
            const res = await fetch("/api/v1/courses");
            const data = await res.json();
            setCourses(data.courses || []);
        } catch (error) {
            console.error("Failed to fetch courses", error);
        }
    };

    const fetchBatchesForCourse = async (courseId) => {
        try {
            const res = await fetch(`/api/v1/batches?courseId=${courseId}`);
            const data = await res.json();
            setCourseBatches(data.batches || []);
        } catch (error) {
            console.error("Failed to fetch batches", error);
        }
    };

    const handleEnrollStudent = async (e) => {
        e.preventDefault();
        if (!selectedBatch) return;

        try {
            const res = await fetch(`/api/v1/students/${id}/enroll`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ batchId: selectedBatch })
            });

            if (res.ok) {
                setIsEnrollModalOpen(false);
                setSelectedBatch("");
                setSelectedCourse("");
                fetchStudentDetails();
                alert("Student enrolled successfully!");
            } else {
                const err = await res.json();
                alert(err.error || "Failed to enroll student");
            }
        } catch (error) {
            alert("Enrollment failed");
        }
    };

    const openPaymentModal = (fee) => {
        setSelectedFee(fee);
        setPaymentData({
            amount: (fee.totalAmount - (fee.paidAmount || 0)).toString(), // Default to remaining amount
            method: "cash",
            reference: "",
            notes: ""
        });
        setIsPayModalOpen(true);
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        if (!selectedFee) return;

        try {
            const res = await fetch(`/api/v1/fees/${selectedFee._id}/payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(paymentData)
            });

            if (res.ok) {
                setIsPayModalOpen(false);
                fetchStudentDetails();
                alert("Payment recorded successfully!");
            } else {
                const err = await res.json();
                alert(err.error || "Failed to record payment");
            }
        } catch (error) {
            alert("Payment failed");
        }
    };


    const handleDeleteStudent = async () => {
        if (!confirm("Are you sure you want to permanently delete this student? This action cannot be undone.")) return;

        try {
            setIsDeleting(true);
            const res = await fetch(`/api/v1/students/${id}`, {
                method: "DELETE"
            });

            if (res.ok) {
                alert("Student deleted successfully");
                router.push("/admin/students");
            } else {
                const err = await res.json();
                alert(err.error || "Failed to delete student");
            }
        } catch (error) {
            console.error(error);
            alert("Failed to delete student");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdateStudent = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/v1/students/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsEditModalOpen(false);
                fetchStudentDetails();
                alert("Student profile updated successfully!");
            } else {
                const err = await res.json();
                alert(err.error || "Failed to update profile");
            }
        } catch (error) {
            alert("Update failed");
        }
    };

    if (loading) return <LoadingSpinner fullPage />;
    if (!studentData) return <div className="p-10 text-center text-slate-400">Student not found</div>;

    const { student, batches, fees } = studentData;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
                    <ArrowLeft size={18} />
                    <span className="ml-2">Back</span>
                </Button>

                <div className="flex gap-3">
                    <Button
                        variant="soft"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={handleDeleteStudent}
                        disabled={isDeleting}
                    >
                        <Trash2 size={16} className="mr-2" />
                        {isDeleting ? "Deleting..." : "Delete Student"}
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setIsEditModalOpen(true)}
                    >
                        <Edit size={16} className="mr-2" />
                        Edit Profile
                    </Button>
                </div>
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
                                <span>Joined {student.createdAt ? format(new Date(student.createdAt), "MMM yyyy") : "N/A"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                {/* ... existing tabs code ... */}
                <div className="flex border-t border-slate-100 px-6">
                    {["profile", "academic", "financial", "attendance"].map((tab) => (
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
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-lg font-bold text-slate-900">Enrolled Batches</h3>
                            <Button size="sm" onClick={() => setIsEnrollModalOpen(true)}>
                                <BookOpen size={16} className="mr-2" />
                                Enroll New Course
                            </Button>
                        </div>
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
                                <Button variant="link" className="mt-2 text-premium-blue" onClick={() => setIsEnrollModalOpen(true)}>Enroll in a course</Button>
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
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className="text-xl font-black text-slate-900">
                                                    ₹{((fee.paidAmount || 0)).toLocaleString()}
                                                    <span className="text-xs text-slate-400 font-medium ml-1">/ {fee.totalAmount?.toLocaleString()}</span>
                                                </div>
                                                <p className={`text-xs font-bold ${fee.status === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                    {fee.status === 'paid' ? 'Fully Paid' : `Pending: ₹${(fee.totalAmount - (fee.paidAmount || 0)).toLocaleString()}`}
                                                </p>
                                            </div>
                                            {fee.status !== 'paid' && (
                                                <Button size="sm" variant="outline" onClick={() => openPaymentModal(fee)}>
                                                    Pay Fee
                                                </Button>
                                            )}
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

            {/* Existing Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Student Profile"
            >
                {/* ... existing form ... */}
                <form onSubmit={handleUpdateStudent} className="space-y-6">
                    {/* Personal Info */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Personal Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                id="firstName"
                                label="First Name"
                                value={formData.profile.firstName}
                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, firstName: e.target.value } })}
                                required
                            />
                            <Input
                                id="lastName"
                                label="Last Name"
                                value={formData.profile.lastName}
                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, lastName: e.target.value } })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                id="phone"
                                label="Phone Number"
                                value={formData.profile.phone}
                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, phone: e.target.value } })}
                            />
                            <Input
                                id="dob"
                                label="Date of Birth"
                                type="date"
                                value={formData.profile.dateOfBirth}
                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, dateOfBirth: e.target.value } })}
                            />
                        </div>

                        <div className="space-y-3 pt-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Address</label>
                            <div className="grid grid-cols-1 gap-3">
                                <Input
                                    placeholder="Street Address"
                                    value={formData.profile.address.street}
                                    onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, address: { ...formData.profile.address, street: e.target.value } } })}
                                />
                                <div className="grid grid-cols-3 gap-3">
                                    <Input
                                        placeholder="City"
                                        value={formData.profile.address.city}
                                        onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, address: { ...formData.profile.address, city: e.target.value } } })}
                                    />
                                    <Input
                                        placeholder="State"
                                        value={formData.profile.address.state}
                                        onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, address: { ...formData.profile.address, state: e.target.value } } })}
                                    />
                                    <Input
                                        placeholder="Zip/Pin"
                                        value={formData.profile.address.pincode}
                                        onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, address: { ...formData.profile.address, pincode: e.target.value } } })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Guardian Info */}
                    <div className="space-y-4 pt-2 border-t border-slate-50">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mt-2">Guardian Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                id="guardianName"
                                label="Guardian Name"
                                value={formData.guardianDetails.name}
                                onChange={(e) => setFormData({ ...formData, guardianDetails: { ...formData.guardianDetails, name: e.target.value } })}
                            />
                            <div className="space-y-1">
                                <label htmlFor="guardianRelation" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Relation</label>
                                <select
                                    id="guardianRelation"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-premium-blue/30 focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium text-slate-700"
                                    value={formData.guardianDetails.relation}
                                    onChange={(e) => setFormData({ ...formData, guardianDetails: { ...formData.guardianDetails, relation: e.target.value } })}
                                >
                                    <option value="">Select Relation</option>
                                    <option value="father">Father</option>
                                    <option value="mother">Mother</option>
                                    <option value="guardian">Guardian</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                        <Input
                            id="guardianPhone"
                            label="Guardian Contact"
                            value={formData.guardianDetails.phone}
                            onChange={(e) => setFormData({ ...formData, guardianDetails: { ...formData.guardianDetails, phone: e.target.value } })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                        <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Changes</Button>
                    </div>
                </form>
            </Modal>

            {/* Enrollment Modal */}
            <Modal
                isOpen={isEnrollModalOpen}
                onClose={() => setIsEnrollModalOpen(false)}
                title="Enroll in New Course"
            >
                <form onSubmit={handleEnrollStudent} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Select Course</label>
                            <select
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-premium-blue/30 focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium text-slate-700"
                                value={selectedCourse}
                                onChange={(e) => setSelectedCourse(e.target.value)}
                                required
                            >
                                <option value="">-- Choose a Course --</option>
                                {courses.map(course => (
                                    <option key={course._id} value={course._id}>
                                        {course.name} ({course.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedCourse && (
                            <div className="space-y-1 animate-fade-in">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Select Batch</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-premium-blue/30 focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium text-slate-700"
                                    value={selectedBatch}
                                    onChange={(e) => setSelectedBatch(e.target.value)}
                                    required
                                >
                                    <option value="">-- Choose a Batch --</option>
                                    {courseBatches.map(batch => (
                                        <option key={batch._id} value={batch._id}>
                                            {batch.name} (Starts: {format(new Date(batch.schedule.startDate), "MMM d")})
                                        </option>
                                    ))}
                                </select>
                                {courseBatches.length === 0 && (
                                    <p className="text-xs text-amber-500 font-medium px-1">No active batches for this course.</p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                        <Button type="button" variant="ghost" onClick={() => setIsEnrollModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={!selectedBatch}>Enroll Student</Button>
                    </div>
                </form>
            </Modal>

            {/* Payment Modal */}
            <Modal
                isOpen={isPayModalOpen}
                onClose={() => setIsPayModalOpen(false)}
                title="Record Fee Payment"
            >
                <form onSubmit={handleRecordPayment} className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Payment For</p>
                        <p className="text-sm font-bold text-slate-900">{selectedFee?.batch?.name}</p>
                        <p className="text-xs text-slate-500">Total Due: ₹{((selectedFee?.totalAmount || 0) - (selectedFee?.paidAmount || 0)).toLocaleString()}</p>
                    </div>

                    <div className="space-y-4">
                        <Input
                            label="Payment Amount (₹)"
                            type="number"
                            value={paymentData.amount}
                            onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                            required
                            min="1"
                        />

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Payment Method</label>
                            <select
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-premium-blue/30 focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium text-slate-700"
                                value={paymentData.method}
                                onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                            >
                                <option value="cash">Cash</option>
                                <option value="upi">UPI / Online</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>

                        <Input
                            label="Transaction Ref / Note (Optional)"
                            placeholder="e.g. UPI ID or Cheque No."
                            value={paymentData.reference}
                            onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                        <Button type="button" variant="ghost" onClick={() => setIsPayModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Record Payment</Button>
                    </div>
                </form>
            </Modal>
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


function StatsBadge({ label, value, total, color }) {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    const colors = {
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
        red: "bg-red-50 text-red-600 border-red-200",
        amber: "bg-amber-50 text-amber-600 border-amber-200",
    };

    return (
        <div className={`px-4 py-2 rounded-xl border ${colors[color]} flex flex-col items-center min-w-[80px]`}>
            <span className="text-xl font-black">{value}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</span>
        </div>
    );
}

function formatAddress(addr) {
    if (!addr) return null;
    const parts = [addr.street, addr.city, addr.state, addr.pincode].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
}

