import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { generateCertificate } from '@/services/completionService';

/**
 * POST /api/v1/students/[id]/generate-certificate
 * Auth: Admin only
 * Required: batchId to specify which course the certificate is for
 */
export async function POST(req, { params }) {
    try {
        await connectDB();
        
        // 1. Auth check
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user;

        // 2. Role check (Admin only for certificate generation)
        if (user.role !== 'admin' && user.role !== 'super_admin') {
            return NextResponse.json({ success: false, message: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const studentId = params.id;
        const body = await req.json();
        const { templateType, metadata, templateId, batchId, visibleToStudent } = body;

        // 3. Resolve batch if not provided
        let targetBatchId = batchId;
        if (!targetBatchId) {
            const Batch = (await import('@/models/Batch')).default;
            const studentBatch = await Batch.findOne({
                'enrolledStudents.student': studentId,
                deletedAt: null
            }).sort({ updatedAt: -1 });
            targetBatchId = studentBatch?._id || null;
        }
        if (!targetBatchId) {
            const User = (await import('@/models/User')).default;
            const studentObj = await User.findById(studentId).select('batch batches').lean();
            targetBatchId = studentObj?.batch || studentObj?.batches?.[0] || null;
        }
        if (!targetBatchId) {
            return NextResponse.json({ 
                success: false, 
                message: 'No active batch or course enrollment found for this student. Please assign the student to a batch first.' 
            }, { status: 400 });
        }

        // 4. Request logic
        const result = await generateCertificate(
            studentId, 
            user.id, 
            templateType || 'STANDARD', 
            metadata || {},
            templateId,
            targetBatchId,
            req,
            visibleToStudent
        );

        if (!result.success) {
            return NextResponse.json(result, { status: result.code || 400 });
        }

        return NextResponse.json({
            success: true,
            message: 'Certificate generated successfully',
            certificate: result.certificate
        }, { status: 201 });

    } catch (error) {
        console.error('Generate Certificate API Error:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
