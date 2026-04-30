import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Certificate from '@/models/Certificate';
import CertificateTemplate from '@/models/CertificateTemplate';
import User from '@/models/User';
import Batch from '@/models/Batch';
import { generateCertificatePDF, generateCertificatePDFFromTemplate, generateCertificateFilename } from '@/services/certificateService';

/**
 * GET /api/v1/students/certificates/[id]/download
 * Auth: Student (own certificate), Admin, or Super Admin
 * Generates and downloads certificate PDF on-demand
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
        const { id } = await params;
        const certificateId = id;

        // 2. Fetch certificate
        const certificate = await Certificate.findById(certificateId)
            .populate({
                path: 'studentId'
            })
            .populate('institutionId', 'name');

        if (!certificate) {
            return NextResponse.json(
                { success: false, message: 'Certificate not found' },
                { status: 404 }
            );
        }

        // 3. Authorization check
        const isOwnCertificate = certificate.studentId._id.toString() === user.id;
        const isAdmin = user.role === 'admin' || user.role === 'super_admin';
        const isTeacher = user.role === 'teacher';

        if (!isOwnCertificate && !isAdmin) {
            // Teachers can only download if they're instructors of the batch
            if (isTeacher) {
                const batch = await Batch.findOne({
                    'enrolledStudents.studentId': certificate.studentId._id,
                    instructors: user.id
                });
                if (!batch) {
                    return NextResponse.json(
                        { success: false, message: 'Forbidden: Access denied' },
                        { status: 403 }
                    );
                }
            } else {
                return NextResponse.json(
                    { success: false, message: 'Forbidden: Access denied' },
                    { status: 403 }
                );
            }
        }

        // 4. Prepare certificate data for PDF generation
        // Merge student data with certificate metadata and institute info
        const certData = {
            ...certificate.studentId.toObject(),
            ...certificate.metadata,
            certificateNumber: certificate.certificateNumber,
            issueDate: certificate.issueDate,
            institute: {
                name: certificate.institutionId?.name || 'Educational Institution'
            }
        };

        // 5. Generate PDF - always fetch fresh template to get latest design
        let pdfBuffer;
        const { getHydratedContext, renderHtmlToPdf, generateCertificatePDFFromTemplate } = await import('@/services/certificateService');
        
        // Use the common hydration engine for consistency
        const context = await getHydratedContext(certificate.studentId._id, certificate.institutionId._id, {
            serialNumber: certificate.certificateNumber,
            academicYear: certificate.academicYear || new Date().getFullYear().toString(),
            metadata: certificate.metadata,
            batchId: certificate.batchId
        });

        const templateId = certificate.template?.templateId || certificate.snapshot?.templateId;

        if (templateId) {
             const template = await CertificateTemplate.findById(templateId);
             
             if (template && template.renderMode === 'HTML_TEMPLATE') {
                 // HTML Template rendering
                 pdfBuffer = await renderHtmlToPdf(
                     template.htmlTemplate,
                     template.cssContent,
                     context,
                     template.pageConfig
                 );
             } else if (template && template.imageUrl) {
                 // Image-based rendering
                 pdfBuffer = await generateCertificatePDFFromTemplate(context, template);
             } else {
                 throw new Error('The original template for this certificate has been deleted or is invalid.');
             }
         } else {
            throw new Error('This is a legacy certificate without a saved design template. Please re-issue it to enable viewing.');
        }

        // 6. Set response headers for PDF viewing
        const filename = generateCertificateFilename(
            certificate.certificateNumber,
            context.student.fullName
        );

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${filename}"`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

    } catch (error) {
        console.error('Certificate Download API Error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal Server Error', error: error.message },
            { status: 500 }
        );
    }
}
