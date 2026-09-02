"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
    BookOpen,
    Plus,
    Search,
    Clock,
    CreditCard,
    Trash2,
    Library,
    Edit2,
    Layers,
    Tag,
    CheckCircle2,
    XCircle
} from "lucide-react";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import Link from "next/link";

function formatDuration(value, unit) {
    if (!value) return "N/A";
    const val = parseInt(value, 10);
    const u = (unit || "months").toLowerCase();
    if (val === 1) {
        if (u.startsWith("month")) return "1 month";
        if (u.startsWith("week")) return "1 week";
        if (u.startsWith("day")) return "1 day";
        if (u.startsWith("year")) return "1 year";
    }
    return `${val} ${u}`;
}

function getGradeSortRank(name) {
    const str = (name || '').toLowerCase();
    const match = str.match(/^(\d+)/);
    if (match) {
        return parseInt(match[1], 10);
    }
    return 999;
}

export default function CoursesPage() {
    const toast = useToast();
    const router = useRouter();
    const { data: session } = useSession();

    // Tab state
    const [activeTab, setActiveTab] = useState("courses"); // "courses" | "bundles"

    // Course state
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const isSchool = session?.user?.institute?.type === 'SCHOOL' || session?.user?.institute?.code === 'QUANTECH';
    const [editingCourse, setEditingCourse] = useState(null);
    const [deletingCourse, setDeletingCourse] = useState(null);
    const [activeMenu, setActiveMenu] = useState(null);
    const [institutes, setInstitutes] = useState([]);
    const [selectedInstitute, setSelectedInstitute] = useState("");

    // Form State for Courses
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        description: "",
        duration: { value: "", unit: "months" },
        fees: { amount: "", currency: "INR" },
        subjects: []
    });
    const [allSubjects, setAllSubjects] = useState([]);

    // Bundle state (Vocational only)
    const [bundles, setBundles] = useState([]);
    const [loadingBundles, setLoadingBundles] = useState(false);
    const [isAddBundleModalOpen, setIsAddBundleModalOpen] = useState(false);
    const [editingBundle, setEditingBundle] = useState(null);
    const [deletingBundle, setDeletingBundle] = useState(null);
    const [bundleFormData, setBundleFormData] = useState({
        title: "",
        code: "",
        description: "",
        courses: [],
        bundlePrice: ""
    });

    useEffect(() => {
        fetchCourses();
        fetchSubjects();
        if (session?.user?.role === 'super_admin') {
            fetchInstitutes();
        }
    }, [session, selectedInstitute]);

    useEffect(() => {
        if (!isSchool && activeTab === "bundles") {
            fetchBundles();
        }
    }, [activeTab, selectedInstitute, isSchool]);

    const fetchInstitutes = async () => {
        try {
            const res = await fetch("/api/v1/institutes");
            const data = await res.json();
            setInstitutes(data.institutes || []);
        } catch (error) {
            console.error("Failed to fetch institutes", error);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenu(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchSubjects = async () => {
        try {
            const url = selectedInstitute
                ? `/api/v1/subjects?instituteId=${selectedInstitute}`
                : "/api/v1/subjects";
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setAllSubjects(data.subjects || []);
            }
        } catch (error) {
            console.error("Failed to fetch subjects", error);
        }
    };

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const url = selectedInstitute
                ? `/api/v1/courses?instituteId=${selectedInstitute}`
                : "/api/v1/courses";
            const res = await fetch(url);
            const data = await res.json();
            const list = Array.isArray(data) ? data : (Array.isArray(data?.courses) ? data.courses : []);
            setCourses(list);
        } catch (error) {
            console.error("Failed to fetch courses", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBundles = async () => {
        try {
            setLoadingBundles(true);
            const res = await fetch("/api/v1/course-bundles");
            if (res.ok) {
                const data = await res.json();
                setBundles(data.bundles || []);
            }
        } catch (error) {
            console.error("Failed to fetch course bundles", error);
        } finally {
            setLoadingBundles(false);
        }
    };

    const handleSaveCourse = async (e) => {
        e.preventDefault();
        try {
            const url = editingCourse ? `/api/v1/courses/${editingCourse._id}` : "/api/v1/courses";
            const method = editingCourse ? "PATCH" : "POST";

            const res = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    fees: { ...formData.fees, amount: parseFloat(formData.fees.amount) || 0 }
                }),
            });

            if (res.ok) {
                setIsAddModalOpen(false);
                setEditingCourse(null);
                setFormData({ name: "", code: "", description: "", duration: { value: "", unit: "months" }, fees: { amount: "", currency: "INR" }, subjects: [] });
                fetchCourses();
                toast.success(editingCourse ? "Course updated successfully" : "Course created successfully");
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to save course");
            }
        } catch (err) {
            console.error(err);
            toast.error("An error occurred");
        }
    };

    const confirmDelete = async () => {
        if (!deletingCourse) return;
        try {
            const res = await fetch(`/api/v1/courses/${deletingCourse._id}`, { method: "DELETE" });
            if (res.ok) {
                fetchCourses();
                toast.success("Course deleted successfully");
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to delete course");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete course");
        } finally {
            setDeletingCourse(null);
        }
    };

    const handleEditClick = (course) => {
        setEditingCourse(course);
        setFormData({
            name: course.name || "",
            code: course.code || "",
            description: course.description || "",
            duration: {
                value: course.duration?.value || "",
                unit: course.duration?.unit || "months"
            },
            fees: {
                amount: course.fees?.amount || "",
                currency: course.fees?.currency || "INR"
            },
            subjects: course.subjects || []
        });
        setIsAddModalOpen(true);
        setActiveMenu(null);
    };

    // Bundle Handlers
    const handleSaveBundle = async (e) => {
        e.preventDefault();
        if (bundleFormData.courses.length < 2) {
            toast.error("Please select at least 2 courses for the bundle offer");
            return;
        }

        try {
            const url = editingBundle ? `/api/v1/course-bundles/${editingBundle._id}` : "/api/v1/course-bundles";
            const method = editingBundle ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...bundleFormData,
                    bundlePrice: parseFloat(bundleFormData.bundlePrice) || 0
                })
            });

            if (res.ok) {
                setIsAddBundleModalOpen(false);
                setEditingBundle(null);
                setBundleFormData({ title: "", code: "", description: "", courses: [], bundlePrice: "" });
                fetchBundles();
                toast.success(editingBundle ? "Course bundle updated" : "Course bundle offer created");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to save course bundle");
            }
        } catch (err) {
            console.error(err);
            toast.error("An error occurred");
        }
    };

    const handleToggleBundleActive = async (bundle) => {
        try {
            const res = await fetch(`/api/v1/course-bundles/${bundle._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !bundle.isActive })
            });

            if (res.ok) {
                fetchBundles();
                toast.success(`Bundle ${!bundle.isActive ? 'activated' : 'deactivated'}`);
            }
        } catch (err) {
            toast.error("Failed to toggle bundle status");
        }
    };

    const confirmDeleteBundle = async () => {
        if (!deletingBundle) return;
        try {
            const res = await fetch(`/api/v1/course-bundles/${deletingBundle._id}`, { method: "DELETE" });
            if (res.ok) {
                fetchBundles();
                toast.success("Course bundle deleted");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to delete bundle");
            }
        } catch (err) {
            toast.error("Failed to delete bundle");
        } finally {
            setDeletingBundle(null);
        }
    };

    const handleEditBundleClick = (bundle) => {
        setEditingBundle(bundle);
        setBundleFormData({
            title: bundle.title || "",
            code: bundle.code || "",
            description: bundle.description || "",
            courses: (bundle.courses || []).map(c => c._id || c),
            bundlePrice: bundle.bundlePrice || ""
        });
        setIsAddBundleModalOpen(true);
    };

    // Filter & Sort Logic for Courses (Natural grade sorting)
    const filteredCourses = courses.filter(course =>
        course.name?.toLowerCase().includes(search.toLowerCase()) ||
        course.code?.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => {
        const rankA = getGradeSortRank(a.name);
        const rankB = getGradeSortRank(b.name);
        if (rankA !== rankB) return rankA - rankB;
        return (a.name || "").localeCompare(b.name || "");
    });

    // Filter Logic for Bundles
    const filteredBundles = bundles.filter(b =>
        b.title?.toLowerCase().includes(search.toLowerCase()) ||
        b.code?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Tab Bar for Vocational Institutes */}
            {!isSchool && (
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                    <button
                        onClick={() => setActiveTab("courses")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === "courses"
                                ? "bg-slate-900 text-white shadow-xs"
                                : "text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                        <BookOpen size={16} />
                        <span>Individual Courses</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("bundles")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === "bundles"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                        <Layers size={16} />
                        <span>Course Bundles & Special Offers</span>
                        <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-full bg-amber-400 text-amber-950 font-bold">
                            Offer Packs
                        </span>
                    </button>
                </div>
            )}

            {/* Page Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div /> {/* Spacer */}
                {session?.user?.role !== 'instructor' && (
                    activeTab === "courses" ? (
                        <Button
                            onClick={() => {
                                setEditingCourse(null);
                                setFormData({ name: "", code: "", description: "", duration: { value: "", unit: "months" }, fees: { amount: "", currency: "INR" }, subjects: [] });
                                setIsAddModalOpen(true);
                            }}
                            size="md"
                            className="flex items-center gap-2 px-6 shadow-xs"
                        >
                            <Plus size={18} strokeWidth={2.5} />
                            <span>Add New {isSchool ? "Class" : "Course"}</span>
                        </Button>
                    ) : (
                        <Button
                            onClick={() => {
                                setEditingBundle(null);
                                setBundleFormData({ title: "", code: "", description: "", courses: [], bundlePrice: "" });
                                setIsAddBundleModalOpen(true);
                            }}
                            size="md"
                            className="flex items-center gap-2 px-6 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                        >
                            <Plus size={18} strokeWidth={2.5} />
                            <span>Create Course Bundle Offer</span>
                        </Button>
                    )
                )}
            </div>

            {activeTab === "courses" ? (
                /* Individual Courses / Classes Table View */
                <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 bg-slate-50/60 border-b border-slate-200/80">
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
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
                            <div className="w-full md:max-w-md">
                                <Input
                                    placeholder={`Search ${isSchool ? "classes" : "courses"}...`}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    icon={Search}
                                    className="bg-white border-slate-200 shadow-xs"
                                />
                            </div>
                        </div>
                        <span className="text-xs font-medium text-slate-500 font-mono shrink-0">
                            {filteredCourses.length} {isSchool ? "Classes" : "Courses"} Total
                        </span>
                    </div>

                    <div>
                        {loading ? (
                            <div className="p-12 flex justify-center"><LoadingSpinner /></div>
                        ) : filteredCourses.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200/80 bg-white text-xs font-semibold text-slate-400">
                                            <th className="px-6 py-3.5 uppercase tracking-wider">{isSchool ? "Class" : "Course"} Detail</th>
                                            <th className="px-6 py-3.5 uppercase tracking-wider">Code</th>
                                            <th className="px-6 py-3.5 uppercase tracking-wider">Duration</th>
                                            {session?.user?.role !== 'instructor' && (
                                                <th className="px-6 py-3.5 uppercase tracking-wider text-right">Total Fees</th>
                                            )}
                                            {session?.user?.role !== 'instructor' && (
                                                <th className="px-6 py-3.5 uppercase tracking-wider text-right">Actions</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredCourses.map((course) => (
                                            <tr key={course._id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-start gap-3">
                                                        {/* Containerless Icon */}
                                                        <BookOpen size={18} className="text-blue-600 shrink-0 mt-0.5" />
                                                        <div>
                                                            <Link href={`/admin/courses/${course._id}`} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors text-sm">
                                                                {course.name}
                                                            </Link>
                                                            {course.description && (
                                                                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 leading-relaxed">{course.description}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                                                        {course.code}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock size={14} className="text-slate-400" />
                                                        <span>{formatDuration(course.duration?.value, course.duration?.unit)}</span>
                                                    </div>
                                                </td>
                                                {session?.user?.role !== 'instructor' && (
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="font-semibold text-slate-900 font-mono text-sm">
                                                            ₹{course.fees?.amount?.toLocaleString() || 0}
                                                        </span>
                                                    </td>
                                                )}
                                                {session?.user?.role !== 'instructor' && (
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Link
                                                                href={`/admin/courses/${course._id}/subjects`}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                                                title="Manage & Assign Subjects"
                                                            >
                                                                <BookOpen size={14} />
                                                                <span>Subjects</span>
                                                            </Link>
                                                            <button
                                                                onClick={() => handleEditClick(course)}
                                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50/80 rounded-lg transition-colors cursor-pointer"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => setDeletingCourse(course)}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50/80 rounded-lg transition-colors cursor-pointer"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <EmptyState
                                icon={Library}
                                title={`No ${isSchool ? "classes" : "courses"} found`}
                                description={`Get started by creating your first ${isSchool ? "class" : "course"}.`}
                            />
                        )}
                    </div>
                </div>
            ) : (
                /* Course Bundles & Special Offers View (Vocational) */
                <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 p-4 bg-slate-50/60 border-b border-slate-200/80">
                        <div className="flex flex-wrap items-center gap-3 w-full">
                            <div className="flex-1 max-w-md">
                                <Input
                                    placeholder="Search course bundles..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    icon={Search}
                                    className="bg-white border-slate-200 shadow-xs"
                                />
                            </div>
                            <div className="flex-1" />
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 font-mono text-[10px]">
                                {filteredBundles.length} Bundle Offers Total
                            </Badge>
                        </div>
                    </div>

                    <div className="p-5">
                        {loadingBundles ? (
                            <div className="p-12 flex justify-center"><LoadingSpinner /></div>
                        ) : filteredBundles.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {filteredBundles.map((bundle) => {
                                    const origPrice = bundle.originalPrice || 0;
                                    const offerPrice = bundle.bundlePrice || 0;
                                    const savings = origPrice > offerPrice ? origPrice - offerPrice : 0;
                                    const discountPercent = origPrice > 0 ? Math.round((savings / origPrice) * 100) : 0;

                                    return (
                                        <div
                                            key={bundle._id}
                                            className={`relative rounded-xl border bg-white p-5 transition-colors hover:border-slate-300 flex flex-col justify-between ${
                                                !bundle.isActive ? 'opacity-65 border-slate-200' : 'border-slate-200'
                                            }`}
                                        >
                                            <div>
                                                {/* Header Badge */}
                                                <div className="flex items-start justify-between gap-2 mb-3">
                                                    <div>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                            {bundle.code}
                                                        </span>
                                                        <h3 className="font-bold text-slate-900 text-base mt-1 line-clamp-1">
                                                            {bundle.title}
                                                        </h3>
                                                    </div>
                                                    <button
                                                        onClick={() => handleToggleBundleActive(bundle)}
                                                        title={bundle.isActive ? "Deactivate Offer" : "Activate Offer"}
                                                        className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                                                            bundle.isActive
                                                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                        }`}
                                                    >
                                                        {bundle.isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                                        <span>{bundle.isActive ? 'Active' : 'Draft'}</span>
                                                    </button>
                                                </div>

                                                {bundle.description && (
                                                    <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                                                        {bundle.description}
                                                    </p>
                                                )}

                                                {/* Bundled Courses Chips */}
                                                <div className="mb-4 space-y-1.5">
                                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                        Includes {bundle.courses?.length || 0} Courses:
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(bundle.courses || []).map((c) => (
                                                            <span
                                                                key={c._id || c}
                                                                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded"
                                                            >
                                                                <BookOpen size={12} className="text-blue-500" />
                                                                <span>{c.name || 'Course'}</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Pricing & Offer Savings Banner */}
                                            <div className="pt-4 border-t border-slate-100 mt-2">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                                            Bundle Offer Fee
                                                        </div>
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="text-xl font-extrabold text-slate-900">
                                                                ₹{offerPrice.toLocaleString()}
                                                            </span>
                                                            {origPrice > offerPrice && (
                                                                <span className="text-xs text-slate-400 line-through font-medium">
                                                                    ₹{origPrice.toLocaleString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {discountPercent > 0 && (
                                                        <div className="bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs px-2.5 py-1 rounded flex items-center gap-1">
                                                            <Tag size={12} />
                                                            <span>SAVE {discountPercent}%</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action buttons */}
                                                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-50">
                                                    <button
                                                        onClick={() => handleEditBundleClick(bundle)}
                                                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <Edit2 size={13} />
                                                        <span>Edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setDeletingBundle(bundle)}
                                                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <Trash2 size={13} />
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <EmptyState
                                icon={Library}
                                title="No course bundle offers created yet"
                                description="Bundle 2 or more courses together into an attractive discount offer pack for students."
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Modal: Add/Edit Course */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title={editingCourse ? `Edit ${isSchool ? "Class" : "Course"}` : `Add New ${isSchool ? "Class" : "Course"}`}
            >
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">{isSchool ? "Class" : "Course"} Details</div>
                <form onSubmit={handleSaveCourse} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            id="name"
                            label={`${isSchool ? "Class" : "Course"} Name`}
                            placeholder={`e.g. ${isSchool ? "10th Standard" : "Master of Science"}`}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <Input
                            id="code"
                            label={`${isSchool ? "Class" : "Course"} Code`}
                            placeholder={`e.g. ${isSchool ? "STD-10" : "MSC-CS"}`}
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid grid-cols-2 gap-2">
                            <Input
                                id="durationValue"
                                label="Duration"
                                type="number"
                                placeholder="e.g. 3"
                                value={formData.duration.value || ""}
                                onChange={(e) => setFormData({ ...formData, duration: { ...formData.duration, value: e.target.value } })}
                                required
                            />
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">Unit</label>
                                <Select
                                    value={formData.duration.unit}
                                    onChange={(val) => setFormData({ ...formData, duration: { ...formData.duration, unit: val } })}
                                    options={[
                                        { label: "Months", value: "months" },
                                        { label: "Weeks", value: "weeks" },
                                        { label: "Days", value: "days" }
                                    ]}
                                />
                            </div>
                        </div>
                        <Input
                            id="fees"
                            label="Total Fees (₹)"
                            type="number"
                            placeholder="e.g. 50000"
                            value={formData.fees.amount}
                            onChange={(e) => setFormData({ ...formData, fees: { ...formData.fees, amount: e.target.value } })}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-foreground/70 ml-1">Description</label>
                        <textarea
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-premium-blue/50 focus:ring-4 focus:ring-premium-blue/10 min-h-[100px] text-sm text-slate-700 placeholder:text-slate-400 transition-all resize-none"
                            placeholder={`Brief description of the ${isSchool ? "class" : "course"}...`}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="flex-1">{editingCourse ? `Update ${isSchool ? "Class" : "Course"}` : `Create ${isSchool ? "Class" : "Course"}`}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
