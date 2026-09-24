import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getInstituteScope } from '@/middleware/instituteScope';
import { NotificationService } from '@/services/notificationService';
import User from '@/models/User';
import Batch from '@/models/Batch';
import Course from '@/models/Course';
import Institute from '@/models/Institute';
import mongoose from 'mongoose';

// ponytail: in-memory rate limit — 1 broadcast per 30s per institute.
// Upgrade path: Redis key with TTL if we go multi-process.
const lastBroadcast = new Map();

function normalisePhone(raw) {
    if (!raw) return null;
    // Strip spaces, dashes, parens
    let p = raw.replace(/[\s\-().]/g, '');
    // Prepend +91 if it's a 10-digit Indian number with no country code
    if (/^\d{10}$/.test(p)) p = '+91' + p;
    // Already has a +, leave as-is
    if (!p.startsWith('+')) p = '+' + p;
    return p;
}

export async function POST(req) {
    try {
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!['admin', 'super_admin'].includes(scope.user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const instituteId = scope.instituteId;
        if (!instituteId) return NextResponse.json({ error: 'No institute context' }, { status: 400 });

        // Rate limit
        const lastTime = lastBroadcast.get(String(instituteId)) || 0;
        if (Date.now() - lastTime < 30_000) {
            const wait = Math.ceil((30_000 - (Date.now() - lastTime)) / 1000);
            return NextResponse.json(
                { error: `Please wait ${wait}s before sending another broadcast.` },
                { status: 429 }
            );
        }

        const body = await req.json();
        const { audience, batchId, courseId, customPhones, message } = body;

        if (!message?.trim()) {
            return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
        }
        if (message.trim().length > 4096) {
            return NextResponse.json({ error: 'Message exceeds 4096 characters.' }, { status: 400 });
        }
        if (!['all', 'batch', 'course', 'custom'].includes(audience)) {
            return NextResponse.json({ error: 'Invalid audience.' }, { status: 400 });
        }

        // --- Resolve recipients ---
        let recipients = []; // { name, phone }

        const safeInstId = new mongoose.Types.ObjectId(instituteId);

        if (audience === 'all') {
            const students = await User.find({
                institute: safeInstId,
                role: 'student',
                status: 'ACTIVE',
                deletedAt: null
            }).select('profile.firstName profile.phone guardianDetails.phone');

            recipients = students.map(s => ({
                name: s.profile?.firstName || 'Student',
                phone: normalisePhone(s.profile?.phone) || normalisePhone(s.guardianDetails?.phone)
            }));

        } else if (audience === 'batch') {
            if (!batchId || !mongoose.Types.ObjectId.isValid(batchId)) {
                return NextResponse.json({ error: 'Valid batchId required.' }, { status: 400 });
            }
            const batch = await Batch.findOne({ _id: batchId, institute: safeInstId, deletedAt: null });
            if (!batch) return NextResponse.json({ error: 'Batch not found.' }, { status: 404 });

            const activeStudentIds = batch.enrolledStudents
                .filter(e => e.status === 'active')
                .map(e => e.student);

            const students = await User.find({
                _id: { $in: activeStudentIds },
                deletedAt: null
            }).select('profile.firstName profile.phone guardianDetails.phone');

            recipients = students.map(s => ({
                name: s.profile?.firstName || 'Student',
                phone: normalisePhone(s.profile?.phone) || normalisePhone(s.guardianDetails?.phone)
            }));

        } else if (audience === 'course') {
            if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
                return NextResponse.json({ error: 'Valid courseId required.' }, { status: 400 });
            }
            const batches = await Batch.find({
                course: new mongoose.Types.ObjectId(courseId),
                institute: safeInstId,
                deletedAt: null
            });

            const studentIdSet = new Set();
            for (const b of batches) {
                for (const e of b.enrolledStudents) {
                    if (e.status === 'active') studentIdSet.add(String(e.student));
                }
            }

            const students = await User.find({
                _id: { $in: [...studentIdSet].map(id => new mongoose.Types.ObjectId(id)) },
                deletedAt: null
            }).select('profile.firstName profile.phone guardianDetails.phone');

            recipients = students.map(s => ({
                name: s.profile?.firstName || 'Student',
                phone: normalisePhone(s.profile?.phone) || normalisePhone(s.guardianDetails?.phone)
            }));

        } else if (audience === 'custom') {
            // customPhones: array of raw strings entered by admin
            if (!Array.isArray(customPhones) || customPhones.length === 0) {
                return NextResponse.json({ error: 'customPhones array is required for custom audience.' }, { status: 400 });
            }
            recipients = customPhones.map(raw => ({
                name: '',
                phone: normalisePhone(raw)
            }));
        }

        // --- Send ---
        lastBroadcast.set(String(instituteId), Date.now());

        let sent = 0, failed = 0, skipped = 0;
        const errors = [];

        for (const r of recipients) {
            if (!r.phone) { skipped++; continue; }
            try {
                await NotificationService.sendWhatsAppText(String(instituteId), r.phone, message.trim());
                sent++;
            } catch (err) {
                failed++;
                errors.push({ phone: r.phone, error: err.message });
            }
        }

        return NextResponse.json({ success: true, sent, failed, skipped, total: recipients.length, errors });

    } catch (err) {
        console.error('[WA BROADCAST]', err);
        return NextResponse.json({ error: err.message || 'Broadcast failed' }, { status: 500 });
    }
}
