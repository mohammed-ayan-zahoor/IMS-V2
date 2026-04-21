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
            .populate('studentId', 'profile.firstName profile.lastName email')
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
        const studentFirstName = certificate.studentId?.profile?.firstName || '';
        const studentLastName = certificate.studentId?.profile?.lastName || '';
        const certData = {
            studentName: `${studentFirstName} ${studentLastName}`.trim(),
            courseName: certificate.metadata?.courseName || 'Course Completion',
            certificateNumber: certificate.certificateNumber,
            issueDate: certificate.issueDate,
            instituteName: certificate.institutionId?.name || 'Educational Institution',
            duration: certificate.metadata?.duration || ''
        };

        // 5. Generate PDF - use template if available, otherwise use legacy HTML-based
        let pdfBuffer;
        
        if (certificate.template?.templateId) {
            // Fetch the template
            const template = await CertificateTemplate.findById(certificate.template.templateId);
            
            if (template && template.imageUrl) {
                // Use image-based template
                pdfBuffer = await generateCertificatePDFFromTemplate(certData, template);
            } else {
                // Template not found or missing image, fall back to HTML
                console.warn('Template not found or missing image, falling back to HTML-based certificate');
                pdfBuffer = await generateCertificatePDF(certData);
            }
        } else {
            // Use legacy HTML-based certificate
            pdfBuffer = await generateCertificatePDF(certData);
        }

        // 6. Set response headers for PDF download
        const filename = generateCertificateFilename(
            certificate.certificateNumber,
            certData.studentName
        );

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
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
