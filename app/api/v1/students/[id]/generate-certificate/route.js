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

        // 3. Validate required fields
        if (!batchId) {
            return NextResponse.json({ 
                success: false, 
                message: 'Batch ID is required to specify which course the certificate is for' 
            }, { status: 400 });
        }

        // 4. Request logic
        const result = await generateCertificate(
            studentId, 
            user.id, 
            templateType || 'STANDARD', 
            metadata || {},
            templateId,
            batchId,
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
