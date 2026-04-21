import mongoose from 'mongoose';
import User from '../models/User.js';
import Certificate from '../models/Certificate.js';
import CertificateTemplate from '../models/CertificateTemplate.js';
import { createAuditLog } from './auditService.js';


/**
 * 1. Mark student as COMPLETED
 */
export const markStudentCompleted = async (studentId, adminId, reason = '', req = null) => {
    try {
        console.log(`[markStudentCompleted] Starting for student: ${studentId}`);
        const student = await User.findById(studentId);

        if (!student) {
            console.log(`[markStudentCompleted] Student not found: ${studentId}`);
            throw new Error('Student not found');
        }

        if (student.role !== 'student') {
            console.log(`[markStudentCompleted] User is not a student: ${student.role}`);
            throw new Error('User is not a student');
        }

        if (student.status !== 'ACTIVE') {
            console.log(`[markStudentCompleted] Student not ACTIVE, current status: ${student.status}`);
            throw new Error(`Cannot complete student with status: ${student.status}`);
        }

        console.log(`[markStudentCompleted] Marking student ${studentId} as COMPLETED`);
        const oldStatus = student.status;
        student.status = 'COMPLETED';
        student.completedAt = new Date();
        student.completionReason = reason;

        await student.save();
        console.log(`[markStudentCompleted] Student saved successfully`);

        // Audit Logging
        if (adminId) {
            await createAuditLog({
                actor: adminId,
                action: 'student.complete',
                resource: { type: 'Student', id: student._id },
                details: { oldStatus, newStatus: 'COMPLETED', reason },
                institute: student.institute,
                req
            });
        }

        console.log(`[markStudentCompleted] Operation completed successfully`);
        return { success: true, message: 'Student marked as completed', student };

    } catch (error) {
        console.error(`[markStudentCompleted] Error:`, error.message);
        const statusCode = error.message.includes('not found') ? 404 : 400;
        return { success: false, message: error.message, code: statusCode };
    }
};



/**
 * 2. Generate Certificate
 * If a certificate already exists for this student+batch, it will be updated (regenerated)
 * If not, a new one will be created
 */
export const generateCertificate = async (studentId, adminId, templateType = 'STANDARD', metadata = {}, templateId = null, batchId = null, req = null) => {
    try {
        const Batch = mongoose.model('Batch');
        const Course = mongoose.model('Course');

        const student = await User.findById(studentId);

        if (!student) {
            throw new Error('Student not found');
        }

        if (!student.institute) {
            throw new Error('Student has no associated institution');
        }

        // Allow certificate generation for both COMPLETED and ACTIVE students
        if (!['COMPLETED', 'ACTIVE'].includes(student.status)) {
            throw new Error(`Cannot generate certificate for student with status: ${student.status}`);
        }

        // Validate batch exists and student is enrolled in it
        if (!batchId) {
            throw new Error('Batch ID is required to generate course-specific certificates');
        }

        const batch = await Batch.findOne({
            _id: batchId,
            institute: student.institute,
            deletedAt: null
        }).populate('course');

        if (!batch) {
            throw new Error('Batch not found or does not belong to this institution');
        }

        // Verify student is enrolled in this batch
        const isEnrolled = batch.enrolledStudents.some(
            e => e.student.toString() === studentId.toString()
        );

        if (!isEnrolled) {
            throw new Error('Student is not enrolled in the specified batch');
        }

        // Populate metadata with course information from batch
        const enrichedMetadata = {
            ...metadata,
            batchId: batch._id,
            batchName: batch.name,
            courseName: batch.course?.name || 'Unknown Course',
            courseId: batch.course?._id,
            generatedAt: new Date()
        };

        // Get template information if templateId is provided
        let template = null;
        let templateData = null;
        
        if (templateId) {
            template = await CertificateTemplate.findOne({
                _id: templateId,
                institute: student.institute,
                deletedAt: null
            }).lean();
            
            if (template) {
                templateData = {
                    templateId: template._id,
                    templateName: template.name,
                    styles: template.styles,
                    placeholders: template.placeholders,
                    htmlTemplate: template.htmlTemplate
                };
            }
        } else {
            // Try to use default template if no templateId provided
            template = await CertificateTemplate.findOne({
                institute: student.institute,
                isDefault: true,
                deletedAt: null
            }).lean();
            
            if (template) {
                templateData = {
                    templateId: template._id,
                    templateName: template.name,
                    styles: template.styles,
                    placeholders: template.placeholders,
                    htmlTemplate: template.htmlTemplate
                };
            }
        }

        // Check if certificate already exists for this student+batch combination
        let certificate = await Certificate.findOne({
            studentId: student._id,
            batchId: batch._id
        });

        if (certificate) {
            // Certificate exists - update it (regeneration scenario)
            certificate.templateType = templateType;
            certificate.template = templateData;
            certificate.metadata = enrichedMetadata;
            certificate.issueDate = new Date();
            certificate.status = 'GENERATED';
            await certificate.save();
        } else {
            // Certificate doesn't exist - create new one
            const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

            certificate = await Certificate.create({
                studentId: student._id,
                institutionId: student.institute,
                batchId: batch._id,
                certificateNumber: certificateNumber,
                templateType,
                template: templateData,
                metadata: enrichedMetadata,
                status: 'GENERATED'
            });

            // Link certificate to user (for backward compatibility)
            student.certificateId = certificate._id;
            await student.save();
        }

        // Audit Logging
        if (adminId) {
            const isRegeneration = certificate.createdAt && new Date(certificate.createdAt).getTime() < new Date().getTime() - 1000;
            await createAuditLog({
                actor: adminId,
                action: isRegeneration ? 'certificate.regenerate' : 'certificate.generate',
                resource: { type: 'Student', id: student._id },
                details: { 
                    certificateId: certificate._id, 
                    certificateNumber: certificate.certificateNumber, 
                    templateId: templateData?.templateId,
                    batchId: batch._id,
                    batchName: batch.name,
                    courseName: batch.course?.name
                },
                institute: student.institute,
                req
            });
        }

        return {
            success: true,
            message: 'Certificate generated',
            certificate: certificate
        };

    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        return { success: false, message: error.message, code: statusCode };
    }
};




