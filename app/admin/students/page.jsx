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
    Users,
    Printer,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle,
    X,
    Upload
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
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Import Logic State
    const [importFile, setImportFile] = useState(null);
    const [importStatus, setImportStatus] = useState("idle"); // idle, uploading, success, error
    const [importResult, setImportResult] = useState(null); // { successCount, failedCount, errors }

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

    const handlePrint = async () => {
        try {
            const queryParams = new URLSearchParams({
                search,
                batchId: filters.batchId,
                courseId: filters.courseId,
                isActive: filters.isActive,
                page: '1',
                limit: '1000' // Get all for print
            });

            const res = await fetch(`/api/v1/students?${queryParams.toString()}`);
            if (!res.ok) {
                throw new Error(`Failed to fetch students for print: ${res.status}`);
            }
            const data = await res.json();
            const printStudents = data.students || [];
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                // XSS Protection Helper
                const escapeHtml = (unsafe) => {
                    if (unsafe === null || unsafe === undefined) return "";
                    return String(unsafe)
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;")
                        .replace(/'/g, "&#039;");
                };

                printWindow.document.write(`
                  <html>
                    <head>
                      <title>Student List</title>
                      <style>
                        body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #1e293b; }
                        h1 { font-size: 20px; font-weight: 800; margin-bottom: 5px; color: #0f172a; }
                        p.meta { font-size: 12px; color: #64748b; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; font-size: 11px; }
                        th { text-align: left; padding: 8px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-size: 10px; }
                        td { padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
                        tr:nth-child(even) { background-color: #f8fafc; }
                        .status-active { color: #16a34a; font-weight: 600; }
                        .status-inactive { color: #dc2626; font-weight: 600; }
                        @media print {
                          @page { margin: 1cm; }
                          body { -webkit-print-color-adjust: exact; }
                        }
                      </style>
                    </head>
                    <body>
                      <h1>Student List</h1>
                      <p class="meta">Generated: ${escapeHtml(format(new Date(), "PPpp"))} | showing ${printStudents.length} records</p>
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Enrollment ID</th>
                            <th>Contact</th>
                            <th>Email</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${printStudents.map((s, i) => `
                            <tr>
                              <td style="color:#94a3b8;">${i + 1}</td>
                              <td style="font-weight:600;">${escapeHtml(s.fullName)}</td>
                              <td style="font-family:monospace; color:#475569;">${escapeHtml(s.enrollmentNumber || 'PENDING')}</td>
                              <td>${escapeHtml(s.profile?.phone || '-')}</td>
                              <td>${escapeHtml(s.email)}</td>
                              <td class="${s.isActive ? 'status-active' : 'status-inactive'}">${s.isActive ? 'Active' : 'Inactive'}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                      <script>
                        window.onload = function() { window.print(); }
                      </script>
                    </body>
                  </html>
                `);
                printWindow.document.close();
            }
        } catch (error) {
            console.error("Print failed", error);
            toast.error("Failed to generate print view");
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
        data.append("fileType", "image");

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

    const handleImport = async () => {
        if (!importFile) return;
        setLoading(true); // Re-use main loading or local
        // Actually better to have local loading state for modal
        setImportStatus("uploading");

        try {
            const formData = new FormData();
            formData.append("file", importFile);

            const res = await fetch("/api/v1/students/import", {
                method: "POST",
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                setImportResult({
                    successCount: data.importedCount,
                    failedCount: data.failedCount,
                    errors: data.errors
                });
                setImportStatus("success");
                if (data.importedCount > 0) {
                    fetchStudents(); // Refresh list
                    toast.success(`Imported ${data.importedCount} students successfully`);
                }
            } else {
                setImportStatus("error");
                toast.error(data.error || "Import failed");
            }

        } catch (error) {
            setImportStatus("error");
            console.error("Import error", error);
            toast.error("Import failed");
        } finally {
            setLoading(false);
        }
    };

    const resetImport = () => {
        setImportFile(null);
        setImportStatus("idle");
        setImportResult(null);
        setIsImportModalOpen(false);
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
                <div className="flex items-center gap-2">
                    <Button onClick={() => setIsImportModalOpen(true)} variant="outline" className="flex items-center gap-2">
                        <FileSpreadsheet size={18} />
                        <span>Import</span>
                    </Button>
                    <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-premium-blue hover:bg-premium-blue/90 shadow-md shadow-blue-500/10">
                        <UserPlus size={18} />
                        <span>New Admission</span>
                    </Button>
                </div>
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
                        <div className="min-w-[160px] max-w-xs">
                            <Select
                                value={filters.courseId}
                                onChange={(val) => setFilters({ ...filters, courseId: val })}
                                placeholder="All Courses"
                                className="w-auto"
                                buttonClassName="w-auto min-w-full"
                                options={[
                                    { label: "All Courses", value: "" },
                                    ...courses.map(c => ({ label: c.name, value: c._id }))
                                ]}
                            />
                        </div>

                        <div className="min-w-[160px] max-w-xs">
                            <Select
                                value={filters.batchId}
                                onChange={(val) => setFilters({ ...filters, batchId: val })}
                                placeholder="All Batches"
                                className="w-auto"
                                buttonClassName="w-auto min-w-full"
                                options={[
                                    { label: "All Batches", value: "" },
                                    ...batches.map(b => ({ label: b.name, value: b._id }))
                                ]}
                            />
                        </div>

                        <div className="min-w-[140px]">
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

                        <div className="pl-2 border-l border-slate-200">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handlePrint}
                                className="text-slate-400 hover:text-premium-blue hover:bg-premium-blue/5"
                                title="Print List"
                            >
                                <Printer size={18} />
                            </Button>
                        </div>
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
            </Card >

            {/* Add Student Modal ... */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)} title="Register New Student"
            >
                {/* ... Modal content ... */}
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">Academic Information</div>                <form onSubmit={handleAddStudent} className="space-y-5">
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
            </Modal >
            {/* Import Modal */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={resetImport}
                title="Bulk Import Students"
            >
                <div className="space-y-6">
                    {importStatus === "idle" && (
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                                <FileSpreadsheet className="mx-auto text-premium-blue mb-2" size={32} />
                                <h3 className="text-sm font-bold text-slate-800">Upload Excel File</h3>
                                <p className="text-xs text-slate-500 mt-1 mb-4">
                                    Select the .xlsx file containing student records.
                                    <br />
                                    <a href="/api/v1/students/template" target="_blank" className="text-premium-blue hover:underline font-bold">Download Template</a>
                                </p>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={(e) => setImportFile(e.target.files[0])}
                                    className="block w-full text-sm text-slate-500
                                      file:mr-4 file:py-2 file:px-4
                                      file:rounded-full file:border-0
                                      file:text-xs file:font-semibold
                                      file:bg-premium-blue file:text-white
                                      hover:file:bg-premium-blue/90
                                      cursor-pointer
                                    "
                                />
                            </div>
                            {importFile && (
                                <Button onClick={handleImport} className="w-full" disabled={!importFile}>
                                    <Upload className="mr-2" size={16} />
                                    Start Import
                                </Button>
                            )}
                        </div>
                    )}

                    {importStatus === "uploading" && (
                        <div className="flex flex-col items-center justify-center p-8">
                            <LoadingSpinner />
                            <p className="text-sm font-bold text-slate-600 mt-4">Processing Excel File...</p>
                            <p className="text-xs text-slate-400">Please do not close this window.</p>
                        </div>
                    )}

                    {importStatus === "success" && importResult && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col items-center">
                                    <CheckCircle className="text-emerald-500 mb-1" size={24} />
                                    <span className="text-2xl font-black text-emerald-800">{importResult.successCount}</span>
                                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Imported</span>
                                </div>
                                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center">
                                    <X className="text-red-500 mb-1" size={24} />
                                    <span className="text-2xl font-black text-red-800">{importResult.failedCount}</span>
                                    <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Failed</span>
                                </div>
                            </div>

                            {importResult.failedCount > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Error Report</h4>
                                    <div className="max-h-[200px] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Row</th>
                                                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Input</th>
                                                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white">
                                                {importResult.errors.map((err, idx) => (
                                                    <tr key={idx} className="hover:bg-red-50/50">
                                                        <td className="px-3 py-2 text-xs font-mono text-slate-500">{err.row}</td>
                                                        <td className="px-3 py-2 text-xs font-medium text-slate-700">{err.identifier}</td>
                                                        <td className="px-3 py-2 text-xs font-bold text-red-600">{err.reason}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <Button onClick={resetImport} variant="outline" className="w-full">
                                    Close & Refresh
                                </Button>
                            </div>
                        </div>

                    )}

                    {importStatus === "error" && (
                        <div className="space-y-4">
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center text-center">
                                <AlertCircle className="text-red-500 mb-2" size={32} />
                                <h3 className="text-lg font-bold text-red-800">Import Failed</h3>
                                <p className="text-sm font-medium text-red-600 mt-1">
                                    {/* Show specific error if importResult exists (valid file but parse error), else generic */}
                                    {importResult?.failedCount > 0
                                        ? "Some rows contained errors."
                                        : "The file could not be processed. Please check the format."}
                                </p>
                            </div>

                            {/* Reuse the same error table if we have detail errors (e.g. from partial failure response) */}
                            {importResult?.errors?.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Error Details</h4>
                                    <div className="max-h-[200px] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Row</th>
                                                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Input</th>
                                                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white">
                                                {importResult.errors.map((err, idx) => (
                                                    <tr key={idx} className="hover:bg-red-50/50">
                                                        <td className="px-3 py-2 text-xs font-mono text-slate-500">{err.row}</td>
                                                        <td className="px-3 py-2 text-xs font-medium text-slate-700">{err.identifier}</td>
                                                        <td className="px-3 py-2 text-xs font-bold text-red-600">{err.reason}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <Button onClick={resetImport} variant="outline" className="w-full">
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal >
        </div >
    );
}
