import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Institute from '@/models/Institute';
import Session from '@/models/Session';
import Course from '@/models/Course';
import Batch from '@/models/Batch';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import Exam from '@/models/Exam';
import ExamResult from '@/models/ExamResult';
import FeePreset from '@/models/FeePreset';
import Fee from '@/models/Fee';
import Enquiry from '@/models/Enquiry';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code')?.toUpperCase() || 'QISJC';
        const id = searchParams.get('id');

        let institute = null;
        if (id) {
            institute = await Institute.findById(id);
        } else {
            institute = await Institute.findOne({ code });
        }

        if (!institute) {
            return NextResponse.json({ error: `Institute not found with code: ${code}` }, { status: 404 });
        }

        const instId = institute._id;

        // Fetch parallel metrics
        const [
            sessions,
            courses,
            batches,
            students,
            staffUsers,
            attendanceCount,
            firstAttendance,
            lastAttendance,
            exams,
            feePresets,
            fees,
            enquiryCount
        ] = await Promise.all([
            Session.find({ instituteId: instId, deletedAt: null }).sort({ startDate: -1 }),
            Course.find({ institute: instId, deletedAt: null }).select('name code'),
            Batch.find({ institute: instId, deletedAt: null }).select('name session enrolledStudents instructor'),
            User.find({ institute: instId, role: 'student', deletedAt: null }).select('status activeSession promotionHistory gender'),
            User.find({ institute: instId, role: { $in: ['admin', 'instructor', 'staff', 'super_admin'] }, deletedAt: null }).select('email role profile'),
            Attendance.countDocuments({ institute: instId }),
            Attendance.findOne({ institute: instId }).sort({ date: 1 }).select('date'),
            Attendance.findOne({ institute: instId }).sort({ date: -1 }).select('date'),
            Exam.find({ institute: instId }).select('title name date totalMarks session batch course'),
            FeePreset.find({ institute: instId, deletedAt: null }).select('name totalAmount'),
            Fee.find({ institute: instId, deletedAt: null }).select('totalAmount paidAmount balanceAmount status'),
            Enquiry.countDocuments({ institute: instId })
        ]);

        const examIds = exams.map(e => e._id);
        const examResultsCount = await ExamResult.countDocuments({ exam: { $in: examIds } });

        // Calculate financials
        const totalInvoiced = fees.reduce((sum, f) => sum + (f.totalAmount || 0), 0);
        const totalCollected = fees.reduce((sum, f) => sum + (f.paidAmount || 0), 0);
        const totalBalance = fees.reduce((sum, f) => sum + (f.balanceAmount || 0), 0);

        // Student status breakdown
        const studentStats = {
            total: students.length,
            active: students.filter(s => s.status === 'ACTIVE' || !s.status).length,
            completed: students.filter(s => s.status === 'COMPLETED').length,
            dropped: students.filter(s => s.status === 'DROPPED').length,
            withActiveSession: students.filter(s => s.activeSession).length,
            withPromotionHistory: students.filter(s => (s.promotionHistory || []).length > 0).length
        };

        // Gaps Analysis
        const gaps = [];
        if (sessions.length < 2) {
            gaps.push("Need at least 2 Academic Sessions (e.g. current 24-25 and next 25-26) to test year-end promotions.");
        }
        if (attendanceCount < 100) {
            gaps.push("Sparse attendance records: full year needs ~180 school days across both terms.");
        }
        if (exams.length < 3) {
            gaps.push("Need full exam terms: Term 1, Mid-term, and Final Annual exams with scored results.");
        }
        if (fees.length < 30 || feePresets.length === 0) {
            gaps.push("Incomplete fee ledger: need fee presets and invoices with paid/unpaid balances to test carryforward arrears.");
        }
        if (staffUsers.filter(u => u.role === 'instructor').length < 3) {
            gaps.push("Low instructor count: need dedicated class teachers mapped to batches.");
        }

        return NextResponse.json({
            success: true,
            institute: {
                id: institute._id,
                name: institute.name,
                code: institute.code,
                type: institute.type,
                status: institute.status,
                limits: institute.limits,
                subscription: institute.subscription
            },
            inventory: {
                sessions: sessions.map(s => ({ id: s._id, name: s.name, start: s.startDate, end: s.endDate, isCurrent: s.isCurrent || s.isActive })),
                coursesCount: courses.length,
                courses: courses,
                batchesCount: batches.length,
                batches: batches.map(b => ({ id: b._id, name: b.name, session: b.session, activeStudents: (b.enrolledStudents || []).filter(e => e.status === 'active').length, totalStudents: (b.enrolledStudents || []).length })),
                students: studentStats,
                staffCount: staffUsers.length,
                staff: staffUsers.map(s => ({ email: s.email, role: s.role, name: s.profile ? `${s.profile.firstName || ''} ${s.profile.lastName || ''}`.trim() : 'Unnamed' })),
                attendance: {
                    totalDaysRecorded: attendanceCount,
                    firstDate: firstAttendance?.date || null,
                    latestDate: lastAttendance?.date || null
                },
                exams: {
                    totalExams: exams.length,
                    totalMarksheets: examResultsCount,
                    exams: exams
                },
                fees: {
                    presetsCount: feePresets.length,
                    presets: feePresets,
                    totalInvoices: fees.length,
                    totalInvoiced,
                    totalCollected,
                    totalBalance
                },
                enquiriesCount: enquiryCount
            },
            readinessAssessment: {
                isReadyForPromotionTest: gaps.length === 0,
                identifiedGaps: gaps
            }
        });
    } catch (error) {
        console.error("Inspect institute error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