/**
 * 3. Mark student as DROPPED
 */
export const markStudentDropped = async (studentId, adminId, reason = '', req = null) => {
    try {
        const student = await User.findById(studentId);

        if (!student) {
            throw new Error('Student not found');
        }

        if (student.role !== 'student') {
            throw new Error('User is not a student');
        }

        const oldStatus = student.status;
        student.status = 'DROPPED';
        student.completionReason = reason;

        await student.save();

        // Audit Logging
        if (adminId) {
            await createAuditLog({
                actor: adminId,
                action: 'student.drop',
                resource: { type: 'Student', id: student._id },
                details: { oldStatus, newStatus: 'DROPPED', reason },
                institute: student.institute,
                req
            });
        }

        return { success: true, message: 'Student marked as dropped' };

    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        return { success: false, message: error.message, code: statusCode };
    }
};


/**
 * 3.1. Revert student status (e.g., from COMPLETED to ACTIVE)
 */
export const revertStudentStatus = async (studentId, adminId, newStatus = 'ACTIVE', req = null) => {
    try {
        if (!['ACTIVE', 'PAUSED'].includes(newStatus)) {
            throw new Error('Cannot revert to status: ' + newStatus);
        }

        const student = await User.findById(studentId);
        if (!student) throw new Error('Student not found');

        const oldStatus = student.status;
        student.status = newStatus;
        // completion data cleared by User model pre-save hook
        await student.save();

        // Audit Logging
        if (adminId) {
            await createAuditLog({
                actor: adminId,
                action: 'student.revert',
                resource: { type: 'Student', id: student._id },
                details: { oldStatus, newStatus },
                institute: student.institute,
                req
            });
        }

        return { success: true, message: 'Student status reverted' };
    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        return { success: false, message: error.message, code: statusCode };
    }
};



/**
 * 4. Get Student Status
 */
export const getStudentStatus = async (studentId) => {
    try {
        const student = await User.findById(studentId)
            .populate('certificateId');

        if (!student) {
            throw new Error('Student not found');
        }

        return {
            success: true,
            data: {
                status: student.status,
                completedAt: student.completedAt,
                certificate: student.certificateId || null
            }
        };

    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        return { success: false, message: error.message, code: statusCode };
    }
};



/**
 * 5. Get Student Metrics (Dashboard)
 */
export const getStudentMetrics = async (institutionId) => {
    try {
        const [active, completed, dropped, paused] = await Promise.all([
            User.countDocuments({ institute: institutionId, status: 'ACTIVE', role: 'student' }),
            User.countDocuments({ institute: institutionId, status: 'COMPLETED', role: 'student' }),
            User.countDocuments({ institute: institutionId, status: 'DROPPED', role: 'student' }),
            User.countDocuments({ institute: institutionId, status: 'PAUSED', role: 'student' })
        ]);

        const total = active + completed + dropped + paused;

        return {
            success: true,
            metrics: { active, completed, dropped, paused, total },
            completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) : "0.00"
        };

    } catch (error) {
        return { success: false, message: error.message, code: 500 };
    }
};

/**
 * 6. Get Certificate by ID (with authorization)
 */
export const getCertificateById = async (certificateId, userId, role) => {
    try {
        const certificate = await Certificate.findById(certificateId)
            .populate({
                path: 'studentId',
                select: 'profile enrollmentNumber email'
            })
            .populate('institutionId', 'name logo');

        if (!certificate) {
            throw new Error('Certificate not found');
        }

        // Authorization Check
        const isOwner = String(certificate.studentId._id) === String(userId);
        const isStaff = ['admin', 'super_admin', 'instructor'].includes(role);

        if (!isOwner && !isStaff) {
            throw new Error('Unauthorized to view this certificate');
        }

        // Status Check for Students
        if (role === 'student' && certificate.status === 'GENERATED') {
            throw new Error('Certificate is still being processed');
        }

        return { success: true, certificate };

    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 403;
        return { success: false, message: error.message, code: statusCode };
    }
};



