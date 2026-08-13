"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, Calendar, Search } from "lucide-react";
import MobileAttendanceCardStack from "@/components/instructor/MobileAttendanceCardStack";
import { useAcademicSession } from "@/contexts/AcademicSessionContext";
import { useToast } from "@/contexts/ToastContext";

export default function MobileInstructorAttendance() {
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const toast = useToast();
    const { selectedSessionId } = useAcademicSession();
    const isSchool = session?.user?.institute?.type === 'SCHOOL' || session?.user?.institute?.code === 'QUANTECH';

    const paramBatch = searchParams.get("batchId") || "";
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState(paramBatch);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const [students, setStudents] = useState([]);
    const [attendanceData, setAttendanceData] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchBatches();
    }, [selectedSessionId]);

    useEffect(() => {
        if (selectedBatch && selectedDate) {
            fetchBatchData();
        } else {
            setStudents([]);
            setAttendanceData({});
        }
    }, [selectedBatch, selectedDate]);

    const fetchBatches = async () => {
        try {
            const res = await fetch("/api/v1/batches");
            const data = await res.json();
            const bList = data.batches || [];
            setBatches(bList);
            if (!selectedBatch && bList.length > 0) {
                setSelectedBatch(bList[0]._id);
            }
        } catch (e) {
            console.error("Failed to fetch batches", e);
        }
    };

    const fetchBatchData = async () => {
        try {
            setLoading(true);
            const [batchRes, attRes] = await Promise.all([
                fetch(`/api/v1/batches/${selectedBatch}`),
                fetch(`/api/v1/attendance/batch?batchId=${selectedBatch}&date=${selectedDate}`)
            ]);

            const bData = await batchRes.json();
            const aData = await attRes.json();

            const batchStudents = bData.batch?.students || [];
            setStudents(batchStudents);

            const initialMap = {};
            const existingMap = {};
            if (aData.records && Array.isArray(aData.records)) {
                aData.records.forEach(r => {
                    const sId = typeof r.student === 'object' ? r.student._id : r.student;
                    existingMap[sId] = { status: r.status, remarks: r.remarks || '' };
                });
            }

            batchStudents.forEach(e => {
                const sId = e.student?._id || e.student || e._id;
                initialMap[sId] = existingMap[sId] || { status: 'present', remarks: '' };
            });

            setAttendanceData(initialMap);
        } catch (e) {
            console.error("Failed to load attendance", e);
            toast.error("Failed to load students");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (studentId, status) => {
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], status }
        }));
    };

    const handleSave = async () => {
        if (!selectedBatch) return;
        try {
            setSaving(true);
            const payload = {
                batchId: selectedBatch,
                date: selectedDate,
                records: Object.entries(attendanceData).map(([studentId, val]) => ({
                    studentId,
                    status: val.status,
                    remarks: val.remarks || ''
                }))
            };

            const res = await fetch("/api/v1/attendance/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Attendance saved successfully!");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to save attendance");
            }
        } catch (e) {
            toast.error("Network error saving attendance");
        } finally {
            setSaving(false);
        }
    };

    const activeBatchObj = batches.find(b => b._id === selectedBatch);

    return (
        <div className="space-y-3 pb-8 pt-1">
            {/* Header */}
            <div className="bg-slate-900 text-white rounded-lg p-3 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Teacher Portal
                        </span>
                        <h1 className="text-base font-bold text-white">Mark Attendance</h1>
                    </div>
                </div>

                {/* Section & Date Selectors */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                    <div>
                        <label className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">
                            {isSchool ? "Section" : "Batch"}
                        </label>
                        <select
                            value={selectedBatch}
                            onChange={(e) => setSelectedBatch(e.target.value)}
                            className="w-full mt-0.5 p-2 bg-slate-800 border border-slate-700 rounded-md text-xs font-bold text-white outline-none"
                        >
                            <option value="">Select Class...</option>
                            {batches.map(b => (
                                <option key={b._id} value={b._id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">
                            Date
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full mt-0.5 p-2 bg-slate-800 border border-slate-700 rounded-md text-xs font-bold text-white outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Attendance Stack or Empty State */}
            {!selectedBatch ? (
                <div className="bg-white p-6 rounded-lg text-center border border-slate-200">
                    <Calendar size={24} className="text-slate-400 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-700">Select a {isSchool ? "Section" : "Batch"}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Choose a class above to start marking attendance.</p>
                </div>
            ) : loading ? (
                <div className="bg-white p-6 rounded-lg text-center border border-slate-200 text-xs font-medium text-slate-500">
                    Loading student list...
                </div>
            ) : students.length === 0 ? (
                <div className="bg-white p-6 rounded-lg text-center border border-slate-200">
                    <Users size={24} className="text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-700">No Students Enrolled</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">No students found for this section.</p>
                </div>
            ) : (
                <MobileAttendanceCardStack
                    students={students.map(e => e.student || e)}
                    attendanceData={attendanceData}
                    onStatusChange={handleStatusChange}
                    onSave={handleSave}
                    saving={saving}
                    batchName={activeBatchObj?.name || ""}
                />
            )}
        </div>
    );
}
