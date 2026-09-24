"use client";

import { useState, useEffect } from "react";
import { Loader2, Printer, ArrowLeft, MessageCircle, Send } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";

const formatCurrency = (amount) => {
    return (Number(amount) || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const numberToWords = (num) => {
    const val = Number(num);
    if (!val || isNaN(val) || val === 0) return "Zero Rupees and Zero Paise";

    const parts = val.toFixed(2).split('.');
    let wholePart = parseInt(parts[0], 10);
    let decimalPart = parseInt(parts[1], 10);

    const a = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = [
        '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
    ];

    const convert = (n) => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
        if (n < 1000) {
            const hundreds = Math.floor(n / 100);
            const remaining = n % 100;
            return a[hundreds] + ' Hundred' + (remaining !== 0 ? ' and ' + convert(remaining) : '');
        }
        return '';
    };

    let words = '';

    if (wholePart >= 10000000) {
        words += convert(Math.floor(wholePart / 10000000)) + ' Crore ';
        wholePart %= 10000000;
    }
    if (wholePart >= 100000) {
        words += convert(Math.floor(wholePart / 100000)) + ' Lakh ';
        wholePart %= 100000;
    }
    if (wholePart >= 1000) {
        words += convert(Math.floor(wholePart / 1000)) + ' Thousand ';
        wholePart %= 1000;
    }
    if (wholePart > 0) {
        words += convert(wholePart);
    }

    let result = (words.trim() || 'Zero') + ' Rupees';

    if (decimalPart > 0) {
        result += ' and ' + convert(decimalPart) + ' Paise';
    } else {
        result += ' and Zero Paise';
    }

    return result;
};

const getMonthName = (m) => {
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const idx = parseInt(m) - 1;
    return months[idx] || (m ? String(m) : '');
};

export default function PayslipReceiptPage() {
    const params = useParams();
    const id = params?.id;
    const router = useRouter();
    const toast = useToast();

    const [payslip, setPayslip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSendingWa, setIsSendingWa] = useState(false);

    useEffect(() => {
        if (id) {
            fetchPayslipDetails(id);
        }
    }, [id]);

    const fetchPayslipDetails = async (targetId) => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`/api/v1/hr/payslips/${targetId}`);
            if (!res.ok) {
                let errMsg = "Failed to fetch payslip details";
                try {
                    const data = await res.json();
                    errMsg = data.error || errMsg;
                } catch (e) {}
                throw new Error(errMsg);
            }
            const data = await res.json();
            if (!data.payslip) {
                throw new Error("Payslip record not found");
            }
            setPayslip(data.payslip);
        } catch (err) {
            console.error("fetchPayslipDetails error:", err);
            setError(err.message || "Error loading payslip");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        setTimeout(() => window.print(), 100);
    };

    const handleSendWaApi = async () => {
        if (!payslip?._id) return;
        try {
            setIsSendingWa(true);
            const res = await fetch('/api/v1/messaging/whatsapp/send-receipt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'payslip', id: payslip._id })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to dispatch via WhatsApp');
            toast.success(data.message || `Payslip sent via ${data.provider}!`);
        } catch (err) {
            toast.error(err.message || "Failed to send WhatsApp message");
        } finally {
            setIsSendingWa(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    if (error || !payslip) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center bg-slate-100">
                <div className="bg-red-50 text-red-600 p-8 rounded-3xl border border-red-100 max-w-md shadow-sm">
                    <h2 className="text-xl font-bold mb-2">Payslip Not Found</h2>
                    <p className="text-sm opacity-80 mb-6">{error || "Could not load payslip document."}</p>
                    <Button onClick={() => router.push('/admin/hr/payslips')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl border-none w-full py-2.5">
                        Back to Payslips
                    </Button>
                </div>
            </div>
        );
    }

    const staff = payslip.staff || {};
    const staffName = staff.profile?.firstName 
        ? `${staff.profile.firstName} ${staff.profile.lastName || ''}`.trim() 
        : staff.fullName || "Staff Member";

    const designation = staff.hrDetails?.designation?.name || (staff.role === 'instructor' ? 'Faculty / Teacher' : 'Staff');
    const institute = payslip.institute || {};
    
    // Dates calculation
    const yearVal = parseInt(payslip.month ? payslip.year : new Date().getFullYear());
    const monthNum = parseInt(payslip.month || "1");
    const lastDayOfMonth = new Date(yearVal, monthNum, 0).getDate();
    const payPeriodStr = `${getMonthName(monthNum)} 01 - ${lastDayOfMonth}, ${yearVal}`;
    const payDateStr = payslip.paymentDate 
        ? new Date(payslip.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : (payslip.createdAt ? new Date(payslip.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-');

    const joiningDateStr = staff.hrDetails?.joiningDate 
        ? new Date(staff.hrDetails.joiningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '-';

    const accountRef = staff.enrollmentNumber || staff.username || (payslip._id ? `EMP-${payslip._id.toString().slice(-6).toUpperCase()}` : 'EMP-001');

    // Earnings & Deductions list preparation
    const earningsList = [
        { name: "Basic Salary", amount: payslip.basicSalary || 0 },
        ...(payslip.earnings || []).map(e => ({ name: e.componentName, amount: e.amount || 0 }))
    ];

    const deductionsList = [
        ...(payslip.deductions || []).map(d => ({ name: d.componentName, amount: d.amount || 0 }))
    ];

    const maxRows = Math.max(earningsList.length, deductionsList.length);
    const pairedRows = [];
    for (let i = 0; i < maxRows; i++) {
        pairedRows.push({
            earning: earningsList[i] || null,
            deduction: deductionsList[i] || null
        });
    }

    const grossSalary = earningsList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalDeductions = deductionsList.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const netSalary = Number(payslip.netSalary) || 0;
    const netSalaryWords = numberToWords(netSalary);
    const staffPhone = staff.phone || staff.profile?.phone;

    return (
        <div className="min-h-screen bg-slate-200/80 p-4 md:p-8 print:p-0 print:bg-white font-sans text-slate-900">
            {/* TOOLBAR (Hidden in Print) */}
            <div className="max-w-[820px] mx-auto mb-6 flex flex-wrap justify-between items-center bg-white border border-slate-300 p-4 rounded-xl shadow-sm print:hidden gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/admin/hr/payslips')}
                        className="text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-lg hover:bg-slate-100 cursor-pointer"
                        title="Back to Payslips"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-sm font-black text-slate-800 leading-none">Wage Payslip Document</h1>
                        <p className="text-[11px] text-slate-500 font-medium mt-1">Official Document Print View</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {staffPhone && (
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleSendWaApi}
                                disabled={isSendingWa}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-3 py-2 text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                            >
                                {isSendingWa ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                Send WA
                            </Button>
                            <a
                                href={`https://wa.me/${staffPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Dear ${staffName}, your salary payslip for ${getMonthName(payslip.month)} ${payslip.year} has been generated. Net Payable: ₹${formatCurrency(netSalary)}.`)}`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Button variant="outline" className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1 cursor-pointer">
                                    <MessageCircle size={14} />
                                    Web
                                </Button>
                            </a>
                        </div>
                    )}

                    <Button onClick={handlePrint} className="bg-[#35374d] hover:bg-[#252636] text-white rounded-xl px-5 py-2 text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer">
                        <Printer size={16} />
                        Print Document
                    </Button>
                </div>
            </div>

            {/* EXACT DOCUMENT TEMPLATE FROM Wage_Payslip_Template.docx */}
            <div className="print-area max-w-[820px] mx-auto bg-white shadow-xl print:shadow-none border border-slate-300 print:border-none min-h-[1100px] flex flex-col justify-between">
                <div>
                    {/* 1. TOP BANNER: W A G E   P A Y S L I P */}
                    <div className="bg-[#35374d] text-white py-4 px-8 tracking-[0.25em] font-medium text-xs uppercase text-left">
                        W A G E &nbsp; P A Y S L I P
                    </div>

                    <div className="p-8 md:p-10 space-y-6">
                        {/* 2. INSTITUTE / COMPANY DETAILS (Top Left) */}
                        <div className="space-y-1 text-xs">
                            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                                {institute.name || "ABC VENTURES INC"}
                            </h2>
                            <p className="text-slate-600 font-medium">
                                {institute.address || "123 Retail Plaza, Suite 400, Chicago, IL 60601, USA"}
                            </p>
                            <p className="text-slate-600 font-medium">
                                Contact: {institute.contact || "(312) 555-0199"} | {institute.email || "hr@abcventures.com"}
                            </p>
                        </div>

                        {/* 3. DOCUMENT TITLE: Payslip for the Month of [Month Year] */}
                        <div className="text-center pt-2">
                            <h3 className="text-sm md:text-base font-bold text-slate-900">
                                Payslip for the Month of {getMonthName(payslip.month)} {payslip.year}
                            </h3>
                        </div>

                        {/* 4. SUMMARY ROW: Employee Pay Summary (Left) & Employee Net Pay (Right) */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pt-2">
                            {/* Left: Employee Pay Summary */}
                            <div className="md:col-span-7 space-y-2 text-xs">
                                <h4 className="font-bold text-slate-900 text-xs mb-3">Employee Pay Summary</h4>
                                <div className="space-y-1 text-slate-700">
                                    <div className="grid grid-cols-12">
                                        <span className="col-span-5 font-normal text-slate-600">Employee Name</span>
                                        <span className="col-span-7 font-bold text-slate-900">: {staffName}</span>
                                    </div>
                                    <div className="grid grid-cols-12">
                                        <span className="col-span-5 font-normal text-slate-600">Designation</span>
                                        <span className="col-span-7 font-medium text-slate-800">: {designation}</span>
                                    </div>
                                    <div className="grid grid-cols-12">
                                        <span className="col-span-5 font-normal text-slate-600">Date of Joining</span>
                                        <span className="col-span-7 font-medium text-slate-800">: {joiningDateStr}</span>
                                    </div>
                                    <div className="grid grid-cols-12">
                                        <span className="col-span-5 font-normal text-slate-600">Pay Period</span>
                                        <span className="col-span-7 font-medium text-slate-800">: {payPeriodStr}</span>
                                    </div>
                                    <div className="grid grid-cols-12">
                                        <span className="col-span-5 font-normal text-slate-600">Pay Date</span>
                                        <span className="col-span-7 font-medium text-slate-800">: {payDateStr}</span>
                                    </div>
                                    <div className="grid grid-cols-12">
                                        <span className="col-span-5 font-normal text-slate-600">Account</span>
                                        <span className="col-span-7 font-medium text-slate-800">: {accountRef}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Employee Net Pay Box */}
                            <div className="md:col-span-5 border border-[#9bb2d9] rounded-sm overflow-hidden bg-white shadow-xs">
                                <div className="bg-[#b8c7e6] text-slate-900 font-bold text-xs py-2 px-4 text-center uppercase tracking-wide">
                                    Employee Net Pay
                                </div>
                                <div className="py-6 px-4 text-center">
                                    <span className="text-3xl md:text-4xl font-extrabold text-[#1a1c29] tracking-tight">
                                        ₹{formatCurrency(netSalary)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 5. ATTENDANCE SUMMARY STRIP */}
                        {payslip.attendanceSummary && (
                            <div className="border border-[#b8c7e6] bg-[#f4f7fc] p-2.5 rounded text-[11px] grid grid-cols-5 gap-2 text-center font-medium text-slate-700">
                                <div><span className="text-slate-500 font-normal">Present:</span> <strong>{payslip.attendanceSummary.present || 0}d</strong></div>
                                <div><span className="text-slate-500 font-normal">Absent:</span> <strong className="text-rose-600">{payslip.attendanceSummary.absent || 0}d</strong></div>
                                <div><span className="text-slate-500 font-normal">Half Day:</span> <strong>{payslip.attendanceSummary.halfDay || 0}d</strong></div>
                                <div><span className="text-slate-500 font-normal">Leave:</span> <strong>{payslip.attendanceSummary.onLeave || 0}d</strong></div>
                                <div><span className="text-slate-500 font-normal">Holidays:</span> <strong>{payslip.attendanceSummary.holiday || 0}d</strong></div>
                            </div>
                        )}

                        {/* 6. MAIN TABLE: EARNINGS & DEDUCTIONS SIDE-BY-SIDE (ALL ITEMS LISTED EVEN IF 0) */}
                        <div className="border border-[#7a8ba8] overflow-hidden text-xs">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-[#b8c7e6] text-slate-900 font-bold border-b border-[#7a8ba8]">
                                        <th className="py-2 px-3 text-left border-r border-[#7a8ba8] w-4/12 uppercase tracking-wide">EARNINGS</th>
                                        <th className="py-2 px-3 text-right border-r border-[#7a8ba8] w-2/12 uppercase tracking-wide">AMOUNT</th>
                                        <th className="py-2 px-3 text-left border-r border-[#7a8ba8] w-4/12 uppercase tracking-wide">DEDUCTIONS</th>
                                        <th className="py-2 px-3 text-right w-2/12 uppercase tracking-wide">AMOUNT</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#7a8ba8] bg-white">
                                    {pairedRows.map((row, idx) => (
                                        <tr key={idx} className="divide-x divide-[#7a8ba8]">
                                            {/* Earning Name */}
                                            <td className="py-2 px-3 text-slate-800 font-normal">
                                                {row.earning ? row.earning.name : ""}
                                            </td>
                                            {/* Earning Amount */}
                                            <td className="py-2 px-3 text-right font-medium text-slate-900">
                                                {row.earning ? `₹${formatCurrency(row.earning.amount)}` : ""}
                                            </td>
                                            {/* Deduction Name */}
                                            <td className="py-2 px-3 text-slate-800 font-normal">
                                                {row.deduction ? row.deduction.name : ""}
                                            </td>
                                            {/* Deduction Amount */}
                                            <td className="py-2 px-3 text-right font-medium text-slate-900">
                                                {row.deduction ? `₹${formatCurrency(row.deduction.amount)}` : ""}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-[#b8c7e6] text-slate-900 font-bold border-t border-[#7a8ba8] divide-x divide-[#7a8ba8]">
                                        <td className="py-2.5 px-3 text-left">Gross Salary</td>
                                        <td className="py-2.5 px-3 text-right font-bold">₹{formatCurrency(grossSalary)}</td>
                                        <td className="py-2.5 px-3 text-left">Total Deductions</td>
                                        <td className="py-2.5 px-3 text-right font-bold">₹{formatCurrency(totalDeductions)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* 7. NET PAY & AMOUNT IN WORDS */}
                        <div className="space-y-1 text-xs pt-1">
                            <div className="font-bold text-slate-900 text-xs">
                                NET PAY: &nbsp; ₹{formatCurrency(netSalary)}
                            </div>
                            <div className="text-slate-600 font-normal text-[11px]">
                                Amount in Words: <span className="font-medium text-slate-800">{netSalaryWords}</span>
                            </div>
                        </div>

                        <hr className="border-slate-300 my-4" />

                        {/* 8. SIGNATURES */}
                        <div className="pt-8 pb-4 grid grid-cols-2 gap-12 text-center text-xs font-bold text-slate-700">
                            <div>
                                <div className="border-t border-slate-400 pt-1.5 mx-auto w-48">
                                    Employee Signature
                                </div>
                            </div>
                            <div>
                                <div className="border-t border-slate-400 pt-1.5 mx-auto w-48">
                                    Authorized Signatory
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 9. BOTTOM FULL-WIDTH BANNER */}
                <div className="bg-[#b8c7e6] text-slate-900 py-3 px-8 text-xs font-bold flex justify-between items-center border-t border-[#9bb2d9]">
                    <span className="tracking-tight">
                        TOTAL NET PAYABLE: &nbsp; ₹{formatCurrency(netSalary)} &nbsp; ({netSalaryWords})
                    </span>
                    <span className="text-slate-500 font-black text-sm uppercase opacity-40">
                        {institute.name?.charAt(0) || "T"}
                    </span>
                </div>
            </div>
        </div>
    );
}
