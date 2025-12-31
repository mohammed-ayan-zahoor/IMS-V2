"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

export default function StudentBatchesPage() {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBatches = async () => {
            try {
                const res = await fetch("/api/v1/student/batches");
                const data = await res.json();
                setBatches(data.batches || []);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchBatches();
    }, []);

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-black text-slate-900">My Batches</h1>
                <p className="text-slate-500">View your current enrollments and schedules.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {batches.map(batch => (
                    <Card key={batch._id} className="hover:border-premium-blue/30 transition-all">
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">{batch.name}</h3>
                                    <p className="text-sm font-semibold text-slate-500">{batch.course?.name}</p>
                                </div>
                                <div className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded uppercase">Active</div>
                            </div>

                            <hr className="border-slate-100" />

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <MapPin size={16} className="text-slate-400" />
                                    <span>{batch.room || "Room not assigned"}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <Calendar size={16} className="text-slate-400" />
                                    <span>
                                        {new Date(batch.startDate).toLocaleDateString()} - {new Date(batch.endDate).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex items-start gap-3 text-sm text-slate-600">
                                    <Clock size={16} className="text-slate-400 mt-0.5" />
                                    <div>
                                        {batch.schedule?.map((s, idx) => (
                                            <div key={idx} className="block text-xs font-medium">
                                                {s.day}: {s.startTime} - {s.endTime}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}

                {!loading && batches.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400">
                        <Users size={48} className="mx-auto mb-4 opacity-20" />
                        <p>You are not enrolled in any active batches.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
