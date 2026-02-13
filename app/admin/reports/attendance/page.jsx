"use client";

import { useState, useEffect } from "react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import {
    Calendar,
    Filter,
    Download,
    Search,
    BarChart3,
    FileSpreadsheet,
    Loader2
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";

export default function AttendanceReportPage() {
    const [courses, setCourses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [selectedCourse, setSelectedCourse] = useState("");
    const [selectedBatch, setSelectedBatch] = useState("");
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
    const [search, setSearch] = useState("");

    // Fetch Courses on mount
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const res = await fetch("/api/v1/courses?active=true");
                if (!res.ok) {
                    console.log("Failed to fetch courses:", res.status);
                    return;
                }
                const data = await res.json();
                if (data.courses) setCourses(data.courses);
            } catch (error) {
                console.error("Failed to fetch courses", error);
            }
        };
        fetchCourses();
    }, []);

    // Fetch Batches when Course changes
    useEffect(() => {
        if (!selectedCourse) {
            setBatches([]);
            setSelectedBatch("");
            return;
        }
        setSelectedBatch(""); // Reset batch when course changes
        const fetchBatches = async () => {
            try {
                const res = await fetch(`/api/v1/batches?courseId=${selectedCourse}&active=true`);
                const data = await res.json();
                if (data.batches) setBatches(data.batches);
            } catch (error) {
                console.error("Failed to fetch batches", error);
            }
        };
        fetchBatches();
    }, [selectedCourse]);

    // Fetch Report Data
    const fetchReport = async () => {
        if (!startDate || !endDate) {
            toast.error("Please select a date range");
            return;
        }

        setLoading(true);
        try {
            const query = new URLSearchParams({
                startDate,
                endDate,
                ...(selectedCourse && { courseId: selectedCourse }),
                ...(selectedBatch && { batchId: selectedBatch })
            });

            const res = await fetch(`/api/v1/reports/attendance?${query}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to fetch report");

            setReportData(data.report || []);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Filter data client-side for search
    const filteredData = reportData.filter(item =>
        item.name?.toLowerCase()?.includes(search.toLowerCase()) ||
        item.enrollmentNumber?.toLowerCase().includes(search.toLowerCase())
    );
    // Export to Excel
    const handleExport = () => {
        if (!filteredData.length) {
            toast.error("No data to export");
            return;
        }

        const dataToExport = filteredData.map(item => ({
            "Student Name": item.name,
            "Enrollment No": item.enrollmentNumber || "N/A",
            "Total Days": item.totalDays,
            "Present": item.present,
            "Absent": item.absent,
            "Late": item.late,
            "Excused": item.excused,
            "Attendance %": `${parseFloat(item.percentage).toFixed(1)}%`
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");

        // Auto-width columns
        worksheet["!cols"] = [
            { wch: 25 }, // Name
            { wch: 18 }, // Enrollment
            { wch: 10 }, // Total
            { wch: 10 }, // Present
            { wch: 10 }, // Absent
            { wch: 10 }, // Late
            { wch: 10 }, // Excused
            { wch: 12 }  // %
        ];

        XLSX.writeFile(workbook, `Attendance_Report_${startDate}_to_${endDate}.xlsx`);
        toast.success("Exported successfully");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Attendance Reports</h1>
                    <p className="text-slate-400 mt-1 text-sm font-medium">Analyze student attendance performance.</p>
                </div>
            </div>

            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Select
                            label="Course"
                            options={courses.map(c => ({ label: c.name, value: c._id }))}
                            value={selectedCourse}
                            onChange={(val) => setSelectedCourse(val)}
                            placeholder="All Courses"
                        />
                        <Select
                            label="Batch"
                            options={batches.map(b => ({ label: b.name, value: b._id }))}
                            value={selectedBatch}
                            onChange={(val) => setSelectedBatch(val)}
                            disabled={!selectedCourse}
                            placeholder="All Batches"
                        />
                        <Input
                            label="Start Date"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <Input
                            label="End Date"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button onClick={fetchReport} disabled={loading} className="gap-2">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Filter size={16} />}
                            Generate Report
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Results Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BarChart3 size={20} className="text-slate-400" />
                        <h3 className="font-bold text-slate-700">Report Data</h3>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                            {filteredData.length} records
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search student..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-premium-blue/20 transition-all"
                            />
                        </div>
                        <Button variant="outline" onClick={handleExport} disabled={!filteredData.length || loading} className="gap-2">
                            <FileSpreadsheet size={16} className="text-emerald-600" />
                            Export Excel
                        </Button>
                    </div>
                </CardHeader>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 font-bold">Student Name</th>
                                <th className="px-6 py-3 font-bold">Total Days</th>
                                <th className="px-6 py-3 font-bold text-emerald-600">Present</th>
                                <th className="px-6 py-3 font-bold text-red-600">Absent</th>
                                <th className="px-6 py-3 font-bold text-amber-600">Late</th>
                                <th className="px-6 py-3 font-bold text-blue-600">Excused</th>
                                <th className="px-6 py-3 font-bold text-right">Percentage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.length > 0 ? (
                                filteredData.map((item) => (
                                    <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-3 font-medium text-slate-900">
                                            {item.name}
                                            <div className="text-[10px] text-slate-400 font-mono">{item.enrollmentNumber}</div>
                                        </td>
                                        <td className="px-6 py-3">{item.totalDays}</td>
                                        <td className="px-6 py-3 text-emerald-600 font-medium">{item.present}</td>
                                        <td className="px-6 py-3 text-red-600 font-medium">{item.absent}</td>
                                        <td className="px-6 py-3 text-amber-600">{item.late}</td>
                                        <td className="px-6 py-3 text-blue-600">{item.excused}</td>
                                        <td className="px-6 py-3 text-right font-bold">
                                            <span className={`px-2 py-1 rounded-md ${parseFloat(item.percentage) >= 75 ? 'bg-emerald-100 text-emerald-700' :
                                                parseFloat(item.percentage) >= 50 ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {parseFloat(item.percentage).toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                                        {loading ? "Generating report..." : "No records found for the selected criteria."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
