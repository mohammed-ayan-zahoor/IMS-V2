'use client';

import React, { useState, useRef } from 'react';

export default function ResultLookupWidget({
    instituteCode,
    instituteName,
    instituteLogo,
    customTitle,
    customSubtitle,
    activeSessionName
}) {
    // Form state
    const [enrollmentNumber, setEnrollmentNumber] = useState('');
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');
    
    // Status state: 'idle' | 'submitting' | 'success' | 'error'
    const [status, setStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [data, setData] = useState(null);

    // Refs for DOB auto-advance
    const dayRef = useRef(null);
    const monthRef = useRef(null);
    const yearRef = useRef(null);

    const handleDayChange = (e) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 2);
        setDay(val);
        if (val.length === 2) {
            monthRef.current?.focus();
        }
    };

    const handleMonthChange = (e) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 2);
        setMonth(val);
        if (val.length === 2) {
            yearRef.current?.focus();
        }
    };

    const handleMonthKeyDown = (e) => {
        if (e.key === 'Backspace' && !month) {
            dayRef.current?.focus();
        }
    };

    const handleYearChange = (e) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
        setYear(val);
    };

    const handleYearKeyDown = (e) => {
        if (e.key === 'Backspace' && !year) {
            monthRef.current?.focus();
        }
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (status === 'submitting') return;

        const cleanEnr = enrollmentNumber.trim();
        if (!cleanEnr) {
            setStatus('error');
            setErrorMessage("Please enter your enrollment number.");
            return;
        }

        const d = parseInt(day, 10);
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);

        if (!day || !month || !year || isNaN(d) || isNaN(m) || isNaN(y) || d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) {
            setStatus('error');
            setErrorMessage("Please enter a valid date of birth (Day / Month / Year).");
            return;
        }

        const formattedDob = `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;

        setStatus('submitting');
        setErrorMessage('');

        try {
            const res = await fetch('/api/v1/public/results', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instituteCode,
                    enrollmentNumber: cleanEnr,
                    dateOfBirth: formattedDob
                })
            });

            const resultData = await res.json();

            if (!res.ok) {
                setStatus('error');
                setErrorMessage(resultData.error || "No result found matching this enrollment number and date of birth. Please double check and try again.");
            } else {
                setData(resultData);
                setStatus('success');
            }
        } catch (err) {
            setStatus('error');
            setErrorMessage("Unable to connect. Please check your internet connection and try again.");
        }
    };

    const handleReset = () => {
        setData(null);
        setStatus('idle');
        setErrorMessage('');
        setEnrollmentNumber('');
        setDay('');
        setMonth('');
        setYear('');
    };

    const sessionLabel = activeSessionName || '2025–26';

    return (
        <div className="w-full font-sans text-[#0f172a]">
            <style jsx global>{`
                .form-input-box {
                    background: #ffffff;
                    border: 1px solid #cbd5e1;
                    border-radius: 5px;
                    color: #0f172a;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                }
                .form-input-box:focus {
                    outline: none;
                    border-color: #0f766e;
                    box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.15);
                }

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

                @media (prefers-reduced-motion: no-preference) {
                    .animate-seal-stamp {
                        animation: stampSettle 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    }
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

            {/* ── 1. Page Header (Visible ONLY during Form Lookup State, disappears in result view so Institute Name doesn't repeat) ── */}
            {!data && (
                <div className="border-b border-[#e2e8f0] py-10 sm:py-14 px-6 sm:px-12 bg-[#f8fafc]">
                    <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                        <div className="flex items-start gap-5">
                            {instituteLogo && (
                                <img
                                    src={instituteLogo}
                                    alt={instituteName}
                                    className="w-14 h-14 sm:w-16 sm:h-16 object-contain p-1.5 border border-[#e2e8f0] bg-white rounded-[5px] mt-1 shadow-xs"
                                />
                            )}
                            <div>
                                <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[#0f172a] tracking-tight">
                                    {instituteName}
                                </h1>
                                <p className="text-base sm:text-lg text-[#64748b] mt-2">
                                    {customTitle || 'Student Examination Results'}
                                </p>
                            </div>
                        </div>

                        <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-[#e2e8f0]">
                            <div className="text-xs uppercase tracking-wider text-[#64748b] font-medium">Academic Session</div>
                            <div className="font-bold text-[#0f172a] text-lg sm:text-xl font-mono">{sessionLabel}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 2. Candidate Lookup Form Area ── */}
            {!data && (
                <div className="py-10 sm:py-16 px-6 sm:px-12 bg-[#f8fafc]">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
                        {/* Left Column: Guidance */}
                        <div className="md:col-span-4 space-y-8 md:border-r md:border-[#e2e8f0] md:pr-10 text-[#475569]">
                            <div>
                                <h2 className="font-serif font-bold text-xl sm:text-2xl text-[#0f172a] mb-3">
                                    Check your result
                                </h2>
                                <p className="text-sm sm:text-base leading-relaxed text-[#475569]">
                                    Enter your student enrollment number and date of birth to view and download your official statement of marks for the {sessionLabel} session.
                                </p>
                            </div>

                            <div className="border-t border-[#e2e8f0] pt-6 space-y-3 text-sm text-[#475569] leading-relaxed">
                                <strong className="text-[#0f172a] text-base block font-serif font-bold">Need help?</strong>
                                <p>
                                    Your enrollment number can be found on your admit card or student identity card.
                                </p>
                                <p>
                                    If you are unable to find your result or notice any discrepancy, please contact your school office.
                                </p>
                            </div>
                        </div>

                        {/* Right Column: Form with 5px Rounded Corners */}
                        <div className="md:col-span-8">
                            <form onSubmit={handleSubmit} className="space-y-8 max-w-xl" noValidate>
                                {status === 'error' && errorMessage && (
                                    <div 
                                        role="alert" 
                                        className="p-4 border-l-4 border-[#dc2626] bg-[#fef2f2] text-[#991b1b] rounded-[5px] text-sm leading-relaxed"
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="font-bold text-base mt-0.5">!</span>
                                            <span>{errorMessage}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Enrollment Number Field */}
                                <div className="space-y-2">
                                    <label 
                                        htmlFor="enrollment-input" 
                                        className="block text-sm sm:text-base font-semibold text-[#0f172a] tracking-wide"
                                    >
                                        Enrollment number <span className="text-[#dc2626]">*</span>
                                    </label>
                                    <input
                                        id="enrollment-input"
                                        type="text"
                                        value={enrollmentNumber}
                                        onChange={(e) => {
                                            setEnrollmentNumber(e.target.value.toUpperCase());
                                            if (status === 'error') setStatus('idle');
                                        }}
                                        placeholder="e.g. STU-2025-001"
                                        required
                                        autoComplete="off"
                                        className="form-input-box w-full px-4 py-3.5 text-base sm:text-lg font-mono font-bold uppercase tracking-wider"
                                    />
                                    <span className="block text-xs text-[#64748b]">
                                        As printed on your admit card or student ID
                                    </span>
                                </div>

                                {/* Date of Birth */}
                                <div className="space-y-2">
                                    <label className="block text-sm sm:text-base font-semibold text-[#0f172a] tracking-wide">
                                        Date of birth <span className="text-[#dc2626]">*</span>
                                    </label>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <input
                                                ref={dayRef}
                                                id="dob-day"
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={2}
                                                value={day}
                                                onChange={handleDayChange}
                                                placeholder="DD"
                                                aria-label="Day"
                                                className="form-input-box w-full px-4 py-3 text-center text-base sm:text-lg font-mono font-bold"
                                            />
                                            <span className="block text-xs text-center text-[#64748b] mt-1.5 font-medium">Day</span>
                                        </div>

                                        <div>
                                            <input
                                                ref={monthRef}
                                                id="dob-month"
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={2}
                                                value={month}
                                                onChange={handleMonthChange}
                                                onKeyDown={handleMonthKeyDown}
                                                placeholder="MM"
                                                aria-label="Month"
                                                className="form-input-box w-full px-4 py-3 text-center text-base sm:text-lg font-mono font-bold"
                                            />
                                            <span className="block text-xs text-center text-[#64748b] mt-1.5 font-medium">Month</span>
                                        </div>

                                        <div>
                                            <input
                                                ref={yearRef}
                                                id="dob-year"
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={4}
                                                value={year}
                                                onChange={handleYearChange}
                                                onKeyDown={handleYearKeyDown}
                                                placeholder="YYYY"
                                                aria-label="Year"
                                                className="form-input-box w-full px-4 py-3 text-center text-base sm:text-lg font-mono font-bold"
                                            />
                                            <span className="block text-xs text-center text-[#64748b] mt-1.5 font-medium">Year</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <div className="pt-3">
                                    <button
                                        type="submit"
                                        disabled={status === 'submitting'}
                                        style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                                        className="w-full sm:w-auto px-8 py-3.5 text-white font-semibold text-sm sm:text-base tracking-wider uppercase transition-colors hover:bg-[#0f766e] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 rounded-[5px] shadow-xs"
                                    >
                                        {status === 'submitting' ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></span>
                                                <span>Searching...</span>
                                            </>
                                        ) : (
                                            <span>View Result →</span>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 3. Success State: True Single-Sheet Certified Marksheet ── */}
            {data && (
                <div className="py-8 sm:py-12 px-4 sm:px-8 bg-[#f8fafc]">
                    <div className="max-w-5xl mx-auto space-y-6">
                        {/* Streamlined Action Bar (Screen Only, Restyled without generic clashing icons) */}
                        <div className="no-print pb-4 flex flex-wrap items-center justify-between gap-4 border-b border-[#e2e8f0]">
                            <div className="text-xs sm:text-sm text-[#475569]">
                                Verified candidate: <strong className="text-[#0f172a]">{data.student?.name}</strong> (<span className="font-mono font-bold">{data.student?.enrollmentNumber}</span>)
                            </div>

                            <div className="flex items-center gap-3">
                                {data.results && data.results[0] && (
                                    <a
                                        href={`/api/v1/public/results/marksheet/${data.results[0].id}/pdf`}
                                        download={`Marksheet_${(data.student?.name || 'Student').replace(/[^a-zA-Z0-9]/g, '_')}_${(data.results[0].examTitle || 'Exam').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`}
                                        style={{ backgroundColor: '#0f766e', color: '#ffffff' }}
                                        className="inline-flex items-center px-4 py-2 bg-[#0f766e] text-white text-xs sm:text-sm font-semibold hover:bg-[#0d5b4d] transition rounded-[5px] shadow-xs"
                                    >
                                        Download Official PDF (A4)
                                    </a>
                                )}
                                <button
                                    onClick={() => window.print()}
                                    className="inline-flex items-center px-4 py-2 border border-[#cbd5e1] bg-white text-[#0f172a] text-xs sm:text-sm font-medium hover:bg-[#f1f5f9] transition cursor-pointer rounded-[5px]"
                                >
                                    Print Document
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="inline-flex items-center px-3 py-2 text-[#64748b] hover:text-[#0f172a] text-xs sm:text-sm font-medium transition cursor-pointer"
                                >
                                    ← Check another
                                </button>
                            </div>
                        </div>

                        {/* Empty Result Message */}
                        {data.results && data.results.length === 0 ? (
                            <div className="border border-[#e2e8f0] bg-white p-10 text-center max-w-xl mx-auto space-y-4 rounded-[5px] shadow-xs">
                                <h3 className="font-serif font-bold text-xl text-[#0f172a]">
                                    No Examination Record Published
                                </h3>
                                <p className="text-sm text-[#64748b] leading-relaxed">
                                    No published exam results were found for <strong>{data.student?.name}</strong> in the {data.session?.name} session.
                                </p>
                                <button
                                    onClick={handleReset}
                                    style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                                    className="mt-3 px-6 py-2.5 bg-[#0f172a] text-white text-sm font-medium hover:bg-[#0f766e] transition cursor-pointer rounded-[5px]"
                                >
                                    ← Return to lookup
                                </button>
                            </div>
                        ) : (
                            /* Statement of Marks Document (Single Sheet Clean Frame) */
                            data.results.map((result, idx) => {
                                const isPass = result.overallResult === 'pass';
                                return (
                                    <div
                                        key={result.id || idx}
                                        className="marksheet-sheet bg-white p-8 sm:p-12 border border-[#cbd5e1] rounded-[5px] shadow-sm space-y-8"
                                    >
                                        {/* 1. Official Document Header (The ONE authoritative place the Institute Identity appears) */}
                                        <div className="border-b-2 border-[#0f172a] pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                                            <div className="space-y-1">
                                                <div className="font-mono text-xs uppercase tracking-widest text-[#0f766e] font-bold">
                                                    OFFICIAL ACADEMIC TRANSCRIPT
                                                </div>
                                                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0f172a] tracking-tight">
                                                    {data.institute?.name}
                                                </h1>
                                                <div className="text-sm text-[#64748b] font-serif italic pt-0.5">
                                                    Statement of Marks • {result.examTitle}
                                                </div>
                                            </div>

                                            <div className="sm:text-right font-mono text-xs space-y-1 text-[#475569]">
                                                <div className="text-xs uppercase tracking-wider text-[#94a3b8]">Academic Session</div>
                                                <div className="font-bold text-[#0f172a] text-base">{result.sessionName}</div>
                                                <div className="text-[11px] text-[#0f766e] font-semibold">● Verified Entry</div>
                                            </div>
                                        </div>

                                        {/* 2. Unified Candidate Bio-Data Strip (Ruled hairline structure, matching table language) */}
                                        <div className="border-y border-[#0f172a] py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                            <div className="border-r border-[#e2e8f0] pr-2">
                                                <span className="font-mono uppercase text-[10px] text-[#64748b] block tracking-wider">Candidate Name</span>
                                                <span className="font-bold text-sm text-[#0f172a] block mt-0.5">{data.student?.name}</span>
                                            </div>
                                            <div className="sm:border-r sm:border-[#e2e8f0] sm:pr-2">
                                                <span className="font-mono uppercase text-[10px] text-[#64748b] block tracking-wider">Enrollment No.</span>
                                                <span className="font-mono font-bold text-sm text-[#0f172a] block mt-0.5">{data.student?.enrollmentNumber}</span>
                                            </div>
                                            <div className="border-r border-[#e2e8f0] pr-2">
                                                <span className="font-mono uppercase text-[10px] text-[#64748b] block tracking-wider">Course / Class</span>
                                                <span className="font-bold text-sm text-[#0f172a] block mt-0.5">{result.courseName}</span>
                                            </div>
                                            <div>
                                                <span className="font-mono uppercase text-[10px] text-[#64748b] block tracking-wider">Batch / Section</span>
                                                <span className="font-bold text-sm text-[#0f172a] block mt-0.5">{result.batchName}</span>
                                            </div>
                                        </div>

                                        {/* 3. Subject Marks Table (Crisp visible table header + No zebra striping + Monospace data) */}
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
                                                        const isSubPassed = sub.passingMarks != null && sub.obtainedMarks != null
                                                            ? sub.obtainedMarks >= sub.passingMarks
                                                            : true;
                                                        return (
                                                            <tr key={sIdx} className="hover:bg-[#f8fafc] transition-colors">
                                                                <td className="py-3.5 px-2 text-center text-[#94a3b8] text-xs">
                                                                    {sIdx + 1}
                                                                </td>
                                                                <td className="py-3.5 px-4 font-sans font-medium text-[#0f172a]">
                                                                    {sub.subjectName}
                                                                    {sub.subjectCode && (
                                                                        <span className="font-mono text-xs text-[#64748b] ml-1.5 font-normal">
                                                                            [{sub.subjectCode}]
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="py-3.5 px-3 text-center text-sm tabular-nums">
                                                                    {sub.maxMarks ?? '-'}
                                                                </td>
                                                                <td className="py-3.5 px-3 text-center text-sm text-[#64748b] tabular-nums">
                                                                    {sub.passingMarks ?? '-'}
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

                                        {/* 4. Payoff Summary & Signature Seal Stamp */}
                                        <div className="border-t-2 border-[#0f766e] pt-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                            {/* Payoff Numbers in Strict Monospace */}
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

                                            {/* 5. Authentic Angled Examination Board Seal Stamp (Emotional Peak) */}
                                            <div className="animate-seal-stamp select-none flex-shrink-0">
                                                <div 
                                                    className={`p-3 border-2 border-dashed rounded-full ${
                                                        isPass
                                                            ? 'border-[#0f766e] text-[#0f766e]'
                                                            : 'border-[#dc2626] text-[#dc2626]'
                                                    }`}
                                                >
                                                    <div 
                                                        className={`w-28 h-28 border-2 rounded-full flex flex-col items-center justify-center text-center p-2 shadow-xs ${
                                                            isPass
                                                                ? 'border-[#0f766e] bg-[#f0fdfa]'
                                                                : 'border-[#dc2626] bg-[#fef2f2]'
                                                        }`}
                                                    >
                                                        <span className="text-[8px] font-mono tracking-[0.2em] uppercase font-bold">
                                                            EXAM BOARD
                                                        </span>
                                                        <span className="text-xl font-serif font-black tracking-wider uppercase my-0.5">
                                                            {isPass ? 'PASSED' : 'FAILED'}
                                                        </span>
                                                        <span className="text-[9px] font-mono font-bold opacity-80">
                                                            {result.sessionName || '2025–26'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 6. Formal Signatures */}
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

                                        {/* 7. Bottom Verification Line */}
                                        <div className="no-print pt-4 border-t border-[#e2e8f0] flex items-center justify-between text-xs text-[#64748b]">
                                            <span className="font-mono">
                                                Document Reference: <strong>DOC-MS-{result.id?.slice(-8).toUpperCase()}</strong>
                                            </span>
                                            <a
                                                href={`/verify/marksheet/${result.id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-medium text-[#0f172a] hover:text-[#0f766e] underline"
                                            >
                                                Live QR Verification Registry →
                                            </a>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
