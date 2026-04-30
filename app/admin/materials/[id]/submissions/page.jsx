"use client";

import { useState, useEffect, use } from "react";
import { format } from "date-fns";
import { 
    ArrowLeft, 
    FileText, 
    CheckCircle, 
    Clock, 
    AlertCircle, 
    ExternalLink, 
    Save, 
    Search,
    User,
    Calendar,
    Award
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";
import { useRouter } from "next/navigation";

export default function AssignmentSubmissionsPage({ params }) {
    const { id } = use(params);
    const toast = useToast();
    const router = useRouter();

    const [assignment, setAssignment] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    
    // Grading State
    const [gradingId, setGradingId] = useState(null);
    const [gradeData, setGradeData] = useState({ marks: "", feedback: "" });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchSubmissions();
    }, [id]);

    const fetchSubmissions = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/v1/assignments/${id}/submissions`);
            const data = await res.json();
            if (res.ok) {
                setAssignment(data.assignment);
                setSubmissions(data.submissions || []);
            } else {
                toast.error(data.error || "Failed to load submissions");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error fetching data");
        } finally {
            setLoading(false);
        }
    };

    const handleGrade = async (e) => {
        e.preventDefault();
        if (!gradingId) return;

        setIsSaving(true);
        try {
            const res = await fetch(`/api/v1/submissions/${gradingId}/grade`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    marksAwarded: Number(gradeData.marks),
                    feedback: gradeData.feedback
                })
            });

            if (res.ok) {
                toast.success("Grade submitted successfully");
                setGradingId(null);
                setGradeData({ marks: "", feedback: "" });
                fetchSubmissions();
            } else {
                const err = await res.json();
                toast.error(err.error || "Grading failed");
            }
        } catch (error) {
            console.error(error);
            toast.error("Network error during grading");
        } finally {
            setIsSaving(false);
        }
    };

    const startGrading = (sub) => {
        setGradingId(sub._id);
        setGradeData({
            marks: sub.marksAwarded || "",
            feedback: sub.feedback || ""
        });
    };

    const filteredSubmissions = submissions.filter(s => {
        const name = `${s.student?.profile?.firstName} ${s.student?.profile?.lastName}`.toLowerCase();
        return name.includes(search.toLowerCase()) || s.student?.enrollmentNumber?.toLowerCase().includes(search.toLowerCase());
    });

    if (loading) return <div className="p-8"><LoadingSpinner /></div>;
    if (!assignment) return <div className="p-8 text-center text-slate-500 font-bold">Assignment not found</div>;

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.back()}
                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{assignment.title}</h1>
                        <div className="flex items-center gap-3 mt-1">
                            <Badge variant="neutral" className="bg-blue-50 text-blue-600 border-blue-100 font-bold uppercase text-[10px]">
                                <Award size={10} className="mr-1" /> Total Marks: {assignment.totalMarks || "N/A"}
                            </Badge>
                            <Badge variant="neutral" className="bg-rose-50 text-rose-600 border-rose-100 font-bold uppercase text-[10px]">
                                <Calendar size={10} className="mr-1" /> Due: {assignment.dueDate ? format(new Date(assignment.dueDate), "MMM d, yyyy") : "No deadline"}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white border-slate-100 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                            <User size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Students</p>
                            <p className="text-xl font-black text-slate-900">{submissions.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-100 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                            <Clock size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending</p>
                            <p className="text-xl font-black text-slate-900">{submissions.filter(s => s.status === 'pending').length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-100 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                            <CheckCircle size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Graded</p>
                            <p className="text-xl font-black text-slate-900">{submissions.filter(s => s.status === 'graded').length}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* List */}
            <Card className="border-slate-100 shadow-sm overflow-hidden bg-white">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50">
                    <div className="relative group max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-premium-blue transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search student..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2 outline-none focus:border-premium-blue/30 focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Student</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Submission</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredSubmissions.map(sub => (
                                    <tr key={sub._id} className={`hover:bg-slate-50/30 transition-colors ${gradingId === sub._id ? 'bg-premium-blue/5' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                                    {sub.student?.profile?.firstName?.[0] || "S"}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{sub.student?.profile?.firstName} {sub.student?.profile?.lastName}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono tracking-tighter">{sub.student?.enrollmentNumber || "No Enrollment"}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <button 
                                                    onClick={() => window.open(sub.file?.url, '_blank')}
                                                    className="flex items-center gap-1.5 text-xs font-bold text-premium-blue hover:underline"
                                                >
                                                    <FileText size={14} /> View Work <ExternalLink size={10} />
                                                </button>
                                                <p className="text-[10px] text-slate-400 font-medium">Submitted {format(new Date(sub.submittedAt), "MMM d, h:mm a")}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={sub.status === 'graded' ? "success" : "warning"} className="font-bold text-[10px] uppercase">
                                                {sub.status}
                                            </Badge>
                                            {sub.status === 'graded' && (
                                                <p className="text-[10px] font-black text-slate-900 mt-1">{sub.marksAwarded} / {assignment.totalMarks || "-"}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {gradingId === sub._id ? (
                                                <form onSubmit={handleGrade} className="flex flex-col items-end gap-2 animate-in slide-in-from-right-2">
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="number" 
                                                            placeholder="Marks"
                                                            className="w-20 px-3 py-1.5 bg-white border border-premium-blue/20 rounded-lg text-xs font-bold outline-none focus:ring-4 focus:ring-premium-blue/5"
                                                            value={gradeData.marks}
                                                            onChange={e => setGradeData({ ...gradeData, marks: e.target.value })}
                                                            required
                                                        />
                                                        <input 
                                                            type="text" 
                                                            placeholder="Feedback..."
                                                            className="w-40 px-3 py-1.5 bg-white border border-premium-blue/20 rounded-lg text-xs font-medium outline-none focus:ring-4 focus:ring-premium-blue/5"
                                                            value={gradeData.feedback}
                                                            onChange={e => setGradeData({ ...gradeData, feedback: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            type="button"
                                                            onClick={() => setGradingId(null)}
                                                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button 
                                                            type="submit"
                                                            disabled={isSaving}
                                                            className="bg-premium-blue text-white text-[10px] font-black px-4 py-1.5 rounded-lg shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                                                        >
                                                            {isSaving ? "Saving..." : <><Save size={12} /> Save Grade</>}
                                                        </button>
                                                    </div>
                                                </form>
                                            ) : (
                                                <Button 
                                                    size="sm" 
                                                    variant="secondary"
                                                    onClick={() => startGrading(sub)}
                                                    className="bg-white border-slate-200 text-slate-600 hover:border-premium-blue hover:text-premium-blue shadow-sm font-bold text-[11px]"
                                                >
                                                    {sub.status === 'graded' ? "Edit Grade" : "Grade Now"}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredSubmissions.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-slate-400 italic text-sm">
                                            No submissions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
