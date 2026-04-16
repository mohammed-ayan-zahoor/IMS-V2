import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { getCertificateById } from '@/services/completionService';

/**
 * GET /api/v1/students/certificates/[id]
 * Auth: Student (own) or Teacher/Admin
 */
export async function GET(req, { params }) {
    try {
        await connectDB();
        
        // 1. Auth check
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user;
        const certificateId = params.id;

        // 2. Call service with authorization check logic
        const result = await getCertificateById(certificateId, user.id, user.role);

        if (!result.success) {
            return NextResponse.json(result, { status: result.code || 403 });
        }

        return NextResponse.json({
            success: true,
            certificate: result.certificate,
            pdfUrl: result.certificate.pdfUrl || null,
            metadata: result.certificate.metadata || {}
        }, { status: 200 });

    } catch (error) {
        console.error('Fetch Certificate API Error:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
