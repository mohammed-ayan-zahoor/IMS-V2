"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

export default function CombinedMarksheetPrintPage() {
    const { id: batchId, studentId } = useParams();
    const searchParams = useSearchParams();
    const examsQuery = searchParams.get('exams');

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!examsQuery) {
            setError("No exams specified for marksheet.");
            setLoading(false);
            return;
        }

        const fetchCombinedData = async () => {
            try {
                const res = await fetch(`/api/v1/batches/${batchId}/students/${studentId}/marksheet?exams=${examsQuery}`);
                if (!res.ok) throw new Error("Failed to load marksheet data");
                const json = await res.json();
                setData(json);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCombinedData();
    }, [batchId, studentId, examsQuery]);

    useEffect(() => {
        if (!loading && data && !error) {
            // Slight delay to allow images/fonts to render
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [loading, data, error]);

    if (loading) return <LoadingSpinner fullPage />;
    if (error) return <div className="p-10 text-red-500 font-bold">{error}</div>;
    if (!data) return null;

    const { student, batch, instituteData, submissions } = data;

    // Calculate Totals
    let grandTotalMax = 0;
    let grandTotalObtained = 0;

    submissions.forEach(sub => {
        grandTotalMax += sub.exam?.totalMarks || 0;
        grandTotalObtained += sub.score || 0;
    });

    const finalPercentage = grandTotalMax > 0 ? (grandTotalObtained / grandTotalMax) * 100 : 0;
    const isPass = finalPercentage >= 35; // Assuming 35% is pass for combined

    return (
        <div className="bg-white min-h-screen text-slate-900 font-sans p-10 print:p-0 relative">
            <style dangerouslySetInnerHTML={{ __html: `
                @page { margin: 0.5cm; size: A4 portrait; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                @media print {
                    .no-print { display: none !important; }
                    .report-container { border: none !important; padding: 20px !important; }
                }
                .watermark {
                    position: absolute;
                    top: 55%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-30deg);
                    pointer-events: none;
                    z-index: 50;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
            `}} />

            <div className="report-container relative z-10 max-w-[800px] mx-auto border-[3px] border-slate-900 p-[30px] print:p-[20px] print:max-w-none min-h-[28cm]">
                
                {/* Watermark: Show Logo if exists, otherwise show Institute Name as text */}
                <div className="watermark opacity-[0.08] print:opacity-[0.12]">
                    {instituteData?.branding?.logo ? (
                        <img src={instituteData.branding.logo} className="w-[400px] filter grayscale" alt="Watermark" />
                    ) : (
                        <div className="text-[120px] font-black text-slate-900 whitespace-nowrap uppercase tracking-tighter">
                            {instituteData?.name || 'Quantech'}
                        </div>
                    )}
                </div>

                {/* Header */}
                <div className="flex items-center justify-center border-b-[3px] border-slate-900 pb-[20px] mb-[20px]">
                    {instituteData?.branding?.logo && (
                        <img src={instituteData.branding.logo} alt="Logo" className="max-h-[70px] max-w-[150px] mr-[30px]" />
                    )}
                    <div className="text-left">
                        <h1 className="text-[24px] font-black text-slate-900 m-0 uppercase tracking-wide">
                            {instituteData?.name || 'Institute Name'}
                        </h1>
                        <div className="text-[12px] text-slate-600 mt-1 font-medium">
                            {instituteData?.address?.street} {instituteData?.address?.city}
                        </div>
                    </div>
                </div>
                
                <div className="text-center text-[20px] font-black mb-[30px] text-slate-900 uppercase tracking-[2px] underline underline-offset-4">
                    STATEMENT OF MARKS
                </div>
                
                {/* Student Info */}
                <div className="grid grid-cols-2 gap-x-10 gap-y-3 mb-[30px]">
                    <div className="flex border-b border-dashed border-slate-300 pb-1">
                        <div className="text-[12px] uppercase text-slate-500 font-bold w-[120px]">Candidate</div>
                        <div className="text-[14px] font-bold text-slate-900">{student.fullName || '-'}</div>
                    </div>
                    <div className="flex border-b border-dashed border-slate-300 pb-1">
                        <div className="text-[12px] uppercase text-slate-500 font-bold w-[120px]">Batch</div>
                        <div className="text-[14px] font-bold text-slate-900">{batch.name || '-'}</div>
                    </div>
                    <div className="flex border-b border-dashed border-slate-300 pb-1">
                        <div className="text-[12px] uppercase text-slate-500 font-bold w-[120px]">Reg No.</div>
                        <div className="text-[14px] font-bold text-slate-900">{student.enrollmentNumber || '-'}</div>
                    </div>
                    <div className="flex border-b border-dashed border-slate-300 pb-1">
                        <div className="text-[12px] uppercase text-slate-500 font-bold w-[120px]">Course</div>
                        <div className="text-[14px] font-bold text-slate-900">{batch.course?.name || '-'}</div>
                    </div>
                </div>
                
                {/* Marks Table */}
                <table className="w-full border-collapse mb-[30px]">
                    <thead>
                        <tr>
                            <th className="border-[2px] border-slate-900 p-3 text-left bg-slate-50 font-black text-slate-900 uppercase text-[12px]">Subject / Assessment</th>
                            <th className="border-[2px] border-slate-900 p-3 text-center bg-slate-50 font-black text-slate-900 uppercase text-[12px] w-[140px]">Max Marks</th>
                            <th className="border-[2px] border-slate-900 p-3 text-center bg-slate-50 font-black text-slate-900 uppercase text-[12px] w-[140px]">Obtained</th>
                        </tr>
                    </thead>
                    <tbody>
                        {submissions.map(sub => (
                            <tr key={sub._id}>
                                <td className="border-[2px] border-slate-900 p-3 text-left font-bold text-[14px] uppercase">
                                    {sub.exam?.subject?.name || sub.exam?.title || 'Assessment'}
                                </td>
                                <td className="border-[2px] border-slate-900 p-3 text-center font-bold text-[16px]">
                                    {sub.exam?.totalMarks || 0}
                                </td>
                                <td className="border-[2px] border-slate-900 p-3 text-center font-bold text-[16px]">
                                    {sub.score || 0}
                                </td>
                            </tr>
                        ))}
                        <tr className="border-t-[3px] border-slate-900 bg-slate-50">
                            <td className="border-[2px] border-slate-900 p-3 text-right font-black text-[14px]">GRAND TOTAL</td>
                            <td className="border-[2px] border-slate-900 p-3 text-center font-black text-[16px]">{grandTotalMax}</td>
                            <td className="border-[2px] border-slate-900 p-3 text-center font-black text-[16px]">{grandTotalObtained}</td>
                        </tr>
                    </tbody>
                </table>
                
                {/* Result Summary */}
                <div className="flex justify-around border-[2px] border-slate-900 p-4 bg-slate-50 mb-[40px]">
                    <div className="text-center">
                        <div className="text-[11px] font-bold uppercase text-slate-500 mb-1">Percentage</div>
                        <div className="text-[22px] font-black text-slate-900">{finalPercentage.toFixed(2)}%</div>
                    </div>
                    <div className="text-center border-l-[2px] border-slate-200 pl-16">
                        <div className="text-[11px] font-bold uppercase text-slate-500 mb-1">Final Result</div>
                        <div className={`text-[22px] font-black ${isPass ? 'text-green-600' : 'text-red-600'}`}>
                            {isPass ? 'PASS' : 'FAIL'}
                        </div>
                    </div>
                </div>
                
                {/* Signatures */}
                <div className="flex justify-between mt-[60px] px-10">
                    <div className="w-[180px] border-t border-slate-900 text-center pt-2 font-bold text-[13px]">Candidate's Signature</div>
                    <div className="w-[180px] border-t border-slate-900 text-center pt-2 font-bold text-[13px]">Authorized Signatory</div>
                </div>
                
                <div className="absolute bottom-5 left-0 right-0 text-center text-[10px] text-slate-400">
                    This is a computer-generated document. Generated on {format(new Date(), "dd MMM yyyy, hh:mm a")}
                </div>

            </div>
        </div>
    );
}
