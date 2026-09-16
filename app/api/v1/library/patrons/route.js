import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getLibraryAuth } from '@/lib/library/auth';
import User from '@/models/User';
import Membership from '@/models/Membership';
import LibraryTransaction from '@/models/LibraryTransaction';
import LibrarySettings from '@/models/LibrarySettings';

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req) {
    try {
        const { instituteId } = await getLibraryAuth();
        const { searchParams } = new URL(req.url);
        const q = (searchParams.get('q') || '').trim();

        if (!q) {
            return NextResponse.json({ patrons: [] });
        }

        const escaped = escapeRegExp(q);
        const re = new RegExp(escaped, 'i');

        const orConditions = [
            { 'profile.firstName': re },
            { 'profile.lastName': re },
            { email: re },
            { enrollmentNumber: re },
            { grNumber: re },
            { studentIdUdise: re },
            { 'profile.phone': re },
            { fatherPhone: re },
            { motherPhone: re },
            { admissionStd: re }
        ];

        if (q.includes(' ')) {
            orConditions.push({
                $expr: {
                    $regexMatch: {
                        input: { $concat: ['$profile.firstName', ' ', { $ifNull: ['$profile.lastName', ''] }] },
                        regex: escaped,
                        options: 'i'
                    }
                }
            });
        }

        // Scope to institute: either direct user.institute or via active Membership
        const safeInstituteId = mongoose.Types.ObjectId.isValid(instituteId)
            ? new mongoose.Types.ObjectId(instituteId)
            : instituteId;

        const memberships = await Membership.find({
            institute: safeInstituteId,
            isActive: true
        }).select('user').lean();
        const membershipUserIds = memberships.map(m => m.user);

        const filter = {
            deletedAt: null,
            $or: [
                { institute: safeInstituteId },
                { _id: { $in: membershipUserIds } }
            ],
            $and: [{ $or: orConditions }]
        };

        const [users, settings] = await Promise.all([
            User.find(filter)
                .select('profile role enrollmentNumber grNumber admissionStd studentIdUdise email fatherPhone')
                .limit(10)
                .lean(),
            LibrarySettings.findOne({ institute: safeInstituteId }).select('loanRules').lean()
        ]);

        if (users.length === 0) {
            return NextResponse.json({ patrons: [] });
        }

        const userIds = users.map(u => u._id);
        const activeLoans = await LibraryTransaction.aggregate([
            {
                $match: {
                    institute: safeInstituteId,
                    patron: { $in: userIds },
                    status: 'active'
                }
            },
            {
                $group: {
                    _id: '$patron',
                    count: { $sum: 1 }
                }
            }
        ]);

        const loanMap = Object.fromEntries(activeLoans.map(l => [l._id.toString(), l.count]));
        const loanRules = settings?.loanRules || {};

        const patrons = users.map(u => {
            const roleRule = loanRules[u.role] || { durationDays: 14, maxBooks: 3, renewalLimit: 2 };
            const activeLoansCount = loanMap[u._id.toString()] || 0;
            const maxBooks = roleRule.maxBooks ?? 3;

            return {
                id: u._id.toString(),
                _id: u._id.toString(),
                name: `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || 'Unnamed Patron',
                role: u.role,
                enrollmentNumber: u.enrollmentNumber || null,
                grNumber: u.grNumber || null,
                admissionStd: u.admissionStd || null,
                phone: u.profile?.phone || u.fatherPhone || null,
                email: u.email || null,
                activeLoansCount,
                maxBooks,
                canBorrow: activeLoansCount < maxBooks
            };
        });

        return NextResponse.json({ patrons });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        console.error('[Library Patron Search Error]', e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
