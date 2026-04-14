"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";

function AdmissionFormContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const studentId = params.id;
    const batchId = searchParams.get('batchId');

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!studentId) return;
        
        const fetchData = async () => {
            try {
                const url = `/api/v1/students/${studentId}/admission-form${batchId ? `?batchId=${batchId}` : ''}`;
                const res = await fetch(url);
                const json = await res.json();
                
                if (json.error) {
                    setError(json.error);
                } else {
                    setData(json);
                }
            } catch (err) {
                console.error("Failed to fetch data", err);
                setError("Failed to load data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [studentId, batchId]);

    const handlePrint = () => {
        window.print();
    };

    useEffect(() => {
        if (!data) return;
        
        // Check for overflow after render
        const checkOverflow = () => {
            const views = document.querySelectorAll('.admission-form-view');
            views.forEach(view => {
                if (view.scrollHeight > view.clientHeight + 10) { // small buffer
                    console.warn("Form content exceeds 1 page (A4 height)");
                    // We can show a toast or a subtle UI warning
                }
            });
        };
        
        const timer = setTimeout(checkOverflow, 1000);
        return () => clearTimeout(timer);
    }, [data]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Loading admission form...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
                <div className="text-center max-w-md">
                    <p className="text-red-600 font-medium mb-4">{error}</p>
                    <Button onClick={() => window.history.back()} variant="outline">
                        <ArrowLeft size={16} className="mr-2" /> Go Back
                    </Button>
                </div>
            </div>
        );
    }

    if (!data || !data.student) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
                <div className="text-center max-w-md">
                    <p className="text-gray-600 mb-4">No student data found</p>
                    <Button onClick={() => window.history.back()} variant="outline">
                        <ArrowLeft size={16} className="mr-2" /> Go Back
                    </Button>
                </div>
            </div>
        );
    }

    const { student, batches, fees, institute } = data;
    const batch = batches[0];
    const fee = fees[0];

    return (
        <>
            <div className="no-print fixed top-6 right-6 flex gap-3 z-50">
                <Button 
                    onClick={() => window.history.back()} 
                    variant="outline" 
                    className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm hover:bg-white"
                >
                    <ArrowLeft size={16} className="mr-2" /> Back
                </Button>
                <Button 
                    onClick={handlePrint} 
                    className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                >
                    <Printer size={16} className="mr-2" /> Print / Save PDF
                </Button>
            </div>

            <div className={`admission-form-container min-h-screen bg-gray-100 p-4 sm:p-8 no-print`}>
                <div className="max-w-[210mm] mx-auto bg-white shadow-2xl overflow-hidden print:shadow-none print:m-0">
                    <AdmissionFormView data={data} />
                </div>
            </div>

            <div className="only-print hidden print:block">
                <AdmissionFormView data={data} />
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+128&family=Inter:wght@400;500;600;700;800;900&display=swap');

                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        background: white;
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print { display: none !important; }
                    .only-print { display: block !important; }
                    .admission-form-view {
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                    }
                }

                .admission-form-view {
                    width: 210mm;
                    height: 297mm;
                    padding: 12mm;
                    font-family: "Inter", "Segoe UI", Roboto, sans-serif;
                    font-size: 11px;
                    line-height: 1.4;
                    color: #111;
                    background: white;
                    position: relative;
                    box-sizing: border-box;
                    overflow: hidden;
                }

                .watermark {
                    position: absolute;
                    top: 55%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-35deg);
                    font-size: 100px;
                    font-weight: 900;
                    color: rgba(0, 0, 0, 0.02);
                    pointer-events: none;
                    white-space: nowrap;
                    z-index: 0;
                    text-transform: uppercase;
                    letter-spacing: 10px;
                }

                .section-title {
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    border-bottom: 1.5px solid #000;
                    padding-bottom: 3px;
                    margin-bottom: 10px;
                    margin-top: 18px;
                    color: #000;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .data-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 6px 30px;
                    margin-bottom: 10px;
                }

                .field {
                    display: flex;
                    align-items: baseline;
                    border-bottom: 0.5px solid #f3f4f6;
                    padding-bottom: 2px;
                }

                .label {
                    font-weight: 600;
                    width: 110px;
                    color: #6b7280;
                    flex-shrink: 0;
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .value {
                    flex: 1;
                    color: #000;
                    font-weight: 500;
                }

                .signature-line {
                    border-bottom: 1px solid #000;
                    width: 140px;
                    margin-bottom: 6px;
                }
            `}</style>
        </>
    );
}

function AdmissionFormView({ data }) {
    const { student, batches, fees, institute } = data;
    const batch = batches?.[0];
    const fee = fees?.[0];

    // Helpers
    const formatAddr = (addr) => {
        if (!addr) return "N/A";
        if (typeof addr === 'string') return addr;
        return [addr.street, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ') || "N/A";
    };

    const totalAmount = Number(fee?.totalAmount) || 0;
    const discount = Number(fee?.discount) || 0;
    const netAmount = totalAmount - discount;

    return (
        <div className="admission-form-view mx-auto">
            <div className="watermark">OFFICIAL DOCUMENT</div>

            {/* Header */}
            <div className="flex justify-between items-start border-b border-black pb-4 mb-4">
                <div className="flex-1">
                    {institute?.logo && (
                        <img src={institute.logo} alt="Logo" className="h-12 mb-2" />
                    )}
                    <h1 className="text-xl font-bold uppercase tracking-tight">{institute?.name || "Institute Name"}</h1>
                    <div className="text-[10px] leading-relaxed text-gray-700 max-w-md">
                        <p>{formatAddr(institute?.address)}</p>
                        <p>Phone: {institute?.phone || "N/A"} | Email: {institute?.email || "N/A"}</p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className="w-24 h-28 border border-gray-400 flex items-center justify-center bg-gray-50 overflow-hidden">
                        {student.profile?.avatar ? (
                            <img src={student.profile.avatar} alt="Photo" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-[10px] text-gray-400 text-center px-1">PASSPORT PHOTO</span>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="inline-block p-1 border border-black mb-1">
                            <p className="font-[Libre Barcode 128] text-2xl leading-none">*{student.enrollmentNumber || student._id}*</p>
                        </div>
                        <p className="font-bold text-[9px] uppercase tracking-widest text-gray-500">Admission Form</p>
                        <p className="font-mono text-[10px] bg-black text-white px-2 py-0.5 inline-block">{student.enrollmentNumber || "PENDING"}</p>
                    </div>
                </div>
            </div>

            <div className="text-center mb-6">
                <h2 className="text-base font-black tracking-[0.2em] border-b border-black py-2">ADMISSION FORM</h2>
            </div>

            {/* Student Details */}
            <h3 className="section-title">Personal Details</h3>
            <div className="data-grid">
                <div className="field flex items-center"><span className="label">Enrollment No.</span><span className="value">{student.enrollmentNumber || "N/A"}</span></div>
                <div className="field"><span className="label">Date of Admission</span><span className="value">{batch?.enrollment?.enrolledAt ? format(new Date(batch.enrollment.enrolledAt), 'dd-MM-yyyy') : format(new Date(), 'dd-MM-yyyy')}</span></div>
                <div className="field col-span-2"><span className="label">Student Name</span><span className="value font-bold uppercase">{student.profile?.firstName} {student.profile?.lastName}</span></div>
                <div className="field"><span className="label">Date of Birth</span><span className="value">{student.profile?.dateOfBirth ? format(new Date(student.profile.dateOfBirth), 'dd-MM-yyyy') : "N/A"}</span></div>
                <div className="field"><span className="label">Gender</span><span className="value">{student.profile?.gender || "N/A"}</span></div>
                <div className="field"><span className="label">Mobile No.</span><span className="value">{student.profile?.phone || "N/A"}</span></div>
                <div className="field"><span className="label">Email</span><span className="value">{student.email || "N/A"}</span></div>
                <div className="field col-span-2">
                    <span className="label">Address</span>
                    <span className="value">{formatAddr(student.profile?.address)}</span>
                </div>
            </div>

            {/* Parent/Guardian Details */}
            <h3 className="section-title">Parent / Guardian Details</h3>
            <div className="data-grid">
                <div className="field col-span-2"><span className="label">Guardian Name</span><span className="value font-semibold uppercase">{student.guardianDetails?.name || "N/A"}</span></div>
                <div className="field"><span className="label">Relation</span><span className="value uppercase">{student.guardianDetails?.relation || "N/A"}</span></div>
                <div className="field"><span className="label">Contact Number</span><span className="value">{student.guardianDetails?.phone || "N/A"}</span></div>
            </div>

            {/* Course Details */}
            {batch && (
                <>
                    <h3 className="section-title">Enrolled Course</h3>
                    <div className="data-grid">
                        <div className="field"><span className="label">Course Name</span><span className="value">{batch.course?.name}</span></div>
                        <div className="field"><span className="label">Course Code</span><span className="value">{batch.course?.code || "N/A"}</span></div>
                        <div className="field"><span className="label">Batch Name</span><span className="value font-semibold">{batch.name}</span></div>
                        <div className="field"><span className="label">Start Date</span><span className="value">{batch.schedule?.startDate ? format(new Date(batch.schedule.startDate), 'dd-MM-yyyy') : "N/A"}</span></div>
                        <div className="field"><span className="label">Course Fee</span><span className="value font-bold">₹{totalAmount.toLocaleString()}</span></div>
                    </div>
                </>
            )}

            {/* Terms & Conditions */}
            <div className="mt-6">
                <h3 className="section-title">Declaration & Terms</h3>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                    <ol className="list-decimal list-inside space-y-1 text-[9px] text-gray-600 leading-tight">
                        <li>Admission is valid only upon payment of fees and submission of this signed form.</li>
                        <li>Parents must inform the institute of any change in contact details.</li>
                        <li>Attendance of minimum 75% is mandatory for all students.</li>
                        <li>Institute reserves the right to modify the schedule or syllabus if required.</li>
                        <li>Fees once paid is non-refundable except in exceptional cases.</li>
                        <li>Student must follow the code of conduct of the institute.</li>
                    </ol>
                </div>
            </div>

            {/* Signatures */}
            <div className="flex justify-between items-end mt-12 mb-8 px-4">
                <div className="text-center">
                    <div className="signature-line mx-auto"></div>
                    <p className="font-bold uppercase text-[9px]">Parent/Guardian</p>
                    <p className="text-[8px] text-gray-500">Date: ______________</p>
                </div>
                <div className="text-center">
                    <div className="signature-line mx-auto"></div>
                    <p className="font-bold uppercase text-[9px]">Student Signature</p>
                    <p className="text-[8px] text-gray-500">Date: ______________</p>
                </div>
                <div className="text-center">
                    <div className="signature-line mx-auto"></div>
                    <p className="font-bold uppercase text-[9px]">Authorized Seal</p>
                    <p className="text-[8px] text-gray-500">Date: ______________</p>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-4 left-0 right-0 px-10 flex justify-between items-center text-[8px] text-gray-400 border-t pt-2">
                <p>System Generated Document | Ref: {student._id}</p>
                <p>Document Timestamp: {format(new Date(), 'dd-MM-yyyy HH:mm:ss')}</p>
            </div>
        </div>
    );
}

export default function AdmissionFormPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
            </div>
        }>
            <AdmissionFormContent />
        </Suspense>
    );
}