"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { 
    Download, 
    Loader2, 
    Check, 
    Users, 
    Search, 
    ChevronLeft, 
    ChevronRight,
    IdCard,
    Filter
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";
import debounce from "lodash/debounce"; // You might not have this, I'll write manual debounce

export default function GenerateTab() {
    const toast = useToast();
    
    // Core Data
    const [students, setStudents] = useState([]);
    const [templates, setTemplates] = useState([]);
    
    // Selections
    const [selectedTemplate, setSelectedTemplate] = useState("");
    const [selectedStudents, setSelectedStudents] = useState(new Set());
    
    // Filtering & Pagination
    const [filter, setFilter] = useState("ACTIVE");
    const [searchQuery, setSearchQuery] = useState("");
    const [courseId, setCourseId] = useState("");
    const [batchId, setBatchId] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [courses, setCourses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [instituteType, setInstituteType] = useState('VOCATIONAL');
    const limit = 25;

    // UI States
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Initial Load - Templates & Courses
    useEffect(() => {
        fetchTemplates();
        fetchCourses();
        fetchInstitute();
    }, []);

    const fetchInstitute = async () => {
        try {
            const res = await fetch("/api/v1/institute");
            if (res.ok) {
                const data = await res.json();
                setInstituteType(data.institute?.type || 'VOCATIONAL');
            }
        } catch (error) {
            console.error("Failed to load institute", error);
        }
    };

    // Load batches when course changes
    useEffect(() => {
        if (courseId) {
            fetchBatches(courseId);
        } else {
            setBatches([]);
        }
        setBatchId("");
        setPage(1);
    }, [courseId]);

    // Filter/Pagination Load - Students
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchStudents();
        }, 400); // 400ms debounce
        return () => clearTimeout(timer);
    }, [filter, searchQuery, page, courseId, batchId]);

    const fetchCourses = async () => {
        try {
            const res = await fetch("/api/v1/courses");
            if (res.ok) {
                const data = await res.json();
                setCourses(data);
            }
        } catch (error) {
            console.error("Failed to load courses", error);
        }
    };

    const fetchBatches = async (cid) => {
        try {
            const res = await fetch(`/api/v1/batches?courseId=${cid}`);
            if (res.ok) {
                const data = await res.json();
                setBatches(data);
            }
        } catch (error) {
            console.error("Failed to load batches", error);
        }
    };

    const fetchTemplates = async () => {
        try {
            const tRes = await fetch("/api/v1/id-card-templates");
            if (tRes.ok) {
                const tData = await tRes.json();
                setTemplates(tData);
                if (tData.length > 0 && !selectedTemplate) {
                    const defaultTemp = tData.find(t => t.isDefault) || tData[0];
                    setSelectedTemplate(defaultTemp._id);
                }
            }
        } catch (error) {
            console.error("Failed to load templates", error);
        } finally {
            setLoadingTemplates(false);
        }
    };

    const fetchStudents = async () => {
        setLoadingStudents(true);
        try {
            const url = new URL("/api/v1/students", window.location.origin);
            url.searchParams.append("page", page);
            url.searchParams.append("limit", limit);
            url.searchParams.append("status", filter);
            url.searchParams.append("role", "student");
            if (courseId) url.searchParams.append("courseId", courseId);
            if (batchId) url.searchParams.append("batchId", batchId);
            if (searchQuery) url.searchParams.append("search", searchQuery);

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setStudents(data.students || []);
                setTotalPages(data.pagination?.pages || 1);
                setTotalCount(data.pagination?.total || 0);
            }
        } catch (error) {
            console.error("Failed to load students", error);
            toast.error("Failed to load students list");
        } finally {
            setLoadingStudents(false);
        }
    };

    const toggleStudent = (id) => {
        const newSelected = new Set(selectedStudents);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedStudents(newSelected);
    };

    const togglePageStudents = () => {
        const newSelected = new Set(selectedStudents);
        const currentPageIds = students.map(s => s._id);
        const allSelectedOnPage = currentPageIds.every(id => newSelected.has(id));

        if (allSelectedOnPage) {
            currentPageIds.forEach(id => newSelected.delete(id));
        } else {
            currentPageIds.forEach(id => newSelected.add(id));
        }
        
        setSelectedStudents(newSelected);
    };

    const downloadImage = (dataUrl, filename) => {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleGenerate = async () => {
        if (!selectedTemplate) return toast.error("Please select a template");
        if (selectedStudents.size === 0) return toast.error("Please select at least one student");

        setGenerating(true);
        try {
            const res = await fetch("/api/v1/id-cards/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    templateId: selectedTemplate,
                    studentIds: Array.from(selectedStudents)
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Generation failed");
            }

            const data = await res.json();
            
            if (data.success) {
                toast.success(`Successfully generated ${data.studentCards.length} ID cards`);
                
                if (data.commonBackImage) {
                    downloadImage(data.commonBackImage, `ID_Card_Back_Common.png`);
                }
                
                for (let i = 0; i < data.studentCards.length; i++) {
                    const card = data.studentCards[i];
                    setTimeout(() => {
                        const safeName = card.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                        downloadImage(card.frontImage, `ID_Card_Front_${safeName}_${card.rollNumber || i}.png`);
                    }, i * 300);
                }
            } else {
                toast.error("Generation failed");
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Failed to generate ID cards");
        } finally {
            setGenerating(false);
        }
    };

    // Derived States
    const isPageFullySelected = students.length > 0 && students.every(s => selectedStudents.has(s._id));

    if (loadingTemplates && !templates.length) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Sidebar Controls */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-6 lg:sticky lg:top-8">
                <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-3xl border border-slate-200/60 shadow-sm p-6 space-y-6 relative overflow-hidden">
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
                            <Filter size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 tracking-tight">Configuration</h3>
                            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-black">Generation Params</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        {/* Template Select */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Template</label>
                            <select
                                value={selectedTemplate}
                                onChange={(e) => setSelectedTemplate(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer font-medium text-slate-700"
                            >
                                <option value="" disabled>Select a design...</option>
                                {templates.map(t => (
                                    <option key={t._id} value={t._id}>{t.name} {t.isDefault ? "(Default)" : ""}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Student Status</label>
                            <select
                                value={filter}
                                onChange={(e) => {
                                    setFilter(e.target.value);
                                    setPage(1); // Reset page on filter change
                                }}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer font-medium text-slate-700"
                            >
                                <option value="ACTIVE">Active Enrollments</option>
                                <option value="COMPLETED">Completed Alumni</option>
                                <option value="DROPPED">Dropped Students</option>
                            </select>
                        </div>

                        {/* Course Filter */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">{instituteType === 'SCHOOL' ? 'Standard (Std)' : 'Course'}</label>
                            <select
                                value={courseId}
                                onChange={(e) => setCourseId(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer font-medium text-slate-700"
                            >
                                <option value="">All {instituteType === 'SCHOOL' ? 'Standards' : 'Courses'}</option>
                                {courses.map(c => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Batch Filter */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">{instituteType === 'SCHOOL' ? 'Section' : 'Batch'}</label>
                            <select
                                value={batchId}
                                onChange={(e) => setBatchId(e.target.value)}
                                disabled={!courseId}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer font-medium text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
                            >
                                <option value="">All {instituteType === 'SCHOOL' ? 'Sections' : 'Batches'}</option>
                                {batches.map(b => (
                                    <option key={b._id} value={b._id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button
                            onClick={handleGenerate}
                            disabled={generating || selectedStudents.size === 0 || !selectedTemplate}
                            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 h-12 rounded-xl transition-all disabled:opacity-50 disabled:shadow-none"
                        >
                            {generating ? (
                                <><Loader2 size={18} className="animate-spin mr-2" /> Processing Queue...</>
                            ) : (
                                <>
                                    <Download size={18} className="mr-2" /> 
                                    Generate {selectedStudents.size > 0 ? selectedStudents.size : ""} Cards
                                </>
                            )}
                        </Button>
                        <p className="text-[11px] text-slate-400 text-center mt-3 font-medium leading-relaxed px-2">
                            High-res PNGs will be dispatched as individual downloads automatically.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Students List */}
            <div className="lg:col-span-8 xl:col-span-9">
                <Card className="p-0 border-slate-200/60 shadow-sm rounded-3xl overflow-hidden flex flex-col h-[700px]">
                    {/* Header Controls */}
                    <div className="p-5 border-b border-slate-100 bg-white shrink-0 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex flex-col gap-0.5">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                    <Users size={20} className="text-blue-500" />
                                    Student Roster
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    {selectedStudents.size} selected out of {totalCount} total records
                                </p>
                            </div>

                            {/* Search */}
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search by name, ID or email..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setPage(1); // Reset page on search
                                    }}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400"
                                />
                                {loadingStudents && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={14} />
                                )}
                            </div>
                        </div>

                        {/* Banner & Select All Action */}
                        <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50/80 rounded-xl border border-slate-100">
                             <div className="flex items-center gap-2.5">
                                 <button
                                     onClick={togglePageStudents}
                                     className={cn(
                                         "w-5 h-5 rounded flex items-center justify-center transition-colors border",
                                         isPageFullySelected && students.length > 0
                                             ? "bg-blue-600 border-blue-600 text-white" 
                                             : "bg-white border-slate-300 text-transparent hover:border-blue-500"
                                     )}
                                 >
                                     <Check size={14} strokeWidth={3} />
                                 </button>
                                 <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                                     {isPageFullySelected ? "Deselect Page" : "Select Visible"}
                                 </span>
                             </div>
                             {selectedStudents.size > 0 && (
                                 <button 
                                     onClick={() => setSelectedStudents(new Set())}
                                     className="text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1 rounded-full transition-colors"
                                 >
                                     Clear Selection
                                 </button>
                             )}
                        </div>
                    </div>
                    
                    {/* List Area */}
                    <div className="flex-1 overflow-y-auto bg-slate-50/30 p-2">
                        {students.length === 0 && !loadingStudents ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                                <div className="p-4 rounded-full bg-slate-100/50">
                                    <IdCard size={32} className="opacity-50" />
                                </div>
                                <div className="text-center">
                                    <p className="font-semibold text-slate-600">No students found</p>
                                    <p className="text-sm">Try adjusting your filters or search query</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1.5 p-1">
                                {students.map((student) => {
                                    const isSelected = selectedStudents.has(student._id);
                                    return (
                                        <div 
                                            key={student._id}
                                            onClick={() => toggleStudent(student._id)}
                                            className={cn(
                                                "p-3.5 bg-white rounded-2xl flex items-center gap-4 cursor-pointer transition-all border outline-none",
                                                isSelected 
                                                    ? "border-blue-500/30 shadow-[0_0_0_2px_rgba(59,130,246,0.1)]" 
                                                    : "border-slate-100 shadow-sm hover:border-slate-300 hover:shadow-md"
                                            )}
                                        >
                                            {/* Checkbox */}
                                            <div className={cn(
                                                "w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0",
                                                isSelected 
                                                    ? "bg-blue-600 text-white shadow-inner" 
                                                    : "bg-slate-50 border border-slate-300"
                                            )}>
                                                {isSelected && <Check size={14} strokeWidth={3} />}
                                            </div>

                                            {/* Avatar */}
                                            <div className="w-11 h-11 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                                {student.photo ? (
                                                    <img src={student.photo} alt={student.name || "Student"} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 text-sm">
                                                        {(student.profile?.firstName?.charAt(0) || student.name?.charAt(0) || "U")}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-slate-900 truncate">
                                                    {student.name || `${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim() || 'Unknown Student'}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-medium truncate">
                                                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase tracking-wider text-[10px] font-black">
                                                        ID: {student.enrollmentNumber || "N/A"}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="truncate">{student.email || "No Email"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Pagination Footer */}
                    <div className="p-4 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">
                            Showing {students.length} on Page {page} of {totalPages}
                        </span>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loadingStudents}
                                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="px-3 py-1 font-bold text-sm text-slate-700 bg-slate-50 rounded-lg">
                                {page}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages || loadingStudents}
                                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
