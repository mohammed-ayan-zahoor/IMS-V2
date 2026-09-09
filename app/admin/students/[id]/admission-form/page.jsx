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
    const isCollege = institute?.type === 'COLLEGE';

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

            <div className="admission-form-container min-h-screen bg-gray-100 p-4 sm:p-8 no-print">
                <div className="max-w-[210mm] mx-auto bg-white shadow-2xl overflow-hidden">
                    {isCollege ? <CollegeAdmissionFormView data={data} /> : <AdmissionFormView data={data} />}
                </div>
            </div>

            <div className="only-print hidden print:block print:m-0 print:p-0">
                {isCollege ? <CollegeAdmissionFormView data={data} /> : <AdmissionFormView data={data} />}
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
                    .admission-form-view, .college-form-view {
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

                .college-form-view {
                    width: 210mm;
                    height: 297mm;
                    padding: 9mm 12mm;
                    font-family: "Inter", "Segoe UI", Roboto, sans-serif;
                    font-size: 9.5px;
                    line-height: 1.35;
                    color: #0f172a;
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

                .college-section-title {
                    font-size: 9px;
                    font-weight: 800;
                    text-transform: uppercase;
                    border-bottom: 1.5px solid #0f172a;
                    padding-bottom: 2px;
                    margin-top: 8px;
                    margin-bottom: 5px;
                    letter-spacing: 0.4px;
                    color: #0f172a;
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

                .college-field {
                    display: flex;
                    align-items: baseline;
                    border-bottom: 0.5px solid #f1f5f9;
                    padding-bottom: 1.5px;
                    min-width: 0;
                    overflow: hidden;
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

                .college-label {
                    font-weight: 600;
                    width: 120px;
                    color: #64748b;
                    flex-shrink: 0;
                    font-size: 8.5px;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }

                .value {
                    flex: 1;
                    color: #000;
                    font-weight: 500;
                }

                .college-value {
                    flex: 1;
                    color: #0f172a;
                    font-weight: 600;
                    font-size: 9.5px;
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
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

function CollegeAdmissionFormView({ data }) {
    const { student, batches, fees, institute } = data;
    const batch = batches?.[0];
    const course = batch?.course;
    const fee = fees?.[0];

    const formatAddr = (addr) => {
        if (!addr) return "N/A";
        if (typeof addr === 'string') return addr;
        return [
            addr.street || addr.line1,
            addr.city || addr.district,
            addr.state,
            addr.pincode || addr.postalCode
        ].filter(Boolean).join(', ') || "N/A";
    };

    const formatDateSafe = (dateVal, fallback = "—") => {
        if (!dateVal) return fallback;
        try {
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return fallback;
            return format(d, 'dd-MM-yyyy');
        } catch {
            return fallback;
        }
    };

    const formatAadhaar = (val) => {
        if (!val) return "—";
        if (typeof val === 'string' && val.startsWith('enc:')) return "—";
        const digits = String(val).replace(/\D/g, '');
        if (digits.length === 12) {
            return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
        }
        return val;
    };

    const formatQuota = (admissionStd, studyingSince) => {
        if (studyingSince && !/^[a-f\d]{24}$/i.test(studyingSince)) return studyingSince;
        if (!admissionStd || /^[a-f\d]{24}$/i.test(admissionStd)) {
            return "Regular / Merit (First Year)";
        }
        return admissionStd;
    };

    const programName = course?.name || student?.admissionStd || "Degree Program";
    const courseCode = course?.code || "—";
    const departmentName = course?.department?.name || (course?.name ? `${course.name} Department` : "Academic Department");
    const currentSem = Number(batch?.semester) || 1;

    let totalSemesters = Number(course?.collegeConfig?.totalSemesters);
    if (!totalSemesters) {
        const lowerName = String(programName).toLowerCase();
        if (lowerName.includes("b.tech") || lowerName.includes("btech") || lowerName.includes("b.e.") || lowerName.includes("engineering") || lowerName.includes("b.pharm")) {
            totalSemesters = 8;
        } else if (lowerName.includes("m.") || lowerName.includes("mba") || lowerName.includes("mca")) {
            totalSemesters = 4;
        } else if (course?.duration?.value) {
            const months = course.duration.unit === 'years' ? course.duration.value * 12 : course.duration.value;
            totalSemesters = Math.round(months / 6) || 8;
        } else {
            totalSemesters = 8;
        }
    }
    const totalYears = Math.ceil(totalSemesters / 2);
    const sessionName = batch?.session?.sessionName || "2026-2027";

    const rawBatchName = batch?.name || "";
    const secMatch = rawBatchName.match(/\((Sec(?:tion)?\s*[A-Z0-9]+)\)/i) || rawBatchName.match(/Sec(?:tion)?\s*[A-Z0-9]+/i);
    const sectionDisplay = secMatch ? (secMatch[1] || secMatch[0]) : (rawBatchName ? (rawBatchName.length > 15 ? "Section A" : rawBatchName) : "Section A");

    const admissionDate = formatDateSafe(batch?.enrollment?.enrolledAt || student.admissionDate, formatDateSafe(new Date()));

    const fatherInfo = student.fatherName 
        ? `${student.fatherName}${student.fatherPhone ? ` (${student.fatherPhone})` : ''}` 
        : null;
    const motherInfo = student.motherName 
        ? `${student.motherName}${student.motherPhone ? ` (${student.motherPhone})` : ''}` 
        : null;
    const guardianInfo = student.guardianName 
        ? `${student.guardianName}${student.guardianRelation ? ` [${student.guardianRelation}]` : ''}${student.guardianPhone ? ` - ${student.guardianPhone}` : ''}`
        : null;

    return (
        <div className="college-form-view mx-auto">
            <div className="watermark">OFFICIAL ENROLLMENT</div>

            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2.5 mb-2">
                <div className="flex-1 pr-4">
                    {institute?.logo && (
                        <img src={institute.logo} alt="Logo" className="h-9 mb-1 object-contain" />
                    )}
                    <h1 className="text-base font-black uppercase tracking-tight text-slate-900 leading-tight">
                        {institute?.name || "College of Higher Education"}
                    </h1>
                    {institute?.affiliation && (
                        <p className="text-[8.5px] font-semibold text-slate-600 uppercase tracking-wide">
                            {institute.affiliation}
                        </p>
                    )}
                    <div className="text-[9px] leading-tight text-slate-600 mt-1">
                        <p>{formatAddr(institute?.address)}</p>
                        <p className="mt-0.5">Phone: {institute?.phone || "N/A"} | Email: {institute?.email || "N/A"}</p>
                    </div>
                </div>

                <div className="flex items-start gap-3">
                    <div className="text-right">
                        <div className="inline-block p-1 border border-slate-900 mb-1 bg-white">
                            <p className="font-[Libre Barcode 128] text-2xl leading-none">*{student.enrollmentNumber || student._id}*</p>
                        </div>
                        <p className="font-bold text-[8px] uppercase tracking-widest text-slate-500">Degree Enrollment</p>
                        <p className="font-mono text-[9px] font-bold bg-slate-900 text-white px-2 py-0.5 inline-block">
                            {student.enrollmentNumber || "PENDING"}
                        </p>
                    </div>
                    <div className="w-[22mm] h-[26mm] border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
                        {student.avatar ? (
                            <img src={student.avatar} alt="Photo" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-[8px] text-slate-400 font-semibold text-center px-1 uppercase tracking-wider">Passport Photo</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Title Banner */}
            <div className="text-center py-1 px-3 bg-slate-100 border-y border-slate-300 mb-2">
                <h2 className="text-[10.5px] font-black tracking-[0.2em] uppercase text-slate-900">
                    COLLEGE ADMISSION & DEGREE ENROLLMENT FORM
                </h2>
                <p className="text-[8px] font-semibold text-slate-600 uppercase tracking-widest mt-0.5">
                    Academic Session: {sessionName} · National Education Policy (NEP) Compliant
                </p>
            </div>

            {/* 1. Academic & Degree Program Details */}
            <h3 className="college-section-title">
                <span>1. Degree Program & Academic Enrollment</span>
                <span className="text-[7.5px] font-normal text-slate-500 normal-case">University Mapped</span>
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[9px] mb-1.5">
                <div className="college-field col-span-2">
                    <span className="college-label">Degree / Program</span>
                    <span className="college-value text-blue-950 font-bold uppercase">{programName}</span>
                </div>
                <div className="college-field">
                    <span className="college-label">Department</span>
                    <span className="college-value">{departmentName}</span>
                </div>
                <div className="college-field">
                    <span className="college-label">Program Code</span>
                    <span className="college-value font-mono">{courseCode}</span>
                </div>
                <div className="college-field">
                    <span className="college-label">Current Semester</span>
                    <span className="college-value font-bold">Semester {currentSem} ({sectionDisplay})</span>
                </div>
                <div className="college-field">
                    <span className="college-label">Program Duration</span>
                    <span className="college-value">{totalYears} Years ({totalSemesters} Semesters)</span>
                </div>
                <div className="college-field">
                    <span className="college-label">UUCMS / Univ Reg No</span>
                    <span className="college-value font-mono font-bold text-slate-900">{student.grNumber || "Pending University Allotment"}</span>
                </div>
                <div className="college-field">
                    <span className="college-label">APAAR / ABC ID</span>
                    <span className="college-value font-mono">{student.apaarId || "—"}</span>
                </div>
            </div>

            {/* 2. Student Personal Particulars */}
            <h3 className="college-section-title">2. Candidate Personal Particulars</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[9px] mb-1.5">
                <div className="college-field col-span-2">
                    <span className="college-label">Candidate Name</span>
                    <span className="college-value font-black uppercase tracking-wide text-slate-900">
                        {student.firstName} {student.lastName}
                    </span>
                </div>
                <div className="college-field">
                    <span className="college-label">Date of Birth</span>
                    <span className="college-value">{formatDateSafe(student.dateOfBirth)}</span>
                </div>
                <div className="college-field">
                    <span className="college-label">Gender / Blood Group</span>
                    <span className="college-value">{student.gender || "—"} {student.bloodGroup ? `· Blood: ${student.bloodGroup}` : ''}</span>
                </div>
                <div className="college-field">
                    <span className="college-label">Mobile Number</span>
                    <span className="college-value font-medium">{student.phone || "—"}</span>
                </div>
                <div className="college-field">
                    <span className="college-label">Email Address</span>
                    <span className="college-value lowercase">{student.email || "—"}</span>
                </div>
                <div className="college-field">
                    <span className="college-label">Aadhaar Number</span>
                    <span className="college-value font-mono">{formatAadhaar(student.aadharNumber)}</span>
                </div>
                <div className="college-field">
                    <span className="college-label">Admission Date</span>
                    <span className="college-value">{admissionDate}</span>
                </div>
                <div className="college-field col-span-2">
                    <span className="college-label">Permanent Address</span>
                    <span className="college-value whitespace-normal break-words">{formatAddr(student.address)}</span>
                </div>
            </div>

            {/* 3. Qualifying Academic Background & Parents */}
            <h3 className="college-section-title">3. Qualifying Examination & Parent Information</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[9px] mb-1.5">
                <div className="college-field col-span-2">
                    <span className="college-label">Prior Qualification</span>
                    <span className="college-value font-semibold whitespace-normal break-words">
                        {student.lastSchoolAttended ? `${student.lastSchoolAttended} (10+2 / PUC / Diploma)` : "10+2 / PUC Equivalent Examination"}
                    </span>
                </div>
                <div className="college-field">
                    <span className="college-label">Medium of Instruction</span>
                    <span className="college-value">{student.medium || "English"}</span>
                </div>
                <div className="college-field">
                    <span className="college-label">Admission Quota / Std</span>
                    <span className="college-value">{formatQuota(student.admissionStd, student.studyingSinceStandard)}</span>
                </div>
                <div className="college-field">
                    <span className="college-label">Father&apos;s Name & Contact</span>
                    <span className="college-value">{fatherInfo || "—"}</span>
                </div>
                <div className="college-field">
                    <span className="college-label">Mother&apos;s Name & Contact</span>
                    <span className="college-value">{motherInfo || "—"}</span>
                </div>
                {(!fatherInfo && !motherInfo && guardianInfo) && (
                    <div className="college-field col-span-2">
                        <span className="college-label">Guardian Particulars</span>
                        <span className="college-value">{guardianInfo}</span>
                    </div>
                )}
                <div className="college-field">
                    <span className="college-label">Category / Caste</span>
                    <span className="college-value">
                        {student.caste ? (student.subCaste ? `${student.caste} (${student.subCaste})` : student.caste) : "General / Unreserved"}
                    </span>
                </div>
                <div className="college-field">
                    <span className="college-label">Nationality & Religion</span>
                    <span className="college-value">{student.nationality || "Indian"} · {student.religion || "—"}</span>
                </div>
            </div>

            {/* 4. Collegiate Undertaking & Declaration */}
            <div className="mt-2">
                <h3 className="college-section-title">4. Undertaking & Declaration by Student & Parent</h3>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                    <ol className="list-decimal list-inside space-y-1 text-[8px] text-slate-700 leading-relaxed">
                        <li>I hereby declare that all particulars stated in this application are true and complete to the best of my knowledge. If any information is found incorrect, my admission stands cancelled.</li>
                        <li>Admission is provisional and subject to verification of original 10+2 / PUC / Diploma certificates and formal approval from the affiliating University.</li>
                        <li>I agree to abide by the university statutes, collegiate code of conduct, and UGC Anti-Ragging regulations.</li>
                        <li>I understand that a minimum of 75% attendance in theory and practical coursework in each semester is mandatory to be eligible for semester end examinations.</li>
                    </ol>
                </div>
            </div>

            {/* 5. Signatures */}
            <div className="flex justify-between items-end mt-8 mb-3 px-4">
                <div className="text-center">
                    <div className="signature-line mx-auto"></div>
                    <p className="font-bold uppercase text-[8px] text-slate-900">Candidate / Student</p>
                    <p className="text-[7px] text-slate-500 mt-0.5">Date: ______________</p>
                </div>
                <div className="text-center">
                    <div className="signature-line mx-auto"></div>
                    <p className="font-bold uppercase text-[8px] text-slate-900">Parent / Guardian</p>
                    <p className="text-[7px] text-slate-500 mt-0.5">Date: ______________</p>
                </div>
                <div className="text-center">
                    <div className="signature-line mx-auto"></div>
                    <p className="font-bold uppercase text-[8px] text-slate-900">Dean / Principal / Authorized Seal</p>
                    <p className="text-[7px] text-slate-500 mt-0.5">Date: ______________</p>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-2 left-0 right-0 px-10 flex justify-between items-center text-[7px] text-slate-400 border-t border-slate-200 pt-1">
                <p>System Generated Document | Ref: {student._id}</p>
                <p>Generated: {format(new Date(), 'dd-MM-yyyy HH:mm:ss')}</p>
            </div>
        </div>
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
        
        return [
            addr.street || addr.line1,
            addr.city || addr.district,
            addr.state,
            addr.pincode || addr.postalCode
        ].filter(Boolean).join(', ') || "N/A";
    };

    const totalAmount = Number(fee?.totalAmount) || 0;
    const discount = Number(fee?.discount?.amount || fee?.discount) || 0;
    const extraCharges = Number(fee?.extraCharges?.amount || 0) || 0;
    const netAmount = totalAmount - discount + extraCharges;

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
                        {student.avatar ? (
                            <img src={student.avatar} alt="Photo" className="w-full h-full object-cover" />
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
                <div className="field col-span-2"><span className="label">Student Name</span><span className="value font-bold uppercase">{student.firstName} {student.lastName}</span></div>
                <div className="field"><span className="label">Date of Birth</span><span className="value">{student.dateOfBirth ? format(new Date(student.dateOfBirth), 'dd-MM-yyyy') : "N/A"}</span></div>
                <div className="field"><span className="label">Gender</span><span className="value">{student.gender || "N/A"}</span></div>
                <div className="field"><span className="label">Mobile No.</span><span className="value">{student.phone || "N/A"}</span></div>
                <div className="field"><span className="label">Email</span><span className="value">{student.email || "N/A"}</span></div>
                <div className="field col-span-2">
                    <span className="label">Address</span>
                    <span className="value">{formatAddr(student.address)}</span>
                </div>
            </div>

            {/* Parent/Guardian Details */}
            <h3 className="section-title">Parent / Guardian Details</h3>
            <div className="data-grid">
                <div className="field col-span-2"><span className="label">Guardian Name</span><span className="value font-semibold uppercase">{student.guardianName || "N/A"}</span></div>
                <div className="field"><span className="label">Relation</span><span className="value uppercase">{student.guardianRelation || "N/A"}</span></div>
                <div className="field"><span className="label">Contact Number</span><span className="value">{student.guardianPhone || "N/A"}</span></div>
            </div>

            {/* Demographic Details */}
            <h3 className="section-title">Demographics & Origins</h3>
            <div className="data-grid">
                <div className="field"><span className="label">Mother Tongue</span><span className="value uppercase">{student.motherTongue || "Not Provided"}</span></div>
                <div className="field"><span className="label">Religion</span><span className="value uppercase">{student.religion || "Not Provided"}</span></div>
                <div className="field"><span className="label">Caste</span><span className="value uppercase">{student.caste || "Not Provided"}</span></div>
                <div className="field"><span className="label">Sub-Caste</span><span className="value uppercase">{student.subCaste || "Not Provided"}</span></div>
                <div className="field col-span-2"><span className="label">Referred By</span><span className="value uppercase">{student.referredBy || "Self / Not Provided"}</span></div>
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
                         <div className="field"><span className="label">Duration</span><span className="value uppercase">{batch.course?.duration?.value} {batch.course?.duration?.unit || "Months"}</span></div>
                         <div className="field"><span className="label">Course Fee</span><span className="value font-bold">₹{totalAmount.toLocaleString()}</span></div>
                         {(discount > 0 || extraCharges > 0) && (
                             <>
                                 {discount > 0 && (
                                     <div className="field"><span className="label">Discount</span><span className="value font-bold text-red-600">- ₹{discount.toLocaleString()}</span></div>
                                 )}
                                 {extraCharges > 0 && (
                                     <div className="field"><span className="label">Extra Charges</span><span className="value font-bold text-orange-600">+ ₹{extraCharges.toLocaleString()}</span></div>
                                 )}
                                 <div className="field"><span className="label">Net Amount Due</span><span className="value font-bold text-emerald-600">₹{netAmount.toLocaleString()}</span></div>
                             </>
                         )}
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