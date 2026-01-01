"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

export default function StudentBatchesPage() {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBatches = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/v1/student/batches");
                if (!res.ok) throw new Error("Failed to load batches");
                const data = await res.json();
                setBatches(data.batches || []);
            } catch (error) {
                console.error("Fetch batches error:", error);
                setError("Unable to load batches. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        useEffect(() => {
            fetchBatches();
        }, []);

        const handleRetry = () => {
            fetchBatches();
        };

        const getStatus = (batch) => {
            const now = new Date();
            const start = batch.schedule?.startDate ? new Date(batch.schedule.startDate) : null;
            const end = batch.schedule?.endDate ? new Date(batch.schedule.endDate) : null;

            // Validate dates
            const isStartValid = start && !isNaN(start.getTime());
            const isEndValid = end && !isNaN(end.getTime());

            if (isStartValid && start > now) return { label: "Upcoming", className: "bg-amber-100 text-amber-700" };
            if (isEndValid && end < now) return { label: "Completed", className: "bg-slate-100 text-slate-500" };
            return { label: "Active", className: "bg-green-100 text-green-700" };
        };

        if (loading) return <LoadingSpinner fullPage />;

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
                    <p className="text-red-500 font-medium">{error}</p>
                    <button
                        onClick={handleRetry}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold"
                    >
                        Retry
                    </button>
                </div>
            );
        }

        return (
            <div className="max-w-7xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">My Batches</h1>
                    <p className="text-slate-500">View your current enrollments and schedules.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {batches.map(batch => {
                        const status = getStatus(batch);
                        return (
                            <Card key={batch._id} className="hover:border-premium-blue/30 transition-all">
                                <div className="p-6 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">{batch.name}</h3>
                                            <p className="text-sm font-semibold text-slate-500">{batch.course?.name}</p>
                                        </div>
                                        <div className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${status.className}`}>
                                            {status.label}
                                        </div>
                                    </div>

                                    <hr className="border-slate-100" />

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-sm text-slate-600">
                                            <MapPin size={16} className="text-slate-400" />
                                            <span>{batch.schedule?.description || "Online / TBD"}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-600">
                                            <Calendar size={16} className="text-slate-400" />
                                            <span>
                                                {batch.schedule?.startDate ? new Date(batch.schedule.startDate).toLocaleDateString() : 'TBD'} -
                                                {batch.schedule?.endDate ? new Date(batch.schedule.endDate).toLocaleDateString() : 'TBD'}
                                            </span>
                                        </div>
                                        <div className="flex items-start gap-3 text-sm text-slate-600">
                                            <Clock size={16} className="text-slate-400 mt-0.5" />
                                            <div>
                                                {Array.isArray(batch.schedule?.daysOfWeek) && batch.schedule.daysOfWeek.length > 0 ? (
                                                    batch.schedule.daysOfWeek
                                                        .filter(d => Number.isInteger(d) && d >= 0 && d <= 6)
                                                        .map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d])
                                                        .join(', ') || "Days TBD"
                                                ) : "Days TBD"}
                                                {batch.schedule?.timeSlot?.start && (
                                                    <div className="text-xs font-medium mt-1">
                                                        {batch.schedule.timeSlot.start} - {batch.schedule.timeSlot.end}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                    {batch.schedule?.timeSlot?.start && (
                        <div className="text-xs font-medium mt-1">
                            {batch.schedule.timeSlot.start} - {batch.schedule.timeSlot.end}
                        </div>
                    )}
                </div>
            </div>
                                </div >
                            </div >
                        </Card >
                    );
})}

{
    !loading && batches.length === 0 && (
        <div className="col-span-full py-20 text-center text-slate-400">
            <Users size={48} className="mx-auto mb-4 opacity-20" />
            <p>You are not enrolled in any active batches.</p>
        </div>
    )
}
            </div >
        </div >
    );
}
