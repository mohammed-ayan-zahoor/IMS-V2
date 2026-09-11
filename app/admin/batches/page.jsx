"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

import {
    Calendar,
    Plus,
    Search,
    Users,
    BookOpen,
    Clock,
    Edit2,
    Trash2,
    MessageSquare,
    ExternalLink,
    Copy,
    AlertCircle,
    HelpCircle,
    Layers,
    Package,
    ChevronRight,
    ChevronDown
} from "lucide-react";
import Select from "@/components/ui/Select";
// Verified: Usage of Select component is compatible with onChange(value) signature.
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { format } from "date-fns";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useAcademicSession } from "@/contexts/AcademicSessionContext";
import MobileInstructorBatches from "@/components/instructor/MobileInstructorBatches";

export default function BatchesPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const router = useRouter();
    const [batches, setBatches] = useState([]);
    const [courses, setCourses] = useState([]);
    const [bundles, setBundles] = useState([]);
    const [loading, setLoading] = useState(true);
    const { data: session } = useSession();
    const { selectedSessionId, sessions } = useAcademicSession();
    const [institutes, setInstitutes] = useState([]);
    const [selectedInstitute, setSelectedInstitute] = useState("");
    const activeInstitute = institutes.find(i => (i._id || i.id) === selectedInstitute);
    const activeInstituteType = activeInstitute?.type || session?.user?.institute?.type;
    const isSchool = activeInstituteType === 'SCHOOL' || (activeInstitute?.code || session?.user?.institute?.code) === 'QUANTECH';
    const isVocational = activeInstituteType === 'VOCATIONAL';
    const isCollege = activeInstituteType === 'COLLEGE';
    const [departments, setDepartments] = useState([]);
    const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("");
    const [expandedCourses, setExpandedCourses] = useState({});
    const [activeSemesters, setActiveSemesters] = useState({});

    const [search, setSearch] = useState("");
    const [selectedCourseFilter, setSelectedCourseFilter] = useState("");
    const [listFilter, setListFilter] = useState("all"); // "all" | "course" | "bundle"
    const [isHowToOpen, setIsHowToOpen] = useState(false);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingBatch, setEditingBatch] = useState(null);
    const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
    const [cloneSourceSessionId, setCloneSourceSessionId] = useState("");
    const [isCloning, setIsCloning] = useState(false);

    // Form State — batchType is "course" or "bundle"
    const [batchType, setBatchType] = useState("course");
    const [formData, setFormData] = useState({
        name: "",
        course: "",
        semester: 1,
        courseBundle: "",
        schedule: "",
        startDate: "",
        capacity: 30
    });

    const toggleCourseExpansion = (courseId) => {
        setExpandedCourses(prev => {
            const current = prev[courseId] !== undefined ? prev[courseId] : (collegeFilteredCourses.length === 1);
            return {
                ...prev,
                [courseId]: !current
            };
        });
    };

    useEffect(() => {
        fetchInitialData();
        if (session?.user?.role === 'super_admin') {
            fetchInstitutes();
        }
    }, [session, selectedInstitute, selectedSessionId, isCollege]);

    const fetchInstitutes = async () => {
        try {
            const res = await fetch("/api/v1/institutes");
            if (!res.ok) {
                throw new Error(`Failed to fetch institutes: ${res.status}`);
            }
            const data = await res.json();
            setInstitutes(data.institutes || []);
        } catch (error) {
            console.error("Failed to fetch institutes", error);
        }
    };
    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const instQuery = selectedInstitute ? `&instituteId=${selectedInstitute}` : "";
            const fetches = [
                fetch(`/api/v1/batches?_t=${Date.now()}${instQuery}`),
                fetch(`/api/v1/courses?_t=${Date.now()}${instQuery}`)
            ];
            if (isVocational) fetches.push(fetch("/api/v1/course-bundles"));
            if (isCollege) fetches.push(fetch(`/api/v1/departments?_t=${Date.now()}${instQuery}`));

            const results = await Promise.all(fetches);
            const [bRes, cRes] = results;
            const bData = await bRes.json().catch(() => ({}));
            const cData = await cRes.json().catch(() => ({}));

            if (!bRes.ok) {
                console.error("Failed to fetch batches:", bRes.status, bData);
            }

            let batchList = Array.isArray(bData) ? bData : (Array.isArray(bData?.batches) ? bData.batches : []);
            
            // Grouped Sort: Course Name then Batch Name (Natural Sort)
            batchList.sort((a, b) => {
                const courseA = a.course?.name || a.courseBundle?.title || "";
                const courseB = b.course?.name || b.courseBundle?.title || "";
                if (courseA !== courseB) return courseA.localeCompare(courseB);
                return (a.name || "").localeCompare((b.name || ""), undefined, { numeric: true, sensitivity: 'base' });
            });

            setBatches(batchList);
            const fetchedCourses = Array.isArray(cData) ? cData : (Array.isArray(cData?.courses) ? cData.courses : []);
            setCourses(fetchedCourses);

            if (isVocational && results[2]) {
                const bndData = await results[2].json();
                setBundles(bndData.bundles || []);
            }
            if (isCollege) {
                const deptRes = isVocational ? results[3] : results[2];
                if (deptRes) {
                    const dData = await deptRes.json();
                    setDepartments(dData.departments || []);
                }
            }
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };



    const handleDeleteBatch = async (id) => {
        if (!await confirm({ title: `Delete ${isSchool ? "Section" : "Batch"}?`, message: `Are you sure you want to delete this ${isSchool ? "section" : "batch"}?`, type: "danger" })) return;
        try {
            const res = await fetch(`/api/v1/batches/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success(`${isSchool ? "Section" : "Batch"} deleted successfully`);
                fetchInitialData();
            } else {
                toast.error(`Failed to delete ${isSchool ? "section" : "batch"}`);
            }
        } catch (error) {
            console.error(error);
            toast.error(`Error deleting ${isSchool ? "section" : "batch"}`);
        }
    };

    const handleBatchChat = async (batch) => {
        try {
            const res = await fetch("/api/v1/chat/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isBatch: true, batchId: batch._id, name: batch.name })
            });
            if (res.ok) {
                window.location.href = "/admin/chat";
            } else {
                toast.error(`Failed to start ${isSchool || isCollege ? "section" : "batch"} chat`);
            }
        } catch (err) {
            toast.error(`Failed to start ${isSchool || isCollege ? "section" : "batch"} chat`);
        }
    };

    const handleEditBatch = (batch) => {
        setEditingBatch(batch);
        const type = batch.courseBundle ? "bundle" : "course";
        setBatchType(type);
        setFormData({
            name: batch.name,
            course: type === "course" ? (batch.course?._id || batch.course || "") : "",
            semester: batch.semester || 1,
            courseBundle: type === "bundle" ? (batch.courseBundle?._id || batch.courseBundle || "") : "",
            capacity: batch.capacity,
            schedule: batch.schedule?.description || "",
            startDate: batch.schedule?.startDate ? new Date(batch.schedule.startDate).toISOString().split('T')[0] : ""
        });
        setIsAddModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const url = editingBatch ? `/api/v1/batches/${editingBatch._id}` : "/api/v1/batches";
        const method = editingBatch ? "PATCH" : "POST";

        const resolvedSession = editingBatch 
            ? (editingBatch.session?._id || editingBatch.session || null) 
            : (selectedSessionId && selectedSessionId !== 'all' ? selectedSessionId : null);

        const payload = {
            name: formData.name,
            capacity: parseInt(formData.capacity, 10) || 0,
            session: resolvedSession,
            schedule: { startDate: formData.startDate, description: formData.schedule }
        };

        if (isCollege) {
            payload.semester = parseInt(formData.semester, 10) || 1;
        } else {
            payload.semester = null;
        }

        if (batchType === "bundle" && formData.courseBundle) {
            payload.courseBundle = formData.courseBundle;
            payload.course = null;
        } else {
            payload.course = formData.course || courses[0]?._id || null;
            payload.courseBundle = null;
        }

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setIsAddModalOpen(false);
                setEditingBatch(null);
                setBatchType("course");
                setFormData({ name: "", course: "", semester: 1, courseBundle: "", schedule: "", startDate: "", capacity: 30 });
                fetchInitialData();
                toast.success(editingBatch ? `${isSchool || isCollege ? "Section" : "Batch"} updated successfully` : `${isSchool || isCollege ? "Section" : "Batch"} created successfully`);
            } else {
                const error = await res.json();
                toast.error(error.error || "Operation failed");
            }
        } catch (err) {
            console.error(err);
            toast.error("Operation failed");
        }
    };

    const handleCloneSubmit = async (e) => {
        e.preventDefault();
        if (!cloneSourceSessionId) return toast.error("Please select a source session");

        setIsCloning(true);
        try {
            const res = await fetch("/api/v1/batches/clone", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sourceSessionId: cloneSourceSessionId,
                    targetSessionId: selectedSessionId
                }),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`Successfully cloned ${data.count} sections`);
                setIsCloneModalOpen(false);
                setCloneSourceSessionId("");
                fetchInitialData();
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to clone sections");
            }
        } catch (err) {
            console.error(err);
            toast.error("An error occurred while cloning");
        } finally {
            setIsCloning(false);
        }
    };

    const filteredBatches = batches.filter(batch => {
        const query = search.trim().toLowerCase();
        const matchesSearch = !query ||
                              batch.name?.toLowerCase().includes(query) ||
                              batch.course?.name?.toLowerCase().includes(query) ||
                              batch.courseBundle?.title?.toLowerCase().includes(query);
        // Type filter
        const matchesType = listFilter === "all" ? true
            : listFilter === "bundle" ? !!batch.courseBundle
            : !batch.courseBundle;

        // Course filter
        const matchesCourse = !selectedCourseFilter || (
            (batch.course?._id && String(batch.course._id) === String(selectedCourseFilter)) ||
            String(batch.course) === String(selectedCourseFilter)
        );

        return matchesSearch && matchesType && matchesCourse;
    });

    const collegeFilteredCourses = courses.filter(course => {
        if (selectedDepartmentFilter) {
            const deptId = course.department?._id || course.department;
            if (String(deptId) !== String(selectedDepartmentFilter)) return false;
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            const matchesCourse = course.name?.toLowerCase().includes(q) || course.code?.toLowerCase().includes(q);
            const matchesBatch = batches.some(b => {
                const isThisCourse = (b.course?._id && String(b.course._id) === String(course._id)) || String(b.course) === String(course._id);
                return isThisCourse && b.name?.toLowerCase().includes(q);
            });
            if (!matchesCourse && !matchesBatch) return false;
        }
        return true;
    });

    const totalCollegeBatches = batches.filter(b => !!b.course).length;

    const isInstructorOrStaff = ['instructor', 'staff'].includes(session?.user?.role);

    return (
        <>
            {isInstructorOrStaff && (
                <div className="md:hidden">
                    <MobileInstructorBatches />
                </div>
            )}

            <div className={cn("space-y-6", isInstructorOrStaff ? "hidden md:block" : "")}>
            {isCollege ? (
                /* =========================================================================
                   COLLEGE HIERARCHICAL ACCORDION VIEW (Course ➔ Semester ➔ Sections)
                   Zero icon containers. Clean typography, badges, and smooth accordion.
                   ========================================================================= */
                <div className="space-y-4">
                    {/* Top Bar for College */}
                    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
                        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-3 flex-1">
                                {departments.length > 0 && (
                                    <div className="w-56">
                                        <Select
                                            value={selectedDepartmentFilter}
                                            onChange={(val) => setSelectedDepartmentFilter(val)}
                                            placeholder="All Departments"
                                            buttonClassName="bg-white border-slate-200"
                                            options={[
                                                { label: "All Departments", value: "" },
                                                ...departments.map(d => ({ label: `${d.name} (${d.code})`, value: d._id }))
                                            ]}
                                        />
                                    </div>
                                )}
                                <div className="flex-1 max-w-md">
                                    <Input
                                        placeholder="Search courses, batches or sections..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        icon={Search}
                                        className="bg-white border-slate-200"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 self-end md:self-auto">
                                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-2 rounded-lg font-mono">
                                    {collegeFilteredCourses.length} Courses • {totalCollegeBatches} Active Batches
                                </span>
                                {session?.user?.role !== 'instructor' && (
                                    <Button 
                                        onClick={() => {
                                            setEditingBatch(null);
                                            setBatchType("course");
                                            setFormData({ name: "", course: courses[0]?._id || "", semester: 1, courseBundle: "", schedule: "", startDate: "", capacity: 30 });
                                            setIsAddModalOpen(true);
                                        }} 
                                        size="md" 
                                        className="flex items-center gap-2 px-5 shadow-sm shadow-blue-500/10"
                                    >
                                        <Plus size={18} strokeWidth={2.5} />
                                        <span>Create Section</span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Courses Accordion List */}
                    {loading ? (
                        <div className="p-16 flex justify-center bg-white rounded-xl border border-slate-100"><LoadingSpinner /></div>
                    ) : collegeFilteredCourses.length === 0 ? (
                        <EmptyState
                            icon={Calendar}
                            title="No courses found"
                            description={courses.length === 0 ? "No courses have been created yet. Add courses in Courses management to organize batches." : "No courses match your active search or department filter."}
                            actionLabel={courses.length === 0 ? "Go to Courses" : undefined}
                            onAction={courses.length === 0 ? () => router.push('/admin/courses') : undefined}
                        />
                    ) : (
                        <div className="space-y-3">
                            {collegeFilteredCourses.map(course => {
                                const courseBatches = batches.filter(b => (b.course?._id && String(b.course._id) === String(course._id)) || String(b.course) === String(course._id));
                                const isExpanded = expandedCourses[course._id] !== undefined ? expandedCourses[course._id] : (collegeFilteredCourses.length === 1);
                                const totalSemesters = course.collegeConfig?.totalSemesters || (course.duration?.value ? Math.round(course.duration.value / 6) : 8);
                                const currentSem = Math.min(activeSemesters[course._id] || 1, totalSemesters);
                                const activeSemBatches = courseBatches.filter(b => (Number(b.semester) || 1) === Number(currentSem));

                                return (
                                    <div
                                        key={course._id}
                                        className="bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all overflow-hidden shadow-xs"
                                    >
                                        {/* Course Accordion Header — NO ICON CONTAINERS */}
                                        <div
                                            onClick={() => toggleCourseExpansion(course._id)}
                                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="text-slate-400 hover:text-slate-600 transition-transform p-0.5">
                                                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                </div>
                                                <Badge variant="code" className="font-mono text-xs font-bold shrink-0">
                                                    {course.code}
                                                </Badge>
                                                <span className="font-bold text-slate-900 text-sm md:text-[15px] truncate">
                                                    {course.name}
                                                </span>
                                                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                                                    {totalSemesters} Semesters ({Math.round(totalSemesters / 2)} Yrs)
                                                </span>
                                                {course.department && (
                                                    <span className="text-xs text-slate-400 font-medium hidden sm:inline-block truncate max-w-[240px]">
                                                        {course.department?.name || (typeof course.department === 'string' ? departments.find(d => d._id === course.department)?.name : '')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 ml-2">
                                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full">
                                                    {courseBatches.length} Active {courseBatches.length === 1 ? "Batch" : "Batches"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Course Expanded Content */}
                                        {isExpanded && (
                                            <div className="bg-slate-50/50 border-t border-slate-100 p-4 sm:p-5 space-y-4">
                                                {/* Semester Tabs */}
                                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                                                    {Array.from({ length: totalSemesters }, (_, i) => i + 1).map(semNum => {
                                                        const count = courseBatches.filter(b => (Number(b.semester) || 1) === Number(semNum)).length;
                                                        const isActive = currentSem === semNum;
                                                        return (
                                                            <button
                                                                key={semNum}
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveSemesters(prev => ({ ...prev, [course._id]: semNum }));
                                                                }}
                                                                className={cn(
                                                                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0",
                                                                    isActive
                                                                        ? "bg-slate-900 text-white shadow-xs"
                                                                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                                                                )}
                                                            >
                                                                <span>Sem {semNum}</span>
                                                                {count > 0 && (
                                                                    <span className={cn(
                                                                        "text-[10px] px-1.5 py-0.2 rounded-full",
                                                                        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 font-bold"
                                                                    )}>
                                                                        {count}
                                                                    </span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Active Semester Header & Section Table */}
                                                <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
                                                    <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/70 border-b border-slate-100">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-sm font-bold text-slate-900">Semester {currentSem}</h4>
                                                            <span className="text-xs text-slate-400 font-medium">
                                                                • {activeSemBatches.length} {activeSemBatches.length === 1 ? "Section" : "Sections"}
                                                            </span>
                                                        </div>
                                                        {session?.user?.role !== 'instructor' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingBatch(null);
                                                                    setBatchType("course");
                                                                    setFormData({
                                                                        name: "",
                                                                        course: course._id,
                                                                        semester: currentSem,
                                                                        courseBundle: "",
                                                                        schedule: "",
                                                                        startDate: "",
                                                                        capacity: 30
                                                                    });
                                                                    setIsAddModalOpen(true);
                                                                }}
                                                                className="flex items-center gap-1 text-xs font-bold text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-100 h-8 px-3"
                                                            >
                                                                <Plus size={14} />
                                                                <span>Add Section</span>
                                                            </Button>
                                                        )}
                                                    </div>

                                                    {activeSemBatches.length === 0 ? (
                                                        <div className="py-10 text-center px-4">
                                                            <p className="text-xs text-slate-400 font-medium">No sections created for Semester {currentSem} yet.</p>
                                                            {session?.user?.role !== 'instructor' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingBatch(null);
                                                                        setBatchType("course");
                                                                        setFormData({
                                                                            name: "",
                                                                            course: course._id,
                                                                            semester: currentSem,
                                                                            courseBundle: "",
                                                                            schedule: "",
                                                                            startDate: "",
                                                                            capacity: 30
                                                                        });
                                                                        setIsAddModalOpen(true);
                                                                    }}
                                                                    className="mt-2 text-xs text-blue-600 font-bold hover:underline"
                                                                >
                                                                    + Create Section for Semester {currentSem}
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left border-collapse">
                                                                <thead>
                                                                    <tr className="border-b border-slate-100 bg-white text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                                                        <th className="px-5 py-3">Section Name</th>
                                                                        <th className="px-5 py-3">Schedule</th>
                                                                        <th className="px-5 py-3">Occupancy</th>
                                                                        <th className="px-5 py-3 text-right">Actions</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100 text-sm">
                                                                    {activeSemBatches.map(batch => (
                                                                        <tr key={batch._id} className="group hover:bg-slate-50/60 transition-colors">
                                                                            <td className="px-5 py-3.5">
                                                                                <div className="font-bold text-slate-900 text-sm">{batch.name}</div>
                                                                                <div className="text-[11px] text-slate-400 font-medium">
                                                                                    Starts {batch.schedule?.startDate ? format(new Date(batch.schedule.startDate), "MMM d, yyyy") : "TBD"}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-5 py-3.5">
                                                                                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                                                                    <Clock size={13} className="text-slate-400" />
                                                                                    <span>{batch.schedule?.description || batch.schedule?.timing || "No schedule set"}</span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-5 py-3.5">
                                                                                <div className="flex items-center gap-2.5 max-w-[140px]">
                                                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                                        <div
                                                                                            className={cn(
                                                                                                "h-full transition-all duration-300",
                                                                                                ((batch.activeEnrollmentCount || 0) / (batch.capacity || 1)) > 0.8 ? "bg-rose-500" : "bg-emerald-500"
                                                                                            )}
                                                                                            style={{ width: `${Math.min(100, ((batch.activeEnrollmentCount || 0) / (batch.capacity || 1)) * 100)}%` }}
                                                                                        />
                                                                                    </div>
                                                                                    <span className="text-xs font-bold text-slate-700 font-mono">
                                                                                        {batch.activeEnrollmentCount || 0}/{batch.capacity || 30}
                                                                                    </span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-5 py-3.5 text-right">
                                                                                <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                                                                    <button
                                                                                        onClick={() => router.push(`/admin/batches/${batch._id}`)}
                                                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                                                        title="View Section Details"
                                                                                    >
                                                                                        <ExternalLink size={15} />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleBatchChat(batch)}
                                                                                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                                                        title="Broadcast to Section"
                                                                                    >
                                                                                        <MessageSquare size={15} />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => router.push(`/admin/attendance?batchId=${batch._id}`)}
                                                                                        className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                                                                        title="Mark Attendance"
                                                                                    >
                                                                                        <Calendar size={15} />
                                                                                    </button>
                                                                                    {session?.user?.role !== 'instructor' && (
                                                                                        <>
                                                                                            <button
                                                                                                onClick={(e) => { e.stopPropagation(); handleEditBatch(batch); }}
                                                                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                                                                title="Edit Section"
                                                                                            >
                                                                                                <Edit2 size={15} />
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={(e) => { e.stopPropagation(); handleDeleteBatch(batch._id); }}
                                                                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                                                                title="Delete Section"
                                                                                            >
                                                                                                <Trash2 size={15} />
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
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                /* Existing School / Vocational flat table view */
                <>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                        <div />
                        {session?.user?.role !== 'instructor' && (
                            <div className="flex items-center gap-2">
                                {/* How to Use Bundle Batches — only for Vocational */}
                                {isVocational && (
                                    <button
                                        onClick={() => setIsHowToOpen(true)}
                                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all"
                                        title="How to use Bundle Batches"
                                    >
                                        <HelpCircle size={14} />
                                        How to use Bundle Batches
                                    </button>
                                )}
                                {isSchool && (
                                    <Button 
                                        onClick={() => setIsCloneModalOpen(true)}
                                        variant="outline"
                                        size="md"
                                        className="flex items-center gap-2 border-slate-200"
                                    >
                                        <Copy size={16} />
                                        <span>Clone Sections</span>
                                    </Button>
                                )}
                                <Button 
                                    onClick={() => {
                                        setEditingBatch(null);
                                        setBatchType("course");
                                        setFormData({ name: "", course: "", semester: 1, courseBundle: "", schedule: "", startDate: "", capacity: 30 });
                                        setIsAddModalOpen(true);
                                    }} 
                                    size="md" 
                                    className="flex items-center gap-2 px-6 shadow-sm shadow-blue-500/10"
                                >
                                    <Plus size={18} strokeWidth={2.5} />
                                    <span>Create {isSchool ? "Section" : "Batch"}</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 p-4 bg-[#F9FAFB] border-b border-slate-100">
                            <div className="flex flex-wrap items-center gap-3 w-full">
                                {institutes.length > 0 && (
                                    <div className="min-w-[200px]">
                                        <Select
                                            value={selectedInstitute}
                                            onChange={(val) => setSelectedInstitute(val)}
                                            placeholder="All Institutes"
                                            buttonClassName="bg-white border-slate-200"
                                            options={[
                                                { label: "All Institutes", value: "" },
                                                ...institutes.map(i => ({ label: i.name, value: i._id }))
                                            ]}
                                        />
                                    </div>
                                )}
                                {courses.length > 0 && (
                                    <div className="w-56">
                                        <Select
                                            value={selectedCourseFilter}
                                            onChange={(val) => setSelectedCourseFilter(val)}
                                            placeholder={isSchool ? "All Classes" : "All Courses"}
                                            buttonClassName="bg-white border-slate-200"
                                            options={[
                                                { label: isSchool ? "All Classes" : "All Courses", value: "" },
                                                ...courses.map(c => ({ label: `${c.name} (${c.code})`, value: c._id }))
                                            ]}
                                        />
                                    </div>
                                )}
                                <div className="flex-1 max-w-md">
                                    <Input
                                        placeholder={`Search ${isSchool ? "sections" : "batches"}...`}
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        icon={Search}
                                        className="bg-white border-slate-200"
                                    />
                                </div>
                                {/* Type Filter — Vocational only */}
                                {isVocational && (
                                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-0.5">
                                        {[{v: "all", label: "All"}, {v: "course", label: "Courses"}, {v: "bundle", label: "🎁 Bundles"}].map(({v, label}) => (
                                            <button
                                                key={v}
                                                onClick={() => setListFilter(v)}
                                                className={cn(
                                                    "px-2.5 py-1 text-xs font-bold rounded transition-all",
                                                    listFilter === v ? "bg-slate-900 text-white shadow-xs" : "text-slate-500 hover:bg-slate-50"
                                                )}
                                            >{label}</button>
                                        ))}
                                    </div>
                                )}
                                <div className="flex-1" />
                                <Badge variant="hot" className="bg-orange-50 text-orange-600 font-mono text-[10px]">
                                    {filteredBatches.length} Active {isSchool ? "Sections" : "Batches"}
                                </Badge>
                            </div>
                        </div>

                        <div>
                            {loading ? (
                                <div className="p-12 flex justify-center"><LoadingSpinner /></div>
                            ) : filteredBatches.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-white">
                                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">{isSchool ? "Section" : "Batch"} Name</th>
                                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">{isSchool ? "Class" : "Course"} Detail</th>
                                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Schedule</th>
                                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Occupancy</th>
                                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredBatches.map((batch) => (
                                                <tr key={batch._id} className="group hover:bg-[#F9FAFB] transition-all duration-200">
                                                    <td className="px-6 py-4">
                                                        <div>
                                                            <h3 className="font-bold text-slate-900 text-[14px] leading-tight">{batch.name}</h3>
                                                            <p className="text-[12px] text-slate-400 font-medium mt-0.5">
                                                                Starts {batch.schedule?.startDate ? format(new Date(batch.schedule.startDate), "MMM d, yyyy") : "TBD"}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {batch.courseBundle ? (
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-xs font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                        <Package size={11} /> Bundle
                                                                    </span>
                                                                    <Badge variant="code">{batch.courseBundle?.code || "PKG"}</Badge>
                                                                </div>
                                                                <p className="text-[11px] text-slate-500 font-bold mt-0.5 truncate max-w-[160px]">{batch.courseBundle?.title}</p>
                                                                <p className="text-[10px] text-emerald-600 font-bold">₹{batch.courseBundle?.bundlePrice?.toLocaleString()}</p>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <Badge variant="code">{batch.course?.code || "N/A"}</Badge>
                                                                <p className="text-[11px] text-slate-500 font-bold mt-1.5 truncate max-w-[150px]">{batch.course?.name}</p>
                                                            </>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 text-slate-700 text-[12px] font-bold">
                                                                <Clock size={14} className="text-slate-400" />
                                                                <span>{batch.schedule?.timing || "No time set"}</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {batch.schedule?.days?.map(day => (
                                                                    <span key={day} className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                                                        {day.substring(0, 3)}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
                                                                <div 
                                                                    className={cn(
                                                                        "h-full transition-all duration-500",
                                                                        ((batch.activeEnrollmentCount || 0) / batch.capacity) > 0.8 ? "bg-rose-500" : "bg-emerald-500"
                                                                    )}
                                                                    style={{ width: `${Math.min(100, ((batch.activeEnrollmentCount || 0) / batch.capacity) * 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[11px] font-black text-slate-900">{batch.activeEnrollmentCount || 0}/{batch.capacity}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                                                            <button
                                                                onClick={() => router.push(`/admin/batches/${batch._id}`)}
                                                                className="p-2 text-slate-400 hover:text-premium-blue hover:bg-blue-50 rounded-lg transition-all"
                                                                title={`View ${isSchool ? "Section" : "Batch"} Details`}
                                                            >
                                                                <ExternalLink size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleBatchChat(batch)}
                                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                                title={`Broadcast to ${isSchool ? "Section" : "Batch"}`}
                                                            >
                                                                <MessageSquare size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => router.push(`/admin/attendance?batchId=${batch._id}`)}
                                                                className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                                                title="Mark Attendance"
                                                            >
                                                                <Calendar size={16} />
                                                            </button>
                                                            {session?.user?.role !== 'instructor' && (
                                                                <>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleEditBatch(batch); }}
                                                                        className="p-2 text-slate-400 hover:text-premium-blue hover:bg-blue-50 rounded-lg transition-all"
                                                                        title={`Edit ${isSchool ? "Section" : "Batch"}`}
                                                                    >
                                                                        <Edit2 size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteBatch(batch._id); }}
                                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                        title={`Delete ${isSchool ? "Section" : "Batch"}`}
                                                                    >
                                                                        <Trash2 size={16} />
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
                                <EmptyState
                                    icon={Calendar}
                                    title={isSchool ? "No sections found" : "No batches found"}
                                    description={isSchool ? "Create your first section for this session to start enrollments." : "Schedule your first batch to start enrollments."}
                                    actionLabel={isSchool ? "Create Section" : "Create Batch"}
                                    onAction={() => setIsAddModalOpen(true)}
                                />
                            )}
                        </div>
                    </div>
                </>
            )}

            <Modal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingBatch(null);
                    setBatchType("course");
                    setFormData({ name: "", course: "", semester: 1, courseBundle: "", schedule: "", startDate: "", capacity: 30 });
                }}
                title={editingBatch ? `Edit ${isSchool || isCollege ? "Section" : "Batch"}` : `Schedule New ${isSchool || isCollege ? "Section" : "Batch"}`}
            >
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">{isSchool || isCollege ? "Section" : "Batch"} Configuration</div>
                <form onSubmit={handleFormSubmit} className="space-y-5">

                    {/* Batch Type Toggle — Vocational only, hide on edit since type cannot change */}
                    {isVocational && !editingBatch && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">Batch Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setBatchType("course")}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                                        batchType === "course"
                                            ? "border-blue-500 bg-blue-50 text-blue-700"
                                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                    )}
                                >
                                    <BookOpen size={16} />
                                    Individual Course
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBatchType("bundle")}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                                        batchType === "bundle"
                                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                    )}
                                >
                                    <Package size={16} />
                                    🎁 Bundle Offer
                                </button>
                            </div>
                            {batchType === "bundle" && (
                                <p className="text-[11px] text-indigo-500 font-medium px-1">
                                    This batch will be linked to a Course Bundle Offer. Students enrolled here will be charged the bundle price.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">
                            {batchType === "bundle" ? "Select Bundle Offer" : `Select ${isSchool ? "Class" : "Course"}`}
                        </label>
                        {batchType === "bundle" ? (
                            <>
                                <Select
                                    value={formData.courseBundle}
                                    onChange={(val) => setFormData(prev => ({ ...prev, courseBundle: val }))}
                                    options={[
                                        { label: "-- Select a Bundle Offer --", value: "" },
                                        ...bundles.filter(b => b.isActive).map(b => ({
                                            label: `🎁 ${b.title} (${b.code}) — ₹${b.bundlePrice?.toLocaleString()} · ${b.courses?.length || 0} courses`,
                                            value: b._id
                                        }))
                                    ]}
                                    placeholder="-- Select a Bundle Offer --"
                                    required
                                />
                                {/* Bundle preview card */}
                                {(() => {
                                    const sel = bundles.find(b => b._id === formData.courseBundle);
                                    if (!sel) return null;
                                    const courseNames = (sel.courses || []).map(c => c.name || c.code || 'Course').join(', ');
                                    return (
                                        <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl space-y-1 text-sm">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-indigo-800">🎁 {sel.title}</span>
                                                <span className="text-emerald-700 font-extrabold text-xs bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">₹{sel.bundlePrice?.toLocaleString()}</span>
                                            </div>
                                            <p className="text-[11px] text-slate-600">Includes: <span className="font-semibold">{courseNames}</span></p>
                                        </div>
                                    );
                                })()}
                                {bundles.filter(b => b.isActive).length === 0 && (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium flex items-center gap-2">
                                        <AlertCircle size={14} />
                                        No active bundle offers found. <button type="button" className="underline font-bold" onClick={() => router.push('/admin/courses?tab=bundles')}>Create one first →</button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <Select
                                value={formData.course}
                                onChange={(val) => {
                                    const selCourse = courses.find(c => c._id === val);
                                    const semsCount = selCourse?.collegeConfig?.totalSemesters || (selCourse?.duration?.value ? Math.round(selCourse.duration.value / 6) : 8);
                                    setFormData(prev => ({
                                        ...prev,
                                        course: val,
                                        semester: Math.min(prev.semester || 1, semsCount)
                                    }));
                                }}
                                options={[
                                    ...courses.map(course => ({ label: `${course.name} (${course.code})`, value: course._id }))
                                ]}
                                placeholder={`-- Select a ${isSchool ? "Class" : "Course"} --`}
                                required
                            />
                        )}
                    </div>

                    {isCollege && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">
                                Semester
                            </label>
                            <Select
                                value={String(formData.semester || 1)}
                                onChange={(val) => setFormData(prev => ({ ...prev, semester: parseInt(val, 10) || 1 }))}
                                options={(() => {
                                    const selCourse = courses.find(c => c._id === formData.course);
                                    const semsCount = selCourse?.collegeConfig?.totalSemesters || (selCourse?.duration?.value ? Math.round(selCourse.duration.value / 6) : 8);
                                    return Array.from({ length: semsCount }, (_, i) => ({
                                        label: `Semester ${i + 1}`,
                                        value: String(i + 1)
                                    }));
                                })()}
                                placeholder="Select Semester"
                                required
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            id="name"
                            label={`${isSchool || isCollege ? "Section" : "Batch"} Name`}
                            placeholder={`e.g. ${isSchool || isCollege ? "Section A" : "Morning Batch A"}`}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <Input
                            id="capacity"
                            label="Capacity"
                            type="number"
                            placeholder="e.g. 30"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            id="startDate"
                            label="Start Date"
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            required
                        />
                        <Input
                            id="schedule"
                            label="Schedule"
                            placeholder="e.g. Mon-Fri, 10 AM"
                            value={formData.schedule}
                            onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                            required
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => {
                            setIsAddModalOpen(false);
                            setEditingBatch(null);
                            setBatchType("course");
                            setFormData({ name: "", course: "", semester: 1, courseBundle: "", schedule: "", startDate: "", capacity: 30 });
                        }}>Cancel</Button>
                        <Button type="submit" className="flex-1">{editingBatch ? `Update ${isSchool || isCollege ? "Section" : "Batch"}` : `Create ${isSchool || isCollege ? "Section" : "Batch"}`}</Button>
                    </div>
                </form>
            </Modal>

            {/* Clone Sections Modal */}
            <Modal
                isOpen={isCloneModalOpen}
                onClose={() => setIsCloneModalOpen(false)}
                title="Clone Sections"
            >
                <form onSubmit={handleCloneSubmit} className="space-y-6 pt-4">
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
                        <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                        <div className="text-sm text-amber-800">
                            This will duplicate all sections from the source session into the current active session (<span className="font-bold">{sessions?.find(s => s._id === selectedSessionId)?.sessionName}</span>). Instructors will be reset and sections will be empty.
                        </div>
                    </div>
                    
                    <Select
                        label="Source Session"
                        value={cloneSourceSessionId}
                        onChange={setCloneSourceSessionId}
                        options={[
                            { label: "Select Source Session", value: "" },
                            ...sessions.filter(s => s._id !== selectedSessionId).map(s => ({
                                label: s.sessionName,
                                value: s._id
                            }))
                        ]}
                        required
                    />

                    <div className="pt-4 flex items-center justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setIsCloneModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={isCloning || !cloneSourceSessionId}>
                            {isCloning ? "Cloning..." : "Clone Sections"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* How to Use Bundle Batches — Guide Modal */}
            <Modal
                isOpen={isHowToOpen}
                onClose={() => setIsHowToOpen(false)}
                title="How to Enroll Students in Bundle Offers"
            >
                <div className="space-y-5 py-2">
                    <p className="text-sm text-slate-500">
                        Bundle Offers let you enroll a student in multiple courses under a single discounted price. Follow these 3 steps:
                    </p>

                    {/* Step 1 */}
                    <div className="flex gap-4 p-4 rounded-2xl border border-indigo-100 bg-indigo-50/60">
                        <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0">1</div>
                        <div className="flex-1 space-y-1">
                            <h4 className="font-bold text-slate-800 text-sm">Create a Bundle Offer</h4>
                            <p className="text-xs text-slate-500">Go to Courses → <span className="font-semibold">Bundle Offers</span> tab and create a bundle combining 2 or more courses with a special price.</p>
                            <button
                                type="button"
                                onClick={() => { setIsHowToOpen(false); router.push('/admin/courses'); }}
                                className="mt-2 flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                                Go to Courses <ChevronRight size={13} />
                            </button>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-4 p-4 rounded-2xl border border-blue-100 bg-blue-50/60">
                        <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0">2</div>
                        <div className="flex-1 space-y-1">
                            <h4 className="font-bold text-slate-800 text-sm">Create a Bundle Batch</h4>
                            <p className="text-xs text-slate-500">On this page, click <span className="font-semibold">Create Batch</span> and select <span className="font-semibold">🎁 Bundle Offer</span> as the batch type. Choose the bundle offer from the dropdown.</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsHowToOpen(false);
                                    setBatchType("bundle");
                                    setFormData({ name: "", course: "", courseBundle: "", schedule: "", startDate: "", capacity: 30 });
                                    setIsAddModalOpen(true);
                                }}
                                className="mt-2 flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                            >
                                Create Bundle Batch now <ChevronRight size={13} />
                            </button>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-4 p-4 rounded-2xl border border-emerald-100 bg-emerald-50/60">
                        <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0">3</div>
                        <div className="flex-1 space-y-1">
                            <h4 className="font-bold text-slate-800 text-sm">Enroll a Student</h4>
                            <p className="text-xs text-slate-500">Open the student&apos;s profile → click <span className="font-semibold">Enroll New Course</span> → select the <span className="font-semibold">🎁 Course Package</span> from the dropdown. The batch list will now show only batches created for that bundle.</p>
                            <button
                                type="button"
                                onClick={() => { setIsHowToOpen(false); router.push('/admin/students'); }}
                                className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors"
                            >
                                Go to Students <ChevronRight size={13} />
                            </button>
                        </div>
                    </div>

                    <div className="pt-2 bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px] text-slate-500">
                        <span className="font-bold text-slate-700">Tip:</span> The bundle price is automatically applied as the fee during enrollment. You can still override it with a custom amount or a Fee Preset.
                    </div>
                </div>
            </Modal>
        </div>
        </>
    );
}
