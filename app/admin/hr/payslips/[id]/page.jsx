"use client";

import { useState, useEffect, use } from "react";
import { Loader2, Printer, ArrowLeft, MessageCircle, Send, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";

const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const numberToWords = (num) => {
    if (num === 0 || !num) return "Zero Rupees Only";

    const parts = num.toString().split('.');
    let wholePart = parseInt(parts[0], 10);
    let decimalPart = parts[1] ? parseInt(parts[1].slice(0, 2), 10) : 0;

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

    let result = words.trim() + ' Rupees';

    if (decimalPart > 0) {
        result += ' and ' + convert(decimalPart) + ' Paise';
    }

    return result + ' Only';
};

const getMonthName = (m) => {
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    return months[parseInt(m) - 1] || m;
};

export default function PayslipReceiptPage({ params }) {
    const { id } = use(params);
    const { data: session, status: sessionStatus } = useSession();
    const router = useRouter();
    const toast = useToast();

    const [payslip, setPayslip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSendingWa, setIsSendingWa] = useState(false);
    const [templateStyle, setTemplateStyle] = useState("classic"); // 'classic' or 'executive'

    useEffect(() => {
        if (sessionStatus === "authenticated") {
            fetchPayslipDetails();
        }
    }, [id, sessionStatus]);

    const fetchPayslipDetails = async () => {
        try {
            setError(null);
            const res = await fetch(`/api/v1/hr/payslips/${id}`);
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to fetch payslip details");
            }
            const data = await res.json();
            setPayslip(data.payslip);
        } catch (err) {
            console.error("fetchPayslipDetails error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        const images = document.querySelectorAll('.print-area img');
        const promises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
            });
        });

        Promise.all(promises).then(() => {
            setTimeout(() => window.print(), 150);
        });
    };

    const handleSendWaApi = async () => {
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
            toast.error(err.message);
        } finally {
            setIsSendingWa(false);
        }
    };

    if (sessionStatus === "loading" || loading) {
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

    const staff = payslip.staff;
    const staffName = staff?.profile?.firstName 
        ? `${staff.profile.firstName} ${staff.profile.lastName || ''}`.trim() 
        : staff?.fullName || "Staff Member";

    const designation = staff?.hrDetails?.designation?.name || (staff?.role === 'instructor' ? 'Teacher / Faculty' : 'Staff');
    const institute = payslip.institute || {};
    const createdDate = new Date(payslip.createdAt);
    const acadYear = `${createdDate.getFullYear()}-${String(createdDate.getFullYear() + 1).slice(-2)}`;
    const payslipRefNo = `QT/PAY/${acadYear}/${String(payslip.month).padStart(2, '0')}/${payslip._id.toString().slice(-4).toUpperCase()}`;

    const grossEarnings = (payslip.basicSalary || 0) + (payslip.earnings || []).reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalDeductions = (payslip.deductions || []).reduce((sum, d) => sum + (d.amount || 0), 0);
    const netSalary = payslip.netSalary;
    const staffPhone = staff?.phone || staff?.profile?.phone;

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 print:p-0 print:bg-white print:min-h-0 print:h-auto font-sans text-slate-800">
            {/* Top Toolbar (Hidden in Print) */}
            <div className="max-w-5xl mx-auto mb-6 flex flex-wrap justify-between items-center bg-white border border-slate-200 p-4 rounded-xl shadow-sm print:hidden gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/admin/hr/payslips')}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-50"
                        title="Back to Payslips List"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-sm font-black text-slate-800 leading-none">Salary Payslip Document</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Ref No: {payslipRefNo}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-lg border text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => setTemplateStyle("classic")}
                            className={`px-3 py-1 rounded-md transition-colors ${templateStyle === "classic" ? "bg-white text-indigo-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                        >
                            Institutional Format
                        </button>
                        <button
                            type="button"
                            onClick={() => setTemplateStyle("executive")}
                            className={`px-3 py-1 rounded-md transition-colors ${templateStyle === "executive" ? "bg-white text-indigo-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                        >
                            Executive Format
                        </button>
                    </div>

                    {staffPhone && (
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleSendWaApi}
                                disabled={isSendingWa}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-3 py-2 text-xs font-bold shadow-sm flex items-center gap-1.5"
                                title="Send automatically via WhatsApp API"
                            >
                                {isSendingWa ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                Send WA
                            </Button>
                            <a
                                href={`https://wa.me/${staffPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Dear ${staffName}, your salary payslip for ${getMonthName(payslip.month)} ${payslip.year} has been generated. Ref: ${payslipRefNo}. Net Payable: ₹${formatCurrency(netSalary)}.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Open in WhatsApp Web"
                            >
                                <Button variant="outline" className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1">
                                    <MessageCircle size={14} />
                                    Web
                                </Button>
                            </a>
                        </div>
                    )}

                    <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2 text-xs font-bold shadow-sm flex items-center gap-2">
                        <Printer size={16} />
                        Print Payslip
                    </Button>
                </div>
            </div>

            {/* PRINTABLE DOCUMENT TEMPLATE */}
            <div className="print-area max-w-5xl mx-auto bg-white p-6 md:p-12 print:p-8 card-receipt relative border border-slate-200 print:border-none shadow-sm print:shadow-none">
                {/* DOUBLE BORDER FRAME */}
                <div className={`p-8 md:p-10 relative ${templateStyle === 'classic' ? 'border-[4px] border-double border-slate-800' : 'border border-slate-300 rounded-2xl'}`}>
                    {/* Header Branding */}
                    <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6 border-b-2 border-slate-800 pb-6">
                        <div className="flex items-center gap-4">
                            <img
                                src={institute.logo || "/quantech/Quantech-Logo.png"}
                                alt={institute.name || "Institute Logo"}
                                className="h-20 md:h-24 object-contain"
                            />
                            <div>
                                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">
                                    {institute.name || "QUANTECH EDUCATIONAL INSTITUTE"}
                                </h1>
                                <p className="text-xs text-slate-600 mt-0.5 max-w-md">
                                    {institute.address || "Main Campus, Education Directorate Hub"}
                                </p>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    Email: {institute.email || "hr@institute.edu"} | Phone: {institute.contact || "+91 98765 43210"}
                                </p>
                            </div>
                        </div>

                        <div className="text-left md:text-right">
                            <h2 className="text-2xl md:text-3xl font-extrabold text-[#002d62] uppercase font-serif tracking-wide">
                                SALARY PAYSLIP
                            </h2>
                            <p className="text-sm font-bold text-slate-700 mt-1">
                                Pay Period: <span className="text-[#002d62] font-black">{getMonthName(payslip.month)} {payslip.year}</span>
                            </p>
                            <div className="mt-2 text-xs font-semibold text-slate-600 space-y-1">
                                <div>Payslip Ref: <span className="font-bold text-slate-800 font-mono">{payslipRefNo}</span></div>
                                <div>Disbursement Date: <span className="font-bold text-slate-800">{new Date(payslip.createdAt).toLocaleDateString()}</span></div>
                                <div>Status: <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-black uppercase ${payslip.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{payslip.paymentStatus}</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Employee & Attendance Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Employee Details Table */}
                        <div className="border border-slate-300 rounded-lg overflow-hidden">
                            <div className="bg-slate-100 px-4 py-2 font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-300">
                                Employee Profile
                            </div>
                            <table className="w-full text-xs text-left">
                                <tbody className="divide-y divide-slate-200">
                                    <tr>
                                        <td className="px-3 py-2 font-bold text-slate-500 w-1/3 bg-slate-50">Employee Name</td>
                                        <td className="px-3 py-2 font-black text-slate-900">{staffName}</td>
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-2 font-bold text-slate-500 bg-slate-50">Designation / Role</td>
                                        <td className="px-3 py-2 font-bold text-slate-800">{designation}</td>
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-2 font-bold text-slate-500 bg-slate-50">Email / ID</td>
                                        <td className="px-3 py-2 text-slate-700">{staff?.email || staff?.username || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-2 font-bold text-slate-500 bg-slate-50">Payment Mode</td>
                                        <td className="px-3 py-2 text-slate-700 font-semibold">{payslip.paymentMode || (payslip.paymentStatus === 'paid' ? 'Direct Bank Transfer' : 'Pending')}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Attendance Summary Table */}
                        <div className="border border-slate-300 rounded-lg overflow-hidden">
                            <div className="bg-slate-100 px-4 py-2 font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-300">
                                Monthly Attendance Record
                            </div>
                            <div className="grid grid-cols-3 gap-2 p-3 text-center text-xs">
                                <div className="border border-slate-200 rounded p-2 bg-emerald-50/50">
                                    <span className="block text-[10px] font-bold text-slate-500 uppercase">Present</span>
                                    <span className="block text-base font-black text-emerald-700">{payslip.attendanceSummary?.present || 0} days</span>
                                </div>
                                <div className="border border-slate-200 rounded p-2 bg-rose-50/50">
                                    <span className="block text-[10px] font-bold text-slate-500 uppercase">Absent</span>
                                    <span className="block text-base font-black text-rose-700">{payslip.attendanceSummary?.absent || 0} days</span>
                                </div>
                                <div className="border border-slate-200 rounded p-2 bg-amber-50/50">
                                    <span className="block text-[10px] font-bold text-slate-500 uppercase">Half Day</span>
                                    <span className="block text-base font-black text-amber-700">{payslip.attendanceSummary?.halfDay || 0} days</span>
                                </div>
                                <div className="border border-slate-200 rounded p-2 bg-purple-50/50">
                                    <span className="block text-[10px] font-bold text-slate-500 uppercase">Leave</span>
                                    <span className="block text-base font-black text-purple-700">{payslip.attendanceSummary?.onLeave || 0} days</span>
                                </div>
                                <div className="border border-slate-200 rounded p-2 bg-slate-50">
                                    <span className="block text-[10px] font-bold text-slate-500 uppercase">Holidays</span>
                                    <span className="block text-base font-black text-slate-700">{payslip.attendanceSummary?.holiday || 0} days</span>
                                </div>
                                <div className="border border-slate-200 rounded p-2 bg-blue-50/50">
                                    <span className="block text-[10px] font-bold text-slate-500 uppercase">Total Days</span>
                                    <span className="block text-base font-black text-blue-700">
                                        {(payslip.attendanceSummary?.present || 0) + (payslip.attendanceSummary?.absent || 0) + (payslip.attendanceSummary?.halfDay || 0) + (payslip.attendanceSummary?.onLeave || 0) + (payslip.attendanceSummary?.holiday || 0)} days
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TWO-COLUMN FINANCIAL TABLE (EVERY COMPONENT MENTIONED EVEN IF 0) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Column 1: Earnings */}
                        <div className="border-2 border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between">
                            <div>
                                <div className="bg-slate-800 text-white px-4 py-2.5 font-black text-xs uppercase tracking-wider flex justify-between">
                                    <span>Earnings & Allowances</span>
                                    <span>Amount (₹)</span>
                                </div>
                                <table className="w-full text-xs text-left">
                                    <tbody className="divide-y divide-slate-200">
                                        <tr className="bg-emerald-50/30">
                                            <td className="px-4 py-2.5 font-bold text-slate-800">Basic Salary</td>
                                            <td className="px-4 py-2.5 text-right font-black text-slate-900">₹{formatCurrency(payslip.basicSalary)}</td>
                                        </tr>
                                        {(payslip.earnings || []).map((e, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="px-4 py-2 text-slate-700 font-medium">{e.componentName}</td>
                                                <td className="px-4 py-2 text-right font-bold text-slate-800">
                                                    ₹{formatCurrency(e.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-slate-100 border-t-2 border-slate-800 px-4 py-2.5 flex justify-between items-center text-xs font-black text-slate-900">
                                <span>GROSS EARNINGS (A)</span>
                                <span className="text-sm font-black text-emerald-700">₹{formatCurrency(grossEarnings)}</span>
                            </div>
                        </div>

                        {/* Column 2: Deductions */}
                        <div className="border-2 border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between">
                            <div>
                                <div className="bg-slate-800 text-white px-4 py-2.5 font-black text-xs uppercase tracking-wider flex justify-between">
                                    <span>Deductions & Penalties</span>
                                    <span>Amount (₹)</span>
                                </div>
                                <table className="w-full text-xs text-left">
                                    <tbody className="divide-y divide-slate-200">
                                        {(payslip.deductions || []).map((d, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="px-4 py-2 text-slate-700 font-medium">{d.componentName}</td>
                                                <td className="px-4 py-2 text-right font-bold text-slate-800">
                                                    ₹{formatCurrency(d.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                        {(payslip.deductions || []).length === 0 && (
                                            <tr>
                                                <td colSpan="2" className="px-4 py-4 text-center text-slate-400 italic">No deductions applied</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-slate-100 border-t-2 border-slate-800 px-4 py-2.5 flex justify-between items-center text-xs font-black text-slate-900">
                                <span>TOTAL DEDUCTIONS (B)</span>
                                <span className="text-sm font-black text-rose-700">₹{formatCurrency(totalDeductions)}</span>
                            </div>
                        </div>
                    </div>

                    {/* NET PAYABLE SUMMARY BANNER (Figures and Words) */}
                    <div className="bg-[#002d62] text-white p-6 rounded-xl mb-6 shadow-sm">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest block">NET SALARY PAYABLE (A - B)</span>
                                <p className="text-sm font-semibold text-slate-200 mt-1">
                                    Amount in Words: <span className="font-bold text-amber-300 italic">{numberToWords(netSalary)}</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-3xl md:text-4xl font-black text-white tracking-tight">
                                    ₹{formatCurrency(netSalary)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Notes & Remarks */}
                    {payslip.notes && (
                        <div className="border border-slate-300 rounded-lg p-3 text-xs mb-6 bg-slate-50">
                            <span className="font-bold text-slate-700 uppercase tracking-wider block mb-0.5">Remarks / Notes:</span>
                            <p className="text-slate-600 font-medium">{payslip.notes}</p>
                        </div>
                    )}

                    {/* Formal Signatures Footer */}
                    <div className="pt-12 grid grid-cols-3 gap-8 text-center text-xs font-bold text-slate-700">
                        <div>
                            <div className="border-t-2 border-slate-800 pt-2 mx-auto w-40">
                                Employee Signature
                            </div>
                            <p className="text-[10px] text-slate-400 font-normal mt-0.5">Date: ____________</p>
                        </div>
                        <div>
                            <div className="border-t-2 border-slate-800 pt-2 mx-auto w-40">
                                Accounts / HR Officer
                            </div>
                            <p className="text-[10px] text-slate-400 font-normal mt-0.5">Verified & Prepared</p>
                        </div>
                        <div>
                            <div className="border-t-2 border-slate-800 pt-2 mx-auto w-40">
                                Authorized Signatory
                            </div>
                            <p className="text-[10px] text-slate-400 font-normal mt-0.5">Principal / Director</p>
                        </div>
                    </div>

                    {/* Institutional Disclaimer */}
                    <div className="text-center text-[10px] text-slate-400 border-t border-slate-200 mt-10 pt-3">
                        This is a computer-generated official payroll disbursement receipt and does not require a physical stamp if digitally signed.
                    </div>
                </div>
            </div>
        </div>
    );
}
