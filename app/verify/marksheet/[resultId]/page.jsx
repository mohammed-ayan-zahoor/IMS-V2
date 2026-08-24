import { connectDB } from "@/lib/mongodb";
import OfflineExamResult from "@/models/OfflineExamResult";
import "@/models/OfflineExam";
import "@/models/Institute";
import "@/models/User";
import "@/models/Session";
import "@/models/Course";
import "@/models/Batch";
import "@/models/Subject";
import { CheckCircle2, XCircle, ShieldCheck, Download, Award, Building, Calendar, User, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
    const { resultId } = await params;
    return {
        title: `Document Verification — Marksheet ${resultId.slice(-8).toUpperCase()}`,
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
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-200 p-8 text-center">
                    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-200">
                        <XCircle className="w-9 h-9" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">Verification Failed</h1>
                    <p className="text-sm text-slate-600 mt-2">
                        No authentic academic statement of marks was found matching Document ID <code className="font-mono font-bold text-red-600">MS-{resultId?.slice(-8).toUpperCase()}</code>.
                    </p>
                    <p className="text-xs text-slate-400 mt-4">
                        This QR code or verification link may be expired, invalid, or forged.
                    </p>
                </div>
            </div>
        );
    }

    const exam = result.exam || {};
    const institute = exam.institute || {};
    const student = result.student || {};
    const batch = result.batch || {};
    const session = exam.session || {};
    const documentId = `MS-${result._id.toString().slice(-8).toUpperCase()}`;

    const pdfUrl = `/api/v1/public/results/marksheet/${result._id}/pdf`;
    const htmlUrl = `/api/v1/public/results/marksheet/${result._id}/html`;

    const isPass = result.overallResult === 'pass';

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6">
            <div className="max-w-3xl w-full mx-auto space-y-6">
                {/* Official Verification Header Badge */}
                <div className="bg-emerald-600 text-white rounded-2xl p-6 sm:p-8 shadow-lg text-center relative overflow-hidden">
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm border border-white/30">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <span className="inline-block px-3 py-1 bg-white/20 text-white text-xs font-extrabold uppercase tracking-wider rounded-full mb-2">
                        Authentic Document Verified ✓
                    </span>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                        Statement of Marks Verification
                    </h1>
                    <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                        This digital record is certified by {institute.name || 'the institution'} and matches the official examination registry.
                    </p>
                </div>

                {/* Verified Metadata Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            {institute.branding?.logo ? (
                                <img src={institute.branding.logo} alt={institute.name} className="w-12 h-12 object-contain rounded-xl border border-slate-200 p-1" />
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                                    <Building className="w-5 h-5" />
                                </div>
                            )}
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 uppercase">{institute.name}</h2>
                                <p className="text-xs text-slate-500">Institution Code: {institute.code || 'INST'}</p>
                            </div>
                        </div>

                        <div className="text-right text-xs">
                            <span className="text-slate-400 block">Document ID</span>
                            <span className="font-mono font-bold text-slate-900 text-sm">{documentId}</span>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50/70 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-b border-slate-200">
                        <div>
                            <span className="text-slate-500 font-medium block">Candidate Name</span>
                            <span className="text-slate-900 font-bold text-sm block mt-0.5">
                                {student.profile?.firstName} {student.profile?.lastName}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-medium block">Enrollment Number</span>
                            <span className="text-slate-900 font-bold text-sm block mt-0.5 font-mono">
                                {student.enrollmentNumber}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-medium block">Course / Class</span>
                            <span className="text-slate-900 font-bold text-sm block mt-0.5">
                                {exam.course?.name || 'General'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-medium block">Examination</span>
                            <span className="text-slate-900 font-bold text-sm block mt-0.5">
                                {exam.title} ({session.sessionName})
                            </span>
                        </div>
                    </div>

                    {/* Marks Overview Table */}
                    <div className="p-6">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                            Verified Subject Marks
                        </h3>
                        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                            <table className="w-full text-left">
                                <thead className="bg-slate-100 text-slate-800 font-bold uppercase tracking-wider border-b border-slate-200">
                                    <tr>
                                        <th className="py-2.5 px-3.5">#</th>
                                        <th className="py-2.5 px-3.5">Subject</th>
                                        <th className="py-2.5 px-3.5 text-center">Marks Obtained</th>
                                        <th className="py-2.5 px-3.5 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {result.marks && result.marks.map((m, idx) => (
                                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                            <td className="py-2.5 px-3.5 text-slate-400 font-mono">{idx + 1}</td>
                                            <td className="py-2.5 px-3.5 font-bold text-slate-900">
                                                {m.subject?.name || 'Subject'}
                                            </td>
                                            <td className="py-2.5 px-3.5 text-center font-bold text-slate-900">
                                                {m.isAbsent ? 'Absent' : m.obtainedMarks}
                                            </td>
                                            <td className="py-2.5 px-3.5 text-center font-bold">
                                                {m.isAbsent ? (
                                                    <span className="text-red-600">AB</span>
                                                ) : (
                                                    <span className="text-emerald-700">PASS</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-100 font-bold text-slate-900 border-t border-slate-200">
                                        <td colSpan={2} className="py-2.5 px-3.5 text-right uppercase">
                                            Grand Total:
                                        </td>
                                        <td className="py-2.5 px-3.5 text-center text-blue-700 font-extrabold text-sm">
                                            {result.totalObtainedMarks} / {result.totalMaxMarks}
                                        </td>
                                        <td className="py-2.5 px-3.5 text-center font-extrabold text-slate-800">
                                            {result.percentage ? `${result.percentage.toFixed(1)}%` : '-'}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Overall Result Outcome */}
                        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                                <span className="text-xs text-slate-500 font-medium block">Overall Grade</span>
                                <span className="text-base font-extrabold text-slate-900">{result.overallGrade || '-'}</span>
                            </div>
                            {result.rank != null && (
                                <div>
                                    <span className="text-xs text-slate-500 font-medium block">Rank in Batch</span>
                                    <span className="text-base font-extrabold text-indigo-700">#{result.rank}</span>
                                </div>
                            )}
                            <div>
                                <span className="text-xs text-slate-500 font-medium block">Verification Status</span>
                                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 className="w-4 h-4" /> Certified Genuine Record
                                </span>
                            </div>
                            <div>
                                <span className={`inline-block px-4 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wider ${
                                    isPass ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'
                                }`}>
                                    Result: {result.overallResult.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Bar: Download Official PDF */}
                    <div className="p-6 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold text-white">Download Official Transcript</p>
                            <p className="text-[11px] text-slate-400">Get the exact high-resolution A4 printable PDF certified by the institution.</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <a
                                href={htmlUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Preview HTML
                            </a>
                            <a
                                href={pdfUrl}
                                download={`Marksheet_${(student.profile?.firstName || 'Student')}_${(exam.title || 'Exam').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition"
                            >
                                <Download className="w-4 h-4" />
                                Download PDF (A4)
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="text-center text-xs text-slate-400 mt-8">
                <p>© {new Date().getFullYear()} {institute.name || 'Institution'}. Document Verification & Registry System.</p>
            </footer>
        </div>
    );
}
