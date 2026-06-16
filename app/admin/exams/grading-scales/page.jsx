"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";
import { useRouter } from "next/navigation";

export default function GradingScalesPage() {
    const router = useRouter();
    const toast = useToast();
    const [scales, setScales] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        ranges: [{ minPercentage: 0, maxPercentage: 100, grade: "", gradePoint: 0, remarks: "" }]
    });

    useEffect(() => {
        fetchScales();
    }, []);

    const fetchScales = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/grading-scales");
            if (res.ok) {
                const data = await res.json();
                setScales(data.gradingScales || []);
            }
        } catch (error) {
            toast.error("Failed to load grading scales");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (scale = null) => {
        if (scale) {
            setEditingId(scale._id);
            setFormData({
                name: scale.name,
                description: scale.description || "",
                ranges: scale.ranges.length > 0 ? scale.ranges : [{ minPercentage: 0, maxPercentage: 100, grade: "", gradePoint: 0, remarks: "" }]
            });
        } else {
            setEditingId(null);
            setFormData({
                name: "",
                description: "",
                ranges: [{ minPercentage: 0, maxPercentage: 100, grade: "", gradePoint: 0, remarks: "" }]
            });
        }
        setIsModalOpen(true);
    };

    const handleAddRange = () => {
        setFormData(prev => ({
            ...prev,
            ranges: [...prev.ranges, { minPercentage: 0, maxPercentage: 0, grade: "", gradePoint: 0, remarks: "" }]
        }));
    };

    const handleRemoveRange = (index) => {
        setFormData(prev => ({
            ...prev,
            ranges: prev.ranges.filter((_, i) => i !== index)
        }));
    };

    const handleRangeChange = (index, field, value) => {
        setFormData(prev => {
            const newRanges = [...prev.ranges];
            newRanges[index][field] = value;
            return { ...prev, ranges: newRanges };
        });
    };

    const handleSubmit = async () => {
        if (!formData.name) {
            return toast.warning("Name is required");
        }
        if (formData.ranges.some(r => !r.grade)) {
            return toast.warning("All ranges must have a grade label");
        }

        try {
            const method = editingId ? "PATCH" : "POST";
            const url = editingId ? `/api/v1/grading-scales/${editingId}` : `/api/v1/grading-scales`;
            
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(editingId ? "Grading scale updated" : "Grading scale created");
                setIsModalOpen(false);
                fetchScales();
            } else {
                const data = await res.json();
                toast.error(data.error || "Operation failed");
            }
        } catch (error) {
            toast.error("Something went wrong");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this grading scale?")) return;
        try {
            const res = await fetch(`/api/v1/grading-scales/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Deleted successfully");
                fetchScales();
            } else {
                toast.error("Failed to delete");
            }
        } catch (error) {
            toast.error("Something went wrong");
        }
    };

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/admin/exams')} className="text-slate-400 hover:text-slate-600">
                        <ArrowLeft size={18} />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Grading Scales</h1>
                        <p className="text-slate-500">Manage the grading criteria used for offline exam results.</p>
                    </div>
                </div>
                <Button onClick={() => handleOpenModal()} className="shadow-lg shadow-premium-blue/25">
                    <Plus size={18} className="mr-2" />
                    New Scale
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {scales.length === 0 ? (
                    <Card className="p-12 text-center border-dashed">
                        <p className="text-slate-500 mb-4">No grading scales configured yet.</p>
                        <Button variant="outline" onClick={() => handleOpenModal()}>Create First Scale</Button>
                    </Card>
                ) : (
                    scales.map(scale => (
                        <Card key={scale._id} className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">{scale.name}</h3>
                                    <p className="text-sm text-slate-500">{scale.description || "No description provided"}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(scale)} className="text-slate-400 hover:text-premium-blue">
                                        <Edit2 size={16} />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(scale._id)} className="text-slate-400 hover:text-rose-500">
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 rounded-lg">
                                        <tr>
                                            <th className="px-4 py-3 rounded-l-lg">Range (%)</th>
                                            <th className="px-4 py-3">Grade</th>
                                            <th className="px-4 py-3">Grade Point</th>
                                            <th className="px-4 py-3 rounded-r-lg">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scale.ranges.map((r, i) => (
                                            <tr key={i} className="border-b border-slate-50 last:border-0">
                                                <td className="px-4 py-3 font-medium text-slate-700">{r.minPercentage}% - {r.maxPercentage}%</td>
                                                <td className="px-4 py-3 font-bold text-premium-blue">{r.grade}</td>
                                                <td className="px-4 py-3 text-slate-600">{r.gradePoint}</td>
                                                <td className="px-4 py-3 text-slate-500">{r.remarks || "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 space-y-6">
                            <h2 className="text-xl font-bold text-slate-900">{editingId ? "Edit" : "Create"} Grading Scale</h2>
                            
                            <div className="grid grid-cols-1 gap-4">
                                <Input 
                                    label="Scale Name" 
                                    placeholder="e.g. CBSE 9-Point Scale" 
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                                <Input 
                                    label="Description (Optional)" 
                                    placeholder="Brief description" 
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-bold text-slate-700">Grade Ranges</label>
                                    <Button variant="outline" size="sm" onClick={handleAddRange}>
                                        <Plus size={14} className="mr-1" /> Add Range
                                    </Button>
                                </div>
                                
                                {formData.ranges.map((r, i) => (
                                    <div key={i} className="grid grid-cols-12 gap-3 items-start p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="col-span-2">
                                            <Input label="Min %" type="number" value={r.minPercentage} onChange={(e) => handleRangeChange(i, 'minPercentage', Number(e.target.value))} />
                                        </div>
                                        <div className="col-span-2">
                                            <Input label="Max %" type="number" value={r.maxPercentage} onChange={(e) => handleRangeChange(i, 'maxPercentage', Number(e.target.value))} />
                                        </div>
                                        <div className="col-span-2">
                                            <Input label="Grade" placeholder="e.g. A1" value={r.grade} onChange={(e) => handleRangeChange(i, 'grade', e.target.value)} />
                                        </div>
                                        <div className="col-span-2">
                                            <Input label="Point" type="number" step="0.1" value={r.gradePoint} onChange={(e) => handleRangeChange(i, 'gradePoint', Number(e.target.value))} />
                                        </div>
                                        <div className="col-span-3">
                                            <Input label="Remarks" placeholder="Outstanding" value={r.remarks} onChange={(e) => handleRangeChange(i, 'remarks', e.target.value)} />
                                        </div>
                                        <div className="col-span-1 pt-7">
                                            <button onClick={() => handleRemoveRange(i)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button onClick={handleSubmit}>Save Scale</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
