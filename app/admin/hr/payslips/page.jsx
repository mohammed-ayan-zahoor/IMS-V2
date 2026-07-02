"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FileSpreadsheet, Plus, Trash2, Loader2, Landmark, CheckCircle, Printer, X, Download, User, Calendar, Receipt, DollarSign } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" }
];

const paymentModeOptions = [
    { value: "Cash", label: "Cash" },
    { value: "Bank Transfer", label: "Bank Transfer" },
    { value: "UPI", label: "UPI" },
    { value: "Cheque", label: "Cheque" }
];

export default function PayslipsPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const [loading, setLoading] = useState(true);
    const [payslips, setPayslips] = useState([]);
    const [staffList, setStaffList] = useState([]);
    
    // Filter State
    const today = new Date();
    const [filterMonth, setFilterMonth] = useState(String(today.getMonth() + 1));
    const [filterYear, setFilterYear] = useState(String(today.getFullYear()));
    
    // Modal controls
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isPrintOpen, setIsPrintOpen] = useState(false);
    const [isPayOpen, setIsPayOpen] = useState(false);
    
    // Create Form State
    const [selectedStaffId, setSelectedStaffId] = useState("");
    const [createMonth, setCreateMonth] = useState(String(today.getMonth() + 1));
    const [createYear, setCreateYear] = useState(String(today.getFullYear()));
    const [notes, setNotes] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("unpaid");
    const [paymentMode, setPaymentMode] = useState("Cash");
    
    // Detail overlay / Actions targets
    const [activePayslip, setActivePayslip] = useState(null);
    const [payMode, setPayMode] = useState("Cash");
    
    // Calculated staff stats for preview
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, idx) => {
            const yr = String(currentYear - idx);
            return { value: yr, label: yr };
        });
    }, []);

    const fetchPayslips = useCallback(async (month, year, signal) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/hr/payslips?month=${month}&year=${year}`, {
                signal: signal || AbortSignal.timeout(10000)
            });
            if (!res.ok) throw new Error("Failed to fetch payslips");
            const data = await res.json();
            setPayslips(data.payslips || []);
        } catch (error) {
            if (error.name !== 'AbortError') {
                toast.error("Failed to load generated payslips");
            }
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const fetchStaffList = useCallback(async (signal) => {
        try {
            const res = await fetch("/api/v1/users", { signal });
            if (res.ok) {
                const data = await res.json();
                const staffOnly = (data.users || []).filter(u => ['instructor', 'staff'].includes(u.role));
                setStaffList(staffOnly);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Failed to load staff list", error);
            }
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchPayslips(filterMonth, filterYear, controller.signal);
        fetchStaffList(controller.signal);
        return () => controller.abort();
    }, [filterMonth, filterYear, fetchPayslips, fetchStaffList]);

    // Live preview generator whenever staff, month, or year changes
    useEffect(() => {
        if (!selectedStaffId || !isCreateOpen) {
            setPreviewData(null);
            return;
        }

        const controller = new AbortController();

        const fetchPreviewDetails = async () => {
            setPreviewLoading(true);
            try {
                // Fetch staff basic details + dynamic elements
                const staffRes = await fetch(`/api/v1/users`, { signal: controller.signal });
                const staffData = await staffRes.json();
                const staffDetail = (staffData.users || []).find(u => u._id === selectedStaffId);
                
                if (!staffDetail) throw new Error("Staff details not found");

                const basicSalary = staffDetail.hrDetails?.basicSalary || 0;
                
                // Fetch monthly staff attendance status counts
                const attendanceRes = await fetch(`/api/v1/hr/attendance?date=`, { signal: controller.signal }); 
                // Alternatively, let's fetch attendance logs directly for this staff member
                const staffAttendanceRes = await fetch(`/api/v1/hr/attendance?staff=${selectedStaffId}`, { signal: controller.signal });
                const staffAttendanceData = await staffAttendanceRes.json();
                
                const monthIndex = parseInt(createMonth) - 1;
                const yearVal = parseInt(createYear);
                const startDate = new Date(yearVal, monthIndex, 1);
                const endDate = new Date(yearVal, createMonth, 0, 23, 59, 59, 999);
                const totalDaysInMonth = new Date(yearVal, createMonth, 0).getDate();

                const matchedLogs = (staffAttendanceData.records || []).filter(log => {
                    const logDate = new Date(log.date);
                    return logDate >= startDate && logDate <= endDate;
                });

                const summary = { present: 0, absent: 0, halfDay: 0, onLeave: 0, holiday: 0 };
                matchedLogs.forEach(log => {
                    if (log.status === 'present') summary.present++;
                    else if (log.status === 'absent') summary.absent++;
                    else if (log.status === 'half_day') summary.halfDay++;
                    else if (log.status === 'on_leave') summary.onLeave++;
                    else if (log.status === 'holiday') summary.holiday++;
                });

                // Auto calculate daily rate and attendance penalty deductions
                const dailyRate = basicSalary / totalDaysInMonth;
                const absentDeduction = Math.round((summary.absent * dailyRate + (summary.halfDay * 0.5 * dailyRate)) * 100) / 100;

                const earnings = (staffDetail.hrDetails?.earnings || []).map(e => ({
                    componentName: e.component?.name || "Allowance Component",
                    amount: e.amount || 0
                }));

                const deductions = (staffDetail.hrDetails?.deductions || []).map(d => ({
                    componentName: d.component?.name || "Deduction Component",
                    amount: d.amount || 0
                }));

                const totalEarnings = basicSalary + earnings.reduce((sum, e) => sum + e.amount, 0);
                const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0) + absentDeduction;
                const netSalary = Math.max(0, totalEarnings - totalDeductions);

                setPreviewData({
                    fullName: staffDetail.fullName,
                    role: staffDetail.role,
                    basicSalary,
                    attendanceSummary: summary,
                    absentDeduction,
                    earnings,
                    deductions,
                    totalEarnings,
                    totalDeductions,
                    netSalary
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error(err);
                    toast.error("Failed to generate salary calculation preview");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setPreviewLoading(false);
                }
            }
        };

        fetchPreviewDetails();
        return () => controller.abort();
    }, [selectedStaffId, createMonth, createYear, isCreateOpen, toast]);

    const handleCreatePayslip = async (e) => {
        e.preventDefault();
        if (!selectedStaffId) {
            toast.error("Please select a staff member");
            return;
        }

        try {
            const res = await fetch("/api/v1/hr/payslips", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    staffId: selectedStaffId,
                    month: parseInt(createMonth),
                    year: parseInt(createYear),
                    paymentStatus,
                    paymentMode,
                    notes
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("Payslip generated successfully");
                setIsCreateOpen(false);
                setSelectedStaffId("");
                setNotes("");
                fetchPayslips(filterMonth, filterYear);
            } else {
                toast.error(data.error || "Failed to generate payslip");
            }
        } catch (error) {
            toast.error("Error generating payslip");
        }
    };

    const handleMarkAsPaid = async (e) => {
        e.preventDefault();
        if (!activePayslip) return;

        try {
            const res = await fetch(`/api/v1/hr/payslips/${activePayslip._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    paymentStatus: "paid",
                    paymentMode: payMode
                })
            });

            if (res.ok) {
                toast.success("Salary status marked as Paid");
                setIsPayOpen(false);
                fetchPayslips(filterMonth, filterYear);
            } else {
                toast.error("Failed to update payment status");
            }
        } catch (error) {
            toast.error("Error updating status");
        }
    };

    const handleDeletePayslip = async (id, staffName) => {
        if (await confirm({
            title: "Delete Payslip?",
            message: `Are you sure you want to delete this payslip record for "${staffName}"? This action is permanent.`,
            type: "danger"
        })) {
            try {
                const res = await fetch(`/api/v1/hr/payslips/${id}`, { method: "DELETE" });
                if (res.ok) {
                    toast.success("Payslip deleted");
                    fetchPayslips(filterMonth, filterYear);
                } else {
                    toast.error("Failed to delete payslip");
                }
            } catch (error) {
                toast.error("Error deleting payslip");
            }
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const getMonthName = (monthNumber) => {
        return months.find(m => m.value === String(monthNumber))?.label || "Unknown";
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <FileSpreadsheet className="text-premium-blue" size={28} />
                        Payslip Generator
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Manage staff payroll list and generate monthly payslips.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 bg-premium-blue hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-blue-500/20">
                    <Plus size={18} />
                    Generate Payslip
                </Button>
            </div>

            {/* Filter controls card */}
            <Card className="p-4 bg-white">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="w-48">
                        <Select
                            label="Month"
                            options={months}
                            value={filterMonth}
                            onChange={(val) => setFilterMonth(val)}
                        />
                    </div>
                    <div className="w-32">
                        <Select
                            label="Year"
                            options={years}
                            value={filterYear}
                            onChange={(val) => setFilterYear(val)}
                        />
                    </div>
                    <div className="pt-5 flex items-end">
                        <Button variant="outline" onClick={() => { setFilterMonth(String(today.getMonth() + 1)); setFilterYear(String(today.getFullYear())); }}>
                            Current Month
                        </Button>
                    </div>
                </div>
            </Card>

            {loading ? (
                <div className="py-20 flex flex-col items-center gap-4 text-slate-400 font-medium italic">
                    <Loader2 className="animate-spin text-premium-blue" size={40} />
                    Loading payslips ledger...
                </div>
            ) : payslips.length > 0 ? (
                <Card className="overflow-hidden border border-slate-200 shadow-sm bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Staff Member</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Payroll Period</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Basic Salary</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Net Payable</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {payslips.map((p) => {
                                    const staffName = `${p.staff?.profile?.firstName || ''} ${p.staff?.profile?.lastName || ''}`.trim() || "Unknown";
                                    return (
                                        <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800">{staffName}</span>
                                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">{p.staff?.role === 'instructor' ? 'Teacher' : p.staff?.role}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-600">
                                                {getMonthName(p.month)}, {p.year}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                                                {formatCurrency(p.basicSalary)}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-black text-premium-blue">
                                                {formatCurrency(p.netSalary)}
                                            </td>
                                            <td className="px-6 py-4">
                                                {p.paymentStatus === 'paid' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                                                        Paid via {p.paymentMode}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700">
                                                        Unpaid
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {p.paymentStatus === 'unpaid' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => { setActivePayslip(p); setIsPayOpen(true); }}
                                                            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2.5 py-1.5"
                                                        >
                                                            Mark Paid
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => { setActivePayslip(p); setIsPrintOpen(true); }}
                                                        className="text-xs font-bold flex items-center gap-1 h-8 rounded-lg"
                                                    >
                                                        <Printer size={13} />
                                                        Print View
                                                    </Button>
                                                    <button
                                                        onClick={() => handleDeletePayslip(p._id, staffName)}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Delete Payslip"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-4">
                        <FileSpreadsheet size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">No payslips found</h2>
                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">Generate monthly payslips for staff members using attendance-computed templates.</p>
                    <Button variant="outline" className="mt-6" onClick={() => setIsCreateOpen(true)}>
                        Generate First Payslip
                    </Button>
                </div>
            )}

            {/* GENERATE PAYSLIP MODAL */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => { setIsCreateOpen(false); setSelectedStaffId(""); setPreviewData(null); }}
                title="Generate New Payslip"
                size="lg"
            >
                <form onSubmit={handleCreatePayslip} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <Select
                                label="Staff Member / Teacher"
                                options={staffList.map(s => ({ value: s._id, label: s.fullName }))}
                                value={selectedStaffId}
                                onChange={(val) => setSelectedStaffId(val)}
                                placeholder="Select staff"
                                required
                            />
                        </div>
                        <div>
                            <Select
                                label="Payslip Month"
                                options={months}
                                value={createMonth}
                                onChange={(val) => setCreateMonth(val)}
                                required
                            />
                        </div>
                        <div>
                            <Select
                                label="Payslip Year"
                                options={years}
                                value={createYear}
                                onChange={(val) => setCreateYear(val)}
                                required
                            />
                        </div>
                    </div>

                    {/* LIVE PREVIEW CONTAINER */}
                    {previewLoading ? (
                        <div className="py-12 flex justify-center items-center text-slate-400 italic gap-2 text-sm">
                            <Loader2 className="animate-spin text-premium-blue" size={20} />
                            Calculating payroll variables and attendance logs...
                        </div>
                    ) : previewData ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">Salary Details Preview</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase">Monthly Attendance Summary</p>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        <div className="bg-white p-2 rounded-lg text-center border border-slate-100">
                                            <span className="block text-xs font-bold text-slate-400">Present</span>
                                            <span className="block text-base font-black text-emerald-600 mt-0.5">{previewData.attendanceSummary.present}d</span>
                                        </div>
                                        <div className="bg-white p-2 rounded-lg text-center border border-slate-100">
                                            <span className="block text-xs font-bold text-slate-400">Absent</span>
                                            <span className="block text-base font-black text-rose-600 mt-0.5">{previewData.attendanceSummary.absent}d</span>
                                        </div>
                                        <div className="bg-white p-2 rounded-lg text-center border border-slate-100">
                                            <span className="block text-xs font-bold text-slate-400">Half Day</span>
                                            <span className="block text-base font-black text-amber-500 mt-0.5">{previewData.attendanceSummary.halfDay}d</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-slate-600">
                                        <span className="font-semibold">Basic Salary:</span>
                                        <span className="font-bold">{formatCurrency(previewData.basicSalary)}</span>
                                    </div>
                                    {previewData.earnings.map((e, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-slate-600">
                                            <span>(+) {e.componentName}:</span>
                                            <span className="font-bold text-emerald-600">+{formatCurrency(e.amount)}</span>
                                        </div>
                                    ))}
                                    {previewData.deductions.map((d, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-slate-600">
                                            <span>(-) {d.componentName}:</span>
                                            <span className="font-bold text-rose-600">-{formatCurrency(d.amount)}</span>
                                        </div>
                                    ))}
                                    {previewData.absentDeduction > 0 && (
                                        <div className="flex justify-between items-center text-slate-600">
                                            <span>(-) Attendance penalty:</span>
                                            <span className="font-bold text-rose-600">-{formatCurrency(previewData.absentDeduction)}</span>
                                        </div>
                                    )}
                                    <hr className="border-slate-200 mt-2" />
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="font-bold text-slate-800 text-base">Net Payable:</span>
                                        <span className="font-black text-premium-blue text-lg">{formatCurrency(previewData.netSalary)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : selectedStaffId ? (
                        <div className="text-center py-6 text-slate-400 text-sm">Select staff to preview details.</div>
                    ) : null}

                    {previewData && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select
                                label="Initial Payment Status"
                                options={[
                                    { value: "unpaid", label: "Unpaid" },
                                    { value: "paid", label: "Paid" }
                                ]}
                                value={paymentStatus}
                                onChange={(val) => setPaymentStatus(val)}
                            />
                            {paymentStatus === 'paid' && (
                                <Select
                                    label="Payment Mode"
                                    options={paymentModeOptions}
                                    value={paymentMode}
                                    onChange={(val) => setPaymentMode(val)}
                                />
                            )}
                        </div>
                    )}

                    <Input
                        label="Internal Notes"
                        placeholder="Add payslip details/remarks..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                        <Button type="button" variant="ghost" onClick={() => { setIsCreateOpen(false); setSelectedStaffId(""); setPreviewData(null); }}>Cancel</Button>
                        <Button type="submit" disabled={!selectedStaffId || previewLoading}>
                            Generate Payslip
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* PRINT VIEW MODAL */}
            {isPrintOpen && activePayslip && (
                <Modal
                    isOpen={isPrintOpen}
                    onClose={() => setIsPrintOpen(false)}
                    title="Salary Payslip Printable Receipt"
                    size="lg"
                >
                    <div className="p-6 bg-white border border-slate-300 rounded-xl space-y-6" id="printable-payslip">
                        {/* Payslip Header */}
                        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">SALARY PAYSLIP</h2>
                                <p className="text-sm font-semibold text-slate-500 mt-1">Period: {getMonthName(activePayslip.month)} {activePayslip.year}</p>
                            </div>
                            <div className="text-right">
                                <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold bg-slate-100 text-slate-700 capitalize border">
                                    Receipt Status: {activePayslip.paymentStatus.toUpperCase()}
                                </span>
                                {activePayslip.paymentDate && (
                                    <p className="text-xs text-slate-400 mt-1.5">Paid Date: {new Date(activePayslip.paymentDate).toLocaleDateString()}</p>
                                )}
                            </div>
                        </div>

                        {/* Staff profile details grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium text-slate-600 bg-slate-50 p-4 rounded-xl border">
                            <div>
                                <span className="block text-[10px] text-slate-400 uppercase font-bold">Employee Name</span>
                                <span className="text-sm font-bold text-slate-800 mt-0.5">
                                    {activePayslip.staff?.profile?.firstName || ''} {activePayslip.staff?.profile?.lastName || ''}
                                </span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-slate-400 uppercase font-bold">Email Address</span>
                                <span className="text-slate-700 block mt-0.5">{activePayslip.staff?.email || '-'}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-slate-400 uppercase font-bold">Designation</span>
                                <span className="text-slate-700 block mt-0.5">{activePayslip.staff?.hrDetails?.designation?.name || 'Staff'}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-slate-400 uppercase font-bold">Generated On</span>
                                <span className="text-slate-700 block mt-0.5">{new Date(activePayslip.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        {/* Attendance Summary */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance Breakdown</h4>
                            <div className="grid grid-cols-5 gap-2 border p-3 rounded-lg text-center text-xs font-bold bg-slate-50/50">
                                <div>
                                    <span className="block text-[10px] text-slate-400 uppercase">Present</span>
                                    <span className="text-emerald-700 block mt-0.5">{activePayslip.attendanceSummary?.present || 0} days</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-400 uppercase">Absent</span>
                                    <span className="text-rose-700 block mt-0.5">{activePayslip.attendanceSummary?.absent || 0} days</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-400 uppercase">Half Day</span>
                                    <span className="text-amber-600 block mt-0.5">{activePayslip.attendanceSummary?.halfDay || 0} days</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-400 uppercase">Leave</span>
                                    <span className="text-purple-700 block mt-0.5">{activePayslip.attendanceSummary?.onLeave || 0} days</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-400 uppercase">Holidays</span>
                                    <span className="text-slate-600 block mt-0.5">{activePayslip.attendanceSummary?.holiday || 0} days</span>
                                </div>
                            </div>
                        </div>

                        {/* Salary breakdown table grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            {/* Earnings column */}
                            <div className="border rounded-xl overflow-hidden">
                                <div className="bg-slate-50 px-4 py-2 border-b font-bold text-slate-700">Earnings & Allowances</div>
                                <div className="p-4 space-y-2">
                                    <div className="flex justify-between items-center text-slate-600">
                                        <span>Basic Salary:</span>
                                        <span className="font-bold">{formatCurrency(activePayslip.basicSalary)}</span>
                                    </div>
                                    {(activePayslip.earnings || []).map((e, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-slate-600">
                                            <span>{e.componentName}:</span>
                                            <span className="font-bold text-emerald-600">+{formatCurrency(e.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Deductions column */}
                            <div className="border rounded-xl overflow-hidden">
                                <div className="bg-slate-50 px-4 py-2 border-b font-bold text-slate-700">Deductions</div>
                                <div className="p-4 space-y-2">
                                    {(activePayslip.deductions || []).map((d, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-slate-600">
                                            <span>{d.componentName}:</span>
                                            <span className="font-bold text-rose-600">-{formatCurrency(d.amount)}</span>
                                        </div>
                                    ))}
                                    {(activePayslip.deductions || []).length === 0 && (
                                        <div className="text-slate-400 text-xs italic py-2">No deductions applied.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Totals row */}
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex justify-between items-center">
                            <div>
                                <span className="block text-[10px] text-blue-500 font-bold uppercase tracking-wider">NET SALARY PAYABLE</span>
                                <span className="text-xs text-slate-400 mt-0.5">Calculated based on attendance logs</span>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-black text-premium-blue">{formatCurrency(activePayslip.netSalary)}</span>
                            </div>
                        </div>

                        {/* Notes section */}
                        {activePayslip.notes && (
                            <div className="bg-slate-50 p-4 rounded-lg text-xs font-semibold text-slate-600 border">
                                <span className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Notes / Remarks</span>
                                <p>{activePayslip.notes}</p>
                            </div>
                        )}

                        {/* Signatures */}
                        <div className="pt-10 flex justify-between items-end text-xs font-bold text-slate-500">
                            <div className="border-t border-slate-300 pt-2 w-40 text-center">Employee Signature</div>
                            <div className="border-t border-slate-300 pt-2 w-40 text-center">Authorized Signature</div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                        <Button type="button" variant="ghost" onClick={() => setIsPrintOpen(false)}>Close</Button>
                        <Button
                            onClick={() => {
                                const printContent = document.getElementById("printable-payslip").innerHTML;
                                const originalContent = document.body.innerHTML;
                                document.body.innerHTML = printContent;
                                window.print();
                                document.body.innerHTML = originalContent;
                                window.location.reload();
                            }}
                            className="bg-premium-blue hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
                        >
                            <Printer size={16} />
                            Print Receipt
                        </Button>
                    </div>
                </Modal>
            )}

            {/* PAY SLIP MODAL */}
            {isPayOpen && activePayslip && (
                <Modal
                    isOpen={isPayOpen}
                    onClose={() => setIsPayOpen(false)}
                    title="Mark Payslip status as Paid"
                >
                    <form onSubmit={handleMarkAsPaid} className="space-y-4">
                        <p className="text-sm font-semibold text-slate-600">
                            Confirm marking payroll payment of <span className="font-bold text-premium-blue">{formatCurrency(activePayslip.netSalary)}</span> for {getMonthName(activePayslip.month)} {activePayslip.year} as Paid?
                        </p>
                        <Select
                            label="Select Payment Mode"
                            options={paymentModeOptions}
                            value={payMode}
                            onChange={(val) => setPayMode(val)}
                            required
                        />
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                            <Button type="button" variant="ghost" onClick={() => setIsPayOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                Confirm Payment
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
