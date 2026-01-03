"use client";

import { useState, useEffect, useRef } from "react";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import {
    Plus,
    Search,
    Filter,
    MoreVertical,
    Edit2,
    Trash2,
    UserPlus,
    Mail,
    Phone,
    Fingerprint,
    Users
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import Select from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";

export default function StudentsPage() {
    const toast = useToast();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Filter State
    const [batches, setBatches] = useState([]);
    const [courses, setCourses] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [filters, setFilters] = useState({
        batchId: "",
        courseId: "",
        isActive: "true"
    });

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        pages: 1
    });

    // Form State
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        institute: "", // Add institute
        profile: {
            firstName: "",
            lastName: "",
            phone: "",
        }
    });

    const isFirstRender = useRef(true);
    const abortControllerRef = useRef(null);

    useEffect(() => {
        fetchInitialData();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);



    const fetchInitialData = async () => {
        try {
            const [bRes, cRes] = await Promise.all([
                fetch("/api/v1/batches"),
                fetch("/api/v1/courses")
            ]);
            if (bRes.ok) {
                const bData = await bRes.json();
                setBatches(bData.batches || []);
            }
            if (cRes.ok) {
                const cData = await cRes.json();
                setCourses(cData.courses || []);
            }

            // Try fetching institutes (only for Super Admin)
            const iRes = await fetch("/api/v1/institutes");
            if (iRes.ok) {
                const iData = await iRes.json();
                setInstitutes(iData.institutes || []);
            }
        } catch (error) {
            console.error("Failed to fetch filter data", error);
        }
    };

    const fetchStudents = async (page = pagination.page) => {
        // Cancellation logic
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                search,
                batchId: filters.batchId,
                courseId: filters.courseId,
                isActive: filters.isActive,
                page: page.toString(),
                limit: pagination.limit.toString()
            });

            const res = await fetch(`/api/v1/students?${queryParams.toString()}`, {
                signal: abortControllerRef.current.signal,
                cache: 'no-store'
            });
            if (!res.ok) {
                throw new Error(`Failed to fetch students: ${res.status}`);
            }
            const data = await res.json();
            setStudents(data.students || []);
            if (data.pagination) {
                setPagination(prev => ({
                    ...prev,
                    page: data.pagination.page,
                    total: data.pagination.total,
                    pages: data.pagination.pages
                }));
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Failed to fetch students", error);
            }
        } finally {
            setLoading(false);
        }
    };

    // Action State
    const [uploading, setUploading] = useState(false);

    // ... existing ...

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const data = new FormData();
        data.append("file", file);

        try {
            const res = await fetch("/api/v1/upload", {
                method: "POST",
                body: data
            });
            const json = await res.json();
            if (res.ok) {
                setFormData(prev => ({
                    ...prev,
                    profile: { ...prev.profile, avatar: json.url }
                }));
                toast.success("Photo uploaded!");
            } else {
                toast.error(json.error || "Upload failed");
            }
        } catch (err) {
            console.error(err);
            toast.error("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/v1/students", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setIsAddModalOpen(false);
                setFormData({
                    email: "",
                    password: "",
                    institute: "",
                    profile: { firstName: "", lastName: "", phone: "", avatar: "" }
                });
                fetchStudents();
                toast.success("Student registered successfully");
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to create student");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to create student");
        }
    };



    // ... existing ...

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            fetchStudents(1); // Fetch page 1 initially
            return;
        }

        const timer = setTimeout(() => {
            fetchStudents(1); // Reset to page 1 on filter change
        }, 500);
        return () => clearTimeout(timer);
    }, [search, filters]);

    // Trigger fetch when page changes (but not filters)
    useEffect(() => {
        if (!isFirstRender.current) {
            fetchStudents(pagination.page);
        }
    }, [pagination.page]);

    // ... existing ...



    // ... existing ...

    // Pagination helper
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    return (
        <div className="space-y-6">
            {/* Header ... */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Student Management</h1>
                    <p className="text-slate-400 mt-1 text-sm font-medium">Manage admissions, enrollments and student records across batches.</p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-premium-blue hover:bg-premium-blue/90 shadow-md shadow-blue-500/10">
                    <UserPlus size={18} />
                    <span>New Admission</span>
                </Button>
            </div>

            <Card className="transition-all border-transparent shadow-sm">
                {/* Card Header ... */}
                <CardHeader className="flex-col md:flex-row items-stretch md:items-center gap-4 space-y-0">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400/50 transition-colors group-focus-within:text-premium-blue" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, email or enrollment ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-premium-blue/30 focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="w-40">
                            <Select
                                value={filters.courseId}
                                onChange={(val) => setFilters({ ...filters, courseId: val })}
                                placeholder="All Courses"
                                options={[
                                    { label: "All Courses", value: "" },
                                    ...courses.map(c => ({ label: c.name, value: c._id }))
                                ]}
                            />
                        </div>

                        <div className="w-40">
                            <Select
                                value={filters.batchId}
                                onChange={(val) => setFilters({ ...filters, batchId: val })}
                                placeholder="All Batches"
                                options={[
                                    { label: "All Batches", value: "" },
                                    ...batches.map(b => ({ label: b.name, value: b._id }))
                                ]}
                            />
                        </div>

                        <div className="w-32">
                            <Select
                                value={filters.isActive}
                                onChange={(val) => setFilters({ ...filters, isActive: val })}
                                placeholder="All Status"
                                options={[
                                    { label: "All Status", value: "" },
                                    { label: "Active Only", value: "true" },
                                    { label: "Inactive", value: "false" }
                                ]}
                            />
                        </div>

                        {(filters.courseId || filters.batchId || filters.isActive !== "true") && (<Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFilters({ batchId: "", courseId: "", isActive: "true" })}
                            className="text-[10px] uppercase font-black tracking-widest text-slate-400 hover:text-red-500"
                        >
                            Reset
                        </Button>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {loading ? (
                        <LoadingSpinner />
                    ) : students.length > 0 ? (
                        <>
                            <div className="overflow-x-auto min-h-[400px]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white border-y border-slate-100">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Student</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Enrollment ID</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contact</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {students.map((student) => (
                                            <tr key={student._id} className="group hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-premium-blue/10 flex items-center justify-center text-premium-blue font-bold border border-premium-blue/20 overflow-hidden">
                                                            {student.profile?.avatar ? (
                                                                <img src={student.profile.avatar} alt={student.profile.firstName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                student.profile?.firstName?.[0]
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 capitalize">{student.fullName}</p>
                                                            <p className="text-[11px] font-medium text-slate-400 break-all">{student.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold font-mono border border-slate-200">
                                                        {student.enrollmentNumber || "PENDING"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-[11px] font-bold text-slate-600">{student.profile?.phone || "—"}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={student.isActive ? "success" : "danger"} className="text-[10px] px-2 py-0.5">
                                                        {student.isActive ? "Active" : "Inactive"}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link
                                                        href={`/admin/students/${student._id}`}
                                                        className="inline-flex p-2 hover:bg-white rounded-lg text-slate-300 hover:text-premium-blue hover:shadow-sm border border-transparent hover:border-slate-100 transition-all"
                                                    >
                                                        <Edit2 size={16} />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                                <div className="text-xs text-slate-500 font-medium">
                                    Showing <span className="font-bold text-slate-700">{Math.min(students.length, pagination.limit)}</span> of <span className="font-bold text-slate-700">{pagination.total}</span> students
                                    <span className="mx-2 text-slate-300">|</span>
                                    Page <span className="font-bold text-slate-700">{pagination.page}</span> of <span className="font-bold text-slate-700">{pagination.pages}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page <= 1}
                                        className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Previous
                                    </button>

                                    {/* Page Numbers - Simplified for now */}
                                    <div className="hidden sm:flex items-center gap-1">
                                        {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                                            // Handle truncated pagination view logic if needed later
                                            // For now simple range near current page
                                            let p = pagination.page;
                                            if (pagination.pages <= 5) p = i + 1;
                                            else if (pagination.page < 3) p = i + 1;
                                            else if (pagination.page > pagination.pages - 2) p = pagination.pages - 4 + i;
                                            else p = pagination.page - 2 + i;

                                            return (
                                                <button
                                                    key={p}
                                                    onClick={() => handlePageChange(p)}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${pagination.page === p
                                                        ? "bg-premium-blue text-white shadow-md shadow-blue-500/20"
                                                        : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    {p}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page >= pagination.pages}
                                        className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <EmptyState
                            icon={Users}
                            title="No students found"
                            description="Start by adding your first student to the system."
                            actionLabel="Add Student"
                            onAction={() => setIsAddModalOpen(true)}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Add Student Modal ... */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Register New Student"
            >
                {/* ... Modal content ... */}
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">Academic Information</div>
                <form onSubmit={handleAddStudent} className="space-y-5">
                    {/* ... form fields reused exactly ... */}
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            id="firstName"
                            label="First Name"
                            placeholder="e.g. John"
                            value={formData.profile.firstName}
                            onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, firstName: e.target.value } })}
                            required
                        />
                        <Input
                            id="lastName"
                            label="Last Name"
                            placeholder="e.g. Doe"
                            value={formData.profile.lastName}
                            onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, lastName: e.target.value } })}
                            required
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden shrink-0">
                            {formData.profile.avatar ? (
                                <img src={formData.profile.avatar} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <Users size={24} className="text-slate-300" />
                            )}
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-slate-700 mb-1">Student Photo</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                disabled={uploading}
                                className="block w-full text-sm text-slate-500
                                  file:mr-4 file:py-2 file:px-4
                                  file:rounded-lg file:border-0
                                  file:text-xs file:font-semibold
                                  file:bg-premium-blue/10 file:text-premium-blue
                                  hover:file:bg-premium-blue/20
                                "
                            />
                            {uploading && <p className="text-xs text-premium-blue mt-1">Uploading...</p>}
                        </div>
                    </div>

                    <Input
                        id="email"
                        label="Email Address"
                        type="email"
                        placeholder="student@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />

                    {institutes.length > 0 && (
                        <Select
                            label="Assign Institute"
                            value={formData.institute}
                            onChange={(val) => setFormData({ ...formData, institute: val })}
                            options={[
                                { label: "Select Institute", value: "" },
                                ...institutes.map(i => ({ label: `${i.name} (${i.code})`, value: i._id }))
                            ]}
                            required
                        />
                    )}

                    <Input
                        id="phone"
                        label="Phone Number"
                        placeholder="+91 00000 00000"
                        value={formData.profile.phone}
                        onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, phone: e.target.value } })}
                    />

                    <Input
                        id="password"
                        label="Temporary Password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="flex-1">Register Student</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
