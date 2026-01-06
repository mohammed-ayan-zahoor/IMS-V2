"use client";

import { useState, useEffect, use } from "react";
import { format } from "date-fns";
import { Loader2, Printer, Download } from "lucide-react";
import Button from "@/components/ui/Button";

export default function ReceiptPage({ params }) {
    const { id } = use(params);
    const [fee, setFee] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFeeDetails();
    }, [id]);

    const fetchFeeDetails = async () => {
        try {
            const res = await fetch(`/api/v1/fees/${id}`);
            if (res.ok) {
                const data = await res.json();
                setFee(data.fee);
            }
        } catch (error) {
            console.error("Failed to fetch fee", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-premium-blue" size={32} /></div>;
    }

    if (!fee) return <div className="p-10 text-center">Receipt not found</div>;

    const { student, batch, institute } = fee;
    const installments = fee.installments || [];
    const paidInstallments = installments.filter(i => i.status === 'paid');

    return (
        <div className="min-h-screen bg-slate-50 p-8 print:p-0 print:bg-white">
            {/* Toolbar (Hidden in Print) */}
            <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center print:hidden">
                <h1 className="text-2xl font-bold text-slate-800">Fee Receipt</h1>
                <Button onClick={handlePrint}>
                    <Printer size={18} className="mr-2" />
                    Print Receipt
                </Button>
            </div>

            {/* Receipt Container */}
            <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl p-10 print:shadow-none print:p-0 card-receipt">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-8 mb-8">
                    <div>
                        {institute?.branding?.logo ? (
                            <img src={institute.branding.logo} alt={institute.name} className="h-16 mb-4 object-contain" />
                        ) : (
                            <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center mb-4 text-slate-400 font-bold text-xs">
                                NO LOGO
                            </div>
                        )}
                        <h2 className="text-2xl font-black text-slate-900">{institute?.name}</h2>
                        <div className="text-sm text-slate-500 mt-2 space-y-1">
                            {institute?.address?.street && <p>{institute.address.street}</p>}
                            <p>
                                {institute?.address?.city} {institute?.address?.state} {institute?.address?.pincode}
                            </p>
                            <p>{institute?.contactEmail}</p>
                            <p>{institute?.contactPhone}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h3 className="text-4xl font-black text-slate-800 uppercase tracking-widest mb-2">RECEIPT</h3>                        <p className="text-sm font-bold text-slate-500">Date: {format(new Date(), "PP")}</p>
                        <p className="text-sm text-slate-400">Ref: #{fee._id.toString().slice(-8).toUpperCase()}</p>
                    </div>
                </div>

                {/* Bill To */}
                <div className="grid grid-cols-2 gap-8 mb-12">
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Received From</h4>
                        <p className="text-lg font-bold text-slate-900">{student?.fullName}</p>
                        <p className="text-sm text-slate-500">{student?.email}</p>
                        <p className="text-sm text-slate-500">ID: {student?.enrollmentNumber || "N/A"}</p>
                    </div>
                    <div className="text-right">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">For Course</h4>
                        <p className="text-lg font-bold text-slate-900">{batch?.name}</p>
                        <p className="text-sm text-slate-500">{batch?.course?.name}</p>
                    </div>
                </div>

                {/* Payment History Table */}
                <div className="mb-12">
                    <h4 className="text-sm font-bold text-slate-900 mb-4 border-l-4 border-premium-blue pl-3">Payment History</h4>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left font-bold text-slate-500 py-3 pl-2">Date</th>
                                <th className="text-left font-bold text-slate-500 py-3">Mode</th>
                                <th className="text-left font-bold text-slate-500 py-3">Reference / Transaction ID</th>
                                <th className="text-right font-bold text-slate-500 py-3 pr-2">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paidInstallments.length > 0 ? paidInstallments.map((inst, i) => (
                                <tr key={i}>
                                    <td className="py-3 pl-2 text-slate-700">{inst.paidDate ? format(new Date(inst.paidDate), "MMM d, yyyy") : "-"}</td>
                                    <td className="py-3 text-slate-700 capitalize">{inst.paymentMethod || "Cash"}</td>
                                    <td className="py-3 text-slate-500 font-mono text-xs">{inst.transactionId || "-"}</td>
                                    <td className="py-3 pr-2 text-right font-bold text-slate-900">₹{inst.amount.toLocaleString()}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-slate-400 italic">No payments recorded yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end border-t border-slate-200 pt-8">
                    <div className="w-64 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 font-medium">Total Fee</span>
                            <span className="font-bold text-slate-900">₹{fee.totalAmount.toLocaleString()}</span>
                        </div>
                        {fee.discount?.amount > 0 && (
                            <div className="flex justify-between text-sm text-red-500">
                                <span className="font-medium">Discount</span>
                                <span className="font-bold">- ₹{fee.discount.amount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-base border-t border-slate-100 pt-3">
                            <span className="font-bold text-slate-700">Amount Paid</span>
                            <span className="font-bold text-emerald-600">₹{(fee.paidAmount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 font-medium">Balance</span>
                            <span className="font-bold text-amber-500">₹{((fee.totalAmount - (fee.discount?.amount || 0)) - (fee.paidAmount || 0)).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-16 pt-8 border-t border-slate-100 text-center text-sm text-slate-400">
                    <p>This is a computer-generated receipt and does not require a physical signature.</p>
                    <p className="mt-1 font-bold">{institute?.name}</p>
                </div>
            </div>
        </div>
    );
}
