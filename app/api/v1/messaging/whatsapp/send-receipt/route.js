import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getInstituteScope } from '@/middleware/instituteScope';
import { NotificationService } from '@/services/notificationService';
import Fee from '@/models/Fee';
import MouSubmission from '@/models/MouSubmission';
import mongoose from 'mongoose';

export async function POST(req) {
    try {
        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!['admin', 'super_admin'].includes(scope.user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { type = 'fee', id, recipientPhone, customMessage } = body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Valid record ID is required' }, { status: 400 });
        }

        const instituteId = scope.instituteId;
        if (!instituteId) return NextResponse.json({ error: 'No institute context' }, { status: 400 });

        let targetPhone = recipientPhone ? recipientPhone.replace(/\D/g, '') : null;
        let messageText = customMessage || '';

        if (type === 'fee') {
            const fee = await Fee.findById(id)
                .populate('student', 'profile guardianDetails email enrollmentNumber')
                .populate('batch', 'name')
                .populate('institute', 'name contactPhone contactEmail');

            if (!fee) return NextResponse.json({ error: 'Fee receipt not found' }, { status: 404 });

            if (!targetPhone) {
                targetPhone = (fee.student?.profile?.phone || fee.student?.guardianDetails?.phone || '').replace(/\D/g, '');
            }

            if (!targetPhone) {
                return NextResponse.json({ error: 'No valid phone number found for student or guardian.' }, { status: 400 });
            }

            if (!messageText) {
                const studentName = fee.student?.profile?.firstName || 'Student';
                const finalAmount = (fee.totalAmount || 0) - (fee.discount?.amount || 0) + (fee.extraCharges?.amount || 0);
                const balanceDue = Math.max(0, finalAmount - (fee.paidAmount || 0));
                const receiptRef = `#${fee._id.toString().slice(-8).toUpperCase()}`;
                const instName = fee.institute?.name || 'Institute';
                const courseName = fee.batch?.name || 'Course';

                messageText = `Dear ${studentName},\n\nYour fee payment of ₹${(fee.paidAmount || 0).toLocaleString('en-IN')} for ${courseName} has been recorded.\nReceipt Ref: ${receiptRef}\nBalance Due: ₹${balanceDue.toLocaleString('en-IN')}\n\nThank you,\n${instName}`;
            }

        } else if (type === 'mou') {
            const mou = await MouSubmission.findById(id);
            if (!mou) return NextResponse.json({ error: 'MOU submission not found' }, { status: 404 });

            if (!targetPhone) {
                targetPhone = (mou.contactPhone || '').replace(/\D/g, '');
            }

            if (!targetPhone) {
                return NextResponse.json({ error: 'No valid contact phone found on MOU submission.' }, { status: 400 });
            }

            if (!messageText) {
                messageText = `Dear ${mou.schoolName || 'Partner'},\n\nPayment receipt for your MOU Agreement Ref: ${mou.refId || id} has been generated.\nAmount: ₹${(mou.upfrontPrice || mou.totalPrice || 0).toLocaleString('en-IN')}.\n\nThank you,\nQuantech Infosystem`;
            }
        }

        // Send via configured WhatsApp provider (OpenWA, Twilio, Meta, Mock)
        const result = await NotificationService.sendWhatsAppText(String(instituteId), targetPhone, messageText);

        return NextResponse.json({
            success: true,
            message: `Receipt dispatched successfully via ${result.provider}!`,
            provider: result.provider,
            sentTo: targetPhone
        });

    } catch (err) {
        console.error('[WA RECEIPT DISPATCH ERROR]', err);
        return NextResponse.json({ error: err.message || 'Failed to dispatch receipt via WhatsApp' }, { status: 500 });
    }
}
