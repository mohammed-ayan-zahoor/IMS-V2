import { connectDB } from "@/lib/mongodb";
import OfflineExamResult from "@/models/OfflineExamResult";
import "@/models/OfflineExam";
import "@/models/Institute";
import "@/models/User";
import "@/models/Session";
import "@/models/Course";
import "@/models/Batch";
import "@/models/Subject";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
    const { resultId } = await params;
    return {
        title: `Official Verification — Marksheet ${resultId?.slice(-8).toUpperCase()}`,
        description: "Official academic document verification registry."
    };
}

export default async function MarksheetVerificationPage({ params }) {
    const { resultId } = await params;
    await connectDB();

    let result = null;
    try {
        result = await OfflineExamResult.findById(resultId)
            .populate({
                path: 'exam',
                populate: [
                    { path: 'course', select: 'name code' },
                    { path: 'session', select: 'sessionName' },
                    { path: 'subjects.subject', select: 'name code' },
                    { path: 'institute' }
                ]
            })
            .populate('student')
            .populate('batch', 'name')
            .populate('marks.subject', 'name code');
    } catch (e) {
        result = null;
    }

    if (!result) {
        return (
            <main className="min-h-screen bg-[#f8fafc] flex flex-col justify-between font-sans text-[#0f172a]">
                <header className="border-b border-[#e2e8f0] py-4 px-6 sm:px-12 bg-[#f8fafc]">
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-sm text-[#64748b] hover:text-[#0f172a] transition font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Return to Portal
                        </Link>
                        <div className="text-xs font-mono uppercase tracking-wider text-[#64748b]">
                            Registry Verification
                        </div>
                    </div>
                </header>

                <div className="py-20 px-6 text-center max-w-lg mx-auto space-y-4">
                    <div className="font-mono text-xs uppercase tracking-widest text-[#dc2626] font-bold">
                        VERIFICATION FAILED
                    </div>
                    <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#0f172a]">
                        Record Not Found
                    </h1>
                    <p className="text-sm text-[#64748b] leading-relaxed">
                        No authentic statement of marks matches Document Reference <code className="font-mono font-bold text-[#0f172a]">DOC-MS-{resultId?.slice(-8).toUpperCase()}</code>. This link may be invalid, expired, or tampered with.
                    </p>
                </div>

                <footer className="border-t border-[#e2e8f0] bg-[#f8fafc] text-[#64748b] py-6 text-center text-xs">
                    <p>© {new Date().getFullYear()} Official Document Verification & Registry System.</p>
                </footer>
            </main>
        );
    }

    const exam = result.exam || {};
    const institute = exam.institute || {};
    const student = result.student || {};
    const batch = result.batch || {};
    const session = exam.session || {};
    const documentId = `DOC-MS-${result._id.toString().slice(-8).toUpperCase()}`;

    const pdfUrl = `/api/v1/public/results/marksheet/${result._id}/pdf`;
    const isPass = result.overallResult === 'pass';
    const homeUrl = institute.code ? `/website/${institute.code}/results` : `/website`;

    // Map subject metadata for maxMarks / passingMarks
    const subjectMap = new Map();
    if (Array.isArray(exam.subjects)) {
        exam.subjects.forEach(s => {
            const subId = String(s.subject?._id || s.subject);
            subjectMap.set(subId, {
                maxMarks: s.maxMarks,
                passingMarks: s.passingMarks
            });
        });
    }

    return (
        <main className="min-h-screen bg-[#f8fafc] flex flex-col justify-between font-sans text-[#0f172a]">
            <style>{`
                @keyframes stampSettle {
                    0% {
                        transform: scale(1.15) rotate(-14deg);
                        opacity: 0;
                    }
                    100% {
                        transform: scale(1) rotate(-8deg);
                        opacity: 1;
                    }
                }
                .animate-seal-stamp {
                    animation: stampSettle 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @media print {
                    .no-print { display: none !important; }
                    body, main { background: #ffffff !important; }
                    .marksheet-sheet {
                        border: 1.5px solid #0f172a !important;
                        box-shadow: none !important;
                    }
                }
            `}</style>

            {/* Top Navigation Bar */}
            <header className="no-print bg-[#f8fafc] border-b border-[#e2e8f0] sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
                    <Link
                        href={homeUrl}
                        className="inline-flex items-center gap-2 text-sm text-[#64748b] hover:text-[#0f172a] transition font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Results
                    </Link>

                    <div className="flex items-center gap-2 text-xs sm:text-sm text-[#0f766e] font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        Live Registry Verified
                    </div>
                </div>
            </header>

            {/* Document Body */}
            <div className="flex-1 py-8 sm:py-12 px-4 sm:px-8">
                <div className="max-w-5xl mx-auto space-y-6">
                    {/* Action Bar */}
                    <div className="no-print pb-4 flex flex-wrap items-center justify-between gap-4 border-b border-[#e2e8f0]">
                        <div className="text-xs sm:text-sm text-[#475569]">
                            Verified record for: <strong className="text-[#0f172a]">{student.profile?.firstName} {student.profile?.lastName}</strong> (<span className="font-mono font-bold">{student.enrollmentNumber}</span>)
                        </div>

                        <div className="flex items-center gap-3">
                            <a
                                href={pdfUrl}
                                download={`Marksheet_${(student.profile?.firstName || 'Student')}_${(exam.title || 'Exam').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`}
                                style={{ backgroundColor: '#0f766e', color: '#ffffff' }}
                                className="inline-flex items-center px-4 py-2 bg-[#0f766e] text-white text-xs sm:text-sm font-semibold hover:bg-[#0d5b4d] transition rounded-[5px] shadow-xs"
                            >
                                Download Official PDF (A4)
                            </a>
                            <span className="no-print inline-flex items-center px-3 py-1.5 border border-[#cbd5e1] bg-white text-[#0f172a] text-xs sm:text-sm font-medium rounded-[5px]">
                                Certified Record
                            </span>
                        </div>
                    </div>

                    {/* Single Sheet Official Marksheet Frame */}
                    <div className="marksheet-sheet relative overflow-hidden bg-white p-8 sm:p-12 border border-[#cbd5e1] rounded-[5px] shadow-sm space-y-8">
                        {/* Centered Watermark (Screen & Print) */}
                        <div
                            aria-hidden="true"
                            className="watermark-layer absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none"
                        >
                            {institute.branding?.logo ? (
                                <img
                                    src={institute.branding.logo}
                                    alt=""
                                    style={{
                                        opacity: 0.045,
                                        filter: 'grayscale(100%)',
                                        maxWidth: '360px',
                                        maxHeight: '360px',
                                        objectFit: 'contain'
                                    }}
                                />
                            ) : (
                                <div
                                    style={{
                                        opacity: 0.03,
                                        transform: 'rotate(-25deg)',
                                        userSelect: 'none',
                                        textAlign: 'center'
                                    }}
                                >
                                    <div className="font-serif text-5xl sm:text-7xl font-black uppercase tracking-wider text-[#0f172a]">
                                        {institute.name || 'INSTITUTION'}
                                    </div>
                                    <div className="font-mono text-sm sm:text-base font-bold tracking-widest text-[#0f172a] mt-2">
                                        OFFICIAL TRANSCRIPT
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative z-10 space-y-8">
                            {/* 1. Official Document Header */}
                            <div className="border-b-2 border-[#0f172a] pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                                <div className="space-y-1">
                                    <div className="font-mono text-xs uppercase tracking-widest text-[#0f766e] font-bold">
                                        OFFICIAL ACADEMIC TRANSCRIPT // REGISTRY RECORD
                                    </div>
                                    <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0f172a] tracking-tight">
                                        {institute.name}
                                    </h1>
                                    <div className="text-sm text-[#64748b] font-serif italic pt-0.5">
                                        Statement of Marks • {exam.title}
                                    </div>
                                </div>

                                <div className="sm:text-right font-mono text-xs space-y-1 text-[#475569]">
                                    <div className="text-xs uppercase tracking-wider text-[#94a3b8]">Academic Session</div>
                                    <div className="font-bold text-[#0f172a] text-base">{session.sessionName || 'Current Session'}</div>
                                    <div className="text-[11px] text-[#0f766e] font-semibold">● Authentic Entry Verified</div>
                                </div>
                            </div>

                        {/* 2. Candidate Bio-Data Strip */}
                        <div className="border-y border-[#0f172a] py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div className="border-r border-[#e2e8f0] pr-2">
                                <span className="font-mono uppercase text-[10px] text-[#64748b] block tracking-wider">Candidate Name</span>
                                <span className="font-bold text-sm text-[#0f172a] block mt-0.5">{student.profile?.firstName} {student.profile?.lastName}</span>
                            </div>
                            <div className="sm:border-r sm:border-[#e2e8f0] sm:pr-2">
                                <span className="font-mono uppercase text-[10px] text-[#64748b] block tracking-wider">Enrollment No.</span>
                                <span className="font-mono font-bold text-sm text-[#0f172a] block mt-0.5">{student.enrollmentNumber}</span>
                            </div>
                            <div className="border-r border-[#e2e8f0] pr-2">
                                <span className="font-mono uppercase text-[10px] text-[#64748b] block tracking-wider">Course / Class</span>
                                <span className="font-bold text-sm text-[#0f172a] block mt-0.5">{exam.course?.name || 'General'}</span>
                            </div>
                            <div>
                                <span className="font-mono uppercase text-[10px] text-[#64748b] block tracking-wider">Batch / Section</span>
                                <span className="font-bold text-sm text-[#0f172a] block mt-0.5">{batch.name || 'Standard'}</span>
                            </div>
                        </div>

                        {/* 3. Subject Marks Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-[#0f172a] font-mono text-xs uppercase tracking-wider text-[#0f172a]">
                                        <th className="py-3 px-2 w-10 text-center text-[#64748b]">#</th>
                                        <th className="py-3 px-4 font-bold">Subject Details</th>
                                        <th className="py-3 px-3 text-center w-28 font-bold">Max Marks</th>
                                        <th className="py-3 px-3 text-center w-28 font-bold">Pass Marks</th>
                                        <th className="py-3 px-3 text-center w-32 font-bold">Marks Obtained</th>
                                        <th className="py-3 px-3 text-center w-24 font-bold">Result</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e2e8f0] font-mono text-[#0f172a]">
                                    {result.marks && result.marks.map((sub, sIdx) => {
                                        const subId = String(sub.subject?._id || sub.subject);
                                        const meta = subjectMap.get(subId) || {};
                                        const isSubPassed = meta.passingMarks != null && sub.obtainedMarks != null
                                            ? (sub.obtainedMarks + (sub.graceMarks || 0)) >= meta.passingMarks
                                            : true;

                                        return (
                                            <tr key={sIdx} className="hover:bg-[#f8fafc] transition-colors">
                                                <td className="py-3.5 px-2 text-center text-[#94a3b8] text-xs">
                                                    {sIdx + 1}
                                                </td>
                                                <td className="py-3.5 px-4 font-sans font-medium text-[#0f172a]">
                                                    {sub.subject?.name || 'Subject'}
                                                    {sub.subject?.code && (
                                                        <span className="font-mono text-xs text-[#64748b] ml-1.5 font-normal">
                                                            [{sub.subject.code}]
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-3 text-center text-sm tabular-nums">
                                                    {meta.maxMarks ?? '-'}
                                                </td>
                                                <td className="py-3.5 px-3 text-center text-sm text-[#64748b] tabular-nums">
                                                    {meta.passingMarks ?? '-'}
                                                </td>
                                                <td className="py-3.5 px-3 text-center text-base font-bold tabular-nums">
                                                    {sub.isAbsent ? (
                                                        <span className="text-[#dc2626] font-normal italic">Absent</span>
                                                    ) : (
                                                        <span>
                                                            {sub.obtainedMarks ?? 0}
                                                            {sub.graceMarks > 0 && (
                                                                <span className="text-[#0f766e] text-xs ml-1 font-normal">
                                                                    (+{sub.graceMarks})
                                                                </span>
                                                            )}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-3 text-center font-bold text-xs">
                                                    {sub.isAbsent ? (
                                                        <span className="text-[#dc2626]">AB</span>
                                                    ) : isSubPassed ? (
                                                        <span className="text-[#0f766e]">PASS</span>
                                                    ) : (
                                                        <span className="text-[#dc2626]">FAIL</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-[#0f172a] bg-[#f8fafc] font-mono font-bold text-[#0f172a]">
                                        <td colSpan={2} className="py-3.5 px-4 text-right uppercase tracking-wider font-sans text-xs">
                                            Aggregate Total:
                                        </td>
                                        <td className="py-3.5 px-3 text-center text-sm tabular-nums">
                                            {result.totalMaxMarks}
                                        </td>
                                        <td className="py-3.5 px-3 text-center text-sm text-[#64748b]">
                                            -
                                        </td>
                                        <td className="py-3.5 px-3 text-center text-base font-extrabold tabular-nums">
                                            {result.totalObtainedMarks}
                                        </td>
                                        <td className="py-3.5 px-3 text-center text-sm tabular-nums">
                                            {result.percentage ? `${result.percentage.toFixed(1)}%` : '-'}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* 4. Payoff Summary & Seal Stamp */}
                        <div className="border-t-2 border-[#0f766e] pt-6 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="grid grid-cols-3 gap-6 sm:gap-10 font-mono text-center md:text-left w-full md:w-auto">
                                <div>
                                    <span className="text-[10px] text-[#64748b] uppercase tracking-wider block">Percentage</span>
                                    <strong className="text-xl sm:text-2xl text-[#0f172a] tabular-nums font-bold block mt-0.5">
                                        {result.percentage ? `${result.percentage.toFixed(2)}%` : '-'}
                                    </strong>
                                </div>
                                <div>
                                    <span className="text-[10px] text-[#64748b] uppercase tracking-wider block">Overall Grade</span>
                                    <strong className="text-xl sm:text-2xl text-[#0f172a] font-bold block mt-0.5">
                                        {result.overallGrade || '-'}
                                    </strong>
                                </div>
                                <div>
                                    <span className="text-[10px] text-[#64748b] uppercase tracking-wider block">Batch Rank</span>
                                    <strong className="text-xl sm:text-2xl text-[#0f766e] font-bold block mt-0.5">
                                        {result.rank != null ? `#${result.rank}` : '-'}
                                    </strong>
                                </div>
                            </div>

                            {/* Seal Stamp */}
                            <div className="animate-seal-stamp select-none flex-shrink-0">
                                <div 
                                    className={`p-3 border-2 border-dashed rounded-full ${
                                        isPass ? 'border-[#0f766e] text-[#0f766e]' : 'border-[#dc2626] text-[#dc2626]'
                                    }`}
                                >
                                    <div 
                                        className={`w-28 h-28 border-2 rounded-full flex flex-col items-center justify-center text-center p-2 shadow-xs ${
                                            isPass ? 'border-[#0f766e] bg-[#f0fdfa]' : 'border-[#dc2626] bg-[#fef2f2]'
                                        }`}
                                    >
                                        <span className="text-[8px] font-mono tracking-[0.2em] uppercase font-bold">
                                            EXAM BOARD
                                        </span>
                                        <span className="text-xl font-serif font-black tracking-wider uppercase my-0.5">
                                            {isPass ? 'PASSED' : 'FAILED'}
                                        </span>
                                        <span className="text-[9px] font-mono font-bold opacity-80">
                                            {session.sessionName || '2025–26'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 5. Formal Signatures */}
                        <div className="pt-8 flex justify-between items-end text-xs font-mono text-[#475569] border-t border-[#e2e8f0]">
                            <div className="text-center">
                                <div className="w-36 border-b border-[#0f172a] mb-1.5"></div>
                                <span>Class In-charge</span>
                            </div>
                            <div className="text-center font-sans text-[11px] text-[#94a3b8] hidden sm:block">
                                Certified Examination Ledger Record • Issue Date: {new Date().toLocaleDateString('en-GB')}
                            </div>
                            <div className="text-center">
                                <div className="w-36 border-b border-[#0f172a] mb-1.5"></div>
                                <span>Controller of Examinations</span>
                            </div>
                        </div>

                            {/* 6. Document Reference Footer */}
                            <div className="no-print pt-4 border-t border-[#e2e8f0] flex items-center justify-between text-xs text-[#64748b]">
                                <span className="font-mono">
                                    Document Reference: <strong>{documentId}</strong>
                                </span>
                                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                    ● Official Database Certified
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="no-print border-t border-[#e2e8f0] bg-[#f8fafc] text-[#64748b] py-8 text-center text-xs sm:text-sm">
                <div className="max-w-5xl mx-auto px-4 sm:px-8 space-y-1">
                    <p>© {new Date().getFullYear()} {institute.name || 'Institution'}. Official Registry System.</p>
                </div>
            </footer>
        </main>
    );
}
