"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
    Info
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
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

    const [course, setCourse] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [librarySubjects, setLibrarySubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedLibraryIds, setSelectedLibraryIds] = useState([]);
    const [isAssigning, setIsAssigning] = useState(false);
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

    const handleAssignSubjects = async () => {
        if (selectedLibraryIds.length === 0) return;
        setIsAssigning(true);
        try {
            const res = await fetch(`/api/v1/courses/${courseId}/assign-subjects`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ librarySubjectIds: selectedLibraryIds })
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

    const filteredSubjects = subjects.filter(subject =>
        subject.name?.toLowerCase().includes(search.toLowerCase()) ||
        subject.code?.toLowerCase().includes(search.toLowerCase())
    );

    // Filter library subjects to exclude those already assigned
    const assignableSubjects = librarySubjects.filter(libSub => 
        !subjects.find(s => s.masterSubject?._id === libSub._id || s.code === libSub.code)
    );

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.push('/admin/courses')}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
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
                
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline"
                        onClick={() => router.push('/admin/subjects')}
                        className="flex items-center gap-2"
                    >
                        <Library size={18} />
                        <span>Manage Library</span>
                    </Button>
                    <Button 
                        onClick={() => setIsAssignModalOpen(true)}
                        className="flex items-center gap-2 shadow-premium"
                    >
                        <PlusCircle size={18} />
                        <span>Assign Subjects</span>
                    </Button>
                </div>
            </div>

            {/* Info Alert */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Info size={20} />
                </div>
                <div className="space-y-1">
                    <h4 className="text-sm font-bold text-blue-900">Curriculum Strategy</h4>
                    <p className="text-[12px] text-blue-700/80 leading-relaxed font-medium">
                        First, assign subjects from your global library. Once assigned, you can customize the syllabus specifically for this {isSchool ? "class" : "course"}. This ensures "English" remains a single concept while having different content for each grade.
                    </p>
                </div>
            </div>

            <Card className="overflow-hidden border-none shadow-premium">
                <CardHeader className="flex flex-row items-center justify-between bg-[#F9FAFB]/50 border-b border-slate-100">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search assigned subjects..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-premium-blue/40 focus:ring-4 focus:ring-premium-blue/5 transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Badge variant="secondary" className="px-3 py-1">
                        {subjects.length} Subjects Linked
                    </Badge>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12 flex justify-center"><LoadingSpinner /></div>
                    ) : filteredSubjects.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Subject</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Code</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Syllabus Status</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredSubjects.map(subject => (
                                        <tr key={subject._id} className="group hover:bg-[#F9FAFB] transition-all duration-200">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/50">
                                                        <BookOpen size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-[14px] leading-tight">{subject.name}</h3>
                                                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                                            {subject.masterSubject ? "From Library" : "Custom Subject"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="code">{subject.code}</Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-500 ${subject.syllabus?.length > 0 ? "bg-emerald-500" : "bg-slate-300"}`}
                                                            style={{ width: subject.syllabus?.length > 0 ? "100%" : "0%" }}
                                                        />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                                                        {subject.syllabus?.length > 0 ? `${subject.syllabus.length} Chapters` : "Not Started"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                    <Button 
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                        onClick={() => router.push(`/admin/subjects/${subject._id}/syllabus`)}
                                                    >
                                                        <List size={14} />
                                                        <span>Manage Syllabus</span>
                                                        <ArrowRight size={12} />
                                                    </Button>
                                                    <button
                                                        onClick={() => setDeletingSubject(subject)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Remove Subject"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState
                            icon={PlusCircle}
                            title="No subjects assigned"
                            description={`Assign subjects from the library to this ${isSchool ? "class" : "course"} to begin syllabus tracking.`}
                            action={{
                                label: "Assign Subjects",
                                onClick: () => setIsAssignModalOpen(true)
                            }}
                        />
                    )}
                </CardContent>
            </Card>

            <Modal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                title="Assign Subjects from Library"
            >
                <div className="space-y-6 pt-2">
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

                    <div className="pt-4 flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
                        <Button 
                            className="flex-1" 
                            onClick={handleAssignSubjects}
                            loading={isAssigning}
                            disabled={selectedLibraryIds.length === 0}
                        >
                            Assign Selected
                        </Button>
                    </div>
                </div>
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
