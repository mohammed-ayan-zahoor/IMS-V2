import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { getInstituteScope } from '@/middleware/instituteScope';
import Batch from '@/models/Batch';
import Session from '@/models/Session';
import User from '@/models/User';
import Institute from '@/models/Institute';
import AuditLog from '@/models/AuditLog';
import FeePreset from '@/models/FeePreset';
import { FeeService } from '@/services/feeService';
import mongoose from 'mongoose';

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope.instituteId) {
            return NextResponse.json({ error: "No institute context found" }, { status: 404 });
        }

        const { studentIds, targetBatchId } = await req.json();

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json({ error: "No students selected" }, { status: 400 });
        }

        if (!targetBatchId) {
            return NextResponse.json({ error: "Target batch is required" }, { status: 400 });
        }

        // 1. Find target batch and verify it belongs to this institute
        const targetBatch = await Batch.findOne({
            _id: targetBatchId,
            institute: scope.instituteId
        });

        if (!targetBatch) {
            return NextResponse.json({ error: "Target batch not found" }, { status: 404 });
        }

        // 2. Get the active session for this institute
        let activeSession = await Session.findOne({
            instituteId: scope.instituteId,
            isActive: true,
            deletedAt: null
        });

        // If target batch has session, use that; otherwise use active session
        const targetSessionId = targetBatch.session || activeSession?._id;

        if (!targetSessionId) {
            return NextResponse.json({ 
                error: "No active session found. Please activate a session first." 
            }, { status: 400 });
        }

         // 3. Get the course and default fee preset for the target batch
         const course = await targetBatch.populate('course');
         let feePreset = null;
         let instituteType = 'SCHOOL'; // Default to SCHOOL
         
         // Fetch institute to check its type
         const institute = await Institute.findById(scope.instituteId);
         if (institute) {
             instituteType = institute.type || 'SCHOOL';
         }
         
         if (course.course && instituteType === 'SCHOOL') {
             // Try to get the default/first active fee preset for this course
             feePreset = await FeePreset.findOne({
                 institute: scope.instituteId,
                 course: course.course._id,
                 isActive: true,
                 deletedAt: null
             }).sort({ createdAt: 1 }); // Get the first created preset as default
         }

         // 4. Perform promotion
         const results = {
             success: 0,
             failed: 0,
             alreadyEnrolled: 0,
             feesCreated: 0,
             feesFailed: 0,
             feesSkipped: 0
         };

        for (const studentId of studentIds) {
            try {
                // A. Check if already in target batch
                const isAlreadyEnrolled = targetBatch.enrolledStudents.some(
                    e => e.student.toString() === studentId
                );

                if (isAlreadyEnrolled) {
                    results.alreadyEnrolled++;
                    continue;
                }

                // B. Mark current active batches as COMPLETED (same session)
                await Batch.updateMany(
                    { 
                        institute: scope.instituteId,
                        'enrolledStudents': { 
                            $elemMatch: { student: studentId, status: 'active' } 
                        },
                        _id: { $ne: targetBatchId }
                    },
                    { 
                        $set: { 'enrolledStudents.$.status': 'completed' } 
                    }
                );

                // C. Enroll in new batch with session
                targetBatch.enrolledStudents.push({
                    student: studentId,
                    enrolledAt: new Date(),
                    status: 'active'
                });

                // Log promotion
                await AuditLog.create({
                    actor: session.user.id,
                    action: 'student.promote',
                    resource: { type: 'Student', id: studentId },
                    institute: scope.instituteId,
                    details: { 
                        fromBatch: 'active',
                        toBatch: targetBatchId,
                        session: targetSessionId
                    }
                });

                 // D. Create fee from preset if available (only for SCHOOL institutes)
                 if (instituteType === 'SCHOOL') {
                     if (feePreset) {
                         try {
                             await FeeService.createFeeFromPreset({
                                 student: studentId,
                                 batch: targetBatchId,
                                 preset: feePreset,
                                 institute: scope.instituteId,
                                 session: targetSessionId,
                                 numInstallments: 3 // Default to 3 installments
                             }, session.user.id);
                             results.feesCreated++;
                         } catch (feeErr) {
                             console.error(`Failed to create fee for student ${studentId}:`, feeErr);
                             results.feesFailed++;
                             // Don't fail the entire promotion if fee creation fails
                         }
                     } else {
                         results.feesSkipped++;
                     }
                 } else {
                     // VOCATIONAL institute - skip fee creation
                     results.feesSkipped++;
                 }

                results.success++;
            } catch (err) {
                console.error(`Failed to promote student ${studentId}:`, err);
                results.failed++;
            }
        }

        // Set session on batch if not already set
        if (!targetBatch.session) {
            targetBatch.session = targetSessionId;
        }

        await targetBatch.save();

         return NextResponse.json({
             success: true,
             message: `Successfully promoted ${results.success} students.${instituteType === 'VOCATIONAL' ? ' Fees were not auto-created for this vocational institute.' : ''}`,
             details: {
                 ...results,
                 instituteType
             },
             session: targetSessionId
         });

    } catch (error) {
        console.error("Promotion API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
