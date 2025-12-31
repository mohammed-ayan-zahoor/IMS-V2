"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export default function StudentAttendancePage() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                const res = await fetch("/api/v1/student/attendance");
                const data = await res.json();
                setHistory(data.history || []);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchAttendance();
    }, []);

    if (loading) return <LoadingSpinner fullPage />;

    const presentCount = history.filter(h => h.status === 'present').length;
    const percentage = history.length > 0 ? Math.round((presentCount / history.length) * 100) : 0;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Attendance Record</h1>
                    <p className="text-slate-500">Track your class participation.</p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-black text-slate-900">{percentage}%</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Attendance</div>
                </div>
            </div>

            <Card className="overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs">Date</th>
                            <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs">Batch</th>
                            <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs">Topic</th>
                            <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {history.map((record) => (
                            <tr key={record._id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-700">
                                    {new Date(record.date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-slate-600">{record.batchName}</td>
                                <td className="px-6 py-4 text-slate-500 italic">{record.topic}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="inline-flex justify-end">
                                        {record.status === 'present' ? (
                                            <Badge variant="success" className="gap-1 pl-2 pr-3">
                                                <CheckCircle2 size={12} /> Present
                                            </Badge>
                                        ) : record.status === 'late' ? (
                                            <Badge variant="neutral" className="gap-1 pl-2 pr-3 bg-yellow-100 text-yellow-700">
                                                <Clock size={12} /> Late
                                            </Badge>
                                        ) : (
                                            <Badge variant="error" className="gap-1 pl-2 pr-3">
                                                <XCircle size={12} /> Absent
                                            </Badge>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {history.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-6 py-8 text-center text-slate-400 italic">
                                    No attendance records found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </Card>
        </div>
    );
}