/**
 * 7. Get Completion Report
 */
export const getCompletionReport = async (institutionId, { status, startDate, endDate, includeMetrics = false }) => {
    try {
        const query = {
            institute: institutionId,
            role: 'student',
            status: { $in: ['COMPLETED', 'DROPPED'] }
        };

        if (status) {
            query.status = status;
        }

        if (startDate || endDate) {
            query.completedAt = {};
            if (startDate) query.completedAt.$gte = new Date(startDate);
            if (endDate) query.completedAt.$lte = new Date(endDate);
        }

        // Fetch students
        const selectFields = 'profile enrollmentNumber status completedAt';
        
        const students = await User.find(query)
            .select(selectFields)
            .sort({ completedAt: -1 });

        // Aggregate counts for the report header
        const [completedCount, droppedCount] = await Promise.all([
            User.countDocuments({ institute: institutionId, status: 'COMPLETED', role: 'student' }),
            User.countDocuments({ institute: institutionId, status: 'DROPPED', role: 'student' })
        ]);

        const activeCount = await User.countDocuments({ institute: institutionId, status: 'ACTIVE', role: 'student' });

        return {
            success: true,
            data: {
                summary: {
                    totalRecordsInFilter: students.length,
                    overallCompleted: completedCount,
                    overallDropped: droppedCount,
                    overallActive: activeCount
                },
                students: students.map(s => ({
                    id: s._id,
                    name: s.fullName,
                    enrollment: s.enrollmentNumber,
                    status: s.status,
                    completionDate: s.completedAt,
                    ...(includeMetrics && { metrics: { attendance: "90%", averageGrade: "A" } })
                }))
            }
        };

    } catch (error) {
        return { success: false, message: error.message, code: 500 };
    }
};

/**
 * Mark batch enrollment as completed and update global student status
 * This handles the per-batch completion workflow
 */
export const markBatchEnrollmentCompleted = async (batchId, studentIds, adminId, reason = '', req = null) => {
    try {
        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            throw new Error('Invalid student IDs provided');
        }

        const Batch = mongoose.model('Batch');
        const { StudentService } = await import('./studentService.js');

        // Find the batch
        const batch = await Batch.findById(batchId);
        if (!batch) {
            throw new Error('Batch not found');
        }

        const results = {
            successCount: 0,
            completedCount: 0,
            remainingActiveCount: 0,
            globalStatusUpdated: [],
            errors: []
        };

        // Mark each student's enrollment as completed
        for (const studentId of studentIds) {
            try {
                const student = await User.findById(studentId);
                if (!student) {
                    results.errors.push({ studentId, error: 'Student not found' });
                    continue;
                }

                // Find and update the enrollment in the batch
                const enrollment = batch.enrolledStudents.find(
                    e => e.student.toString() === studentId.toString()
                );

                if (!enrollment) {
                    results.errors.push({ studentId, error: 'Student not enrolled in this batch' });
                    continue;
                }

                if (enrollment.status === 'completed') {
                    results.errors.push({ studentId, error: 'Student already marked as completed in this batch' });
                    continue;
                }

                // Mark enrollment as completed
                enrollment.status = 'completed';
                enrollment.completedAt = new Date();
                
                // Inform Mongoose that the array has changed
                batch.markModified('enrolledStudents');

                results.successCount++;

                // Save batch changes
                await batch.save();

                // Check and update global status (no session parameter)
                const newGlobalStatus = await StudentService.checkAndUpdateGlobalStatus(studentId, null);

                if (newGlobalStatus === 'COMPLETED') {
                    results.completedCount++;
                    results.globalStatusUpdated.push({ studentId, status: 'COMPLETED' });
                } else {
                    results.remainingActiveCount++;
                }

                // Audit logging
                if (adminId) {
                    await createAuditLog({
                        actor: adminId,
                        action: 'enrollment.complete',
                        resource: { type: 'Batch', id: batchId },
                        institute: batch.institute,
                        details: {
                            studentId,
                            studentName: `${student.profile.firstName} ${student.profile.lastName}`,
                            batchId,
                            reason,
                            globalStatusChanged: newGlobalStatus === 'COMPLETED'
                        },
                        req
                    });
                }

            } catch (error) {
                results.errors.push({ studentId, error: error.message });
            }
        }

        return {
            success: results.errors.length < studentIds.length,
            ...results
        };

    } catch (error) {
        return {
            success: false,
            message: error.message,
            code: 400,
            successCount: 0,
            completedCount: 0,
            remainingActiveCount: 0,
            globalStatusUpdated: [],
            errors: [error.message]
        };
    }
};