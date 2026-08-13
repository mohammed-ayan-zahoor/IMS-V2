"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Layers3, Users, Search, UserCheck, ChevronRight, BookOpen } from "lucide-react";
import { useAcademicSession } from "@/contexts/AcademicSessionContext";

export default function MobileInstructorBatches() {
    const { data: session } = useSession();
    const { selectedSessionId } = useAcademicSession();
    const isSchool = session?.user?.institute?.type === 'SCHOOL' || session?.user?.institute?.code === 'QUANTECH';

    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchBatches();
    }, [selectedSessionId]);

    const fetchBatches = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/batches");
            const data = await res.json();
            setBatches(data.batches || []);
        } catch (e) {
            console.error("Failed to fetch assigned batches", e);
        } finally {
            setLoading(false);
        }
    };

    const filteredBatches = batches.filter(b => {
        const name = (b.name || '').toLowerCase();
        const course = (b.course?.name || '').toLowerCase();
        return name.includes(search.toLowerCase()) || course.includes(search.toLowerCase());
    });

    return (
        <div className="space-y-3 pb-8 pt-1">
            {/* Header */}
            <div className="bg-slate-900 text-white rounded-lg p-3 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Teacher Portal
                        </span>
                        <h1 className="text-base font-bold text-white">
                            My Assigned {isSchool ? "Sections" : "Batches"} ({batches.length})
                        </h1>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative pt-1 border-t border-slate-800">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder={`Search ${isSchool ? 'section' : 'batch'}...`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-md pl-8 pr-3 py-2 text-xs font-medium text-white outline-none"
                    />
                </div>
            </div>

            {/* Flat Section List Feed */}
            {loading ? (
                <div className="bg-white p-6 rounded-lg text-center border border-slate-200 text-xs font-medium text-slate-500">
                    Loading assigned classes...
                </div>
            ) : filteredBatches.length === 0 ? (
                <div className="bg-white p-6 rounded-lg text-center border border-slate-200">
                    <BookOpen size={24} className="text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-700">No {isSchool ? "Sections" : "Batches"} Found</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        {search ? "No matching class found." : "Contact administrator to assign classes to your profile."}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                    {filteredBatches.map((batch) => (
                        <div 
                            key={batch._id}
                            className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                        >
                            <div className="min-w-0">
                                <h3 className="text-xs font-bold text-slate-900 truncate">{batch.name}</h3>
                                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                    {batch.course?.name || "Class"} • {(batch.students || []).length} Students
                                </p>
                            </div>

                            <Link
                                href={`/admin/attendance?batchId=${batch._id}`}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-md text-xs font-bold shrink-0 flex items-center gap-1 transition-colors"
                            >
                                <UserCheck size={14} /> Attendance
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
