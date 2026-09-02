"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
    Building2, 
    Plus, 
    Pencil, 
    Trash2, 
    Loader2, 
    Search, 
    UserCheck, 
    BookOpen, 
    GraduationCap, 
    Mail, 
    Phone, 
    Calendar,
    Users
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

export default function DepartmentsPage() {
    const toast = useToast();
    const confirm = useConfirm();

    const [departments, setDepartments] = useState([]);
    const [instructors, setInstructors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        description: "",
        hod: "",
        establishedYear: "",
        contactEmail: "",
        contactPhone: "",
        isActive: true
    });

    const fetchDepartments = useCallback(async (signal) => {
        try {
            const res = await fetch("/api/v1/departments", {
                signal: signal || AbortSignal.timeout(10000)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setDepartments(data.departments || []);
            setInstructors(data.instructors || []);
        } catch (error) {
            if (error.name !== "AbortError") {
                toast.error("Failed to load departments");
            }
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        const controller = new AbortController();
        fetchDepartments(controller.signal);
        return () => controller.abort();
    }, [fetchDepartments]);

    const openAddModal = () => {
        setEditingDepartment(null);
        setFormData({
            name: "",
            code: "",
            description: "",
            hod: "",
            establishedYear: new Date().getFullYear().toString(),
            contactEmail: "",
            contactPhone: "",
            isActive: true
        });
        setIsModalOpen(true);
    };

    const openEditModal = (dept) => {
        setEditingDepartment(dept);
        setFormData({
            name: dept.name || "",
            code: dept.code || "",
            description: dept.description || "",
            hod: dept.hod?._id || dept.hod || "",
            establishedYear: dept.establishedYear?.toString() || "",
            contactEmail: dept.contactEmail || "",
            contactPhone: dept.contactPhone || "",
            isActive: dept.isActive !== false
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.code.trim()) {
            toast.error("Department Name and Code are required");
            return;
        }

        setSaving(true);
        try {
            const url = editingDepartment 
                ? `/api/v1/departments/${editingDepartment._id}` 
                : "/api/v1/departments";
            const method = editingDepartment ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save department");

            toast.success(editingDepartment ? "Department updated" : "Department created");
            setIsModalOpen(false);
            fetchDepartments();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (dept) => {
        const confirmed = await confirm({
            title: "Delete Department",
            message: `Are you sure you want to delete the "${dept.name}" department? Courses and faculty associated with this department will need to be reassigned.`,
            confirmText: "Delete",
            cancelText: "Cancel",
            type: "danger"
        });

        if (!confirmed) return;

        try {
            const res = await fetch(`/api/v1/departments/${dept._id}`, {
                method: "DELETE"
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to delete");
            }

            toast.success("Department deleted successfully");
            setDepartments(prev => prev.filter(d => d._id !== dept._id));
        } catch (error) {
            toast.error(error.message);
        }
    };

    const filteredDepartments = useMemo(() => {
        if (!searchQuery.trim()) return departments;
        const q = searchQuery.toLowerCase();
        return departments.filter(d => 
            d.name?.toLowerCase().includes(q) ||
            d.code?.toLowerCase().includes(q) ||
            `${d.hod?.profile?.firstName || ''} ${d.hod?.profile?.lastName || ''}`.toLowerCase().includes(q)
        );
    }, [departments, searchQuery]);

    const stats = useMemo(() => {
        const total = departments.length;
        const withHod = departments.filter(d => d.hod).length;
        const totalCourses = departments.reduce((acc, d) => acc + (d.courseCount || 0), 0);
        return { total, withHod, totalCourses };
    }, [departments]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <Building2 className="text-primary-600" size={26} />
                        Academic Departments
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage academic faculties, assign Heads of Department (HODs), and organize degree programs.
                    </p>
                </div>
                <Button 
                    onClick={openAddModal}
                    className="flex items-center gap-2 shrink-0 bg-primary-600 hover:bg-primary-700 text-white"
                >
                    <Plus size={16} />
                    Add Department
                </Button>
            </div>

            {/* Stat Bento Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4 border-slate-200">
                    <div className="flex items-center gap-3">
                        <Building2 className="text-primary-600" size={22} />
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Departments</p>
                            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.total}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border-slate-200">
                    <div className="flex items-center gap-3">
                        <UserCheck className="text-emerald-600" size={22} />
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned HODs</p>
                            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.withHod} <span className="text-xs text-slate-400 font-normal">/ {stats.total}</span></p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border-slate-200">
                    <div className="flex items-center gap-3">
                        <BookOpen className="text-indigo-600" size={22} />
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department Programs</p>
                            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.totalCourses}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Search & Actions Bar */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search departments by name, code (e.g. CSE), or HOD..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                </div>
            </div>

            {/* Department List Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin text-primary-600 mb-3" size={32} />
                    <p className="text-sm text-slate-500">Loading departments...</p>
                </div>
            ) : filteredDepartments.length === 0 ? (
                <Card className="p-12 text-center border-dashed border-slate-300">
                    <Building2 className="mx-auto text-slate-400 mb-3" size={40} />
                    <h3 className="text-base font-bold text-slate-800">No departments found</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                        {searchQuery ? "No departments match your search query." : "Get started by adding your institution's academic faculties (e.g. Computer Science, Mechanical Engineering, Commerce)."}
                    </p>
                    {!searchQuery && (
                        <Button onClick={openAddModal} className="mt-4 bg-primary-600 text-white">
                            <Plus size={16} className="mr-1.5" />
                            Create First Department
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredDepartments.map((dept) => {
                        const hodName = dept.hod?.profile 
                            ? `${dept.hod.profile.firstName} ${dept.hod.profile.lastName}`.trim() 
                            : null;

                        return (
                            <Card 
                                key={dept._id}
                                className="p-5 border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
                            >
                                <div>
                                    {/* Card Header: Code Badge + Status + Actions */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-primary-50 text-primary-700 border border-primary-200/60">
                                                {dept.code}
                                            </span>
                                            {dept.establishedYear && (
                                                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    Est. {dept.establishedYear}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => openEditModal(dept)}
                                                className="p-1.5 text-slate-400 hover:text-primary-600 rounded-md hover:bg-slate-100 transition-colors"
                                                title="Edit Department"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(dept)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                                                title="Delete Department"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Department Name & Description */}
                                    <h3 className="text-base font-bold text-slate-900 mt-3 leading-snug">
                                        {dept.name}
                                    </h3>
                                    {dept.description && (
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                            {dept.description}
                                        </p>
                                    )}

                                    {/* HOD Profile Section */}
                                    <div className="mt-4 pt-3.5 border-t border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            Head of Department (HOD)
                                        </p>
                                        {hodName ? (
                                            <div className="flex items-center gap-2.5 mt-1.5">
                                                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0">
                                                    {dept.hod.profile?.firstName?.[0] || 'H'}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold text-slate-800 truncate">
                                                        {hodName}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                                                        <Mail size={10} />
                                                        {dept.hod.email}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 italic mt-1.5">
                                                No HOD assigned
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom Metrics Footer */}
                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <GraduationCap size={14} className="text-slate-400" />
                                        {dept.courseCount || 0} Programs
                                    </span>
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <Users size={14} className="text-slate-400" />
                                        {dept.facultyCount || 0} Faculty
                                    </span>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create / Edit Department Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingDepartment ? "Edit Department" : "Add Academic Department"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Department Name *
                            </label>
                            <Input
                                placeholder="e.g. Computer Science & Engineering"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Code *
                            </label>
                            <Input
                                placeholder="e.g. CSE"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Assign Head of Department (HOD)
                        </label>
                        <select
                            value={formData.hod}
                            onChange={(e) => setFormData({ ...formData, hod: e.target.value })}
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">-- Select Faculty / Instructor --</option>
                            {instructors.map((inst) => {
                                const name = inst.profile 
                                    ? `${inst.profile.firstName} ${inst.profile.lastName}`.trim() 
                                    : inst.email;
                                return (
                                    <option key={inst._id} value={inst._id}>
                                        {name} ({inst.email})
                                    </option>
                                );
                            })}
                        </select>
                        <p className="text-[11px] text-slate-400 mt-1">
                            Eligible instructors and staff registered in this institute.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Description
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Brief overview of the department, focus areas, or laboratory wings..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Est. Year
                            </label>
                            <Input
                                type="number"
                                placeholder="e.g. 2012"
                                value={formData.establishedYear}
                                onChange={(e) => setFormData({ ...formData, establishedYear: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Contact Email
                            </label>
                            <Input
                                type="email"
                                placeholder="dept@college.edu"
                                value={formData.contactEmail}
                                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Phone / Ext
                            </label>
                            <Input
                                placeholder="Ext 401"
                                value={formData.contactPhone}
                                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsModalOpen(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-primary-600 text-white"
                            disabled={saving}
                        >
                            {saving ? (
                                <span className="flex items-center gap-1.5">
                                    <Loader2 className="animate-spin" size={14} />
                                    Saving...
                                </span>
                            ) : editingDepartment ? "Update Department" : "Create Department"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
