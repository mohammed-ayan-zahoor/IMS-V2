"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    BookOpen,
    Plus,
    Search,
    Edit2,
    Trash2,
    List,
    ChevronLeft,
    Library,
    PlusCircle,
    ArrowRight,
    Info,
    X
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MultiSelect from "@/components/ui/MultiSelect";
import { useToast } from "@/contexts/ToastContext";
import Link from "next/link";

export default function CourseSubjectsPage({ params: paramsPromise }) {
    const params = use(paramsPromise);
    const courseId = params.id;
    const toast = useToast();
    const router = useRouter();
    const { data: session } = useSession();
    const isSchool = session?.user?.institute?.type === 'SCHOOL' || session?.user?.institute?.code === 'QUANTECH';
    const isCollege = session?.user?.institute?.type === 'COLLEGE';

    const [course, setCourse] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [librarySubjects, setLibrarySubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedSemesterTab, setSelectedSemesterTab] = useState("ALL");
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedLibraryIds, setSelectedLibraryIds] = useState([]);
    const [assignSemester, setAssignSemester] = useState(1);
    const [assignCredits, setAssignCredits] = useState(4);
    const [assignSubjectType, setAssignSubjectType] = useState("THEORY");
    const [isAssigning, setIsAssigning] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [deletingSubject, setDeletingSubject] = useState(null);

    useEffect(() => {
        fetchCourseDetails();
        fetchCourseSubjects();
        fetchLibrarySubjects();
    }, [courseId]);

    const fetchCourseDetails = async () => {
        try {
            const res = await fetch(`/api/v1/courses/${courseId}`);
            if (res.ok) {
                const data = await res.json();
                setCourse(data);
            }
        } catch (error) {
            console.error("Failed to fetch course", error);
        }
    };

    const fetchCourseSubjects = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/v1/subjects?courseId=${courseId}`);
            if (res.ok) {
                const data = await res.json();
                setSubjects(data.subjects || []);
            }
        } catch (error) {
            console.error("Failed to fetch subjects", error);
            toast.error("Failed to load subjects");
        } finally {
            setLoading(false);
        }
    };

    const fetchLibrarySubjects = async () => {
        try {
            const res = await fetch("/api/v1/master-subjects");
            if (res.ok) {
                const data = await res.json();
                setLibrarySubjects(data.subjects || []);
            }
        } catch (error) {
            console.error("Failed to fetch library", error);
        }
    };

    const totalSemesters = course?.collegeConfig?.totalSemesters || 8;

    const openAssignModal = () => {
        if (isCollege && selectedSemesterTab !== "ALL") {
            setAssignSemester(Number(selectedSemesterTab));
        }
        setIsAssignModalOpen(true);
    };

    const handleAssignSubjects = async () => {
        if (selectedLibraryIds.length === 0) return;
        setIsAssigning(true);
        try {
            const payload = {
                librarySubjectIds: selectedLibraryIds,
                ...(isCollege ? {
                    semester: Number(assignSemester),
                    credits: assignCredits !== "" && assignCredits !== null ? Number(assignCredits) : null,
                    subjectType: assignSubjectType
                } : {})
            };

            const res = await fetch(`/api/v1/courses/${courseId}/assign-subjects`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Subjects assigned successfully");
                setIsAssignModalOpen(false);
                setSelectedLibraryIds([]);
                fetchCourseSubjects();
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to assign subjects");
            }
        } catch (err) {
            toast.error("Failed to assign subjects");
        } finally {
            setIsAssigning(false);
        }
    };

    const handleUpdateSubject = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!editingSubject) return;
        setIsUpdating(true);
        try {
            const payload = {
                name: editingSubject.name,
                code: editingSubject.code,
                ...(isCollege ? {
                    semester: editingSubject.semester ? Number(editingSubject.semester) : null,
                    credits: editingSubject.credits !== "" && editingSubject.credits !== null ? Number(editingSubject.credits) : null,
                    subjectType: editingSubject.subjectType || "THEORY"
                } : {})
            };

            const res = await fetch(`/api/v1/subjects/${editingSubject._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Subject updated successfully");
                setEditingSubject(null);
                fetchCourseSubjects();
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to update subject");
            }
        } catch (err) {
            toast.error("Failed to update subject");
        } finally {
            setIsUpdating(false);
        }
    };

    const confirmDelete = async () => {
        if (!deletingSubject) return;
        try {
            const res = await fetch(`/api/v1/subjects/${deletingSubject._id}`, {
                method: "DELETE"
            });

            if (res.ok) {
                setDeletingSubject(null);
                fetchCourseSubjects();
                toast.success("Subject removed from class");
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to remove subject");
            }
        } catch (err) {
            toast.error("Failed to remove subject");
        }
    };

    const filteredSubjects = subjects.filter(subject => {
        const matchesSearch =
            subject.name?.toLowerCase().includes(search.toLowerCase()) ||
            subject.code?.toLowerCase().includes(search.toLowerCase());
        const matchesSem =
            !isCollege || selectedSemesterTab === "ALL" || subject.semester === Number(selectedSemesterTab);
        return matchesSearch && matchesSem;
    });

    const displayedCredits = filteredSubjects.reduce((acc, s) => acc + (Number(s.credits) || 0), 0);

    // Filter library subjects to exclude those already assigned
    const assignableSubjects = librarySubjects.filter(libSub => 
        !subjects.find(s => s.masterSubject?._id === libSub._id || s.code === libSub.code)
    );

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.push('/admin/courses')}
                        className="p-2 hover:bg-slate-100 rounded-lg active:scale-90 transition-transform text-slate-400 hover:text-slate-600 cursor-pointer"
                        aria-label="Back to courses"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            {course?.name} <span className="text-slate-400 font-medium">/ Subjects</span>
                        </h1>
                        <p className="text-[12px] text-slate-500 font-medium tracking-tight mt-0.5">
                            Manage curriculum and syllabus for this {isSchool ? "class" : "course"}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2.5">
                    <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/admin/subjects')}
                        className="flex items-center gap-2 active:scale-95 transition-transform"
                    >
                        <Library size={16} />
                        <span>Manage Library</span>
                    </Button>
                    <Button 
                        size="sm"
                        onClick={openAssignModal}
                        className="flex items-center gap-2 active:scale-95 transition-transform shadow-xs cursor-pointer"
                    >
                        <PlusCircle size={16} />
                        <span>Assign Subjects</span>
                    </Button>
                </div>
            </div>

            {/* Info Alert */}
            <div className="bg-blue-50/60 border border-blue-100/80 rounded-xl p-3.5 flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Info size={16} />
                </div>
                <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-blue-900">Curriculum Strategy</h4>
                    <p className="text-[11px] text-blue-700/80 leading-relaxed font-medium">
                        {isCollege 
                            ? "Assign subjects from your master library to specific semesters with credits and course types. Customize the syllabus modules for this degree program."
                            : `First, assign subjects from your global library. Once assigned, you can customize the syllabus specifically for this ${isSchool ? "class" : "course"}.`}
                    </p>
                </div>
            </div>

            {/* College Semester Tabs - Apple Segmented Control */}
            {isCollege && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin p-1 bg-slate-100/70 rounded-xl w-fit max-w-full">
                    <button
                        onClick={() => setSelectedSemesterTab("ALL")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap active:scale-95 transition-transform flex items-center gap-1.5 cursor-pointer ${
                            selectedSemesterTab === "ALL"
                                ? "bg-white text-slate-900 shadow-xs font-bold"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <span>All Semesters</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            selectedSemesterTab === "ALL" ? "bg-slate-100 text-slate-700" : "bg-slate-200/60 text-slate-500"
                        }`}>
                            {subjects.length}
                        </span>
                    </button>
                    {Array.from({ length: totalSemesters }, (_, i) => i + 1).map(sem => {
                        const semSubjects = subjects.filter(s => s.semester === sem);
                        const isActive = selectedSemesterTab === sem;
                        return (
                            <button
                                key={sem}
                                onClick={() => setSelectedSemesterTab(sem)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap active:scale-95 transition-transform flex items-center gap-1.5 cursor-pointer ${
                                    isActive
                                        ? "bg-white text-slate-900 shadow-xs font-bold"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <span>Sem {sem}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                    isActive ? "bg-slate-100 text-slate-700" : "bg-slate-200/60 text-slate-500"
                                }`}>
                                    {semSubjects.length}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="flex flex-row items-center justify-between p-3.5 bg-slate-50/50 border-b border-slate-200/70 gap-3">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                        <input
                            type="text"
                            placeholder={isCollege ? "Search subjects by name or code..." : "Search assigned subjects..."}
                            className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-200/90 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 active:scale-90 transition-transform p-0.5 rounded cursor-pointer"
                                aria-label="Clear search"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {isCollege && (
                            <Badge variant="secondary" className="px-2.5 py-0.5 text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {displayedCredits} Credits
                            </Badge>
                        )}
                        <Badge variant="secondary" className="px-2.5 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-600">
                            {filteredSubjects.length} {filteredSubjects.length === 1 ? "Subject" : "Subjects"}
                        </Badge>
                    </div>
                </div>
                <div>
                    {loading ? (
                        <div className="p-16 flex justify-center"><LoadingSpinner /></div>
                    ) : filteredSubjects.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/30">
                                        <th className="px-5 py-3">Subject</th>
                                        <th className="px-5 py-3">Code</th>
                                        {isCollege && (
                                            <>
                                                <th className="px-5 py-3">Semester</th>
                                                <th className="px-5 py-3">Credits</th>
                                                <th className="px-5 py-3">Type</th>
                                            </>
                                        )}
                                        <th className="px-5 py-3">Syllabus Status</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredSubjects.map((subject, idx) => (
                                        <motion.tr 
                                            key={subject._id} 
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ 
                                                duration: 0.22, 
                                                delay: Math.min(idx * 0.025, 0.2), 
                                                ease: [0.16, 1, 0.3, 1] 
                                            }}
                                            className="group hover:bg-slate-50/70 transition-colors"
                                        >
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50/80 text-blue-600 flex items-center justify-center border border-blue-100/60 shrink-0">
                                                        <BookOpen size={15} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-slate-900 text-xs sm:text-sm leading-snug">{subject.name}</h3>
                                                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                                            {subject.masterSubject ? "From Library" : "Custom Subject"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <Badge variant="code">{subject.code}</Badge>
                                            </td>
                                            {isCollege && (
                                                <>
                                                    <td className="px-5 py-3.5">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                                                            {subject.semester ? `Sem ${subject.semester}` : "—"}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="text-xs font-bold text-slate-800">
                                                            {subject.credits !== null && subject.credits !== undefined ? `${subject.credits} Cr` : "—"}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600 tracking-wider">
                                                            {subject.subjectType || "THEORY"}
                                                        </span>
                                                    </td>
                                                </>
                                            )}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-300 ${subject.syllabus?.length > 0 ? "bg-emerald-500" : "bg-slate-300"}`}
                                                            style={{ width: subject.syllabus?.length > 0 ? "100%" : "0%" }}
                                                        />
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-slate-500">
                                                        {subject.syllabus?.length > 0 
                                                            ? `${subject.syllabus.length} ${isCollege ? (subject.syllabus.length === 1 ? "Module" : "Modules") : (subject.syllabus.length === 1 ? "Chapter" : "Chapters")}`
                                                            : "Not Started"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button 
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 px-2.5 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-transform text-xs"
                                                        onClick={() => router.push(`/admin/subjects/${subject._id}/syllabus`)}
                                                    >
                                                        <List size={13} />
                                                        <span>Syllabus</span>
                                                        <ArrowRight size={11} />
                                                    </Button>
                                                    <button
                                                        onClick={() => setEditingSubject(subject)}
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50/80 rounded-md active:scale-90 transition-transform cursor-pointer"
                                                        title="Edit Subject"
                                                        aria-label="Edit Subject"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeletingSubject(subject)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50/80 rounded-md active:scale-90 transition-transform cursor-pointer"
                                                        title="Remove Subject"
                                                        aria-label="Remove Subject"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState
                            icon={PlusCircle}
                            title="No subjects found"
                            description={
                                isCollege && selectedSemesterTab !== "ALL"
                                    ? `No subjects assigned to Semester ${selectedSemesterTab} yet.`
                                    : `Assign subjects from the library to this ${isSchool ? "class" : "course"} to begin syllabus tracking.`
                            }
                            action={{
                                label: "Assign Subjects",
                                onClick: openAssignModal
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Assign Subjects Modal */}
            <Modal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                title="Assign Subjects from Library"
            >
                <div className="space-y-5 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Available Subjects</label>
                        <MultiSelect
                            placeholder="Select subjects to add..."
                            options={assignableSubjects.map(s => ({ label: `${s.name} (${s.code})`, value: s._id }))}
                            value={selectedLibraryIds}
                            onChange={setSelectedLibraryIds}
                        />
                        <p className="text-[11px] text-slate-500 italic mt-2">
                            Only subjects not already assigned to this {isSchool ? "class" : "course"} are shown.
                        </p>
                    </div>

                    {isCollege && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/60">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Semester</label>
                                <select
                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-slate-400"
                                    value={assignSemester}
                                    onChange={e => setAssignSemester(Number(e.target.value))}
                                >
                                    {Array.from({ length: totalSemesters }, (_, i) => i + 1).map(sem => (
                                        <option key={sem} value={sem}>Semester {sem}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Credits</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="20"
                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-slate-400"
                                    value={assignCredits}
                                    onChange={e => setAssignCredits(e.target.value)}
                                    placeholder="e.g. 4"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subject Type</label>
                                <select
                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-slate-400"
                                    value={assignSubjectType}
                                    onChange={e => setAssignSubjectType(e.target.value)}
                                >
                                    <option value="THEORY">Theory</option>
                                    <option value="LAB">Lab / Practical</option>
                                    <option value="ELECTIVE">Elective</option>
                                    <option value="PROJECT">Project</option>
                                    <option value="AUDIT">Audit (Non-credit)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="pt-3 flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
                        <Button 
                            className="flex-1" 
                            onClick={handleAssignSubjects}
                            loading={isAssigning}
                            disabled={selectedLibraryIds.length === 0}
                        >
                            Assign Selected ({selectedLibraryIds.length})
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Edit Subject Modal */}
            <Modal
                isOpen={!!editingSubject}
                onClose={() => setEditingSubject(null)}
                title="Edit Subject Details"
            >
                {editingSubject && (
                    <form onSubmit={handleUpdateSubject} className="space-y-4 pt-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subject Name</label>
                            <input
                                type="text"
                                required
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                                value={editingSubject.name || ""}
                                onChange={e => setEditingSubject({ ...editingSubject, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subject Code</label>
                            <input
                                type="text"
                                required
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm uppercase font-mono focus:outline-none focus:border-slate-400"
                                value={editingSubject.code || ""}
                                onChange={e => setEditingSubject({ ...editingSubject, code: e.target.value.toUpperCase() })}
                            />
                        </div>

                        {isCollege && (
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Semester</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-slate-400"
                                        value={editingSubject.semester || 1}
                                        onChange={e => setEditingSubject({ ...editingSubject, semester: Number(e.target.value) })}
                                    >
                                        {Array.from({ length: totalSemesters }, (_, i) => i + 1).map(sem => (
                                            <option key={sem} value={sem}>Sem {sem}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Credits</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="20"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                                        value={editingSubject.credits ?? 4}
                                        onChange={e => setEditingSubject({ ...editingSubject, credits: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-slate-400"
                                        value={editingSubject.subjectType || "THEORY"}
                                        onChange={e => setEditingSubject({ ...editingSubject, subjectType: e.target.value })}
                                    >
                                        <option value="THEORY">Theory</option>
                                        <option value="LAB">Lab</option>
                                        <option value="ELECTIVE">Elective</option>
                                        <option value="PROJECT">Project</option>
                                        <option value="AUDIT">Audit</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 flex gap-3">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingSubject(null)}>Cancel</Button>
                            <Button type="submit" className="flex-1" loading={isUpdating}>Save Changes</Button>
                        </div>
                    </form>
                )}
            </Modal>

            <ConfirmDialog
                isOpen={!!deletingSubject}
                onClose={() => setDeletingSubject(null)}
                onConfirm={confirmDelete}
                title="Remove Subject"
                message={`Are you sure you want to remove "${deletingSubject?.name}" from this ${isSchool ? "class" : "course"}? This will also remove its class-specific syllabus.`}
            />
        </div>
    );
}
