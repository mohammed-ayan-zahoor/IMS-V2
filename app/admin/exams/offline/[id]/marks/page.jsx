"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, CheckCircle, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";

export default function OfflineExamMarksPage({ params }) {
    const router = useRouter();
    const toast = useToast();
    const examId = params.id;

    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [selectedBatch, setSelectedBatch] = useState("");
    const [studentsData, setStudentsData] = useState([]);

    useEffect(() => {
        fetchExam();
    }, [examId]);

    useEffect(() => {
        if (selectedBatch) {
            fetchResults(selectedBatch);
        } else {
            setStudentsData([]);
        }
    }, [selectedBatch]);

    const fetchExam = async () => {
        try {
            const res = await fetch(`/api/v1/offline-exams/${examId}`);
            if (res.ok) {
                const data = await res.json();
                setExam(data);
                if (data.batches && data.batches.length > 0) {
                    setSelectedBatch(data.batches[0]._id);
                }
            } else {
                toast.error("Failed to load exam details");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const fetchResults = async (batchId) => {
        try {
            const res = await fetch(`/api/v1/offline-exams/${examId}/results?batch=${batchId}`);
            if (res.ok) {
                const data = await res.json();
                
                // Initialize default structures if missing
                const formatted = data.results.map(row => {
                    const marks = exam.subjects.map(subConfig => {
                        const existingMark = row.marks?.find(m => m.subject === subConfig.subject._id);
                        return {
                            subject: subConfig.subject._id,
                            obtainedMarks: existingMark ? existingMark.obtainedMarks : "",
                            isAbsent: existingMark ? existingMark.isAbsent : false,
                            isNotAppeared: existingMark ? existingMark.isNotAppeared : false,
                            graceMarks: existingMark ? existingMark.graceMarks : 0,
                            remarks: existingMark ? existingMark.remarks : ""
                        };
                    });

                    const coScholasticRatings = exam.coScholastic.map(coConfig => {
                        const existingRating = row.coScholasticRatings?.find(r => r.paramName === coConfig.paramName);
                        return {
                            paramName: coConfig.paramName,
                            rating: existingRating ? existingRating.rating : ""
                        };
                    });

                    return { ...row, marks, coScholasticRatings };
                });

                setStudentsData(formatted);
            }
        } catch (error) {
            toast.error("Failed to load student results");
        }
    };

    const handleMarkChange = (studentIndex, subjectId, value) => {
        setStudentsData(prev => {
            const newData = [...prev];
            const subIndex = newData[studentIndex].marks.findIndex(m => m.subject === subjectId);
            if (subIndex > -1) {
                newData[studentIndex].marks[subIndex].obtainedMarks = value;
                newData[studentIndex].marks[subIndex].isAbsent = false;
                newData[studentIndex].marks[subIndex].isNotAppeared = false;
            }
            return newData;
        });
    };

    const handleCheckboxChange = (studentIndex, subjectId, field, checked) => {
        setStudentsData(prev => {
            const newData = [...prev];
            const subIndex = newData[studentIndex].marks.findIndex(m => m.subject === subjectId);
            if (subIndex > -1) {
                newData[studentIndex].marks[subIndex][field] = checked;
                if (checked) {
                    // Reset marks if absent/NA
                    newData[studentIndex].marks[subIndex].obtainedMarks = "";
                    // Uncheck the other flag
                    if (field === 'isAbsent') newData[studentIndex].marks[subIndex].isNotAppeared = false;
                    if (field === 'isNotAppeared') newData[studentIndex].marks[subIndex].isAbsent = false;
                }
            }
            return newData;
        });
    };

    const handleCoScholasticChange = (studentIndex, paramName, value) => {
        setStudentsData(prev => {
            const newData = [...prev];
            const coIndex = newData[studentIndex].coScholasticRatings.findIndex(c => c.paramName === paramName);
            if (coIndex > -1) {
                newData[studentIndex].coScholasticRatings[coIndex].rating = value;
            }
            return newData;
        });
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            
            // Format payload
            const payload = {
                batchId: selectedBatch,
                studentResults: studentsData.map(student => ({
                    studentId: student.student._id,
                    marks: student.marks.map(m => ({
                        subject: m.subject,
                        obtainedMarks: m.obtainedMarks === "" ? null : Number(m.obtainedMarks),
                        isAbsent: m.isAbsent,
                        isNotAppeared: m.isNotAppeared,
                        graceMarks: m.graceMarks,
                        remarks: m.remarks
                    })),
                    coScholasticRatings: student.coScholasticRatings,
                    teacherRemarks: student.teacherRemarks || "",
                    isReExam: student.isReExam || false
                }))
            };

            const res = await fetch(`/api/v1/offline-exams/${examId}/results`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Marks saved successfully!");
                fetchResults(selectedBatch); // Refresh
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to save marks");
            }
        } catch (error) {
            toast.error("An error occurred while saving");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingSpinner fullPage />;
    if (!exam) return <div className="text-center p-12">Exam not found</div>;

    const isLocked = exam.status === 'published';

    return (
        <div className="max-w-[1400px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
                        <ArrowLeft size={18} />
                    </Button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900">{exam.title} - Marks Entry</h1>
                        <p className="text-sm text-slate-500">{exam.course?.name}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="w-64">
                        <Select
                            value={selectedBatch}
                            onChange={setSelectedBatch}
                            options={exam.batches?.map(b => ({ label: `Batch: ${b.name}`, value: b._id })) || []}
                        />
                    </div>
                    <Button 
                        onClick={handleSave} 
                        disabled={saving || isLocked || !selectedBatch} 
                        className="shadow-lg shadow-premium-blue/25"
                    >
                        {saving ? <LoadingSpinner size="sm" className="mr-2 border-white" /> : <Save size={18} className="mr-2" />}
                        Save Marks
                    </Button>
                </div>
            </div>

            {isLocked && (
                <div className="p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 flex items-center gap-3">
                    <AlertCircle size={20} />
                    <div>
                        <p className="font-bold">Exam Results Published</p>
                        <p className="text-sm">Marks entry is locked. You must unpublish the results to make changes.</p>
                    </div>
                </div>
            )}

            {!selectedBatch ? (
                <Card className="p-12 text-center text-slate-500 border-dashed">
                    Select a batch to begin entering marks.
                </Card>
            ) : studentsData.length === 0 ? (
                <Card className="p-12 text-center text-slate-500 border-dashed">
                    No active students found in this batch.
                </Card>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="text-xs text-slate-600 uppercase bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Student Name</th>
                                    {/* Scholastic Columns */}
                                    {exam.subjects.map(sub => (
                                        <th key={sub.subject._id} className="px-4 py-3 border-r border-slate-200 min-w-[160px] text-center">
                                            <div className="font-bold text-premium-blue">{sub.subject.name}</div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">Max: {sub.maxMarks}</div>
                                        </th>
                                    ))}
                                    {/* Co-Scholastic Columns */}
                                    {exam.coScholastic.map(co => (
                                        <th key={co.paramName} className="px-4 py-3 border-r border-slate-200 min-w-[120px] text-center bg-indigo-50/50">
                                            <div className="font-bold text-indigo-700">{co.paramName}</div>
                                            <div className="text-[10px] text-indigo-400 mt-0.5">{co.ratingScale}</div>
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-center">Overall Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {studentsData.map((student, rowIndex) => (
                                    <tr key={student.student._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-2 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100 font-medium text-slate-700 flex flex-col">
                                            <span>{student.student.name}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{student.student.rollNumber || student.student.enrollmentNumber}</span>
                                        </td>
                                        
                                        {/* Scholastic Cells */}
                                        {exam.subjects.map(sub => {
                                            const markObj = student.marks.find(m => m.subject === sub.subject._id);
                                            return (
                                                <td key={sub.subject._id} className="px-2 py-2 border-r border-slate-100">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={sub.maxMarks}
                                                            step="0.5"
                                                            value={markObj?.obtainedMarks ?? ""}
                                                            onChange={(e) => handleMarkChange(rowIndex, sub.subject._id, e.target.value)}
                                                            disabled={isLocked || markObj?.isAbsent || markObj?.isNotAppeared}
                                                            className="w-16 px-2 py-1.5 text-center border border-slate-200 rounded-md focus:ring-2 focus:ring-premium-blue/20 outline-none disabled:bg-slate-100 disabled:text-slate-400 text-sm font-medium"
                                                            placeholder="-"
                                                        />
                                                        <div className="flex flex-col gap-1">
                                                            <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={markObj?.isAbsent || false}
                                                                    onChange={(e) => handleCheckboxChange(rowIndex, sub.subject._id, 'isAbsent', e.target.checked)}
                                                                    disabled={isLocked}
                                                                    className="rounded text-rose-500 focus:ring-rose-500"
                                                                />
                                                                AB
                                                            </label>
                                                            <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={markObj?.isNotAppeared || false}
                                                                    onChange={(e) => handleCheckboxChange(rowIndex, sub.subject._id, 'isNotAppeared', e.target.checked)}
                                                                    disabled={isLocked}
                                                                    className="rounded text-amber-500 focus:ring-amber-500"
                                                                />
                                                                NA
                                                            </label>
                                                        </div>
                                                    </div>
                                                </td>
                                            );
                                        })}

                                        {/* Co-Scholastic Cells */}
                                        {exam.coScholastic.map(co => {
                                            const ratingObj = student.coScholasticRatings.find(c => c.paramName === co.paramName);
                                            return (
                                                <td key={co.paramName} className="px-2 py-2 border-r border-slate-100 bg-indigo-50/10">
                                                    <input
                                                        type="text"
                                                        value={ratingObj?.rating || ""}
                                                        onChange={(e) => handleCoScholasticChange(rowIndex, co.paramName, e.target.value.toUpperCase())}
                                                        disabled={isLocked}
                                                        className="w-full px-2 py-1.5 text-center border border-indigo-100 rounded-md focus:ring-2 focus:ring-indigo-500/20 outline-none disabled:bg-slate-100 disabled:text-slate-400 text-sm font-bold text-indigo-700 uppercase"
                                                        placeholder="-"
                                                        maxLength={2}
                                                    />
                                                </td>
                                            );
                                        })}

                                        {/* Overall Remarks */}
                                        <td className="px-2 py-2">
                                            <input
                                                type="text"
                                                value={student.teacherRemarks || ""}
                                                onChange={(e) => {
                                                    const newData = [...studentsData];
                                                    newData[rowIndex].teacherRemarks = e.target.value;
                                                    setStudentsData(newData);
                                                }}
                                                disabled={isLocked}
                                                className="w-full min-w-[200px] px-3 py-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-premium-blue/20 outline-none disabled:bg-slate-100 disabled:text-slate-400 text-sm"
                                                placeholder="Remarks..."
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
