"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Users, Search, Phone, Calendar, ArrowRight, Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card, { CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import Link from "next/link";

export default function EnquiriesPage() {
    const [enquiries, setEnquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchEnquiries();
    }, []);

    const fetchEnquiries = async () => {
        try {
            setError(null);
            const res = await fetch("/api/v1/enquiries");
            if (res.ok) {
                const data = await res.json();
                setEnquiries(data.enquiries || []);
            } else {
                const errData = await res.json();
                setError(errData.error || `Failed to fetch: ${res.statusText}`);
            }
        } catch (error) {
            console.error("Failed to fetch enquiries", error);
            setError(error.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const filteredEnquiries = enquiries.filter(enq =>
        enq.studentName?.toLowerCase().includes(search.toLowerCase()) ||
        enq.contactNumber?.includes(search)
    );

    const getStatusVariant = (status) => {
        switch (status) {
            case 'Confirmed': return 'success';
            case 'Rejected': return 'danger';
            default: return 'warning';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admission Enquiries</h1>
                    <p className="text-slate-400 mt-1 text-sm font-medium">Manage and track prospective student leads.</p>
                </div>
                <Link href="/admin/enquiries/new">
                    <Button className="flex items-center gap-2 bg-premium-blue hover:bg-premium-blue/90 shadow-md shadow-blue-500/10">
                        <Plus size={18} />
                        <span>New Entry</span>
                    </Button>
                </Link>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm font-bold flex items-center justify-between">
                    <span>{error}</span>
                    <Button variant="ghost" size="sm" onClick={fetchEnquiries} className="text-red-600 hover:bg-red-100 h-8">Retry</Button>
                </div>
            )}

            <Card className="transition-all border-transparent shadow-sm overflow-visible">
                <CardContent className="p-0">
                    <div className="p-4 border-b border-slate-100">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400/50" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name or contact..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-premium-blue/30 focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <LoadingSpinner />
                    ) : filteredEnquiries.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="px-6 py-4">Student</th>
                                        <th className="px-6 py-4">Contact</th>
                                        <th className="px-6 py-4">Course Interest</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Next Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredEnquiries.map(enq => (
                                        <tr key={enq._id} className="group hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-sm shrink-0">
                                                        {enq.studentName?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-sm">{enq.studentName || 'Unknown'}</h3>
                                                        <p className="text-xs text-slate-500">{enq.fatherName ? `C/O ${enq.fatherName}` : 'Student'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                                                    <Phone size={14} className="text-slate-400" />
                                                    {enq.contactNumber}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="secondary" className="font-medium text-xs">
                                                    {enq.course?.code || "Pending"}
                                                </Badge>
                                                <p className="text-[10px] text-slate-400 mt-1 font-semibold">{enq.course?.name}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={getStatusVariant(enq.status)}>{enq.status}</Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    {enq.followUpDate && !isNaN(new Date(enq.followUpDate)) && (
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
                                                            <Calendar size={12} />
                                                            Follow-up: {format(new Date(enq.followUpDate), "MMM d")}
                                                        </div>
                                                    )}
                                                    <span className="text-[10px] text-slate-400 font-bold">
                                                        Enquired: {enq.enquiryDate && !isNaN(new Date(enq.enquiryDate)) ? format(new Date(enq.enquiryDate), "PP") : 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState
                            icon={Users}
                            title="No enquiries found"
                            description="Record your first admission enquiry."
                            actionLabel="Add New Entry"
                            onAction={() => null}
                            link="/admin/enquiries/new"
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
