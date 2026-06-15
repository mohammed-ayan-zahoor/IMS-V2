import mongoose from 'mongoose';
import { connectDB } from '../lib/mongodb.js';
import Institute from '../models/Institute.js';
import Fee from '../models/Fee.js';
import TransportFee from '../models/TransportFee.js';
import HostelAllotment from '../models/HostelAllotment.js';
import VoiceCallLog from '../models/VoiceCallLog.js';
import { NotificationService } from './notificationService.js';

export async function processOverdueReminders() {
    try {
        console.log("[Overdue Reminders] Starting daily overdue balance checks...");
        await connectDB();

        // 1. Calculate yesterday's date range (in local/UTC)
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const yesterdayStart = new Date(yesterday.setHours(0, 0, 0, 0));
        const yesterdayEnd = new Date(yesterday.setHours(23, 59, 59, 999));

        console.log(`[Overdue Reminders] Scanning installments due between: ${yesterdayStart.toISOString()} and ${yesterdayEnd.toISOString()}`);

        // 2. Find all active institutes with voice reminders enabled
        const institutes = await Institute.find({
            isActive: true,
            deletedAt: null,
            'notifications.overdueVoiceReminderEnabled': true
        });

        console.log(`[Overdue Reminders] Found ${institutes.length} active institutes with Voice Reminders toggled ON.`);

        for (const inst of institutes) {
            const instituteId = inst._id;
            const schoolName = inst.name;
            const quota = inst.usage?.voiceCallsQuota || 5000;
            const currentSent = inst.usage?.voiceCallsSent || 0;

            console.log(`[Overdue Reminders] Processing "${schoolName}" (${instituteId}) | Quota: ${currentSent}/${quota}`);

            // Enforce quota limits
            if (currentSent >= quota) {
                console.warn(`[Overdue Reminders] Quota exceeded for "${schoolName}". Skipping reminders.`);
                continue;
            }

            // A. Process standard course fees
            const courseFees = await Fee.find({
                institute: instituteId,
                deletedAt: null,
                status: { $in: ['not_started', 'partial', 'overdue'] },
                installments: {
                    $elemMatch: {
                        status: 'pending',
                        dueDate: { $gte: yesterdayStart, $lte: yesterdayEnd },
                        voiceReminderSentAt: { $exists: false }
                    }
                }
            }).populate('student');

            for (const fee of courseFees) {
                for (const instItem of fee.installments) {
                    if (
                        instItem.status === 'pending' &&
                        instItem.dueDate >= yesterdayStart &&
                        instItem.dueDate <= yesterdayEnd &&
                        !instItem.voiceReminderSentAt
                    ) {
                        await triggerReminderCall(instituteId, schoolName, fee.student, instItem, 'course', fee);
                    }
                }
            }

            // B. Process transport fees
            const transportFees = await TransportFee.find({
                institute: instituteId,
                deletedAt: null,
                status: { $in: ['not_started', 'partial', 'overdue'] },
                installments: {
                    $elemMatch: {
                        status: 'pending',
                        dueDate: { $gte: yesterdayStart, $lte: yesterdayEnd },
                        voiceReminderSentAt: { $exists: false }
                    }
                }
            }).populate('student');

            for (const fee of transportFees) {
                for (const instItem of fee.installments) {
                    if (
                        instItem.status === 'pending' &&
                        instItem.dueDate >= yesterdayStart &&
                        instItem.dueDate <= yesterdayEnd &&
                        !instItem.voiceReminderSentAt
                    ) {
                        await triggerReminderCall(instituteId, schoolName, fee.student, instItem, 'transport', fee);
                    }
                }
            }

            // C. Process hostel allotments
            const hostelAllotments = await HostelAllotment.find({
                institute: instituteId,
                deletedAt: null,
                feeStatus: { $in: ['not_started', 'partial', 'overdue'] },
                installments: {
                    $elemMatch: {
                        status: 'pending',
                        dueDate: { $gte: yesterdayStart, $lte: yesterdayEnd },
                        voiceReminderSentAt: { $exists: false }
                    }
                }
            }).populate('student');

            for (const allot of hostelAllotments) {
                for (const instItem of allot.installments) {
                    if (
                        instItem.status === 'pending' &&
                        instItem.dueDate >= yesterdayStart &&
                        instItem.dueDate <= yesterdayEnd &&
                        !instItem.voiceReminderSentAt
                    ) {
                        await triggerReminderCall(instituteId, schoolName, allot.student, instItem, 'hostel', allot);
                    }
                }
            }
        }

        console.log("[Overdue Reminders] Completed daily overdue balance reminders processing.");
    } catch (error) {
        console.error("[Overdue Reminders Error] Failed to process overdue reminders:", error);
        throw error;
    }
}

/**
 * Helper to resolve phone number, trigger call, write log and update DB
 */
async function triggerReminderCall(instituteId, schoolName, student, installment, feeType, parentDoc) {
    if (!student || !student.profile) {
        console.log(`[Overdue Reminders] Student record missing or incomplete for installment ${installment._id}. Skipping.`);
        return;
    }

    const studentName = `${student.profile.firstName} ${student.profile.lastName}`;
    
    // Resolve phone number hierarchy
    const phone = student.profile.phone || 
                  student.guardianDetails?.phone || 
                  student.fatherPhone || 
                  student.motherPhone;

    if (!phone) {
        console.warn(`[Overdue Reminders WARNING] No phone number found for student "${studentName}" (${student._id}). Logging failure.`);
        
        await VoiceCallLog.create({
            institute: instituteId,
            student: student._id,
            phone: 'N/A',
            installmentId: installment._id,
            feeType: feeType,
            status: 'failed',
            error: 'No phone number found in student/guardian details',
            cost: 0
        });

        installment.voiceReminderSentAt = new Date();
        await parentDoc.save();
        return;
    }

    try {
        // Trigger call
        const callResult = await NotificationService.sendVoiceCall(
            instituteId,
            phone,
            studentName,
            installment.amount,
            schoolName
        );

        if (callResult.success) {
            // Write success log
            await VoiceCallLog.create({
                institute: instituteId,
                student: student._id,
                phone: phone,
                installmentId: installment._id,
                feeType: feeType,
                status: 'success',
                cost: 0.70, // Standard estimated billing cost
                callSid: callResult.callSid
            });

            // Increment call counter on Institute
            await Institute.updateOne(
                { _id: instituteId },
                { $inc: { 'usage.voiceCallsSent': 1 } }
            );

            console.log(`[Overdue Reminders] Voice call dispatched to ${phone} for "${studentName}" (Amount: ${installment.amount})`);
        } else {
            throw new Error(callResult.message || 'Call trigger returned failure status');
        }
    } catch (err) {
        console.error(`[Overdue Reminders ERROR] Failed call to ${phone} for "${studentName}":`, err.message);

        // Write failure log
        await VoiceCallLog.create({
            institute: instituteId,
            student: student._id,
            phone: phone,
            installmentId: installment._id,
            feeType: feeType,
            status: 'failed',
            error: err.message || 'Unknown network error',
            cost: 0
        });
    } finally {
        // Mark voice reminder as processed to prevent infinite calls
        installment.voiceReminderSentAt = new Date();
        await parentDoc.save();
    }
}
