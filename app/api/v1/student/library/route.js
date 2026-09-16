import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import LibraryTransaction from '@/models/LibraryTransaction';
import LibraryHold from '@/models/LibraryHold';
import LibrarySettings from '@/models/LibrarySettings';
import '@/models/Book';
import '@/models/BookCopy';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const studentId = new mongoose.Types.ObjectId(session.user.id);
        const instituteId = session.user.institute?.id || session.user.instituteId;

        if (!instituteId) {
            return NextResponse.json({ error: 'No institute found in session' }, { status: 400 });
        }

        const safeInstituteId = new mongoose.Types.ObjectId(instituteId);
        const now = new Date();

        const [activeLoans, returnedHistory, activeHolds, settings] = await Promise.all([
            // 1. Currently active loans
            LibraryTransaction.find({
                institute: safeInstituteId,
                patron: studentId,
                status: 'active'
            })
                .populate('book', 'title authors coverUrl isbn category')
                .populate('bookCopy', 'accessionNumber shelfLocation condition')
                .sort({ dueDate: 1 })
                .lean(),

            // 2. Recent returned history (last 10)
            LibraryTransaction.find({
                institute: safeInstituteId,
                patron: studentId,
                status: 'returned'
            })
                .populate('book', 'title authors coverUrl')
                .sort({ returnedAt: -1 })
                .limit(10)
                .lean(),

            // 3. Active hold reservations
            LibraryHold.find({
                institute: safeInstituteId,
                patron: studentId,
                status: { $in: ['waiting', 'ready'] }
            })
                .populate('book', 'title authors coverUrl')
                .sort({ requestedAt: -1 })
                .lean(),

            // 4. Institute library settings
            LibrarySettings.findOne({ institute: safeInstituteId }).lean()
        ]);

        const studentRule = settings?.loanRules?.student || {
            durationDays: 14,
            maxBooks: 3,
            renewalLimit: 2
        };

        let overdueCount = 0;
        let totalFines = 0;

        const formattedLoans = activeLoans.map(loan => {
            const dueDate = new Date(loan.dueDate);
            const isOverdue = dueDate < now;
            const daysRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

            if (isOverdue) overdueCount++;
            if (loan.fineAmount && !loan.finePaid) totalFines += loan.fineAmount;

            return {
                id: loan._id.toString(),
                bookTitle: loan.book?.title || 'Unknown Title',
                authors: loan.book?.authors || [],
                coverUrl: loan.book?.coverUrl || null,
                accessionNumber: loan.bookCopy?.accessionNumber || 'N/A',
                shelfLocation: loan.bookCopy?.shelfLocation || '',
                issuedAt: loan.issuedAt,
                dueDate: loan.dueDate,
                isOverdue,
                daysRemaining,
                fineAmount: loan.fineAmount || 0,
                finePaid: loan.finePaid || false,
                renewalsCount: (loan.renewalHistory || []).length
            };
        });

        const formattedHolds = activeHolds.map(hold => ({
            id: hold._id.toString(),
            bookTitle: hold.book?.title || 'Unknown Title',
            authors: hold.book?.authors || [],
            coverUrl: hold.book?.coverUrl || null,
            status: hold.status,
            requestedAt: hold.requestedAt,
            readyAt: hold.readyAt,
            expiresAt: hold.expiresAt
        }));

        return NextResponse.json({
            loans: formattedLoans,
            history: returnedHistory.map(h => ({
                id: h._id.toString(),
                bookTitle: h.book?.title || 'Unknown Title',
                authors: h.book?.authors || [],
                coverUrl: h.book?.coverUrl || null,
                issuedAt: h.issuedAt,
                returnedAt: h.returnedAt
            })),
            holds: formattedHolds,
            stats: {
                activeLoansCount: formattedLoans.length,
                maxBooks: studentRule.maxBooks ?? 3,
                overdueCount,
                totalFines,
                canBorrow: formattedLoans.length < (studentRule.maxBooks ?? 3)
            }
        });

    } catch (error) {
        console.error('[Student Library API Error]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
