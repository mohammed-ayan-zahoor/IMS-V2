"use client";

import { useRef } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { 
    Printer, 
    CheckCircle2, 
    Clock, 
    Calendar, 
    ShieldCheck, 
    AlertTriangle, 
    Building2, 
    QrCode, 
    User, 
    ArrowRight 
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function GatePassModal({ pass, isOpen, onClose }) {
    const printRef = useRef(null);

    if (!pass) return null;

    const handlePrint = () => {
        window.print();
    };

    const isApproved = pass.status === "APPROVED" || pass.status === "DEPARTED" || pass.status === "COMPLETED";
    const dateFormatted = pass.requestDate ? format(new Date(pass.requestDate), "dd MMMM yyyy") : format(new Date(), "dd MMMM yyyy");
    const approvedAtFormatted = pass.approvedAt ? format(new Date(pass.approvedAt), "dd MMM yyyy, hh:mm a") : null;

    const categoryLabels = {
        personal_errand: "Personal Errand",
        sick_medical: "Medical / Sick Leave",
        official_duty: "Official Duty",
        emergency: "Emergency Departure",
        parent_pickup: "Parent Pickup",
        other: "Other"
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Gate Out-Pass #${pass.passNumber}`}
            className="max-w-xl"
        >
            <div className="space-y-4">
                {/* Printable Gate Pass Container */}
                <div
                    ref={printRef}
                    id="printable-gate-pass"
                    className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-sm relative overflow-hidden print:m-0 print:border-2 print:border-black print:shadow-none print:w-full"
                >
                    {/* Security Watermark for print */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none font-black text-8xl rotate-[-30deg]">
                        AUTHORIZED PASS
                    </div>

                    {/* Header */}
                    <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-md">
                                <Building2 size={24} />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Official Security Exit Permit</span>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mt-0.5">GATE OUT-PASS</h3>
                                <p className="text-xs font-mono font-bold text-indigo-600 mt-1">{pass.passNumber}</p>
                            </div>
                        </div>

                        {/* QR Code Mockup */}
                        <div className="text-center">
                            <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center p-1.5 shadow-inner">
                                <QrCode size={52} className="text-slate-800" />
                            </div>
                            <span className="text-[9px] font-mono text-slate-400 font-bold block mt-0.5">SCAN AT GATE</span>
                        </div>
                    </div>

                    {/* Status Ribbon */}
                    <div className={cn(
                        "my-4 py-2 px-4 rounded-xl flex items-center justify-between text-xs font-black uppercase tracking-wider",
                        pass.status === 'APPROVED' ? "bg-emerald-100 text-emerald-900 border border-emerald-300" :
                        pass.status === 'DEPARTED' ? "bg-blue-100 text-blue-900 border border-blue-300" :
                        pass.status === 'COMPLETED' ? "bg-purple-100 text-purple-900 border border-purple-300" :
                        pass.status === 'REJECTED' ? "bg-rose-100 text-rose-900 border border-rose-300" :
                        "bg-amber-100 text-amber-900 border border-amber-300"
                    )}>
                        <span className="flex items-center gap-2">
                            {isApproved ? <CheckCircle2 size={16} className="text-emerald-700" /> : <AlertTriangle size={16} />}
                            {pass.status === 'APPROVED' ? 'AUTHORIZED TO EXIT — VALID OUT-PASS' :
                             pass.status === 'DEPARTED' ? 'CURRENTLY OUTSIDE (EXIT RECORDED)' :
                             pass.status === 'COMPLETED' ? 'RETURNED & PASS COMPLETED' :
                             pass.status === 'REJECTED' ? 'PERMISSION REJECTED — DO NOT ALLOW EXIT' :
                             'PENDING APPROVAL — NOT VALID FOR EXIT'}
                        </span>
                        <span className="font-mono text-[11px]">{pass.durationHours || "Short Leave"}</span>
                    </div>

                    {/* Recipient Details Card */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 gap-4">
                        <div className="col-span-2 flex items-center gap-3 pb-3 border-b border-slate-200/80">
                            <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-base uppercase border border-slate-300">
                                {pass.recipientName?.[0] || "U"}
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {pass.recipientType === 'student' ? 'Student' : 'Staff / Instructor'}
                                </span>
                                <h4 className="text-base font-bold text-slate-900 leading-snug">{pass.recipientName}</h4>
                                <p className="text-xs text-slate-500 font-medium">
                                    {pass.recipientDetails?.designation || pass.recipientDetails?.classOrBatch || pass.recipientDetails?.role || "Staff Member"}
                                    {pass.recipientDetails?.enrollmentNumber && ` • No: ${pass.recipientDetails.enrollmentNumber}`}
                                </p>
                            </div>
                        </div>

                        {/* Timings */}
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Departure Time</span>
                            <div className="flex items-center gap-1.5 text-sm font-black text-slate-800">
                                <Clock size={14} className="text-rose-500" />
                                {pass.departureTime}
                            </div>
                        </div>

                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Expected Return</span>
                            <div className="flex items-center gap-1.5 text-sm font-black text-slate-800">
                                <Clock size={14} className="text-emerald-600" />
                                {pass.expectedReturnTime}
                            </div>
                        </div>

                        {/* Date and Category */}
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Permission Date</span>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                <Calendar size={13} className="text-slate-400" />
                                {dateFormatted}
                            </div>
                        </div>

                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Category</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {categoryLabels[pass.category] || pass.category}
                            </span>
                        </div>

                        {/* Stated Reason */}
                        <div className="col-span-2 pt-2 border-t border-slate-200/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Reason for Departure</span>
                            <p className="text-xs text-slate-700 font-medium italic bg-white p-2.5 rounded-lg border border-slate-200">
                                &ldquo;{pass.reason}&rdquo;
                            </p>
                        </div>
                    </div>

                    {/* Authorization Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600">
                        <div>
                            {pass.approvedBy ? (
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-emerald-600" />
                                    <div>
                                        <p className="font-bold text-slate-800">
                                            Authorized by {pass.approvedBy.profile?.firstName || pass.approvedBy.email || "Admin/HOD"}
                                        </p>
                                        {approvedAtFormatted && (
                                            <p className="text-[10px] text-slate-400">{approvedAtFormatted}</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-amber-600 font-semibold flex items-center gap-1.5">
                                    <Clock size={14} /> Awaiting Administrator Authorization
                                </p>
                            )}
                            {pass.adminComment && (
                                <p className="text-[11px] text-slate-500 mt-1">Note: {pass.adminComment}</p>
                            )}
                        </div>

                        <div className="text-right sm:self-end">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Security Guard / Watchman</span>
                            <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                Verify & Allow Exit
                            </span>
                        </div>
                    </div>

                    {/* Security Notice */}
                    <div className="mt-3 text-[10px] text-slate-400 text-center font-medium">
                        Notice: This pass is valid only for the specified person and duration. Hand over or show this pass to security at the gate before exiting the campus premises.
                    </div>
                </div>

                {/* Modal Action Controls (Hidden when printing) */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 print:hidden">
                    <p className="text-xs text-slate-500 font-medium">
                        {isApproved ? "Present this pass on your phone or print a physical copy for the security guard." : "This request must be approved by the admin before gate exit."}
                    </p>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Close
                        </Button>
                        {isApproved && (
                            <Button type="button" variant="primary" onClick={handlePrint}>
                                <Printer size={15} className="mr-1.5" /> Print Gate Pass
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Print Styling */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-gate-pass, #printable-gate-pass * {
                        visibility: visible;
                    }
                    #printable-gate-pass {
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 24px;
                    }
                }
            `}</style>
        </Modal>
    );
}
