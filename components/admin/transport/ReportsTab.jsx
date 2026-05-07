"use client";
import { useState, useEffect } from "react";
import { BarChart3, Users, Car, CreditCard, Download, Printer, ChevronRight, MapPin } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const REPORT_TYPES = [
    { label: "Route-wise Students", value: "route-students" },
    { label: "Vehicle Utilization", value: "vehicle-utilization" },
    { label: "Fee Collection", value: "fee-collection" }
];

export default function ReportsTab() {
    const [activeReport, setActiveReport] = useState("route-students");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchReport();
    }, [activeReport]);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/v1/transport/reports?type=${activeReport}`);
            const json = await res.json();
            setData(json.report);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Transport Reports</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Generate and export operational data</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select 
                        className="w-56"
                        value={activeReport} 
                        onChange={setActiveReport} 
                        options={REPORT_TYPES} 
                        searchable={false}
                    />
                    <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-2">
                        <Printer size={16} /> Print
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="py-24 flex justify-center"><LoadingSpinner /></div>
            ) : (
                <div className="animate-fade-in">
                    {activeReport === "route-students" && <RouteStudentsReport data={data} />}
                    {activeReport === "vehicle-utilization" && <VehicleUtilizationReport data={data} />}
                    {activeReport === "fee-collection" && <FeeCollectionReport data={data} />}
                </div>
            )}
        </div>
    );
}

function RouteStudentsReport({ data }) {
    if (!data || data.length === 0) return <EmptyReport icon={Users} title="No route assignments" />;

    return (
        <div className="space-y-6">
            {data.map((item, idx) => (
                <div key={idx} className="premium-card overflow-hidden">
                    <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                <MapPin size={16} />
                            </div>
                            <h4 className="font-bold text-slate-800">{item.route.name}</h4>
                            <Badge variant="soft">{item.count} Students</Badge>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-50">
                                    <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Enrollment</th>
                                    <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Name</th>
                                    <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Pickup Stop</th>
                                    <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle</th>
                                </tr>
                            </thead>
                            <tbody>
                                {item.students.map((s, sIdx) => (
                                    <tr key={sIdx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors">
                                        <td className="px-6 py-3 font-mono text-xs text-slate-500">{s.enrollmentNumber || "—"}</td>
                                        <td className="px-6 py-3 font-bold text-slate-700">{s.profile.firstName} {s.profile.lastName}</td>
                                        <td className="px-6 py-3 text-slate-600">{s.transport.pickupStop || "—"}</td>
                                        <td className="px-6 py-3 font-medium text-slate-600">{s.transport.vehicle?.registrationNumber || "—"}</td>
                                    </tr>
                                ))}
                                {item.students.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-slate-400 italic">No students assigned to this route</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
}

function VehicleUtilizationReport({ data }) {
    if (!data || data.length === 0) return <EmptyReport icon={Car} title="No vehicle data" />;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((item, idx) => (
                <Card key={idx} className="relative overflow-hidden">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-1">Registration</p>
                            <h4 className="font-mono font-bold text-slate-900 text-lg">{item.vehicle.registrationNumber}</h4>
                        </div>
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex flex-col items-center justify-center border",
                            item.utilizationPercent >= 100 ? "bg-red-50 text-red-600 border-red-100" : 
                            item.utilizationPercent > 85 ? "bg-amber-50 text-amber-600 border-amber-100" : 
                            "bg-emerald-50 text-emerald-600 border-emerald-100"
                        )}>
                            <span className="text-sm font-bold leading-none">{item.utilizationPercent}%</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-medium">
                                <span className="text-slate-500">Occupancy</span>
                                <span className="text-slate-900">{item.currentOccupancy} / {item.vehicle.capacity}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        item.utilizationPercent >= 100 ? "bg-red-500" : 
                                        item.utilizationPercent > 85 ? "bg-amber-500" : 
                                        "bg-emerald-500"
                                    )}
                                    style={{ width: `${Math.min(100, item.utilizationPercent)}%` }}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-50 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100">
                                <MapPin size={14} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Active Route</p>
                                <p className="text-xs font-bold text-slate-700 truncate">{item.vehicle.route?.name || "Unassigned"}</p>
                            </div>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}

function FeeCollectionReport({ data }) {
    if (!data) return <EmptyReport icon={CreditCard} title="No fee data" />;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Expected" value={`₹${data.totalExpected.toLocaleString('en-IN')}`} icon={CreditCard} color="blue" />
                <StatCard label="Total Collected" value={`₹${data.totalCollected.toLocaleString('en-IN')}`} icon={CheckCircle2} color="emerald" />
                <StatCard label="Total Pending" value={`₹${data.totalPending.toLocaleString('en-IN')}`} icon={AlertCircle} color="red" />
                <StatCard label="Total Students" value={data.totalStudents} icon={Users} color="violet" />
            </div>

            <div className="premium-card overflow-hidden">
                <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
                    <h4 className="font-bold text-slate-800">Collection Breakdown</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-50">
                                <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Student</th>
                                <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Route</th>
                                <th className="text-center px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Expected</th>
                                <th className="text-center px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Paid</th>
                                <th className="text-center px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Balance</th>
                                <th className="text-right px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.fees.map((f, idx) => (
                                <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors">
                                    <td className="px-6 py-3">
                                        <p className="font-bold text-slate-700">{f.student.profile.firstName} {f.student.profile.lastName}</p>
                                        <p className="text-[10px] font-mono text-slate-400 uppercase">{f.student.enrollmentNumber || "N/A"}</p>
                                    </td>
                                    <td className="px-6 py-3 text-slate-600 font-medium">{f.route?.name || "—"}</td>
                                    <td className="px-6 py-3 text-center font-medium text-slate-600">₹{f.totalAmount}</td>
                                    <td className="px-6 py-3 text-center font-bold text-emerald-600">₹{f.paidAmount}</td>
                                    <td className="px-6 py-3 text-center font-bold text-red-600">₹{f.balanceAmount}</td>
                                    <td className="px-6 py-3 text-right">
                                        <Badge 
                                            variant={f.status === 'paid' ? 'success' : f.status === 'overdue' ? 'danger' : 'warning'}
                                            className="uppercase text-[10px]"
                                        >
                                            {f.status.replace('_', ' ')}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color }) {
    const colors = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        red: "bg-red-50 text-red-600 border-red-100",
        violet: "bg-violet-50 text-violet-600 border-violet-100"
    };

    return (
        <Card className="flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border", colors[color])}>
                <Icon size={20} />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">{label}</p>
                <h4 className="text-xl font-bold text-slate-900 leading-tight">{value}</h4>
            </div>
        </Card>
    );
}

function EmptyReport({ icon: Icon, title }) {
    return (
        <div className="py-24 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
                <Icon size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-xs">No data available to display in this report yet.</p>
        </div>
    );
}

// Icons for StatCard (need to be imported)
import { CheckCircle2, AlertCircle } from "lucide-react";
