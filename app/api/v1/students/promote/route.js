import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Batch from '@/models/Batch';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== 'admin' && session.user.role !== 'super_admin')) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { studentIds, targetBatchId } = await req.json();

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json({ error: "No students selected" }, { status: 400 });
        }

        if (!targetBatchId) {
            return NextResponse.json({ error: "Target batch is required" }, { status: 400 });
        }

        await connectDB();

        // 1. Find target batch
        const targetBatch = await Batch.findById(targetBatchId);
        if (!targetBatch) {
            return NextResponse.json({ error: "Target batch not found" }, { status: 404 });
        }

        // 2. Perform promotion in a transaction (ideal, but let's do it robustly)
        const results = {
            success: 0,
            failed: 0,
            alreadyEnrolled: 0
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

                // B. Mark current active batches as COMPLETED
                await Batch.updateMany(
                    { 
                        'enrolledStudents': { 
                            $elemMatch: { student: studentId, status: 'active' } 
                        },
                        _id: { $ne: targetBatchId }
                    },
                    { 
                        $set: { 'enrolledStudents.$.status': 'completed' } 
                    }
                );

                // C. Enroll in new batch
                targetBatch.enrolledStudents.push({
                    student: studentId,
                    enrolledAt: new Date(),
                    status: 'active'
                });

                results.success++;
            } catch (err) {
                console.error(`Failed to promote student ${studentId}:`, err);
                results.failed++;
            }
        }

        await targetBatch.save();

        return NextResponse.json({
            success: true,
            message: `Successfully promoted ${results.success} students.`,
            details: results
        });

    } catch (error) {
        console.error("Promotion API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
